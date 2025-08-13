/**
 * 사용자의 정보(역할, 직책, 지역, 현역/예비)를 바탕으로 화면에 표시할 최종 호칭을 결정합니다.
 *
 * @param {object | null | undefined} user - AuthContext에서 제공하는 사용자 객체.
 * @returns {string} 표시할 호칭 문자열.
 */
export const getUserDisplayTitle = (user) => {
  // 사용자가 없거나 user 객체가 비어있으면 빈 문자열 반환
  if (!user) {
    return '';
  }

  // ✅ 변경사항: 관리자도 동일 규칙 적용 (더 이상 '관리자'로 고정하지 않음)
  const { position, regionMetro, regionLocal, status } = user;

  // 직책 정보가 없으면 빈 문자열 반환
  if (!position) {
    return '';
  }

  // 🔥 기본 직책 호칭 결정
  let baseTitle = '';

  // 규칙: 직책별 호칭
  if (position === '국회의원') {
    baseTitle = '국회의원';
  } else if (position === '광역의원') {
    if (!regionMetro) {
      baseTitle = '광역의원';
    } else if (String(regionMetro).endsWith('시')) {
      baseTitle = '시의원';
    } else if (String(regionMetro).endsWith('도')) {
      baseTitle = '도의원';
    } else {
      baseTitle = '광역의원';
    }
  } else if (position === '기초의원') {
    if (!regionLocal) {
      baseTitle = '기초의원';
    } else if (String(regionLocal).endsWith('시')) {
      baseTitle = '시의원';
    } else if (String(regionLocal).endsWith('구')) {
      baseTitle = '구의원';
    } else if (String(regionLocal).endsWith('군')) {
      baseTitle = '군의원';
    } else {
      baseTitle = '기초의원';
    }
  } else {
    baseTitle = position; // 기타 직책은 원문 사용
  }

  // 🔥 현역/예비 상태 반영
  if (status === '예비') {
    return `${baseTitle} 후보`;
  } else {
    return baseTitle; // 현역/미지정은 기본 호칭
  }
};

/**
 * 사용자의 전체 호칭을 생성합니다 (이름 + 직책 + 후보(필요시) + 님)
 * 예시: "강정구 국회의원 후보님"
 *
 * @param {object | null | undefined} user - AuthContext에서 제공하는 사용자 객체.
 * @returns {string} 전체 호칭 문자열.
 */
export const getUserFullTitle = (user) => {
  if (!user) {
    return '사용자님';
  }

  const name = user.name || '이름 없음';
  const displayTitle = getUserDisplayTitle(user);

  if (displayTitle) {
    return `${name} ${displayTitle}님`;
  } else {
    return `${name}님`;
  }
};

/**
 * 지역 정보를 포맷팅합니다
 *
 * @param {object | null | undefined} user - AuthContext에서 제공하는 사용자 객체.
 * @returns {string} 포맷팅된 지역 정보.
 */
export const getUserRegionInfo = (user) => {
  if (!user) {
    return '';
  }

  const { regionMetro, regionLocal, electoralDistrict } = user;
  const regions = [regionMetro, regionLocal, electoralDistrict].filter(Boolean);

  return regions.length > 0 ? regions.join(' > ') : '';
};

/**
 * 사용자의 직책별 색상을 반환합니다 (UI 표시용)
 *
 * @param {object | null | undefined} user - AuthContext에서 제공하는 사용자 객체.
 * @returns {string} Material-UI 색상 코드.
 */
export const getUserPositionColor = (user) => {
  if (!user || !user.position) {
    return 'default';
  }

  // ✅ 변경사항: 관리자 전용 색상 제거(다른 규칙과 동일)
  switch (user.position) {
    case '국회의원':
      return 'primary';   // 파란색
    case '광역의원':
      return 'secondary'; // 보라색
    case '기초의원':
      return 'success';   // 초록색
    default:
      return 'default';   // 회색
  }
};

/**
 * 사용자 상태에 따른 아이콘을 반환합니다
 *
 * @param {object | null | undefined} user - AuthContext에서 제공하는 사용자 객체.
 * @returns {string} 상태 아이콘.
 */
export const getUserStatusIcon = (user) => {
  if (!user) {
    return '👤';
  }

  // ✅ 요구사항: 관리자만 아이콘을 왕관으로 고정
  if (user.role === 'admin') {
    return '👑';
  }

  if (user.status === '예비') {
    return '🏃';
  }

  switch (user.position) {
    case '국회의원':
      return '🏛️';
    case '광역의원':
      return '🏢';
    case '기초의원':
      return '🏬';
    default:
      return '👤';
  }
};
