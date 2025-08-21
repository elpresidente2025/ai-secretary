// functions/templates/prompts/local-activities.js - 지역활동 프롬프트 (우원식 모델 기반)

'use strict';

/**
 * 권한 수준별 지역활동 언어 제약사항 가이드
 * @param {string} authority - 권한 수준
 * @returns {string} 언어 가이드
 */
function getLocalActivityAuthorityGuide(authority) {
  switch (authority) {
    case '예비형':
      return `
**예비후보 지역활동 제약사항** (현재 직무권한 없음):
- ✅ 사용 가능: "현장을 둘러봤습니다", "주민분들의 말씀을 들었습니다", "당선되면 해결하겠습니다"
- ✅ 관찰자 시점: "지역 현실을 확인했습니다", "문제를 파악했습니다"
- ❌ 금지 표현: "예산을 확보했습니다", "해결했습니다", "추진했습니다"
- ❌ 과도한 약속: 구체적 해결 일정이나 예산 약속 금지
- 💡 전략: 현장 이해와 공감 중심, 당선 후 해결 의지 표명`;
    
    case '현직형':
      return `
**현직 의원 지역활동 가능 표현** (실질적 권한 보유):
- ✅ 현재 진행: "예산을 확보했습니다", "관계부처와 협의하고 있습니다", "해결 중입니다"
- ✅ 구체적 성과: "도로가 개선되었습니다", "예산이 반영되었습니다", "문제가 해결되었습니다"
- ✅ 실행 계획: "다음 달까지 완료하겠습니다", "추가 예산을 확보하겠습니다"
- 💡 전략: 구체적 성과와 실행 가능한 약속 중심`;
    
    default:
      return `
**일반적 지역활동 표현**: 특별한 제약사항 없음`;
  }
}

/**
 * 지역활동 프롬프트 생성 - 우원식 모델 기반 3가지 배리에이션
 * @param {Object} options - 프롬프트 생성 옵션 (실제 가이드라인 포함)
 * @returns {string} 생성된 프롬프트
 */
