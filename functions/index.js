'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ✅ 기존 prompts.js의 buildSmartPrompt 사용
const { buildSmartPrompt, getPolicySafe, createFallbackDraft } = require('./templates/prompts');

// Firebase 설정
setGlobalOptions({
  region: 'asia-northeast3',
  maxInstances: 10,
});

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const geminiApiKey = defineSecret('GEMINI_API_KEY');

const functionOptions = {
  cors: {
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
  maxInstances: 5,
  timeoutSeconds: 60,
  memory: '512MiB',
  secrets: [geminiApiKey]
};

// ============================================================================
// Gemini API 호출 함수
// ============================================================================

async function callGeminiAPI(prompt, apiKey, retries = 2) {
  let lastError = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🤖 Gemini API 호출 시도 ${attempt}/${retries}`);
      
      if (!apiKey) {
        throw new Error('Gemini API 키가 설정되지 않았습니다.');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-pro',
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text || text.trim().length === 0) {
        throw new Error('Gemini API가 빈 응답을 반환했습니다.');
      }

      console.log(`✅ Gemini API 응답 성공 (${text.length}자)`);
      return text;

    } catch (error) {
      lastError = error;
      console.error(`❌ Gemini API 시도 ${attempt} 실패:`, error.message);
      
      // 특정 에러는 재시도하지 않음
      if (error.message.includes('API_KEY_INVALID') || 
          error.message.includes('PERMISSION_DENIED') ||
          error.message.includes('quota')) {
        break;
      }
      
      // 마지막 시도가 아니면 잠시 대기 후 재시도
      if (attempt < retries) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`⏳ ${waitTime}ms 대기 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError || new Error('Gemini API 호출 실패');
}

// ============================================================================
// JSON 응답 파싱 함수들
// ============================================================================

function parseJsonResponse(aiResponse) {
  if (!aiResponse || typeof aiResponse !== 'string') {
    console.warn('⚠️ 유효하지 않은 AI 응답:', typeof aiResponse);
    return null;
  }

  try {
    let cleanText = aiResponse
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/^[^{]*({.*})[^}]*$/s, '$1')
      .trim();
    
    const parsed = JSON.parse(cleanText);
    
    if (!parsed.title || !parsed.content) {
      throw new Error(`필수 필드 누락: title=${!!parsed.title}, content=${!!parsed.content}`);
    }
    
    if (!parsed.wordCount || typeof parsed.wordCount !== 'number') {
      parsed.wordCount = Math.ceil(parsed.content.replace(/<[^>]*>/g, '').length / 2);
    }
    
    if (!parsed.timestamp) {
      parsed.timestamp = new Date().toISOString();
    }
    
    if (!parsed.style) {
      parsed.style = '이재명정신';
    }
    
    console.log(`✅ JSON 파싱 성공: ${parsed.title} (${parsed.wordCount}자)`);
    return parsed;
    
  } catch (error) {
    console.warn('⚠️ JSON 파싱 실패:', error.message);
    return null;
  }
}

// ============================================================================
// 핸들러 함수들
// ============================================================================

// getDashboardData Function
exports.getDashboardData = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    console.log('🔥 getDashboardData 호출:', userId);

    // 기본 사용량 정보
    let usage = { postsGenerated: 0, monthlyLimit: 50, canGenerate: true };

    try {
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const usageSnapshot = await db.collection('posts')
        .where('userId', '==', userId)
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thisMonth))
        .get();

      usage = {
        postsGenerated: usageSnapshot.size,
        monthlyLimit: 50,
        canGenerate: usageSnapshot.size < 50
      };

      // 최근 포스트 조회 (최대 5개)
      const recentPostsSnapshot = await db.collection('posts')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

      const recentPosts = [];
      recentPostsSnapshot.forEach(doc => {
        const data = doc.data();
        recentPosts.push({
          id: doc.id,
          title: data.title || '제목 없음',
          category: data.category || '일반',
          status: data.status || 'draft',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });

      console.log('✅ Dashboard 데이터 성공:', { usage, postsCount: recentPosts.length });

      return {
        success: true,
        data: {
          usage,
          recentPosts
        }
      };

    } catch (firestoreError) {
      console.error('Firestore 조회 오류:', firestoreError);
      return {
        success: true,
        data: {
          usage,
          recentPosts: []
        }
      };
    }

  } catch (error) {
    console.error('❌ getDashboardData 오류:', error);
    throw new HttpsError('internal', '데이터를 불러오는데 실패했습니다.');
  }
});

