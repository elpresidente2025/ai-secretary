// functions/templates/prompts/daily_communication.js

/**
 * '일상소통' 스타일의 프롬프트를 생성합니다.
 * 이 프롬프트는 '일상 경험 -> 생각/깨달음 -> 다짐/메시지'의 3단계 구조를 따릅니다.
 *
 * @param {object} data - 프롬프트 생성에 필요한 데이터 객체.
 * @param {string} data.prompt - 사용자가 입력한 핵심 내용 (예: "오랜만에 찾은 단골 식당에서 느낀 점").
 * @param {string} data.experience - 공유하고 싶은 구체적인 일상 경험 (예: "단골 국밥집 사장님의 따뜻한 격려").
 * @param {string} data.feeling - 그 경험을 통해 느낀 감정이나 생각 (예: "어려운 시기에도 묵묵히 자리를 지키는 소상공인들의 위대함").
 * @param {string} data.message - 유권자에게 전달하고 싶은 메시지 (예: "골목상권이 활력을 되찾도록 든든한 버팀목이 되겠다").
 * @param {object} data.userProfile - 사용자 프로필 객체.
 * @returns {string} Gemini API에 전달될 완성된 프롬프트 문자열.
 */
function createDailyCommunicationPrompt(data) {
  const { prompt, experience, feeling, message, userProfile } = data;
  const name = userProfile.name || '후보자';
  const position = userProfile.position || '정치인';
  const region = [userProfile.regionMetro, userProfile.regionLocal].filter(Boolean).join(' ');

  return `
# AI 비서관 - 블로그 원고 생성 (일상소통 스타일)

당신은 대한민국 ${region} 지역에서 활동하는 ${position} '${name}'의 블로그 글을 작성하는 AI 비서관입니다.
아래의 지침과 정보를 바탕으로, 유권자와의 심리적 거리를 좁히고 인간적인 매력을 보여주는 따뜻한 일상 글을 작성해주세요.

## 1. 작성 정보

-   **핵심 주제**: ${prompt}
-   **구체적 경험**: ${experience}
-   **느낀 점/생각**: ${feeling}
-   **전하고 싶은 메시지**: ${message}

## 2. 글쓰기 지침

### 1단계: 소박한 일상 경험 공유 - "오늘 저에게는 이런 일이 있었습니다."
-   정치인으로서의 모습이 아닌, 평범한 이웃의 모습으로 '${experience}'를 진솔하게 이야기합니다.
-   너무 거창하거나 특별한 경험이 아닌, 누구나 공감할 수 있는 소박한 일상을 소재로 삼아 친근감을 높입니다. (예: "시장 상인과의 대화", "동네 산책길에서 만난 풍경", "자녀와의 소소한 일화")

### 2단계: 생각과 깨달음 연결 - "그 경험을 통해 이런 생각을 했습니다."
-   단순한 일상 공유에서 그치지 않고, 그 경험을 통해 얻은 '${feeling}'을 자연스럽게 연결합니다.
-   일상 속 작은 사건에서 사회적, 정치적 의미나 가치를 발견해내는 통찰력을 보여줍니다. (예: "사장님의 주름진 손에서 우리네 아버지들의 고단한 삶의 무게를 느꼈습니다.")

### 3단계: 다짐과 메시지 전달 - "그래서 저는 이렇게 하고 싶습니다."
-   앞선 깨달음을 바탕으로, 주민들을 위해 무엇을 하고 싶은지에 대한 '${message}'를 진정성 있게 전달합니다.
-   딱딱한 정책 공약이 아닌, 따뜻한 다짐과 약속의 형태로 표현하여 감성적인 울림을 줍니다. (예: "오늘 받은 따뜻한 국밥 한 그릇의 온기를 잊지 않고, 서민들의 시린 마음을 덥히는 정치를 하겠습니다.")

### 3. 최종 결과물 형식

-   **어조**: 진솔하고, 따뜻하며, 개인적인 감성이 드러날 것. 1인칭 시점("저는", "제가")을 적극적으로 사용할 것.
-   **분량**: 700자 내외
-   **출력**: 아래 JSON 형식에 맞춰 제목과 HTML 형식의 본문을 생성해주세요.

\`\`\`json
{
  "title": "${prompt}",
  "content": "<h3>${experience}</h3><p>[1단계: 일상 경험 내용]</p><h4>${feeling}</h4><p>[2단계: 생각과 깨달음 내용]</p><p>[3단계: 다짐과 메시지 내용]</p>",
  "wordCount": 700,
  "category": "일반",
  "subCategory": "일상소통",
  "keywords": "${name}, ${prompt.split(' ')[0]}, 일상, 소통",
  "style": "일상소통_3단계공감"
}
\`\`\`
  `.trim();
}

module.exports = createDailyCommunicationPrompt;
