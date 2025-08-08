const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 🎯 프롬프트 템플릿 import
const { generatePostPrompt, testPrompt, createFallbackDraft } = require('./templates/prompts');

// 🔥 Gemini API 키를 Secret으로 정의
const geminiApiKey = defineSecret('GEMINI_API_KEY');

// 🔥 타임아웃과 메모리 설정 (asia-northeast3 리전 유지)
setGlobalOptions({
  region: 'asia-northeast3',
  memory: '2GiB',
  timeoutSeconds: 540,
});

admin.initializeApp();
const db = admin.firestore();

const functionOptions = {
  region: 'asia-northeast3',
  memory: '2GiB',
  timeoutSeconds: 540,
  cors: true, // onCall에선 CORS 자동처리지만 다른 핸들러와 호환 위해 유지
  secrets: [geminiApiKey],
};

// 🎯 최적화 헬퍼 함수들
const auth = (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  return { uid: req.auth.uid, token: req.auth.token };
};

const ok = (data = {}) => ({ success: true, ...data });

const safe = (fn) => async (req) => {
  try { return await fn(req); } 
  catch (e) { throw e instanceof HttpsError ? e : new HttpsError('internal', '처리 실패'); }
};

const wrap = (handler) => onCall(functionOptions, safe(handler));

const log = (tag, msg, data) => console.log(`[${tag}] ${msg}`, data);

// 🔥 다중 모델 백업 전략
const AI_MODELS = [
  { name: "gemini-1.5-flash", priority: 1 },
  { name: "gemini-1.5-pro", priority: 2 },
  { name: "gemini-pro", priority: 3 }
];

// 🔥 개선된 Gemini API 호출 with 할당량 오류 처리
async function callGeminiWithBackup(prompt) {
  const genAI = new GoogleGenerativeAI(geminiApiKey.value());
  let lastError = null;
  
  for (const modelConfig of AI_MODELS) {
    try {
      log('AI', `${modelConfig.name} 모델 시도 중...`);
      
      const model = genAI.getGenerativeModel({ 
        model: modelConfig.name,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      });
      
      const response = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`${modelConfig.name} 90초 타임아웃`)), 90000)
        )
      ]);
      
      log('AI', `${modelConfig.name} 성공`);
      return response;
      
    } catch (error) {
      log('AI', `${modelConfig.name} 실패`, error.message);
      lastError = error;
      
      const isQuotaError = error.message.includes('429') || 
                          error.message.includes('quota') || 
                          error.message.includes('QUOTA_EXCEEDED') ||
                          error.message.includes('RESOURCE_EXHAUSTED');
      
      const isOverloadError = error.message.includes('overloaded') || 
                             error.message.includes('503');
      
      const isTimeoutError = error.message.includes('timeout') || 
                            error.message.includes('타임아웃');
      
      if (error.message.includes('SAFETY')) {
        throw new HttpsError('invalid-argument', 
          'AI 안전 정책에 위배되는 내용입니다. 다른 주제로 시도해주세요.');
      }
      
      if ((isQuotaError || isOverloadError || isTimeoutError) && 
          modelConfig !== AI_MODELS[AI_MODELS.length - 1]) {
        log('AI', `${modelConfig.name} -> 다음 모델로 백업 시도`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      if (modelConfig === AI_MODELS[AI_MODELS.length - 1]) break;
    }
  }
  
  if (lastError?.message.includes('429') || lastError?.message.includes('quota')) {
    throw new HttpsError('resource-exhausted', 
      'AI 서비스 사용량을 모두 초과했습니다. 5-10분 후 다시 시도하거나 유료 플랜으로 업그레이드해주세요.');
  }
  
  if (lastError?.message.includes('overloaded') || lastError?.message.includes('503')) {
    throw new HttpsError('unavailable', 
      'AI 서비스에 일시적 과부하가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }
  
  throw new HttpsError('unavailable', 
    'AI 서비스에 일시적 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
}

// ─────────────────────────────────────────────────────────────
// ✅ 여기 추가: Admin 사용자 목록 호출 (Callable, CORS 프리)
// ─────────────────────────────────────────────────────────────
exports.getUserList = wrap(async (req) => {
  const { uid, token } = auth(req);
  log('ADMIN', 'getUserList 호출', { uid, email: token?.email });

  // (선택) 관리자만 허용하고 싶으면 아래 주석 해제
  // if (!token?.isAdmin) throw new HttpsError('permission-denied', '관리자만 가능합니다.');

  const { pageSize = 100, pageToken } = req.data || {};

  let q = db.collection('users').orderBy('createdAt', 'desc');
  if (pageToken) {
    const startDoc = await db.collection('users').doc(pageToken).get();
    if (startDoc.exists) q = q.startAfter(startDoc);
  }

  const limit = Math.min(500, Number(pageSize) || 100);
  const snap = await q.limit(limit).get();

  const users = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      email: data.email || '',
      name: data.name || '',
      position: data.position || '',
      regionMetro: data.regionMetro || '',
      regionLocal: data.regionLocal || '',
      status: data.status || '',
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || null
    };
  });

  const nextPageToken = snap.docs.length === limit ? snap.docs[snap.docs.length - 1].id : null;

  log('ADMIN', 'getUserList 성공', { count: users.length });
  return ok({ users, nextPageToken });
});

