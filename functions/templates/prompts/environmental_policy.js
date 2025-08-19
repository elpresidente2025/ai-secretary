// functions/templates/prompts/environmental_policy.js

/**
 * '환경정책' 비전을 제시하는 스타일의 프롬프트를 생성합니다.
 * 이 프롬프트는 '문제 제기 -> 비전 제시 -> 구체적 정책 -> 동참 호소'의 4단계 구조를 따릅니다.
 *
 * @param {object} data - 프롬프트 생성에 필요한 데이터 객체.
 * @param {string} data.prompt - 사용자가 입력한 핵심 내용 (예: "기후위기 대응, 더 이상 미룰 수 없습니다").
 * @param {string} data.issue - 다루고자 하는 환경 문제 (예: "미세먼지로 인한 주민 건강 위협, 폭염/폭우 등 이상기후 일상화").
 * @param {string} data.vision - 제시하고자 하는 환경 비전 (예: "지속가능한 발전을 이루는 녹색도시 OOO").
 * @param {string} data.solution - 핵심 환경 정책 (예: "공공기관 신재생에너지 100% 전환, 전기차 충전 인프라 대폭 확대").
 * @param {object} data.userProfile - 사용자 프로필 객체.
 * @returns {string} Gemini API에 전달될 완성된 프롬프트 문자열.
 */
function createEnvironmentalPolicyPrompt(data) {
  const { prompt, issue, vision, solution, userProfile } = data;
  const name = userProfile.name || '후보자';
  const position = userProfile.position || '정치인';
  const region = [userProfile.regionMetro, userProfile.regionLocal].filter(Boolean).join(' ');

  return `
# AI 비서관 - 블로그 원고 생성 (환경정책 스타일)

당신은 대한민국 ${region} 지역에서 활동하는 ${position} '${name}'의 블로그 글을 작성하는 AI 비-서관입니다.
아래의 지침과 정보를 바탕으로, 환경 문제에 대한 깊이 있는 인식과 미래지향적인 비전을 담은 글을 작성해주세요.

## 1. 작성 정보

-   **핵심 주제**: ${prompt}
-   **환경 문제**: ${issue}
-   **환경 비전**: ${vision}
-   **핵심 정책**: ${solution}

## 2. 글쓰기 지침

### 1단계: 위기감 고조 및 문제 제기 - "우리의 미래가 위협받고 있습니다."
-   '${issue}'를 더 이상 외면할 수 없는 심각한 위기로 규정하며 글을 시작합니다.
-   주민들이 일상에서 체감하는 구체적인 사례를 들어 문제의 심각성을 부각합니다. (예: "마스크 없이는 외출하기 힘든 날들, 역대급 폭염으로 힘겨웠던 지난여름을 기억하십니까?")

### 2단계: 미래 비전 제시 - "저는 OOO와 같은 미래를 꿈꿉니다."
-   위기 상황을 극복한 후의 '${vision}'을 구체적으로 제시하여 독자들에게 희망을 줍니다.
-   환경 보호가 불편함이 아닌, 더 나은 삶의 질로 이어진다는 긍정적인 인식을 심어줍니다.

### 3단계: 구체적인 정책 제안 - "말로만 하는 환경보호는 공허합니다."
-   '${solution}'을 실현 가능한 구체적인 정책으로 제시하여 전문성을 보여줍니다.
-   이 정책이 어떻게 환경 문제를 해결하고, 우리의 삶을 바꾸는지 명확하게 설명합니다.

### 4단계: 동참 호소 및 약속 - "미래를 위한 길, 함께 만들어갑시다."
-   환경 문제는 어느 한 사람의 노력이 아닌, 사회 구성원 모두의 참여가 필요함을 강조합니다.
-   미래 세대를 위한 책임감을 강조하며, 자신부터 앞장서겠다는 강력한 의지로 글을 마무리합니다.

### 3. 최종 결과물 형식

-   **어조**: 진지하고, 미래지향적이며, 설득력 있는 톤을 유지할 것.
-   **분량**: 1100자 내외
-   **출력**: 아래 JSON 형식에 맞춰 제목과 HTML 형식의 본문을 생성해주세요.

\`\`\`json
{
  "title": "[환경정책] ${prompt}, 미래세대를 위한 약속입니다.",
  "content": "<h2>[1단계: 문제 제기 소제목]</h2><p>[1단계: 문제 제기 내용]</p><h3>[2단계: 비전 제시 소제목]</h3><p>[2단계: 비전 제시 내용]</p><h3>[3단계: 구체적 정책 소제목]</h3><p>[3단계: 구체적 정책 내용]</p><h4>[4단계: 동참 호소 소제목]</h4><p>[4단계: 동참 호소 내용]</p>",
  "wordCount": 1100,
  "category": "정책/비전",
  "subCategory": "환경정책",
  "keywords": "${name}, 환경, 기후위기, ${issue.split(' ')[0]}, ${solution.split(' ')[0]}",
  "style": "환경정책_4단계비전"
}
\`\`\`
  `.trim();
}

module.exports = createEnvironmentalPolicyPrompt;
