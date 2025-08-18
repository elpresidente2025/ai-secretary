const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onRequest: _onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

// 글로벌 옵션 설정
setGlobalOptions({
  region: 'asia-northeast3',
  maxInstances: 10,
});

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// 공통 함수 옵션 - CORS 설정 강화
const functionOptions = {
  cors: {
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
  maxInstances: 5,
  timeoutSeconds: 60,
  memory: '512MiB'
};

// Gemini API 키 설정
const { defineSecret } = require('firebase-functions/params');
const geminiApiKey = defineSecret('GEMINI_API_KEY');

// ============================================================================
// Gemini API 호출 함수
// ============================================================================

async function callGeminiAPI(prompt, apiKey) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text;
  } catch (error) {
    console.error('Gemini API 호출 오류:', error);
    throw new Error('AI 서비스 호출에 실패했습니다: ' + error.message);
  }
}

// ============================================================================
// 포스트 관련 함수들 import & export
// ============================================================================

let checkUsageLimit = null;

try {
  const { 
    generatePosts,
    getUserPosts, 
    getPost,
    updatePost, 
    deletePost,
    checkUsageLimit: importedCheckUsageLimit
  } = require('./handlers/posts');

  exports.generatePosts = generatePosts;
  exports.getUserPosts = getUserPosts;
  exports.getPost = getPost;
  exports.updatePost = updatePost;
  exports.deletePost = deletePost;
  exports.checkUsageLimit = importedCheckUsageLimit;
  
  // 내부 사용을 위한 변수에 할당
  checkUsageLimit = importedCheckUsageLimit;
} catch (e) {
  console.warn('포스트 핸들러 로드 실패:', e.message);
}

// ============================================================================
// generateSinglePost Function
// ============================================================================

exports.generateSinglePost = onCall({
  ...functionOptions,
  secrets: [geminiApiKey]
}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    const { prompt, category, subCategory, keywords, userName, generateSingle } = request.data;

    console.log('🔥 generateSinglePost 호출:', { userId, prompt, category, generateSingle });

    // 단일 생성 플래그 확인
    if (!generateSingle) {
      throw new HttpsError('invalid-argument', '단일 생성 모드가 아닙니다. generateSingle 플래그가 필요합니다.');
    }

    if (!prompt || prompt.trim().length < 5) {
      throw new HttpsError('invalid-argument', '주제를 5자 이상 입력해주세요.');
    }

    // 사용량 제한 확인
    if (checkUsageLimit) {
      try {
        const limitCheckResult = await checkUsageLimit.handler({ auth: { uid: userId } });
        if (limitCheckResult && !limitCheckResult.canGenerate) {
          throw new HttpsError('resource-exhausted', '일일 사용량을 초과했습니다.');
        }
      } catch (limitError) {
        console.warn('사용량 확인 실패:', limitError);
        // 사용량 확인 실패 시에도 계속 진행 (관대한 정책)
      }
    }

    // Gemini API 호출
    const fullPrompt = `
카테고리: ${category || '일반'}
${subCategory ? `세부 카테고리: ${subCategory}` : ''}
작성자: ${userName || '익명'}
주제: ${prompt}
${keywords ? `키워드: ${keywords}` : ''}

위 정보를 바탕으로 정치인을 위한 원고를 작성해주세요.
    `;

    const content = await callGeminiAPI(fullPrompt, geminiApiKey.value());

    console.log('✅ generateSinglePost 성공');

    return {
      success: true,
      data: {
        content,
        category: category || '일반',
        subCategory,
        keywords,
        createdAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('❌ generateSinglePost 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '원고 생성에 실패했습니다.');
  }
});

// ============================================================================
// generatePostDrafts Function
// ============================================================================

exports.generatePostDrafts = onCall({
  ...functionOptions,
  secrets: [geminiApiKey]
}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    const { prompt, category, keywords, userName } = request.data;

    console.log('🔥 generatePostDrafts 호출:', { userId, prompt, category });

    if (!prompt || prompt.trim().length < 5) {
      throw new HttpsError('invalid-argument', '주제를 5자 이상 입력해주세요.');
    }

    // 3개의 초안 생성
    const drafts = [];
    for (let i = 0; i < 3; i++) {
      const fullPrompt = `
카테고리: ${category || '일반'}
작성자: ${userName || '익명'}
주제: ${prompt}
${keywords ? `키워드: ${keywords}` : ''}

위 정보를 바탕으로 정치인을 위한 원고를 작성해주세요. (초안 ${i + 1}/3)
      `;

      const content = await callGeminiAPI(fullPrompt, geminiApiKey.value());
      drafts.push({
        id: `draft_${i + 1}`,
        content,
        createdAt: new Date().toISOString()
      });
    }

    console.log('✅ generatePostDrafts 성공');

    return {
      success: true,
      data: {
        drafts,
        category: category || '일반',
        keywords
      }
    };

  } catch (error) {
    console.error('❌ generatePostDrafts 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '초안 생성에 실패했습니다.');
  }
});

// ============================================================================
// getDashboardData Function
// ============================================================================

