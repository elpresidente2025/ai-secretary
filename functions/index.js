const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Firebase Admin 초기화
initializeApp();
const db = getFirestore();

/**
 * 🔥 수정된 호칭 결정 로직 (현역/예비 분류 포함)
 * @param {object} user - 사용자 정보 객체
 * @returns {string} 표시할 호칭 문자열
 */
function getUserDisplayTitle(user) {
  // 사용자가 없거나 user 객체가 비어있으면 빈 문자열 반환
  if (!user) {
    return '';
  }

  // 규칙 1: 사용자가 'admin' 역할일 경우, 다른 모든 규칙을 무시하고 '관리자'를 반환합니다.
  if (user.role === 'admin') {
    return '관리자';
  }

  const { position, regionMetro, regionLocal, status } = user;

  // 직책 정보가 없으면 빈 문자열 반환
  if (!position) {
    return '';
  }

  // 🔥 기본 직책 호칭 결정
  let baseTitle = '';

  // 규칙 2: 직책이 '국회의원'일 경우
  if (position === '국회의원') {
    baseTitle = '국회의원';
  }
  // 규칙 3: 직책이 '광역의원'일 경우
  else if (position === '광역의원') {
    if (regionMetro?.endsWith('시')) baseTitle = '시의원';
    else if (regionMetro?.endsWith('도')) baseTitle = '도의원';
    else baseTitle = '광역의원'; // 예외 케이스 처리
  }
  // 규칙 4: 직책이 '기초의원'일 경우
  else if (position === '기초의원') {
    if (regionLocal?.endsWith('시')) baseTitle = '시의원';
    else if (regionLocal?.endsWith('구')) baseTitle = '구의원';
    else if (regionLocal?.endsWith('군')) baseTitle = '군의원';
    else baseTitle = '기초의원'; // 예외 케이스 처리
  }
  // 위의 규칙에 해당하지 않는 경우, 원래 직책명을 그대로 사용
  else {
    baseTitle = position;
  }

  // 🔥 규칙 5: 현역/예비 상태에 따른 최종 호칭 결정
  if (status === '예비') {
    return `${baseTitle} 후보`;
  } else {
    // status가 '현역'이거나 설정되지 않은 경우 기본 호칭 사용
    return baseTitle;
  }
}

/**
 * 🔥 확장된 호칭 정보 생성 함수 (현역/예비 포함)
 * @param {string} name - 사용자 이름
 * @param {string} position - 직책
 * @param {string} regionMetro - 광역자치단체
 * @param {string} regionLocal - 기초자치단체
 * @param {string} electoralDistrict - 선거구
 * @param {string} status - 현역/예비 상태
 * @param {string} role - 사용자 역할 (admin 등)
 * @returns {object} 호칭 정보 객체
 */
function generateTitleInfo(name, position, regionMetro, regionLocal, electoralDistrict, status = '현역', role = 'user') {
  const user = { position, regionMetro, regionLocal, status, role };
  
  // 수정된 로직으로 기본 호칭 결정
  const displayTitle = getUserDisplayTitle(user);
  
  // 상세한 호칭 정보 생성
  let shortTitle = '';
  let honorific = '';
  let fullTitle = '';
  
  // 🔥 현역/예비에 따른 호칭 처리
  const isCandidate = status === '예비';
  
  if (displayTitle === '관리자') {
    shortTitle = '님';
    honorific = '관리자님';
    fullTitle = '관리자';
  }
  else if (displayTitle.includes('후보')) {
    // 예비 후보의 경우
    shortTitle = '님';
    honorific = `${displayTitle}님`;
    fullTitle = `${regionLocal || regionMetro} ${electoralDistrict} ${displayTitle}`;
  }
  else {
    // 현역의 경우
    if (displayTitle.includes('의원')) {
      shortTitle = '의원님';
      honorific = `${displayTitle}님`;
      fullTitle = `${regionLocal || regionMetro} ${electoralDistrict} ${displayTitle}`;
    } else {
      shortTitle = '님';
      honorific = `${displayTitle}님`;
      fullTitle = `${regionLocal || regionMetro} ${electoralDistrict} ${displayTitle}`;
    }
  }

  return {
    displayTitle,    // 수정된 규칙에 따른 호칭: "국회의원", "시의원 후보", "구의원 후보" 등
    shortTitle,      // 짧은 호칭: "의원님", "님"
    honorific,       // 경어 호칭: "국회의원님", "시의원 후보님"
    fullTitle,       // 전체 호칭: "여주·양평 국회의원", "양평군 여주·양평 군의원 후보"
    greeting: `${name} ${honorific}`, // 인사말: "강정구 국회의원님", "강정구 국회의원 후보님"
    status,          // 현역/예비 상태
    isCandidate      // 후보 여부
  };
}

/**
 * 🔥 updateProfile 함수 (v6 방식)
 */
