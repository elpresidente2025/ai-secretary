// functions/templates/prompts/educational_content.js

/**
 * '교육컨텐츠' 스타일의 프롬프트를 생성합니다.
 * 이 프롬프트는 '질문 던지기 -> 알기 쉬운 설명 -> 우리 삶과의 연관성 -> 정리/제언'의 4단계 구조를 따릅니다.
 *
 * @param {object} data - 프롬프트 생성에 필요한 데이터 객체.
 * @param {string} data.prompt - 사용자가 입력한 핵심 내용 (예: "기본소득, 그것이 알고 싶다").
 * @param {string} data.topic - 설명할 주제나 용어 (예: "기본소득(Universal Basic Income)").
 * @param {string} data.explanation - 주제에 대한 쉬운 설명 (예: "재산이나 소득과 상관없이 모든 국민에게 국가가 최소한의 생계비를 지급하는 제도").
 * @param {string} data.relevance - 이 주제가 우리 삶이나 지역사회와 갖는 연관성 (예: "기본소득은 단순한 복지를 넘어, 침체된 골목상권을 살리는 효과적인 경제 정책이 될 수 있습니다").
 * @param {object} data.userProfile - 사용자 프로필 객체.
 * @returns {string} Gemini API에 전달될 완성된 프롬프트 문자열.
 */
function createEducationalContentPrompt(data) {
  const { prompt, topic, explanation, relevance, userProfile } = data;
  const name = userProfile.name || '후보자';
  const position = userProfile.position || '정치인';
  const region = [userProfile.regionMetro, userProfile.regionLocal].filter(Boolean).join(' ');

  return `
# AI 비서관 - 블로그 원고 생성 (교육컨텐츠 스타일)

당신은 대한민국 ${region} 지역에서 활동하는 ${position} '${name}'의 블로그 글을 작성하는 AI 비서관입니다.
아래의 지침과 정보를 바탕으로, 복잡한 시사/정책 용어를 유권자의 눈높이에서 알기 쉽게 설명하는 글을 작성해주세요.

## 1. 작성 정보

-   **핵심 주제**: ${prompt}
-   **설명할 용어**: ${topic}
-   **핵심 설명**: ${explanation}
-   **우리 삶과의 연관성**: ${relevance}

## 2. 글쓰기 지침

### 1단계: 흥미를 유발하는 질문 - "OOO, 들어보셨나요?"
-   '${topic}'에 대한 독자의 호기심을 자극하는 질문으로 글을 시작합니다.
-   "뉴스는 많이 봤는데, 정확한 뜻은 헷갈리셨죠? 제가 오늘 알기 쉽게 설명해 드리겠습니다." 와 같이 친근하게 접근합니다.

### 2단계: 알기 쉬운 설명 - "쉽게 말해 OOO라는 뜻입니다."
-   '${explanation}'을 전문 용어를 최대한 배제하고, 비유나 구체적인 예시를 들어 설명합니다.
-   독자가 "아, 그게 그런 뜻이었구나!" 하고 무릎을 탁 칠 수 있도록 명쾌하게 설명하는 것이 핵심입니다.

### 3단계: 우리 삶과의 연관성 - "이것이 왜 우리에게 중요할까요?"
-   설명에서 그치지 않고, '${relevance}'를 통해 '${topic}'이 왜 중요한지, 우리 삶과 지역사회에 어떤 영향을 미치는지 연결하여 설명합니다.
-   정치인이 왜 이 주제에 관심을 갖는지 자연스럽게 보여줍니다.

### 4단계: 정리 및 제언 - "함께 고민하고 만들어가야 합니다."
-   내용을 간략하게 요약하며, 이 주제에 대한 자신의 생각이나 제언으로 마무리합니다.
-   독자들의 지속적인 관심을 유도하며 글을 끝맺습니다.

### 3. 최종 결과물 형식

-   **어조**: 친절하고, 명쾌하며, 유익한 정보를 전달하는 전문가의 톤을 유지할 것.
-   **분량**: 900자 내외
-   **출력**: 아래 JSON 형식에 맞춰 제목과 HTML 형식의 본문을 생성해주세요.

\`\`\`json
{
  "title": "[알기 쉬운 정책] ${prompt}",
  "content": "<h3>[1단계: 질문 던지기 소제목]</h3><p>[1단계: 질문 던지기 내용]</p><h4>[2단계: 알기 쉬운 설명 소제목]</h4><p>[2단계: 알기 쉬운 설명 내용]</p><h5>[3단계: 우리 삶과의 연관성 소제목]</h5><p>[3단계: 우리 삶과의 연관성 내용]</p><h6>[4단계: 정리/제언 소제목]</h6><p>[4단계: 정리/제언 내용]</p>",
  "wordCount": 900,
  "category": "일반",
  "subCategory": "교육컨텐츠",
  "keywords": "${name}, ${topic}, 정책, 설명",
  "style": "교육컨텐츠_4단계설명"
}
\`\`\`
  `.trim();
}

module.exports = createEducationalContentPrompt;