// getUserProfile Function
exports.getUserProfile = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    console.log('🔥 getUserProfile 호출:', userId);

    try {
      const userDoc = await db.collection('users').doc(userId).get();

      let profile = {
        name: request.auth.token.name || '',
        email: request.auth.token.email || '',
        position: '',
        regionMetro: '',
        regionLocal: '',
        electoralDistrict: '',
        status: '현역',
        bio: ''
      };

      if (userDoc.exists) {
        profile = { ...profile, ...userDoc.data() };
      }

      console.log('✅ getUserProfile 성공');
      return {
        success: true,
        data: profile
      };

    } catch (firestoreError) {
      console.error('Firestore 조회 오류:', firestoreError);
      return {
        success: true,
        data: {
          name: request.auth.token.name || '',
          email: request.auth.token.email || '',
          position: '',
          regionMetro: '',
          regionLocal: '',
          electoralDistrict: '',
          status: '현역',
          bio: ''
        }
      };
    }

  } catch (error) {
    console.error('❌ getUserProfile 오류:', error);
    throw new HttpsError('internal', '프로필을 불러오는데 실패했습니다.');
  }
});

// updateProfile Function
exports.updateProfile = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    const profileData = request.data;

    console.log('🔥 updateProfile 호출:', { userId, profileData });

    if (!profileData || typeof profileData !== 'object') {
      throw new HttpsError('invalid-argument', '올바른 프로필 데이터를 입력해주세요.');
    }

    const allowedFields = ['name', 'position', 'regionMetro', 'regionLocal', 'electoralDistrict', 'status', 'bio'];
    const sanitizedData = {};
    
    allowedFields.forEach(field => {
      if (profileData[field] !== undefined) {
        sanitizedData[field] = profileData[field];
      }
    });

    // 활성 상태 결정
    const bio = (sanitizedData.bio || '').toString().trim();
    const isActive = bio.length > 0;

    await db.collection('users').doc(userId).set({
      ...sanitizedData,
      isActive,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log('✅ updateProfile 성공', { isActive });
    return {
      success: true,
      message: '프로필이 성공적으로 업데이트되었습니다.',
      isActive
    };

  } catch (error) {
    console.error('❌ updateProfile 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '프로필 업데이트에 실패했습니다.');
  }
});

// registerUser Function (alias for registerWithDistrictCheck)
exports.registerUser = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    const { profileData } = request.data || {};

    console.log('🔥 registerUser 호출:', { userId });

    if (!profileData || typeof profileData !== 'object') {
      throw new HttpsError('invalid-argument', '프로필 데이터가 필요합니다.');
    }

    const sanitizedData = {};
    const allowedFields = ['name', 'position', 'regionMetro', 'regionLocal', 'electoralDistrict', 'status', 'bio'];
    
    allowedFields.forEach(field => {
      if (profileData[field] !== undefined) {
        sanitizedData[field] = profileData[field];
      }
    });

    const bio = (sanitizedData.bio || '').toString().trim();
    const isActive = bio.length > 0;

    await db.collection('users').doc(userId).set({
      ...sanitizedData,
      isActive,
      email: request.auth.token.email || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log('✅ registerUser 성공');
    return {
      success: true,
      message: '회원가입이 완료되었습니다.',
      isActive
    };

  } catch (error) {
    console.error('❌ registerUser 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '회원가입 처리에 실패했습니다.');
  }
});

// getActiveNotices Function
exports.getActiveNotices = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    console.log('🔥 getActiveNotices 호출');

    const now = admin.firestore.Timestamp.now();
    const noticesSnapshot = await db.collection('notices')
      .where('isActive', '==', true)
      .where('expiresAt', '>=', now)
      .orderBy('expiresAt', 'asc')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const notices = [];
    noticesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.isActive) {
        notices.push({
          id: doc.id,
          title: data.title || '공지사항',
          content: data.content || '',
          type: data.type || 'info',
          priority: data.priority || 'medium',
          isActive: data.isActive || false,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          expiresAt: data.expiresAt?.toDate?.()?.toISOString() || null,
        });
      }
    });

    console.log('✅ getActiveNotices 성공:', notices.length);
    return {
      success: true,
      data: { notices }
    };

  } catch (error) {
    console.error('❌ getActiveNotices 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '활성 공지사항을 불러오는 중 오류가 발생했습니다.');
  }
});