exports.getDashboardData = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    console.log('🔥 getDashboardData 호출:', userId);

    let usage = { used: 0, limit: 50, remaining: 50 };
    let recentPosts = [];

    try {
      // 사용량 조회
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const usageSnapshot = await db.collection('usage')
        .where('userId', '==', userId)
        .where('date', '>=', today)
        .get();

      if (!usageSnapshot.empty) {
        const usageData = usageSnapshot.docs[0].data();
        usage = {
          used: usageData.count || 0,
          limit: usageData.limit || 50,
          remaining: Math.max(0, (usageData.limit || 50) - (usageData.count || 0))
        };
      }

      // 최근 포스트 조회
      const postsSnapshot = await db.collection('posts')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

      recentPosts = postsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '제목 없음',
          category: data.category || '일반',
          status: data.status || 'draft',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        };
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

// ============================================================================
// getUserProfile Function
// ============================================================================

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
        profile
      };

    } catch (firestoreError) {
      console.error('Firestore 조회 오류:', firestoreError);
      return {
        success: true,
        profile: {
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

// ============================================================================
// updateProfile Function - 🔧 중복 체크 로직 추가
// ============================================================================

exports.updateProfile = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    const updateData = request.data;

    console.log('🔥 updateProfile 호출:', { userId, updateData });

    // 허용된 필드만 업데이트
    const allowedFields = ['name', 'status', 'position', 'regionMetro', 'regionLocal', 'electoralDistrict', 'bio'];
    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    });

    // 🔧 선거구 정보가 포함된 경우 중복 체크
    const { position, regionMetro, regionLocal, electoralDistrict } = updateData;
    
    if (position && regionMetro && regionLocal && electoralDistrict) {
      console.log('🔍 선거구 중복 체크 시작:', { position, regionMetro, regionLocal, electoralDistrict });
      
      try {
        // 현재 사용자의 기존 데이터 조회
        const currentUserDoc = await db.collection('users').doc(userId).get();
        const currentData = currentUserDoc.data() || {};
        
        // 기존 선거구와 동일한지 확인
        const isSameDistrict = 
          currentData.position === position &&
          currentData.regionMetro === regionMetro &&
          currentData.regionLocal === regionLocal &&
          currentData.electoralDistrict === electoralDistrict;
          
        if (isSameDistrict) {
          console.log('✅ 기존과 동일한 선거구 - 중복 체크 생략');
        } else {
          console.log('🔍 새로운 선거구 - 중복 체크 수행');
          
          // 동일한 선거구를 사용하는 다른 사용자 조회
          const duplicateQuery = await db.collection('users')
            .where('position', '==', position)
            .where('regionMetro', '==', regionMetro)
            .where('regionLocal', '==', regionLocal)
            .where('electoralDistrict', '==', electoralDistrict)
            .get();

          let isDuplicate = false;
          let occupiedBy = null;

          duplicateQuery.forEach(doc => {
            const docUserId = doc.id;
            const userData = doc.data();
            
            // 본인이 아닌 다른 사용자가 사용 중인 경우
            if (docUserId !== userId) {
              isDuplicate = true;
              occupiedBy = userData.name || '익명';
              console.log('❌ 중복 발견:', { occupiedBy, docUserId });
            }
          });

          if (isDuplicate) {
            console.log('❌ 선거구 중복 - 저장 거부');
            throw new HttpsError(
              'already-exists', 
              `해당 선거구는 이미 사용 중입니다. (사용자: ${occupiedBy})`
            );
          }
          
          console.log('✅ 선거구 사용 가능 - 저장 진행');
        }
      } catch (duplicateCheckError) {
        console.error('중복 체크 오류:', duplicateCheckError);
        
        // HttpsError는 그대로 전달
        if (duplicateCheckError instanceof HttpsError) {
          throw duplicateCheckError;
        }
        
        // 다른 오류는 일반 오류로 처리
        throw new HttpsError('internal', '선거구 중복 확인 중 오류가 발생했습니다.');
      }
    }

    // Firestore 업데이트
    await db.collection('users').doc(userId).update(updates);

    console.log('✅ updateProfile 성공');
    
    return {
      success: true,
      message: '프로필이 성공적으로 업데이트되었습니다.'
    };

  } catch (error) {
    console.error('❌ updateProfile 오류:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', '프로필 업데이트에 실패했습니다.');
  }
});

// ============================================================================
// checkDistrictAvailability Function - 🔧 누락된 함수 추가
// ============================================================================

