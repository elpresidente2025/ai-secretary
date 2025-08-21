// functions/templates/prompts/press-release.js - 보도자료 프롬프트 (정청래/박지원/박홍근 모델 기반)

'use strict';

/**
 * 권한 수준별 보도자료 언어 제약사항 가이드
 * @param {string} authority - 권한 수준
 * @returns {string} 언어 가이드
 */
function getPressReleaseAuthorityGuide(authority) {
  switch (authority) {
    case '예비형':
      return `
**예비후보 보도자료 제약사항** (공식 직책 권한 없음):
- ✅ 사용 가능: "우려를 표명합니다", "입장을 밝힙니다", "촉구합니다"
- ✅ 관찰자 시점: "지켜보고 있습니다", "문제를 제기합니다"
- ❌ 금지 표현: "의회 차원에서 대응하겠습니다", "공식 조사를 요구합니다"
- ❌ 과도한 권위: 의원급 권한을 전제로 한 강한 표현 금지
- 💡 전략: 시민사회 관점에서 문제 제기, 당선 후 해결 의지 표명`;
    
    case '현직형':
      return `
**현직 의원 보도자료 가능 표현** (공식 직책 권한 보유):
- ✅ 강력한 표현: "강력히 규탄합니다", "즉시 중단하라", "책임을 묻겠습니다"
- ✅ 공식 조치: "국정감사에서 추궁하겠습니다", "관련 법안을 발의하겠습니다"
- ✅ 제도적 대응: "의회 차원에서 대응하겠습니다", "공식 해명을 요구합니다"
- 💡 전략: 의원 권한 내에서 강력하고 구체적인 대응 방안 제시`;
    
    default:
      return `
**일반적 보도자료 표현**: 특별한 제약사항 없음`;
  }
}

/**
 * 보도자료 프롬프트 생성 - 정청래/박지원/박홍근 모델 기반 3가지 배리에이션
 * @param {Object} options - 프롬프트 생성 옵션 (실제 가이드라인 포함)
 * @returns {string} 생성된 프롬프트
 */
function buildPressReleasePrompt(options) {
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
  const contextualConstraints = getPressReleaseContextualConstraints(options);
  
  // 세부 카테고리에 따른 보도자료 유형과 3가지 배리에이션 정의
  const variations = getPressReleaseVariations(subCategory, contextualConstraints);

  return `
# AI비서관 - 보도자료 작성 (${subCategory})

${policy.body}

[🎯 보도자료 목표]
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
모든 주장과 비판에는 반드시 구체적 근거와 출처 명시 필수: [출처: 기관명/자료명]

[🔍 보도자료 핵심 구조]
${variations.coreStructure}

[📺 언론 배포 가이드]
${variations.mediaGuide}

[💡 작성자 전문성 활용]
작성자 소개를 바탕으로 해당 이슈에 대한 전문성이나 관련 경험을 자연스럽게 반영하세요.
전문 경험 언급 시: "제가 [분야/경험]에서 확인한 바로는..." 형식 사용

[🎨 3가지 배리에이션 생성 지침]
같은 보도자료 주제로 서로 다른 정치적 접근의 3가지 원고를 생성하되, 각각 고유한 보도자료 스타일과 차별화된 대응 전략을 가져야 합니다.

[⚖️ 권한 수준별 언어 제약사항]
${getPressReleaseAuthorityGuide(contextualConstraints.authority)}

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
      "category": "보도자료",
      "subCategory": "${subCategory}",
      "personalPreferences": {
        "tone": "${variations.toneA}",
        "approach": "${variations.approachA}",
        "structure": "${variations.structureA}"
      },
      "contextualConstraints": {
        "authority": "${contextualConstraints.authority}",
        "regionScale": "${contextualConstraints.regionScale}",
        "releaseType": "${contextualConstraints.releaseType}"
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
      "category": "보도자료",
      "subCategory": "${subCategory}",
      "personalPreferences": {
        "tone": "${variations.toneB}",
        "approach": "${variations.approachB}",
        "structure": "${variations.structureB}"
      },
      "contextualConstraints": {
        "authority": "${contextualConstraints.authority}",
        "regionScale": "${contextualConstraints.regionScale}",
        "releaseType": "${contextualConstraints.releaseType}"
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
      "category": "보도자료",
      "subCategory": "${subCategory}",
      "personalPreferences": {
        "tone": "${variations.toneC}",
        "approach": "${variations.approachC}",
        "structure": "${variations.structureC}"
      },
      "contextualConstraints": {
        "authority": "${contextualConstraints.authority}",
        "regionScale": "${contextualConstraints.regionScale}",
        "releaseType": "${contextualConstraints.releaseType}"
      },
      "politician": "${variations.politicianC}"
    }
  }
]
`.trim();
}

