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

// 공통 함수 옵션
const functionOptions = {
  cors: true,
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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // 🔧 수정: 최신 모델로 변경
    
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
// generatePosts Function - 실제 Gemini API 사용
// ============================================================================

exports.generatePosts = onCall({
  ...functionOptions,
  secrets: [geminiApiKey]
}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    const { prompt, category, subCategory, keywords, userName } = request.data;

    console.log('🔥 generatePosts 호출:', { userId, prompt, category });

    // 입력값 검증
    if (!prompt || !prompt.trim()) {
      throw new HttpsError('invalid-argument', '주제를 입력해주세요.');
    }

    if (prompt.trim().length < 5) {
      throw new HttpsError('invalid-argument', '주제는 최소 5자 이상 입력해주세요.');
    }

    if (prompt.trim().length > 500) {
      throw new HttpsError('invalid-argument', '주제는 500자를 초과할 수 없습니다.');
    }

    // Gemini API 프롬프트 구성
    const systemPrompt = `당신은 더불어민주당 소속 정치인의 전문 원고 작성자입니다.

사용자 정보:
- 이름: ${userName || '의원'}
- 카테고리: ${category}
- 세부카테고리: ${subCategory || ''}
- 키워드: ${keywords || ''}

다음 주제에 대해 3개의 서로 다른 스타일의 블로그 원고를 작성해주세요:

주제: ${prompt}

요구사항:
1. 각 원고는 500-800자 분량
2. HTML 태그로 구조화 (<p>, <strong>, <br> 등 사용)
3. 정치인답게 신중하고 책임감 있는 어조
4. 시민과의 소통을 중시하는 내용
5. 구체적이고 실용적인 해결방안 제시

다음 JSON 형식으로 응답해주세요:
{
  "drafts": [
    {
      "title": "제목1",
      "content": "<p>HTML 형식의 내용1</p>",
      "style": "스타일1"
    },
    {
      "title": "제목2", 
      "content": "<p>HTML 형식의 내용2</p>",
      "style": "스타일2"
    },
    {
      "title": "제목3",
      "content": "<p>HTML 형식의 내용3</p>",
      "style": "스타일3"
    }
  ]
}

JSON 형식만 응답하고 다른 설명은 포함하지 마세요.`;

    console.log('📡 Gemini API 호출 시작...');
    
    // Gemini API 호출
    const geminiResponse = await callGeminiAPI(systemPrompt, geminiApiKey.value());
    
    console.log('✅ Gemini API 응답 수신');

    // JSON 파싱
    let parsedResponse;
    try {
      // Gemini 응답에서 JSON 부분만 추출
      const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON 형식을 찾을 수 없습니다');
      }
      
      parsedResponse = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      console.log('원본 응답:', geminiResponse);
      
      // 파싱 실패 시 백업 응답
      parsedResponse = {
        drafts: [
          {
            title: `${category} - ${prompt.slice(0, 20)}에 대한 입장`,
            content: `<p><strong>${userName || '의원'}님의 ${category} 관련 의견</strong></p><p>안녕하세요, ${userName || '의원'}입니다.</p><p>${prompt}에 대해 말씀드리고자 합니다.</p><p>시민 여러분의 불편을 덜어드리기 위해 최선을 다하겠습니다.</p>`,
            style: "입장문"
          }
        ]
      };
    }

    // 응답 데이터 정규화
    const normalizedDrafts = parsedResponse.drafts.map((draft, index) => ({
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: draft.title || `원고 ${index + 1}`,
      content: draft.content || '<p>내용이 생성되지 않았습니다.</p>',
      wordCount: (draft.content || '').replace(/<[^>]*>/g, '').replace(/\s/g, '').length,
      tags: keywords ? keywords.split(',').map(k => k.trim()).filter(k => k) : [],
      category: category || '일반',
      subCategory: subCategory || '',
      style: draft.style || '일반',
      metadata: {
        generatedAt: new Date(),
        model: 'gemini-1.5-flash',
        userId: userId,
        originalPrompt: prompt
      },
      generatedAt: new Date()
    }));

    console.log(`✅ generatePosts 성공: ${normalizedDrafts.length}개 원고 생성`);

    return {
      success: true,
      drafts: normalizedDrafts,
      metadata: {
        requestId: `req_${Date.now()}`,
        generatedAt: new Date(),
        model: 'gemini-1.5-flash',
        promptLength: prompt.length,
        category: category,
        userId: userId
      }
    };

  } catch (error) {
    console.error('❌ generatePosts 오류:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    // Gemini API 관련 에러 처리
    if (error.message.includes('API_KEY') || error.message.includes('quota')) {
      throw new HttpsError('resource-exhausted', 'AI 서비스 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.');
    }
    
    if (error.message.includes('SAFETY')) {
      throw new HttpsError('invalid-argument', '입력하신 내용이 AI 안전 정책에 위배됩니다. 다른 표현으로 다시 시도해주세요.');
    }
    
    throw new HttpsError('internal', 'AI 원고 생성에 실패했습니다. 다시 시도해주세요.');
  }
});

// ============================================================================
// 기존 사용자 함수들
// ============================================================================

// getDashboardData Function
exports.getDashboardData = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    console.log('🔥 getDashboardData 호출:', userId);

    const usage = {
      postsGenerated: 0,
      monthlyLimit: 50,
      lastGenerated: null
    };

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const postsSnapshot = await db.collection('posts')
        .where('userId', '==', userId)
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(monthStart))
        .get();

      usage.postsGenerated = postsSnapshot.size;

      const recentPosts = [];
      const recentSnapshot = await db.collection('posts')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

      recentSnapshot.forEach(doc => {
        const data = doc.data();
        recentPosts.push({
          id: doc.id,
          title: data.title || '제목 없음',
          category: data.category || '일반',
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
        status: '현역'
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
          status: '현역'
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

    const allowedFields = ['name', 'position', 'regionMetro', 'regionLocal', 'electoralDistrict', 'status'];
    const sanitizedData = {};
    
    allowedFields.forEach(field => {
      if (profileData[field] !== undefined) {
        sanitizedData[field] = profileData[field];
      }
    });

    await db.collection('users').doc(userId).set({
      ...sanitizedData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

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

// getUserPosts Function
exports.getUserPosts = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    console.log('🔥 getUserPosts 호출:', userId);

    try {
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
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });

      console.log(`✅ getUserPosts 성공: ${posts.length}개 포스트 조회`);
      return {
        success: true,
        posts: posts
      };

    } catch (firestoreError) {
      console.error('❌ Firestore 조회 오류:', firestoreError);
      if (firestoreError.code === 'failed-precondition' || 
          firestoreError.code === 'not-found') {
        console.log('⚠️ posts 컬렉션 또는 인덱스 없음, 빈 결과 반환');
        return {
          success: true,
          posts: []
        };
      }
      throw firestoreError;
    }

  } catch (error) {
    console.error('❌ getUserPosts 최종 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', `포스트 목록을 불러오는데 실패했습니다.`);
  }
});

// savePost Function
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
      status: 'draft',
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
const { getUsers, getAdminStats, getErrorLogs, cleanupOrphanLocks } = require('./handlers/admin');
const { diagWhoami } = require('./handlers/diag');

// 관리자 함수들 export
exports.getUsers = getUsers;
exports.getAdminStats = getAdminStats;
exports.getErrorLogs = getErrorLogs;
exports.cleanupOrphanLocks = cleanupOrphanLocks;

// 진단 함수 export
exports.diagWhoami = diagWhoami;

// AdminPage.jsx 호환성을 위한 별칭
exports.getUserList = getUsers;