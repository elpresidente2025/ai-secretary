// functions/templates/prompts/policy-vision.js - 정책 및 비전 프롬프트 (이재명/김태년 모델 기반)

'use strict';

/**
 * 권한 수준별 정책 비전 언어 제약사항 가이드
 * @param {string} authority - 권한 수준
 * @returns {string} 언어 가이드
 */
function getPolicyVisionAuthorityGuide(authority) {
  switch (authority) {
    case '예비형':
      return `
**예비후보 정책 비전 제약사항** (국가 정책 제시 시 신중):
- ✅ 사용 가능: "제안합니다", "추진이 필요합니다", "정책 방향을 제시합니다"
- ✅ 비전 제시: "당선되면 실현하겠습니다", "이런 미래를 만들겠습니다"
- ❌ 금지 표현: "정부에 지시하겠습니다", "예산을 편성하겠습니다", "즉시 시행하겠습니다"
- ❌ 과도한 권한: 정부나 국정 운영 권한을 전제로 한 표현 금지
- 💡 전략: 정책 비전과 철학 중심, 당선 후 추진 의지 표명`;
    
    case '현직형':
      return `
**현직 의원 정책 비전 가능 표현** (입법부 권한 범위 내):
- ✅ 입법 권한: "법안을 발의하겠습니다", "제도 개선을 추진하겠습니다"
- ✅ 예산 심의: "예산 확보를 위해 노력하겠습니다", "예산안을 검토하겠습니다"
- ✅ 정책 제안: "정부에 정책 변경을 촉구하겠습니다", "국정감사에서 추궁하겠습니다"
- 💡 전략: 입법부 역할 범위 내에서 구체적 실행 방안 제시`;
    
    default:
      return `
**일반적 정책 비전 표현**: 특별한 제약사항 없음`;
  }
}

/**
 * 정책 및 비전 프롬프트 생성 - 이재명/김태년 모델 기반 3가지 배리에이션
 * @param {Object} options - 프롬프트 생성 옵션 (실제 가이드라인 포함)
 * @returns {string} 생성된 프롬프트
 */
function buildPolicyVisionPrompt(options) {
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
  const honorific = regionLabel ? `${regionLabel} 주민 여러분` : '국민 여러분';

  // 상황 강제 메타태그 (사용자 프로필에서 자동 추출)
  const contextualConstraints = getPolicyVisionContextualConstraints(options);
  
  // 세부 카테고리에 따른 정책 비전 유형과 3가지 배리에이션 정의
  const variations = getPolicyVisionVariations(subCategory, contextualConstraints);

  return `
# AI비서관 - 정책 및 비전 제시형 글쓰기 (${subCategory})

${policy.body}

[🎯 정책 비전 목표]
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
모든 통계와 정책 인용에는 반드시 출처 명시 필수: [출처: 기관명/자료명]

[🔍 정책 비전 핵심 구조 (이재명/김태년 모델)]
${variations.coreStructure}

[📊 데이터 활용 가이드]
${variations.dataGuide}

[💡 작성자 전문성 활용]
작성자 소개를 바탕으로 해당 정책 분야의 전문성이나 관련 경험을 자연스럽게 반영하세요.
정책 경험 언급 시: "제가 [분야/위원회]에서 연구한 바로는..." 형식 사용

[🎨 3가지 배리에이션 생성 지침]
같은 정책 주제로 서로 다른 리더십 스타일의 3가지 원고를 생성하되, 각각 고유한 비전 제시 방식과 차별화된 접근 방법을 가져야 합니다.

[⚖️ 권한 수준별 언어 제약사항]
${getPolicyVisionAuthorityGuide(contextualConstraints.authority)}

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
      "category": "정책비전",
      "subCategory": "${subCategory}",
      "personalPreferences": {
        "tone": "${variations.toneA}",
        "approach": "${variations.approachA}",
        "structure": "${variations.structureA}"
      },
      "contextualConstraints": {
        "authority": "${contextualConstraints.authority}",
        "regionScale": "${contextualConstraints.regionScale}",
        "visionScope": "${contextualConstraints.visionScope}"
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
      "category": "정책비전",
      "subCategory": "${subCategory}",
      "personalPreferences": {
        "tone": "${variations.toneB}",
        "approach": "${variations.approachB}",
        "structure": "${variations.structureB}"
      },
      "contextualConstraints": {
        "authority": "${contextualConstraints.authority}",
        "regionScale": "${contextualConstraints.regionScale}",
        "visionScope": "${contextualConstraints.visionScope}"
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
      "category": "정책비전",
      "subCategory": "${subCategory}",
      "personalPreferences": {
        "tone": "${variations.toneC}",
        "approach": "${variations.approachC}",
        "structure": "${variations.structureC}"
      },
      "contextualConstraints": {
        "authority": "${contextualConstraints.authority}",
        "regionScale": "${contextualConstraints.regionScale}",
        "visionScope": "${contextualConstraints.visionScope}"
      },
      "politician": "${variations.politicianC}"
    }
  }
]
`.trim();
}

