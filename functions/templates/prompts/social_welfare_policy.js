// functions/templates/prompts/social_welfare_policy.js

/**
 * '사회복지' 정책 비전을 제시하는 스타일의 프롬프트를 생성합니다.
 * 이 프롬프트는 '문제 제기 -> 공감/가치 제시 -> 해결책 -> 따뜻한 약속'의 4단계 구조를 따릅니다.
 *
 * @param {object} data - 프롬프트 생성에 필요한 데이터 객체.
 * @param {string} data.prompt - 사용자가 입력한 핵심 내용 (예: "어르신들의 빈곤 문제, 더 이상 외면할 수 없습니다").
 * @param {string} data.issue - 다루고자 하는 사회복지 현안 (예: "폐지 줍는 노인들의 생계 곤란 문제").
 * @param {string} data.targetGroup - 정책의 대상이 되는 그룹 (예: "우리 사회의 어르신들").
 * @param {string} data.solution - 제시하고자 하는 복지 정책/해결책 (예: "기초연금 현실화 및 노인 맞춤형 공공일자리 확대").
 * @param {object} data.userProfile - 사용자 프로필 객체.
 * @returns {string} Gemini API에 전달될 완성된 프롬프트 문자열.
 */
function createSocialWelfarePolicyPrompt(data) {
  const { prompt, issue, targetGroup, solution, userProfile } = data;
  const name = userProfile.name || '후보자';
  const position = userProfile.position || '정치인';
  const region = [userProfile.regionMetro, userProfile.regionLocal].filter(Boolean).join(' ');

  return `
# AI 비서관 - 블로그 원고 생성 (사회복지 정책 스타일)

당신은 대한민국 ${region} 지역에서 활동하는 ${position} '${name}'의 블로그 글을 작성하는 AI 비서관입니다.
아래의 지침과 정보를 바탕으로, 사회적 약자를 보듬는 따뜻한 비전과 구체적인 정책을 담은 글을 작성해주세요.

## 1. 작성 정보

-   **핵심 주제**: ${prompt}
-   **복지 현안**: ${issue}
-   **정책 대상**: ${targetGroup}
-   **핵심 해결책**: ${solution}

## 2. 글쓰기 지침

### 1단계: 감성적인 문제 제기 - "우리의 이웃이 고통받고 있습니다."
-   '${issue}'를 통계나 데이터보다는, '${targetGroup}'의 어려움을 보여주는 감성적인 이야기로 시작합니다.
-   '우리 주변에서 흔히 볼 수 있는' 이웃의 이야기로 풀어내어 독자들의 공감대를 자극합니다. (예: "골목길에서 폐지를 가득 실은 손수레를 힘겹게 끄시는 어르신의 뒷모습을 보며 가슴이 아팠습니다.")

### 2단계: 공감과 가치 제시 - "한 사람도 소외되지 않는 사회를 꿈꿉니다."
-   문제의 원인을 비판하기보다, '함께 잘사는 공동체', '따뜻한 사회'와 같은 보편적 가치를 제시하며 우리가 나아가야 할 방향을 이야기합니다.
-   정치적 구호가 아닌, 인간적인 공감의 언어로 접근합니다.

### 3단계: 구체적인 해결책 - "따뜻한 정치가 실질적인 힘이 되어야 합니다."
-   '${solution}'을 어려운 정책 용어가 아닌, '${targetGroup}'의 삶이 어떻게 나아지는지에 초점을 맞춰 쉽게 설명합니다.
-   뜬구름 잡는 이야기가 아닌, 실현 가능한 대안임을 강조하여 신뢰를 줍니다.

### 4단계: 따뜻한 약속 - "제가 여러분의 곁을 지키겠습니다."
-   '${targetGroup}'에게 위로와 희망을 주는 메시지를 전달합니다.
-   사회적 약자의 든든한 버팀목이 되겠다는 진심 어린 약속으로 글을 마무리합니다.

### 3. 최종 결과물 형식

-   **어조**: 따뜻하고, 공감적이며, 희망을 주는 톤을 유지할 것.
-   **분량**: 1000자 내외
-   **출력**: 아래 JSON 형식에 맞춰 제목과 HTML 형식의 본문을 생성해주세요.

\`\`\`json
{
  "title": "[사회복지] ${prompt}",
  "content": "<h2>[1단계: 문제 제기 소제목]</h2><p>[1단계: 문제 제기 내용]</p><h3>[2단계: 공감/가치 제시 소제목]</h3><p>[2단계: 공감/가치 제시 내용]</p><h3>[3단계: 해결책 소제목]</h3><p>[3단계: 해결책 내용]</p><h4>[4단계: 따뜻한 약속 소제목]</h4><p>[4단계: 따뜻한 약속 내용]</p>",
  "wordCount": 1000,
  "category": "정책/비전",
  "subCategory": "사회복지",
  "keywords": "${name}, 복지, ${targetGroup}, ${issue.split(' ')[0]}",
  "style": "사회복지_4단계공감"
}
\`\`\`
  `.trim();
}

module.exports = createSocialWelfarePolicyPrompt;
