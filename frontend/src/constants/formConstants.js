// frontend/src/constants/formConstants.js (최종 수정본)

/**
 * 이 파일은 백엔드 프롬프트 엔진과 완벽하게 동기화됩니다.
 * 각 카테고리의 `value`는 `functions/templates/prompts.js`의 `selectPromptType` 함수와 연결됩니다.
 * 각 세부 카테고리의 `value`는 각 `prompts/*.js` 파일의 `get...Variations` 함수 내 `switch (subCategory)` 케이스와 정확히 일치합니다.
 */
export const CATEGORIES = [
  {
    value: '일반소통',
    label: '일상 소통 (SNS 등)',
    subCategories: [
      { value: '일상', label: '일상 이야기' },
      { value: '인사', label: '아침/저녁 인사' },
      { value: '감사', label: '감사 메시지' },
      { value: '축하', label: '축하/격려 메시지' },
      { value: '위로', label: '위로 메시지' },
      { value: '홍보', label: '정책/공약 홍보' },
    ],
  },
  {
    value: '의정활동',
    label: '의정활동 보고',
    subCategories: [
      { value: '국정감사', label: '국정감사' },
      { value: '법안발의', label: '법안발의' },
      { value: '위원회활동', label: '위원회활동' },
      { value: '질의응답', label: '질의응답' },
      { value: '예산심사', label: '예산심사' },
      { value: '정책토론', label: '정책토론' },
    ],
  },
  {
    value: '시사논평',
    label: '시사 논평/이슈 대응',
    subCategories: [
      { value: '논평', label: '논평' },
      { value: '성명서', label: '성명서' },
      { value: '가짜뉴스반박', label: '가짜뉴스 반박' },
      { value: '입장문', label: '입장문' },
      { value: '발표문', label: '발표문' },
      { value: '건의문', label: '건의문' },
    ],
  },
  {
    value: '정책제안',
    label: '정책 제안',
    // 정책 제안은 현재 백엔드에서 세부 카테고리 구분이 없으므로, UI에서도 표시하지 않습니다.
    subCategories: [],
  },
  {
    value: '선거공약',
    label: '선거 공약',
    // 선거 공약은 현재 백엔드에서 세부 카테고리 구분이 없으므로, UI에서도 표시하지 않습니다.
    subCategories: [],
  },
  {
    value: '지역현안',
    label: '지역 현안/활동',
    // 지역 현안은 현재 백엔드에서 세부 카테고리 구분이 없으므로, UI에서도 표시하지 않습니다.
    subCategories: [],
  },
];

export const KEYWORD_SUGGESTIONS = [
  '민생안정', '경제활성화', '부동산문제', '청년일자리', '저출생고령화',
  '기후위기', '에너지전환', '디지털혁신', '교육개혁', '의료개혁',
  '검찰개혁', '정치개혁', '한반도평화', '외교안보', '지역균형발전',
];