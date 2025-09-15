'use strict';

const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { wrap } = require('../common/wrap');
const { httpWrap } = require('../common/http-wrap');
const { auth } = require('../common/auth');
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

/**
 * Bio 메타데이터를 기반으로 개인화된 원고 작성 힌트를 생성합니다
 * @param {Object} bioMetadata - 추출된 자기소개 메타데이터
 * @returns {string} 개인화 힌트 문자열
 */
function generatePersonalizedHints(bioMetadata) {
  if (!bioMetadata) return '';

  const hints = [];
  
  // 정치적 성향 기반 힌트
  if (bioMetadata.politicalStance?.progressive > 0.7) {
    hints.push('변화와 혁신을 강조하는 진보적 관점으로 작성');
  } else if (bioMetadata.politicalStance?.conservative > 0.7) {
    hints.push('안정성과 전통 가치를 중시하는 보수적 관점으로 작성');
  } else if (bioMetadata.politicalStance?.moderate > 0.8) {
    hints.push('균형잡힌 중도적 관점에서 다양한 의견을 포용하여 작성');
  }

  // 소통 스타일 기반 힌트
  const commStyle = bioMetadata.communicationStyle;
  if (commStyle?.tone === 'warm') {
    hints.push('따뜻하고 친근한 어조 사용');
  } else if (commStyle?.tone === 'formal') {
    hints.push('격식있고 전문적인 어조 사용');
  }
  
  if (commStyle?.approach === 'inclusive') {
    hints.push('모든 계층을 아우르는 포용적 접근');
  } else if (commStyle?.approach === 'collaborative') {
    hints.push('협력과 소통을 강조하는 협업적 접근');
  }

  // 정책 관심분야 기반 힌트
  const topPolicy = Object.entries(bioMetadata.policyFocus || {})
    .sort(([,a], [,b]) => b.weight - a.weight)[0];
    
  if (topPolicy && topPolicy[1].weight > 0.6) {
    const policyNames = {
      economy: '경제정책',
      education: '교육정책', 
      welfare: '복지정책',
      environment: '환경정책',
      security: '안보정책',
      culture: '문화정책'
    };
    hints.push(`${policyNames[topPolicy[0]] || topPolicy[0]} 관점에서 접근`);
  }

  // 지역 연관성 기반 힌트
  if (bioMetadata.localConnection?.strength > 0.8) {
    hints.push('지역 현안과 주민들의 실제 경험을 적극 반영');
    if (bioMetadata.localConnection.keywords?.length > 0) {
      hints.push(`지역 키워드 활용: ${bioMetadata.localConnection.keywords.slice(0, 3).join(', ')}`);
    }
  }

  // 생성 선호도 기반 힌트
  const prefs = bioMetadata.generationProfile?.likelyPreferences;
  if (prefs?.includePersonalExperience > 0.8) {
    hints.push('개인적 경험과 사례를 풍부하게 포함');
  }
  if (prefs?.useStatistics > 0.7) {
    hints.push('구체적 수치와 통계 데이터를 적절히 활용');
  }
  if (prefs?.focusOnFuture > 0.7) {
    hints.push('미래 비전과 발전 방향을 제시');
  }

  return hints.join(' | ');
}

/**
 * 사용자 개인화 정보를 기반으로 페르소나 힌트를 생성합니다
 * @param {Object} userProfile - 사용자 프로필 정보
 * @param {string} category - 글 카테고리
 * @param {string} topic - 글 주제
 * @returns {string} 페르소나 힌트 문자열
 */
function generatePersonaHints(userProfile, category, topic) {
  if (!userProfile) return '';
  
  const hints = [];
  const topicLower = topic ? topic.toLowerCase() : '';
  
  // 카테고리별 관련도 높은 정보 우선 선택
  const relevantInfo = getRelevantPersonalInfo(userProfile, category, topicLower);
  
  // 선택된 정보만 자연스럽게 구성
  if (relevantInfo.age) {
    hints.push(relevantInfo.age);
  }
  
  if (relevantInfo.family) {
    hints.push(relevantInfo.family);
  }
  
  if (relevantInfo.background) {
    hints.push(relevantInfo.background);
  }
  
  if (relevantInfo.experience) {
    hints.push(relevantInfo.experience);
  }
  
  if (relevantInfo.committees && relevantInfo.committees.length > 0) {
    hints.push(`${relevantInfo.committees.join(', ')} 활동 경험을 바탕으로`);
  }
  
  if (relevantInfo.connection) {
    hints.push(relevantInfo.connection);
  }
  
  // X(트위터) 프리미엄 구독 여부는 SNS 변환 시 글자수 제한 체크용이므로 페르소나에 반영하지 않음
  
  const persona = hints.filter(h => h).join(' ');
  return persona ? `[작성 관점: ${persona}]` : '';
}

/**
 * 글 카테고리와 주제에 따라 관련성 높은 개인화 정보만 선별합니다
 */
