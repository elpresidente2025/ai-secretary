// functions/templates/prompts/official_statement.js

/**
 * '성명서' 스타일의 프롬프트를 생성합니다.
 * 이 프롬프트는 '사안 규정 -> 강력 규탄 -> 정당성/대의명분 -> 강력 촉구'의 4단계 구조를 따릅니다.
 *
 * @param {object} data - 프롬프트 생성에 필요한 데이터 객체.
 * @param {string} data.prompt - 사용자가 입력한 핵심 내용 (예: "정부의 언론탄압 시도, 민주주의에 대한 정면도전").
 * @param {string} data.issue - 성명서의 대상이 되는 중대 사안 (예: "정부의 공영방송 이사 강제 해임 시도").
 * @param {string} data.stance - 사안에 대한 강력한 입장 및 규정 (예: "이는 명백한 언론장악 시도이자 민주주의의 근간을 흔드는 폭거").
 * @param {string} data.justification - 우리의 주장이 정당한 이유, 대의명분 (예: "언론의 자유는 헌법이 보장하는 최후의 보루이자 국민의 알 권리를 지키는 심장").
 * @param {string} data.demand - 강력하게 촉구하는 사항 (예: "정부는 언론장악 시도를 즉각 중단하고, 국민 앞에 사죄하라!").
 * @param {object} data.userProfile - 사용자 프로필 객체.
 * @returns {string} Gemini API에 전달될 완성된 프롬프트 문자열.
 */
function createOfficialStatementPrompt(data) {
  const { prompt, issue, stance, justification, demand, userProfile } = data;
  const name = userProfile.name || '후보자';
  const position = userProfile.position || '정치인';
  const region = [userProfile.regionMetro, userProfile.regionLocal].filter(Boolean).join(' ');

  return `
# AI 비서관 - 블로그 원고 생성 (성명서 스타일)

당신은 대한민국 ${region} 지역에서 활동하는 ${position} '${name}'의 블로그 글을 작성하는 AI 비서관입니다.
아래의 지침과 정보를 바탕으로, 중대 사안에 대한 단호하고 결연한 의지를 담은 성명서를 작성해주세요.

## 1. 작성 정보

-   **핵심 주제**: ${prompt}
-   **관련 사안**: ${issue}
-   **우리의 입장**: ${stance}
-   **정당성/대의명분**: ${justification}
-   **촉구 사항**: ${demand}

## 2. 글쓰기 지침

### 1단계: 사안 규정 - "이것은 OOO이다."
-   '${issue}'를 '${stance}'와 같이 한 문장으로 강력하게 규정하며 시작합니다.
-   "오늘 우리는 참담한 심정으로 이 자리에 섰습니다." 와 같이 비장한 어조를 사용하여 사안의 심각성을 강조합니다.

### 2단계: 강력 규탄 - "우리는 이를 강력히 규탄한다."
-   사안의 부당성과 문제점을 조목조목 비판하며 강력하게 규탄합니다.
-   '민주주의의 후퇴', '역사의 퇴행' 등 가치 지향적인 언어를 사용하여 비판의 강도를 높입니다.

### 3단계: 정당성 및 대의명분 - "우리의 싸움은 정당합니다."
-   '${justification}'을 통해 우리의 주장이 사적인 이익이 아닌, 국민과 민주주의를 위한 것임을 강조합니다.
-   헌법, 역사, 국민의 뜻 등을 근거로 들어 우리의 행동에 정당성을 부여합니다.

### 4단계: 강력 촉구 - "즉각 OOO하라!"
-   '${demand}'를 간결하고 힘 있는 문장으로 제시합니다.
-   "~해 주십시오"와 같은 요청이 아닌, "~하라!"는 식의 강력한 명령형 어조를 사용하여 결연한 의지를 보여줍니다.
-   "만약 우리의 요구가 받아들여지지 않는다면, 국민과 함께 더 큰 저항에 직면할 것임을 엄중히 경고한다." 와 같이 경고성 메시지를 포함할 수 있습니다.

### 3. 최종 결과물 형식

-   **어조**: 매우 단호하고, 결연하며, 비장하고, 강력한 톤을 유지할 것.
-   **분량**: 1000자 내외
-   **출력**: 아래 JSON 형식에 맞춰 제목과 HTML 형식의 본문을 생성해주세요.

\`\`\`json
{
  "title": "[성명서] ${prompt}",
  "content": "<h2>[1단계: 사안 규정 소제목]</h2><p>[1단계: 사안 규정 내용]</p><h3>[2단계: 강력 규탄 소제목]</h3><p>[2단계: 강력 규탄 내용]</p><h3>[3단계: 정당성/대의명분 소제목]</h3><p>[3단계: 정당성/대의명분 내용]</p><h4>[4단계: 강력 촉구 소제목]</h4><p>[4단계: 강력 촉구 내용]</p>",
  "wordCount": 1000,
  "category": "보도자료",
  "subCategory": "성명서",
  "keywords": "${name}, 성명서, 규탄, ${issue.split(' ')[0]}, 촉구",
  "style": "성명서_4단계촉구"
}
\`\`\`
  `.trim();
}

module.exports = createOfficialStatementPrompt;
