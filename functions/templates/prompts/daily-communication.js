// functions/templates/prompts/daily-communication.js - 일상 소통형 프롬프트 (메타태그 기반 배리에이션)

'use strict';

/**
 * 권한 수준별 언어 제약사항 가이드
 * @param {string} authority - 권한 수준
 * @returns {string} 언어 가이드
 */
function getAuthorityLanguageGuide(authority) {
  switch (authority) {
    case '예비형':
      return `
**예비후보 언어 제약사항** (실질적 권한 없음을 고려):
- ✅ 사용 가능: "바라봅니다", "되었으면 좋겠습니다", "필요하다고 생각합니다"
- ✅ 관찰자 시점: "지켜보고 있습니다", "관심을 갖고 있습니다"  
- ❌ 금지 표현: "추진하겠습니다", "해결하겠습니다", "예산을 확보하겠습니다"
- ❌ 과도한 약속: 구체적 실행 계획이나 일정 제시 금지
- 💡 전략: 공감하는 시민 포지션 유지, 문의 폭주 방지를 위한 적절한 거리감`;
    
    case '현직형':
      return `
**현직 의원 언어 가능성** (실질적 권한 보유):
- ✅ 적극적 표현: "추진하겠습니다", "해결을 위해 노력하겠습니다"
- ✅ 구체적 계획: "관계부처와 협의하여", "예산 확보를 위해"
- ✅ 책임 표명: "의원으로서 책임지고", "최선을 다하겠습니다"
- 💡 전략: 실행 가능한 약속과 구체적 로드맵 제시`;
    
    default:
      return `
**일반적 언어 사용**: 특별한 제약사항 없음`;
  }
}

/**
 * 일상 소통형 프롬프트 생성 - 3가지 배리에이션 동시 생성
 * @param {Object} options - 프롬프트 생성 옵션
 * @returns {string} 생성된 프롬프트
 */
