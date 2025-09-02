// functions/handlers/sns-addon.js
const { HttpsError } = require('firebase-functions/v2/https');
const { wrap } = require('../common/wrap');
const { ok, error } = require('../common/response');
const { admin, db } = require('../utils/firebaseAdmin');
const { callGenerativeModel } = require('../services/gemini');

/**
 * 공백 제외 글자수 계산 (Java 코드와 동일한 로직)
 * @param {string} str - 계산할 문자열
 * @returns {number} 공백을 제외한 글자수
 */
function countWithoutSpace(str) {
  if (!str) return 0;
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (!/\s/.test(str.charAt(i))) { // 공백 문자가 아닌 경우
      count++;
    }
  }
  return count;
}

// SNS 플랫폼별 제한사항 (공백 제외 글자수 기준)
const SNS_LIMITS = {
  'facebook-instagram': {
    maxLength: 1800,       // Facebook/Instagram 연동 게시용 통합
    recommendedLength: 1800,
    hashtagLimit: 7        // Meta 플랫폼 통합용 (적당한 개수)
  },
  x: {
    maxLength: 230,        // 공백 제외 기준으로 조정 (여유분 고려)
    recommendedLength: 230,
    hashtagLimit: 2         // 1-2개 적절
  },
  threads: {
    maxLength: 400,        // 공백 제외 기준으로 조정
    recommendedLength: 400,
    hashtagLimit: 3         // Threads는 해시태그 좀 더 사용 가능
  }
};


/**
 * SNS 변환 테스트 함수
 */
exports.testSNS = wrap(async (req) => {
  console.log('🔥 testSNS 함수 호출됨');
  return { success: true, message: 'SNS 함수가 정상 작동합니다.' };
});

/**
 * 원고를 모든 SNS용으로 변환
 */
