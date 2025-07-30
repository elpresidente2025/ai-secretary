const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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
  cors: true,
  secrets: [geminiApiKey],
};

// 🔥 Gemini 1.5 Flash 우선 모델 백업 전략
const AI_MODELS = [
  { name: "gemini-1.5-flash", priority: 1 },      // 🔥 기본 모델로 변경
  { name: "gemini-1.5-flash-8b", priority: 2 },   // 더 가벼운 백업
  { name: "gemini-1.5-pro", priority: 3 },        // 필요시 백업
  { name: "gemini-pro", priority: 4 }              // 최종 백업
];

// 🔥 Gemini API 호출 with 모델 백업
async function callGeminiWithBackup(prompt) {
  const genAI = new GoogleGenerativeAI(geminiApiKey.value());
  
  for (const modelConfig of AI_MODELS) {
    try {
      console.log(`🤖 ${modelConfig.name} 모델 시도 중...`);
      
      const model = genAI.getGenerativeModel({ 
        model: modelConfig.name,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      });
      
      // 90초 타임아웃
      const response = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`${modelConfig.name} 90초 타임아웃`)), 90000)
        )
      ]);
      
      console.log(`✅ ${modelConfig.name} 성공`);
      return response;
      
    } catch (error) {
      console.warn(`⚠️ ${modelConfig.name} 실패:`, error.message);
      
      // 할당량 에러 구체적 감지
      const isQuotaError = error.message.includes('quota') || 
                          error.message.includes('429') ||
                          error.message.includes('Too Many Requests') ||
                          error.message.includes('rate limit');
      
      const isOverloadError = error.message.includes('overloaded') || 
                             error.message.includes('503');
      
      // 할당량 에러가 아니면 즉시 다음 모델 시도
      if (!isQuotaError && !isOverloadError && !error.message.includes('타임아웃')) {
        console.log(`❌ ${modelConfig.name} 복구 불가능한 에러, 다음 모델 시도`);
        continue;
      }
      
      // 마지막 모델까지 실패하면 에러 throw
      if (modelConfig === AI_MODELS[AI_MODELS.length - 1]) {
        if (isQuotaError) {
          throw new HttpsError('resource-exhausted', 
            '현재 AI 서비스 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.');
        }
        throw new HttpsError('unavailable', 
          'AI 서비스에 일시적 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
      
      // 다음 모델 시도 전 1초 대기
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// getDashboardData Function
exports.getDashboardData = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    console.log('🔥 getDashboardData 호출 (asia-northeast3):', userId);
    
    const usage = {
      current: 5,
      total: 30
    };

    try {
      const postsSnapshot = await db.collection('posts')
        .where('authorId', '==', userId)
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

// 🔥 테스트 함수
exports.testGenerate = onCall(functionOptions, async (request) => {
  const startTime = Date.now();
  console.log('🔥 testGenerate 시작');
  
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    console.log('1단계: API 키 확인 중...');
    const apiKey = geminiApiKey.value();
    if (!apiKey) {
      throw new HttpsError('internal', 'Gemini API 키가 설정되지 않았습니다.');
    }
    console.log('✅ API 키 확인 완료');

    console.log('2단계: 간단한 AI 호출 테스트 중...');
    const simplePrompt = "안녕하세요라고 간단히 인사해주세요.";
    
    const response = await callGeminiWithBackup(simplePrompt);
    const responseText = response.response.text();
    console.log('✅ AI 응답:', responseText.substring(0, 100));

    const processingTime = Date.now() - startTime;
    console.log(`✅ testGenerate 성공: ${processingTime}ms`);

    return {
      success: true,
      message: 'AI 연결 테스트 성공',
      processingTime: processingTime,
      response: responseText,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ testGenerate 실패:', {
      error: error.message,
      processingTime: `${processingTime}ms`
    });
    
    throw new HttpsError('internal', `테스트 실패: ${error.message}`);
  }
});

// 🔥 Gemini 1.5 Flash 기본 generatePosts Function
exports.generatePosts = onCall(functionOptions, async (request) => {
  const startTime = Date.now();
  
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const data = request.data;
    console.log('🔥 generatePosts 시작 (Gemini 1.5 Flash 우선):', data);

    // 필수 데이터 검증
    const topic = data.topic || data.prompt || '';
    const category = data.category || '';
    
    if (!topic?.trim()) {
      throw new HttpsError('invalid-argument', '주제를 입력해주세요.');
    }
    
    if (!category?.trim()) {
      throw new HttpsError('invalid-argument', '카테고리를 선택해주세요.');
    }

    console.log(`🔥 요청 검증 완료: 주제="${topic.substring(0, 50)}..." 카테고리="${category}"`);

    // 사용자 프로필 가져오기 (타임아웃 방지)
    let userProfile = {};
    try {
      const userDoc = await Promise.race([
        db.collection('users').doc(request.auth.uid).get(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('프로필 조회 타임아웃')), 5000))
      ]);
      
      if (userDoc.exists) {
        userProfile = userDoc.data();
      }
    } catch (profileError) {
      console.warn('프로필 조회 실패, 기본값 사용:', profileError);
      userProfile = {
        name: request.auth.token.name || '정치인',
        position: '의원',
        regionMetro: '지역',
        regionLocal: '지역구',
        status: '현역'
      };
    }

    // 🔥 Gemini 1.5 Flash에 최적화된 프롬프트
    const prompt = `정치인 블로그용 원고 3개를 JSON으로 작성:

작성자: ${userProfile.name || '정치인'} (${userProfile.position || '의원'})
주제: ${topic}
카테고리: ${category}
세부카테고리: ${data.subCategory || '없음'}
키워드: ${data.keywords || '없음'}

JSON 형식:
{
  "drafts": [
    {"title": "제목1", "content": "<p>내용1</p>", "wordCount": 1200},
    {"title": "제목2", "content": "<p>내용2</p>", "wordCount": 1200},
    {"title": "제목3", "content": "<p>내용3</p>", "wordCount": 1200}
  ]
}

각 원고는 1000-1500자, HTML 형식, 진중하고 신뢰감 있는 톤으로 작성.`;

    console.log('🔥 AI 호출 시작 (Gemini 1.5 Flash 우선)...');
    
    // 🔥 백업 모델과 함께 호출
    const apiResponse = await callGeminiWithBackup(prompt);
    const responseText = apiResponse.response.text();
    
    console.log('✅ AI 응답 수신, 길이:', responseText.length);
    
    // 🔥 JSON 파싱 개선
    let parsedResponse;
    try {
      // JSON 블록 추출
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        throw new Error('JSON 형식 찾기 실패');
      }
    } catch (parseError) {
      console.warn('JSON 파싱 실패, 기본 응답 생성:', parseError);
      parsedResponse = {
        drafts: [
          {
            title: `${category}: ${topic} (1)`,
            content: `<p><strong>${topic}</strong>에 대한 ${category} 원고입니다.</p><p>현재 상황을 분석하고 정책적 대안을 제시하겠습니다.</p><p>주민 여러분의 의견을 적극 수렴하여 더 나은 정책 방향을 모색하겠습니다.</p>`,
            wordCount: 300
          },
          {
            title: `${category}: ${topic} (2)`,
            content: `<p>${topic}와 관련하여 심도 있는 검토가 필요합니다.</p><p>관련 부처와의 협의를 통해 효과적인 해결방안을 마련하겠습니다.</p><p>투명하고 공정한 과정을 통해 국민의 목소리를 반영하겠습니다.</p>`,
            wordCount: 300
          },
          {
            title: `${category}: ${topic} (3)`,
            content: `<p>${topic}에 대한 체계적인 접근이 중요합니다.</p><p>단계적이고 실현 가능한 정책 추진으로 실질적 성과를 만들어내겠습니다.</p><p>지속적인 모니터링과 피드백을 통해 정책의 실효성을 높이겠습니다.</p>`,
            wordCount: 300
          }
        ]
      };
    }

    // 🔥 응답 정규화
    const drafts = parsedResponse.drafts?.map((draft, index) => ({
      title: draft.title || `${category}: ${topic} (${index + 1})`,
      content: draft.content || '<p>원고 생성에 실패했습니다.</p>',
      wordCount: draft.wordCount || Math.ceil((draft.content || '').length / 2),
      tags: data.keywords?.split(',').map(k => k.trim()).filter(k => k) || [],
      category: category,
      style: draft.style || '일반',
      metadata: {
        aiModel: 'gemini-1.5-flash-priority',
        prompt: topic,
        userProfile: userProfile.name || 'Unknown'
      }
    })) || [];

    if (drafts.length === 0) {
      throw new HttpsError('internal', '원고가 생성되지 않았습니다.');
    }

    const processingTime = Date.now() - startTime;
    
    console.log('✅ generatePosts 성공:', {
      draftsCount: drafts.length,
      processingTime: `${processingTime}ms`,
      model: 'gemini-1.5-flash-priority'
    });

    return {
      success: true,
      drafts: drafts,
      metadata: {
        generatedAt: new Date().toISOString(),
        model: 'gemini-1.5-flash-priority',
        processingTime: processingTime,
        region: 'asia-northeast3',
        inputTopic: topic,
        inputCategory: category,
        userProfile: userProfile.name || 'Unknown'
      }
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ generatePosts 오류:', {
      error: error.message,
      processingTime: `${processingTime}ms`,
      stack: error.stack?.substring(0, 500)
    });
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    // 특별 에러 메시지 처리
    if (error.message.includes('quota') || error.message.includes('429')) {
      throw new HttpsError('resource-exhausted', 'AI 서비스 할당량이 초과되었습니다. 5-10분 후 다시 시도해주세요.');
    }
    
    if (error.message.includes('timeout') || error.message.includes('타임아웃')) {
      throw new HttpsError('deadline-exceeded', 'AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
    }
    
    throw new HttpsError('internal', `원고 생성 실패: ${error.message}`);
  }
});