function buildLocalActivitiesPrompt(options) {
  const {
    // 실제 가이드라인에서 전달받는 정보
    policy,
    legalGuidelines,
    seoRules,
    contentRules,
    partyValues,
    leadership,
    
    // 사용자 정보
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
  const name = authorName || '의원';
  const position = authorPosition || '의원';
  const bio = authorBio || '';
  const status = authorStatus || '현역';
  const kw = keywords || '';
  const regionLabel = [regionMetro, regionLocal].filter(Boolean).join(' ').trim();
  const honorific = regionLabel ? `${regionLabel} 주민 여러분` : '지역 주민 여러분';

  // 상황 강제 메타태그 (사용자 프로필에서 자동 추출)
  const contextualConstraints = getLocalActivityContextualConstraints(options);
  
  // 세부 카테고리에 따른 활동 유형과 3가지 배리에이션 정의
  const variations = getLocalActivityVariations(subCategory, contextualConstraints);

  return `
# AI비서관 - 지역활동 보고형 글쓰기 (${subCategory})

${policy.body}

[🎯 지역활동 목표]
${variations.goal}

[📋 기본 정보]
- 작성자: ${name} (${getCorrectTitle(position, status)})
- 상태: ${status === '예비' ? '예비후보자' : '현역 의원'}
- 작성자 소개: ${bio}
- 주제: ${topic}
- 분류: ${category} / 세부분류: ${subCategory || '없음'}
- 키워드: ${kw || '없음'}
- 호칭: "${honorific}" 사용, 존댓말, 1인칭 "저는"

[🏛️ 더불어민주당 가치 반영]
${partyValues.CORE_VALUES.fundamental.freedom.meaning}, ${partyValues.CORE_VALUES.fundamental.equality.meaning}, ${partyValues.CORE_VALUES.fundamental.solidarity.meaning}, ${partyValues.CORE_VALUES.fundamental.peace.meaning}

[👨‍💼 이재명 리더십 철학]
${leadership.coreprinciples.humanCentered.meaning}, ${leadership.coreprinciples.fieldBased.meaning}, ${leadership.coreprinciples.inclusive.meaning}

[📊 SEO 최적화 규칙]
- 분량: ${seoRules.wordCount.min}~${seoRules.wordCount.max}자 (고정)
- 키워드 배치: 제목에 1회, 본문에 400자당 1회 자연스럽게 포함
- 구조화: h2 소제목 2-3개, h3 세부제목 활용

[⚖️ 준수사항]
${legalGuidelines.required.factBased.rule}
${legalGuidelines.required.opinionClear.rule}
모든 통계와 법률 인용에는 반드시 출처 명시 필수: [출처: 기관명/자료명]

[🔍 지역활동 핵심 구조 (우원식 모델)]
${variations.coreStructure}

[📸 시각 자료 가이드]
${variations.visualGuide}

[💡 작성자 전문성 활용]
작성자 소개를 바탕으로 지역에 대한 이해도나 전문 분야 경험을 자연스럽게 반영하세요.
지역 경험 언급 시: "제가 [지역/분야]에서 활동하며 보아온 바로는..." 형식 사용

[🎨 3가지 배리에이션 생성 지침]
같은 지역활동 주제로 서로 다른 접근 방식의 3가지 원고를 생성하되, 각각 고유한 지역활동 스타일과 차별화된 소통 방법을 가져야 합니다.

[⚖️ 권한 수준별 언어 제약사항]
${getLocalActivityAuthorityGuide(contextualConstraints.authority)}

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
      "category": "지역활동",
      "subCategory": "${subCategory}",
      "personalPreferences": {
        "tone": "${variations.toneA}",
        "approach": "${variations.approachA}",
        "structure": "${variations.structureA}"
      },
      "contextualConstraints": {
        "authority": "${contextualConstraints.authority}",
        "regionScale": "${contextualConstraints.regionScale}",
        "activityType": "${contextualConstraints.activityType}"
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
      "category": "지역활동",
      "subCategory": "${subCategory}",
      "personalPreferences": {
        "tone": "${variations.toneB}",
        "approach": "${variations.approachB}",
        "structure": "${variations.structureB}"
      },
      "contextualConstraints": {
        "authority": "${contextualConstraints.authority}",
        "regionScale": "${contextualConstraints.regionScale}",
        "activityType": "${contextualConstraints.activityType}"
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
      "category": "지역활동",
      "subCategory": "${subCategory}",
      "personalPreferences": {
        "tone": "${variations.toneC}",
        "approach": "${variations.approachC}",
        "structure": "${variations.structureC}"
      },
      "contextualConstraints": {
        "authority": "${contextualConstraints.authority}",
        "regionScale": "${contextualConstraints.regionScale}",
        "activityType": "${contextualConstraints.activityType}"
      },
      "politician": "${variations.politicianC}"
    }
  }
]
`.trim();
}

/**
 * 지역활동 상황 강제 메타태그 추출
 * @param {Object} options - 사용자 프로필 정보
 * @returns {Object} 상황 강제 제약사항
 */
function getLocalActivityContextualConstraints(options) {
  const { authorStatus, regionMetro, regionLocal, authorPosition } = options;
  
  return {
    // 권한 수준 (강제)
    authority: authorStatus === '예비' ? '예비형' : '현직형',
    
    // 지역 규모 (강제)  
    regionScale: getRegionScale(regionMetro, regionLocal),
    
    // 활동 유형 (권한에 따른 제약)
    activityType: authorStatus === '예비' ? '관찰공감형' : '해결실행형'
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
 * 세부 카테고리별 3가지 배리에이션 정의 (지역활동 특화)
 * @param {string} subCategory - 세부 카테고리
 * @param {Object} constraints - 상황 강제 제약사항
 * @returns {Object} 배리에이션 정보
 */
function getLocalActivityVariations(subCategory, constraints) {
  
  // 해결사형 활동들 (우원식 모델: 현존 → 공감 → 행동)
  if (['현장방문', '주민간담회', '지역현안', '상권점검', '민원해결'].includes(subCategory)) {
    return {
      goal: '지역 현장을 직접 찾아 주민들의 목소리를 듣고 문제를 해결하는 "해결사" 이미지를 구축하여 지역 유권자와의 신뢰를 확보한다',
      
      coreStructure: `
**우원식 모델 (해결사형)**: "현존(Presence) → 공감(Empathy) → 행동(Action)"
1. **현존**: "${subCategory}에 참석했습니다", "현장을 점검했습니다"와 같이 의원이 현장에 '직접' 있었음을 명시
2. **공감**: "주민분들을 만나뵙고, 불편사항을 들었습니다"와 같이 주민의 입장에서 고충을 이해하고 공감하는 태도 표현
3. **행동**: "의견을 적극 반영하겠습니다", "하루빨리 해결되도록 최선을 다하겠습니다"와 같이 구체적인 약속과 강한 의지 표명`,

      visualGuide: `
**시각 자료**: 주민들과 대화하는 모습, 현장을 꼼꼼히 살피는 모습, 악수하거나 함께 웃는 모습 등 다양한 현장 활동 사진`,
      
      // 배리에이션 A: 체계적 해결형 (우원식 스타일)
      variation1: `
## 배리에이션 A: 체계적 해결형 (우원식 스타일)
**메타태그**: tone(친근형) + approach(현장형) + structure(체계형)

**구조**: "현장 방문 사실 → 주민 목소리 경청 → 문제점 정리 → 해결 방안 제시"
1. **현장 현존**: "오늘 OO아파트 주민간담회에 참석했습니다"와 같이 물리적 존재를 명확히 제시
2. **능동적 경청**: "주민분들의 다양한 의견을 꼼꼼히 들었습니다"로 적극적인 소통 자세 강조
3. **체계적 정리**: 들은 내용을 카테고리별로 정리하여 전문성과 책임감 표현
4. **구체적 행동**: "관계부처와 협의하여 해결하겠습니다"와 같은 명확한 실행 계획 제시

**어조**: 행동 중심의 간결하고 명료한 문체, 주민에게 직접 보고하는 듯한 친근한 어조
**핵심 어휘**: "현장을 찾았습니다", "목소리를 경청했습니다", "적극 반영하겠습니다", "최선을 다하겠습니다"`,

      // 배리에이션 B: 감정 공감형 (서영교 스타일)
      variation2: `
## 배리에이션 B: 감정 공감형 (서영교 스타일)  
**메타태그**: tone(공감형) + approach(감정형) + structure(스토리형)

**구조**: "따뜻한 만남 → 깊은 공감 → 함께하는 다짐 → 희망적 전망"
1. **따뜻한 도입**: "주민분들과 따뜻한 만남을 가졌습니다"로 인간적인 접근 강조
2. **깊은 공감**: 주민들의 어려움에 대한 진심어린 이해와 감정적 교감 표현
3. **스토리텔링**: 인상적인 대화나 에피소드를 통해 현실감 있는 스토리 전개
4. **희망적 다짐**: "함께 만들어가겠습니다"와 같은 협력적이고 희망적인 메시지

**어조**: 따뜻하고 인간적인 어조, 감정적 교감을 중시하는 문체
**핵심 어휘**: "마음이 아팠습니다", "깊이 공감했습니다", "함께 노력하겠습니다", "희망을 품어봅니다"`,

      // 배리에이션 C: 전문 분석형 (새로운 스타일)
      variation3: `
## 배리에이션 C: 전문 분석형 (새로운 스타일)
**메타태그**: tone(전문형) + approach(분석형) + structure(논리형)

**구조**: "현장 조사 → 전문적 분석 → 근본 원인 파악 → 체계적 해결책"
1. **전문적 조사**: 현장에서 파악한 내용을 전문적 관점에서 분석하고 정리
2. **데이터 기반**: 구체적인 수치나 비교 자료를 활용하여 문제의 심각성 부각
3. **논리적 분석**: 문제의 근본 원인을 체계적으로 분석하고 구조적 해결 방안 모색
4. **전문적 해결**: 관련 법령이나 정책을 근거로 한 전문적이고 실현 가능한 해결책

**어조**: 전문적이고 신뢰할 수 있는 분석가 어조, 객관적 데이터와 논리 중시
**핵심 어휘**: "면밀히 조사한 결과", "전문적 검토", "체계적 해결방안", "근본적 개선"`,

      // 메타태그 정의
      toneA: "친근형", approachA: "현장형", structureA: "체계형", 
      styleA: "친근현장체계", politicianA: "우원식스타일",
      
      toneB: "공감형", approachB: "감정형", structureB: "스토리형",
      styleB: "공감감정스토리", politicianB: "서영교스타일",
      
      toneC: "전문형", approachC: "분석형", structureC: "논리형", 
      styleC: "전문분석논리", politicianC: "새로운스타일"
    };
  }
  
  // 이웃형 활동들 (우원식 모델: 참여 → 분위기 → 감사)
  else if (['봉사활동', '지역행사참여'].includes(subCategory)) {
    return {
      goal: '방역, 김장, 축제 등 지역 공동체 활동에 참여하여 "주민의 이웃"이라는 친근하고 헌신적인 이미지를 구축한다',
      
      coreStructure: `
**우원식 모델 (이웃형)**: "참여 사실 전달 → 활동의 긍정적 분위기 묘사 → 감사와 공동체 의식 강조"
1. **참여 전달**: "민주당 방역봉사단과 봉사에 참석했습니다"와 같이 참여 사실을 간결하게 전달
2. **긍정적 분위기**: "웃음꽃이 가득했던", "에너지를 듬뿍 받았습니다" 등 활기찬 분위기 묘사
3. **공동체 의식**: "이 위기를 넘어서는데 조금이라도 힘이 되었으면" 등 공동체 전체의 이익과 연결`,

      visualGuide: `
**시각 자료**: 봉사활동 유니폼을 입고 활동하는 모습, 주민들과 어울려 웃는 모습 등 자연스러운 현장 사진`,
      
      // 배리에이션 A: 활기찬 참여형 (우원식 스타일)
      variation1: `
## 배리에이션 A: 활기찬 참여형 (우원식 스타일)
**메타태그**: tone(활기형) + approach(참여형) + structure(감사형)

**구조**: "적극적 참여 → 활기찬 분위기 → 감사 표현 → 공동체 의식"
1. **적극적 참여**: "함께 땀 흘리며 참여했습니다"와 같이 능동적 참여 자세 강조
2. **활기찬 분위기**: 봉사나 행사의 즐겁고 활기찬 분위기를 생생하게 묘사
3. **진심어린 감사**: 함께한 시민들과 관계자들에 대한 진심어린 감사 표현
4. **공동체 다짐**: 지역 공동체 발전을 위한 지속적 노력 의지 표명

**어조**: 따뜻하고 활기찬 어조, 에너지가 넘치는 긍정적 문체
**핵심 어휘**: "함께 땀 흘렸습니다", "에너지를 듬뿍 받았습니다", "감사드립니다", "힘이 되었으면 합니다"`,

      // 배리에이션 B: 헌신적 봉사형 (새로운 스타일)
      variation2: `
## 배리에이션 B: 헌신적 봉사형 (새로운 스타일)  
**메타태그**: tone(헌신형) + approach(봉사형) + structure(나눔형)

**구조**: "겸손한 참여 → 의미 있는 활동 → 배움과 성찰 → 지속적 헌신"
1. **겸손한 자세**: "작은 힘이나마 보태고자 참여했습니다"와 같은 겸손한 참여 동기
2. **의미 부여**: 단순한 행사 참여가 아닌 지역사회에 대한 의미 있는 기여로 승화
3. **배움과 성찰**: 활동을 통해 얻은 깨달음이나 지역에 대한 새로운 이해 표현
4. **지속적 다짐**: 일회성이 아닌 지속적인 관심과 참여 의지 표명

**어조**: 겸손하고 성찰적인 어조, 진정성 있는 봉사정신 강조
**핵심 어휘**: "작은 힘이나마", "의미 있는 시간", "많은 것을 배웠습니다", "계속해서 함께하겠습니다"`,

      // 배리에이션 C: 소통 강화형 (새로운 스타일)
      variation3: `
## 배리에이션 C: 소통 강화형 (새로운 스타일)
**메타태그**: tone(소통형) + approach(교류형) + structure(연결형)

**구조**: "자연스러운 만남 → 다양한 소통 → 공동체 유대 → 지속적 소통"
1. **자연스러운 접근**: 공식적 만남이 아닌 자연스러운 일상 속 만남으로 접근
2. **다양한 소통**: 다양한 연령층, 계층과의 허심탄회한 대화와 소통 과정 묘사
3. **유대감 형성**: 활동을 통해 형성된 주민들과의 유대감과 공동체 의식 강조
4. **소통 지속**: 앞으로도 이런 자연스러운 소통 기회를 늘려가겠다는 의지

**어조**: 친근하고 소통 지향적인 어조, 허심탄회한 대화체
**핵심 어휘**: "자연스럽게 이야기했습니다", "진솔한 대화", "더 가까워진 느낌", "앞으로도 자주 만나겠습니다"`,

      // 메타태그 정의
      toneA: "활기형", approachA: "참여형", structureA: "감사형", 
      styleA: "활기참여감사", politicianA: "우원식스타일",
      
      toneB: "헌신형", approachB: "봉사형", structureB: "나눔형",
      styleB: "헌신봉사나눔", politicianB: "새로운스타일",
      
      toneC: "소통형", approachC: "교류형", structureC: "연결형", 
      styleC: "소통교류연결", politicianC: "새로운스타일"
    };
  }
  
  // 기타 지역활동 (일반형)
  else {
    return {
      goal: '지역 주민들과의 다양한 접점을 통해 소통하는 의원으로서의 이미지를 구축한다',
      
      coreStructure: `
**일반적 지역활동**: "참여/방문 → 내용 소개 → 의미 부여 → 향후 계획"
1. **참여/방문**: 구체적인 활동 참여나 현장 방문 사실 전달
2. **내용 소개**: 활동의 주요 내용이나 인상적인 순간들 소개
3. **의미 부여**: 해당 활동이 지역사회에 갖는 의미와 가치 설명
4. **향후 계획**: 지속적인 관심과 참여 의지 표명`,

      visualGuide: `
**시각 자료**: 활동에 참여하는 모습, 주민들과 소통하는 장면 등`,
      
      // 일반적 배리에이션들
      variation1: `
## 배리에이션 A: 적극 참여형
**구조**: "적극적 참여 → 주요 내용 → 긍정적 평가 → 지속 의지"`,
      
      variation2: `
## 배리에이션 B: 관찰 보고형  
**구조**: "현장 관찰 → 객관적 보고 → 개선점 제시 → 발전 방안"`,
      
      variation3: `
## 배리에이션 C: 소통 중심형
**구조**: "주민 만남 → 의견 청취 → 공감 표현 → 소통 확대"`,

      // 메타태그 정의
      toneA: "적극형", approachA: "참여형", structureA: "긍정형", 
      styleA: "적극참여긍정", politicianA: "일반스타일",
      
      toneB: "관찰형", approachB: "보고형", structureB: "개선형",
      styleB: "관찰보고개선", politicianB: "일반스타일",
      
      toneC: "소통형", approachC: "경청형", structureC: "확대형", 
      styleC: "소통경청확대", politicianC: "일반스타일"
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
  buildLocalActivitiesPrompt,
  getLocalActivityVariations,
  getLocalActivityContextualConstraints,
  getLocalActivityAuthorityGuide,
};