// savePost Function
exports.savePost = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    const { postData } = request.data;

    console.log('🔥 savePost 호출:', { userId, postId: postData?.id });

    if (!postData || !postData.title || !postData.content) {
      throw new HttpsError('invalid-argument', '제목과 내용이 필요합니다.');
    }

    const sanitizedData = {
      title: postData.title,
      content: postData.content,
      category: postData.category || '일반',
      subCategory: postData.subCategory || '',
      status: postData.status || 'draft',
      wordCount: postData.wordCount || 0,
      userId: userId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    let postRef;
    if (postData.id && postData.id.startsWith('post_')) {
      // 기존 포스트 업데이트
      postRef = db.collection('posts').doc(postData.id);
      await postRef.set(sanitizedData, { merge: true });
    } else {
      // 새 포스트 생성
      sanitizedData.createdAt = admin.firestore.FieldValue.serverTimestamp();
      postRef = await db.collection('posts').add(sanitizedData);
    }

    console.log('✅ savePost 성공:', postRef.id);
    return {
      success: true,
      message: '포스트가 저장되었습니다.',
      postId: postRef.id
    };

  } catch (error) {
    console.error('❌ savePost 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '포스트 저장에 실패했습니다.');
  }
});

// getUserPosts Function
exports.getUserPosts = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    console.log('🔥 getUserPosts 호출:', userId);

    const postsSnapshot = await db.collection('posts')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const posts = [];
    postsSnapshot.forEach(doc => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        title: data.title || '제목 없음',
        content: data.content || '',
        status: data.status || 'draft',
        category: data.category || '일반',
        subCategory: data.subCategory || '',
        wordCount: data.wordCount || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      });
    });

    console.log('✅ getUserPosts 성공:', posts.length);
    return {
      success: true,
      data: { posts }
    };

  } catch (error) {
    console.error('❌ getUserPosts 오류:', error);
    throw new HttpsError('internal', '포스트 목록 조회에 실패했습니다.');
  }
});

// getPost Function
exports.getPost = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const { postId } = request.data;
    if (!postId) {
      throw new HttpsError('invalid-argument', '포스트 ID가 필요합니다.');
    }

    console.log('🔥 getPost 호출:', postId);

    const postDoc = await db.collection('posts').doc(postId).get();
    
    if (!postDoc.exists) {
      throw new HttpsError('not-found', '포스트를 찾을 수 없습니다.');
    }

    const data = postDoc.data();
    
    // 본인 포스트인지 확인
    if (data.userId !== request.auth.uid) {
      throw new HttpsError('permission-denied', '포스트에 접근할 권한이 없습니다.');
    }

    const post = {
      id: postDoc.id,
      title: data.title || '',
      content: data.content || '',
      status: data.status || 'draft',
      category: data.category || '일반',
      subCategory: data.subCategory || '',
      wordCount: data.wordCount || 0,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    };

    console.log('✅ getPost 성공:', postId);
    return {
      success: true,
      data: { post }
    };

  } catch (error) {
    console.error('❌ getPost 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '포스트 조회에 실패했습니다.');
  }
});

// updatePost Function
exports.updatePost = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const { postId, postData } = request.data;
    if (!postId || !postData) {
      throw new HttpsError('invalid-argument', '포스트 ID와 데이터가 필요합니다.');
    }

    console.log('🔥 updatePost 호출:', postId);

    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();
    
    if (!postDoc.exists) {
      throw new HttpsError('not-found', '포스트를 찾을 수 없습니다.');
    }

    const existingData = postDoc.data();
    if (existingData.userId !== request.auth.uid) {
      throw new HttpsError('permission-denied', '포스트를 수정할 권한이 없습니다.');
    }

    const sanitizedData = {
      title: postData.title || existingData.title,
      content: postData.content || existingData.content,
      status: postData.status || existingData.status,
      category: postData.category || existingData.category,
      subCategory: postData.subCategory || existingData.subCategory,
      wordCount: postData.wordCount || existingData.wordCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await postRef.update(sanitizedData);

    console.log('✅ updatePost 성공:', postId);
    return {
      success: true,
      message: '포스트가 업데이트되었습니다.'
    };

  } catch (error) {
    console.error('❌ updatePost 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '포스트 업데이트에 실패했습니다.');
  }
});

// deletePost Function
exports.deletePost = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const { postId } = request.data;
    if (!postId) {
      throw new HttpsError('invalid-argument', '포스트 ID가 필요합니다.');
    }

    console.log('🔥 deletePost 호출:', postId);

    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();
    
    if (!postDoc.exists) {
      throw new HttpsError('not-found', '포스트를 찾을 수 없습니다.');
    }

    const data = postDoc.data();
    if (data.userId !== request.auth.uid) {
      throw new HttpsError('permission-denied', '포스트를 삭제할 권한이 없습니다.');
    }

    await postRef.delete();

    console.log('✅ deletePost 성공:', postId);
    return {
      success: true,
      message: '포스트가 성공적으로 삭제되었습니다.'
    };

  } catch (error) {
    console.error('❌ deletePost 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '포스트 삭제에 실패했습니다.');
  }
});

