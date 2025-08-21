// functions/index.js - 완전한 Firebase Functions 엔트리포인트

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onRequest: _onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
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

const { defineSecret } = require('firebase-functions/params');
const geminiApiKey = defineSecret('GEMINI_API_KEY');

// ============================================================================
// Gemini API 호출 함수
// ============================================================================

/**
 * Gemini API 호출 - 안전하고 재시도 로직 포함
 * @param {string} prompt - AI에게 전달할 프롬프트
 * @param {string} apiKey - Gemini API 키
 * @returns {Promise<string>} AI 응답 텍스트
 */
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
        const waitTime = Math.pow(2, attempt) * 1000; // 지수 백오프
        console.log(`⏳ ${waitTime}ms 대기 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // 모든 재시도 실패시
  throw lastError || new Error('Gemini API 호출 실패');
}

// ============================================================================
// JSON 응답 파싱 함수들
// ============================================================================

/**
 * AI 응답에서 JSON 추출 및 파싱
 * @param {string} aiResponse - AI 원본 응답
 * @returns {Object|null} 파싱된 JSON 객체 또는 null
 */
function parseJsonResponse(aiResponse) {
  if (!aiResponse || typeof aiResponse !== 'string') {
    console.warn('⚠️ 유효하지 않은 AI 응답:', typeof aiResponse);
    return null;
  }

  try {
    // 마크다운 코드 블록 제거
    let cleanText = aiResponse
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/^[^{]*({.*})[^}]*$/s, '$1')
      .trim();
    
    const parsed = JSON.parse(cleanText);
    
    // 필수 필드 검증
    if (!parsed.title || !parsed.content) {
      throw new Error(`필수 필드 누락: title=${!!parsed.title}, content=${!!parsed.content}`);
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

/**
 * 일반소통 응답 파싱 (3가지 배리에이션)
 * @param {string} aiResponse - AI 원본 응답
 * @returns {Object|null} 3개 글이 포함된 응답 객체
 */
function parseDailyCommunicationResponse(aiResponse) {
  try {
    // JSON 배열 형태 파싱 시도
    const parsed = parseJsonResponse(aiResponse);
    
    if (parsed && Array.isArray(parsed.variations) && parsed.variations.length >= 3) {
      return {
        success: true,
        posts: parsed.variations.slice(0, 3).map((variation, index) => ({
          id: `var_${Date.now()}_${index}`,
          title: variation.title || `배리에이션 ${index + 1}`,
          content: variation.content || '',
          wordCount: variation.wordCount || Math.ceil((variation.content || '').replace(/<[^>]*>/g, '').length / 2),
          style: variation.style || `스타일${index + 1}`,
          timestamp: new Date().toISOString(),
          variationType: variation.type || `Type${index + 1}`
        }))
      };
    }
    
    // 단일 객체로 파싱된 경우, 3개로 복제
    if (parsed && parsed.title && parsed.content) {
      const basePost = {
        title: parsed.title,
        content: parsed.content,
        wordCount: parsed.wordCount,
        style: parsed.style || '이재명정신',
        timestamp: new Date().toISOString()
      };
      
      return {
        success: true,
        posts: [
          { ...basePost, id: `var_${Date.now()}_0`, variationType: '논리형' },
          { ...basePost, id: `var_${Date.now()}_1`, variationType: '친근형' },
          { ...basePost, id: `var_${Date.now()}_2`, variationType: '감성형' }
        ]
      };
    }
    
    throw new Error('유효한 배리에이션을 찾을 수 없습니다.');
    
  } catch (error) {
    console.error('❌ 일반소통 응답 파싱 실패:', error.message);
    return null;
  }
}

// ============================================================================
// 응답 처리 함수들
// ============================================================================

/**
 * 일반소통 카테고리 응답 처리
 * @param {string} aiResponse - AI 응답
 * @param {Object} requestData - 요청 데이터
 * @returns {Object} 처리된 응답
 */
async function handleDailyCommunicationResponse(aiResponse, requestData) {
  console.log('🎨 일반소통 응답 처리 시작');
  
  const parsed = parseDailyCommunicationResponse(aiResponse);
  
  if (parsed && parsed.success) {
    console.log(`✅ 일반소통 3가지 배리에이션 생성 성공`);
    return {
      success: true,
      type: 'multiple',
      posts: parsed.posts,
      metadata: {
        category: requestData.category,
        subCategory: requestData.subCategory,
        prompt: requestData.prompt,
        generatedAt: new Date().toISOString(),
        count: parsed.posts.length
      }
    };
  }
  
  // 파싱 실패시 단일 포스트로 폴백
  console.log('⚠️ 배리에이션 파싱 실패, 단일 포스트로 폴백');
  return await handleSinglePostResponse(aiResponse, requestData);
}

/**
 * 단일 포스트 응답 처리
 * @param {string} aiResponse - AI 응답
 * @param {Object} requestData - 요청 데이터
 * @returns {Object} 처리된 응답
 */
async function handleSinglePostResponse(aiResponse, requestData) {
  console.log('📝 단일 포스트 응답 처리 시작');
  
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
        category: requestData.category,
        prompt: requestData.prompt,
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
      title: `${requestData.category || '일반'} 포스트`,
      content: textContent,
      wordCount: estimatedWordCount,
      style: '이재명정신',
      timestamp: new Date().toISOString()
    },
    metadata: {
      category: requestData.category,
      prompt: requestData.prompt,
      generatedAt: new Date().toISOString(),
      note: 'JSON 파싱 실패로 텍스트 응답 처리됨'
    }
  };
}

// ============================================================================
// 메인 함수: generateSinglePost
// ============================================================================

exports.generateSinglePost = onCall({
  ...functionOptions,
  secrets: [geminiApiKey]
}, async (request) => {
  try {
    // 인증 확인
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    const { prompt, category, subCategory, keywords, userName, generateSingle } = request.data;

    console.log('🔥 generateSinglePost 호출:', { userId, prompt, category, subCategory, generateSingle });

    // 단일 생성 플래그 확인
    if (!generateSingle) {
      throw new HttpsError('invalid-argument', '단일 생성 모드가 아닙니다. generateSingle 플래그가 필요합니다.');
    }

    // 입력 검증
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

    // ✅ 응답 타입별 처리
    let finalResponse;
    
    // 일반소통 카테고리 확인 (prompts.js에서 daily-communication으로 라우팅됨)
    if (category === '일반소통' || category === '일반') {
      console.log('🎨 일상소통 응답 처리 시작');
      finalResponse = await handleDailyCommunicationResponse(aiResponse, { prompt, category, subCategory });
    } else {
      console.log('📝 기존 단일 포스트 응답 처리');
      finalResponse = await handleSinglePostResponse(aiResponse, { prompt, category });
    }

    return finalResponse;

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
// 기타 유틸리티 함수들
// ============================================================================

/**
 * 간단한 테스트 함수
 */
exports.testFunction = onCall(functionOptions, async (request) => {
  try {
    console.log('🧪 테스트 함수 호출:', request.data);
    
    return {
      success: true,
      message: 'Firebase Functions 정상 작동',
      timestamp: new Date().toISOString(),
      userAuth: !!request.auth,
      data: request.data
    };
  } catch (error) {
    console.error('❌ 테스트 함수 오류:', error);
    throw new HttpsError('internal', `테스트 실패: ${error.message}`);
  }
});

/**
 * 프롬프트 테스트 함수
 */
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

// ============================================================================
// 기존 handlers/posts.js 연동 (있는 경우)
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

  // 기존 함수들 내보내기
  exports.generatePosts = generatePosts;
  exports.getUserPosts = getUserPosts;
  exports.getPost = getPost;
  exports.updatePost = updatePost;
  exports.deletePost = deletePost;
  exports.checkUsageLimit = checkUsageLimit;
  
  console.log('✅ 기존 posts 핸들러 로드 성공');
  
} catch (error) {
  console.warn('⚠️ 기존 posts 핸들러 로드 실패 (정상):', error.message);
  
  // 기본 더미 함수들 제공
  exports.checkUsageLimit = onCall(functionOptions, async (request) => {
    return { canGenerate: true, reason: 'Dummy function' };
  });
}

// ============================================================================
// 추가 관리 함수들
// ============================================================================

/**
 * 시스템 상태 확인
 */
exports.healthCheck = onCall(functionOptions, async (request) => {
  try {
    // Firebase 연결 테스트
    const testDoc = await db.collection('_health').doc('test').get();
    
    // 프롬프트 시스템 테스트
    const testPromptResult = await buildSmartPrompt({
      prompt: '테스트',
      category: '일반소통',
      topic: '시스템 테스트'
    });
    
    return {
      success: true,
      firebase: 'OK',
      firestore: testDoc ? 'OK' : 'ERROR',
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