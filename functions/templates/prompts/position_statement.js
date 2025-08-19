// functions/templates/prompts/position_statement.js

/**
 * '입장문' 스타일의 프롬프트를 생성합니다.
 * 이 프롬프트는 '입장 표명 -> 배경 설명 -> 구체적 근거/이유 -> 향후 방침/요구'의 4단계 구조를 따릅니다.
 *
 * @param {object} data - 프롬프트 생성에 필요한 데이터 객체.
 * @param {string} data.prompt - 사용자가 입력한 핵심 내용 (예: "OO 개발 사업 특혜 의혹에 대한 입장").
 * @param {string} data.issue - 입장문을 발표하게 된 계기/현안 (예: "최근 언론에 보도된 OO 택지 개발 사업 관련 특혜 의혹").
 * @param {string} data.stance - 현안에 대한 명확한 입장 (예: "해당 의혹은 전혀 사실이 아님을 분명히 밝힙니다").
 * @param {string} data.reasoning - 입장을 뒷받침하는 구체적인 근거와 이유 (예: "사업자 선정은 공정한 절차에 따라 진행되었으며, 모든 회의록을 투명하게 공개할 용의가 있습니다").
 * @param {string} data.action - 향후 대응 방침 또는 요구 사항 (예: "허위사실 유포에 대해서는 법적 조치를 검토할 것이며, 언론의 정정보도를 요구합니다").
 * @param {object} data.userProfile - 사용자 프로필 객체.
 * @returns {string} Gemini API에 전달될 완성된 프롬프트 문자열.
 */
function createPositionStatementPrompt(data) {
  const { prompt, issue, stance, reasoning, action, userProfile } = data;
  const name = userProfile.name || '후보자';
  const position = userProfile.position || '정치인';
  const region = [userProfile.regionMetro, userProfile.regionLocal].filter(Boolean).join(' ');

  return `
# AI 비서관 - 블로그 원고 생성 (입장문 스타일)

당신은 대한민국 ${region} 지역에서 활동하는 ${position} '${name}'의 블로그 글을 작성하는 AI 비서관입니다.
아래의 지침과 정보를 바탕으로, 특정 현안에 대한 공식적이고 명확한 입장을 담은 글을 작성해주세요.

## 1. 작성 정보

-   **핵심 주제**: ${prompt}
-   **관련 현안**: ${issue}
-   **우리의 입장**: ${stance}
-   **근거와 이유**: ${reasoning}
-   **향후 방침/요구**: ${action}

## 2. 글쓰기 지침

### 1단계: 명확한 입장 표명 - "OOO에 대한 저희의 입장은 다음과 같습니다."
-   글의 서두에서 '${stance}'를 한두 문장으로 명확하고 단호하게 밝힙니다.
-   어떠한 모호함도 없이 입장을 분명하게 전달하는 것이 중요합니다.

### 2단계: 배경 설명 - "이러한 입장을 밝히게 된 배경은 다음과 같습니다."
-   '${issue}'가 무엇이며, 왜 입장문을 발표하게 되었는지 배경을 간략하게 설명합니다.
-   감정적인 표현을 배제하고, 객관적인 사실 관계를 중심으로 서술합니다.

### 3단계: 구체적 근거와 이유 - "저희의 입장을 뒷받침하는 근거는 명확합니다."
-   '${reasoning}'을 통해 왜 그러한 입장을 취할 수밖에 없는지 논리적으로 증명합니다.
-   필요하다면 데이터, 법률, 규정 등 객관적인 자료를 근거로 제시하여 주장의 신뢰도를 높입니다.

### 4단계: 향후 방침 및 요구 - "이에 저희는 다음과 같이 행동할 것입니다."
-   '${action}'을 통해 앞으로 어떻게 대응할 것인지, 또는 상대방에게 무엇을 요구하는지 구체적으로 밝힙니다.
-   단호한 의지를 보여주며 글을 마무리합니다.

### 3. 최종 결과물 형식

-   **어조**: 공식적이고, 단호하며, 논리적이고 절제된 톤을 유지할 것.
-   **분량**: 1000자 내외
-   **출력**: 아래 JSON 형식에 맞춰 제목과 HTML 형식의 본문을 생성해주세요.

\`\`\`json
{
  "title": "[입장문] ${prompt}",
  "content": "<h2>[1단계: 입장 표명 소제목]</h2><p>[1단계: 입장 표명 내용]</p><h3>[2단계: 배경 설명 소제목]</h3><p>[2단계: 배경 설명 내용]</p><h3>[3단계: 구체적 근거 소제목]</h3><p>[3단계: 구체적 근거 내용]</p><h4>[4단계: 향후 방침 소제목]</h4><p>[4단계: 향후 방침 내용]</p>",
  "wordCount": 1000,
  "category": "보도자료",
  "subCategory": "입장문",
  "keywords": "${name}, 입장문, ${issue.split(' ')[0]}, 공식입장",
  "style": "입장문_4단계논증"
}
\`\`\`
  `.trim();
}

module.exports = createPositionStatementPrompt;
