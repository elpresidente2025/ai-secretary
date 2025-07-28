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
};