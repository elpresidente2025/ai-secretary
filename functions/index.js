const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Firebase Admin 초기화
admin.initializeApp();

/**
 * 초단순 원고 생성 함수
 */
exports.generatePostDrafts = functions.https.onCall(async (data, context) => {
  try {
    const topic = data?.topic || '정책 제안';
    const category = data?.category || '의정활동';
    
    // 하드코딩된 응답 (일단 작동시키는 것이 목표)
    return {
      success: true,
      drafts: [
        {
          title: `${category}: ${topic} 분석`,
          content: `${topic}에 대한 정책 분석입니다.\n\n구체적인 실행 방안을 제시하겠습니다.\n\n시민 여러분의 적극적인 참여를 부탁드립니다.`
        },
        {
          title: `${category}: ${topic} 실행방안`,
          content: `${topic} 추진을 위한 로드맵입니다.\n\n단계별 계획을 수립했습니다.\n\n함께 만들어가는 변화를 기대합니다.`
        },
        {
          title: `${category}: ${topic} 기대효과`,
          content: `${topic}이 가져올 긍정적 변화입니다.\n\n지역 발전에 크게 기여할 것입니다.\n\n지속적인 관심과 지지를 부탁드립니다.`
        }
      ]
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * 프로필 조회
 */
exports.getUserProfile = functions.https.onCall(async (data, context) => {
  return {
    success: true,
    profile: {
      displayTitle: '서울 시의원',
      region: '서울',
      position: 'cityCouncilor',
      email: context.auth?.token?.email || 'test@example.com'
    }
  };
});

/**
 * 프로필 업데이트
 */
exports.updateUserProfile = functions.https.onCall(async (data, context) => {
  return {
    success: true,
    message: '프로필이 업데이트되었습니다.'
  };
});

/**
 * 상태 확인
 */
exports.healthCheck = functions.https.onCall(async () => {
  return {
    success: true,
    message: 'AI비서관 정상 작동중',
    timestamp: new Date().toISOString()
  };
});