/**
 * 보도자료 상황 강제 메타태그 추출
 * @param {Object} options - 사용자 프로필 정보
 * @returns {Object} 상황 강제 제약사항
 */
function getPressReleaseContextualConstraints(options) {
  const { authorStatus, regionMetro, regionLocal, authorPosition } = options;
  
  return {
    // 권한 수준 (강제)
    authority: authorStatus === '예비' ? '예비형' : '현직형',
    
    // 지역 규모 (강제)  
    regionScale: getRegionScale(regionMetro, regionLocal),
    
    // 보도자료 유형 (권한에 따른 제약)
    releaseType: authorStatus === '예비' ? '시민사회형' : '의회공식형'
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
 * 세부 카테고리별 3가지 배리에이션 정의 (보도자료 특화)
 * @param {string} subCategory - 세부 카테고리
 * @param {Object} constraints - 상황 강제 제약사항
 * @returns {Object} 배리에이션 정보
 */
function getPressReleaseVariations(subCategory, constraints) {
  
  // 공격형 보도자료 (논평, 성명서)
  if (['논평', '성명서'].includes(subCategory)) {
    return {
      goal: '정치적 현안에 대해 신속하고 명확하게 입장을 표명하여 여론을 주도하고 정치적 선명성을 부각한다',
      
      coreStructure: `
**정청래/박지원 모델 (공격형)**: "문제 제기 → 팩트/논리 기반 비판 → 행동 촉구"
1. **문제 제기**: 정치적 쟁점에 대해 상대방의 문제점을 직설적으로 지적 ("제 식구 감싸기")
2. **팩트 비판**: 구체적 데이터나 사실(불기소율 99% 등)을 근거로 한 논리적 비판 전개
3. **행동 촉구**: 구체적인 행동(법안 처리, 사과, 사퇴 등)을 강력하게 촉구하며 마무리`,

      mediaGuide: `
**언론 배포**: 공식 로고가 포함된 보도자료 형태, 강력한 어조로 주목도 높임`,
      
      // 배리에이션 A: 강력 공격형 (정청래 스타일)
      variation1: `
## 배리에이션 A: 강력 공격형 (정청래 스타일)
**메타태그**: tone(공격형) + approach(직설형) + structure(촉구형)

**구조**: "강력한 문제 제기 → 팩트 기반 직격탄 → 즉시 조치 촉구 → 지속 추궁 다짐"
1. **강력한 도입**: "도대체 언제까지 이런 식으로..."와 같이 강한 어조로 문제의 심각성 부각
2. **팩트 직격탄**: 구체적 수치와 사실을 바탕으로 상대방의 모순과 허점을 직설적으로 공격
3. **즉시 조치 촉구**: "즉시 사과하라", "당장 중단하라" 등 강력하고 구체적인 요구사항 제시
4. **지속 추궁**: "끝까지 추궁하겠다", "책임을 묻겠다"는 강한 의지와 다짐 표명

**어조**: 날카롭고 단호한 공격자 어조, 강한 분노와 정의감 표출
**핵심 어휘**: "강력히 규탄한다", "도대체 언제까지", "즉시 중단하라", "결코 좌시하지 않겠다"`,

      // 배리에이션 B: 풍자 공격형 (박지원 스타일)
      variation2: `
## 배리에이션 B: 풍자 공격형 (박지원 스타일)  
**메타태그**: tone(풍자형) + approach(비유형) + structure(역설형)

**구조**: "상황 묘사 → 비유와 풍자 → 역설적 지적 → 신랄한 마무리"
1. **상황 묘사**: 현재 상황을 생생하고 구체적으로 묘사하여 독자의 상황 인식 제고
2. **비유와 풍자**: 적절한 비유나 풍자를 통해 상대방의 모순을 우회적이지만 날카롭게 지적
3. **역설적 지적**: "참으로 놀라운 일이다", "대단한 발상이다" 등 역설적 표현으로 비판 효과 극대화
4. **신랄한 마무리**: 유머와 풍자 속에 담긴 날카로운 비판으로 강한 인상 남기며 마무리

**어조**: 지적이고 세련된 풍자가 어조, 유머 속에 담긴 날카로운 비판
**핵심 어휘**: "참으로 놀라운", "이해할 수 없는", "기가 막힌", "이 정도면 예술이다"`,

      // 배리에이션 C: 논리 분석형 (새로운 스타일)
      variation3: `
## 배리에이션 C: 논리 분석형 (새로운 스타일)
**메타태그**: tone(논리형) + approach(분석형) + structure(체계형)

**구조**: "문제 분석 → 체계적 반박 → 논리적 결론 → 합리적 요구"
1. **문제 분석**: 이슈의 핵심을 체계적으로 분석하고 문제점을 논리적으로 정리
2. **체계적 반박**: 상대방 주장의 논리적 오류나 사실 왜곡을 단계별로 반박
3. **논리적 결론**: 분석과 반박을 토대로 한 명확하고 논리적인 결론 도출
4. **합리적 요구**: 감정적 공격보다는 합리적이고 건설적인 해결 방안 요구

**어조**: 차분하고 논리적인 분석가 어조, 객관적 근거와 논리 중시
**핵심 어휘**: "분석해보면", "논리적으로 보면", "객관적 사실은", "합리적 해결방안"`,

      // 메타태그 정의
      toneA: "공격형", approachA: "직설형", structureA: "촉구형", 
      styleA: "공격직설촉구", politicianA: "정청래스타일",
      
      toneB: "풍자형", approachB: "비유형", structureB: "역설형",
      styleB: "풍자비유역설", politicianB: "박지원스타일",
      
      toneC: "논리형", approachC: "분석형", structureC: "체계형", 
      styleC: "논리분석체계", politicianC: "새로운스타일"
    };
  }
  
  // 방어형 보도자료 (가짜뉴스반박)
  else if (['가짜뉴스반박'].includes(subCategory)) {
    return {
      goal: '허위사실과 악의적 공격에 대해 신속하고 정확하게 반박하여 신뢰도를 방어하고 진실을 알린다',
      
      coreStructure: `
**가짜뉴스 반박 모델 (방어형)**: "상대 주장 요약 → 증거 제시를 통한 반박 → 역공 및 재발 방지 촉구"
1. **주장 요약**: 상대방의 허위 주장을 명확하고 객관적으로 요약하여 독자의 이해 도모
2. **증거 반박**: 객관적 자료(의정보고서, 활동기록 등)를 근거로 조목조목 사실 관계 정정
3. **역공 촉구**: "더 이상의 허위사실 유포를 멈추라"며 역공을 가하고 재발 방지 촉구`,

      mediaGuide: `
**언론 배포**: 반박 근거가 되는 자료 캡처와 함께 객관적이고 신뢰성 있는 형태로 배포`,
      
      // 방어형 배리에이션들
      variation1: `
## 배리에이션 A: 사실 확인형 (객관적 반박)
**메타태그**: tone(객관형) + approach(사실형) + structure(반박형)

**구조**: "허위 주장 정리 → 사실 확인 → 증거 제시 → 정정 요구"
1. **허위 주장 정리**: 상대방의 주장을 정확하고 객관적으로 인용하여 무엇이 문제인지 명확화
2. **사실 확인**: 공식 자료와 기록을 통해 실제 사실 관계를 정확히 확인하고 제시
3. **증거 제시**: 의정활동 보고서, 공식 문서, 언론 보도 등 객관적 증거를 체계적으로 제시
4. **정정 요구**: 허위사실 유포자에게 정정 보도와 사과를 정중하지만 단호하게 요구

**어조**: 차분하고 객관적인 사실 확인자 어조, 감정보다는 사실과 증거 중심
**핵심 어휘**: "사실 확인 결과", "객관적 자료", "명백한 허위사실", "정정을 요구합니다"`,

      variation2: `
## 배리에이션 B: 강력 반박형 (공세적 대응)
**메타태그**: tone(반박형) + approach(공세형) + structure(역공형)

**구조**: "허위 폭로 → 강력 반박 → 책임 추궁 → 법적 대응 경고"
1. **허위 폭로**: 상대방의 허위 주장을 "악의적 조작"이라고 강하게 규정하고 폭로
2. **강력 반박**: 명확한 증거를 바탕으로 한 강력하고 단호한 반박과 해명
3. **책임 추궁**: 허위사실 유포의 배경과 의도를 추궁하고 정치적 책임 요구
4. **법적 경고**: 지속적인 허위사실 유포 시 법적 대응을 검토한다는 강한 경고

**어조**: 단호하고 공세적인 반박자 어조, 강한 분노와 정의감 표출
**핵심 어휘**: "악의적 조작", "강력히 반박한다", "법적 책임을 묻겠다", "더 이상 좌시하지 않겠다"`,

      variation3: `
## 배리에이션 C: 교육적 해명형 (건설적 대응)
**메타태그**: tone(교육형) + approach(해명형) + structure(건설형)

**구조**: "오해 해소 → 상세 설명 → 올바른 정보 → 건설적 요청"
1. **오해 해소**: 허위사실이 어떤 오해에서 비롯되었는지 이해하며 차분하게 접근
2. **상세 설명**: 실제 상황과 맥락을 자세하고 이해하기 쉽게 설명하여 진실 전달
3. **올바른 정보**: 정확한 정보와 자료를 제공하여 국민의 올바른 판단 도움
4. **건설적 요청**: 앞으로는 정확한 사실 확인을 통한 건설적 비판을 요청

**어조**: 교육적이고 포용적인 해명자 어조, 이해와 소통 중시
**핵심 어휘**: "정확한 사실은", "오해를 해소하고자", "올바른 정보를 제공", "건설적 비판을 부탁"`,

      toneA: "객관형", approachA: "사실형", structureA: "반박형",
      styleA: "객관사실반박", politicianA: "팩트체크스타일",
      
      toneB: "반박형", approachB: "공세형", structureB: "역공형", 
      styleB: "반박공세역공", politicianB: "강력대응스타일",
      
      toneC: "교육형", approachC: "해명형", structureC: "건설형",
      styleC: "교육해명건설", politicianC: "포용대응스타일"
    };
  }
  
  // 설명형 보도자료 (입장문, 발표문, 건의문)
  else if (['입장문', '발표문', '건의문'].includes(subCategory)) {
    return {
      goal: '당이나 개인의 공식적인 입장과 결정을 명확하게 전달하여 투명성을 높이고 국민의 이해와 지지를 확보한다',
      
      coreStructure: `
**박홍근 모델 (설명형)**: "공식 발표 → 결정의 배경 설명 → 근거 제시 → 당원/국민에 대한 메시지"
1. **공식 발표**: 당이나 개인의 공식적인 결정이나 입장을 먼저 명확하게 발표
2. **배경 설명**: 그 결정에 이르게 된 정치적 배경과 이유를 논리적으로 설명
3. **근거 제시**: 결정의 타당성을 뒷받침하는 구체적 근거와 자료 제시
4. **메시지 전달**: 당원과 지지자, 국민에게 이해와 협조를 구하는 진심어린 메시지`,

      mediaGuide: `
**언론 배포**: 공식 로고와 함께 차분하고 신뢰성 있는 형태로 배포, 설득력 있는 논조 유지`,
      
      // 배리에이션 A: 공식 발표형 (박홍근 스타일)
      variation1: `
## 배리에이션 A: 공식 발표형 (박홍근 스타일)
**메타태그**: tone(공식형) + approach(설명형) + structure(논리형)

**구조**: "공식 입장 발표 → 결정 과정 설명 → 논리적 근거 → 협조 요청"
1. **공식 입장**: 당이나 개인의 공식적인 입장을 명확하고 간결하게 선언
2. **결정 과정**: 해당 결정에 이르게 된 과정과 고려사항을 투명하게 공개
3. **논리적 근거**: 결정의 타당성을 뒷받침하는 논리적이고 객관적인 근거 제시
4. **협조 요청**: 당원과 국민에게 이해와 협조를 정중하고 진심어리게 요청

**어조**: 차분하고 설득적인 공식 대변인 어조, 투명성과 신뢰성 강조
**핵심 어휘**: "입장을 밝힙니다", "결정하게 된 배경", "국민 여러분께 설명", "이해와 협조 부탁"`,

      // 배리에이션 B: 정책 설명형 (새로운 스타일)
      variation2: `
## 배리에이션 B: 정책 설명형 (새로운 스타일)  
**메타태그**: tone(설명형) + approach(교육형) + structure(체계형)

**구조**: "정책 소개 → 필요성 설명 → 기대 효과 → 국민 참여 호소"
1. **정책 소개**: 새로운 정책이나 제안의 핵심 내용을 이해하기 쉽게 소개
2. **필요성 설명**: 왜 이런 정책이 필요한지 현실적 근거와 함께 설명
3. **기대 효과**: 정책 시행 시 예상되는 긍정적 효과와 변화상 제시
4. **참여 호소**: 정책 성공을 위한 국민의 관심과 참여를 호소

**어조**: 교육적이고 친근한 정책 설명자 어조, 이해하기 쉬운 설명 중시
**핵심 어휘**: "제안하고자 합니다", "필요성을 말씀드리면", "기대할 수 있습니다", "함께 만들어가길"`,

      // 배리에이션 C: 소통 강화형 (새로운 스타일)
      variation3: `
## 배리에이션 C: 소통 강화형 (새로운 스타일)
**메타태그**: tone(소통형) + approach(대화형) + structure(개방형)

**구조**: "현황 공유 → 고민 털어놓기 → 다양한 의견 경청 → 지속 소통 약속"
1. **현황 공유**: 현재 상황과 고민거리를 솔직하고 투명하게 국민과 공유
2. **고민 털어놓기**: 어려운 결정이나 딜레마를 인간적으로 털어놓으며 공감대 형성
3. **의견 경청**: 다양한 의견과 비판을 겸허히 받아들이겠다는 열린 자세 표명
4. **소통 약속**: 앞으로도 지속적으로 소통하고 피드백을 반영하겠다는 약속

**어조**: 진솔하고 소통지향적인 대화자 어조, 인간적 접근과 상호작용 중시
**핵심 어휘**: "솔직히 말씀드리면", "고민이 많습니다", "의견을 들려주세요", "계속 소통하겠습니다"`,

      toneA: "공식형", approachA: "설명형", structureA: "논리형",
      styleA: "공식설명논리", politicianA: "박홍근스타일",
      
      toneB: "설명형", approachB: "교육형", structureB: "체계형", 
      styleB: "설명교육체계", politicianB: "정책설명스타일",
      
      toneC: "소통형", approachC: "대화형", structureC: "개방형",
      styleC: "소통대화개방", politicianC: "친근소통스타일"
    };
  }
  
  // 기타 보도자료 (일반형)
  else {
    return {
      goal: '다양한 현안에 대해 명확하고 신속하게 입장을 표명하여 언론과 국민에게 정확한 정보를 전달한다',
      
      coreStructure: `
**일반 보도자료**: "핵심 메시지 → 상황 설명 → 입장 표명 → 향후 계획"
1. **핵심 메시지**: 전달하고자 하는 핵심 내용을 명확하고 간결하게 제시
2. **상황 설명**: 관련 상황과 배경을 객관적으로 설명
3. **입장 표명**: 해당 이슈에 대한 명확한 입장과 견해 표명
4. **향후 계획**: 앞으로의 대응 방향이나 계획 제시`,

      mediaGuide: `**언론 배포**: 명확하고 간결한 형태로 배포`,
      
      // 일반적 배리에이션들
      variation1: `## 배리에이션 A: 명확 전달형`,
      variation2: `## 배리에이션 B: 상황 설명형`,  
      variation3: `## 배리에이션 C: 입장 표명형`,

      toneA: "명확형", approachA: "전달형", structureA: "직접형",
      styleA: "명확전달직접", politicianA: "일반스타일",
      
      toneB: "설명형", approachB: "상황형", structureB: "배경형",
      styleB: "설명상황배경", politicianB: "일반스타일",
      
      toneC: "표명형", approachC: "입장형", structureC: "계획형",
      styleC: "표명입장계획", politicianC: "일반스타일"
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
  buildPressReleasePrompt,
  getPressReleaseVariations,
  getPressReleaseContextualConstraints,
  getPressReleaseAuthorityGuide,
};