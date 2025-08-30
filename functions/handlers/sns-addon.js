// functions/handlers/sns-addon.js
const { HttpsError } = require('firebase-functions/v2/https');
const { wrap } = require('../common/wrap');
const { ok, error } = require('../common/response');
const { admin, db } = require('../utils/firebaseAdmin');
const { generateContent } = require('../services/gemini');

// SNS 플랫폼별 제한사항
const SNS_LIMITS = {
  facebook: {
    maxLength: 63206,
    recommendedLength: 400,
    hashtagLimit: 30
  },
  instagram: {
    maxLength: 2200,
    recommendedLength: 150,
    hashtagLimit: 30
  },
  twitter: {
    maxLength: 280,
    recommendedLength: 280,
    hashtagLimit: 2
  },
  linkedin: {
    maxLength: 3000,
    recommendedLength: 300,
    hashtagLimit: 5
  }
};

// 사용자 플랜별 SNS 변환 한도
const PLAN_LIMITS = {
  'local_blogger': 5,
  'regional_influencer': 10
};

/**
 * 원고를 SNS용으로 변환
 */
exports.convertToSNS = wrap(async (req) => {
  const { uid } = req.auth || {};
  const { postId, platform, tone } = req.data;

  if (!uid) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }

  if (!postId || !platform) {
    throw new HttpsError('invalid-argument', '원고 ID와 플랫폼이 필요합니다.');
  }

  if (!SNS_LIMITS[platform]) {
    throw new HttpsError('invalid-argument', '지원하지 않는 플랫폼입니다.');
  }

  try {
    // 1. 사용자 정보 및 SNS 애드온 상태 확인
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', '사용자를 찾을 수 없습니다.');
    }

    const userData = userDoc.data();
    const userRole = userData.role || 'local_blogger';
    
    // SNS 애드온 활성화 확인
    if (!userData.snsAddon?.isActive) {
      throw new HttpsError('permission-denied', 'SNS 애드온을 구매해주세요.');
    }

    // 이번 달 사용량 확인
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthlyUsage = userData.snsAddon?.monthlyUsage || {};
    const thisMonthUsage = monthlyUsage[currentMonth] || 0;
    const monthlyLimit = PLAN_LIMITS[userRole] || 5;

    if (thisMonthUsage >= monthlyLimit) {
      throw new HttpsError('resource-exhausted', 
        `이번 달 SNS 변환 한도(${monthlyLimit}회)를 초과했습니다.`);
    }

    // 2. 원고 조회
    const postDoc = await db.collection('posts').doc(postId).get();
    if (!postDoc.exists) {
      throw new HttpsError('not-found', '원고를 찾을 수 없습니다.');
    }

    const postData = postDoc.data();
    
    // 원고 소유권 확인
    if (postData.userId !== uid) {
      throw new HttpsError('permission-denied', '본인의 원고만 변환할 수 있습니다.');
    }

    // 3. SNS 변환 프롬프트 생성
    const originalContent = postData.content;
    const platformConfig = SNS_LIMITS[platform];
    
    const snsPrompt = generateSNSPrompt(originalContent, platform, tone || 'friendly', platformConfig);
    
    console.log('🔄 SNS 변환 시작:', { postId, platform, userRole });

    // 4. Gemini API로 변환 실행
    const convertedResult = await generateContent(snsPrompt, {
      temperature: 0.7,
      maxOutputTokens: 1000
    });

    if (!convertedResult?.content) {
      throw new HttpsError('internal', 'SNS 변환에 실패했습니다.');
    }

    // 5. 결과 파싱
    const parsedResult = parseConvertedContent(convertedResult.content, platform);

    // 6. 변환 기록 저장
    const conversionData = {
      userId: uid,
      originalPostId: postId,
      platform: platform,
      tone: tone || 'friendly',
      originalContent: originalContent,
      convertedContent: parsedResult.content,
      hashtags: parsedResult.hashtags,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        wordCount: parsedResult.content.length,
        characterCount: parsedResult.content.length,
        hashtagCount: parsedResult.hashtags.length,
        originalWordCount: originalContent.length
      }
    };

    await db.collection('sns_conversions').add(conversionData);

    // 7. 사용량 업데이트
    await db.collection('users').doc(uid).update({
      [`snsAddon.monthlyUsage.${currentMonth}`]: thisMonthUsage + 1,
      'snsAddon.totalUsed': admin.firestore.FieldValue.increment(1),
      'snsAddon.lastUsedAt': admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ SNS 변환 완료:', { postId, platform, length: parsedResult.content.length });

    return ok({
      convertedContent: parsedResult.content,
      hashtags: parsedResult.hashtags,
      platform: platform,
      usageLeft: monthlyLimit - thisMonthUsage - 1,
      metadata: conversionData.metadata
    });

  } catch (error) {
    console.error('❌ SNS 변환 실패:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'SNS 변환 중 오류가 발생했습니다.');
  }
});

