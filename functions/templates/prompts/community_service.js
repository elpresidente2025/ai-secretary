// functions/templates/prompts/community_service.js

/**
 * '봉사활동' 스타일의 프롬프트를 생성합니다.
 * 이 프롬프트는 '참여 동기 -> 활동 내용/느낀 점 -> 의미 부여/약속'의 3단계 구조를 따릅니다.
 *
 * @param {object} data - 프롬프트 생성에 필요한 데이터 객체.
 * @param {string} data.prompt - 사용자가 입력한 핵심 내용 (예: "OO 보육원 아이들과 함께한 하루").
 * @param {string} data.activity - 구체적인 봉사활동 내용 (예: "아이들 눈높이에 맞춰 책 읽어주기, 시설 환경미화").
 * @param {string} data.feeling - 활동하며 느낀 점 (예: "아이들의 해맑은 웃음 속에서 오히려 제가 더 큰 에너지를 얻었습니다").
 * @param {string} data.message - 봉사활동의 의미와 향후 다짐 (예: "모든 아이들이 차별 없이 꿈을 키울 수 있는 환경을 만드는 데 힘쓰겠습니다").
 * @param {object} data.userProfile - 사용자 프로필 객체.
 * @returns {string} Gemini API에 전달될 완성된 프롬프트 문자열.
 */
function createCommunityServicePrompt(data) {
  const { prompt, activity, feeling, message, userProfile } = data;
  const name = userProfile.name || '후보자';
  const position = userProfile.position || '정치인';
  const region = [userProfile.regionMetro, userProfile.regionLocal].filter(Boolean).join(' ');

  return `
# AI 비서관 - 블로그 원고 생성 (봉사활동 스타일)

당신은 대한민국 ${region} 지역에서 활동하는 ${position} '${name}'의 블로그 글을 작성하는 AI 비서관입니다.
아래의 지침과 정보를 바탕으로, 지역 사회에 대한 헌신과 진정성을 보여주는 봉사활동 후기 글을 작성해주세요.

## 1. 작성 정보

-   **핵심 주제**: ${prompt}
-   **주요 활동**: ${activity}
-   **느낀 점**: ${feeling}
-   **의미와 다짐**: ${message}

## 2. 글쓰기 지침

### 1단계: 참여 동기와 배경 - "따뜻한 마음을 나누고 싶었습니다."
-   봉사활동에 참여하게 된 계기나 동기를 진솔하게 밝히며 글을 시작합니다.
-   '보여주기식'이 아닌, 진심에서 우러나온 활동임을 강조합니다.

### 2단계: 구체적인 활동 내용과 느낀 점 - "함께 땀 흘리며 많은 것을 느꼈습니다."
-   '${activity}'를 구체적으로 묘사하여 현장감을 전달합니다.
-   활동을 하면서 느꼈던 '${feeling}'을 솔직하게 공유하며 인간적인 면모를 보여줍니다. (예: "서툰 솜씨였지만, 함께 벽을 칠하며 공동체의 의미를 되새길 수 있었습니다.")

### 3단계: 의미 부여와 약속 - "더불어 사는 따뜻한 공동체를 만들겠습니다."
-   이번 봉사활동이 자신에게 어떤 의미였는지 설명하고, 이를 '${message}'와 같은 더 큰 사회적 다짐으로 연결합니다.
-   일회성 이벤트가 아닌, 지속적인 관심과 실천을 약속하며 글을 마무리합니다.

### 3. 최종 결과물 형식

-   **어조**: 진정성 있고, 따뜻하며, 겸손한 태도를 보일 것.
-   **분량**: 800자 내외
-   **출력**: 아래 JSON 형식에 맞춰 제목과 HTML 형식의 본문을 생성해주세요.

\`\`\`json
{
  "title": "'${prompt}', 함께 땀 흘리는 보람을 느꼈습니다.",
  "content": "<h3>[1단계: 참여 동기 소제목]</h3><p>[1단계: 참여 동기 내용]</p><h4>[2단계: 활동 내용/느낀 점 소제목]</h4><p>[2단계: 활동 내용/느낀 점 내용]</p><h5>[3단계: 의미 부여/약속 소제목]</h5><p>[3단계: 의미 부여/약속 내용]</p>",
  "wordCount": 800,
  "category": "지역활동",
  "subCategory": "봉사활동",
  "keywords": "${name}, 봉사활동, ${prompt.split(' ')[0]}, 나눔",
  "style": "봉사활동_3단계진심"
}
\`\`\`
  `.trim();
}

module.exports = createCommunityServicePrompt;