// ─────────────────────────────────────────────────────────────
// 이하 기존 함수들 (네가 준 코드 그대로 유지)
// ─────────────────────────────────────────────────────────────
exports.getDashboardData = wrap(async (req) => {
  const { uid } = auth(req);
  log('DASH', 'getDashboardData 호출', uid);
  
  const usage = { current: 5, total: 30 };
  
  try {
    const postsSnapshot = await db.collection('posts')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const recentPosts = postsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '제목 없음',
        status: data.status || 'draft',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      };
    });

    log('DASH', 'Dashboard 데이터 성공', { usage, postsCount: recentPosts.length });
    return ok({ data: { usage, recentPosts } });

  } catch (firestoreError) {
    log('DASH', 'Firestore 조회 오류', firestoreError.message);
    return ok({ data: { usage, recentPosts: [] } });
  }
});

exports.getUserProfile = wrap(async (req) => {
  const { uid, token } = auth(req);
  log('PROFILE', 'getUserProfile 호출', uid);
  
  const doc = await db.collection('users').doc(uid).get();
  const profile = {
    name: token.name || '', email: token.email || '',
    position: '', regionMetro: '', regionLocal: '', 
    electoralDistrict: '', status: '현역',
    ...(doc.exists && doc.data())
  };
  
  log('PROFILE', 'getUserProfile 성공');
  return ok({ profile });
});

exports.getUserPosts = wrap(async (req) => {
  const { uid } = auth(req);
  log('POST', 'getUserPosts 호출', uid);

  try {
    const postsSnapshot = await db.collection('posts')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const posts = postsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '제목 없음',
        content: data.content || '',
        status: data.status || 'draft',
        category: data.category || '일반',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      };
    });

    log('POST', `getUserPosts 성공: ${posts.length}개 포스트 조회`);
    return ok({ posts });

  } catch (firestoreError) {
    log('POST', 'Firestore 조회 오류', firestoreError.message);
    if (firestoreError.code === 'failed-precondition' || firestoreError.code === 'not-found') {
      log('POST', 'posts 컬렉션 또는 인덱스 없음, 빈 결과 반환');
      return ok({ posts: [] });
    }
    throw firestoreError;
  }
});

exports.savePost = wrap(async (req) => {
  const { uid } = auth(req);
  const { post, metadata } = req.data;
  
  if (!post?.title?.trim() || !post?.content?.trim()) {
    throw new HttpsError('invalid-argument', '제목과 내용을 입력해주세요.');
  }

  log('POST', 'savePost 호출', { userId: uid, postTitle: post.title });

  const docRef = await db.collection('posts').add({
    userId: uid,
    title: post.title.trim(),
    content: post.content,
    category: post.category || '일반',
    status: 'draft',
    wordCount: post.content.replace(/<[^>]*>/g, '').replace(/\s/g, '').length,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    metadata: metadata || {}
  });
  
  log('POST', 'savePost 성공', docRef.id);
  return ok({ postId: docRef.id, message: '원고가 성공적으로 저장되었습니다.' });
});