function buildDailyCommunicationPrompt(options) {
  const {
    policy,
    legalGuidelines,
    seoRules,
    partyValues,
    leadership,
    authorName,
    authorPosition,
    authorBio,
    topic,
    category,
    subCategory,
    keywords,
    regionMetro,
    regionLocal,
    authorStatus
  } = options;

  // 기본 정보 설정
  const name = authorName || '정치인';
  const position = authorPosition || '의원';
  const bio = authorBio || '';
  const status = authorStatus || '현역';
  const kw = keywords || '';
  const regionLabel = [regionMetro, regionLocal].filter(Boolean).join(' ').trim();
  const honorific = regionLabel ? `${regionLabel} 주민 여러분` : '여러분';

  // 상황 강제 메타태그 (사용자 프로필에서 자동 추출)
  const contextualConstraints = getContextualConstraints(options);
  
  // 세부 카테고리에 따른 3가지 배리에이션 정의
  const variations = getCommunicationVariations(subCategory, contextualConstraints);

  return `
# AI비서관 - 일상 소통형 글쓰기 (${subCategory})

${policy.body}

[🎯 일반 소통 목표]
정치인으로서의 권위적 이미지를 탈피하고, ${variations.goal}

[📋 기본 정보]
- 작성자: ${name} (${getCorrectTitle(position, status)})
- 상태: ${status === '예비' ? '예비후보자' : '현역'}
- 작성자 소개: ${bio}
- 주제: ${topic}
- 분류: ${category} / 세부분류: ${subCategory || '없음'}
- 키워드: ${kw || '없음'}
- 호칭: "${honorific}" 사용, 존댓말, 1인칭 "저는"

[🏛️ 더불어민주당 가치 반영]
${partyValues.CORE_VALUES.fundamental.freedom.meaning}, ${partyValues.CORE_VALUES.fundamental.equality.meaning}, ${partyValues.CORE_VALUES.fundamental.solidarity.meaning}, ${partyValues.CORE_VALUES.fundamental.peace.meaning}

[👨‍💼 이재명 리더십 철학]
${leadership.LEADERSHIP_PHILOSOPHY.coreprinciples.humanCentered.meaning}, ${leadership.LEADERSHIP_PHILOSOPHY.coreprinciples.fieldBased.meaning}, ${leadership.LEADERSHIP_PHILOSOPHY.coreprinciples.inclusive.meaning}

[📊 SEO 최적화 규칙]
- 분량: ${seoRules.wordCount.min}~${seoRules.wordCount.max}자 (고정)
- 키워드 배치: 제목에 1회, 본문에 400자당 1회 자연스럽게 포함
- 구조화: h2 소제목 2-3개, h3 세부제목 활용

[⚖️ 준수사항]
${legalGuidelines.required.factBased.rule}
${legalGuidelines.required.opinionClear.rule}
모든 주장은 사실에 근거하되, 의견은 "제 생각에는" 등으로 명확히 구분

[💡 작성자 경험 활용]
작성자 소개를 바탕으로 관련 경험이나 전문성을 자연스럽게 반영하세요.
개인 경험 언급 시: "제가 [구체적 활동/경험]을 통해 느낀 점은..." 형식 사용

[🎨 3가지 배리에이션 생성 지침]
같은 주제로 서로 다른 스타일의 3가지 원고를 생성하되, 각각 고유한 매력과 차별화된 접근법을 가져야 합니다.

[⚖️ 권한 수준별 언어 제약사항]
${getAuthorityLanguageGuide(contextualConstraints.authority)}

${variations.variation1}

${variations.variation2}

${variations.variation3}

[📱 출력 형식]
정확히 3개의 JSON 객체를 배열 형태로 출력하세요. 추가 설명이나 code-fence 사용 금지.
[
  {
    "title": "첫 번째 배리에이션 제목",
    "content": "<p>HTML 형식의 본문 내용</p>",
    "wordCount": 실제_글자수,
    "style": "${subCategory}_${variations.styleA}",
    "meta": {
      "category": "일상소통",
      "subCategory": "${subCategory}",
      "personalPreferences": {
        "tone": "${variations.toneA}",
        "approach": "${variations.approachA}",
        "structure": "${variations.structureA}"
      },
      "contextualConstraints": {
        "authority": "${contextualConstraints.authority}",
        "regionScale": "${contextualConstraints.regionScale}",
        "timeContext": "${contextualConstraints.timeContext}"
      },
      "politician": "${variations.politicianA}"
    }
  },
  {
    "title": "두 번째 배리에이션 제목",
    "content": "<p>HTML 형식의 본문 내용</p>",
    "wordCount": 실제_글자수,
    "style": "${subCategory}_${variations.styleB}",
    "meta": {
      "category": "일상소통",
      "subCategory": "${subCategory}",
      "personalPreferences": {
        "tone": "${variations.toneB}",
        "approach": "${variations.approachB}",
        "structure": "${variations.structureB}"
      },
      "contextualConstraints": {
        "authority": "${contextualConstraints.authority}",
        "regionScale": "${contextualConstraints.regionScale}",
        "timeContext": "${contextualConstraints.timeContext}"
      },
      "politician": "${variations.politicianB}"
    }
  },
  {
    "title": "세 번째 배리에이션 제목",
    "content": "<p>HTML 형식의 본문 내용</p>",
    "wordCount": 실제_글자수,
    "style": "${subCategory}_${variations.styleC}",
    "meta": {
      "category": "일상소통",
      "subCategory": "${subCategory}",
      "personalPreferences": {
        "tone": "${variations.toneC}",
        "approach": "${variations.approachC}",
        "structure": "${variations.structureC}"
      },
      "contextualConstraints": {
        "authority": "${contextualConstraints.authority}",
        "regionScale": "${contextualConstraints.regionScale}",
        "timeContext": "${contextualConstraints.timeContext}"
      },
      "politician": "${variations.politicianC}"
    }
  }
]
`.trim();
}

/**
 * 사용자 프로필에서 상황 강제 메타태그 추출
 * @param {Object} options - 사용자 프로필 정보
 * @returns {Object} 상황 강제 제약사항
 */
function getContextualConstraints(options) {
  const { authorStatus, regionMetro, regionLocal } = options;
  
  return {
    // 권한 수준 (강제)
    authority: authorStatus === '예비' ? '예비형' : '현직형',
    
    // 지역 규모 (강제)  
    regionScale: getRegionScale(regionMetro, regionLocal),
    
    // 시기적 맥락 (향후 확장 가능)
    timeContext: '평상시' // 추후 선거철, 국감시즌 등 추가
  };
}

/**
 * 지역 규모 판단
 */