exports.convertToSNS = wrap(async (req) => {
  console.log('🔥 convertToSNS 함수 시작');
  console.log('🔍 전체 요청 구조:', JSON.stringify({
    auth: req.auth ? { uid: req.auth.uid } : null,
    data: req.data,
    rawRequest: req.rawRequest ? {
      method: req.rawRequest.method,
      headers: req.rawRequest.headers,
      body: req.rawRequest.body
    } : null
  }, null, 2));
  
  const { uid } = req.auth || {};
  const { postId, modelName } = req.data;

  console.log('📝 입력 데이터:', { uid, postId, modelName });

  if (!uid) {
    console.log('❌ 인증되지 않은 요청');
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }

  console.log('🔍 받은 데이터:', { uid, postId, modelName, typeof_postId: typeof postId });

  if (!postId) {
    throw new HttpsError('invalid-argument', '원고 ID가 필요합니다.');
  }

  // postId를 문자열로 변환 (숫자나 문자열 모두 허용)
  const postIdStr = String(postId).trim();
  
  if (!postIdStr || postIdStr === 'undefined' || postIdStr === 'null') {
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
    const postDoc = await db.collection('posts').doc(postIdStr).get();
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
    console.log('🔄 모든 SNS 플랫폼 변환 시작:', { postId: postIdStr, userRole, userInfo, selectedModel });

    // 각 플랫폼별로 병렬 처리로 변환 (재시도 로직 포함)
    console.log(`🚀 ${platforms.length}개 플랫폼 병렬 변환 시작`);
    
    const platformPromises = platforms.map(async (platform) => {
      const platformConfig = SNS_LIMITS[platform];
      const targetLength = Math.floor(platformConfig.maxLength * 0.8);
      
      console.log(`🔄 ${platform} 변환 시작 - 모델: ${selectedModel}`);
      
      // 최대 2번 시도 (병렬 처리에서는 속도 우선)
      let convertedResult = null;
      const maxAttempts = 2; // 병렬 처리에서는 2번으로 줄여서 전체 시간 단축
      
      for (let attempt = 1; attempt <= maxAttempts && !convertedResult; attempt++) {
        console.log(`🔄 ${platform} 시도 ${attempt}/${maxAttempts}...`);
        
        try {
          const snsPrompt = generateSNSPrompt(originalContent, platform, platformConfig, postKeywords, userInfo);
          
          // Gemini API로 변환 실행 (타임아웃 추가)
          const convertedText = await Promise.race([
            callGenerativeModel(snsPrompt, 1, selectedModel),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('AI 호출 타임아웃 (30초)')), 30000)
            )
          ]);
          
          console.log(`📝 ${platform} 원본 응답 (시도 ${attempt}):`, {
            length: convertedText?.length || 0,
            preview: convertedText?.substring(0, 100) + '...',
            hasJSON: /\{[\s\S]*\}/.test(convertedText || '')
          });

          if (!convertedText || convertedText.trim().length === 0) {
            console.warn(`⚠️ ${platform} 시도 ${attempt}: 빈 응답`);
            continue;
          }

          // 결과 파싱
          const parsedResult = parseConvertedContent(convertedText, platform);
          
          // 간소화된 검증 (속도 우선)
          const hasContent = parsedResult.content && parsedResult.content.trim().length > 20;
          const hasHashtags = Array.isArray(parsedResult.hashtags) && parsedResult.hashtags.length > 0;
          
          if (hasContent) {
            // 기본 검증만 통과하면 사용
            convertedResult = {
              content: parsedResult.content.trim(),
              hashtags: hasHashtags ? parsedResult.hashtags : generateDefaultHashtags(platform)
            };
            
            console.log(`✅ ${platform} 시도 ${attempt} 성공:`, {
              contentLength: countWithoutSpace(convertedResult.content),
              hashtagCount: convertedResult.hashtags.length
            });
          } else {
            console.warn(`⚠️ ${platform} 시도 ${attempt}: 콘텐츠가 너무 짧음`);
            if (attempt === maxAttempts) {
              // 최종 시도에서도 실패하면 기본 콘텐츠 생성
              convertedResult = {
                content: `${userInfo.name}입니다. ${originalContent.substring(0, Math.min(200, platformConfig.maxLength))}`,
                hashtags: generateDefaultHashtags(platform)
              };
            }
          }
          
        } catch (error) {
          console.error(`❌ ${platform} 시도 ${attempt} 오류:`, error.message);
          if (attempt === maxAttempts) {
            // 최종적으로 실패하면 기본 콘텐츠 반환
            convertedResult = {
              content: `${userInfo.name}입니다. 원고 내용을 공유드립니다.`,
              hashtags: generateDefaultHashtags(platform)
            };
          }
        }
      }

      console.log(`✅ ${platform} 변환 완료`);
      return { platform, result: convertedResult };
    });

    // 모든 플랫폼 병렬 처리 완료 대기 (최대 4분)
    try {
      const platformResults = await Promise.race([
        Promise.all(platformPromises),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('전체 변환 타임아웃 (4분)')), 240000)
        )
      ]);
      
      // 결과 정리
      platformResults.forEach(({ platform, result }) => {
        results[platform] = result;
      });
      
      console.log(`🎉 모든 플랫폼 변환 완료: ${Object.keys(results).length}개`);
      
    } catch (error) {
      console.error('❌ 병렬 변환 실패:', error.message);
      throw new HttpsError('internal', `SNS 변환 중 타임아웃 또는 오류가 발생했습니다: ${error.message}`);
    }

    // 4. 변환 기록 저장 (모든 플랫폼 결과를 하나로 저장)
    const conversionData = {
      userId: uid,
      originalPostId: postIdStr,
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

    console.log('✅ 모든 SNS 플랫폼 변환 완료:', { postId: postIdStr, platformCount: platforms.length, isAdmin });

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
 * 원본 콘텐츠의 주제 유형 분석
 */
function analyzeContentType(content) {
  // 자기어필 중심 콘텐츠 키워드들
  const personalAppealKeywords = [
    // 일상소통
    '안녕하세요', '인사드립니다', '근황', '일상', '소통', '대화', '이야기',
    
    // 지역활동/현안
    '지역', '현장', '방문', '만남', '간담회', '토론회', '설명회', '보고회',
    '주민', '시민', '구민', '동민', '마을', '우리동네', '지역구',
    
    // 의정활동 보고  
    '의정', '국감', '질의', '질문', '발언', '제안', '건의', '요청',
    '위원회', '본회의', '의정보고', '활동보고', '성과', '실적',
    '추진', '노력', '최선', '앞으로도', '계속', '지속',
    
    // 개인적 어필
    '저는', '제가', '개인적으로', '생각해보니', '느낀점', '다짐', '약속',
    '감사합니다', '부탁드립니다', '응원', '관심', '성원'
  ];
  
  // 정책/이슈 중심 콘텐츠 키워드들  
  const policyIssueKeywords = [
    '정책', '제도', '법안', '예산', '계획', '방안', '대책',
    '경제', '교육', '복지', '보건', '환경', '교통', '안전',
    '개발', '투자', '지원', '확대', '개선', '강화', '추진',
    '문제', '과제', '해결', '검토', '논의', '결정',
    '정부', '정당', '의원', '장관', '시장', '도지사'
  ];
  
  let personalScore = 0;
  let policyScore = 0;
  
  // 키워드 매칭으로 점수 계산
  personalAppealKeywords.forEach(keyword => {
    if (content.includes(keyword)) personalScore++;
  });
  
  policyIssueKeywords.forEach(keyword => {
    if (content.includes(keyword)) policyScore++;
  });
  
  // 자기어필 중심 콘텐츠 여부 판단
  return personalScore > policyScore || personalScore >= 3;
}

/**
 * 주제 유형과 플랫폼에 따른 콘텐츠 가공 가이드라인 생성
 */
function getContentFocusGuideline(isPersonalAppealContent, platform, userInfo) {
  if (isPersonalAppealContent) {
    // 일상소통, 지역활동, 의정보고 등 자기어필이 목적인 글
    if (platform === 'x') {
      return `- 자기어필이 글의 목적이므로 "${userInfo.name} ${userInfo.position}" 정체성 유지
- 하지만 230자 제약으로 핵심 활동/메시지만 압축하여 표현`;
    } else if (platform === 'threads') {
      return `- 자기어필 중심 글이므로 개인적 소통 톤 적절히 유지  
- 400자 제약으로 핵심 활동과 소통 의지를 간결하게 표현`;
    }
  } else {
    // 정책, 이슈, 사회문제 등 내용 중심 글
    if (platform === 'x') {
      return `- 정책/이슈 중심 글이므로 자기소개는 최소화하고 핵심 내용에 집중
- "${userInfo.name}"은 간단히 언급하되 대부분 분량을 주제 내용에 할당`;
    } else if (platform === 'threads') {
      return `- 정책/이슈 중심 글이므로 개인 어필보다 내용 전달에 집중
- 자기소개는 간략히, 대부분을 주제와 관련된 핵심 내용으로 구성`;
    }
  }
  return '';
}

/**
 * SNS 변환 프롬프트 생성
 */
function generateSNSPrompt(originalContent, platform, platformConfig, postKeywords = '', userInfo = {}) {
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

  // 플랫폼별 목표 글자수 설정 (공백 제외)
  const targetLength = Math.floor(platformConfig.maxLength * 0.85); // 85% 활용으로 여유분 확보
  
  // 원본 글의 주제 유형 분석
  const isPersonalAppealContent = analyzeContentType(cleanContent);
  
  // 플랫폼별 가공 방식 정의 (분량과 주제에 따른 자기어필 조절)
  const platformInstructions = {
    'facebook-instagram': `원본 원고를 Facebook/Instagram 연동 게시에 맞게 가공:
- 원본의 핵심 내용과 논리 구조를 적절히 보존
- ${userInfo.name} ${userInfo.position}의 격식 있는 어조와 문체 유지
- 중요한 정책, 수치, 사례는 반드시 포함
- 분량이 충분하므로 적절한 자기 소개와 마무리 포함 가능
- Facebook 게시 + Instagram 연동을 고려한 완성도 있는 구성
- ${platformConfig.maxLength}자 이내로 품격 있게 가공`,
    
    x: `원본 원고를 X(Twitter)에 맞게 핵심 압축:
${getContentFocusGuideline(isPersonalAppealContent, 'x', userInfo)}
- 230자 극한 제약으로 핵심 메시지만 선별
- 원본의 가장 중요한 한 가지 포인트에만 집중
- 완전한 문장으로 마무리하되 불필요한 수식어 제거
- 원본의 논조와 입장을 정확히 표현`,
    
    threads: `원본 원고를 Threads에 맞게 대화형 가공:
${getContentFocusGuideline(isPersonalAppealContent, 'threads', userInfo)}
- 400자 제약으로 핵심 내용 위주 구성
- 대화하듯 자연스러운 톤으로 가공
- 원본의 주요 메시지를 압축하여 전달
- 간결하면서도 완성도 있는 스토리로 구성`
  };

  return `아래는 ${userInfo.name} ${userInfo.position}이 작성한 원본 정치인 원고입니다. 이를 ${platformConfig.name} 플랫폼에 맞게 가공해주세요.

**원본 원고 (가공 대상):**
${cleanContent}

**가공 지침:**
${platformInstructions[platform]}

**원본 문체 분석 및 보존 요구사항:**
- 어조: ${cleanContent.substring(0, 200)}... 이 문체 그대로 유지
- 표현법: 원본에서 사용한 존댓말, 문장 구조, 어미 패턴 보존
- 어휘: 원본에서 사용한 정치적 표현, 전문 용어 그대로 사용
- 논조: 원본의 정치적 입장과 태도 완전 보존

**가공 결과물 요구사항:**
- 목표 길이: ${targetLength}자 (공백 제외, ±50자 허용)
- 최대 한도: ${platformConfig.maxLength}자 절대 초과 금지
- 해시태그: ${platformConfig.hashtagLimit}개
- 완결성: 모든 문장이 완전히 끝나야 함 ("다/니다/습니다" 등)

**가공 시 절대 준수사항:**
1. 원본을 "요약"하지 말고 "가공"하세요 - 새로 쓰는 것이 아닙니다
2. ${userInfo.name}의 실제 어조, 문체, 표현 방식을 정확히 모방하세요
3. 원본의 핵심 메시지와 정보는 빠뜨리지 말고 모두 포함하세요
4. 원본의 정치적 입장과 논조를 절대 바꾸지 마세요
5. 원본에 없는 내용이나 의견을 추가하지 마세요

**JSON 출력 형식:**
{
  "content": "원본 원고를 ${platformConfig.name}에 맞게 가공한 완전한 텍스트",
  "hashtags": ["#관련태그1", "#관련태그2", "#관련태그3"],
  "wordCount": 실제글자수
}

원본의 품격과 내용을 손상시키지 않으면서 ${platformConfig.name}에 최적화된 가공 결과물을 만들어주세요.`;
}

/**
 * SNS 변환 결과 품질 검증 (블로그 원고 방식 적용)
 */
function validateSNSResult(parsedResult, platform, platformConfig, userInfo, targetLength) {
  try {
    const { content = '', hashtags = [] } = parsedResult;
    
    // 1. 기본 구조 검증
    if (!content || content.trim().length === 0) {
      return { valid: false, reason: '콘텐츠가 비어있음' };
    }
    
    // 2. 글자수 검증 (공백 제외)
    const actualLength = countWithoutSpace(content);
    const maxLength = platformConfig.maxLength;
    const minLength = Math.max(50, Math.floor(targetLength * 0.5)); // 최소 50자 또는 목표의 50%
    
    if (actualLength > maxLength) {
      return { valid: false, reason: `글자수 초과: ${actualLength}자 > ${maxLength}자` };
    }
    
    if (actualLength < minLength) {
      return { valid: false, reason: `글자수 부족: ${actualLength}자 < ${minLength}자` };
    }
    
    // 3. 사용자 이름 포함 검증
    const hasUserName = content.includes(userInfo.name);
    if (!hasUserName && userInfo.name && userInfo.name !== '사용자') {
      return { valid: false, reason: `사용자 이름 누락: "${userInfo.name}" 미포함` };
    }
    
    // 4. 문장 완결성 검증
    const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 0);
    const lastSentence = content.trim();
    const isComplete = /[.!?]$/.test(lastSentence) || /[다니습]$/.test(lastSentence);
    
    if (!isComplete) {
      return { valid: false, reason: '문장이 완전히 끝나지 않음' };
    }
    
    // 5. 금지 표현 검증
    const forbiddenWords = ['요약', 'summary', '정리하면', '...', '[', ']', '(예시)', '(내용)'];
    const hasForbiddenWord = forbiddenWords.some(word => content.includes(word));
    
    if (hasForbiddenWord) {
      const foundWord = forbiddenWords.find(word => content.includes(word));
      return { valid: false, reason: `금지 표현 포함: "${foundWord}"` };
    }
    
    // 6. 해시태그 검증
    if (!Array.isArray(hashtags)) {
      return { valid: false, reason: '해시태그가 배열이 아님' };
    }
    
    const expectedHashtagCount = platformConfig.hashtagLimit;
    if (hashtags.length < 1 || hashtags.length > expectedHashtagCount) {
      return { valid: false, reason: `해시태그 개수 오류: ${hashtags.length}개 (예상: 1-${expectedHashtagCount}개)` };
    }
    
    // 7. 해시태그 형식 검증
    const invalidHashtags = hashtags.filter(tag => !tag.startsWith('#') || tag.trim().length < 2);
    if (invalidHashtags.length > 0) {
      return { valid: false, reason: `잘못된 해시태그 형식: ${invalidHashtags.join(', ')}` };
    }
    
    // 8. 플랫폼별 특별 검증
    if (platform === 'x' && actualLength > 280) {
      return { valid: false, reason: 'X 플랫폼 280자 초과' };
    }
    
    if (platform === 'threads' && actualLength > 500) {
      return { valid: false, reason: 'Threads 플랫폼 500자 초과' };
    }
    
    // 모든 검증 통과
    return { 
      valid: true, 
      score: calculateQualityScore(content, actualLength, targetLength, hashtags.length, expectedHashtagCount)
    };
    
  } catch (error) {
    console.error('품질 검증 오류:', error);
    return { valid: false, reason: `검증 오류: ${error.message}` };
  }
}