exports.updatePost = wrap(async (req) => {
  const { uid } = auth(req);
  const { postId, updates } = req.data;

  if (!postId || !updates) {
    throw new HttpsError('invalid-argument', '포스트 ID와 수정 데이터를 입력해주세요.');
  }

  log('POST', 'updatePost 호출', { userId: uid, postId });

  const postDoc = await db.collection('posts').doc(postId).get();
  
  if (!postDoc.exists) {
    throw new HttpsError('not-found', '포스트를 찾을 수 없습니다.');
  }

  const postData = postDoc.data();
  if (postData.userId !== uid) {
    throw new HttpsError('permission-denied', '포스트를 수정할 권한이 없습니다.');
  }

  const allowedFields = ['title', 'content', 'category', 'status'];
  const sanitizedUpdates = {};
  
  allowedFields.forEach(field => {
    if (updates[field] !== undefined) {
      sanitizedUpdates[field] = updates[field];
    }
  });

  if (sanitizedUpdates.content) {
    sanitizedUpdates.wordCount = sanitizedUpdates.content.replace(/<[^>]*>/g, '').replace(/\s/g, '').length;
  }

  sanitizedUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  await db.collection('posts').doc(postId).update(sanitizedUpdates);
  
  log('POST', 'updatePost 성공', postId);
  return ok({ message: '포스트가 성공적으로 수정되었습니다.' });
});

exports.deletePost = wrap(async (req) => {
  const { uid } = auth(req);
  const { postId } = req.data;

  if (!postId) {
    throw new HttpsError('invalid-argument', '포스트 ID를 입력해주세요.');
  }

  log('POST', 'deletePost 호출', { userId: uid, postId });

  const postDoc = await db.collection('posts').doc(postId).get();
  
  if (!postDoc.exists) {
    throw new HttpsError('not-found', '포스트를 찾을 수 없습니다.');
  }

  const postData = postDoc.data();
  if (postData.userId !== uid) {
    throw new HttpsError('permission-denied', '포스트를 삭제할 권한이 없습니다.');
  }

  await db.collection('posts').doc(postId).delete();
  
  log('POST', 'deletePost 성공', postId);
  return ok({ message: '포스트가 성공적으로 삭제되었습니다.' });
});