exports.updateProfile = onCall(async (request) => {
  try {
    console.log('=== updateProfile 함수 시작 ===');
    console.log('받은 데이터:', JSON.stringify(request.data, null, 2));

    // 인증 확인
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const uid = request.auth.uid;
    const userEmail = request.auth.token.email;

    // 🔥 입력 데이터 검증 (status 필드 추가)
    const { name, position, regionMetro, regionLocal, electoralDistrict, status = '현역' } = request.data || {};

    const requiredFields = { name, position, regionMetro, regionLocal, electoralDistrict };
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value || value.trim() === '')
      .map(([key]) => key);

    if (missingFields.length > 0) {
      throw new HttpsError(
        'invalid-argument',
        `다음 필드를 입력해주세요: ${missingFields.join(', ')}`
      );
    }

    // 🔥 직책 검증 (기타 제거)
    const validPositions = ['국회의원', '광역의원', '기초의원'];
    if (!validPositions.includes(position)) {
      throw new HttpsError(
        'invalid-argument',
        `유효하지 않은 직책입니다: ${position}. 가능한 값: ${validPositions.join(', ')}`
      );
    }

    // 🔥 status 필드 검증
    const validStatuses = ['현역', '예비'];
    if (!validStatuses.includes(status)) {
      throw new HttpsError(
        'invalid-argument',
        `유효하지 않은 상태입니다: ${status}. 가능한 값: ${validStatuses.join(', ')}`
      );
    }

    // 기존 사용자 정보 조회 (역할 정보 확인용)
    let currentRole = 'user';
    try {
      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        currentRole = userDoc.data().role || 'user';
      }
    } catch (error) {
      console.warn('기존 사용자 정보 조회 실패, 기본 역할 사용:', error);
    }

    // 🔥 호칭 정보 생성 (현역/예비 상태 포함)
    const titleInfo = generateTitleInfo(
      name, position, regionMetro, regionLocal, electoralDistrict, status, currentRole
    );
    
    console.log('생성된 호칭 정보:', titleInfo);

    // Firestore에 저장할 데이터
    const profileData = {
      // 기본 정보
      name: name.trim(),
      position: position.trim(),
      regionMetro: regionMetro.trim(),
      regionLocal: regionLocal.trim(),
      electoralDistrict: electoralDistrict.trim(),
      status: status, // 🔥 현역/예비 상태 추가
      
      // 수정된 호칭 정보
      displayTitle: titleInfo.displayTitle,   // "국회의원", "시의원 후보" 등
      shortTitle: titleInfo.shortTitle,       // "의원님", "님"
      honorific: titleInfo.honorific,         // "국회의원님", "시의원 후보님"
      fullTitle: titleInfo.fullTitle,         // "여주·양평 국회의원 후보"
      greeting: titleInfo.greeting,           // "강정구 국회의원 후보님"
      isCandidate: titleInfo.isCandidate,     // 후보 여부
      
      // 메타 정보
      role: currentRole,
      updatedAt: FieldValue.serverTimestamp(),
      email: userEmail,
      uid: uid
    };

    console.log('Firestore에 저장할 데이터:', profileData);

    // Firestore 저장
    const userRef = db.collection('users').doc(uid);
    await userRef.set(profileData, { merge: true });

    console.log('✅ Firestore 저장 성공');

    // 성공 응답
    const response = {
      success: true,
      message: `프로필이 성공적으로 업데이트되었습니다. (${titleInfo.greeting})`,
      profileData: {
        ...profileData,
        updatedAt: new Date().toISOString()
      },
      titleInfo // 호칭 정보를 클라이언트에 전달
    };

    console.log('✅ updateProfile 함수 완료:', response);
    return response;

  } catch (error) {
    console.error('❌ updateProfile 함수 에러:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError(
      'internal',
      '서버에서 예상치 못한 오류가 발생했습니다.',
      error.message
    );
  }
});

/**
 * 🔥 사용자 프로필 조회 함수 (v6 방식)
 */
exports.getUserProfile = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const uid = request.auth.uid;
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError('not-found', '사용자 프로필을 찾을 수 없습니다.');
    }

    const profileData = userDoc.data();
    
    // 🔥 호칭 정보가 없거나 구식이면 재생성
    if (!profileData.displayTitle && profileData.position) {
      const titleInfo = generateTitleInfo(
        profileData.name,
        profileData.position,
        profileData.regionMetro,
        profileData.regionLocal,
        profileData.electoralDistrict,
        profileData.status || '현역',
        profileData.role || 'user'
      );
      
      // 호칭 정보 업데이트
      await userRef.update({
        displayTitle: titleInfo.displayTitle,
        shortTitle: titleInfo.shortTitle,
        honorific: titleInfo.honorific,
        fullTitle: titleInfo.fullTitle,
        greeting: titleInfo.greeting,
        isCandidate: titleInfo.isCandidate
      });
      
      // 응답 데이터에 호칭 정보 추가
      Object.assign(profileData, titleInfo);
    }
    
    return {
      success: true,
      profileData: {
        ...profileData,
        createdAt: profileData.createdAt?.toDate()?.toISOString(),
        updatedAt: profileData.updatedAt?.toDate()?.toISOString()
      }
    };

  } catch (error) {
    console.error('❌ getUserProfile 함수 오류:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', '프로필 조회 중 오류가 발생했습니다.');
  }
});

/**
 * 🔥 연결 테스트용 함수 (v6 방식)
 */
exports.testConnection = onCall(async (request) => {
  console.log('🔥 testConnection 호출됨:', { data: request.data, auth: !!request.auth });
  
  return {
    success: true,
    message: 'Firebase Functions 연결이 정상적으로 작동합니다.',
    timestamp: new Date().toISOString(),
    authenticated: !!request.auth,
    requestData: request.data
  };
});

/**
 * 🔥 사용자 초기 등록 함수 (v6 방식)
 */
exports.registerUser = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const uid = request.auth.uid;
    const email = request.auth.token.email;
    const { name } = request.data;

    const userData = {
      uid,
      email,
      name: name || '',
      role: 'user', // 기본 역할
      status: '현역', // 🔥 기본 상태 추가
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const userRef = db.collection('users').doc(uid);
    await userRef.set(userData, { merge: true });

    return {
      success: true,
      message: '사용자 등록이 완료되었습니다.',
      userData: {
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('❌ registerUser 함수 오류:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', '사용자 등록 중 오류가 발생했습니다.');
  }
});