/**
 * 품질 점수 계산
 */
function calculateQualityScore(content, actualLength, targetLength, hashtagCount, expectedHashtagCount) {
  let score = 100;
  
  // 글자수 정확도 (±20% 이내면 만점)
  const lengthDiff = Math.abs(actualLength - targetLength) / targetLength;
  if (lengthDiff > 0.2) score -= (lengthDiff - 0.2) * 100;
  
  // 해시태그 정확도
  const hashtagDiff = Math.abs(hashtagCount - expectedHashtagCount);
  score -= hashtagDiff * 5;
  
  // 문장 구조 점수
  const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 0);
  if (sentences.length < 1) score -= 20;
  if (sentences.length > 10) score -= 10;
  
  return Math.max(0, Math.round(score));
}

/**
 * 변환된 내용 파싱 (완전히 새로 작성)
 */
function parseConvertedContent(rawContent, platform) {
  try {
    console.log(`🔍 ${platform} 파싱 시작:`, {
      rawContentLength: rawContent?.length || 0,
      rawContentPreview: rawContent?.substring(0, 200) + '...'
    });

    let content = '';
    let hashtags = [];

    // 1차 시도: JSON 형식 파싱
    const jsonResult = tryParseJSON(rawContent, platform);
    if (jsonResult.success) {
      content = jsonResult.content;
      hashtags = jsonResult.hashtags;
    } else {
      // 2차 시도: 구분자 형식 파싱
      const delimiterResult = tryParseDelimiter(rawContent, platform);
      if (delimiterResult.success) {
        content = delimiterResult.content;
        hashtags = delimiterResult.hashtags;
      } else {
        // 3차 시도: 원본 텍스트 사용
        content = cleanRawContent(rawContent);
        hashtags = generateDefaultHashtags(platform);
      }
    }

    // 콘텐츠 후처리
    content = cleanContent(content);
    hashtags = validateHashtags(hashtags, platform);

    // 길이 제한 적용
    content = enforceLength(content, platform);

    console.log(`✅ ${platform} 파싱 완료:`, {
      contentLength: countWithoutSpace(content),
      hashtagCount: hashtags.length,
      contentPreview: content.substring(0, 100) + '...'
    });

    return { content, hashtags };

  } catch (error) {
    console.error(`❌ ${platform} 파싱 실패:`, error);
    return {
      content: rawContent.substring(0, 200) || '',
      hashtags: generateDefaultHashtags(platform)
    };
  }
}

