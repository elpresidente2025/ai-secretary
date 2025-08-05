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

// 🔥 다중 모델 백업 전략
const AI_MODELS = [
  { name: "gemini-1.5-flash", priority: 1 },
  { name: "gemini-1.5-pro", priority: 2 },
  { name: "gemini-pro", priority: 3 }
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
      
      // 503 과부하 에러가 아니면 즉시 에러 throw
      if (!error.message.includes('overloaded') && 
          !error.message.includes('503') && 
          !error.message.includes('타임아웃')) {
        throw error;
      }
      
      // 마지막 모델까지 실패하면 에러 throw
      if (modelConfig === AI_MODELS[AI_MODELS.length - 1]) {
        throw new HttpsError('unavailable', 'All AI models are currently overloaded. Please try again in a few minutes.');
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
        .where('userId', '==', userId) // authorId에서 userId로 수정
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

// 🔥 getUserPosts Function - 누락된 함수 추가
exports.getUserPosts = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    console.log('🔥 getUserPosts 호출:', userId);

    try {
      // posts 컬렉션에서 사용자의 포스트 조회
      const postsSnapshot = await db.collection('posts')
        .where('userId', '==', userId) // Firestore 규칙과 일치
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
      
      // 컬렉션이나 인덱스가 없는 경우 빈 배열 반환
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

// 🔥 수정된 generatePosts Function - 1개씩만 생성
exports.generatePosts = onCall(functionOptions, async (request) => {
  const startTime = Date.now();
  
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const data = request.data || {};
    console.log('🔥 generatePosts 시작 (1개 생성) - 받은 데이터:', JSON.stringify(data, null, 2));

    // 🔥 프론트엔드에서 prompt 필드로 보내므로 prompt 우선 처리
    const topic = data.prompt || data.topic || '';  // prompt 우선!
    const category = data.category || '';
    
    console.log('🔍 검증 중:', { topic: topic.substring(0, 50), category });

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      console.error('❌ 주제 검증 실패:', { topic, type: typeof topic });
      throw new HttpsError('invalid-argument', '주제를 입력해주세요.');
    }
    
    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      console.error('❌ 카테고리 검증 실패:', { category, type: typeof category });
      throw new HttpsError('invalid-argument', '카테고리를 선택해주세요.');
    }

    console.log(`✅ 데이터 검증 통과: 주제="${topic.substring(0, 50)}..." 카테고리="${category}"`);

    // 사용자 프로필 가져오기 (타임아웃 방지)
    let userProfile = {};
    try {
      const userDoc = await Promise.race([
        db.collection('users').doc(request.auth.uid).get(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('프로필 조회 타임아웃')), 5000))
      ]);
      
      if (userDoc.exists) {
        userProfile = userDoc.data();
        console.log('✅ 사용자 프로필 조회 성공:', userProfile.name || 'Unknown');
      }
    } catch (profileError) {
      console.warn('⚠️ 프로필 조회 실패, 기본값 사용:', profileError.message);
      userProfile = {
        name: request.auth.token.name || '정치인',
        position: '의원',
        regionMetro: '지역',
        regionLocal: '지역구',
        status: '현역'
      };
    }

    // 🔥 수정된 프롬프트 - 1개만 생성하도록 변경
    const prompt = `정치인 블로그용 원고 1개를 작성해주세요.

작성자: ${userProfile.name || '정치인'} (${userProfile.position || '의원'})
주제: ${topic}
카테고리: ${category}
세부카테고리: ${data.subCategory || '없음'}
키워드: ${data.keywords || '없음'}

**중요: 반드시 1개의 원고만 작성하세요. 여러 버전을 만들지 마세요.**

다음 JSON 형식으로 응답해주세요:
{
  "title": "원고 제목",
  "content": "<p>HTML 형식의 원고 내용</p>",
  "wordCount": 1200
}

요구사항:
- 1000-1500자 분량
- HTML 형식으로 작성 (<p>, <strong> 등 사용)
- 진중하고 신뢰감 있는 톤
- 지역 주민과의 소통을 중시하는 내용
- 구체적인 정책이나 활동 내용 포함`;

    console.log('🤖 AI 호출 시작 (1개 원고 생성)...');
    
    // 🔥 백업 모델과 함께 호출
    const apiResponse = await callGeminiWithBackup(prompt);
    const responseText = apiResponse.response.text();
    
    console.log('✅ AI 응답 수신, 길이:', responseText.length);
    
    // 🔥 JSON 파싱 개선 - 단일 객체 처리
    let parsedResponse;
    try {
      // JSON 블록 추출
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       responseText.match(/\{[\s\S]*?\}/);
      
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        console.log('🔍 추출된 JSON 일부:', jsonText.substring(0, 200));
        parsedResponse = JSON.parse(jsonText);
        console.log('✅ JSON 파싱 성공, 제목:', parsedResponse.title);
      } else {
        throw new Error('JSON 형식 찾기 실패');
      }
    } catch (parseError) {
      console.warn('⚠️ JSON 파싱 실패, 기본 응답 생성:', parseError.message);
      console.warn('원본 응답:', responseText.substring(0, 500));
      
      // 🔥 백업 응답도 1개만 생성
      parsedResponse = {
        title: `${category}: ${topic}`,
        content: `<p><strong>${topic}</strong>에 대한 ${category} 원고입니다.</p>
<p>현재 상황을 분석하고 정책적 대안을 제시하겠습니다.</p>
<p>주민 여러분의 의견을 적극 수렴하여 더 나은 정책 방향을 모색하겠습니다.</p>
<p>관련 부처와의 협의를 통해 효과적인 해결방안을 마련하겠습니다.</p>
<p>투명하고 공정한 과정을 통해 국민의 목소리를 반영하겠습니다.</p>`,
        wordCount: 400
      };
    }

    // 🔥 단일 draft 객체 생성
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
    
    console.log('✅ generatePosts 성공 (1개 생성):', {
      title: singleDraft.title.substring(0, 50),
      processingTime: `${processingTime}ms`
    });

    // 🔥 1개의 draft만 배열에 담아서 반환
    return {
      success: true,
      drafts: [singleDraft],  // 배열에 1개만 담음
      metadata: {
        generatedAt: new Date().toISOString(),
        model: 'gemini-multi-fallback',
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
    if (error.message.includes('overloaded') || error.message.includes('unavailable')) {
      throw new HttpsError('unavailable', 'AI 서비스가 현재 과부하 상태입니다. 1-2분 후 다시 시도해주세요.');
    }
    
    if (error.message.includes('timeout') || error.message.includes('타임아웃')) {
      throw new HttpsError('deadline-exceeded', 'AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
    }
    
    throw new HttpsError('internal', `원고 생성 실패: ${error.message}`);
  }
});

// 🔥 generatePostDrafts 별칭 함수도 동일하게 수정
exports.generatePostDrafts = onCall(functionOptions, async (request) => {
  // generatePosts와 동일한 로직 호출
  return exports.generatePosts.run(request);
});