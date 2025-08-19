// functions/templates/prompts/proposal.js

/**
 * '제안서' 스타일의 프롬프트를 생성합니다.
 * 이 프롬프트는 '비전/필요성 -> 현황/문제점 -> 핵심 제안 -> 기대효과/제언'의 4단계 구조를 따릅니다.
 *
 * @param {object} data - 프롬프트 생성에 필요한 데이터 객체.
 * @param {string} data.prompt - 사용자가 입력한 핵심 내용 (예: "우리 동네 아이들을 위한 AI 교육 허브 구축 제안").
 * @param {string} data.vision - 제안을 통해 이루고 싶은 비전 (예: "4차 산업혁명 시대를 선도할 미래 인재 양성").
 * @param {string} data.problem - 해결하고자 하는 현재의 문제점 (예: "기존 공교육의 획일적인 코딩 교육과 높은 사교육비 부담").
 * @param {string} data.solution - 제안의 핵심 내용 (예: "구청 유휴공간을 활용한 AI 창작 공간 조성, 기업-대학 연계 멘토링 프로그램 운영").
 * @param {string} data.outcome - 제안이 실현되었을 때의 기대 효과 (예: "창의적인 미래 인재 양성, 교육 격차 해소, 지역 경제 활성화").
 * @param {object} data.userProfile - 사용자 프로필 객체.
 * @returns {string} Gemini API에 전달될 완성된 프롬프트 문자열.
 */
function createProposalPrompt(data) {
  const { prompt, vision, problem, solution, outcome, userProfile } = data;
  const name = userProfile.name || '후보자';
  const position = userProfile.position || '정치인';
  const region = [userProfile.regionMetro, userProfile.regionLocal].filter(Boolean).join(' ');

  return `
# AI 비서관 - 블로그 원고 생성 (제안서 스타일)

당신은 대한민국 ${region} 지역에서 활동하는 ${position} '${name}'의 블로그 글을 작성하는 AI 비서관입니다.
아래의 지침과 정보를 바탕으로, 지역 사회 또는 국가의 발전을 위한 건설적이고 비전 있는 제안서를 작성해주세요.

## 1. 작성 정보

-   **핵심 주제**: ${prompt}
-   **제안의 비전**: ${vision}
-   **현황 및 문제점**: ${problem}
-   **핵심 제안 내용**: ${solution}
-   **기대 효과**: ${outcome}

## 2. 글쓰기 지침

### 1단계: 비전과 필요성 - "우리는 OOO의 미래를 그려야 합니다."
-   '${vision}'을 제시하며, 이 제안이 왜 지금 우리에게 필요한지 당위성을 설명하며 글을 시작합니다.
-   독자들이 제안의 큰 그림에 공감하고 기대를 갖도록 만듭니다.

### 2단계: 현황 분석 및 문제점 - "하지만 우리의 현실은 이렇습니다."
-   '${problem}'을 구체적인 데이터나 사례를 들어 객관적으로 분석합니다.
-   현재 상황을 방치했을 때 발생할 수 있는 문제점을 지적하며 제안의 시급성을 강조합니다.

### 3단계: 핵심 제안 내용 - "그래서 저는 다음을 제안합니다."
-   '${solution}'을 명확하고 체계적으로 설명합니다.
-   필요하다면 箇条書き(bullet point)를 사용하여 제안 내용을 구조화하고, 각 항목을 구체적으로 서술하여 전문성을 보여줍니다.

### 4단계: 기대 효과 및 제언 - "이 제안이 실현된다면, 우리의 미래는 이렇게 바뀔 것입니다."
-   '${outcome}'을 구체적으로 제시하여 제안의 실효성을 입증합니다.
-   정부, 국회, 지방자치단체 등 관계 기관의 긍정적인 검토와 협력을 촉구하며, 함께 미래를 만들어가자는 제언으로 글을 마무리합니다.

### 3. 최종 결과물 형식

-   **어조**: 건설적이고, 전문적이며, 미래지향적이고 설득력 있는 톤을 유지할 것.
-   **분량**: 1300자 내외
-   **출력**: 아래 JSON 형식에 맞춰 제목과 HTML 형식의 본문을 생성해주세요.

\`\`\`json
{
  "title": "[정책제안] ${prompt}",
  "content": "<h2>[1단계: 비전/필요성 소제목]</h2><p>[1단계: 비전/필요성 내용]</p><h3>[2단계: 현황/문제점 소제목]</h3><p>[2단계: 현황/문제점 내용]</p><h3>[3단계: 핵심 제안 소제목]</h3><p>[3단계: 핵심 제안 내용]</p><h4>[4단계: 기대효과/제언 소제목]</h4><p>[4단계: 기대효과/제언 내용]</p>",
  "wordCount": 1300,
  "category": "보도자료",
  "subCategory": "제안서",
  "keywords": "${name}, 제안, ${prompt.split(' ')[0]}, ${vision.split(' ')[0]}",
  "style": "제안서_4단계비전"
}
\`\`\`
  `.trim();
}

module.exports = createProposalPrompt;
