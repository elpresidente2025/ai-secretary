// functions/index.js - 올바른 수정 (기존 prompts.js 시스템 활용)

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onRequest: _onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

// ✅ 기존 prompts.js의 buildSmartPrompt 사용
const { buildSmartPrompt, getPolicySafe, createFallbackDraft } = require('./templates/prompts');

// 기존 설정들...
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
// ❌ 기존 buildIJMPrompt 제거 (prompts.js의 buildSmartPrompt로 대체)
// ============================================================================

// ============================================================================
// ✅ generateSinglePost 함수 수정 (기존 시스템 활용)
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

    console.log('🔥 generateSinglePost 호출:', { userId, prompt, category, subCategory, generateSingle });

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

    // ✅ 기존 prompts.js의 buildSmartPrompt 사용 (카테고리 자동 분기!)
    const smartPrompt = await buildSmartPrompt({
      // 기본 정보
      prompt,
      category,
      subCategory,
      keywords,
      userName,
      userProfile,
      
      // daily-communication에 필요한 추가 정보들
      topic: prompt,
      authorName: userProfile.name || userName || '정치인',
      authorPosition: userProfile.position || '의원',
      authorBio: userProfile.bio || '',
      authorStatus: userProfile.status || '현역',
      regionMetro: userProfile.regionMetro || '',
      regionLocal: userProfile.regionLocal || ''
    });

    console.log('🤖 스마트 프롬프트 생성 완료, Gemini API 호출 중...');

    // ✅ Gemini 2.5 API 호출
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
    
    if (error.message.includes('quota') || error.message.includes('resource-exhausted')) {
      throw new HttpsError('resource-exhausted', 'AI 서비스 사용량이 한도에 도달했습니다. 5-10분 후 다시 시도해주세요.');
    }
    
    throw new HttpsError('internal', '원고 생성에 실패했습니다.');
  }
});

// ============================================================================
// ✅ 응답 처리 함수들
// ============================================================================

async function handleDailyCommunicationResponse(aiResponse, context) {
  try {
    // JSON 배열 파싱 시도 (3가지 배리에이션)
    const cleanResponse = aiResponse
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    
    const variations = JSON.parse(cleanResponse);
    
    if (Array.isArray(variations) && variations.length === 3) {
      console.log('✅ 3가지 배리에이션 생성 성공');
      
      // 각 배리에이션 검증
      const validVariations = variations.filter(v => v.title && v.content && v.meta);
      
      if (validVariations.length >= 1) {
        // 프론트엔드 호환성을 위해 첫 번째를 기본으로 반환
        return {
          success: true,
          data: {
            singlePost: {
              title: validVariations[0].title,
              content: validVariations[0].content,
              category: context.category || '일반소통',
              subCategory: context.subCategory || '',
              keywords: '',
              timestamp: new Date().toISOString(),
              wordCount: validVariations[0].wordCount || 
                Math.ceil(validVariations[0].content.replace(/<[^>]*>/g, '').length / 2),
              style: validVariations[0].style || '일상소통_다양',
              meta: validVariations[0].meta // 🆕 메타데이터 포함!
            },
            alternativeVersions: validVariations.slice(1).map(v => ({
              title: v.title,
              content: v.content,
              wordCount: v.wordCount,
              style: v.style,
              meta: v.meta
            })),
            metadata: {
              variationCount: validVariations.length,
              generationType: 'daily-communication',
              variationStyles: validVariations.map(v => v.style),
              personalPreferences: validVariations.map(v => v.meta?.personalPreferences),
              contextualConstraints: validVariations[0].meta?.contextualConstraints
            }
          }
        };
      }
    }
    
    throw new Error('배리에이션 형식 오류');
    
  } catch (parseError) {
    console.warn('⚠️ 일상소통 JSON 파싱 실패, 단일 응답으로 폴백:', parseError.message);
    return await handleSinglePostResponse(aiResponse, context);
  }
}

async function handleSinglePostResponse(aiResponse, context) {
  const parsedPost = parseAndValidateJSON(aiResponse, context);
  
  if (!parsedPost) {
    // 기존 폴백 처리 로직
    console.warn('⚠️ JSON 파싱 실패, 폴백 응답 생성');
    const fallbackPost = createFallbackPost(context);
    
    return {
      success: true,
      data: {
        singlePost: fallbackPost,
        usage: {
          promptTokens: 100,
          completionTokens: 300
        },
        metadata: {
          model: 'fallback',
          philosophy: '이재명정신',
          processingTime: Date.now()
        }
      }
    };
  }

  return {
    success: true,
    data: {
      singlePost: parsedPost,
      usage: {
        promptTokens: Math.ceil(aiResponse.length / 4),
        completionTokens: Math.ceil(parsedPost.content.length / 4)
      },
      metadata: {
        model: 'gemini-2.5-flash',
        philosophy: '이재명정신',
        processingTime: Date.now()
      }
    }
  };
}

function createFallbackPost(context) {
  const { prompt, category } = context;
  return {
    title: `${category || '일반'}: ${prompt.substring(0, 50)}...`,
    content: `<h2>${category || '일반'}: ${prompt.substring(0, 50)}...</h2>
<p>원고 생성 중 오류가 발생하여 기본 템플릿을 제공합니다.</p>
<p>주제: <strong>${prompt}</strong></p>
<p>이재명 정신을 바탕으로 더 나은 원고를 재생성하겠습니다.</p>`,
    category: category || '일반',
    subCategory: '',
    keywords: '',
    timestamp: new Date().toISOString(),
    wordCount: 200,
    style: '이재명정신_폴백'
  };
}

// ============================================================================
// ✅ 기존 함수들 유지 (callGeminiAPI, parseAndValidateJSON 등)
// ============================================================================

async function callGeminiAPI(prompt, apiKey) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096,
    }
  });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

function parseAndValidateJSON(aiResponse, fallbackContext = {}) {
  try {
    let cleanText = aiResponse
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .replace(/^[^{]*({.*})[^}]*$/s, "$1")
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
// 사용량 제한 및 기타 handlers 유지
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
  
  checkUsageLimit = importedCheckUsageLimit;
} catch (e) {
  console.warn('포스트 핸들러 로드 실패:', e.message);
}