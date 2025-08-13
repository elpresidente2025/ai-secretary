'use strict';

const { HttpsError } = require('firebase-functions/v2/https');
const { wrap } = require('../common/wrap');
const { ok, okMessage } = require('../common/response');
const { auth } = require('../common/auth');
const { log } = require('../common/log');
const { admin, db } = require('../utils/firebaseAdmin');
const { callGeminiWithBackup } = require('../services/ai');
const { generatePostPrompt, createFallbackDraft } = require('../templates/prompts');

// AI 원고 생성
exports.generatePosts = wrap(async (req) => {
  const { uid } = auth(req);
  const data = req.data || {};
  log('AI_GEN', 'generatePosts 호출', { userId: uid });

  // 🔧 수정: prompt 필드도 허용 (프론트엔드에서 prompt로 보냄)
  const topic = (data.prompt || data.topic || '').toString().trim();
  const category = (data.category || '').toString().trim();
  
  console.log('🔍 검증 데이터:', { 
    topic: topic.substring(0, 50), 
    category,
    originalData: { prompt: data.prompt, topic: data.topic, category: data.category }
  });
  
  if (!topic || !category) {
    console.error('❌ 검증 실패:', { topic: !!topic, category: !!category });
    throw new HttpsError('invalid-argument', '주제와 카테고리를 모두 입력해주세요.');
  }

  try {
    const userDoc = await db.collection('users').doc(uid).get();
    const userProfile = userDoc.exists ? userDoc.data() : {};

    const prompt = generatePostPrompt({
      userProfile,
      topic,
      category,
      subCategory: data.subCategory || '',
      keywords: data.keywords || '',
    });

    const apiResponse = await callGeminiWithBackup(prompt);
    const responseText = apiResponse?.response?.text ? apiResponse.response.text() : '';

    let parsed;
    try {
      const fenced = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      const raw = fenced ? fenced[1] : (responseText.match(/{[\s\S]*}/)?.[0] || '');
      parsed = JSON.parse(raw);
    } catch {
      log('AI_GEN', 'JSON 파싱 실패 → 폴백');
      parsed = createFallbackDraft(topic, userProfile);
    }

    const title = typeof parsed.title === 'string' ? parsed.title.substring(0, 200) : `${topic} 관련 정책 제안`;
    let content = typeof parsed.content === 'string' ? parsed.content : `<p>${topic}에 대한 의견을 나누고자 합니다.</p>`;
    if (content.length > 80000) content = content.slice(0, 80000) + '...';
    const wordCount = content.replace(/<[^>]*>/g, '').replace(/\s/g, '').length;

    // 🔧 수정: drafts 배열 형태로 응답 (프론트엔드 기대 형식)
    const draftData = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      content,
      wordCount,
      category,
      subCategory: data.subCategory || '',
      keywords: data.keywords || '',
      generatedAt: new Date().toISOString()
    };

    // 🔧 수정: Firestore 저장은 별도 API로 분리하고, 일단 draft만 반환
    log('AI_GEN', '성공', { draftId: draftData.id, wordCount });
    
    return ok({ 
      success: true,
      message: '원고가 성공적으로 생성되었습니다.',
      drafts: [draftData], // 🔧 배열 형태로 반환
      metadata: {
        generatedAt: new Date().toISOString(),
        userId: uid,
        processingTime: Date.now()
      }
    });
    
  } catch (error) {
    log('AI_GEN', '오류', error.message);
    if (String(error.message || '').match(/quota|limit/i)) {
      throw new HttpsError('resource-exhausted', 'AI 서비스 사용량이 초과되었습니다. 잠시 후 다시 시도해주세요.');
    }
    throw new HttpsError('internal', `원고 생성 중 오류가 발생했습니다: ${error.message}`);
  }
});

// 사용자 포스트 목록 조회
exports.getUserPosts = wrap(async (req) => {
  const { uid } = auth(req);
  log('POST', 'getUserPosts 호출', { userId: uid });

  try {
    const postsSnapshot = await db.collection('posts')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const posts = [];
    postsSnapshot.forEach(doc => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null
      });
    });

    log('POST', 'getUserPosts 성공', { count: posts.length });
    return ok({ posts });
  } catch (error) {
    log('POST', 'getUserPosts 오류', error.message);
    throw new HttpsError('internal', '포스트 목록을 불러오는데 실패했습니다.');
  }
});

