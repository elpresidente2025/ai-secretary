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
// 이재명 정신 프롬프트 시스템
// ============================================================================

function buildIJMPrompt({ 
  prompt, 
  category, 
  subCategory, 
  keywords, 
  userName,
  userProfile = {} 
}) {
  const name = userName || userProfile.name || '정치인';
  const position = userProfile.position || '의원';
  const regionInfo = [userProfile.regionMetro, userProfile.regionLocal]
    .filter(Boolean).join(' ').trim();
  const honorific = regionInfo ? `${regionInfo} 주민 여러분` : '여러분';

  return `
# AI비서관 - 이재명 정신 기반 원고 생성 시스템

[🌟 이재명 정신 핵심 가치 🌟]
- 기본사회: 모든 국민의 기본적 생활 보장과 인간다운 삶
- 포용국가: 차별 없는 사회, 소외계층을 품는 따뜻한 공동체  
- 공정경제: 기회의 평등, 불평등 해소, 상생발전
- 민생우선: 서민과 중산층 중심의 실용적 정책
- 기본소득: 보편적 복지로 모든 국민의 존엄성 보장

[작성 맥락]
- 작성자: ${name} (${position})
- 주제: ${prompt}
- 분류: ${category || '일반'} / 세부분류: ${subCategory || '없음'}
- 키워드: ${keywords || '없음'}
- 호칭: 기본 "${honorific}" 사용, 존댓말(~합니다), 1인칭은 "저는"

[🎯 이재명 정신 철학적 지침 🎯]
**핵심 원칙**: 모든 정책과 주장은 "사람이 우선"이라는 가치에서 출발하며, "함께 잘사는 사회"를 지향점으로 합니다.

**선호 키워드 및 표현**:
✅ 기본사회, 포용, 공정, 민생, 서민, 복지국가, 기본소득, 상생, 연대, 공동체
✅ 전국민기본소득, 국민취업지원제도, 부동산투기억제, 재벌개혁, 의료공공성
✅ 사람중심, 생명존중, 평등, 정의, 소통, 혁신, 지속가능발전

**철학적 균형 유지 원칙**:
- 반대 의견도 "~한 측면이 있지만" 형태로 인정 후 건설적 비판
- 비판 후에는 반드시 이재명식 포용적 대안 제시  
- 극단적 주장보다는 "균형잡힌 발전"과 "상생" 강조
- 모든 결론은 "국민 모두가 함께 잘사는" 방향으로 수렴

**제한적 언급 허용 방식** (완전 금지가 아닌 비판적 맥락):
- 신자유주의 → "신자유주의적 접근의 한계를 극복하고..."
- 선별복지 → "선별복지만으론 부족하며, 보편복지와의 조화를..."
- 낙수효과 → "낙수효과에만 의존할 수 없고, 직접적 지원이..."
- 규제완화 → "합리적 규제개선은 필요하지만, 서민보호 안전망은..."

**권장되는 표준 전개 구조**:
1. 상대방 논리 인정 → "~라는 관점도 이해하지만"
2. 현실적 한계 지적 → "그러나 현장에서는..."  
3. 포용적 대안 제시 → "보다 따뜻하고 현실적인 방안은..."
4. 구체적 근거와 사례 → "실제 성남·경기도에서의 경험을 보면..."
5. 상생 발전 지향 → "결국 모든 국민이 함께 잘사는 길은..."

[작성 규칙]
- 분량 1,200~1,500자, 소제목 포함(h2~h3)
- 진중하고 신뢰감 있는 톤
- 서민적이고 친근한 어투 (과도한 격식 지양)
- 구체적 생활 사례 중심의 설명 (추상적 이론 지양)
- "더불어 사는 세상", "따뜻한 공동체" 등 포용적 가치 강조

다음 JSON 형식으로만 응답하세요:
{
  "title": "원고 제목",
  "content": "HTML 형식의 원고 내용",
  "wordCount": 1234,
  "category": "${category || '일반'}",
  "subCategory": "${subCategory || ''}",
  "keywords": "${keywords || ''}",
  "timestamp": "${new Date().toISOString()}",
  "style": "이재명정신"
}
`.trim();
}

// ============================================================================
// Gemini 2.5 API 호출 함수 (업그레이드)
// ============================================================================

