// templates/prompts.js - AI 프롬프트 템플릿 관리

/**
 * 정치인 블로그 원고 생성 프롬프트 템플릿
 * @param {Object} params - 프롬프트 매개변수
 * @param {string} params.authorName - 작성자 이름
 * @param {string} params.authorPosition - 작성자 직책
 * @param {string} params.topic - 주제
 * @param {string} params.category - 카테고리
 * @param {string} params.subCategory - 세부카테고리
 * @param {string} params.keywords - 키워드
 * @returns {string} 완성된 프롬프트
 */
const generatePostPrompt = ({
  authorName = '정치인',
  authorPosition = '의원',
  topic,
  category,
  subCategory = '없음',
  keywords = '없음'
}) => `정치인 블로그용 원고 1개를 작성해주세요.

작성자: ${authorName} (${authorPosition})
주제: ${topic}
카테고리: ${category}
세부카테고리: ${subCategory}
키워드: ${keywords}

**중요: 반드시 1개의 원고만 작성하세요. 여러 버전을 만들지 마세요.**

다음 JSON 형식으로 응답해주세요:
{
  "title": "원고 제목",
  "content": "<p>HTML 형식의 원고 내용</p>",
  "wordCount": 1200
}

요구사항:
- 1000-1500자 분량
- HTML 형식으로 작성 (<p>, <strong> 등 사용)
- 진중하고 신뢰감 있는 톤
- 지역 주민과의 소통을 중시하는 내용
- 구체적인 정책이나 활동 내용 포함`;

/**
 * AI 테스트용 간단한 프롬프트
 * @returns {string} 테스트 프롬프트
 */
const testPrompt = () => "안녕하세요라고 간단히 인사해주세요.";

/**
 * 프롬프트 템플릿 모음 - 향후 확장용
 */
const prompts = {
  // 카테고리별 특화 프롬프트들 (향후 추가 예정)
  
  /**
   * 의정활동 보고서 전용 프롬프트
   * @param {Object} params 
   * @returns {string}
   */
  activityReport: (params) => generatePostPrompt({
    ...params,
    category: '의정활동 보고',
    // 의정활동에 특화된 추가 지침들 추가 가능
  }),

  /**
   * 지역 현안 논평 전용 프롬프트  
   * @param {Object} params
   * @returns {string}
   */
  localIssue: (params) => generatePostPrompt({
    ...params,
    category: '지역 현안',
    // 지역 현안에 특화된 추가 지침들 추가 가능
  }),

  /**
   * 주민 소통 전용 프롬프트
   * @param {Object} params
   * @returns {string}
   */
  communication: (params) => generatePostPrompt({
    ...params,
    category: '주민 소통',
    // 주민 소통에 특화된 추가 지침들 추가 가능
  }),

  /**
   * 정책 설명 전용 프롬프트
   * @param {Object} params
   * @returns {string}
   */
  policyExplanation: (params) => generatePostPrompt({
    ...params,
    category: '정책 설명',
    // 정책 설명에 특화된 추가 지침들 추가 가능
  })
};

/**
 * 백업용 기본 원고 템플릿
 * @param {string} topic - 주제
 * @param {string} category - 카테고리
 * @returns {Object} 백업 원고 객체
 */
const createFallbackDraft = (topic, category) => ({
  title: `${category}: ${topic}`,
  content: `<p><strong>${topic}</strong>에 대한 ${category} 원고입니다.</p>
<p>현재 상황을 분석하고 정책적 대안을 제시하겠습니다.</p>
<p>주민 여러분의 의견을 적극 수렴하여 더 나은 정책 방향을 모색하겠습니다.</p>
<p>관련 부처와의 협의를 통해 효과적인 해결방안을 마련하겠습니다.</p>
<p>투명하고 공정한 과정을 통해 국민의 목소리를 반영하겠습니다.</p>`,
  wordCount: 400
});

module.exports = {
  generatePostPrompt,
  testPrompt,
  prompts,
  createFallbackDraft
};