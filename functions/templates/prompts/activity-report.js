// functions/templates/prompts/activity-report.js - 의정활동 보고 프롬프트 (메타태그 기반 배리에이션)

'use strict';

/**
 * 권한 수준별 의정활동 언어 제약사항 가이드
 * @param {string} authority - 권한 수준
 * @returns {string} 언어 가이드
 */
function getActivityAuthorityGuide(authority) {
  switch (authority) {
    case '예비형':
      return `
**예비후보 의정활동 제약사항** (현재 직무권한 없음):
- ✅ 사용 가능: "당선되면 추진하겠습니다", "입법을 위해 노력하겠습니다", "감사 업무를 강화하겠습니다"
- ✅ 관찰자 시점: "현재 국정감사에서 드러난 문제는", "기존 법안의 한계점은"
- ❌ 금지 표현: "국정감사에서 지적했습니다", "법안을 발의했습니다", "위원회에서 논의했습니다"
- ❌ 현재 진행형: 실제로 수행하지 않은 의정활동을 현재형으로 서술 금지
- 💡 전략: 정책 전문성과 미래 비전 중심의 서술, 현역 의원 활동 분석 및 개선안 제시`;
    
    case '현직형':
      return `
**현직 의원 의정활동 가능 표현** (실질적 권한 보유):
- ✅ 현재 진행: "국정감사에서 지적했습니다", "법안을 발의했습니다", "위원회에서 질의했습니다"
- ✅ 구체적 성과: "예산 확보에 성공했습니다", "법안이 통과되었습니다", "제도 개선을 이끌어냈습니다"
- ✅ 미래 계획: "다음 국정감사에서 추궁하겠습니다", "관련 법안을 준비 중입니다"
- 💡 전략: 구체적 성과와 데이터를 바탕으로 한 신뢰성 있는 보고`;
    
    default:
      return `
**일반적 의정활동 표현**: 특별한 제약사항 없음`;
  }
}

/**
 * 의정활동 보고 프롬프트 생성 - 3가지 배리에이션 동시 생성
 * @param {Object} options - 프롬프트 생성 옵션 (실제 가이드라인 포함)
 * @returns {string} 생성된 프롬프트
 */
