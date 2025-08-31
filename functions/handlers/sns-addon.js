// functions/handlers/sns-addon.js
const { HttpsError } = require('firebase-functions/v2/https');
const { wrap } = require('../common/wrap');
const { ok, error } = require('../common/response');
const { admin, db } = require('../utils/firebaseAdmin');
const { callGenerativeModel } = require('../services/gemini');

// SNS 플랫폼별 제한사항 (최대 한도 활용)
const SNS_LIMITS = {
  facebook: {
    maxLength: 63206,
    recommendedLength: 63206,  // 최대 한도 활용
    hashtagLimit: 2        // 1-2개 권장
  },
  instagram: {
    maxLength: 2200,
    recommendedLength: 2200,  // 최대 한도 활용
    hashtagLimit: 9         // 4-9개 권장 (최대 30개 가능)
  },
  x: {
    maxLength: 280,
    recommendedLength: 280,  // 최대 한도 활용
    hashtagLimit: 2         // 1-2개 적절
  },
  threads: {
    maxLength: 500,
    recommendedLength: 500,  // 최대 한도 활용
    hashtagLimit: 1         // 토픽태그 1개만 가능
  }
};


/**
 * 원고를 모든 SNS용으로 변환
 */
exports.convertToSNS = wrap(async (req) => {
  const { uid } = req.auth || {};
  const { postId, modelName } = req.data;

  if (!uid) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }

  console.log('🔍 받은 데이터:', { uid, postId, modelName, typeof_postId: typeof postId });

  if (!postId) {
    throw new HttpsError('invalid-argument', '원고 ID가 필요합니다.');
  }

  if (typeof postId !== 'string' || postId.trim() === '') {
    throw new HttpsError('invalid-argument', `유효하지 않은 원고 ID: "${postId}"`);
  }

  try {
    // 1. 사용자 정보 및 SNS 애드온 상태 확인
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', '사용자를 찾을 수 없습니다.');
    }

    const userData = userDoc.data();
    const userRole = userData.role || 'local_blogger';
    
    // 관리자는 모든 제한 무시
    const isAdmin = userData.role === 'admin' || userData.isAdmin === true;
    
    if (!isAdmin) {
      // SNS 애드온 활성화 확인 (결제 또는 게이미피케이션 조건)
      const hasAddonAccess = userData.snsAddon?.isActive || userData.gamification?.snsUnlocked;
      
      // 임시: 모든 사용자에게 접근 허용 (테스트용)
      if (!hasAddonAccess && false) { // false로 설정하여 항상 통과
        throw new HttpsError('permission-denied', 'SNS 변환 기능을 사용하려면 애드온을 구매하거나 조건을 달성해주세요.');
      }
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

    // 3. 사용자 메타데이터 가져오기
    const userProfile = userData.profile || {};
    const userInfo = {
      name: userProfile.name || '정치인',
      position: userProfile.position || '의원',
      region: userProfile.region || '지역',
      experience: userProfile.experience || '',
      values: userProfile.values || '',
      tone: userProfile.tone || 'formal' // formal, friendly, professional
    };

    // 4. 모든 플랫폼에 대해 SNS 변환 실행
    const originalContent = postData.content;
    const postKeywords = postData.keywords || '';
    const platforms = Object.keys(SNS_LIMITS);
    const results = {};
    
    // 사용할 모델 결정 (기본값: gemini-1.5-flash)
    const selectedModel = modelName || 'gemini-1.5-flash';
    console.log('🔄 모든 SNS 플랫폼 변환 시작:', { postId, userRole, userInfo, selectedModel });

    // 각 플랫폼별로 순차적으로 변환
    for (const platform of platforms) {
      const platformConfig = SNS_LIMITS[platform];
      const snsPrompt = generateSNSPrompt(originalContent, platform, platformConfig, postKeywords, userInfo);
      
      console.log(`🔄 ${platform} 변환 시작 - 모델: ${selectedModel}`);
      
      // Gemini API로 변환 실행 (선택된 모델 사용)
      const convertedText = await callGenerativeModel(snsPrompt, 3, selectedModel);
      console.log(`📝 ${platform} 원본 응답 (전체):`, convertedText);

      if (!convertedText || convertedText.trim().length === 0) {
        throw new HttpsError('internal', `${platform} SNS 변환에 실패했습니다.`);
      }

      // 결과 파싱
      const parsedResult = parseConvertedContent(convertedText, platform);
      console.log(`🔍 ${platform} 파싱 결과:`, {
        contentLength: parsedResult.content?.length || 0,
        hashtagCount: parsedResult.hashtags?.length || 0,
        contentPreview: parsedResult.content?.substring(0, 100) + '...'
      });
      results[platform] = parsedResult;
      
      console.log(`✅ ${platform} 변환 완료`);
    }

    // 4. 변환 기록 저장 (모든 플랫폼 결과를 하나로 저장)
    const conversionData = {
      userId: uid,
      originalPostId: postId,
      platforms: platforms,
      originalContent: originalContent,
      results: results,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        originalWordCount: originalContent.length,
        platformCount: platforms.length
      }
    };

    await db.collection('sns_conversions').add(conversionData);

    console.log('✅ 모든 SNS 플랫폼 변환 완료:', { postId, platformCount: platforms.length, isAdmin });

    return ok({
      results: results,
      platforms: platforms,
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
    const isAdmin = userData.role === 'admin' || userData.isAdmin === true;
    
    // SNS 접근 권한 확인 (결제 또는 게이미피케이션)
    const hasAddonAccess = isAdmin || userData.snsAddon?.isActive || userData.gamification?.snsUnlocked;
    
    return ok({
      isActive: true, // 임시: 모든 사용자 허용
      accessMethod: isAdmin ? 'admin' : 
                   userData.snsAddon?.isActive ? 'paid' : 
                   userData.gamification?.snsUnlocked ? 'gamification' : 'test'
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
function generateSNSPrompt(originalContent, platform, platformConfig, postKeywords = '', userInfo = {}) {
  const keywordHint = postKeywords ? `\n- 기존 키워드 참고: ${postKeywords}` : '';
  
  // HTML 태그를 제거하고 평문으로 변환
  const cleanContent = originalContent
    .replace(/<\/?(h[1-6]|p|div|br|li)[^>]*>/gi, '\n')
    .replace(/<\/?(ul|ol)[^>]*>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // 사용자 정보 기반 톤앤매너 설정
  const getToneGuidelines = (tone) => {
    switch(tone) {
      case 'friendly':
        return '친근하고 따뜻한 어조로 작성하되 정치인다운 품격은 유지';
      case 'professional':
        return '전문적이고 신중한 어조로 작성';
      default: // formal
        return '정중하고 격식 있는 어조로 작성';
    }
  };
  
  const toneGuideline = getToneGuidelines(userInfo.tone);
  const positionInfo = userInfo.position === '의원' ? '의원으로서' : `${userInfo.position}으로서`;
  const regionInfo = userInfo.region !== '지역' ? `${userInfo.region} ` : '';
  
  const isLongForm = platformConfig.maxLength > 3000; // Facebook, Instagram
  
  // 원본 원고의 문체 분석을 위한 샘플 추출
  const originalSample = cleanContent.substring(0, 200);
  
  return `${userInfo.name} ${userInfo.position}이 작성한 다음 원고를 참고하여, 동일한 문체와 어조로 ${platformConfig.maxLength}자 이내의 글을 작성해주세요.

**원본 원고 (문체 참고용):**
${cleanContent}

**작성 가이드:**
${isLongForm ? 
  `이 정치인의 기존 문체를 그대로 유지하면서 원본 내용을 완전히 보존해 주세요.` :
  `이 정치인의 기존 문체를 정확히 따라하면서 ${platformConfig.maxLength}자 이내로 요약해 주세요.`}

**문체 특징 분석:**
"${originalSample}..." 
→ 이 샘플에서 보이는 어조, 문장 구조, 표현 방식을 그대로 따라해 주세요.

**포함할 해시태그:** 최대 ${platformConfig.hashtagLimit}개${keywordHint}

**참고할 모범 사례:**
다음과 같은 정치인 원고 스타일을 목표로 하세요:

"안녕하세요, 여러분. 오늘 발표된 정부 예산안에 대해 말씀드리겠습니다. AI 분야 투자가 대폭 확대되어 우리 지역 발전에 큰 기회가 될 것입니다. 구체적으로 GPU 확충에 2조 1천억원, 전산업 AI 전환에 2조 6천억원이 투입됩니다. 저는 이러한 정책이 우리 지역에도 확산될 수 있도록 최선을 다하겠습니다."

**출력 형식:**
---CONTENT---
[위의 모범 사례와 같은 품격 있는 정치 원고 형태로 작성]
---HASHTAGS---
[관련 해시태그들을 쉼표로 구분]

**주의사항:**
- 이모지나 특수문자 사용하지 않기
- 원본 원고의 핵심 내용과 수치 정보 보존하기  
- ${userInfo.name} ${userInfo.position}의 기존 문체 그대로 유지하기
- 정중하고 격식 있는 표현 사용하기`;
}

/**
 * 변환된 내용 파싱
 */
function parseConvertedContent(rawContent, platform) {
  try {
    console.log(`🔍 ${platform} 파싱 시작:`, {
      rawContentLength: rawContent?.length || 0,
      rawContentPreview: rawContent?.substring(0, 200) + '...'
    });
    
    const contentMatch = rawContent.match(/---CONTENT---([\s\S]*?)---HASHTAGS---/);
    const hashtagMatch = rawContent.match(/---HASHTAGS---([\s\S]*?)$/);

    console.log(`🔍 ${platform} 매칭 결과:`, {
      hasContentMatch: !!contentMatch,
      hasHashtagMatch: !!hashtagMatch,
      contentMatchLength: contentMatch?.[1]?.length || 0
    });

    let content = '';
    let hashtags = [];

    // 1차 시도: 구분자 기반 파싱
    if (contentMatch) {
      content = contentMatch[1].trim();
    } else {
      // 2차 시도: JSON 형식 파싱
      try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          content = parsed.content || parsed.text || '';
          hashtags = parsed.hashtags || [];
        }
      } catch (e) {
        console.log(`📝 ${platform} JSON 파싱 실패, 원본 텍스트 사용`);
      }
      
      // 3차 시도: 원본 텍스트 전체 사용
      if (!content) {
        content = rawContent;
      }
    }

    // 콘텐츠 정리: 모든 특수 문자와 이모지 완전 제거
    content = content
      // 모든 이모지 완전 제거
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '')  // 얼굴 이모지
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')  // 기타 기호 및 그림문자
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')  // 교통 및 지도 기호
      .replace(/[\u{1F700}-\u{1F77F}]/gu, '')  // 연금술 기호
      .replace(/[\u{1F780}-\u{1F7FF}]/gu, '')  // 기하학적 모양 확장
      .replace(/[\u{1F800}-\u{1F8FF}]/gu, '')  // 보조 그림 및 기호
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')  // 보조 기호 및 그림문자
      .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')  // 체스 기호
      .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')  // 기호 및 그림문자 확장-A
      .replace(/[\u{2600}-\u{26FF}]/gu, '')    // 기타 기호
      .replace(/[\u{2700}-\u{27BF}]/gu, '')    // Dingbats
      .replace(/[\uFE0F]/gu, '')               // 변형 선택자
      .replace(/[\u20E3]/gu, '')               // 키캡 결합 문자
      
      // 특수 번호 기호 제거
      .replace(/[1-9]️⃣/g, '')
      
      // JSON 형식 제거
      .replace(/^\s*[\{\[][\s\S]*?[\}\]]\s*$/gm, '')
      .replace(/^[^:]*:\s*["']([^"']*)["']\s*,?\s*$/gm, '$1')
      .replace(/["']\s*:\s*["']/g, ': ')
      .replace(/["\{\}\[\],]/g, '')
      
      // HTML 태그 제거
      .replace(/<\/?(h[1-6]|p|div|br|li)[^>]*>/gi, '\n')
      .replace(/<\/?(ul|ol)[^>]*>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      
      // 이스케이프 문자 완전 제거
      .replace(/\\n/g, ' ')
      .replace(/\\t/g, ' ')
      .replace(/\\r/g, ' ')
      .replace(/\\\\/g, '')
      .replace(/\\/g, '')
      
      // 따옴표와 JSON 관련 문자 제거
      .replace(/["""''`]/g, '')
      .replace(/:/g, ' ')
      .replace(/,\s*$/gm, '')
      
      // 특수 유니코드 문자 제거 (보조 이모지 포함)
      .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '')  // 국기 이모지
      .replace(/[\u{1F004}]/gu, '')             // 마작패
      .replace(/[\u{1F0CF}]/gu, '')             // 조커
      .replace(/[\u{1F18E}]/gu, '')             // AB형
      .replace(/[\u{3030}]/gu, '')              // 물결표
      .replace(/[\u{303D}]/gu, '')              // 파트 오브 얼터네이션 마크
      
      // 연속된 특수문자 정리
      .replace(/[!]{2,}/g, '!')
      .replace(/[?]{2,}/g, '?')
      .replace(/[.]{4,}/g, '...')
      
      // 공백 정리
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .trim();
      
    // 마지막 단계: 허용된 문자만 남기기 (화이트리스트 방식)
    // 임시 비활성화: content = content.replace(/[^\u3131-\u3163\uAC00-\uD7A3a-zA-Z0-9\s.,!?()%-]/g, '').trim();
    content = content.trim(); // 임시로 공백만 제거

    // 해시태그 파싱 (구분자가 없는 경우 자동 생성)
    if (hashtagMatch) {
      hashtags = hashtagMatch[1]
        .split(/[,\s]+/)
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
        .slice(0, SNS_LIMITS[platform].hashtagLimit);
    } else if (hashtags.length === 0) {
      // 해시태그가 없으면 기본 해시태그 생성
      hashtags = ['#정치', '#민생', '#소통']
        .slice(0, SNS_LIMITS[platform].hashtagLimit);
    }
    
    console.log(`✅ ${platform} 파싱 완료:`, {
      contentLength: content.length,
      hashtagCount: hashtags.length,
      contentPreview: content.substring(0, 100) + '...',
      hashtags: hashtags
    });

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