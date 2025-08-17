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

try {
  const { 
    generatePosts,
    getUserPosts, 
    getPost,
    updatePost, 
    deletePost,
    checkUsageLimit 
  } = require('./handlers/posts');

  exports.generatePosts = generatePosts;
  exports.getUserPosts = getUserPosts;
  exports.getPost = getPost;
  exports.updatePost = updatePost;
  exports.deletePost = deletePost;
  exports.checkUsageLimit = checkUsageLimit;
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

    // 사용자 정보 조회
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', '사용자 정보를 찾을 수 없습니다.');
    }

    const userData = userDoc.data();
    const displayName = userData.name || userName || '정치인';

    // 사용량 제한 확인 (관리자는 제외)
    if (userData.role !== 'admin') {
      try {
        const checkUsageFn = require('./handlers/posts').checkUsageLimit;
        const usageResult = await checkUsageFn.handler({ auth: { uid: userId } });
        
        if (!usageResult.canGenerate) {
          throw new HttpsError('resource-exhausted', usageResult.message);
        }
      } catch (usageError) {
        console.warn('사용량 체크 실패, 계속 진행:', usageError.message);
      }
    }

    // 프롬프트 구성
    const fullPrompt = `
당신은 전문적인 정치 연설문 작성자입니다. 다음 조건에 맞는 연설문을 작성해주세요.

**작성 조건:**
- 작성자: ${displayName}
- 주제: ${prompt}
- 카테고리: ${category || '일반'}
${subCategory ? `- 세부 카테고리: ${subCategory}` : ''}
${keywords ? `- 포함할 키워드: ${keywords}` : ''}

**작성 요구사항:**
1. 정중하고 품격 있는 어조로 작성
2. 구체적이고 실용적인 내용 포함
3. 청중의 공감을 이끌어낼 수 있는 메시지
4. 적절한 길이 (300-800자 내외)
5. 명확한 논리 구조와 설득력 있는 내용

연설문만 작성해주세요. 다른 설명은 불필요합니다.
    `;

    console.log('🔥 Gemini API 호출 중...');
    const generatedContent = await callGeminiAPI(fullPrompt, geminiApiKey.value());

    if (!generatedContent) {
      throw new HttpsError('internal', 'AI 응답이 비어있습니다.');
    }

    // 단일 포스트 응답 구성
    const singlePost = {
      title: `${category || '일반'} 연설문`,
      content: generatedContent.trim(),
      category: category || '일반',
      subCategory: subCategory || '',
      keywords: keywords || '',
      timestamp: new Date().toISOString(),
      wordCount: generatedContent.replace(/\s/g, '').length
    };

    console.log('✅ 단일 포스트 생성 완료');

    return {
      singlePost,
      usage: {
        promptTokens: Math.ceil(fullPrompt.length / 4),
        completionTokens: Math.ceil(generatedContent.length / 4)
      }
    };

  } catch (error) {
    console.error('❌ generateSinglePost 실패:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    if (error.message.includes('quota') || error.message.includes('limit')) {
      throw new HttpsError('resource-exhausted', 'AI 서비스 사용량이 한도에 도달했습니다. 5-10분 후 다시 시도하거나 유료 플랜으로 업그레이드해주세요.');
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

// 🔥 generatePostDrafts 별칭 함수
exports.generatePostDrafts = onCall(functionOptions, async (request) => {
  try {
    return await exports.generatePosts(request);
  } catch (error) {
    console.error('generatePostDrafts 오류:', error);
    throw error;
  }
});

// ============================================================================
// getDashboardData Function - 완전 안전 버전
// ============================================================================
exports.getDashboardData = onCall(functionOptions, async (request) => {
  console.log('🔥 getDashboardData 호출 시작');
  
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    console.log('✅ 사용자 인증 성공:', userId);

    // 기본 응답 구조
    const response = {
      success: true,
      data: {
        usage: {
          postsGenerated: 0,
          monthlyLimit: 50,
          lastGenerated: null
        },
        recentPosts: []
      }
    };

    try {
      console.log('🔍 Firestore 조회 시작...');
      
      // 1. 사용자 정보 조회 (monthlyLimit 확인)
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          response.data.usage.monthlyLimit = userData.monthlyLimit || 50;
          console.log('✅ 사용자 정보 조회 성공');
        }
      } catch (userError) {
        console.warn('⚠️ 사용자 정보 조회 실패:', userError.message);
      }

      // 2. 포스트 조회 (가장 안전한 방법)
      try {
        const postsQuery = await db.collection('posts')
          .where('userId', '==', userId)
          .get();

        console.log('✅ 포스트 조회 성공, 총 개수:', postsQuery.size);

        if (postsQuery.size > 0) {
          const allPosts = [];
          
          postsQuery.docs.forEach(doc => {
            const data = doc.data();
            if (data.createdAt) {
              try {
                const createdAt = data.createdAt.toDate();
                allPosts.push({
                  id: doc.id,
                  title: data.title || '제목 없음',
                  category: data.category || '일반',
                  status: data.status || 'draft',
                  createdAt: createdAt,
                  createdAtISO: createdAt.toISOString()
                });
              } catch (dateError) {
                console.warn('날짜 변환 오류:', dateError.message);
              }
            }
          });

          if (allPosts.length > 0) {
            // 클라이언트에서 정렬
            allPosts.sort((a, b) => b.createdAt - a.createdAt);

            // 이번 달 포스트 계산
            const now = new Date();
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const thisMonthPosts = allPosts.filter(post => post.createdAt >= thisMonth);
            
            response.data.usage.postsGenerated = thisMonthPosts.length;

            // 최근 5개 포스트
            const recentPosts = allPosts.slice(0, 5).map(post => ({
              id: post.id,
              title: post.title,
              category: post.category,
              status: post.status,
              createdAt: post.createdAtISO
            }));

            response.data.recentPosts = recentPosts;

            if (recentPosts.length > 0) {
              response.data.usage.lastGenerated = recentPosts[0].createdAt;
            }

            console.log('✅ 데이터 처리 완료:', {
              총포스트: allPosts.length,
              이번달: thisMonthPosts.length,
              최근: recentPosts.length
            });
          }
        }

      } catch (postsError) {
        console.warn('⚠️ 포스트 조회 실패:', postsError.message);
      }

    } catch (firestoreError) {
      console.warn('⚠️ Firestore 전체 오류:', firestoreError.message);
    }

    console.log('✅ getDashboardData 완료');
    return response;

  } catch (error) {
    console.error('❌ getDashboardData 최종 오류:', error);
    
    // 완전 실패 시에도 기본 응답 제공
    return {
      success: true,
      data: {
        usage: {
          postsGenerated: 0,
          monthlyLimit: 50,
          lastGenerated: null
        },
        recentPosts: []
      }
    };
  }
});