function getRelevantPersonalInfo(userProfile, category, topicLower) {
  const result = {};
  
  // 연령대 (일상 소통, 가족/육아 관련 주제에서 관련성 높음)
  if (category === 'daily-communication' || 
      topicLower.includes('육아') || topicLower.includes('가족') || topicLower.includes('청년')) {
    if (userProfile.ageDecade) {
      result.age = userProfile.ageDetail ? 
        `${userProfile.ageDecade} ${userProfile.ageDetail}` : userProfile.ageDecade;
    }
  }
  
  // 가족 상황 (교육, 복지, 일상 소통에서 관련성 높음)
  if (category === 'daily-communication' || 
      topicLower.includes('교육') || topicLower.includes('육아') || topicLower.includes('복지')) {
    if (userProfile.familyStatus) {
      const familyMap = {
        '자녀있음': '두 아이의 부모로서',
        '한부모': '한부모 가정의 경험을 가진',
        '기혼': '가정을 꾸리며',
        '미혼': '젊은 세대로서'
      };
      result.family = familyMap[userProfile.familyStatus];
    }
  }
  
  // 배경 경력 (관련 정책 분야에서 관련성 높음)
  if (userProfile.backgroundCareer) {
    const careerRelevance = {
      '교육자': ['교육', '학교', '학생', '교사'],
      '사업가': ['경제', '소상공인', '자영업', '창업'],
      '공무원': ['행정', '정책', '공공서비스'],
      '의료인': ['의료', '건강', '코로나', '보건'],
      '법조인': ['법', '제도', '정의', '권리']
    };
    
    const relevantKeywords = careerRelevance[userProfile.backgroundCareer] || [];
    const isRelevant = relevantKeywords.some(keyword => topicLower.includes(keyword));
    
    if (isRelevant) {
      result.background = `${userProfile.backgroundCareer} 출신으로서`;
    }
  }
  
  // 정치 경험 (의정활동 보고, 정책 제안에서 관련성 높음)
  if (category === 'activity-report' || category === 'policy-proposal') {
    if (userProfile.politicalExperience) {
      const expMap = {
        '초선': '초선 의원으로서 신선한 관점에서',
        '재선': '의정 경험을 바탕으로',
        '3선 이상': '풍부한 의정 경험으로',
        '정치 신인': '새로운 시각에서'
      };
      result.experience = expMap[userProfile.politicalExperience];
    }
  }
  
  // 소속 위원회 (관련 분야에서만 언급)
  if (userProfile.committees && userProfile.committees.length > 0) {
    const validCommittees = userProfile.committees.filter(c => c && c !== '');
    const relevantCommittees = validCommittees.filter(committee => {
      const committeeKeywords = {
        '교육위원회': ['교육', '학교', '학생', '대학'],
        '보건복지위원회': ['복지', '의료', '건강', '돌봄'],
        '국토교통위원회': ['교통', '주택', '도로', '건설'],
        '환경노동위원회': ['환경', '노동', '일자리'],
        '여성가족위원회': ['여성', '가족', '육아', '출산']
      };
      
      const keywords = committeeKeywords[committee] || [];
      return keywords.some(keyword => topicLower.includes(keyword));
    });
    
    if (relevantCommittees.length > 0) {
      result.committees = relevantCommittees;
    }
  }
  
  // 지역 연고 (지역 현안에서 관련성 높음)
  if (category === 'local-issues' || topicLower.includes('지역') || topicLower.includes('우리 동네')) {
    if (userProfile.localConnection) {
      const connectionMap = {
        '토박이': '지역 토박이로서',
        '오래 거주': '오랫동안 이 지역에 살면서',
        '이주민': '타지에서 와서 이 지역을 제2의 고향으로 삼은',
        '귀향': '고향으로 돌아와서'
      };
      result.connection = connectionMap[userProfile.localConnection];
    }
  }
  
  return result;
}
const { buildDailyCommunicationPrompt } = require('../templates/prompts/daily-communication');

// 간단한 응답 헬퍼
const ok = (data) => ({ success: true, ...data });
const okMessage = (message) => ({ success: true, message });

// 사용자 포스트 목록 조회
exports.getUserPosts = wrap(async (req) => {
  const { uid } = await auth(req);
  console.log('POST getUserPosts 호출:', { userId: uid });

  try {
    const postsSnapshot = await db.collection('posts')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const posts = [];
    postsSnapshot.forEach(doc => {
      const data = doc.data();
      // draft 상태가 아닌 포스트만 포함 (클라이언트 필터링)
      if (data.status !== 'draft') {
        posts.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null
        });
      }
    });

    console.log('POST getUserPosts 성공:', { count: posts.length });
    return ok({ posts });
  } catch (error) {
    console.error('POST getUserPosts 오류:', error.message);
    throw new HttpsError('internal', '포스트 목록을 불러오는데 실패했습니다.');
  }
});

// 특정 포스트 조회
exports.getPost = wrap(async (req) => {
  const { uid } = await auth(req);
  const { postId } = req.data || {};
  console.log('POST getPost 호출:', { userId: uid, postId });

  if (!postId) {
    throw new HttpsError('invalid-argument', '포스트 ID를 입력해주세요.');
  }

  try {
    const postDoc = await db.collection('posts').doc(postId).get();
    if (!postDoc.exists) {
      throw new HttpsError('not-found', '포스트를 찾을 수 없습니다.');
    }

    const data = postDoc.data();
    if (data.userId !== uid) {
      throw new HttpsError('permission-denied', '포스트를 조회할 권한이 없습니다.');
    }

    const post = {
      id: postDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null
    };

    console.log('POST getPost 성공:', postId);
    return ok({ post });
  } catch (error) {
    if (error.code) throw error;
    console.error('POST getPost 오류:', error.message);
    throw new HttpsError('internal', '포스트를 불러오는데 실패했습니다.');
  }
});

// 포스트 업데이트
exports.updatePost = wrap(async (req) => {
  const { uid } = await auth(req);
  const { postId, updates } = req.data || {};
  console.log('POST updatePost 호출:', { userId: uid, postId });

  if (!postId || !updates) {
    throw new HttpsError('invalid-argument', '포스트 ID와 수정 데이터를 입력해주세요.');
  }

  try {
    const postDoc = await db.collection('posts').doc(postId).get();
    if (!postDoc.exists) {
      throw new HttpsError('not-found', '포스트를 찾을 수 없습니다.');
    }

    const current = postDoc.data() || {};
    if (current.userId !== uid) {
      throw new HttpsError('permission-denied', '포스트를 수정할 권한이 없습니다.');
    }

    const allowed = ['title', 'content', 'category', 'subCategory', 'keywords', 'status'];
    const sanitized = {};
    for (const k of allowed) {
      if (updates[k] !== undefined) sanitized[k] = updates[k];
    }
    
    if (sanitized.content) {
      sanitized.wordCount = String(sanitized.content).replace(/<[^>]*>/g, '').replace(/\s/g, '').length;
    }
    sanitized.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await db.collection('posts').doc(postId).update(sanitized);
    console.log('POST updatePost 성공:', postId);
    return okMessage('포스트가 성공적으로 수정되었습니다.');
  } catch (error) {
    if (error.code) throw error;
    console.error('POST updatePost 오류:', error.message);
    throw new HttpsError('internal', '포스트 수정에 실패했습니다.');
  }
});

// 포스트 삭제
exports.deletePost = wrap(async (req) => {
  const { uid } = await auth(req);
  const { postId } = req.data || {};
  console.log('POST deletePost 호출:', { userId: uid, postId });

  if (!postId) {
    throw new HttpsError('invalid-argument', '포스트 ID를 입력해주세요.');
  }

  try {
    const postDoc = await db.collection('posts').doc(postId).get();
    if (!postDoc.exists) {
      throw new HttpsError('not-found', '포스트를 찾을 수 없습니다.');
    }
    
    const data = postDoc.data() || {};
    if (data.userId !== uid) {
      throw new HttpsError('permission-denied', '포스트를 삭제할 권한이 없습니다.');
    }

    await db.collection('posts').doc(postId).delete();
    console.log('POST deletePost 성공:', postId);
    return okMessage('포스트가 성공적으로 삭제되었습니다.');
  } catch (error) {
    if (error.code) throw error;
    console.error('POST deletePost 오류:', error.message);
    throw new HttpsError('internal', '포스트 삭제에 실패했습니다.');
  }
});