/**
 * JSON 파싱 시도
 */
function tryParseJSON(rawContent, platform) {
  try {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { success: false };

    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`🔍 ${platform} JSON 구조:`, Object.keys(parsed));

    let content = '';
    let hashtags = [];

    // 표준 형식: {"content": "...", "hashtags": [...]}
    if (parsed.content) {
      content = parsed.content.trim();
      hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : [];
    }
    // 중첩 형식: {"summary": {"content": "...", "hashtags": [...]}}
    else if (parsed.summary && typeof parsed.summary === 'object') {
      content = (parsed.summary.content || '').trim();
      hashtags = Array.isArray(parsed.summary.hashtags) ? parsed.summary.hashtags : [];
    }
    // 단순 형식: {"summary": "..."}
    else if (parsed.summary && typeof parsed.summary === 'string') {
      content = parsed.summary.trim();
    }
    // 대안 형식: {"text": "..."}
    else if (parsed.text) {
      content = parsed.text.trim();
      hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : [];
    }

    if (content && content.length > 10) {
      console.log(`✅ ${platform} JSON 파싱 성공: ${content.length}자`);
      return { success: true, content, hashtags };
    }

    return { success: false };
  } catch (error) {
    console.log(`📝 ${platform} JSON 파싱 실패: ${error.message}`);
    return { success: false };
  }
}

