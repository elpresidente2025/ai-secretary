'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ✅ editorial.js 직접 import
const { SEO_RULES, CONTENT_RULES, FORMAT_RULES, EDITORIAL_WORKFLOW } = require('./templates/guidelines/editorial');
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
// JSON 응답 파싱 함수들 - variations 배열 지원
// ============================================================================

function parseVariationsResponse(aiResponse) {
  if (!aiResponse || typeof aiResponse !== 'string') {
    console.warn('⚠️ 유효하지 않은 AI 응답:', typeof aiResponse);
    return null;
  }

  try {
    // 마크다운 코드 블록 제거 및 정리
    let cleanText = aiResponse
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    // variations 배열 형태 파싱 시도
    if (cleanText.includes('"variations"')) {
      const parsed = JSON.parse(cleanText);
      if (parsed.variations && Array.isArray(parsed.variations)) {
        console.log(`✅ variations 배열 파싱 성공: ${parsed.variations.length}개`);
        return parsed;
      }
    }

    // 직접 배열 형태 파싱 시도
    if (cleanText.startsWith('[')) {
      const variationsArray = JSON.parse(cleanText);
      if (Array.isArray(variationsArray) && variationsArray.length > 0) {
        console.log(`✅ 직접 배열 파싱 성공: ${variationsArray.length}개`);
        return { variations: variationsArray };
      }
    }

    // 단일 객체 파싱 시도 (fallback)
    const singleParsed = JSON.parse(cleanText);
    if (singleParsed.title && singleParsed.content) {
      console.log('✅ 단일 객체 파싱 성공 (variations 배열로 변환)');
      return { variations: [singleParsed] };
    }

    throw new Error('파싱 가능한 구조를 찾을 수 없습니다.');
    
  } catch (error) {
    console.warn('⚠️ JSON 파싱 실패:', error.message);
    console.warn('⚠️ 원본 응답 (첫 500자):', aiResponse.substring(0, 500));
    return null;
  }
}

// ============================================================================
// 🆕 메타데이터 수집 및 분석 Function
// ============================================================================

exports.collectMetadata = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    const metadataPackage = request.data;

    console.log('📊 collectMetadata 호출:', userId);

    // 메타데이터를 Firestore에 저장
    const metadataDoc = {
      userId: userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      contentData: metadataPackage.contentData || {},
      aiMetadata: metadataPackage.aiMetadata || {},
      userBehavior: metadataPackage.userBehavior || {},
      performanceMetrics: metadataPackage.performanceMetrics || {}
    };

    // metadata 컬렉션에 저장
    await db.collection('metadata').add(metadataDoc);

    // 🔍 간단한 인사이트 분석 (향후 고도화 가능)
    const recentMetadataSnapshot = await db.collection('metadata')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    const userPatterns = {
      preferredCategories: {},
      averageWordCount: 0,
      frequentStyles: {},
      generationTrends: []
    };

    let totalWordCount = 0;
    let validEntries = 0;

    recentMetadataSnapshot.forEach(doc => {
      const data = doc.data();
      
      // 카테고리 선호도 분석
      if (data.contentData?.category) {
        userPatterns.preferredCategories[data.contentData.category] = 
          (userPatterns.preferredCategories[data.contentData.category] || 0) + 1;
      }
      
      // 평균 글자 수 계산
      if (data.contentData?.wordCount) {
        totalWordCount += data.contentData.wordCount;
        validEntries++;
      }
      
      // 스타일 선호도 분석
      if (data.aiMetadata?.style) {
        userPatterns.frequentStyles[data.aiMetadata.style] = 
          (userPatterns.frequentStyles[data.aiMetadata.style] || 0) + 1;
      }
    });

    if (validEntries > 0) {
      userPatterns.averageWordCount = Math.round(totalWordCount / validEntries);
    }

    const insights = {
      totalAnalyzedPosts: validEntries,
      userPatterns,
      recommendations: [
        '더 다양한 카테고리 시도해보세요',
        'SEO 최적화를 위해 1500자 이상 작성을 권장합니다'
      ]
    };

    console.log('✅ collectMetadata 완료:', insights.totalAnalyzedPosts);

    return {
      success: true,
      message: '메타데이터가 수집되었습니다.',
      insights
    };

  } catch (error) {
    console.error('❌ collectMetadata 오류:', error);
    // 메타데이터 수집 실패는 주 기능에 영향을 주지 않도록 함
    return {
      success: false,
      message: '메타데이터 수집에 실패했지만 서비스는 정상 작동합니다.',
      error: error.message
    };
  }
});

// ============================================================================
// generateSinglePost - 메인 AI 생성 함수 (완전 수정)
// ============================================================================

