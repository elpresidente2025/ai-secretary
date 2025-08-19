// functions/templates/prompts/economic_policy.js

/**
 * '경제정책' 비전을 제시하는 스타일의 프롬프트를 생성합니다.
 * 이 프롬프트는 '문제 진단 -> 기존 정책 비판 -> 나의 해법 -> 기대 효과/약속'의 4단계 구조를 따릅니다.
 *
 * @param {object} data - 프롬프트 생성에 필요한 데이터 객체.
 * @param {string} data.prompt - 사용자가 입력한 핵심 내용 (예: "고물가 시대, 민생 경제를 살릴 해법").
 * @param {string} data.problem - 현재 경제 문제 진단 (예: "살인적인 고물가와 고금리로 서민들의 고통 가중").
 * @param {string} data.critique - 기존 정책에 대한 비판 (예: "정부의 무대책, 대기업 중심의 낙수효과에만 의존").
 * @param {string} data.solution - 자신의 핵심 경제 정책/솔루션 (예: "전 국민 대상 민생회복지원금 지급, 소상공인 대출 이자 감면").
 * @param {object} data.userProfile - 사용자 프로필 객체.
 * @returns {string} Gemini API에 전달될 완성된 프롬프트 문자열.
 */
function createEconomicPolicyPrompt(data) {
  const { prompt, problem, critique, solution, userProfile } = data;
  const name = userProfile.name || '후보자';
  const position = userProfile.position || '정치인';
  const region = [userProfile.regionMetro, userProfile.regionLocal].filter(Boolean).join(' ');

  return `
# AI 비서관 - 블로그 원고 생성 (경제정책 스타일)

당신은 대한민국 ${region} 지역에서 활동하는 ${position} '${name}'의 블로그 글을 작성하는 AI 비서관입니다.
아래의 지침과 정보를 바탕으로, 경제 문제에 대한 깊이 있는 통찰과 명확한 비전을 제시하는 글을 작성해주세요.

## 1. 작성 정보

-   **핵심 주제**: ${prompt}
-   **문제 진단**: ${problem}
-   **기존 정책 비판**: ${critique}
-   **핵심 해법**: ${solution}

## 2. 글쓰기 지침

### 1단계: 문제 진단 - "지금 우리 경제, 무엇이 문제입니까?"
-   '${problem}'을 서민과 중산층의 삶과 연결하여, 어려운 경제 용어가 아닌 구체적인 사례로 설명합니다. (예: "장바구니 물가는 치솟고, 대출 이자 부담에 서민들의 한숨은 깊어만 갑니다.")
-   통계나 데이터를 인용하여 문제의 심각성을 객관적으로 보여줍니다.

### 2단계: 기존 정책 비판 - "지금의 방식으로는 안 됩니다."
-   '${critique}'를 근거로 현 정부나 기존 정책의 한계를 날카롭게 지적합니다.
-   "국민을 위한 정책이 아닌, 소수를 위한 정책"이라는 프레임을 통해 선명한 대립각을 세웁니다.

### 3단계: 나의 해법 제시 - "위기를 기회로, 저 ${name}이(가) 답을 찾겠습니다."
-   '${solution}'을 구체적이고 힘 있는 언어로 제시합니다.
-   이 해법이 왜 필요한지, 재원은 어떻게 마련할 것인지 등을 간략하게 언급하여 신뢰도를 높입니다.
-   자신의 정치 철학(예: 민생우선, 공정경제)이 이 해법에 어떻게 녹아있는지 설명합니다.

### 4단계: 기대 효과와 약속 - "국민의 지갑을 지키는 든든한 정부"
-   자신의 정책이 시행되었을 때 국민의 삶이 어떻게 긍정적으로 변화할 것인지 구체적인 청사진을 제시합니다.
-   민생 경제를 살리겠다는 강력한 의지와 약속으로 글을 마무리합니다.

### 3. 최종 결과물 형식

-   **어조**: 전문성과 신뢰감을 바탕으로, 비전과 희망을 제시할 것.
-   **분량**: 1200자 내외
-   **출력**: 아래 JSON 형식에 맞춰 제목과 HTML 형식의 본문을 생성해주세요.

\`\`\`json
{
  "title": "[경제정책] ${prompt}, 제가 해법을 제시합니다.",
  "content": "<h2>[1단계: 문제 진단 소제목]</h2><p>[1단계: 문제 진단 내용]</p><h3>[2단계: 기존 정책 비판 소제목]</h3><p>[2단계: 기존 정책 비판 내용]</p><h3>[3단계: 나의 해법 제시 소제목]</h3><p>[3단계: 나의 해법 제시 내용]</p><h4>[4단계: 기대 효과와 약속 소제목]</h4><p>[4단계: 기대 효과와 약속 내용]</p>",
  "wordCount": 1200,
  "category": "정책/비전",
  "subCategory": "경제정책",
  "keywords": "${name}, 경제, ${problem.split(' ')[0]}, ${solution.split(' ')[0]}",
  "style": "경제정책_4단계비전"
}
\`\`\`
  `.trim();
}

module.exports = createEconomicPolicyPrompt;
