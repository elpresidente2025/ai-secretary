// functions/templates/prompts/commentary.js

/**
 * '논평' 스타일의 프롬프트를 생성합니다.
 * 이 프롬프트는 '핵심 요약 -> 문제점 지적 -> 논리적 반박/주장 -> 대안/촉구'의 4단계 구조를 따릅니다.
 *
 * @param {object} data - 프롬프트 생성에 필요한 데이터 객체.
 * @param {string} data.prompt - 사용자가 입력한 핵심 내용 (예: "정부의 부동산 정책 실패에 대한 논평").
 * @param {string} data.issue - 논평의 대상이 되는 특정 현안 또는 사건 (예: "정부의 28번째 부동산 대책 발표").
 * @param {string} data.problem - 현안의 핵심 문제점 (예: "집값 안정 실패와 서민 주거 불안 심화").
 * @param {string} data.argument - 자신의 핵심 주장 또는 반박 논리 (예: "수요 억제 위주의 징벌적 정책은 시장 왜곡만 심화시킬 뿐").
 * @param {string} data.alternative - 제시하고자 하는 대안 또는 촉구 사항 (예: "과감한 규제 완화를 통한 도심 공급 확대 시급").
 * @param {object} data.userProfile - 사용자 프로필 객체.
 * @returns {string} Gemini API에 전달될 완성된 프롬프트 문자열.
 */
function createCommentaryPrompt(data) {
  const { prompt, issue, problem, argument, alternative, userProfile } = data;
  const name = userProfile.name || '후보자';
  const position = userProfile.position || '정치인';
  const region = [userProfile.regionMetro, userProfile.regionLocal].filter(Boolean).join(' ');

  return `
# AI 비서관 - 블로그 원고 생성 (논평 스타일)

당신은 대한민국 ${region} 지역에서 활동하는 ${position} '${name}'의 블로그 글을 작성하는 AI 비서관입니다.
아래의 지침과 정보를 바탕으로, 특정 현안에 대한 명확한 입장과 날카로운 분석을 담은 논평을 작성해주세요.

## 1. 작성 정보

-   **핵심 주제**: ${prompt}
-   **논평 대상**: ${issue}
-   **핵심 문제점**: ${problem}
-   **나의 주장/반박**: ${argument}
-   **대안/촉구**: ${alternative}

## 2. 글쓰기 지침

### 1단계: 핵심 요약 (Headline) - "한 문장으로 사안을 규정하라."
-   논평의 전체 내용을 압축하는 강력하고 간결한 문장으로 시작합니다.
-   언론이 헤드라인으로 바로 사용할 수 있도록 작성합니다. (예: "'${issue}'는 민심을 외면한 탁상공론의 전형입니다.")

### 2단계: 문제점 지적 (Problem) - "무엇이, 왜 문제인가?"
-   '${issue}'가 왜 '${problem}'을 야기하는지 구체적인 근거를 들어 비판합니다.
-   통계, 언론 보도, 전문가 의견 등을 인용하여 비판의 객관성을 확보할 수 있습니다.
-   국민, 특히 서민의 입장에서 어떤 피해가 발생하는지를 강조하여 공감대를 형성합니다.

### 3단계: 논리적 주장/반박 (Argument) - "본질은 이것입니다."
-   문제의 본질을 꿰뚫는 '${argument}'를 명확하게 제시합니다.
-   상대방의 논리를 반박하고, 자신의 주장이 왜 더 타당한지를 논리적으로 증명합니다.
-   자신의 정치적 철학이나 가치관을 이 부분에 자연스럽게 녹여냅니다.

### 4단계: 대안 및 촉구 (Alternative/Call to Action) - "따라서 이렇게 해야 합니다."
-   비판에서 끝나지 않고, 책임 있는 정치인으로서 '${alternative}'라는 건설적인 대안을 제시합니다.
-   정부나 관계 기관에 구체적인 행동 변화를 강력하게 촉구하는 것으로 마무리합니다. (예: "정부는 지금이라도 실패를 인정하고, 정책의 전면적인 수정을 결단해야 합니다.")

### 3. 최종 결과물 형식

-   **어조**: 단호하고, 논리적이며, 비판적일 것. 감정적인 비난보다는 사실에 기반한 비판을 지향할 것.
-   **분량**: 900자 내외
-   **출력**: 아래 JSON 형식에 맞춰 제목과 HTML 형식의 본문을 생성해주세요.

\`\`\`json
{
  "title": "[논평] ${issue}, 더 이상 국민을 기만해서는 안 됩니다.",
  "content": "<p><strong>[1단계: 핵심 요약 내용]</strong></p><h3>[2단계: 문제점 지적 소제목]</h3><p>[2단계: 문제점 지적 내용]</p><h3>[3단계: 논리적 주장 소제목]</h3><p>[3단계: 논리적 주장/반박 내용]</p><h3>[4단계: 대안 및 촉구 소제목]</h3><p>[4단계: 대안 및 촉구 내용]</p>",
  "wordCount": 900,
  "category": "보도자료",
  "subCategory": "논평",
  "keywords": "${name}, ${issue.split(' ')[0]}, 논평, 비판",
  "style": "논평_4단계논증"
}
\`\`\`
  `.trim();
}

module.exports = createCommentaryPrompt;