exports.updateProfile = wrap(async (req) => {
  const { uid } = auth(req);
  const profileData = req.data;

  if (!profileData || typeof profileData !== 'object') {
    throw new HttpsError('invalid-argument', '올바른 프로필 데이터를 입력해주세요.');
  }

  log('PROFILE', 'updateProfile 호출', { userId: uid, profileData });

  const allowedFields = ['name', 'position', 'regionMetro', 'regionLocal', 'electoralDistrict', 'status'];
  const sanitizedData = {};
  
  allowedFields.forEach(field => {
    if (profileData[field] !== undefined) {
      sanitizedData[field] = profileData[field];
    }
  });

  await db.collection('users').doc(uid).set({
    ...sanitizedData,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  log('PROFILE', 'updateProfile 성공');
  return ok({ message: '프로필이 성공적으로 업데이트되었습니다.' });
});

exports.testGenerate = wrap(async (req) => {
  const startTime = Date.now();
  auth(req);
  log('TEST', 'testGenerate 시작');

  log('TEST', 'API 키 확인 중...');
  const apiKey = geminiApiKey.value();
  if (!apiKey) {
    throw new HttpsError('internal', 'Gemini API 키가 설정되지 않았습니다.');
  }
  log('TEST', 'API 키 확인 완료');

  log('TEST', '간단한 AI 호출 테스트 중...');
  const response = await callGeminiWithBackup(testPrompt());
  const responseText = response.response.text();
  log('TEST', 'AI 응답', responseText.substring(0, 100));

  const processingTime = Date.now() - startTime;
  log('TEST', `testGenerate 성공: ${processingTime}ms`);

  return ok({
    message: 'AI 연결 테스트 성공',
    processingTime,
    response: responseText,
    timestamp: new Date().toISOString()
  });
});

exports.generatePosts = wrap(async (req) => {
  const startTime = Date.now();
  const { uid } = auth(req);
  
  const data = req.data || {};
  log('AI', 'generatePosts 시작 (1개 생성)', { topic: data.prompt, category: data.category });

  const topic = data.prompt || data.topic || '';
  const category = data.category || '';
  
  if (!topic?.trim()) {
    throw new HttpsError('invalid-argument', '주제를 입력해주세요.');
  }
  
  if (!category?.trim()) {
    throw new HttpsError('invalid-argument', '카테고리를 선택해주세요.');
  }

  log('AI', `데이터 검증 통과: 주제="${topic.substring(0, 50)}..." 카테고리="${category}"`);

  // 사용자 프로필 가져오기
  let userProfile = {};
  try {
    const userDoc = await Promise.race([
      db.collection('users').doc(uid).get(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('프로필 조회 타임아웃')), 5000))
    ]);
    
    if (userDoc.exists) {
      userProfile = userDoc.data();
      log('AI', '사용자 프로필 조회 성공', userProfile.name || 'Unknown');
    }
  } catch (profileError) {
    log('AI', '프로필 조회 실패, 기본값 사용', profileError.message);
    userProfile = {
      name: req.auth.token.name || '정치인',
      position: '의원',
      regionMetro: '지역',
      regionLocal: '지역구',
      status: '현역'
    };
  }

  const prompt = generatePostPrompt({
    authorName: userProfile.name || '정치인',
    authorPosition: userProfile.position || '의원',
    topic,
    category,
    subCategory: data.subCategory || '없음',
    keywords: data.keywords || '없음'
  });

  log('AI', 'AI 호출 시작 (1개 원고 생성)...');
  
  const apiResponse = await callGeminiWithBackup(prompt);
  const responseText = apiResponse.response.text();
  
  log('AI', 'AI 응답 수신', { length: responseText.length });
  
  let parsedResponse;
  try {
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                     responseText.match(/\{[\s\S]*?\}/);
    
    if (jsonMatch) {
      const jsonText = jsonMatch[1] || jsonMatch[0];
      log('AI', '추출된 JSON 일부', jsonText.substring(0, 200));
      parsedResponse = JSON.parse(jsonText);
      log('AI', 'JSON 파싱 성공', { title: parsedResponse.title });
    } else {
      throw new Error('JSON 형식 찾기 실패');
    }
  } catch (parseError) {
    log('AI', 'JSON 파싱 실패, 기본 응답 생성', parseError.message);
    parsedResponse = createFallbackDraft(topic, category);
  }

  const singleDraft = {
    id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: parsedResponse.title || `${category}: ${topic}`,
    content: parsedResponse.content || '<p>원고 생성에 실패했습니다.</p>',
    wordCount: parsedResponse.wordCount || Math.ceil((parsedResponse.content || '').length / 2),
    tags: data.keywords?.split(',').map(k => k.trim()).filter(k => k) || [],
    category: category,
    subCategory: data.subCategory || '',
    style: parsedResponse.style || '일반',
    metadata: {
      aiModel: 'gemini-multi-fallback',
      prompt: topic,
      userProfile: userProfile.name || 'Unknown'
    }
  };

  const processingTime = Date.now() - startTime;
  
  log('AI', 'generatePosts 성공 (1개 생성)', {
    title: singleDraft.title.substring(0, 50),
    processingTime: `${processingTime}ms`
  });

  return ok({
    drafts: [singleDraft],
    metadata: {
      generatedAt: new Date().toISOString(),
      model: 'gemini-multi-fallback',
      processingTime: processingTime,
      region: 'asia-northeast3',
      inputTopic: topic,
      inputCategory: category,
      userProfile: userProfile.name || 'Unknown'
    }
  });
});

exports.generatePostDrafts = wrap(async (request) => {
  // 기존 generatePosts를 같은 onCall 인터페이스로 재사용
  return exports.generatePosts.run(request);
});