async function callGeminiAPI(prompt, apiKey) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  
  try {
    console.log('🤖 Gemini 2.5 Flash 시도 중...');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // ✅ Gemini 2.5 Flash로 업그레이드
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 3000,
      }
    });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Gemini 2.5 Flash 성공');
    return text;
    
  } catch (error) {
    console.error('⚠️ Gemini 2.5 Flash 실패:', error.message);
    
    // ✅ 2.5 Flash 실패 시 2.5 Flash-Lite로 백업
    try {
      console.log('🔄 Gemini 2.5 Flash-Lite로 백업 시도...');
      const genAI = new GoogleGenerativeAI(apiKey);
      const backupModel = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash-lite',
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 3000,
        }
      });
      
      const backupResult = await backupModel.generateContent(prompt);
      const backupResponse = await backupResult.response;
      const backupText = backupResponse.text();
      
      console.log('✅ Gemini 2.5 Flash-Lite 백업 성공');
      return backupText;
      
    } catch (backupError) {
      console.error('❌ Gemini 2.5 Flash-Lite 백업도 실패:', backupError);
      
      // ✅ 최종 백업: 1.5 Flash (기존 코드와 호환성)
      try {
        console.log('🔄 최종 백업: Gemini 1.5 Flash...');
        const genAI = new GoogleGenerativeAI(apiKey);
        const finalModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const finalResult = await finalModel.generateContent(prompt);
        const finalResponse = await finalResult.response;
        const finalText = finalResponse.text();
        
        console.log('✅ Gemini 1.5 Flash 최종 백업 성공');
        return finalText;
        
      } catch (finalError) {
        console.error('❌ 모든 모델 실패:', finalError);
        throw new Error('AI 서비스 호출에 실패했습니다: ' + error.message);
      }
    }
  }
}

// ============================================================================
// JSON 파싱 및 검증
// ============================================================================