// checkUsageLimit Function
exports.checkUsageLimit = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    console.log('🔥 checkUsageLimit 호출:', userId);

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const snap = await db.collection('posts')
      .where('userId', '==', userId)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thisMonth))
      .get();

    const used = snap.size;
    const limit = 50;
    
    console.log('✅ checkUsageLimit 성공:', { used, limit });
    return {
      success: true,
      data: {
        postsGenerated: used,
        monthlyLimit: limit,
        canGenerate: used < limit,
        remainingPosts: Math.max(0, limit - used),
      }
    };

  } catch (error) {
    console.error('❌ checkUsageLimit 오류:', error);
    return {
      success: true,
      data: { 
        postsGenerated: 0, 
        monthlyLimit: 50, 
        canGenerate: true, 
        remainingPosts: 50 
      }
    };
  }
});

// generatePosts Function (기본 더미 구현)
exports.generatePosts = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    const data = request.data || {};
    
    const topic = (data.prompt || data.topic || '').toString().trim();
    const category = (data.category || '').toString().trim();
    
    if (!topic || !category) {
      throw new HttpsError('invalid-argument', '주제와 카테고리를 모두 입력해주세요.');
    }

    console.log('🔥 generatePosts 호출:', { userId, topic, category });

    // 간단한 더미 응답
    const draftData = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `${topic} 관련 정책 제안`,
      content: `<p>${topic}에 대한 의견을 나누고자 합니다.</p><p>시민 여러분의 목소리를 듣고 더 나은 정책을 만들어가겠습니다.</p>`,
      wordCount: 50,
      category,
      subCategory: data.subCategory || '',
      keywords: data.keywords || '',
      generatedAt: new Date().toISOString()
    };

    return {
      success: true,
      message: '원고가 성공적으로 생성되었습니다.',
      drafts: draftData,
      metadata: {
        generatedAt: new Date().toISOString(),
        userId: userId,
        processingTime: Date.now()
      }
    };

  } catch (error) {
    console.error('❌ generatePosts 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '포스트 생성에 실패했습니다.');
  }
});

// ============================================================================
// generateSinglePost - 메인 AI 생성 함수
// ============================================================================

exports.generateSinglePost = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    const { prompt, category, subCategory, keywords, userName, generateSingle } = request.data;

    console.log('🔥 generateSinglePost 호출:', { userId, prompt, category, subCategory, generateSingle });

    if (!generateSingle) {
      throw new HttpsError('invalid-argument', '단일 생성 모드가 아닙니다. generateSingle 플래그가 필요합니다.');
    }

    if (!prompt || prompt.trim().length < 5) {
      throw new HttpsError('invalid-argument', '주제를 5자 이상 입력해주세요.');
    }

    // 사용자 프로필 조회
    let userProfile = {};
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        userProfile = userDoc.data();
        console.log('✅ 사용자 프로필 조회 성공:', userProfile.name || 'Unknown');
      }
    } catch (profileError) {
      console.warn('⚠️ 프로필 조회 실패, 기본값 사용:', profileError.message);
    }

    // ✅ 기존 prompts.js의 buildSmartPrompt 사용 (카테고리 자동 분기!)
    const smartPrompt = await buildSmartPrompt({
      // 기본 정보
      prompt,
      category,
      subCategory,
      keywords,
      userName,
      userProfile,
      
      // 프롬프트 생성에 필요한 추가 정보들
      topic: prompt,
      authorName: userProfile.name || userName || '정치인',
      authorPosition: userProfile.position || '의원',
      authorBio: userProfile.bio || '',
      authorStatus: userProfile.status || '현역',
      regionMetro: userProfile.regionMetro || '',
      regionLocal: userProfile.regionLocal || ''
    });

    console.log('🤖 스마트 프롬프트 생성 완료, Gemini API 호출 중...');

    // ✅ Gemini API 호출
    const aiResponse = await callGeminiAPI(smartPrompt, geminiApiKey.value());

    // ✅ 응답 처리
    const parsed = parseJsonResponse(aiResponse);
    
    if (parsed) {
      console.log(`✅ 단일 포스트 생성 성공: ${parsed.title}`);
      return {
        success: true,
        type: 'single',
        post: {
          id: `post_${Date.now()}`,
          ...parsed
        },
        metadata: {
          category: category,
          prompt: prompt,
          generatedAt: new Date().toISOString()
        }
      };
    }
    
    // JSON 파싱 실패시 텍스트 응답으로 처리
    console.log('⚠️ JSON 파싱 실패, 텍스트 응답으로 처리');
    
    const textContent = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const estimatedWordCount = Math.ceil(textContent.replace(/<[^>]*>/g, '').length / 2);
    
    return {
      success: true,
      type: 'single',
      post: {
        id: `post_${Date.now()}`,
        title: `${category || '일반'} 포스트`,
        content: textContent,
        wordCount: estimatedWordCount,
        style: '이재명정신',
        timestamp: new Date().toISOString()
      },
      metadata: {
        category: category,
        prompt: prompt,
        generatedAt: new Date().toISOString(),
        note: 'JSON 파싱 실패로 텍스트 응답 처리됨'
      }
    };

  } catch (error) {
    console.error('❌ generateSinglePost 오류:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    // 특정 에러 타입별 처리
    if (error.message.includes('quota') || error.message.includes('resource-exhausted')) {
      throw new HttpsError('resource-exhausted', 'AI 서비스 사용량이 한도에 도달했습니다. 5-10분 후 다시 시도해주세요.');
    }
    
    if (error.message.includes('overloaded') || error.message.includes('unavailable')) {
      throw new HttpsError('unavailable', 'AI 서비스가 현재 과부하 상태입니다. 1-2분 후 다시 시도해주세요.');
    }
    
    if (error.message.includes('timeout') || error.message.includes('타임아웃')) {
      throw new HttpsError('deadline-exceeded', 'AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
    }
    
    throw new HttpsError('internal', `원고 생성 실패: ${error.message}`);
  }
});

