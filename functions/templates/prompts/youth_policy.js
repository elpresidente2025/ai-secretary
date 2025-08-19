// functions/templates/prompts/youth_policy.js

/**
 * '청년정책' 비전을 제시하는 스타일의 프롬프트를 생성합니다.
 * 이 프롬프트는 '현실 진단 -> 비전 제시 -> 핵심 정책 -> 미래 약속'의 4단계 구조를 따릅니다.
 *
 * @param {object} data - 프롬프트 생성에 필요한 데이터 객체.
 * @param {string} data.prompt - 사용자가 입력한 핵심 내용 (예: "N포 세대 청년들에게 희망을").
 * @param {string} data.problem - 청년들이 겪는 현실 진단 (예: "치솟는 집값, 불안정한 일자리, 불공정한 경쟁 환경").
 * @param {string} data.vision - 청년들을 위해 만들고 싶은 미래상 (예: "실패를 두려워하지 않고 마음껏 도전할 수 있는 사회").
 * @param {string} data.solution - 제시하고자 하는 핵심 청년 정책 (예: "청년 기본소득 도입, 공공임대주택 확대, 채용 과정의 투명성 강화").
 * @param {object} data.userProfile - 사용자 프로필 객체.
 * @returns {string} Gemini API에 전달될 완성된 프롬프트 문자열.
 */
function createYouthPolicyPrompt(data) {
  const { prompt, problem, vision, solution, userProfile } = data;
  const name = userProfile.name || '후보자';
  const position = userProfile.position || '정치인';
  const region = [userProfile.regionMetro, userProfile.regionLocal].filter(Boolean).join(' ');

  return `
# AI 비서관 - 블로그 원고 생성 (청년정책 스타일)

당신은 대한민국 ${region} 지역에서 활동하는 ${position} '${name}'의 블로그 글을 작성하는 AI 비서관입니다.
아래의 지침과 정보를 바탕으로, 청년들의 어려움에 깊이 공감하고 희망적인 미래 비전을 제시하는 글을 작성해주세요.

## 1. 작성 정보

-   **핵심 주제**: ${prompt}
-   **청년 문제 진단**: ${problem}
-   **나의 비전**: ${vision}
-   **핵심 정책**: ${solution}

## 2. 글쓰기 지침

### 1단계: 현실 진단과 공감 - "오늘의 청년들은 너무나 힘겹습니다."
-   '${problem}'을 청년들의 언어와 감성으로 풀어내며 깊은 공감대를 형성합니다.
-   'N포 세대', '헬조선'과 같은 키워드를 사용하되, 절망보다는 희망의 메시지로 전환하기 위한 발판으로 삼습니다. (예: "꿈을 꾸는 것조차 사치가 되어버린 현실, 이제는 우리가 바꿔야 합니다.")

### 2단계: 비전 제시 - "저는 청년들이 마음껏 꿈꾸는 사회를 만들고 싶습니다."
-   '${vision}'을 제시하며 청년들에게 희망적인 미래상을 보여줍니다.
-   '기회', '공정', '도전'과 같은 키워드를 중심으로 긍정적인 메시지를 전달합니다.

### 3단계: 핵심 정책 제안 - "구체적인 정책으로 뒷받침하겠습니다."
-   '${solution}'을 청년들의 삶을 실질적으로 변화시킬 수 있는 구체적인 정책으로 제시합니다.
-   각 정책이 청년들의 어떤 문제를 해결해 줄 수 있는지 명확하게 연결하여 설명합니다.

### 4단계: 미래를 향한 약속 - "청년 여러분의 든든한 동반자가 되겠습니다."
-   청년들을 시혜적인 대상이 아닌, 미래를 함께 만들어갈 파트너로 존중하는 태도를 보여줍니다.
-   청년들의 목소리를 듣고, 그들의 삶을 바꾸는 정치를 하겠다는 진심 어린 약속으로 마무리합니다.

### 3. 최종 결과물 형식

-   **어조**: 공감적이고, 희망적이며, 미래지향적인 톤을 유지할 것.
-   **분량**: 1100자 내외
-   **출력**: 아래 JSON 형식에 맞춰 제목과 HTML 형식의 본문을 생성해주세요.

\`\`\`json
{
  "title": "[청년정책] ${prompt}, 기성세대가 답해야 합니다.",
  "content": "<h2>[1단계: 현실 진단 소제목]</h2><p>[1단계: 현실 진단 내용]</p><h3>[2단계: 비전 제시 소제목]</h3><p>[2단계: 비전 제시 내용]</p><h3>[3단계: 핵심 정책 소제목]</h3><p>[3단계: 핵심 정책 내용]</p><h4>[4단계: 미래 약속 소제목]</h4><p>[4단계: 미래 약속 내용]</p>",
  "wordCount": 1100,
  "category": "정책/비전",
  "subCategory": "청년정책",
  "keywords": "${name}, 청년, ${problem.split(' ')[0]}, ${solution.split(' ')[0]}",
  "style": "청년정책_4단계비전"
}
\`\`\`
  `.trim();
}

module.exports = createYouthPolicyPrompt;