exports.generateSinglePost = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    const { 
      prompt, 
      category, 
      subCategory, 
      keywords, 
      userName, 
      generateSingle,
      applyEditorialRules 
    } = request.data;

    console.log('🔥 generateSinglePost 호출:', { 
      userId, 
      prompt, 
      category, 
      subCategory, 
      generateSingle,
      applyEditorialRules 
    });

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

    // ✅ editorial.js 규칙을 buildSmartPrompt에 전달
    const promptOptions = {
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
      regionLocal: userProfile.regionLocal || '',
      
      // 🆕 editorial.js 규칙 적용
      ...(applyEditorialRules && {
        seoRules: SEO_RULES,
        contentRules: CONTENT_RULES,
        formatRules: FORMAT_RULES,
        editorialWorkflow: EDITORIAL_WORKFLOW,
        enforceWordCount: true,
        minWordCount: SEO_RULES.wordCount.min,
        maxWordCount: SEO_RULES.wordCount.max,
        targetWordCount: SEO_RULES.wordCount.target
      })
    };

    console.log('🤖 스마트 프롬프트 생성 중... (editorial.js 규칙 적용)');
    const smartPrompt = await buildSmartPrompt(promptOptions);

    console.log('🤖 Gemini API 호출 중... (editorial.js 규칙 적용됨)');
    const aiResponse = await callGeminiAPI(smartPrompt, geminiApiKey.value());

    // ✅ variations 배열 처리 (3개 받아서 1개만 선택)
    const parsed = parseVariationsResponse(aiResponse);
    
    if (parsed && parsed.variations && parsed.variations.length > 0) {
      console.log(`✅ variations 생성 성공: ${parsed.variations.length}개 (첫 번째 선택)`);
      
      // 🔥 첫 번째 variation만 선택 (사용자 요구사항)
      const selectedVariation = parsed.variations[0];
      
      // 필수 필드 검증 및 보완
      const validatedPost = {
        id: `post_${Date.now()}`,
        title: selectedVariation.title || `${category || '일반'} 포스트`,
        content: selectedVariation.content || '<p>내용이 생성되지 않았습니다.</p>',
        wordCount: selectedVariation.wordCount || (selectedVariation.content || '').replace(/<[^>]*>/g, '').length,
        style: selectedVariation.style || 'default',
        type: selectedVariation.type || 'standard',
        category: selectedVariation.meta?.category || category,
        subCategory: selectedVariation.meta?.subCategory || subCategory,
        seoCompliant: (selectedVariation.wordCount || 0) >= (SEO_RULES.wordCount.min || 1500),
        meta: {
          ...selectedVariation.meta,
          editorialRulesApplied: true,
          generatedAt: new Date().toISOString(),
          totalVariationsGenerated: parsed.variations.length,
          selectedVariationIndex: 0
        }
      };

      return {
        success: true,
        type: 'single',
        variations: [validatedPost], // 단일 variation을 배열로 감싸서 프론트엔드 호환성 유지
        metadata: {
          category: category,
          subCategory: subCategory,
          prompt: prompt,
          generatedAt: new Date().toISOString(),
          editorialRulesApplied: true,
          seoTargetMet: validatedPost.seoCompliant,
          totalVariations: 1, // 실제로는 1개만 반환
          originalVariationsCount: parsed.variations.length
        }
      };
    }
    
    // JSON 파싱 실패시 텍스트 응답으로 처리 (Fallback)
    console.log('⚠️ variations 파싱 실패, 단일 텍스트 응답으로 처리');
    
    const textContent = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const plainText = textContent.replace(/<[^>]*>/g, '');
    const estimatedWordCount = plainText.length;
    
    const fallbackPost = {
      id: `post_${Date.now()}`,
      title: `${category || '일반'} 포스트`,
      content: textContent.includes('<p>') ? textContent : `<p>${textContent}</p>`,
      wordCount: estimatedWordCount,
      style: '이재명정신',
      type: 'fallback',
      category: category,
      subCategory: subCategory,
      seoCompliant: estimatedWordCount >= (SEO_RULES.wordCount.min || 1500),
      meta: {
        editorialRulesApplied: true,
        generatedAt: new Date().toISOString(),
        fallbackProcessed: true
      }
    };

    return {
      success: true,
      type: 'single',
      variations: [fallbackPost], // 단일 fallback을 배열로 감싸기
      metadata: {
        category: category,
        subCategory: subCategory,
        prompt: prompt,
        generatedAt: new Date().toISOString(),
        editorialRulesApplied: true,
        note: 'variations 파싱 실패로 텍스트 응답 처리됨',
        fallbackUsed: true
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
// 기존 Functions들 (수정 없음)
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

// 나머지 기존 Functions들은 동일하게 유지...
// (savePost, getUserProfile, updateProfile, registerUser 등)

// savePost Function
exports.savePost = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    const postData = request.data;

    console.log('🔥 savePost 호출:', { userId, title: postData?.title });

    if (!postData || !postData.title || !postData.content) {
      throw new HttpsError('invalid-argument', '제목과 내용이 필요합니다.');
    }

    const sanitizedData = {
      title: postData.title,
      content: postData.content,
      htmlContent: postData.htmlContent,
      plainText: postData.plainText,
      category: postData.category || '일반',
      subCategory: postData.subCategory || '',
      keywords: postData.keywords || '',
      status: postData.status || 'draft',
      wordCount: postData.wordCount || 0,
      style: postData.style || '',
      type: postData.type || '',
      meta: postData.meta || {},
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

console.log('🚀 Firebase Functions 초기화 완료 - AI비서관 서비스 (editorial.js 연동)');