/**
 * 구분자 파싱 시도
 */
function tryParseDelimiter(rawContent, platform) {
  try {
    const contentMatch = rawContent.match(/---CONTENT---([\s\S]*?)---HASHTAGS---/);
    const hashtagMatch = rawContent.match(/---HASHTAGS---([\s\S]*?)$/);

    if (contentMatch) {
      const content = contentMatch[1].trim();
      let hashtags = [];

      if (hashtagMatch) {
        hashtags = hashtagMatch[1]
          .split(/[,\s]+/)
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0)
          .map(tag => tag.startsWith('#') ? tag : `#${tag}`);
      }

      if (content && content.length > 10) {
        console.log(`✅ ${platform} 구분자 파싱 성공: ${content.length}자`);
        return { success: true, content, hashtags };
      }
    }

    return { success: false };
  } catch (error) {
    console.log(`📝 ${platform} 구분자 파싱 실패: ${error.message}`);
    return { success: false };
  }
}

/**
 * 원본 텍스트 정리
 */
function cleanRawContent(rawContent) {
  return rawContent
    .replace(/---\w+---/g, '') // 구분자 제거
    .replace(/\{[\s\S]*?\}/g, '') // JSON 블록 제거
    .replace(/\n{2,}/g, '\n') // 연속된 줄바꿈 정리
    .trim();
}

