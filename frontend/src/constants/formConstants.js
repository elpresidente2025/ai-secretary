// frontend/src/constants/formConstants.js (백엔드 완전 동기화 최종 버전)

/**
 * 이 파일은 백엔드 프롬프트 엔진과 100% 동기화됩니다.
 * 각 카테고리의 `value`는 `functions/templates/prompts.js`의 `selectPromptType` 함수와 연결됩니다.
 * 각 세부 카테고리의 `value`는 각 `prompts/*.js` 파일에서 실제로 구현된 것만 포함합니다.
 */
export const CATEGORIES = [
  {
    value: '일반소통',
    label: '일상 소통 (SNS 등)',
    subCategories: [
      // ✅ 백엔드 daily-communication.js에서 실제로 지원하는 세부 카테고리들
      { value: '감사인사', label: '감사 메시지' },
      { value: '일상공유', label: '일상 이야기' },
      { value: '소회표현', label: '개인적 소회' },
      { value: '격려응원', label: '격려/응원 메시지' },
      { value: '행사참석', label: '행사 참석 후기' },
    ],
  },
  {
    value: '의정활동',
    label: '의정활동 보고',
    subCategories: [
      // ✅ 백엔드 activity-report.js에서 확인된 세부 카테고리들
      { value: '국정감사', label: '국정감사' },
      { value: '법안발의', label: '법안발의' },
      { value: '위원회활동', label: '위원회활동' },
    ],
  },
  {
    value: '시사논평',
    label: '시사 논평/이슈 대응',
    subCategories: [
      // ✅ 백엔드 current-affairs.js와 100% 일치 확인됨
      { value: '논평', label: '논평' },
      { value: '성명서', label: '성명서' },
      { value: '가짜뉴스반박', label: '가짜뉴스 반박' },
      { value: '입장문', label: '입장문' },
      { value: '발표문', label: '발표문' },
      { value: '건의문', label: '건의문' },
    ],
  },
  {
    value: '지역현안',
    label: '지역 현안/활동',
    subCategories: [
      // ✅ 백엔드 local-issues.js에서 실제로 지원하는 세부 카테고리들
      { value: '현장방문', label: '현장 방문' },
      { value: '주민간담회', label: '주민 간담회' },
      { value: '지역현안', label: '지역 현안 해결' },
      { value: '상권점검', label: '상권 점검' },
      { value: '민원해결', label: '민원 해결' },
      { value: '지역행사', label: '지역 행사 참석' },
      { value: '봉사활동', label: '봉사 활동' },
    ],
  },
  {
    value: '정책제안',
    label: '정책 제안',
    // ✅ 백엔드 policy-proposal.js 기능 활성화를 위해 세부 카테고리 추가
    subCategories: [
        { value: '신규정책', label: '신규 정책 제안' },
        { value: '기존정책개선', label: '기존 정책 개선' },
        { value: '정책비전', label: '정책 비전 발표' },
    ],
  },
  {
    value: '선거공약',
    label: '선거 공약',
    // ✅ 백엔드 campaign-pledge.js 기능 활성화를 위해 세부 카테고리 추가
    subCategories: [
        { value: '핵심공약', label: '핵심 공약 발표' },
        { value: '분야별공약', label: '분야별 공약 (경제, 복지 등)' },
        { value: '지역맞춤공약', label: '지역 맞춤 공약' },
        { value: '미래비전', label: '미래 비전 공약' },
    ],
  },
];

export const KEYWORD_SUGGESTIONS = [
  '민생안정', '경제활성화', '부동산문제', '청년일자리', '저출생고령화',
  '기후위기', '에너지전환', '디지털혁신', '교육개혁', '의료개혁',
  '검찰개혁', '정치개혁', '한반도평화', '외교안보', '지역균형발전',

  // 지역 현안 관련 키워드 추가
  '현장방문', '주민소통', '상권활성화', '민원해결', '지역발전',
  '인프라개선', '교통편의', '안전대책', '환경개선', '문화시설',
];