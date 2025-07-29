const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 🔥 Gemini API 키를 Secret으로 정의
const geminiApiKey = defineSecret('GEMINI_API_KEY');

// 🔥 asia-northeast3 리전 강제 설정
setGlobalOptions({
  region: 'asia-northeast3',
  memory: '512MiB',
  timeoutSeconds: 300, // 5분으로 증가 (AI 처리 시간 고려)
});

admin.initializeApp();
const db = admin.firestore();

const functionOptions = {
  region: 'asia-northeast3',
  memory: '512MiB',
  timeoutSeconds: 300,
  cors: true,
  secrets: [geminiApiKey], // Secret 접근 권한 추가
};

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

// 🔥 실제 Gemini API를 사용한 generatePosts Function
exports.generatePosts = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const data = request.data;
    const startTime = Date.now();
    
    console.log('🔥 generatePosts 호출 - 실제 Gemini API 사용:', data);

    // 🔥 유연한 필드 매핑
    const topic = data.topic || data.prompt || '';
    const category = data.category || '';
    
    if (!topic || !topic.trim()) {
      throw new HttpsError('invalid-argument', '주제를 입력해주세요.');
    }
    
    if (!category || !category.trim()) {
      throw new HttpsError('invalid-argument', '카테고리를 선택해주세요.');
    }

    // 🔥 사용자 프로필 가져오기 (맞춤형 원고 생성용)
    let userProfile = {};
    try {
      const userDoc = await db.collection('users').doc(request.auth.uid).get();
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

    // 🔥 Gemini AI 초기화
    const genAI = new GoogleGenerativeAI(geminiApiKey.value());
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });

    // 🔥 정치 전문 프롬프트 구성
    const systemPrompt = `당신은 더불어민주당 소속 정치인들을 위한 전문 원고 작성 AI입니다.

**작성자 정보:**
- 이름: ${userProfile.name || '정치인'}
- 직책: ${userProfile.position || '의원'}
- 지역: ${userProfile.regionMetro || ''} ${userProfile.regionLocal || ''}
- 선거구: ${userProfile.electoralDistrict || ''}
- 상태: ${userProfile.status || '현역'}

**원고 작성 원칙:**
1. 진중하고 신뢰감 있는 톤앤매너 유지
2. 구체적이고 실현 가능한 내용 포함
3. 주민과의 소통을 중시하는 메시지
4. 정치적으로 중립적이면서도 민주당 가치 반영
5. 1000-1500자 내외의 적절한 분량
6. HTML 태그 사용 (p, strong, ul, li 등)

**카테고리별 특성:**
- 의정활동: 국정감사, 법안발의, 위원회 활동 등 공식적 업무
- 지역활동: 현장방문, 주민간담회, 지역현안 해결
- 정책/비전: 경제, 복지, 교육 등 정책 제안 및 비전
- 보도자료: 간결하고 명확한 공식 입장문
- 일반: 일상 소통, 인사, 감사 메시지`;

    const userPrompt = `다음 조건에 맞는 블로그 원고 3개를 작성해주세요:

**주제:** ${topic}
**카테고리:** ${category}
**세부카테고리:** ${data.subCategory || '없음'}
**키워드:** ${data.keywords ? data.keywords.join(', ') : '없음'}

각 원고는 다음과 같은 구조로 작성해주세요:
1. 제목: 간결하면서도 주목을 끄는 제목
2. 내용: 인사말 → 주제 설명 → 구체적 방안/의견 → 마무리 인사
3. 스타일: 각각 다른 접근 방식 (분석형, 제안형, 소통형)

응답은 반드시 다음 JSON 형식으로 해주세요:
{
  "drafts": [
    {
      "title": "원고 제목 1",
      "content": "<p>HTML 형식의 원고 내용 1</p>",
      "style": "접근 방식 설명",
      "wordCount": 예상_글자수
    },
    {
      "title": "원고 제목 2", 
      "content": "<p>HTML 형식의 원고 내용 2</p>",
      "style": "접근 방식 설명",
      "wordCount": 예상_글자수
    },
    {
      "title": "원고 제목 3",
      "content": "<p>HTML 형식의 원고 내용 3</p>", 
      "style": "접근 방식 설명",
      "wordCount": 예상_글자수
    }
  ]
}`;

    try {
      console.log('🤖 Gemini API 호출 시작...');
      
      // 🔥 Gemini API 호출
      const result = await model.generateContent([
        { text: systemPrompt },
        { text: userPrompt }
      ]);
      
      const response = await result.response;
      const generatedText = response.text();
      
      console.log('🤖 Gemini 원시 응답:', generatedText.substring(0, 500) + '...');
      
      // 🔥 JSON 파싱 (마크다운 코드 블록 제거)
      let jsonText = generatedText.trim();
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('JSON 파싱 실패, 텍스트 기반 파싱 시도:', parseError);
        // JSON 파싱 실패 시 폴백 처리
        throw new HttpsError('internal', 'AI 응답 형식이 올바르지 않습니다.');
      }

      // 🔥 응답 검증 및 정규화
      if (!parsedResponse.drafts || !Array.isArray(parsedResponse.drafts)) {
        throw new HttpsError('internal', 'AI가 올바른 형식의 원고를 생성하지 못했습니다.');
      }

      const drafts = parsedResponse.drafts.map((draft, index) => ({
        title: draft.title || `${category}: ${topic} (${index + 1})`,
        content: draft.content || '<p>원고 생성에 실패했습니다.</p>',
        wordCount: draft.wordCount || Math.ceil((draft.content || '').length / 2),
        tags: data.keywords || [],
        category: category,
        style: draft.style || '일반',
        metadata: {
          aiModel: 'gemini-1.5-flash',
          prompt: topic,
          userProfile: userProfile.name || 'Unknown'
        }
      }));

      const processingTime = Date.now() - startTime;
      
      console.log('✅ generatePosts 성공 (실제 Gemini API):', {
        draftsCount: drafts.length,
        processingTime: `${processingTime}ms`
      });

      return {
        success: true,
        drafts: drafts,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'gemini-1.5-flash',
          processingTime: processingTime,
          region: 'asia-northeast3',
          inputTopic: topic,
          inputCategory: category,
          userProfile: userProfile.name || 'Unknown'
        }
      };

    } catch (geminiError) {
      console.error('❌ Gemini API 오류:', geminiError);
      throw new HttpsError('internal', 'AI 원고 생성 중 오류가 발생했습니다: ' + geminiError.message);
    }

  } catch (error) {
    console.error('❌ generatePosts 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '원고 생성에 실패했습니다.');
  }
});