/**
 * 콘텐츠 후처리
 */
function cleanContent(content) {
  return content
    // 마크다운 제거
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    // HTML 태그 제거
    .replace(/<\/?(h[1-6]|p|div|br|li)[^>]*>/gi, '\n')
    .replace(/<\/?(ul|ol)[^>]*>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    // HTML 엔티티 변환
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // 공백 정리
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * 해시태그 검증 및 정리
 */
function validateHashtags(hashtags, platform) {
  if (!Array.isArray(hashtags)) hashtags = [];
  
  const cleaned = hashtags
    .map(tag => tag.trim())
    .filter(tag => tag.length > 1)
    .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
    .slice(0, SNS_LIMITS[platform].hashtagLimit);

  return cleaned.length > 0 ? cleaned : generateDefaultHashtags(platform);
}

/**
 * 기본 해시태그 생성
 */
function generateDefaultHashtags(platform) {
  const defaults = ['#정치', '#민생', '#소통'];
  return defaults.slice(0, SNS_LIMITS[platform].hashtagLimit);
}

/**
 * 길이 제한 적용
 */
function enforceLength(content, platform) {
  const maxLength = SNS_LIMITS[platform].maxLength;
  const actualLength = countWithoutSpace(content);
  
  if (actualLength <= maxLength) return content;

  // 공백 제외 기준으로 자르기
  let trimmed = '';
  let charCount = 0;
  
  for (let i = 0; i < content.length && charCount < maxLength - 3; i++) {
    trimmed += content.charAt(i);
    if (!/\s/.test(content.charAt(i))) {
      charCount++;
    }
  }
  
  return trimmed + '...';
}