// 🔥 generatePostDrafts 별칭 함수
exports.generatePostDrafts = onCall(functionOptions, async (request) => {
  // generatePosts와 동일한 로직 호출
  return exports.generatePosts.run(request);
});

// 🔥 사용자 포스트 목록 조회
exports.getUserPosts = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    console.log('🔥 getUserPosts 호출:', userId);

    const postsSnapshot = await db.collection('posts')
      .where('authorId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const posts = postsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null
    }));

    console.log('✅ getUserPosts 성공:', posts.length);

    return {
      success: true,
      posts: posts
    };

  } catch (error) {
    console.error('❌ getUserPosts 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '포스트 목록을 불러오는데 실패했습니다.');
  }
});

// 🔥 특정 포스트 조회
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

    const postData = postDoc.data();
    
    // 작성자 확인
    if (postData.authorId !== request.auth.uid) {
      throw new HttpsError('permission-denied', '이 포스트에 접근할 권한이 없습니다.');
    }

    const post = {
      id: postDoc.id,
      ...postData,
      createdAt: postData.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: postData.updatedAt?.toDate?.()?.toISOString() || null
    };

    console.log('✅ getPost 성공');

    return {
      success: true,
      post: post
    };

  } catch (error) {
    console.error('❌ getPost 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '포스트를 불러오는데 실패했습니다.');
  }
});