// 사용량 제한 체크
exports.checkUsageLimit = wrap(async (req) => {
  const { uid } = await auth(req);
  console.log('USAGE checkUsageLimit 호출:', { userId: uid });

  try {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const snap = await db.collection('posts')
      .where('userId', '==', uid)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thisMonth))
      .get();

    const used = snap.size;
    const limit = 50;
    
    console.log('USAGE checkUsageLimit 성공:', { used, limit });
    return ok({
      postsGenerated: used,
      monthlyLimit: limit,
      canGenerate: used < limit,
      remainingPosts: Math.max(0, limit - used),
    });
  } catch (error) {
    console.error('USAGE 오류:', error.message);
    if (error.code === 'failed-precondition') {
      return ok({ 
        postsGenerated: 0, 
        monthlyLimit: 50, 
        canGenerate: true, 
        remainingPosts: 50 
      });
    }
    throw new HttpsError('internal', '사용량을 확인하는데 실패했습니다.');
  }
});

// 진짜 AI 원고 생성 함수 (백업에서 복구) - HTTP 버전
exports.generatePosts = httpWrap(async (req) => {
  console.log('🔥 generatePosts HTTP 시작');

  let uid;
  let decodedToken = null;

  // 데이터 추출 - Firebase SDK와 HTTP 요청 모두 처리
  let requestData = req.data || req.rawRequest?.body || {};

  // 중첩된 data 구조 처리 (Firebase SDK에서 {data: {실제데이터}} 형태로 올 수 있음)
  if (requestData.data && typeof requestData.data === 'object') {
    requestData = requestData.data;
  }

  // 사용자 인증 데이터 확인 (모든 사용자는 네이버 로그인)
  if (requestData.__naverAuth && requestData.__naverAuth.uid && requestData.__naverAuth.provider === 'naver') {
    console.log('📱 사용자 인증 처리:', requestData.__naverAuth.uid);
    uid = requestData.__naverAuth.uid;
    // 인증 정보 제거 (처리 완료)
    delete requestData.__naverAuth;
  } else {
    console.error('❌ 유효하지 않은 인증 데이터:', requestData);
    throw new HttpsError('unauthenticated', '인증이 필요합니다.');
  }

  console.log('✅ 사용자 인증 성공:', uid);

  console.log('🔍 전체 요청 구조:', JSON.stringify({
    data: req.data,
    body: req.rawRequest?.body,
    method: req.rawRequest?.method,
    headers: req.rawRequest?.headers
  }, null, 2));

  // 데이터는 이미 위에서 추출했으므로 requestData 변수 사용
  const useBonus = requestData?.useBonus || false;

  // 이제 data를 requestData로 할당
  const data = requestData;
  
  console.log('🔥 generatePosts 시작 (실제 AI 생성) - 받은 데이터:', JSON.stringify(data, null, 2));
  
  // prompt 필드 우선 처리
  const topic = data.prompt || data.topic || '';
  const category = data.category || '';
  const modelName = data.modelName || 'gemini-1.5-flash'; // 기본값은 1.5-flash
  const targetWordCount = data.wordCount || 1700; // 사용자 요청 글자수 (기본값 1700)
  
  console.log('🔍 검증 중:', { 
    topic: topic ? topic.substring(0, 50) : topic, 
    category,
    modelName,
    rawPrompt: data.prompt,
    rawTopic: data.topic,
    fullTopic: topic
  });
  if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
    console.error('❌ 주제 검증 실패:', { topic, type: typeof topic });
    throw new HttpsError('invalid-argument', '주제를 입력해주세요.');
  }
  
  if (!category || typeof category !== 'string' || category.trim().length === 0) {
    console.error('❌ 카테고리 검증 실패:', { category, type: typeof category });
    throw new HttpsError('invalid-argument', '카테고리를 선택해주세요.');
  }
  
  console.log(`✅ 데이터 검증 통과: 주제="${topic.substring(0, 50)}..." 카테고리="${category}"`);
  
  try {
    // 사용자 프로필 및 Bio 메타데이터 가져오기
    let userProfile = {};
    let bioMetadata = null;
    let personalizedHints = '';
    let dailyLimitWarning = false;

    try {
      // 사용자 기본 정보 조회
      console.log(`🔍 프로필 조회 시도 - UID: ${uid}, 길이: ${uid?.length}`);
      const userDoc = await Promise.race([
        db.collection('users').doc(uid).get(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('프로필 조회 타임아웃')), 5000))
      ]);

      console.log(`📋 프로필 문서 존재 여부: ${userDoc.exists}`);
      if (userDoc.exists) {
        userProfile = userDoc.data();
        console.log('✅ 사용자 프로필 조회 성공:', userProfile.name || 'Unknown');
        
        // 하루 생성량 제한 확인 (관리자는 제한 없음)
        const isAdmin = userProfile.isAdmin === true;

        if (!isAdmin) {
          // 일반 사용자 하루 3회 초과 시 경고 (차단하지는 않음)
          const today = new Date();
          const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          const dailyUsage = userProfile.dailyUsage || {};
          const todayGenerated = dailyUsage[todayKey] || 0;

          if (todayGenerated >= 3) {
            console.log('⚠️ 하루 3회 초과 생성 - 경고만 표시');
            dailyLimitWarning = true;
            // 차단하지 않고 계속 진행 (경고 메시지는 응답에 포함)
          }

          console.log('✅ 일반 사용자 하루 사용량 확인:', { todayGenerated, warning: todayGenerated >= 3 });
        } else {
          console.log('✅ 관리자 계정 - 하루 생성량 제한 우회');
        }

        // 보너스 사용 여부에 따른 사용 가능량 확인
        if (useBonus) {
          const usage = userProfile.usage || { bonusGenerated: 0, bonusUsed: 0 };
          const availableBonus = Math.max(0, usage.bonusGenerated - (usage.bonusUsed || 0));
          
          if (availableBonus <= 0) {
            throw new HttpsError('failed-precondition', '사용 가능한 보너스 원고가 없습니다.');
          }
          
          console.log('✅ 보너스 원고 사용 가능:', { availableBonus });
        } else {
          // 일반 사용량 확인 (관리자는 제한 없음)
          if (!isAdmin) {
            const usage = userProfile.usage || { postsGenerated: 0, monthlyLimit: 50 };

            if (usage.postsGenerated >= usage.monthlyLimit) {
              throw new HttpsError('resource-exhausted', '월간 생성 한도를 초과했습니다.');
            }

            console.log('✅ 일반 원고 생성 가능:', {
              current: usage.postsGenerated,
              limit: usage.monthlyLimit
            });
          } else {
            console.log('✅ 관리자 계정 - 월간 생성량 제한 우회');
          }
        }
      }

      // Bio 메타데이터 조회 (선택적)
      console.log(`🔍 Bio 메타데이터 조회 시도 - UID: ${uid}`);
      const bioDoc = await db.collection('bios').doc(uid).get();
      console.log(`📋 Bio 문서 존재 여부: ${bioDoc.exists}`);
      if (bioDoc.exists && bioDoc.data().extractedMetadata) {
        bioMetadata = bioDoc.data().extractedMetadata;
        
        // 메타데이터 기반 개인화 힌트 생성
        personalizedHints = generatePersonalizedHints(bioMetadata);
        console.log('✅ Bio 메타데이터 활용:', Object.keys(bioMetadata));
        
        // Bio 사용 통계 업데이트
        await db.collection('bios').doc(uid).update({
          'usage.generatedPostsCount': admin.firestore.FieldValue.increment(1),
          'usage.lastUsedAt': admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      // 개인화 정보 기반 페르소나 힌트 생성 및 추가
      const personaHints = generatePersonaHints(userProfile, category, topic);
      if (personaHints) {
        personalizedHints = personalizedHints ? `${personalizedHints} | ${personaHints}` : personaHints;
        console.log('✅ 페르소나 힌트 추가:', personaHints);
      }

    } catch (profileError) {
      console.error('❌ 프로필/Bio 조회 실패:', {
        error: profileError.message,
        stack: profileError.stack,
        uid: uid,
        uidType: typeof uid,
        uidLength: uid?.length
      });

      // 프로필이 있어야 하는 사용자입니다
      throw new HttpsError('internal', `프로필 조회 실패: ${profileError.message}`);
    }

    // 사용자 상태에 따른 톤 설정 및 호칭 결정
    const statusConfig = {
      '현역': {
        guideline: '현역 의원으로서 경험과 성과를 바탕으로 한 내용을 포함하세요. 실제 의정활동 경험을 언급할 수 있습니다.',
        title: userProfile.position || '의원'
      },
      '후보': {
        guideline: '후보자로서 정책과 공약을 중심으로 한 내용을 작성하세요. 미래 비전과 구체적 계획을 제시하세요.',
        title: `${userProfile.position || ''}후보`.replace('의원후보', '후보')
      },
      '예비': {
        guideline: '예비 상태에서는 어떤 호칭도 사용하지 않고 개인 이름으로만 지칭하세요. 현상 진단과 개인적 의견만 표현하세요. 절대 "예비후보", "후보", "의원", "현역 의원으로서", "의정활동", "성과", "실적", "추진한", "기여한" 등의 표현을 사용하지 마세요. 구체적인 비전이나 계획도 언급하지 마세요. 오직 현 상황에 대한 개인적 견해와 진단만 표현하세요.',
        title: '' // 예비 상태에서는 호칭 없음
      }
    };

    const currentStatus = userProfile.status || '현역';
    const config = statusConfig[currentStatus] || statusConfig['현역'];

    // 프롬프트 생성
    const fullName = userProfile.name || '사용자';
    // 자연스러운 한국어 호칭 생성 (모두 붙여쓰기)
    const generateNaturalRegionTitle = (regionLocal, regionMetro) => {
      // 기본 지역이 없으면 빈 문자열
      if (!regionLocal && !regionMetro) return '';
      
      // 우선순위: regionLocal > regionMetro
      const primaryRegion = regionLocal || regionMetro;
      
      // 구/군 단위: XX구민, XX군민
      if (primaryRegion.includes('구') || primaryRegion.includes('군')) {
        return primaryRegion + '민';
      }
      
      // 시 단위: XX시민
      if (primaryRegion.includes('시')) {
        return primaryRegion + '민';
      }
      
      // 도 단위: XX도민
      if (primaryRegion.includes('도')) {
        return primaryRegion + '민';
      }
      
      // 기타의 경우 시민으로 처리
      return primaryRegion + '시민';
    };
    
    const fullRegion = generateNaturalRegionTitle(userProfile.regionLocal, userProfile.regionMetro);
    
    const prompt = `YOU ARE A POLITICAL CONTENT WRITER. FOLLOW ALL INSTRUCTIONS PRECISELY OR YOU FAIL.

WRITER IDENTITY (MUST USE EXACTLY):
- NAME: ${fullName} (USE THIS EXACT NAME - NOT "저는" OR "의원")  
- TITLE: ${config.title} (USE THIS EXACT TITLE - NEVER "의원")
- REGION: ${fullRegion} (USE THIS EXACT REGION - NOT "우리 지역")
- STATUS: ${currentStatus}

정치인 블로그용 원고 1개를 작성해주세요.

**🚨 CRITICAL - 반드시 지켜야 할 필수 정보 🚨**
- **작성자 이름**: "${fullName}" (반드시 이 이름을 글에서 사용)
- **호칭**: "${config.title}" (다른 호칭 사용 금지)
- **지역**: "${fullRegion}" (다른 지역 언급 절대 금지)
- **상태**: ${currentStatus} (이에 맞는 표현만 사용)

**작성자 정보 상세:**
- 이름: ${fullName}
- 직책: ${config.title}  
- 지역: ${fullRegion}
- 상태: ${currentStatus}

주제: ${topic}
카테고리: ${category}
세부카테고리: ${data.subCategory || '없음'}
키워드: ${data.keywords || '없음'}

상태별 가이드라인: ${config.guideline}

${(() => {
  // 참고자료 및 배경정보가 의미있는 내용이 있는지 확인
  const hasInstructions = Array.isArray(data.instructions) 
    ? data.instructions.filter(item => item && item.trim() && item.trim() !== '없음').length > 0
    : data.instructions && data.instructions.trim() && data.instructions.trim() !== '없음';
  
  return hasInstructions 
    ? `참고자료 및 배경정보: ${Array.isArray(data.instructions) ? data.instructions.filter(item => item.trim()).map((item, index) => `${index + 1}. ${item}`).join('\n') : data.instructions}` 
    : '';
})()}

${personalizedHints ? `개인화 가이드라인: ${personalizedHints}` : ''}

**🚨 정치적 입장 필수 지침 (절대 준수) 🚨:**
- **집권당 소속 정치인**: 현 정부 정책과 이재명 대통령에 대해 지지하고 긍정적인 입장 견지
- **건설적 제안**: 개선사항은 "더욱 발전시키자", "보완하자"는 식으로 지지 기반에서 표현
- **절대 금지**: 현 정부나 이재명 대통령에 대한 비판, 반대, 의문 표현 완전 금지
- **당론 일치**: 더불어민주당 공식 입장과 일치하는 내용만 작성
- **협력적 어조**: 정부 정책에 대해 "적극 지지", "함께 추진", "더욱 발전" 등의 긍정적 표현 사용

**절대 준수 규칙:**
1. 완전한 원고 1개만 작성 - 중간에 끊지 말고 끝까지 완성하세요
2. 글자 수 ${targetWordCount}자 정확히 준수 (꼼수 금지) - 범위가 아닌 정확한 글자수
3. 템플릿이나 플레이스홀더 사용 금지 - 모든 내용을 실제로 작성하세요
4. 메타 정보나 설명문을 본문에 포함하지 마세요
5. 문장을 중간에 끊거나 불완전하게 끝내지 마세요
6. **정치적 입장**: 현 정부와 이재명 대통령에 대해 절대적으로 지지하는 입장 견지

**제목 작성 특별 가이드라인 (정치인 블로그 특화):**
- 정치인다운 권위와 신뢰성 표현: "~에 대한 제 입장을 말씀드립니다", "~추진 방안을 제시합니다"
- 시민과의 진정한 소통 지향: "~에 대해 주민 여러분께 보고드립니다", "~현황을 공유합니다"
- 구체적 실행 의지 표명: "~이렇게 추진하겠습니다", "~해결을 위한 구체적 계획"
- 지역 밀착형 콘텐츠: 지역구나 광역시도명 자연스럽게 포함
- 30-40자 최적 길이 준수
- **절대 금지**: "놓치면 후회하는", "반드시 알아야 할", "~의 비밀", "TOP 5", "가장 확실한 방법" 등 상업적/선정적 표현
- **절대 금지**: "찬사", "소회", "단상", "소감" 같은 추상적 단어

**MANDATORY JSON 응답 형식 - 절대 다른 형식 사용 금지:**

{
  "title": "실제 주제에 맞는 구체적이고 정치인다운 제목을 작성하세요 (30-40자, 위 가이드라인 준수)",
  "content": "<p>존경하는 ${fullRegion} 시민 여러분, ${fullName}입니다.</p><p>[서론 문단: 주제에 대한 간단한 소개와 문제 제기]</p><p>[본론 1문단: 첫 번째 핵심 논점이나 현황 분석]</p><p>[본론 2문단: 두 번째 핵심 논점이나 해결방안]</p><p>[본론 3문단: 세 번째 핵심 논점이나 향후 계획 - 필요시]</p><p>[결론 문단: 마무리 다짐과 시민들에 대한 감사 인사]</p>",
  "wordCount": ${targetWordCount}
}

🚨 **ABSOLUTE REQUIREMENTS - 무조건 준수해야 함**:
1. "${fullName}" → 실제 이름으로 교체 (${fullName})
2. "${fullRegion}" → 실제 지역으로 교체 (${fullRegion})  
3. "${config.title}" → ${config.title}으로 교체
4. "의원"이라는 단어 절대 사용 금지
5. 플레이스홀더 "()", "예시:" 절대 사용 금지
6. 마무리는 자연스러운 인사말로 작성 (예: "앞으로도 많은 관심과 응원 부탁드립니다. 감사합니다.")

요구사항:
- **필수: ${targetWordCount}자 분량 (공백 제외, 정확히 준수) - 오차 ±50자 이내**
- **문단 구성**: 적절한 문단 나누기로 가독성 향상
  * 서론: 인사와 주제 소개 (1문단)
  * 본론: 핵심 내용을 2-3개 문단으로 논리적 구성
  * 각 문단은 하나의 주요 아이디어나 논점을 다룸
  * 문단 간 자연스러운 연결과 흐름 유지
  * 결론: 마무리 인사와 다짐 (1문단)
- **HTML 형식**: <p> 태그로 문단 구분, <strong> 등 강조 태그 적절히 사용
- 진중하고 신뢰감 있는 톤
- 지역 주민과의 소통을 중시하는 내용
- 구체적인 정책이나 활동 내용 포함
${(() => {
  const hasInstructions = Array.isArray(data.instructions) 
    ? data.instructions.filter(item => item && item.trim() && item.trim() !== '없음').length > 0
    : data.instructions && data.instructions.trim() && data.instructions.trim() !== '없음';
  
  return hasInstructions 
    ? `- **참고자료 및 배경정보가 제공된 경우 해당 내용을 적극적으로 활용하여 구체적이고 현실적인 원고를 작성하세요**
- **제공된 실제 데이터, 뉴스, 정책 내용 등을 바탕으로 플레이스홀더나 예시 대신 구체적인 내용을 작성하세요**`
    : '- **구체적이고 현실적인 내용으로 작성하되, 없는 사실이나 데이터를 지어내지 마세요**';
})()}

**🚨 절대 금지사항 (위반 시 원고 사용 불가) 🚨**
- **정치적 입장 위반 금지**: 현 정부, 이재명 대통령, 더불어민주당에 대한 비판, 반대, 의문 표현 절대 금지
- **당론 위배 금지**: 당 공식 입장과 다른 견해나 반대 의견 표현 절대 금지  
- **사용자 정보 누락 금지**: 작성자 이름 "${fullName}"을 글에서 반드시 사용해야 함. "저는"만 쓰고 이름 빼먹기 금지
- **호칭 오류 금지**: "${config.title}" 외의 다른 호칭 사용 절대 금지. "의원"이라고 쓰면 안 됨
- **지역 정보 누락/오류 절대 금지**: "${fullRegion}" 외의 다른 지역 언급 절대 금지. 지역명이 빠지거나 "에서", "의" 같은 불완전한 표현 금지
- **플레이스홀더 절대 금지**: "(구체적인 내용)", "(예시:", "–", "등)" 같은 모든 플레이스홀더와 예시 표현 절대 사용 금지
- **메타 정보 금지**: "※ 본 원고는..." 같은 설명문 포함 금지  
- **불완전한 문장 금지**: 모든 문장을 완전하게 끝내야 함. 중간에 끊어지는 문장 절대 금지
- **의미없는 반복 금지**: 분량 채우기 위한 반복 내용 금지
- **완성도 필수**: ${targetWordCount}자 완전한 원고 작성. 미완성 상태로 제출 금지. 모든 문장을 완전하게 끝낼 것
- **편지 형식 금지**: "○○ 드림", "○○ 올림" 같은 편지 형식 마무리 절대 금지. 일반 원고/글 형식으로 작성
- **1인칭 사용**: 첫 소개 후에는 "저는", "제가", "저를" 등 자연스러운 1인칭 표현 사용. 계속 이름을 반복하지 말 것
- **자연스러운 지역 표현**: "남양주시민 경제" (X) → "남양주 경제" (O), "남양주시민 관광" (X) → "남양주 관광" (O)
- **중복 표현 금지**: "남양주시민을 포함한 많은 국민들" 같은 중복되고 어색한 표현 사용 금지
- **문장 완결성**: 모든 문장을 "다", "니다", "습니다" 등으로 완전히 끝낼 것. 중간에 끊어지는 문장 절대 금지
- **문단 구성 필수**: 하나의 긴 문단으로 작성 금지. 반드시 4-5개 문단으로 논리적 구성할 것
${currentStatus === '예비' ? `- **예비 상태 특별 금지사항**: "예비후보", "후보", "의원", "현역 의원으로서", "의원으로서", "의정활동", "성과", "실적", "추진한", "기여한" 등 모든 공직/정치적 호칭과 활동 표현 절대 사용 금지. 첫 소개 후에는 1인칭으로 지칭할 것` : ''}`;

    console.log(`🤖 AI 호출 시작 (1개 원고 생성) - 모델: ${modelName}...`);
    
    // 최대 3번 시도 (검증 실패 시 재시도)
    let apiResponse;
    let attempt = 0;
    const maxAttempts = 3;
    
    while (attempt < maxAttempts) {
      attempt++;
      console.log(`🔄 AI 호출 시도 ${attempt}/${maxAttempts}...`);
      
      apiResponse = await callGenerativeModel(prompt, 1, modelName);
      
      // 기본 검증
      if (apiResponse && apiResponse.length > 100) {
        // 중요한 내용이 포함되어 있는지 검증
        const hasName = apiResponse.includes(fullName);
        const hasRegion = fullRegion ? apiResponse.includes(fullRegion) : true;
        const hasWrongTitle = apiResponse.includes('의원입니다') || apiResponse.includes('의원으로서');
        
        console.log(`📋 검증 결과 - 이름: ${hasName}, 지역: ${hasRegion}, 잘못된호칭: ${hasWrongTitle}`);
        
        if (hasName && hasRegion && !hasWrongTitle) {
          console.log(`✅ 검증 통과! (${attempt}번째 시도)`);
          break;
        }
        
        if (attempt < maxAttempts) {
          console.log(`❌ 검증 실패 - 재시도 필요`);
          continue;
        }
      }
      
      if (attempt >= maxAttempts) {
        console.log(`⚠️ 최대 시도 횟수 초과 - 현재 응답 사용`);
      }
    }
    
    console.log(`✅ AI 응답 최종 수신, 길이: ${apiResponse.length} - 모델: ${modelName}`);
    
    // JSON 파싱
    let parsedResponse;
    try {
      // JSON 블록 추출
      const jsonMatch = apiResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                       apiResponse.match(/\{[\s\S]*?\}/);
      
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        console.log('🔍 추출된 JSON 일부:', jsonText.substring(0, 200));
        parsedResponse = JSON.parse(jsonText);
        console.log('✅ JSON 파싱 성공, 제목:', parsedResponse.title);
      } else {
        throw new Error('JSON 형식 찾기 실패');
      }
    } catch (parseError) {
      console.error('❌ JSON 파싱 실패:', parseError.message);
      console.error('응답 내용:', apiResponse.substring(0, 500));
      
      // 파싱 실패 시 기본 구조 생성
      parsedResponse = {
        title: `${topic} 관련 원고`,
        content: `<p>${topic}에 대한 의견을 나누고자 합니다.</p><p>구체적인 내용은 AI 응답 파싱에 실패했습니다.</p>`,
        wordCount: 100
      };
    }

    // 🚨 강제 후처리: AI가 무시한 필수 정보들을 직접 수정
    console.log('🔧 후처리 시작 - 필수 정보 강제 삽입');
    
    if (parsedResponse && parsedResponse.content) {
      let fixedContent = parsedResponse.content;
      
      // 1. 잘못된 호칭 수정
      fixedContent = fixedContent.replace(/의원입니다/g, `${fullName}입니다`);
      fixedContent = fixedContent.replace(/의원으로서/g, `${config.title}으로서`);
      fixedContent = fixedContent.replace(/국회 의원/g, config.title);
      fixedContent = fixedContent.replace(/\s의원\s/g, ` ${config.title} `);
      
      // 예비 상태 특별 수정 - 모든 호칭과 공직 활동 표현 제거
      if (currentStatus === '예비') {
        // 모든 호칭 제거 (첫 소개 이후)
        fixedContent = fixedContent.replace(/예비후보/g, '저');
        fixedContent = fixedContent.replace(/후보/g, '저');
        fixedContent = fixedContent.replace(/의원으로서/g, '저는');
        fixedContent = fixedContent.replace(/예비.*후보.*로서/g, '저는');
        
        // 공직/정치 활동 표현 제거
        fixedContent = fixedContent.replace(/의정활동을 통해/g, '시민 여러분과의 소통을 통해');
        fixedContent = fixedContent.replace(/현역 의원으로서/g, '저는');
        fixedContent = fixedContent.replace(/성과를/g, '경험을');
        fixedContent = fixedContent.replace(/실적을/g, '활동을');
        fixedContent = fixedContent.replace(/추진해왔습니다/g, '생각합니다');
        fixedContent = fixedContent.replace(/기여해왔습니다/g, '관심을 가지고 있습니다');
        
        // 3인칭 → 1인칭 변경 (첫 소개 이후)
        // "강정구는" → "저는" (단, 첫 소개 문장은 제외)
        const sentences = fixedContent.split('</p>');
        for (let i = 1; i < sentences.length; i++) { // 첫 번째 문단(소개) 이후부터 적용
          sentences[i] = sentences[i].replace(new RegExp(`${fullName}는`, 'g'), '저는');
          sentences[i] = sentences[i].replace(new RegExp(`${fullName}가`, 'g'), '제가');
          sentences[i] = sentences[i].replace(new RegExp(`${fullName}을`, 'g'), '저를');
          sentences[i] = sentences[i].replace(new RegExp(`${fullName}의`, 'g'), '저의');
        }
        fixedContent = sentences.join('</p>');
        
        // 편지 형식 마무리 완전 제거
        fixedContent = fixedContent.replace(new RegExp(`${fullName} 드림`, 'g'), '');
        fixedContent = fixedContent.replace(/드림<\/p>/g, '</p>');
        fixedContent = fixedContent.replace(/<p>드림<\/p>/g, '');
        fixedContent = fixedContent.replace(/\n\n드림$/g, '');
        fixedContent = fixedContent.replace(/드림$/g, '');
        fixedContent = fixedContent.replace(/올림<\/p>/g, '</p>');
        fixedContent = fixedContent.replace(/<p>올림<\/p>/g, '');
        
        // 어색한 지역 표현 수정
        const regionName = userProfile.regionLocal || userProfile.regionMetro || '남양주시';
        const baseRegion = regionName.replace('시민', '').replace('민', '');
        fixedContent = fixedContent.replace(new RegExp(`${baseRegion}시민 경제`, 'g'), `${baseRegion} 경제`);
        fixedContent = fixedContent.replace(new RegExp(`${baseRegion}시민 관광`, 'g'), `${baseRegion} 관광`);
        fixedContent = fixedContent.replace(new RegExp(`${baseRegion}시민 발전`, 'g'), `${baseRegion} 발전`);
        
        // 중복/어색한 표현 정리
        fixedContent = fixedContent.replace(/남양주시민을 포함한 많은 국민들/g, '많은 시민들');
        fixedContent = fixedContent.replace(/남양주시민 여러분을 포함한/g, '시민 여러분을 포함한');
        
        // 불완전한 문장 감지 및 제거 (어미가 없는 문장)
        fixedContent = fixedContent.replace(/([가-힣]+)\s*<\/p>/g, (match, word) => {
          if (!word.match(/[다니까요며네요습것음임음]$/)) {
            // 불완전한 문장으로 보이면 이전 완전한 문장에서 종료
            return '</p>';
          }
          return match;
        });
        
        // 빈 문단 제거
        fixedContent = fixedContent.replace(/<p><\/p>/g, '');
        fixedContent = fixedContent.replace(/<p>\s*<\/p>/g, '');
        
        // 어색한 조사 수정
        fixedContent = fixedContent.replace(/남양주을 통해/g, '남양주를 통해');
        fixedContent = fixedContent.replace(/남양주을/g, '남양주를');
      }
      
      // 2. 누락된 이름 삽입 (중복되지 않도록 신중하게)
      // "저는"을 "저 이름은"으로 변경 (이미 이름이 없는 경우만)
      if (!fixedContent.includes(`저 ${fullName}`)) {
        fixedContent = fixedContent.replace(/(<p>)저는/g, `$1저 ${fullName}는`);
      }
      // "저 "뒤에 이름이 없는 경우만 이름 삽입
      fixedContent = fixedContent.replace(/(<p>)저 ([^가-힣])/g, `$1저 ${fullName} $2`);
      
      // 3. 누락된 지역 정보 수정
      if (fullRegion) {
        // 구체적인 패턴만 교체
        fixedContent = fixedContent.replace(/우리 지역의/g, `${fullRegion}의`);
        fixedContent = fixedContent.replace(/우리 지역에/g, `${fullRegion}에`);
        fixedContent = fixedContent.replace(/지역 /g, `${fullRegion} `);
        fixedContent = fixedContent.replace(/\s를\s/g, ` ${fullRegion}을 `);
        fixedContent = fixedContent.replace(/\s의 발전을/g, ` ${fullRegion}의 발전을`);
        fixedContent = fixedContent.replace(/에서도/g, `${fullRegion}에서도`);
        
        // 빈 지역 참조 패턴 찾아서 수정
        fixedContent = fixedContent.replace(/,\s*의\s/g, `, ${fullRegion}의 `);
        fixedContent = fixedContent.replace(/\s*에서\s*타운홀/g, ` ${fullRegion}에서 타운홀`);
      }
      
      // 4. 시작 문장이 올바르지 않으면 강제 수정
      if (!fixedContent.includes(`${fullName}입니다`)) {
        // 첫 번째 p 태그 찾아서 교체
        fixedContent = fixedContent.replace(/^<p>[^<]*?<\/p>/, 
          `<p>존경하는 ${fullRegion} 시민 여러분, ${fullName}입니다.</p>`);
      }
      
      // 5. 마지막 서명 수정 (예비 상태가 아닐 때만)
      if (currentStatus !== '예비') {
        fixedContent = fixedContent.replace(/의원 올림/g, `${fullName} 드림`);
        fixedContent = fixedContent.replace(/의원 드림/g, `${fullName} 드림`);
        
        // 서명이 없으면 추가
        if (!fixedContent.includes(`${fullName} 드림`) && !fixedContent.includes(`${fullName} 올림`)) {
          fixedContent = fixedContent.replace(/<\/p>$/, `</p><p>${fullName} 드림</p>`);
        }
      }
      
      // 6. 기타 패턴 수정
      fixedContent = fixedContent.replace(/시민 여러분, 의원입니다/g, `시민 여러분, ${fullName}입니다`);
      fixedContent = fixedContent.replace(/여러분께, 의원입니다/g, `여러분께, ${fullName}입니다`);
      
      // 불완전한 문장 수정
      fixedContent = fixedContent.replace(/투명원하겠습니다/g, '투명성을 높이겠습니다');
      fixedContent = fixedContent.replace(/시민들의 목소리재명/g, '시민들의 목소리를 듣고 이재명');
      fixedContent = fixedContent.replace(/온라인 소통 미래를/g, '온라인 소통 채널을 통해 미래를');
      
      // 어색한 텍스트 조각 수정
      fixedContent = fixedContent.replace(/남양주시민 해 끊임없이/g, '남양주시민 여러분을 위해 끊임없이');
      fixedContent = fixedContent.replace(/정여러분께서/g, '시민 여러분께서');
      fixedContent = fixedContent.replace(/([가-힣]+) ([가-힣]+)을 통해/g, (match, word1, word2) => {
        if (word2.includes('주을') || word2.includes('을을')) {
          return `${word1} ${word2.replace('을', '를')} 통해`;
        }
        return match;
      });
      
      // 🔧 최종 중복 이름 패턴 제거 (모든 처리 완료 후)
      console.log('🔧 최종 중복 이름 제거 시작');
      fixedContent = fixedContent.replace(new RegExp(`저 ${fullName} ${fullName}는`, 'g'), `저 ${fullName}는`);
      fixedContent = fixedContent.replace(new RegExp(`저 ${fullName} ${fullName}가`, 'g'), `저 ${fullName}가`);
      fixedContent = fixedContent.replace(new RegExp(`저 ${fullName} ${fullName}을`, 'g'), `저 ${fullName}를`);
      fixedContent = fixedContent.replace(new RegExp(`저 ${fullName} ${fullName}`, 'g'), `저 ${fullName}`);
      fixedContent = fixedContent.replace(new RegExp(`${fullName} ${fullName}는`, 'g'), `${fullName}는`);
      fixedContent = fixedContent.replace(new RegExp(`${fullName} ${fullName}가`, 'g'), `${fullName}가`);
      fixedContent = fixedContent.replace(new RegExp(`${fullName} ${fullName}을`, 'g'), `${fullName}를`);
      fixedContent = fixedContent.replace(new RegExp(`${fullName} ${fullName}`, 'g'), fullName);
      
      // 3연속 이상 중복도 처리
      fixedContent = fixedContent.replace(new RegExp(`${fullName} ${fullName} ${fullName}`, 'g'), fullName);
      fixedContent = fixedContent.replace(new RegExp(`저 ${fullName} ${fullName} ${fullName}`, 'g'), `저 ${fullName}`);
      
      parsedResponse.content = fixedContent;
      console.log('✅ 후처리 완료 - 필수 정보 삽입됨');
    }

    // drafts 형식으로 반환 (프론트엔드 호환성)
    const draftData = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: parsedResponse.title || `${topic} 관련 원고`,
      content: parsedResponse.content || `<p>${topic}에 대한 내용입니다.</p>`,
      wordCount: parsedResponse.wordCount || parsedResponse.content?.replace(/<[^>]*>/g, '').length || 0,
      category,
      subCategory: data.subCategory || '',
      keywords: data.keywords || '',
      generatedAt: new Date().toISOString()
    };

    // 사용량 업데이트 (관리자는 카운트하지 않음)
    if (userProfile && Object.keys(userProfile).length > 0) {
      const isAdmin = userProfile.isAdmin === true;

      try {
        if (useBonus) {
          // 보너스 사용량 증가 (하루 사용량도 함께 증가)
          const today = new Date();
          const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

          await db.collection('users').doc(uid).update({
            'usage.bonusUsed': admin.firestore.FieldValue.increment(1),
            [`dailyUsage.${todayKey}`]: isAdmin ? 0 : admin.firestore.FieldValue.increment(1), // 관리자는 하루 카운트 안함
            lastBonusUsed: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log('✅ 보너스 원고 사용량 업데이트', isAdmin ? '(관리자 - 하루 카운트 제외)' : '');
        } else {
          // 일반 사용량 증가 (관리자는 카운트하지 않음)
          if (!isAdmin) {
            const today = new Date();
            const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            await db.collection('users').doc(uid).update({
              'usage.postsGenerated': admin.firestore.FieldValue.increment(1),
              [`dailyUsage.${todayKey}`]: admin.firestore.FieldValue.increment(1),
              lastGenerated: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ 일반 원고 사용량 및 하루 사용량 업데이트');
          } else {
            // 관리자는 사용량 카운트하지 않음 (생성 기록만 남김)
            await db.collection('users').doc(uid).update({
              lastGenerated: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ 관리자 계정 - 사용량 카운트 없이 기록만 업데이트');
          }
        }
      } catch (updateError) {
        console.warn('⚠️ 사용량 업데이트 실패:', updateError.message);
      }
    }

    console.log('✅ generatePosts 성공:', { 
      title: draftData.title, 
      wordCount: draftData.wordCount,
      useBonus
    });

    // 경고 메시지 생성
    let message = useBonus ? '보너스 원고가 성공적으로 생성되었습니다.' : '원고가 성공적으로 생성되었습니다.';
    if (dailyLimitWarning) {
      message += '\n\n⚠️ 하루 3회 이상 원고를 생성하셨습니다. 네이버 블로그 정책상 과도한 발행은 스팸으로 분류될 수 있으니, 반드시 마지막 포스팅으로부터 3시간 경과 후 발행해 주세요.';
    }

    return ok({
      success: true,
      message: message,
      dailyLimitWarning: dailyLimitWarning,
      drafts: draftData,
      metadata: {
        generatedAt: new Date().toISOString(),
        userId: uid,
        processingTime: Date.now(),
        usedBonus: useBonus
      }
    });

  } catch (error) {
    console.error('❌ generatePosts 오류:', error.message);
    throw new HttpsError('internal', '원고 생성에 실패했습니다: ' + error.message);
  }
});


// saveSelectedPost - 선택된 원고 저장
exports.saveSelectedPost = httpWrap(async (req) => {
  let uid;

  // 데이터 추출 - Firebase SDK와 HTTP 요청 모두 처리
  let requestData = req.data || req.rawRequest?.body || {};

  // 중첩된 data 구조 처리
  if (requestData.data && typeof requestData.data === 'object') {
    requestData = requestData.data;
  }

  // 사용자 인증 데이터 확인 (모든 사용자는 네이버 로그인)
  if (requestData.__naverAuth && requestData.__naverAuth.uid && requestData.__naverAuth.provider === 'naver') {
    console.log('📱 사용자 인증 처리:', requestData.__naverAuth.uid);
    uid = requestData.__naverAuth.uid;
    // 인증 정보 제거 (처리 완료)
    delete requestData.__naverAuth;
  } else {
    console.error('❌ 유효하지 않은 인증 데이터:', requestData);
    throw new HttpsError('unauthenticated', '인증이 필요합니다.');
  }

  const data = requestData;
  
  console.log('POST saveSelectedPost 호출:', { userId: uid, data });

  if (!data.title || !data.content) {
    throw new HttpsError('invalid-argument', '제목과 내용이 필요합니다.');
  }

  try {
    const wordCount = data.content.replace(/<[^>]*>/g, '').length;

    const postData = {
      userId: uid,
      title: data.title,
      content: data.content,
      category: data.category || '일반',
      subCategory: data.subCategory || '',
      keywords: data.keywords || '',
      wordCount,
      status: 'published',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('posts').add(postData);

    console.log('POST saveSelectedPost 성공:', { postId: docRef.id, wordCount });

    return ok({
      success: true,
      message: '원고가 성공적으로 저장되었습니다.',
      postId: docRef.id
    });

  } catch (error) {
    console.error('POST saveSelectedPost 오류:', error.message);
    throw new HttpsError('internal', '원고 저장에 실패했습니다.');
  }
});