// ============================================================================
// getActiveNotices Function - 완전 안전 버전
// ============================================================================
exports.getActiveNotices = onCall(functionOptions, async (request) => {
  console.log('🔥 getActiveNotices 호출 시작');
  
  try {
    // 기본 응답 구조
    const response = {
      success: true,
      data: {
        notices: []
      }
    };

    try {
      console.log('🔍 공지사항 조회 시작...');
      
      const noticesQuery = await db.collection('notices')
        .where('isActive', '==', true)
        .limit(10)
        .get();

      console.log('✅ 공지사항 쿼리 성공, 개수:', noticesQuery.size);

      const notices = [];
      noticesQuery.docs.forEach(doc => {
        try {
          const data = doc.data();
          notices.push({
            id: doc.id,
            title: data.title || '공지사항',
            content: data.content || '',
            type: data.type || 'info',
            isActive: data.isActive || false,
            priority: data.priority || 'normal',
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
          });
        } catch (docError) {
          console.warn('공지 문서 처리 오류:', docError.message);
        }
      });

      response.data.notices = notices;
      console.log('✅ 공지사항 처리 완료:', notices.length);

    } catch (noticesError) {
      console.warn('⚠️ 공지사항 조회 실패:', noticesError.message);
    }

    return response;

  } catch (error) {
    console.error('❌ getActiveNotices 최종 오류:', error);
    
    // 완전 실패 시에도 기본 응답 제공
    return {
      success: true,
      data: {
        notices: []
      }
    };
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

    // 기본 프로필 데이터
    const defaultProfile = {
      name: request.auth.token.name || '',
      email: request.auth.token.email || '',
      position: '',
      regionMetro: '',
      regionLocal: '',
      electoralDistrict: '',
      role: 'user',
      isActive: true,
      monthlyLimit: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        
        // 기본값과 병합
        const profileData = {
          ...defaultProfile,
          ...userData,
          createdAt: userData.createdAt?.toDate()?.toISOString() || defaultProfile.createdAt,
          updatedAt: userData.updatedAt?.toDate()?.toISOString() || defaultProfile.updatedAt
        };

        console.log('✅ getUserProfile 성공');
        
        return {
          success: true,
          data: profileData
        };
      }
    } catch (dbError) {
      console.warn('사용자 정보 조회 실패, 기본값 사용:', dbError.message);
    }

    return {
      success: true,
      data: defaultProfile
    };

  } catch (error) {
    console.error('❌ getUserProfile 실패:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '프로필 조회에 실패했습니다.');
  }
});

// ============================================================================
// updateProfile Function
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
    const allowedFields = ['name', 'position', 'regionMetro', 'regionLocal', 'electoralDistrict'];
    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    });

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