function getRegionScale(metro, local) {
  if (metro === '서울특별시' || metro === '부산광역시' || metro === '인천광역시') {
    return '광역중심';
  } else if (metro && metro.includes('광역시')) {
    return '광역일반';
  } else if (metro && metro.includes('도')) {
    return '지방';
  }
  return '기타';
}

/**
 * 세부 카테고리별 3가지 배리에이션 정의 (상황 제약 반영)
 * @param {string} subCategory - 세부 카테고리
 * @param {Object} constraints - 상황 강제 제약사항
 * @returns {Object} 배리에이션 정보
 */
function getCommunicationVariations(subCategory, constraints) {
  
  switch (subCategory) {
    case '감사인사':
      return {
        goal: '지지자들의 성원에 보답하고 결속을 다지며 더 큰 책임감을 약속한다',
        
        // 배리에이션 A: 진중한 책임감형 (윤호중 스타일)
        variation1: `
## 배리에이션 A: 진중한 책임감형
**메타태그**: tone(진중형) + approach(철학형) + structure(점층형)

**구조**: "겸손한 자기 성찰 → 감사의 깊은 의미 → 무거운 책임감 다짐"
1. **겸손한 도입**: "시민 여러분께 또 한 번 큰 은혜를 입었습니다"로 낮은 자세
2. **철학적 성찰**: 지지의 이면에 담긴 민심의 뜻을 깊이 있게 해석
3. **점층적 다짐**: 개인적 감사 → 정치적 책임 → 역사적 사명으로 확장

**어조**: 엄숙하고 경건한 어조, 깊은 성찰이 담긴 진중함
**핵심 어휘**: "은혜", "겸허히", "무거운 책임", "역사 앞에서", "다짐", "봉사"`,

        // 배리에이션 B: 친근한 소통형 (박지원 스타일) 
        variation2: `
## 배리에이션 B: 친근한 소통형  
**메타태그**: tone(친근형) + approach(경험형) + structure(순환형)

**구조**: "일상적 감사 표현 → 현장 에피소드 → 일상으로 돌아와 마무리"
1. **친근한 도입**: "여러분 덕분에 이렇게 인사드릴 수 있게 되었습니다"
2. **현장 경험담**: 선거 과정에서 만난 시민들의 따뜻한 격려 에피소드
3. **순환적 마무리**: 다시 일상으로 돌아가 "정치 9단도 여러분 덕분" 식의 위트

**어조**: 서민적이고 유머러스한 어조, 현장감 있는 생생함  
**핵심 어휘**: "덕분에", "현장에서", "여러분이 주신", "정치 9단도", "사람사는 맛"`,

        // 배리에이션 C: 따뜻한 감성형 (새로운 스타일)
        variation3: `
## 배리에이션 C: 따뜻한 감성형
**메타태그**: tone(감성형) + approach(관찰형) + structure(직진형)

**구조**: "마음 깊은 감사 → 사회 관찰 통한 깨달음 → 따뜻한 약속"
1. **감성적 도입**: "가슴 깊은 곳에서 우러나는 감사의 마음"으로 진솔하게 시작
2. **관찰적 전개**: 선거 과정에서 목격한 시민들의 선량함과 사회의 따뜻함 관찰
3. **직진적 약속**: "그 마음에 보답하는 정치인이 되겠다"는 간결하고 따뜻한 다짐

**어조**: 진솔하고 따뜻한 어조, 마음을 울리는 감성
**핵심 어휘**: "가슴 깊이", "따뜻한 마음", "보답", "함께 걸어가겠습니다", "소중한 마음"`,

        // 메타태그 정의
        toneA: "진중형", approachA: "철학형", structureA: "점층형", 
        styleA: "진중철학점층", politicianA: "윤호중스타일",
        
        toneB: "친근형", approachB: "경험형", structureB: "순환형",
        styleB: "친근경험순환", politicianB: "박지원스타일",
        
        toneC: "감성형", approachC: "관찰형", structureC: "직진형", 
        styleC: "감성관찰직진", politicianC: "새로운스타일"
      };

    case '축하메시지':
      return {
        goal: '지역 행사나 성과를 축하하며 지역사회와의 유대감을 표현하고 긍정적 이미지를 구축한다',
        
        variation1: `
## 배리에이션 A: 활기찬 현장형 (우원식 스타일)
**메타태그**: tone(친근형) + approach(경험형) + structure(직진형)

**구조**: "즉석 축하 → 현장 참여 경험 → 지속 지원 약속"
1. **활기찬 도입**: "정말 축하드립니다!" 즉석에서 터져나오는 기쁨 표현
2. **현장 경험**: 행사에 직접 참여하며 느낀 감동과 지역민들의 열정
3. **직진적 약속**: "앞으로도 이런 멋진 행사들을 적극 지원하겠습니다"

**어조**: 밝고 활기찬 어조, 현장의 생생한 에너지
**핵심 어휘**: "진심으로 축하", "활기찬 현장", "함께 만들어가는", "지속적 지원"`,

        variation2: `
## 배리에이션 B: 차분한 의미부여형 (새로운 스타일)  
**메타태그**: tone(진중형) + approach(관찰형) + structure(점층형)

**구조**: "정중한 축하 → 행사의 깊은 의미 → 지역발전 비전"
1. **정중한 도입**: "뜻깊은 행사의 성공적 개최를 진심으로 축하드립니다"
2. **관찰적 해석**: 행사가 갖는 지역사회 발전과 공동체 화합의 의미 분석
3. **점층적 비전**: 개별 행사 → 지역 문화 → 지역 발전으로 확장된 비전 제시

**어조**: 차분하고 품격 있는 어조, 깊이 있는 통찰
**핵심 어휘**: "뜻깊은", "의미 있는", "지역발전", "공동체 화합", "문화적 가치"`,

        variation3: `
## 배리에이션 C: 감동적 공감형 (새로운 스타일)
**메타태그**: tone(감성형) + approach(철학형) + structure(순환형)

**구조**: "감동적 축하 → 인생 철학적 성찰 → 축하로 돌아와 마무리"  
1. **감동적 도입**: "가슴이 뭉클해지는 감동적인 순간을 함께 할 수 있어 기쁩니다"
2. **철학적 성찰**: 성취와 노력, 꿈과 현실에 대한 인생 철학적 메시지
3. **순환적 마무리**: 다시 축하의 마음으로 돌아와 "이런 감동을 주셔서 감사합니다"

**어조**: 따뜻하고 감동적인 어조, 철학적 깊이
**핵심 어휘**: "감동", "가슴 뜨거워지는", "꿈과 현실", "아름다운 순간", "함께하는 기쁨"`,

        toneA: "친근형", approachA: "경험형", structureA: "직진형",
        styleA: "친근경험직진", politicianA: "우원식스타일",
        
        toneB: "진중형", approachB: "관찰형", structureB: "점층형", 
        styleB: "진중관찰점층", politicianB: "새로운스타일",
        
        toneC: "감성형", approachC: "철학형", structureC: "순환형",
        styleC: "감성철학순환", politicianC: "새로운스타일"
      };

    case '격려글':
      return {
        goal: '사회적 약자나 어려움을 겪는 이들에게 공감과 위로를 전하며 따뜻하고 포용적인 리더 이미지를 구축한다',
        
        variation1: `
## 배리에이션 A: 따뜻한 정책형 (남인순 스타일)
**메타태그**: tone(감성형) + approach(철학형) + structure(점층형)

**구조**: "깊은 공감 → 사회복지 철학 → 정책적 해결 의지"
1. **감성적 공감**: "그 아픔과 어려움이 얼마나 클지 가슴 깊이 공감합니다"
2. **철학적 접근**: 개인의 어려움을 사회 구조적 문제와 연결한 깊이 있는 분석
3. **점층적 해결**: 개인 위로 → 제도 개선 → 사회 변화로 확장된 해결 의지

**어조**: 진솔하고 따뜻한 어조, 전문가적 신뢰감
**핵심 어휘**: "깊이 공감", "사회적 약자", "제도적 뒷받침", "함께 만들어가는", "따뜻한 사회"`,

        variation2: `
## 배리에이션 B: 친근한 동행형 (새로운 스타일)
**메타태그**: tone(친근형) + approach(경험형) + structure(순환형)

**구조**: "친근한 위로 → 유사한 경험담 → 친근한 격려로 마무리"
1. **친근한 도입**: "정말 힘드시죠. 저도 비슷한 경험이 있어서 그 마음 조금은 알 것 같아요"
2. **경험적 공감**: 자신이나 주변에서 겪은 유사한 어려움과 극복 과정 공유  
3. **순환적 격려**: 다시 개인적 관심으로 돌아와 "언제든 힘이 필요하시면 연락하세요"

**어조**: 친근하고 진솔한 어조, 이웃 같은 따뜻함
**핵심 어휘**: "그 마음 알아요", "저도 겪어봤는데", "함께 이겨내요", "언제든 연락하세요"`,

        variation3: `
## 배리에이션 C: 진중한 연대형 (새로운 스타일)  
**메타태그**: tone(진중형) + approach(관찰형) + structure(직진형)

**구조**: "엄중한 현실 인식 → 사회적 관찰 → 연대 의지 표명"
1. **진중한 인식**: "이런 어려움이 개인의 문제가 아님을 우리는 알고 있습니다"
2. **관찰적 분석**: 유사한 어려움을 겪는 많은 이들의 현실을 차분히 관찰하고 분석
3. **직진적 연대**: "혼자가 아닙니다. 우리가 함께 하겠습니다"는 명확한 연대 의지

**어조**: 차분하고 진중한 어조, 확고한 의지
**핵심 어휘**: "혼자가 아닙니다", "우리가 함께", "사회적 책임", "연대의 힘", "변화를 만들어가겠습니다"`,

        toneA: "감성형", approachA: "철학형", structureA: "점층형",
        styleA: "감성철학점층", politicianA: "남인순스타일",
        
        toneB: "친근형", approachB: "경험형", structureB: "순환형",
        styleB: "친근경험순환", politicianB: "새로운스타일",
        
        toneC: "진중형", approachC: "관찰형", structureC: "직진형",
        styleC: "진중관찰직진", politicianC: "새로운스타일"
      };

    case '교육컨텐츠':
      return {
        goal: '복잡한 정책이나 사회 현안을 유권자 눈높이에서 쉽게 설명하여 유능하고 소통하는 전문가 이미지를 구축한다',
        
        variation1: `
## 배리에이션 A: 친절한 해설형 (박주민 스타일)
**메타태그**: tone(친근형) + approach(관찰형) + structure(직진형)

**구조**: "관심 유발 질문 → 체계적 설명 → 핵심 요약"
1. **친근한 질문**: "궁금하지 않으셨나요?" 식의 독자 관심을 끄는 질문으로 도입
2. **관찰적 설명**: 복잡한 내용을 일상 관찰과 비유를 통해 쉽게 풀어서 설명
3. **직진적 정리**: "정리하면 이렇습니다"로 핵심만 간명하게 요약

**어조**: 친절하고 이해하기 쉬운 어조, 선생님 같은 따뜻함
**핵심 어휘**: "쉽게 설명해드리면", "예를 들어", "한눈에 보는", "정리하면", "궁금한 점 있으시면"`,

        variation2: `
## 배리에이션 B: 체계적 분석형 (새로운 스타일)
**메타태그**: tone(진중형) + approach(철학형) + structure(점층형)

**구조**: "문제 제기 → 심층 분석 → 통찰과 방향 제시"
1. **진중한 문제제기**: "이 문제를 제대로 이해하려면 배경부터 살펴봐야 합니다"
2. **철학적 분석**: 단순한 설명을 넘어 문제의 본질과 사회적 의미까지 깊이 있게 분석
3. **점층적 통찰**: 개별 이슈 → 사회 전체 → 미래 방향까지 확장된 통찰 제시

**어조**: 차분하고 논리적인 어조, 깊이 있는 전문성
**핵심 어휘**: "본질적으로", "근본적인 문제는", "깊이 있게 살펴보면", "통찰", "미래 지향적"`,

        variation3: `
## 배리에이션 C: 생생한 현장형 (새로운 스타일)
**메타태그**: tone(감성형) + approach(경험형) + structure(순환형)

**구조**: "현장 에피소드 → 경험 기반 설명 → 에피소드로 돌아와 마무리"
1. **감성적 도입**: "얼마 전 만난 시민분이 이런 질문을 하시더라고요"
2. **경험적 설명**: 직접 겪거나 현장에서 본 사례들을 통해 생생하게 설명
3. **순환적 마무리**: 처음 에피소드로 돌아가 "그분께 이렇게 답해드렸습니다"

**어조**: 생생하고 현장감 있는 어조, 경험이 묻어나는 진정성
**핵심 어휘**: "현장에서 만난", "직접 겪어보니", "생생한 경험", "실제로는", "현실적으로"`,

        toneA: "친근형", approachA: "관찰형", structureA: "직진형",
        styleA: "친근관찰직진", politicianA: "박주민스타일",
        
        toneB: "진중형", approachB: "철학형", structureB: "점층형",
        styleB: "진중철학점층", politicianB: "새로운스타일",
        
        toneC: "감성형", approachC: "경험형", structureC: "순환형", 
        styleC: "감성경험순환", politicianC: "새로운스타일"
      };

    case '일상소통':
    default:
      return {
        goal: '소소한 일상을 공유하며 유권자와 인간적인 유대감을 형성하고 친근한 이미지를 구축한다',
        
        variation1: `
## 배리에이션 A: 위트있는 현장형 (박지원 스타일)
**메타태그**: tone(친근형) + approach(경험형) + structure(순환형)

**구조**: "일상 소재 → 정치 철학 연결 → 위트 있는 마무리"
1. **친근한 일상**: "오늘 미용실에 갔다가..." 식으로 누구나 공감할 일상 소재로 시작
2. **경험적 연결**: 일상에서 만난 사람들의 이야기를 현재 정치 상황과 자연스럽게 연결
3. **순환적 위트**: 다시 일상으로 돌아와 "역시 정치 9단도 배울 게 많습니다" 식의 유머로 마무리

**어조**: 노련하면서도 친근한 어조, 삶의 지혜가 묻어나는 위트
**핵심 어휘**: "오늘 ~에 갔다가", "문득 생각이 들었습니다", "사람 사는 세상", "결국은 민심", "정치 9단도"`,

        variation2: `
## 배리에이션 B: 따뜻한 성찰형 (새로운 스타일)
**메타태그**: tone(감성형) + approach(철학형) + structure(점층형)

**구조**: "따뜻한 일상 → 인생 철학 → 깊어지는 감사"
1. **감성적 일상**: "길을 걷다가 마주친 따뜻한 순간들"을 감성적으로 묘사
2. **철학적 성찰**: 일상의 소중함과 인간관계의 의미에 대한 깊이 있는 성찰
3. **점층적 감사**: 개인적 감사 → 지역 공동체 → 정치인으로서의 감사로 확장

**어조**: 따뜻하고 서정적인 어조, 진심이 담긴 성찰
**핵심 어휘**: "마음이 따뜻해지는", "소중한 순간", "감사한 마음", "삶의 의미", "함께하는 기쁨"`,

        variation3: `
## 배리에이션 C: 활기찬 소통형 (새로운 스타일)  
**메타태그**: tone(친근형) + approach(관찰형) + structure(직진형)

**구조**: "생생한 관찰 → 사회 현상 분석 → 희망적 메시지"
1. **관찰적 도입**: "요즘 거리에서, 카페에서 보게 되는 모습들"을 생생하게 관찰
2. **사회 관찰**: 일상에서 포착한 사회 변화의 신호들을 예리하게 분석
3. **직진적 희망**: "이런 변화들을 보면 희망이 보입니다"는 명확하고 밝은 메시지

**어조**: 활기차고 관찰력 있는 어조, 사회에 대한 예민한 감수성  
**핵심 어휘**: "요즘 보니", "변화하는 모습", "새로운 세대", "희망적인 신호", "밝은 미래"`,

        toneA: "친근형", approachA: "경험형", structureA: "순환형",
        styleA: "친근경험순환", politicianA: "박지원스타일",
        
        toneB: "감성형", approachB: "철학형", structureB: "점층형",
        styleB: "감성철학점층", politicianB: "새로운스타일",
        
        toneC: "친근형", approachC: "관찰형", structureC: "직진형",
        styleC: "친근관찰직진", politicianC: "새로운스타일"
      };
  }
}

/**
 * 상태별 올바른 호칭 생성
 */
function getCorrectTitle(position, status) {
  let baseTitle = '';
  
  if (position === '국회의원') {
    baseTitle = '국회의원';
  } else if (position === '광역의원') {
    baseTitle = '광역의원';
  } else if (position === '기초의원') {
    baseTitle = '기초의원';
  } else {
    baseTitle = position;
  }
  
  if (status === '예비') {
    return `${baseTitle} 예비후보`;
  } else {
    return baseTitle;
  }
}

module.exports = {
  buildDailyCommunicationPrompt,
  getCommunicationVariations,
  getContextualConstraints,
  getAuthorityLanguageGuide,
};