/**
 * 정책 비전 상황 강제 메타태그 추출
 * @param {Object} options - 사용자 프로필 정보
 * @returns {Object} 상황 강제 제약사항
 */
function getPolicyVisionContextualConstraints(options) {
  const { authorStatus, regionMetro, regionLocal, authorPosition } = options;
  
  return {
    // 권한 수준 (강제)
    authority: authorStatus === '예비' ? '예비형' : '현직형',
    
    // 지역 규모 (강제)  
    regionScale: getRegionScale(regionMetro, regionLocal),
    
    // 비전 범위 (권한에 따른 제약)
    visionScope: authorStatus === '예비' ? '정책제안형' : '입법추진형'
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
 * 세부 카테고리별 3가지 배리에이션 정의 (정책 비전 특화)
 * @param {string} subCategory - 세부 카테고리
 * @param {Object} constraints - 상황 강제 제약사항
 * @returns {Object} 배리에이션 정보
 */
function getPolicyVisionVariations(subCategory, constraints) {
  
  switch (subCategory) {
    case '경제정책':
      return {
        goal: '국가 경제 발전 전략과 비전을 제시하여 경제 정책 전문가이자 미래 경제를 이끌 수 있는 리더로서의 이미지를 구축한다',
        
        coreStructure: `
**이재명/김태년 모델 (경제 비전형)**: "시대적 과제 제시 → 핵심 비전/정책명 제시 → 구체적 실행 계획 → 기대 효과 및 국민 동참 호소"
1. **시대적 과제**: "코로나 위기를 극복하고 강하고 빠른 경제회복과 미래전환을 준비해야 합니다"와 같이 현재 경제 상황의 시대적 과제 정의
2. **핵심 비전**: '한국판 뉴딜', '기본소득', '선도형 경제' 등 핵심 경제 정책 브랜드를 명확히 제시하고 필요성 역설
3. **실행 계획**: "디지털 뉴딜, 그린 뉴딜 등에 총 21조 3천억 원을 투자해 일자리 36만 개를 창출"과 같은 구체적 수치와 계획
4. **기대 효과**: "추격형 경제에서 선도형 경제로", "불평등 사회에서 포용 사회로"와 같은 긍정적 미래상 제시`,

        dataGuide: `
**경제 데이터 활용**: GDP 성장률, 일자리 창출 수, 투자 규모, 국제 경쟁력 지수 등 구체적 경제 지표 필수 포함`,
        
        // 배리에이션 A: 혁신 성장형 (이재명 스타일)
        variation1: `
## 배리에이션 A: 혁신 성장형 (이재명 스타일)
**메타태그**: tone(혁신형) + approach(성장형) + structure(전환형)

**구조**: "경제 대전환 필요성 → 혁신 성장 비전 → 디지털·그린 투자 → 선도형 경제 도약"
1. **대전환 선언**: "대한민국 경제의 근본적 전환이 필요한 시점"이라는 강력한 문제 제기
2. **혁신 비전**: '한국판 뉴딜', '기본소득', '디지털 대전환' 등 혁신적 정책 비전 제시
3. **투자 전략**: 디지털·그린·휴먼 뉴딜에 대한 대규모 투자 계획과 구체적 수치 제시
4. **성장 비전**: "추격형에서 선도형으로", "불평등에서 포용으로"의 경제 패러다임 전환 강조

**어조**: 거시적이고 미래지향적인 혁신 리더 어조, 단호하고 자신감 있는 문체
**핵심 어휘**: "대전환", "한국판 뉴딜", "선도형 경제", "포용 성장", "미래 먹거리 산업"`,

        // 배리에이션 B: 민생 경제형 (김태년 스타일)
        variation2: `
## 배리에이션 B: 민생 경제형 (김태년 스타일)  
**메타태그**: tone(민생형) + approach(실용형) + structure(단계형)

**구조**: "서민 경제 현실 → 민생 중심 정책 → 단계별 실행 → 국민 생활 개선"
1. **민생 현실**: 서민과 중산층이 체감하는 경제적 어려움과 현실적 과제 제시
2. **민생 정책**: 일자리 창출, 소득 지원, 주거 안정 등 민생 직결 정책 중심으로 구성
3. **단계별 실행**: 즉시 시행 가능한 정책부터 중장기 구조 개선까지 단계적 로드맵 제시
4. **생활 개선**: "국민 한 분 한 분의 생활이 나아질 것"이라는 구체적 기대 효과 강조

**어조**: 서민 친화적이고 실용적인 민생 정치인 어조, 현실감 있는 정책 제시
**핵심 어휘**: "민생 경제", "서민 생활", "일자리 창출", "소득 증대", "실질적 도움"`,

        // 배리에이션 C: 균형 발전형 (새로운 스타일)
        variation3: `
## 배리에이션 C: 균형 발전형 (새로운 스타일)
**메타태그**: tone(균형형) + approach(지속형) + structure(협력형)

**구조**: "경제 구조 진단 → 균형 발전 비전 → 협력적 실행 → 지속 가능 성장"
1. **구조적 진단**: 한국 경제의 구조적 문제와 잠재력을 균형있게 진단하고 분석
2. **균형 비전**: 대기업과 중소기업, 수도권과 지방, 전통 산업과 신산업 간 균형 발전 비전
3. **협력적 실행**: 정부, 국회, 민간, 지방이 함께하는 협력적 정책 추진 체계 제시
4. **지속 성장**: 단기 성과와 장기 지속성을 동시에 고려한 성장 전략 강조

**어조**: 신중하고 포용적인 조정자 어조, 다양한 이해관계를 아우르는 리더십
**핵심 어휘**: "균형 발전", "상생 협력", "지속 가능", "포용적 성장", "공동 번영"`,

        // 메타태그 정의
        toneA: "혁신형", approachA: "성장형", structureA: "전환형", 
        styleA: "혁신성장전환", politicianA: "이재명스타일",
        
        toneB: "민생형", approachB: "실용형", structureB: "단계형",
        styleB: "민생실용단계", politicianB: "김태년스타일",
        
        toneC: "균형형", approachC: "지속형", structureC: "협력형", 
        styleC: "균형지속협력", politicianC: "새로운스타일"
      };

    case '사회복지':
      return {
        goal: '포용적 복지국가 비전을 제시하여 사회 정의와 국민 복지를 책임지는 정치 리더로서의 이미지를 구축한다',
        
        coreStructure: `
**이재명/김태년 모델 (복지 비전형)**: "복지 사각지대 문제 → 포용 복지 비전 → 보편적 복지 확대 → 복지국가 완성"
1. **사각지대 문제**: 현재 복지 시스템의 한계와 소외되는 국민들의 현실 제시
2. **포용 비전**: '전국민기본소득', '국민취업지원제도' 등 포용적 복지 정책 비전 제시
3. **확대 계획**: 기존 선별 복지에서 보편적 복지로의 패러다임 전환 계획
4. **복지국가**: "누구도 소외되지 않는 따뜻한 복지국가"라는 최종 비전 제시`,

        dataGuide: `
**복지 데이터 활용**: 복지 예산 규모, 수혜자 수, 사각지대 규모, OECD 복지 지출 비교 등 구체적 복지 통계 필수 포함`,
        
        variation1: `
## 배리에이션 A: 기본소득 중심형 (이재명 스타일)
**메타태그**: tone(혁신형) + approach(보편형) + structure(전환형)

**구조**: "복지 패러다임 전환 → 전국민기본소득 → 단계적 확대 → 복지국가 혁신"`,

        variation2: `
## 배리에이션 B: 취약계층 우선형 (김태년 스타일)  
**메타태그**: tone(포용형) + approach(우선형) + structure(단계형)

**구조**: "취약계층 현실 → 맞춤형 지원 → 사회안전망 강화 → 포용사회 실현"`,

        variation3: `
## 배리에이션 C: 생애주기 맞춤형 (새로운 스타일)
**메타태그**: tone(체계형) + approach(맞춤형) + structure(생애형)

**구조**: "생애주기별 복지 욕구 → 맞춤형 복지 체계 → 통합적 서비스 → 전생애 보장"`,

        toneA: "혁신형", approachA: "보편형", structureA: "전환형",
        styleA: "혁신보편전환", politicianA: "이재명스타일",
        
        toneB: "포용형", approachB: "우선형", structureB: "단계형", 
        styleB: "포용우선단계", politicianB: "김태년스타일",
        
        toneC: "체계형", approachC: "맞춤형", structureC: "생애형",
        styleC: "체계맞춤생애", politicianC: "새로운스타일"
      };

    case '환경정책':
      return {
        goal: '탄소중립과 그린뉴딜을 통한 친환경 미래 비전을 제시하여 환경 선도 국가를 이끌 수 있는 리더로서의 이미지를 구축한다',
        
        coreStructure: `
**이재명/김태년 모델 (환경 비전형)**: "기후위기 경고 → 그린뉴딜 비전 → 탄소중립 로드맵 → 지속가능 미래"
1. **위기 인식**: 기후변화와 환경파괴의 심각성, 국제적 대응 필요성 강조
2. **그린 비전**: '그린뉴딜', '탄소중립 2050' 등 친환경 정책 비전과 브랜드 제시
3. **실행 로드맵**: 재생에너지 확대, 친환경 산업 육성 등 구체적 탄소중립 계획
4. **지속 미래**: "깨끗하고 안전한 지구를 다음 세대에게"라는 미래 지향적 비전`,

        dataGuide: `
**환경 데이터 활용**: 탄소배출량, 재생에너지 비율, 환경 투자 규모, 국제 환경 지수 등 환경 통계 필수 포함`,
        
        variation1: `
## 배리에이션 A: 그린뉴딜 주도형 (이재명 스타일)
**핵심**: 대규모 그린뉴딜 투자를 통한 경제-환경 동반 성장 비전`,

        variation2: `
## 배리에이션 B: 생활환경 개선형 (김태년 스타일)  
**핵심**: 국민 일상 속 환경 개선과 실질적 환경 정책 중심`,

        variation3: `
## 배리에이션 C: 국제협력 선도형 (새로운 스타일)
**핵심**: 글로벌 환경 리더십과 국제 환경 협력 강화`,

        toneA: "주도형", approachA: "투자형", structureA: "성장형",
        styleA: "주도투자성장", politicianA: "이재명스타일",
        
        toneB: "생활형", approachB: "개선형", structureB: "실용형",
        styleB: "생활개선실용", politicianB: "김태년스타일",
        
        toneC: "선도형", approachC: "협력형", structureC: "글로벌형",
        styleC: "선도협력글로벌", politicianC: "새로운스타일"
      };

    case '청년정책':
      return {
        goal: '청년세대의 꿈과 희망을 실현할 수 있는 정책 비전을 제시하여 청년들이 신뢰하는 미래 세대 리더로서의 이미지를 구축한다',
        
        coreStructure: `
**이재명/김태년 모델 (청년 비전형)**: "청년 현실 진단 → 청년정책 비전 → 체계적 지원 → 희망찬 미래"
1. **현실 진단**: 취업난, 주거난, 학자금 부담 등 청년세대가 직면한 현실적 어려움 진단
2. **청년 비전**: '청년기본소득', '청년 주거 지원', '일자리 창출' 등 청년 특화 정책 비전
3. **체계적 지원**: 청년 생애주기별 맞춤형 지원 체계와 구체적 실행 방안
4. **희망 미래**: "청년이 꿈꿀 수 있는 대한민국"이라는 희망적 미래상 제시`,

        dataGuide: `
**청년 데이터 활용**: 청년 실업률, 청년 주거비 부담, 학자금 대출 규모, 청년 정책 예산 등 청년 관련 통계 필수 포함`,
        
        variation1: `청년기본소득과 일자리 창출 중심 (이재명 스타일)`,
        variation2: `청년 주거와 생활 안정 중심 (김태년 스타일)`,
        variation3: `청년 성장과 기회 확대 중심 (새로운 스타일)`,

        toneA: "혁신형", approachA: "소득형", structureA: "창출형",
        styleA: "혁신소득창출", politicianA: "이재명스타일",
        
        toneB: "안정형", approachB: "주거형", structureB: "생활형",
        styleB: "안정주거생활", politicianB: "김태년스타일",
        
        toneC: "성장형", approachC: "기회형", structureC: "확대형",
        styleC: "성장기회확대", politicianC: "새로운스타일"
      };

    case '교육정책':
    case '디지털정책':
    case '미래비전':
    default:
      return {
        goal: `${subCategory} 분야의 혁신적 비전을 제시하여 미래를 준비하는 정책 리더로서의 이미지를 구축한다`,
        
        coreStructure: `
**이재명/김태년 모델**: "현재 과제 → 정책 비전 → 실행 계획 → 미래 효과"`,

        dataGuide: `**${subCategory} 데이터 활용**: 해당 분야 핵심 지표와 통계 활용`,
        
        variation1: `## 배리에이션 A: 혁신 선도형`,
        variation2: `## 배리에이션 B: 현실 개선형`,  
        variation3: `## 배리에이션 C: 미래 준비형`,

        toneA: "혁신형", approachA: "선도형", structureA: "전환형",
        styleA: "혁신선도전환", politicianA: "이재명스타일",
        
        toneB: "현실형", approachB: "개선형", structureB: "단계형",
        styleB: "현실개선단계", politicianB: "김태년스타일",
        
        toneC: "미래형", approachC: "준비형", structureC: "체계형",
        styleC: "미래준비체계", politicianC: "새로운스타일"
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
  buildPolicyVisionPrompt,
  getPolicyVisionVariations,
  getPolicyVisionContextualConstraints,
  getPolicyVisionAuthorityGuide,
};