function buildActivityReportPrompt(options) {
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
  const position = authorPosition || '국회의원';
  const bio = authorBio || '';
  const status = authorStatus || '현역';
  const kw = keywords || '';
  const regionLabel = [regionMetro, regionLocal].filter(Boolean).join(' ').trim();
  const honorific = regionLabel ? `${regionLabel} 주민 여러분` : '국민 여러분';

  // 상황 강제 메타태그 (사용자 프로필에서 자동 추출)
  const contextualConstraints = getActivityContextualConstraints(options);
  
  // 세부 카테고리에 따른 3가지 배리에이션 정의
  const variations = getActivityVariations(subCategory, contextualConstraints);

  return `
# AI비서관 - 의정활동 보고형 글쓰기 (${subCategory})

${policy.body}

[🎯 의정활동 보고 목표]
입법, 예산 심의, 행정부 견제 등 의정활동의 구체적인 성과를 제시하여 ${variations.goal}

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

[🔍 의정활동 핵심 구조 (한정애/정청래 모델)]
1. **문제 제기**: 충격적인 통계나 사실을 헤드라인으로 제시
2. **근거 제시**: 정부 부처 자료, 통계청 데이터, 관련 법률 조항 등 객관적 자료 인용
3. **핵심 주장**: 문제의 핵심을 명확히 지적하고 질의
4. **대안 제시**: 구체적이고 실행 가능한 해결책 제시 및 촉구

[💡 작성자 전문성 활용]
작성자 소개를 바탕으로 해당 분야의 전문성이나 위원회 경험을 자연스럽게 반영하세요.
전문 경험 언급 시: "제가 [위원회/분야]에서 활동하며 확인한 바로는..." 형식 사용

[🎨 3가지 배리에이션 생성 지침]
같은 의정활동 주제로 서로 다른 전문가적 접근의 3가지 원고를 생성하되, 각각 고유한 의정활동 스타일과 차별화된 분석 방법을 가져야 합니다.

[⚖️ 권한 수준별 언어 제약사항]
${getActivityAuthorityGuide(contextualConstraints.authority)}

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
      "category": "의정활동",
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
      "category": "의정활동",
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
      "category": "의정활동",
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
 * 의정활동 상황 강제 메타태그 추출
 * @param {Object} options - 사용자 프로필 정보
 * @returns {Object} 상황 강제 제약사항
 */
function getActivityContextualConstraints(options) {
  const { authorStatus, regionMetro, regionLocal, authorPosition } = options;
  
  return {
    // 권한 수준 (강제)
    authority: authorStatus === '예비' ? '예비형' : '현직형',
    
    // 지역 규모 (강제)  
    regionScale: getRegionScale(regionMetro, regionLocal),
    
    // 의정활동 유형 (권한에 따른 제약)
    activityType: authorStatus === '예비' ? '정책연구형' : '실제수행형'
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
 * 세부 카테고리별 3가지 배리에이션 정의 (의정활동 특화)
 * @param {string} subCategory - 세부 카테고리
 * @param {Object} constraints - 상황 강제 제약사항
 * @returns {Object} 배리에이션 정보
 */
function getActivityVariations(subCategory, constraints) {
  
  switch (subCategory) {
    case '국정감사':
      return {
        goal: '행정부 견제와 문제 발굴을 통해 유능하고 치밀한 감시자 이미지를 구축한다',
        
        // 배리에이션 A: 데이터 중심형 (한정애 스타일)
        variation1: `
## 배리에이션 A: 데이터 중심형 (한정애 스타일)
**메타태그**: tone(논리형) + approach(데이터형) + structure(직진형)

**구조**: "충격적 통계 제시 → 체계적 데이터 분석 → 논리적 문제 지적 → 근거 기반 대안"
1. **충격적 도입**: "해외 수감 국민 1,084명!" 식의 헤드라인으로 문제 심각성 부각
2. **데이터 중심**: 정부 부처 제출 자료, 통계청 데이터를 체계적으로 분석하여 근거 제시
3. **논리적 지적**: 수치와 비교 분석을 통해 문제의 핵심을 명확하고 객관적으로 지적
4. **직진적 대안**: "관계부처 협의를 통해 인력을 대폭 확대해야 한다"는 구체적 해결책

**어조**: 차분하고 논리적인 분석가 어조, 데이터가 말하는 객관적 진실 중시
**핵심 어휘**: "자료에 따르면", "통계 분석 결과", "수치상으로 확인되는", "객관적 데이터가 보여주는"`,

        // 배리에이션 B: 개혁 추진형 (정청래 스타일) 
        variation2: `
## 배리에이션 B: 개혁 추진형 (정청래 스타일)  
**메타태그**: tone(비판형) + approach(개혁형) + structure(점층형)

**구조**: "문제 폭로 → 제도적 모순 지적 → 강력한 개혁 의지 → 촉구와 다짐"
1. **폭로적 도입**: "검사만 파면 징계에서 제외되는 것은 특권"과 같이 제도적 모순을 강하게 제기
2. **구조적 분석**: 개별 사안을 넘어 시스템의 구조적 문제와 기득권 보호 메커니즘 분석
3. **점층적 비판**: 문제 → 원인 → 책임 → 해결 순으로 강도 높은 비판과 개혁 의지 표명
4. **강력한 촉구**: "검사징계법에 '파면'을 추가해야 한다" 등 단호한 개혁 조치 요구

**어조**: 날카롭고 비판적인 개혁자 어조, 기득권에 대한 강한 문제 제기
**핵심 어휘**: "지적하지 않을 수 없습니다", "강력히 촉구합니다", "제도 개선이 시급합니다", "특권을 철폐해야"`,

        // 배리에이션 C: 정책 전문형 (새로운 스타일)
        variation3: `
## 배리에이션 C: 정책 전문형 (새로운 스타일)
**메타태그**: tone(건설형) + approach(정책형) + structure(균형형)

**구조**: "현황 진단 → 법제도 분석 → 정책적 개선방안 → 단계적 실행계획"
1. **전문적 진단**: 해당 분야의 현황을 전문적 관점에서 정확히 진단하고 문제점 도출
2. **법제도 분석**: 관련 법률 조항과 제도적 근거를 면밀히 검토하여 개선 필요성 제시
3. **균형적 접근**: 문제 지적과 함께 현실적 제약과 가능한 해결 방안을 균형있게 제시
4. **단계적 해결**: 즉시 조치 가능한 것부터 중장기 개선과제까지 체계적 로드맵 제시

**어조**: 침착하고 전문적인 정책 전문가 어조, 건설적 해결책 중시
**핵심 어휘**: "전문적 검토 결과", "제도적 개선방안", "단계적 접근이 필요", "현실적 대안을 모색"`,

        // 메타태그 정의
        toneA: "논리형", approachA: "데이터형", structureA: "직진형", 
        styleA: "논리데이터직진", politicianA: "한정애스타일",
        
        toneB: "비판형", approachB: "개혁형", structureB: "점층형",
        styleB: "비판개혁점층", politicianB: "정청래스타일",
        
        toneC: "건설형", approachC: "정책형", structureC: "균형형", 
        styleC: "건설정책균형", politicianC: "새로운스타일"
      };

    case '법안발의':
      return {
        goal: '입법 필요성과 구체적 조문을 제시하여 입법 전문가로서의 역량과 정책 실현 의지를 보여준다',
        
        variation1: `
## 배리에이션 A: 논리적 입법형 (한정애 스타일)
**메타태그**: tone(논리형) + approach(데이터형) + structure(직진형)

**구조**: "입법 필요성 통계 → 현행법 한계 분석 → 법안 핵심 내용 → 효과 예측"
1. **통계적 필요성**: 구체적 수치로 입법 필요성을 명확히 제시
2. **현행법 분석**: 기존 법률의 한계와 사각지대를 체계적으로 분석
3. **직진적 내용**: 법안의 핵심 조문과 주요 내용을 명확하고 이해하기 쉽게 설명
4. **효과 예측**: 법안 통과 시 예상되는 구체적 효과를 데이터로 제시

**어조**: 차분하고 논리적인 입법자 어조, 법률 전문성과 실용성 강조
**핵심 어휘**: "입법 필요성이 대두", "현행법의 한계", "법안의 핵심 내용", "입법 효과 분석"`,

        variation2: `
## 배리에이션 B: 개혁 의지형 (정청래 스타일)  
**메타태그**: tone(비판형) + approach(개혁형) + structure(점층형)

**구조**: "제도적 모순 폭로 → 개혁 의지 표명 → 강력한 법안 내용 → 반드시 통과 다짐"
1. **모순 폭로**: 현행 제도의 불합리함과 기득권 보호 구조를 강하게 비판
2. **개혁 의지**: 이런 문제를 해결하기 위한 강력한 개혁 의지와 사명감 표명
3. **점층적 개혁**: 문제 해결을 위한 단계별 개혁 조치를 강도 높게 제시
4. **의지적 다짐**: 법안 통과를 위한 강력한 의지와 국민에 대한 약속 표명

**어조**: 강한 개혁 의지가 담긴 결연한 어조, 변화에 대한 확고한 신념
**핵심 어휘**: "이대로 둘 수 없습니다", "반드시 개선해야", "강력한 법안을 발의", "끝까지 노력하겠습니다"`,

        variation3: `
## 배리에이션 C: 협력적 입법형 (새로운 스타일)
**메타태그**: tone(건설형) + approach(정책형) + structure(균형형)

**구조**: "사회적 요구 분석 → 다양한 의견 수렴 → 합리적 법안 설계 → 협력 추진 계획"
1. **요구 분석**: 시민사회와 전문가들의 다양한 의견과 사회적 요구사항 종합 분석
2. **의견 수렴**: 이해관계자들의 입장을 폭넓게 수렴하고 균형점을 찾는 과정 소개
3. **균형적 설계**: 다양한 관점을 고려한 합리적이고 현실적인 법안 내용 제시
4. **협력 계획**: 여야 간 협력과 사회적 합의를 통한 법안 통과 추진 계획

**어조**: 포용적이고 협력적인 조정자 어조, 사회적 합의와 협력 중시
**핵심 어휘**: "다양한 의견을 수렴", "사회적 합의 도출", "협력을 통한 해결", "균형잡힌 접근"`,

        toneA: "논리형", approachA: "데이터형", structureA: "직진형",
        styleA: "논리데이터직진", politicianA: "한정애스타일",
        
        toneB: "비판형", approachB: "개혁형", structureB: "점층형", 
        styleB: "비판개혁점층", politicianB: "정청래스타일",
        
        toneC: "건설형", approachC: "정책형", structureC: "균형형",
        styleC: "건설정책균형", politicianC: "새로운스타일"
      };

    case '위원회활동':
      return {
        goal: '전문 위원회에서의 활동을 통해 해당 분야 전문가로서의 역량과 협업 능력을 보여준다',
        
        variation1: `
## 배리에이션 A: 전문 분석형 (한정애 스타일)
**메타태그**: tone(논리형) + approach(데이터형) + structure(직진형)

**구조**: "전문 이슈 발굴 → 심층 자료 분석 → 전문적 질의 → 정책 개선안"
1. **전문적 발굴**: 해당 분야의 전문적 지식을 바탕으로 중요한 이슈를 발굴하고 제기
2. **심층 분석**: 관련 데이터와 자료를 전문적 관점에서 심층 분석하여 근거 제시
3. **직진적 질의**: 핵심을 찌르는 명확하고 구체적인 질의로 문제점 부각
4. **개선 방안**: 전문성을 바탕으로 한 실현 가능한 정책 개선 방안 제시

**어조**: 해당 분야 전문가다운 깊이 있는 분석과 차분한 논리 전개
**핵심 어휘**: "전문적 검토", "심층 분석 결과", "해당 분야에서", "전문가적 관점에서"`,

        variation2: `
## 배리에이션 B: 개혁 견인형 (정청래 스타일)
**메타태그**: tone(비판형) + approach(개혁형) + structure(점층형)

**구조**: "구조적 문제 제기 → 제도 개혁 필요성 → 위원회 차원 대응 → 강력한 개혁 추진"
1. **구조적 문제**: 해당 분야의 구조적이고 근본적인 문제점을 날카롭게 제기
2. **개혁 필요성**: 기존 시스템의 한계를 극복하기 위한 제도 개혁의 절박한 필요성 강조
3. **점층적 대응**: 위원회 차원에서 할 수 있는 다양한 견제와 개혁 조치들을 단계별로 제시
4. **강력한 추진**: 개혁을 위한 강력한 의지와 지속적인 추진 계획 표명

**어조**: 개혁에 대한 강한 의지와 기존 시스템에 대한 날카로운 비판
**핵심 어휘**: "구조적 개혁이 필요", "위원회 차원에서 강력히", "제도 개선을 위해", "지속적으로 추진"`,

        variation3: `
## 배리에이션 C: 협력 조정형 (새로운 스타일)  
**메타태그**: tone(건설형) + approach(정책형) + structure(균형형)

**구조**: "다양한 입장 정리 → 전문가 의견 수렴 → 위원회 합의 도출 → 정책 방향 제시"
1. **입장 정리**: 해당 이슈에 대한 다양한 이해관계자들의 입장을 객관적으로 정리
2. **전문가 수렴**: 각 분야 전문가들의 의견을 폭넓게 수렴하고 검토하는 과정 소개
3. **균형적 합의**: 위원회 내 다양한 의견을 조율하여 합리적 합의점을 도출하는 과정
4. **방향 제시**: 사회적 합의를 바탕으로 한 건설적이고 현실적인 정책 방향 제시

**어조**: 조화롭고 협력적인 중재자 어조, 다양한 의견의 균형과 합의 중시
**핵심 어휘**: "다양한 의견을 종합", "위원회 합의를 통해", "균형잡힌 접근", "건설적 논의 결과"`,

        toneA: "논리형", approachA: "데이터형", structureA: "직진형",
        styleA: "논리데이터직진", politicianA: "한정애스타일",
        
        toneB: "비판형", approachB: "개혁형", structureB: "점층형",
        styleB: "비판개혁점층", politicianB: "정청래스타일",
        
        toneC: "건설형", approachC: "정책형", structureC: "균형형",
        styleC: "건설정책균형", politicianC: "새로운스타일"
      };

    case '질의응답':
      return {
        goal: '날카로운 질의를 통해 정부의 답변을 이끌어내고 정책적 성과를 보여주는 유능한 견제자 이미지를 구축한다',
        
        variation1: `
## 배리에이션 A: 논리 추궁형 (한정애 스타일)
**메타태그**: tone(논리형) + approach(데이터형) + structure(직진형)

**구조**: "팩트 기반 질의 → 데이터 교차검증 → 논리적 모순 지적 → 명확한 답변 요구"
1. **팩트 기반**: 정확한 데이터와 자료를 근거로 한 구체적이고 명확한 질의 제기
2. **교차 검증**: 여러 자료를 교차 검증하여 정부 답변의 일관성과 신뢰성 검토
3. **직진적 추궁**: 핵심을 벗어나지 않는 논리적이고 체계적인 추가 질의
4. **명확한 요구**: 구체적이고 측정 가능한 답변과 해결 방안을 요구

**어조**: 차분하지만 날카로운 분석가 어조, 팩트와 논리에 기반한 추궁
**핵심 어휘**: "구체적으로 답변해주십시오", "자료에 따르면", "앞서 답변과 모순", "명확한 계획을 제시"`,

        variation2: `
## 배리에이션 B: 강력 추궁형 (정청래 스타일)
**메타태그**: tone(비판형) + approach(개혁형) + structure(점층형)

**구조**: "문제 핵심 공격 → 책임 소재 추궁 → 강도 높은 압박 → 즉시 개선 요구"
1. **핵심 공격**: 문제의 가장 민감하고 핵심적인 부분을 직격으로 공격하는 질의
2. **책임 추궁**: 개인적 책임과 제도적 책임을 명확히 구분하여 강력하게 추궁
3. **점층적 압박**: 단계별로 강도를 높여가며 정부를 압박하는 연속 질의
4. **즉시 요구**: 즉각적인 조치와 개선을 강력하게 요구하는 마무리

**어조**: 강력하고 단호한 추궁자 어조, 문제에 대한 강한 분노와 개혁 의지
**핵심 어휘**: "도대체 언제까지", "책임을 져야", "즉시 시정하라", "이런 식으로는 안 된다"`,

        variation3: `
## 배리에이션 C: 건설적 질의형 (새로운 스타일)
**메타태그**: tone(건설형) + approach(정책형) + structure(균형형)

**구조**: "현황 확인 질의 → 정책 방향 확인 → 개선 방안 논의 → 협력 방안 모색"
1. **현황 확인**: 정책 현황과 추진 상황을 정확히 파악하기 위한 체계적 질의
2. **방향 확인**: 정부의 정책 방향과 의도를 명확히 하고 적절성을 검토
3. **균형적 논의**: 문제점 지적과 함께 현실적 제약도 고려한 균형있는 논의
4. **협력 모색**: 정부와 국회가 함께 문제를 해결할 수 있는 협력 방안 모색

**어조**: 건설적이고 협력적인 동반자 어조, 문제 해결을 위한 공동 노력 중시
**핵심 어휘**: "함께 고민해보자", "보다 나은 방안", "협력하여 해결", "건설적 제안"`,

        toneA: "논리형", approachA: "데이터형", structureA: "직진형",
        styleA: "논리데이터직진", politicianA: "한정애스타일",
        
        toneB: "비판형", approachB: "개혁형", structureB: "점층형",
        styleB: "비판개혁점층", politicianB: "정청래스타일",
        
        toneC: "건설형", approachC: "정책형", structureC: "균형형", 
        styleC: "건설정책균형", politicianC: "새로운스타일"
      };

    case '예산심사':
      return {
        goal: '재정 효율성과 우선순위를 분석하여 국민의 세금을 책임지는 재정 전문가 이미지를 구축한다',
        
        variation1: `
## 배리에이션 A: 효율성 분석형 (한정애 스타일)
**메타태그**: tone(논리형) + approach(데이터형) + structure(직진형)

**구조**: "예산 현황 분석 → 효율성 지표 검토 → 문제점 지적 → 개선 방안 제시"
1. **현황 분석**: 해당 부처나 사업의 예산 현황과 집행 실적을 정확한 수치로 분석
2. **효율성 검토**: 투입 대비 성과, 유사 사업과의 비교 등 객관적 효율성 지표 검토
3. **직진적 지적**: 예산 낭비나 비효율 요소를 데이터로 명확히 지적하고 개선 요구
4. **방안 제시**: 예산 효율성을 높일 수 있는 구체적이고 실현 가능한 방안 제시

**어조**: 꼼꼼하고 분석적인 회계사 어조, 수치와 효율성에 기반한 객관적 평가
**핵심 어휘**: "예산 집행률", "비용 대비 효과", "유사 사업과 비교", "효율성 제고 방안"`,

        variation2: `
## 배리에이션 B: 우선순위 재조정형 (정청래 스타일)
**메타태그**: tone(비판형) + approach(개혁형) + structure(점층형)

**구조**: "잘못된 우선순위 비판 → 서민을 위한 예산 부족 지적 → 예산 재배분 요구 → 강력한 의지 표명"
1. **우선순위 비판**: 기득권이나 특정 계층을 위한 예산에 치우친 잘못된 우선순위 강력 비판
2. **부족 지적**: 서민과 서민층을 위한 핵심 예산이 부족한 현실을 강하게 지적
3. **점층적 요구**: 단계별로 강도를 높여가며 예산 재배분과 우선순위 조정을 요구
4. **의지 표명**: 서민을 위한 예산 확보를 위한 강력한 의지와 지속적 노력 다짐

**어조**: 서민을 대변하는 강한 의지가 담긴 어조, 기득권에 대한 날카로운 비판
**핵심 어휘**: "서민을 위한 예산", "우선순위가 잘못됐다", "예산 재배분이 필요", "반드시 확보하겠다"`,

        variation3: `
## 배리에이션 C: 균형적 재정형 (새로운 스타일)
**메타태그**: tone(건설형) + approach(정책형) + structure(균형형)

**구조**: "재정 여건 분석 → 다양한 요구 검토 → 균형점 모색 → 지속가능 방안"
1. **여건 분석**: 현재 재정 상황과 제약 조건을 정확히 파악하고 현실적 접근
2. **요구 검토**: 다양한 분야와 계층의 예산 요구사항을 공정하게 검토하고 평가
3. **균형적 모색**: 한정된 재원 내에서 최적의 배분과 우선순위를 균형있게 모색
4. **지속가능성**: 단기적 효과뿐만 아니라 장기적 지속가능성을 고려한 예산 방안

**어조**: 신중하고 균형감 있는 재정 관리자 어조, 현실과 이상의 조화 추구
**핵심 어휘**: "재정 여건을 고려", "균형잡힌 배분", "지속가능한 재정", "단계적 개선"`,

        toneA: "논리형", approachA: "데이터형", structureA: "직진형",
        styleA: "논리데이터직진", politicianA: "한정애스타일",
        
        toneB: "비판형", approachB: "개혁형", structureB: "점층형",
        styleB: "비판개혁점층", politicianB: "정청래스타일",
        
        toneC: "건설형", approachC: "정책형", structureC: "균형형",
        styleC: "건설정책균형", politicianC: "새로운스타일"
      };

    case '정책토론':
    default:
      return {
        goal: '다양한 관점을 제시하고 합리적 결론을 도출하여 정책 조정자로서의 역량과 리더십을 보여준다',
        
        variation1: `
## 배리에이션 A: 분석적 토론형 (한정애 스타일)
**메타태그**: tone(논리형) + approach(데이터형) + structure(직진형)

**구조**: "쟁점 정리 → 객관적 분석 → 근거 기반 입장 → 합리적 결론"
1. **쟁점 정리**: 정책 토론의 핵심 쟁점과 논의 사항을 명확하고 체계적으로 정리
2. **객관적 분석**: 각 입장의 근거와 논리를 객관적으로 분석하고 장단점 평가
3. **직진적 입장**: 데이터와 분석에 기반한 명확하고 일관된 자신의 입장 제시
4. **합리적 결론**: 논리적 분석을 통해 도출한 합리적이고 현실적인 결론 제시

**어조**: 냉철하고 분석적인 정책 전문가 어조, 감정보다는 논리와 데이터 중시
**핵심 어휘**: "객관적으로 분석하면", "데이터가 보여주는", "합리적 판단", "논리적 결론"`,

        variation2: `
## 배리에이션 B: 가치 지향형 (정청래 스타일)
**메타태그**: tone(비판형) + approach(개혁형) + structure(점층형)

**구조**: "가치와 원칙 제시 → 현실 문제 지적 → 개혁 방향 제시 → 강력한 의지 표명"
1. **가치 제시**: 정책 판단의 기준이 되는 핵심 가치와 원칙을 명확히 제시
2. **문제 지적**: 현행 정책이나 제도가 이런 가치에 부합하지 않는 문제점을 강하게 지적
3. **점층적 방향**: 문제 해결을 위한 단계별 개혁 방향과 구체적 실행 계획 제시
4. **의지 표명**: 가치 실현과 개혁을 위한 강력한 의지와 지속적 노력 다짐

**어조**: 신념과 가치가 확고한 개혁자 어조, 원칙에 대한 흔들림 없는 신념
**핵심 어휘**: "원칙적으로", "가치에 부합하는", "반드시 개혁해야", "신념을 갖고"`,

        variation3: `
## 배리에이션 C: 조화 추구형 (새로운 스타일)
**메타태그**: tone(건설형) + approach(정책형) + structure(균형형)

**구조**: "다양한 의견 경청 → 공통분모 발굴 → 조화점 모색 → 합의 방안 제시"
1. **의견 경청**: 토론 참여자들의 다양한 의견과 우려사항을 폭넓게 경청하고 정리
2. **공통분모 발굴**: 서로 다른 입장에서도 공감할 수 있는 공통의 가치와 목표 발굴
3. **균형적 모색**: 대립되는 이해관계를 조율하고 상호 양보 가능한 조화점 모색
4. **합의 방안**: 모든 이해관계자가 수용할 수 있는 현실적이고 지속가능한 합의 방안

**어조**: 포용적이고 조화로운 중재자 어조, 대화와 타협을 통한 문제 해결 추구
**핵심 어휘**: "함께 고민해봅시다", "상호 이해를 바탕으로", "조화로운 해결", "모두가 수용할 수 있는"`,

        toneA: "논리형", approachA: "데이터형", structureA: "직진형",
        styleA: "논리데이터직진", politicianA: "한정애스타일",
        
        toneB: "비판형", approachB: "개혁형", structureB: "점층형",
        styleB: "비판개혁점층", politicianB: "정청래스타일",
        
        toneC: "건설형", approachC: "정책형", structureC: "균형형",
        styleC: "건설정책균형", politicianC: "새로운스타일"
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
  buildActivityReportPrompt,
  getActivityVariations,
  getActivityContextualConstraints,
  getActivityAuthorityGuide,
};