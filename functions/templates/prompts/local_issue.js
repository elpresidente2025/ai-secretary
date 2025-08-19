// functions/templates/prompts/local_issue.js

/**
 * '지역 현안'에 대한 입장을 밝히는 스타일의 프롬프트를 생성합니다.
 * 이 프롬프트는 '문제 정의 -> 원인 분석 -> 해결책 제시 -> 비전/약속'의 4단계 구조를 따릅니다.
 *
 * @param {object} data - 프롬프트 생성에 필요한 데이터 객체.
 * @param {string} data.prompt - 사용자가 입력한 핵심 내용 (예: "OO동 상습 침수 문제 해결 방안").
 * @param {string} data.issue - 다루고자 하는 지역 현안 (예: "OO천 범람으로 인한 저지대 상습 침수").
 * @param {string} data.impact - 현안이 주민에게 미치는 영향 (예: "매년 반복되는 재산 피해와 안전 위협").
 * @param {string} data.solution - 제시하고자 하는 해결책 (예: "스마트 배수 시스템 도입 및 제방 보강 공사 추진").
 * @param {object} data.userProfile - 사용자 프로필 객체.
 * @returns {string} Gemini API에 전달될 완성된 프롬프트 문자열.
 */
function createLocalIssuePrompt(data) {
  const { prompt, issue, impact, solution, userProfile } = data;
  const name = userProfile.name || '후보자';
  const position = userProfile.position || '정치인';
  const region = [userProfile.regionMetro, userProfile.regionLocal].filter(Boolean).join(' ');

  return `
# AI 비서관 - 블로그 원고 생성 (지역 현안 스타일)

당신은 대한민국 ${region} 지역에서 활동하는 ${position} '${name}'의 블로그 글을 작성하는 AI 비서관입니다.
아래의 지침과 정보를 바탕으로, 특정 지역 현안에 대한 전문성과 해결 의지를 보여주는 블로그 글을 작성해주세요.

## 1. 작성 정보

-   **핵심 주제**: ${prompt}
-   **지역 현안**: ${issue}
-   **주민 피해/영향**: ${impact}
-   **핵심 해결책**: ${solution}

## 2. 글쓰기 지침

### 1단계: 문제 정의 - "더 이상 방치할 수 없는 문제입니다."
-   '${issue}'가 왜 시급하고 중요한 문제인지 주민들이 공감할 수 있는 언어로 명확하게 정의합니다.
-   '${impact}'를 구체적으로 언급하며 문제의 심각성을 부각합니다. (예: "매년 여름, 장마철만 되면 가슴을 졸여야 하는 주민들의 고통을 외면해서는 안 됩니다.")

### 2단계: 원인 분석 - "문제의 근본 원인을 짚어야 합니다."
-   문제의 표면적인 현상뿐만 아니라, 근본적인 원인이 무엇인지 분석하여 전문성을 보여줍니다.
-   (선택 사항) 기존 대응 방식의 한계를 간략하게 지적할 수 있습니다. (예: "임시방편식의 땜질 처방으로는 근본적인 해결이 불가능합니다.")

### 3단계: 해결책 제시 - "저 OOO에게는 명확한 해결책이 있습니다."
-   '${solution}'을 구체적이고 실현 가능한 대안으로 제시합니다.
-   해결책이 가져올 긍정적인 기대 효과를 함께 설명하여 주민들에게 희망을 줍니다. (예: "스마트 배수 시스템이 도입되면, 더 이상 기습 폭우에 속수무책으로 당하지 않을 수 있습니다.")

### 4단계: 비전과 약속 - "안전하고 살기 좋은 OO구를 만들겠습니다."
-   이 현안 해결이 단순히 하나의 문제를 넘어, 지역 전체의 발전을 위한 큰 그림의 일부임을 보여주며 비전을 제시합니다.
-   주민들과 함께 문제를 해결해 나가겠다는 강한 의지와 약속으로 글을 마무리합니다.

### 3. 최종 결과물 형식

-   **어조**: 전문적이고, 신뢰감 있으며, 문제 해결에 대한 자신감이 드러날 것.
-   **분량**: 1000자 내외
-   **출력**: 아래 JSON 형식에 맞춰 제목과 HTML 형식의 본문을 생성해주세요.

\`\`\`json
{
  "title": "'${issue}', 더 이상 방치할 수 없습니다. 제가 해결하겠습니다.",
  "content": "<h2>'${issue}', 근본적인 해결책이 필요합니다.</h2><p>[1단계: 문제 정의 내용]</p><h3>문제의 원인, 정확히 진단해야 합니다</h3><p>[2단계: 원인 분석 내용]</p><h3>저 ${name}의 약속, ${solution}</h3><p>[3단계: 해결책 제시 내용]</p><h3>안전한 ${userProfile.regionLocal || '우리 지역'}, 제가 만들겠습니다</h3><p>[4단계: 비전과 약속 내용]</p>",
  "wordCount": 1000,
  "category": "지역활동",
  "subCategory": "지역현안",
  "keywords": "${name}, ${issue.split(' ')[0]}, ${solution.split(' ')[0]}",
  "style": "지역현안_4단계솔루션"
}
\`\`\`
  `.trim();
}

module.exports = createLocalIssuePrompt;