// 🔥 포스트 업데이트
exports.updatePost = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const { postId, title, content } = request.data;
    
    if (!postId) {
      throw new HttpsError('invalid-argument', '포스트 ID가 필요합니다.');
    }

    console.log('🔥 updatePost 호출:', postId);

    const postDoc = await db.collection('posts').doc(postId).get();
    
    if (!postDoc.exists) {
      throw new HttpsError('not-found', '포스트를 찾을 수 없습니다.');
    }

    const postData = postDoc.data();
    
    // 작성자 확인
    if (postData.authorId !== request.auth.uid) {
      throw new HttpsError('permission-denied', '이 포스트를 수정할 권한이 없습니다.');
    }

    // 업데이트 데이터 구성
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (title !== undefined) {
      updateData.title = title.trim();
    }
    
    if (content !== undefined) {
      updateData.content = content.trim();
    }

    await db.collection('posts').doc(postId).update(updateData);

    console.log('✅ updatePost 성공');

    return {
      success: true,
      message: '포스트가 성공적으로 업데이트되었습니다.'
    };

  } catch (error) {
    console.error('❌ updatePost 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '포스트 업데이트에 실패했습니다.');
  }
});

// 🔥 관리자용 사용자 목록 조회
exports.getUserList = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    // 관리자 권한 확인 (실제 구현 필요)
    // const userDoc = await db.collection('users').doc(request.auth.uid).get();
    // if (!userDoc.exists || userDoc.data().role !== 'admin') {
    //   throw new HttpsError('permission-denied', '관리자 권한이 필요합니다.');
    // }

    console.log('🔥 getUserList 호출');

    const usersSnapshot = await db.collection('users').limit(100).get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
    }));

    console.log('✅ getUserList 성공:', users.length);

    return {
      success: true,
      users: users
    };

  } catch (error) {
    console.error('❌ getUserList 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '사용자 목록을 불러오는데 실패했습니다.');
  }
});