/**
 * SNS 애드온 사용량 조회
 */
exports.getSNSUsage = wrap(async (req) => {
  const { uid } = req.auth || {};

  if (!uid) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }

  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', '사용자를 찾을 수 없습니다.');
    }

    const userData = userDoc.data();
    const userRole = userData.role || 'local_blogger';
    const monthlyLimit = PLAN_LIMITS[userRole] || 5;
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const snsAddon = userData.snsAddon || {
      isActive: false,
      monthlyUsage: {},
      totalUsed: 0
    };

    const thisMonthUsage = snsAddon.monthlyUsage?.[currentMonth] || 0;

    return ok({
      isActive: snsAddon.isActive || false,
      monthlyLimit: monthlyLimit,
      thisMonthUsage: thisMonthUsage,
      usageLeft: Math.max(0, monthlyLimit - thisMonthUsage),
      totalUsed: snsAddon.totalUsed || 0,
      currentMonth: currentMonth,
      userRole: userRole
    });

  } catch (error) {
    console.error('❌ SNS 사용량 조회 실패:', error);
    throw new HttpsError('internal', 'SNS 사용량 조회 중 오류가 발생했습니다.');
  }
});

/**
 * SNS 애드온 구매/활성화
 */
exports.purchaseSNSAddon = wrap(async (req) => {
  const { uid } = req.auth || {};

  if (!uid) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }

  try {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    await db.collection('users').doc(uid).update({
      'snsAddon.isActive': true,
      'snsAddon.purchaseDate': admin.firestore.FieldValue.serverTimestamp(),
      'snsAddon.expiryDate': admin.firestore.Timestamp.fromDate(nextMonth),
      'snsAddon.monthlyUsage': {},
      'snsAddon.totalUsed': 0
    });

    console.log('✅ SNS 애드온 구매 완료:', uid);

    return ok({
      message: 'SNS 애드온이 성공적으로 활성화되었습니다.',
      expiryDate: nextMonth.toISOString(),
      price: 22000
    });

  } catch (error) {
    console.error('❌ SNS 애드온 구매 실패:', error);
    throw new HttpsError('internal', 'SNS 애드온 구매 중 오류가 발생했습니다.');
  }
});

/**
 * SNS 변환 프롬프트 생성
 */
function generateSNSPrompt(originalContent, platform, tone, platformConfig) {
  const toneMap = {
    friendly: '친근하고 대화하는 듯한',
    professional: '전문적이고 신뢰할 수 있는',
    energetic: '활기차고 열정적인',
    informative: '정보 전달에 집중한'
  };

  const toneDescription = toneMap[tone] || toneMap.friendly;

  return `다음 원고를 ${platform}용으로 변환해주세요.

**원본 내용:**
${originalContent}

**변환 요구사항:**
- 플랫폼: ${platform}
- 톤: ${toneDescription} 톤
- 최대 길이: ${platformConfig.recommendedLength}자 이내 (절대 ${platformConfig.maxLength}자 초과 금지)
- 해시태그: 최대 ${platformConfig.hashtagLimit}개

**출력 형식:**
---CONTENT---
[변환된 SNS 게시물 내용]
---HASHTAGS---
[관련 해시태그들을 쉼표로 구분]

**주의사항:**
- 선거법을 준수하여 과도한 자기 홍보나 투표 요청은 피해주세요
- 원본의 핵심 메시지는 유지하되, SNS에 적합하게 간결하게 작성
- 이모지는 적절히 사용 (플랫폼에 맞게)
- 해시태그는 관련성이 높고 검색 효과가 좋은 것으로 선별`;
}

/**
 * 변환된 내용 파싱
 */
function parseConvertedContent(rawContent, platform) {
  try {
    const contentMatch = rawContent.match(/---CONTENT---([\s\S]*?)---HASHTAGS---/);
    const hashtagMatch = rawContent.match(/---HASHTAGS---([\s\S]*?)$/);

    let content = contentMatch ? contentMatch[1].trim() : rawContent;
    let hashtags = [];

    if (hashtagMatch) {
      hashtags = hashtagMatch[1]
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
        .slice(0, SNS_LIMITS[platform].hashtagLimit);
    }

    // 길이 제한 확인
    const maxLength = SNS_LIMITS[platform].maxLength;
    if (content.length > maxLength) {
      content = content.substring(0, maxLength - 3) + '...';
    }

    return {
      content,
      hashtags
    };
  } catch (error) {
    console.error('콘텐츠 파싱 실패:', error);
    return {
      content: rawContent.substring(0, SNS_LIMITS[platform].recommendedLength),
      hashtags: []
    };
  }
}