// ============================================================================
// 시스템 및 테스트 함수들
// ============================================================================

// testConnection Function
exports.testConnection = onCall(functionOptions, async (request) => {
  try {
    console.log('🧪 testConnection 호출');
    
    return {
      success: true,
      message: 'Firebase Functions 연결 정상',
      timestamp: new Date().toISOString(),
      region: 'asia-northeast3',
      userAuth: !!request.auth
    };
  } catch (error) {
    console.error('❌ testConnection 오류:', error);
    throw new HttpsError('internal', `연결 테스트 실패: ${error.message}`);
  }
});

// testFunction Function
exports.testFunction = onCall(functionOptions, async (request) => {
  try {
    console.log('🧪 테스트 함수 호출:', request.data);
    
    return {
      success: true,
      message: 'Firebase Functions 정상 작동',
      timestamp: new Date().toISOString(),
      userAuth: !!request.auth,
      data: request.data,
      region: 'asia-northeast3'
    };
  } catch (error) {
    console.error('❌ 테스트 함수 오류:', error);
    throw new HttpsError('internal', `테스트 실패: ${error.message}`);
  }
});

// testPrompt Function
exports.testPrompt = onCall(functionOptions, async (request) => {
  try {
    const { category = '일반소통', topic = '테스트 주제' } = request.data || {};
    
    console.log('🧪 프롬프트 테스트:', { category, topic });
    
    const testPrompt = await buildSmartPrompt({
      prompt: topic,
      category,
      topic,
      authorName: '테스트 의원',
      authorPosition: '국회의원',
      authorStatus: '현역'
    });
    
    return {
      success: true,
      prompt: testPrompt,
      length: testPrompt.length,
      category,
      topic,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ 프롬프트 테스트 오류:', error);
    throw new HttpsError('internal', `프롬프트 테스트 실패: ${error.message}`);
  }
});

// healthCheck Function
exports.healthCheck = onCall(functionOptions, async (request) => {
  try {
    // Firebase 연결 테스트
    await db.collection('_health').doc('test').set({
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // 프롬프트 시스템 테스트
    const testPromptResult = await buildSmartPrompt({
      prompt: '테스트',
      category: '일반소통',
      topic: '시스템 테스트'
    });
    
    return {
      success: true,
      firebase: 'OK',
      firestore: 'OK',
      prompts: testPromptResult ? 'OK' : 'ERROR',
      timestamp: new Date().toISOString(),
      region: 'asia-northeast3'
    };
  } catch (error) {
    console.error('❌ 헬스체크 오류:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
});

console.log('🚀 Firebase Functions 초기화 완료 - AI비서관 서비스');