function parseAndValidateJSON(text, context = {}) {
  try {
    // JSON 블록 추출
    const cleanText = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .replace(/^[^{]*({.*})[^}]*$/s, "$1")
      .trim();
    
    const parsed = JSON.parse(cleanText);
    
    // 필수 필드 검증
    if (!parsed.title || !parsed.content) {
      throw new Error(`필수 필드 누락: title=${!!parsed.title}, content=${!!parsed.content}`);
    }
    
    // 타입 검증
    if (typeof parsed.title !== 'string' || typeof parsed.content !== 'string') {
      throw new Error('필드 타입 오류: title과 content는 문자열이어야 함');
    }
    
    // 길이 검증
    if (parsed.title.length < 3 || parsed.content.length < 50) {
      throw new Error(`내용 길이 부족: title=${parsed.title.length}, content=${parsed.content.length}`);
    }
    
    // 기본값 설정
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
// generateSinglePost Function - 이재명 정신 + 응답 구조 수정
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

    // 🌟 이재명 정신 기반 프롬프트 생성
    const ijmPrompt = buildIJMPrompt({
      prompt,
      category,
      subCategory,
      keywords,
      userName,
      userProfile
    });

    console.log('🤖 이재명 정신 프롬프트 생성 완료, Gemini API 호출 중...');

    // ✅ Gemini 2.5 API 호출 (백업 전략 포함)
    const aiResponse = await callGeminiAPI(ijmPrompt, geminiApiKey.value());

    // JSON 파싱 및 검증
    const parsedPost = parseAndValidateJSON(aiResponse, { prompt, category });

    if (!parsedPost) {
      // 파싱 실패 시 폴백 응답
      console.warn('⚠️ JSON 파싱 실패, 폴백 응답 생성');
      const fallbackPost = {
        title: `${category || '일반'}: ${prompt.substring(0, 50)}...`,
        content: `<h2>${category || '일반'}: ${prompt.substring(0, 50)}...</h2>
<p>안녕하세요, ${userProfile.name || userName || '정치인'}입니다.</p>
<p><strong>${prompt}</strong>에 대해 이재명 정신을 바탕으로 말씀드리겠습니다.</p>
<p>저희가 추구하는 기본사회는 모든 국민이 인간다운 삶을 살 수 있는 사회입니다.</p>
<h3>포용적 관점에서의 접근</h3>
<p>이 문제를 해결하기 위해서는 무엇보다 사람이 우선되는 정책이 필요합니다.</p>
<p>선별적 접근보다는 보편적 지원을 통해 모든 국민이 함께 잘사는 길을 모색해야 합니다.</p>
<h3>구체적인 실행 방안</h3>
<p>성남시장 시절의 경험을 바탕으로, 현장 중심의 실용적 정책을 추진하겠습니다.</p>
<p>주민 여러분의 목소리를 적극 듣고 반영하여 더 나은 정책을 만들어가겠습니다.</p>`,
        category: category || '일반',
        subCategory: subCategory || '',
        keywords: keywords || '',
        timestamp: new Date().toISOString(),
        wordCount: 300,
        style: '이재명정신_폴백'
      };
      
      // ✅ 프론트엔드가 기대하는 정확한 응답 구조
      return {
        success: true,
        data: {
          singlePost: fallbackPost,  // ← 프론트엔드가 기대하는 구조!
          usage: {
            promptTokens: Math.ceil(ijmPrompt.length / 4),
            completionTokens: Math.ceil(fallbackPost.content.length / 4)
          },
          metadata: {
            model: 'fallback',
            philosophy: '이재명정신',
            processingTime: Date.now()
          }
        }
      };
    }

    console.log('✅ generateSinglePost 성공 - 이재명 정신 반영');

    // ✅ 프론트엔드가 기대하는 정확한 응답 구조
    return {
      success: true,
      data: {
        singlePost: parsedPost,  // ← 프론트엔드가 기대하는 구조!
        usage: {
          promptTokens: Math.ceil(ijmPrompt.length / 4),
          completionTokens: Math.ceil(parsedPost.content.length / 4)
        },
        metadata: {
          model: 'gemini-2.5-flash',
          philosophy: '이재명정신',
          processingTime: Date.now()
        }
      }
    };

  } catch (error) {
    console.error('❌ generateSinglePost 오류:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    // 특별 에러 메시지 처리
    if (error.message.includes('quota') || error.message.includes('resource-exhausted')) {
      throw new HttpsError('resource-exhausted', 'AI 서비스 사용량이 한도에 도달했습니다. 5-10분 후 다시 시도해주세요.');
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

    // 사용자 프로필 조회
    let userProfile = {};
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        userProfile = userDoc.data();
      }
    } catch (profileError) {
      console.warn('프로필 조회 실패:', profileError.message);
    }

    // 3개의 초안 생성 (이재명 정신 기반)
    const drafts = [];
    for (let i = 0; i < 3; i++) {
      const ijmPrompt = buildIJMPrompt({
        prompt: `${prompt} (초안 ${i + 1}/3)`,
        category,
        subCategory: '',
        keywords,
        userName,
        userProfile
      });

      // ✅ Gemini 2.5 API 호출 (백업 전략 포함)
      const aiResponse = await callGeminiAPI(ijmPrompt, geminiApiKey.value());
      const parsedPost = parseAndValidateJSON(aiResponse, { prompt, category });

      if (parsedPost) {
        drafts.push({
          id: `ijm_draft_${i + 1}`,
          ...parsedPost
        });
      } else {
        // 파싱 실패 시 기본 초안
        drafts.push({
          id: `ijm_draft_${i + 1}`,
          title: `${category || '일반'} 초안 ${i + 1}`,
          content: `<p>이재명 정신을 바탕으로 한 ${prompt} 관련 초안 ${i + 1}입니다.</p>`,
          timestamp: new Date().toISOString(),
          style: '이재명정신_기본'
        });
      }
    }

    console.log('✅ generatePostDrafts 성공 - 이재명 정신 반영');

    return {
      success: true,
      data: {
        drafts,
        category: category || '일반',
        keywords,
        philosophy: '이재명정신'
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
      philosophy: '이재명정신', // 🌟 이재명 정신 태그 추가
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: metadata || {}
    };

    const docRef = await db.collection('posts').add(postData);
    console.log('✅ savePost 성공:', docRef.id);

    return {
      success: true,
      postId: docRef.id,
      message: '이재명 정신을 반영한 원고가 성공적으로 저장되었습니다.'
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