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
    if (!regionMetro) {
      baseTitle = '광역의원'; // 지역 정보가 없는 경우
    } else if (regionMetro.endsWith('시')) {
      // 특별시, 광역시, 특별자치시의 경우 '시의원'
      baseTitle = '시의원';
    } else if (regionMetro.endsWith('도')) {
      // 일반 도, 특별자치도의 경우 '도의원'
      baseTitle = '도의원';
    } else {
      // 예외 케이스 (향후 새로운 행정구역 형태를 위해)
      baseTitle = '광역의원';
    }
  }
  // 규칙 4: 직책이 '기초의원'일 경우
  else if (position === '기초의원') {
    if (!regionLocal) {
      baseTitle = '기초의원'; // 지역 정보가 없는 경우
    } else if (regionLocal.endsWith('시')) {
      // 일반시, 특례시의 경우 '시의원'
      baseTitle = '시의원';
    } else if (regionLocal.endsWith('구')) {
      // 자치구의 경우 '구의원'
      baseTitle = '구의원';
    } else if (regionLocal.endsWith('군')) {
      // 군의 경우 '군의원'
      baseTitle = '군의원';
    } else {
      // 예외 케이스 처리
      baseTitle = '기초의원';
    }
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

  if (user.role === 'admin') {
    return 'error'; // 빨간색
  }

  switch (user.position) {
    case '국회의원':
      return 'primary'; // 파란색
    case '광역의원':
      return 'secondary'; // 보라색
    case '기초의원':
      return 'success'; // 초록색
    default:
      return 'default'; // 회색
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