// 특정 포스트 조회
exports.getPost = wrap(async (req) => {
  const { uid } = auth(req);
  const { postId } = req.data || {};
  log('POST', 'getPost 호출', { userId: uid, postId });

  if (!postId) {
    throw new HttpsError('invalid-argument', '포스트 ID를 입력해주세요.');
  }

  try {
    const postDoc = await db.collection('posts').doc(postId).get();
    if (!postDoc.exists) {
      throw new HttpsError('not-found', '포스트를 찾을 수 없습니다.');
    }

    const data = postDoc.data();
    if (data.userId !== uid) {
      throw new HttpsError('permission-denied', '포스트를 조회할 권한이 없습니다.');
    }

    const post = {
      id: postDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null
    };

    log('POST', 'getPost 성공', postId);
    return ok({ post });
  } catch (error) {
    if (error.code) throw error; // Firebase 에러는 그대로 전달
    log('POST', 'getPost 오류', error.message);
    throw new HttpsError('internal', '포스트를 불러오는데 실패했습니다.');
  }
});

// 포스트 업데이트
exports.updatePost = wrap(async (req) => {
  const { uid } = auth(req);
  const { postId, updates } = req.data || {};
  log('POST', 'updatePost 호출', { userId: uid, postId });

  if (!postId || !updates) {
    throw new HttpsError('invalid-argument', '포스트 ID와 수정 데이터를 입력해주세요.');
  }

  try {
    const postDoc = await db.collection('posts').doc(postId).get();
    if (!postDoc.exists) {
      throw new HttpsError('not-found', '포스트를 찾을 수 없습니다.');
    }

    const current = postDoc.data() || {};
    if (current.userId !== uid) {
      throw new HttpsError('permission-denied', '포스트를 수정할 권한이 없습니다.');
    }

    const allowed = ['title', 'content', 'category', 'subCategory', 'keywords', 'status'];
    const sanitized = {};
    for (const k of allowed) {
      if (updates[k] !== undefined) sanitized[k] = updates[k];
    }
    
    if (sanitized.content) {
      sanitized.wordCount = String(sanitized.content).replace(/<[^>]*>/g, '').replace(/\s/g, '').length;
    }
    sanitized.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await db.collection('posts').doc(postId).update(sanitized);
    log('POST', 'updatePost 성공', postId);
    return okMessage('포스트가 성공적으로 수정되었습니다.');
  } catch (error) {
    if (error.code) throw error; // Firebase 에러는 그대로 전달
    log('POST', 'updatePost 오류', error.message);
    throw new HttpsError('internal', '포스트 수정에 실패했습니다.');
  }
});

// 포스트 삭제
exports.deletePost = wrap(async (req) => {
  const { uid } = auth(req);
  const { postId } = req.data || {};
  log('POST', 'deletePost 호출', { userId: uid, postId });

  if (!postId) {
    throw new HttpsError('invalid-argument', '포스트 ID를 입력해주세요.');
  }

  try {
    const postDoc = await db.collection('posts').doc(postId).get();
    if (!postDoc.exists) {
      throw new HttpsError('not-found', '포스트를 찾을 수 없습니다.');
    }
    
    const data = postDoc.data() || {};
    if (data.userId !== uid) {
      throw new HttpsError('permission-denied', '포스트를 삭제할 권한이 없습니다.');
    }

    await db.collection('posts').doc(postId).delete();
    log('POST', 'deletePost 성공', postId);
    return okMessage('포스트가 성공적으로 삭제되었습니다.');
  } catch (error) {
    if (error.code) throw error; // Firebase 에러는 그대로 전달
    log('POST', 'deletePost 오류', error.message);
    throw new HttpsError('internal', '포스트 삭제에 실패했습니다.');
  }
});

// 사용량 제한 체크
exports.checkUsageLimit = wrap(async (req) => {
  const { uid } = auth(req);
  log('USAGE', 'checkUsageLimit 호출', { userId: uid });

  try {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const snap = await db.collection('posts')
      .where('userId', '==', uid)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thisMonth))
      .get();

    const used = snap.size;
    const limit = 50;
    
    log('USAGE', 'checkUsageLimit 성공', { used, limit });
    return ok({
      postsGenerated: used,
      monthlyLimit: limit,
      canGenerate: used < limit,
      remainingPosts: Math.max(0, limit - used),
    });
  } catch (error) {
    log('USAGE', '오류', error.message);
    if (error.code === 'failed-precondition') {
      return ok({ 
        postsGenerated: 0, 
        monthlyLimit: 50, 
        canGenerate: true, 
        remainingPosts: 50 
      });
    }
    throw new HttpsError('internal', '사용량을 확인하는데 실패했습니다.');
  }
});