exports.checkDistrictAvailability = onCall(functionOptions, async (request) => {
  try {
    const { position, regionMetro, regionLocal, electoralDistrict, excludeUserId } = request.data || {};
    
    console.log('🔥 checkDistrictAvailability 호출:', { 
      position, regionMetro, regionLocal, electoralDistrict, excludeUserId 
    });

    if (!position || !regionMetro || !regionLocal || !electoralDistrict) {
      throw new HttpsError('invalid-argument', '지역/선거구/직책을 모두 입력해주세요.');
    }

    try {
      // Firestore에서 해당 선거구를 사용하는 사용자 조회
      const usersSnapshot = await db.collection('users')
        .where('position', '==', position)
        .where('regionMetro', '==', regionMetro)
        .where('regionLocal', '==', regionLocal)
        .where('electoralDistrict', '==', electoralDistrict)
        .get();

      let isAvailable = true;
      let occupiedBy = null;

      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        const userId = doc.id;
        
        // excludeUserId가 있으면 해당 사용자는 제외 (프로필 수정 시)
        if (excludeUserId && userId === excludeUserId) {
          return;
        }
        
        // 다른 사용자가 사용 중이면 사용 불가
        isAvailable = false;
        occupiedBy = userData.name || '익명';
      });

      console.log('중복 체크 결과:', { isAvailable, occupiedBy, userCount: usersSnapshot.size });

      return {
        success: true,
        data: {
          available: isAvailable,
          occupiedBy: isAvailable ? null : occupiedBy,
          message: isAvailable ? '사용 가능한 선거구입니다.' : '이미 사용 중인 선거구입니다.'
        }
      };

    } catch (firestoreError) {
      console.error('Firestore 조회 오류:', firestoreError);
      
      // Firestore 오류 시에도 기본적으로 사용 가능으로 처리 (관대한 정책)
      return {
        success: true,
        data: {
          available: true,
          message: '중복 확인 중 오류가 발생했지만 계속 진행할 수 있습니다.',
          warning: '중복 확인이 완전하지 않을 수 있습니다.'
        }
      };
    }

  } catch (error) {
    console.error('❌ checkDistrictAvailability 오류:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', '선거구 중복 확인에 실패했습니다.');
  }
});

// ============================================================================
// savePost Function
// ============================================================================

exports.savePost = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    const { post, metadata } = request.data;

    console.log('🔥 savePost 호출:', { userId, postTitle: post?.title });

    if (!post || !post.title || !post.content) {
      throw new HttpsError('invalid-argument', '제목과 내용을 입력해주세요.');
    }

    const postData = {
      userId: userId,
      title: post.title.trim(),
      content: post.content,
      category: post.category || '일반',
      status: post.status || 'draft',
      wordCount: post.content.replace(/<[^>]*>/g, '').replace(/\s/g, '').length,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: metadata || {}
    };

    const docRef = await db.collection('posts').add(postData);
    console.log('✅ savePost 성공:', docRef.id);

    return {
      success: true,
      postId: docRef.id,
      message: '원고가 성공적으로 저장되었습니다.'
    };

  } catch (error) {
    console.error('❌ savePost 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '원고 저장에 실패했습니다.');
  }
});

// ============================================================================
// getActiveNotices Function
// ============================================================================

exports.getActiveNotices = onCall(functionOptions, async (request) => {
  try {
    console.log('🔥 getActiveNotices 호출');

    try {
      const now = new Date();
      const noticesSnapshot = await db.collection('notices')
        .where('isActive', '==', true)
        .where('startDate', '<=', now)
        .where('endDate', '>=', now)
        .orderBy('startDate', 'desc')
        .orderBy('priority', 'desc')
        .limit(10)
        .get();

      const notices = [];
      noticesSnapshot.forEach(doc => {
        const data = doc.data();
        notices.push({
          id: doc.id,
          title: data.title,
          content: data.content,
          type: data.type || 'info',
          priority: data.priority || 1,
          startDate: data.startDate?.toDate?.()?.toISOString(),
          endDate: data.endDate?.toDate?.()?.toISOString(),
          createdAt: data.createdAt?.toDate?.()?.toISOString()
        });
      });

      console.log('✅ getActiveNotices 성공:', notices.length);

      return {
        success: true,
        data: { notices }
      };

    } catch (firestoreError) {
      console.error('Firestore 조회 오류:', firestoreError);
      return {
        success: true,
        data: { notices: [] }
      };
    }

  } catch (error) {
    console.error('❌ getActiveNotices 오류:', error);
    throw new HttpsError('internal', '공지사항을 불러오는데 실패했습니다.');
  }
});

// ============================================================================
// 관리자 핸들러 import & export
// ============================================================================

try {
  const { getUsers, getAdminStats, getErrorLogs, cleanupOrphanLocks } = require('./handlers/admin');
  exports.getUsers = getUsers;
  exports.getAdminStats = getAdminStats;
  exports.getErrorLogs = getErrorLogs;
  exports.cleanupOrphanLocks = cleanupOrphanLocks;
  exports.getUserList = getUsers; // AdminPage.jsx 호환성
} catch (e) {
  console.warn('관리자 핸들러 로드 실패:', e.message);
}

try {
  const { diagWhoami } = require('./handlers/diag');
  exports.diagWhoami = diagWhoami;
} catch (e) {
  console.warn('진단 핸들러 로드 실패:', e.message);
}

// ============================================================================
// 공지사항 핸들러 import & export
// ============================================================================

try {
  const { 
    createNotice, 
    updateNotice, 
    deleteNotice, 
    getNotices
  } = require('./handlers/notices');

  exports.createNotice = createNotice;
  exports.updateNotice = updateNotice;
  exports.deleteNotice = deleteNotice;
  exports.getNotices = getNotices;
} catch (e) {
  console.warn('공지사항 핸들러 로드 실패:', e.message);
}