// functions/templates/prompts/formal-communications.js - 기타 형식 프롬프트 (의정보고서/연설문/추모메시지/개인적소회/명절인사)

'use strict';

/**
 * 권한 수준별 공식 소통 언어 제약사항 가이드
 * @param {string} authority - 권한 수준
 * @returns {string} 언어 가이드
 */
function getFormalCommunicationAuthorityGuide(authority) {
  switch (authority) {
    case '예비형':
      return `
**예비후보 공식 소통 제약사항** (공식 권한 제한):
- ✅ 사용 가능: "당선되면 추진하겠습니다", "정책으로 보답하겠습니다", "약속드립니다"
- ✅ 비전 제시: "새로운 OO를 만들어가겠습니다", "함께 이루어가겠습니다"
- ❌ 금지 표현: "의정활동으로", "성과를 거두었습니다", "예산을 확보했습니다"
- ❌ 현재 권한 과시: 실제로 갖지 않은 공적 권한을 가진 것처럼 표현 금지
- 💡 전략: 미래 비전과 정치 철학 중심의 격조 높은 메시지`;
    
    case '현직형':
      return `
**현직 의원 공식 소통 가능 표현** (공식 권한 보유):
- ✅ 공식 발언: "의회에서 말씀드렸듯이", "공식 입장을 밝혔습니다", "의정활동을 통해"
- ✅ 권한 행사: "법안을 통해 실현하겠습니다", "예산 확보로 뒷받침하겠습니다"
- ✅ 성과 기반: "이미 추진해온", "앞으로도 계속해서"
- 💡 전략: 기존 성과를 바탕으로 한 신뢰성 있는 미래 약속`;
    
    default:
      return `
**일반적 공식 소통 표현**: 특별한 제약사항 없음`;
  }
}

/**
 * 공식 소통 프롬프트 생성 - 5가지 유형 통합 (의정보고서/연설문/추모메시지/개인적소회/명절인사)
 * @param {Object} options - 프롬프트 생성 옵션 (실제 가이드라인 포함)
 * @returns {string} 생성된 프롬프트
 */
function buildFormalCommunicationPrompt(options) {
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
  const contextualConstraints = getFormalCommunicationContextualConstraints(options);
  
  // 세부 카테고리에 따른 5가지 유형과 3가지 배리에이션 정의
  const variations = getFormalCommunicationVariations(subCategory, contextualConstraints);

  return `
# AI비서관 - 기타 형식 글쓰기 (${subCategory})

${policy.body}

[🎯 ${subCategory} 목표]
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

[🔍 ${subCategory} 핵심 구조]
${variations.coreStructure}

[📸 시각 자료 가이드]
${variations.visualGuide}

[💡 작성자 전문성 활용]
작성자 소개를 바탕으로 해당 분야의 전문성이나 관련 경험을 자연스럽게 반영하세요.
전문 경험 언급 시: "제가 [분야/경험]에서 확인한 바로는..." 형식 사용

[🎨 3가지 배리에이션 생성 지침]
같은 ${subCategory} 주제로 서로 다른 정치적 접근의 3가지 원고를 생성하되, 각각 고유한 스타일과 차별화된 접근 방법을 가져야 합니다.

[⚖️ 권한 수준별 언어 제약사항]
${getFormalCommunicationAuthorityGuide(contextualConstraints.authority)}

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
      "category": "기타형식",
      "subCategory": "${subCategory}",
      "personalPreferences": {
        "tone": "${variations.toneA}",
        "approach": "${variations.approachA}",
        "structure": "${variations.structureA}"
      },
      "contextualConstraints": {
        "authority": "${contextualConstraints.authority}",
        "regionScale": "${contextualConstraints.regionScale}",
        "formalType": "${contextualConstraints.formalType}"
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
      "category": "기타형식",
      "subCategory": "${subCategory}",
      "personalPreferences": {
        "tone": "${variations.toneB}",
        "approach": "${variations.approachB}",
        "structure": "${variations.structureB}"
      },
      "contextualConstraints": {
        "authority": "${contextualConstraints.authority}",
        "regionScale": "${contextualConstraints.regionScale}",
        "formalType": "${contextualConstraints.formalType}"
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
      "category": "기타형식",
      "subCategory": "${subCategory}",
      "personalPreferences": {
        "tone": "${variations.toneC}",
        "approach": "${variations.approachC}",
        "structure": "${variations.structureC}"
      },
      "contextualConstraints": {
        "authority": "${contextualConstraints.authority}",
        "regionScale": "${contextualConstraints.regionScale}",
        "formalType": "${contextualConstraints.formalType}"
      },
      "politician": "${variations.politicianC}"
    }
  }
]
`.trim();
}

/**
 * 공식 소통 상황 강제 메타태그 추출
 * @param {Object} options - 사용자 프로필 정보
 * @returns {Object} 상황 강제 제약사항
 */
function getFormalCommunicationContextualConstraints(options) {
  const { authorStatus, regionMetro, regionLocal, authorPosition } = options;
  
  return {
    // 권한 수준 (강제)
    authority: authorStatus === '예비' ? '예비형' : '현직형',
    
    // 지역 규모 (강제)  
    regionScale: getRegionScale(regionMetro, regionLocal),
    
    // 공식 소통 유형 (권한에 따른 제약)
    formalType: authorStatus === '예비' ? '비전제시형' : '성과보고형'
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
 * 세부 카테고리별 3가지 배리에이션 정의 (5가지 유형 통합)
 * @param {string} subCategory - 세부 카테고리
 * @param {Object} constraints - 상황 강제 제약사항
 * @returns {Object} 배리에이션 정보
 */
function getFormalCommunicationVariations(subCategory, constraints) {
  
  switch (subCategory) {
    case '의정보고서':
      return {
        goal: '일정 기간의 의정활동을 종합하여 보고하고 구체적 성과를 시각적으로 제시하여 신뢰성을 확보한다',
        
        coreStructure: `
**우원식 모델 (인포그래픽 보고형)**: "핵심 성과 요약 → 세부 활동 내역 → PDF 다운로드 안내"
1. **인포그래픽 요약**: "대표발의 O건", "지역예산 OOO억 확보" 등 핵심 성과를 수치로 시각화 (텍스트로 표현)
2. **세부 보고**: 입법활동, 예산심의, 국정감사, 지역활동 등을 카테고리별로 체계적 정리
3. **다운로드 안내**: "전체 보고서 PDF는 여기에서 다운로드하세요" 등 접근성 강화
4. **연재 예고**: "다음 주에는 OO 분야 상세 보고를 연재합니다" 등 시리즈 형태로 운영`,

        visualGuide: `
**시각 자료**: 인포그래픽, 성과 차트, 활동 사진 모음, PDF 다운로드 링크`,
        
        // 배리에이션 A: 우원식형 성과 중심 보고
        variation1: `
## 배리에이션 A: 우원식형 성과 중심 보고
**메타태그**: tone(신뢰형) + approach(데이터형) + structure(인포그래픽형)

**구조**: "핵심 성과 수치 → 카테고리별 세부 활동 → 투명한 자료 공개"
1. **성과 강조**: "OOO억 원 예산 확보", "법안 O건 발의" 등 구체적 수치로 시작
2. **데이터 중심**: 의정활동을 영역별로 분류하여 객관적 실적과 성과를 체계적 제시
3. **인포그래픽적**: 복잡한 활동 내역을 표와 그래프 형태로 쉽게 이해할 수 있도록 구성
4. **투명성 강화**: 상세 자료 다운로드 제공으로 투명성과 접근성 동시 확보

**어조**: 객관적이고 신뢰감 있는 보고서 형식
**핵심 어휘**: "성과로 보여드리겠습니다", "구체적 수치", "객관적 실적", "투명한 보고"`,

        // 배리에이션 B: 종합형 체계적 보고 (새로운 스타일)
        variation2: `
## 배리에이션 B: 종합형 체계적 보고 (새로운 스타일)
**메타태그**: tone(전문형) + approach(체계형) + structure(분류형)

**구조**: "종합 개요 → 분야별 상세 분석 → 향후 계획 → 피드백 요청"
1. **종합적 개요**: 보고 기간의 전반적 의정활동 현황과 중점 추진 사항을 종합적으로 개관
2. **체계적 분류**: 입법→예산→감사→지역 순으로 체계적 분류하여 전문적 분석과 평가
3. **분류적 구성**: 독자가 관심 분야를 선택적으로 읽을 수 있도록 명확한 섹션 구분
4. **소통 확대**: 향후 계획 공유와 함께 시민 의견 수렴 창구 안내

**어조**: 전문적이고 체계적인 분석 보고서
**핵심 어휘**: "종합적 검토", "체계적 분석", "전문성 강화", "지속적 소통"`,

        // 배리에이션 C: 스토리형 친근 보고 (새로운 스타일)
        variation3: `
## 배리에이션 C: 스토리형 친근 보고 (새로운 스타일)
**메타태그**: tone(친근형) + approach(경험형) + structure(서사형)

**구조**: "한 해의 여정 → 인상적인 순간들 → 함께 이룬 성과 → 새로운 다짐"
1. **서사적 접근**: 의정활동을 하나의 이야기로 엮어 친근하고 흥미롭게 전달
2. **경험적 공유**: 활동 과정에서의 에피소드와 시민들과의 만남을 생생하게 공유
3. **감성적 연결**: 딱딱한 수치보다는 의정활동의 의미와 가치, 시민과의 소통에 중점
4. **미래 지향**: 과거 성과를 바탕으로 한 새로운 다짐과 시민과의 동행 의지

**어조**: 친근하고 진솔한 이야기체
**핵심 어휘**: "함께 걸어온 길", "소중한 순간들", "마음을 담아", "새로운 출발"`,

        // 메타태그 정의
        toneA: "신뢰형", approachA: "데이터형", structureA: "인포그래픽형", 
        styleA: "신뢰데이터인포그래픽", politicianA: "우원식스타일",
        
        toneB: "전문형", approachB: "체계형", structureB: "분류형",
        styleB: "전문체계분류", politicianB: "새로운스타일",
        
        toneC: "친근형", approachC: "경험형", structureC: "서사형", 
        styleC: "친근경험서사", politicianC: "새로운스타일"
      };

    case '연설문':
      return {
        goal: '주요 연설을 통해 자신의 정치 철학과 비전을 공식적으로 기록하고 확산시킨다',
        
        coreStructure: `
**이재명 모델 (철학적 연설형)**: "연설 배경 설명 → 핵심 메시지 3-4개 인용문 → 연설문 전문 → 현장 영상 링크"
1. **배경 설명**: 연설이 이루어진 배경과 상황, 그 의미를 철학적 관점에서 설명
2. **핵심 인용**: "존경하는 국민 여러분", "대한민국의 미래를 위해" 등 핵심 메시지를 blockquote로 강조
3. **연설문 전문**: 실제 연설 내용 전체를 완전히 게재하여 메시지 완전성 확보
4. **확산 강화**: 연설 영상 링크와 함께 SNS 공유 버튼으로 메시지 확산 극대화`,

        visualGuide: `
**시각 자료**: 연설 현장 사진, 핵심 메시지 카드, 영상 링크, 명언 인용구 이미지`,
        
        // 배리에이션 A: 이재명형 철학적 연설문
        variation1: `
## 배리에이션 A: 이재명형 철학적 연설문
**메타태그**: tone(진중형) + approach(철학형) + structure(선언형)

**구조**: "시대적 사명 → 철학적 비전 → 구체적 다짐 → 국민과의 약속"
1. **시대적 인식**: "대한민국이 맞이한 역사적 전환점"이라는 시대적 사명감으로 시작
2. **철학적 비전**: "모든 국민이 인간다운 삶을 영위할 권리" 등 깊이 있는 가치관과 철학 제시
3. **선언적 다짐**: "함께 잘사는 나라", "따뜻한 대한민국"이라는 비전을 확신에 찬 어조로 선언
4. **국민 약속**: 철학과 비전을 현실에서 구현하겠다는 구체적이고 진심어린 약속

**어조**: 진중하고 비전을 제시하는 선언적 문체
**핵심 어휘**: "존경하는 국민 여러분", "대한민국의 미래를 위해", "함께 잘사는 나라", "따뜻한 공동체"`,

        // 배리에이션 B: 정책형 구체적 연설문 (새로운 스타일)
        variation2: `
## 배리에이션 B: 정책형 구체적 연설문 (새로운 스타일)
**메타태그**: tone(전문형) + approach(정책형) + structure(논리형)

**구조**: "현안 진단 → 정책 방향 제시 → 구체적 실행 방안 → 성과 약속"
1. **전문적 진단**: 현재 당면한 정책 과제와 사회적 현안을 정확하고 객관적으로 진단
2. **정책적 해법**: 문제 해결을 위한 구체적이고 실현 가능한 정책 대안과 방향 제시
3. **논리적 설득**: 단계별 추진 계획과 예상 효과를 논리적으로 설명하여 설득력 확보
4. **성과 약속**: 정책 시행을 통해 달성할 구체적 목표와 국민에 대한 명확한 약속

**어조**: 논리적이고 설득력 있는 정책 전문가 어조
**핵심 어휘**: "정확한 진단", "현실적 대안", "구체적 방안", "실현 가능한", "약속드립니다"`,

        // 배리에이션 C: 감동형 메시지 연설문 (새로운 스타일)
        variation3: `
## 배리에이션 C: 감동형 메시지 연설문 (새로운 스타일)
**메타태그**: tone(감성형) + approach(가치형) + structure(감동형)

**구조**: "공감의 시작 → 가치와 신념 → 희망의 메시지 → 함께하는 다짐"
1. **감성적 공감**: 국민의 마음과 아픔, 꿈과 희망에 대한 깊은 공감과 이해 표현
2. **가치 중심**: 정책이나 제도를 넘어서는 인간적 가치와 공동체 정신 강조
3. **희망적 비전**: 현재의 어려움을 극복하고 더 나은 미래를 만들 수 있다는 희망과 용기 전달
4. **함께하는 다짐**: 정치인 혼자가 아닌 국민과 함께 꿈을 이루어가겠다는 동반자 의식

**어조**: 따뜻하고 희망적인 감동적 메시지
**핵심 어휘**: "마음을 나누며", "희망을 품고", "함께라면 가능합니다", "꿈꾸는 대한민국"`,

        toneA: "진중형", approachA: "철학형", structureA: "선언형",
        styleA: "진중철학선언", politicianA: "이재명스타일",
        
        toneB: "전문형", approachB: "정책형", structureB: "논리형", 
        styleB: "전문정책논리", politicianB: "새로운스타일",
        
        toneC: "감성형", approachC: "가치형", structureC: "감동형",
        styleC: "감성가치감동", politicianC: "새로운스타일"
      };

    case '추모메시지':
      return {
        goal: '존경하는 인물을 추모하며 그 정신을 계승하겠다는 다짐으로 자신의 정치적 정통성을 확보한다',
        
        coreStructure: `
**추미애 모델 (계승 의지형)**: "추모 대상의 정치 철학 언급 → 현재적 의미 해석 → 계승 의지 표명"
1. **철학적 추모**: 고인의 정치 철학("민주주의, 인권, 평화" 등)을 구체적으로 언급하고 기리는 마음 표현
2. **현재적 해석**: 그 정신이 현재 우리 사회에 갖는 의미와 가치, 시대적 과제와의 연관성 설명
3. **계승 의지**: "보여주신 길을 따라 저도 나아가겠습니다" 등 그 정신을 이어받겠다는 의지 표명
4. **실천 다짐**: 추상적 계승이 아닌 구체적 정치 활동에서 그 정신을 실현하겠다는 다짐`,

        visualGuide: `
**시각 자료**: 추모 대상의 사진, 명언 인용구, 추모 화환이나 헌화 장면`,
        
        variation1: `
## 배리에이션 A: 추미애형 계승 의지 추모
**메타태그**: tone(엄숙형) + approach(철학형) + structure(계승형)

**구조**: "깊은 애도 → 정치 철학 기림 → 현재적 의미 → 계승 다짐"
1. **엄숙한 추모**: "OOO 선생님의 서거를 깊이 애도하며" 엄숙하고 정중한 추모 인사
2. **철학적 기림**: 고인의 핵심 정치 철학과 신념("민주주의", "인권", "평화")을 구체적으로 언급
3. **계승적 해석**: 그 정신이 현재 정치 상황에서 갖는 의미와 우리가 나아가야 할 방향 제시
4. **의지적 다짐**: "보여주신 길을 따라 저도 나아가겠습니다"는 확고한 계승 의지 표명

**어조**: 엄숙하고 존중하는 추모의 어조
**핵심 어휘**: "정신을 기리며", "잊지 않겠습니다", "보여주신 길을 따라", "그 뜻을 이어받아"`,

        variation2: `
## 배리에이션 B: 감사형 회고적 추모 (새로운 스타일)
**메타태그**: tone(감사형) + approach(회고형) + structure(감사형)

**구조**: "감사 인사 → 개인적 인연 → 받은 가르침 → 실천 다짐"
1. **감사의 시작**: "큰 가르침을 주신 OOO 선생님께 깊은 감사를 드리며"
2. **회고적 인연**: 고인과의 개인적 만남이나 받은 영향, 가르침에 대한 감사 표현
3. **가르침 정리**: 고인이 우리 사회와 개인에게 남긴 소중한 유산과 가치들 정리
4. **실천 다짐**: 그 가르침을 일상과 정치 활동에서 실천하겠다는 구체적 다짐

**어조**: 감사하고 따뜻한 회고의 어조
**핵심 어휘**: "깊은 감사를 드리며", "소중한 가르침", "마음 깊이 새기고", "그 뜻에 따라"`,

        variation3: `
## 배리에이션 C: 다짐형 미래 지향 추모 (새로운 스타일)
**메타태그**: tone(다짐형) + approach(미래형) + structure(결의형)

**구조**: "미완의 꿈 → 현재의 과제 → 완성 의지 → 후배로서의 다짐"
1. **미완의 과제**: 고인이 이루지 못한 꿈과 과제들에 대한 성찰과 아쉬움
2. **현재적 책임**: 그 과제들이 현재 우리에게 던지는 메시지와 책임 인식
3. **결의적 다짐**: 후배 정치인으로서 그 꿈을 완성하겠다는 강한 의지와 결의
4. **미래 지향**: 고인의 정신으로 더 나은 미래를 만들어가겠다는 전향적 다짐

**어조**: 결의에 찬 미래 지향적 다짐
**핵심 어휘**: "미완성된 꿈을", "우리의 몫으로", "반드시 완성하겠습니다", "그 정신으로"`,

        toneA: "엄숙형", approachA: "철학형", structureA: "계승형",
        styleA: "엄숙철학계승", politicianA: "추미애스타일",
        
        toneB: "감사형", approachB: "회고형", structureB: "감사형",
        styleB: "감사회고감사", politicianB: "새로운스타일",
        
        toneC: "다짐형", approachC: "미래형", structureC: "결의형",
        styleC: "다짐미래결의", politicianC: "새로운스타일"
      };

    case '개인적소회':
      return {
        goal: '개인적인 경험을 통해 자신의 정치 철학이 어디에서 비롯되었는지를 보여주어 진정성을 확보한다',
        
        coreStructure: `
**진선미/이인영 모델 (경험-철학 연결형)**: "개인적 경험 → 사람의 온기 발견 → 정치 철학으로 승화"
1. **솔직한 경험**: "인생의 고비마다", "아버지가 돌아가셨을 때" 등 구체적이고 진솔한 개인적 체험
2. **온기의 발견**: 어려운 순간에 만난 사람들의 따뜻함과 도움, 사회의 선량함 경험
3. **철학적 승화**: 그 경험이 "따뜻한 밥 한 그릇 같은 정치" 철학이 된 과정 설명
4. **정치적 연결**: 개인적 깨달음이 현재의 정치적 신념과 활동으로 이어진 자연스러운 연결`,

        visualGuide: `
**시각 자료**: 개인적인 과거 사진, 가족 사진, 의미 있는 장소나 순간들`,
        
        variation1: `
## 배리에이션 A: 진선미형 온기 중심 소회
**메타태그**: tone(따뜻형) + approach(경험형) + structure(철학형)

**구조**: "어려운 순간 → 사람들의 온기 → 깨달음 → 정치 철학"
1. **솔직한 고백**: "인생의 고비마다 사람의 온기가 있었습니다" 등 개인적 어려움을 솔직하게 고백
2. **온기의 체험**: 힘든 순간에 만난 사람들의 따뜻한 마음과 실질적인 도움에 대한 감사
3. **철학적 성찰**: 그 경험을 통해 깨달은 삶의 의미와 사람에 대한 믿음, 공동체의 가치
4. **정치적 동기**: "따뜻한 밥 한 그릇 같은 정치"를 하게 된 개인적 동기와 철학적 배경

**어조**: 진솔하고 담담한 고백체, 따뜻한 철학적 성찰
**핵심 어휘**: "사람의 온기", "따뜻한 마음", "그때의 기억이", "정치의 시작", "초심"`,

        variation2: `
## 배리에이션 B: 이인영형 가족 중심 소회 (참고 스타일)
**메타태그**: tone(그리움형) + approach(가족형) + structure(성장형)

**구조**: "가족의 기억 → 받은 가르침 → 성장 과정 → 현재의 신념"
1. **가족 에피소드**: "아버지가 돌아가셨을 때..." 등 가족과의 소중한 기억과 추억
2. **가족의 가르침**: 부모님이나 가족으로부터 배운 삶의 지혜와 가치관, 인생 철학
3. **성장의 과정**: 그 가르침이 어떻게 자신의 성장과 인격 형성에 영향을 미쳤는지
4. **현재의 신념**: 가족의 가르침이 현재의 정치적 신념과 원칙의 뿌리가 된 과정

**어조**: 그리움과 감사가 담긴 가족 이야기
**핵심 어휘**: "아버지의 가르침", "어머니의 사랑", "가족의 의미", "물려받은 신념"`,

        variation3: `
## 배리에이션 C: 성찰형 자기 고백 소회 (새로운 스타일)
**메타태그**: tone(성찰형) + approach(고백형) + structure(깨달음형)

**구조**: "실수와 고민 → 깨달음의 순간 → 변화된 생각 → 현재의 다짐"
1. **솔직한 고백**: 과거의 실수나 어리석었던 순간, 고민했던 시기에 대한 솔직한 고백
2. **깨달음의 과정**: 그런 경험을 통해 얻은 교훈과 인생에 대한 새로운 깨달음
3. **변화의 계기**: 깨달음이 어떻게 자신의 생각과 행동을 변화시켰는지
4. **현재의 다짐**: 그 깨달음을 바탕으로 한 현재의 정치적 자세와 앞으로의 다짐

**어조**: 겸손하고 성찰적인 자기 고백
**핵심 어휘**: "부족했던 저에게", "깨달은 것은", "이제야 알게 된", "앞으로는"`,

        toneA: "따뜻형", approachA: "경험형", structureA: "철학형",
        styleA: "따뜻경험철학", politicianA: "진선미스타일",
        
        toneB: "그리움형", approachB: "가족형", structureB: "성장형",
        styleB: "그리움가족성장", politicianB: "이인영스타일",
        
        toneC: "성찰형", approachC: "고백형", structureC: "깨달음형",
        styleC: "성찰고백깨달음", politicianC: "새로운스타일"
      };

    case '명절인사':
      return {
        goal: '정치적 메시지를 배제하고 가족, 공동체, 희망 등 보편적 가치를 중심으로 따뜻하고 친근한 이미지를 구축한다',
        
        coreStructure: `
**우원식 모델 (보편적 가치형)**: "명절의 의미 → 가족의 소중함 → 공동체 화합 → 따뜻한 인사"
1. **명절 의미**: 전통 명절이 갖는 가족 화합과 감사, 공동체 정신의 의미 강조
2. **가족 중심**: 정치적 색채 없이 가족의 소중함과 사랑에 대한 보편적 메시지
3. **보편적 가치**: 모든 사람이 공감할 수 있는 따뜻함, 화합, 희망 등의 가치 중심
4. **친근한 마무리**: "풍요로운 한가위 보내십시오" 등 진심어린 명절 인사로 마무리`,

        visualGuide: `
**시각 자료**: 한복 입은 사진, 가족과 함께한 명절 준비 모습, 전통 음식이나 명절 풍경`,
        
        variation1: `
## 배리에이션 A: 우원식형 가족 중심 명절인사
**메타태그**: tone(따뜻형) + approach(가족형) + structure(보편형)

**구조**: "명절의 따뜻함 → 가족의 소중함 → 공동체 화합 → 진심어린 인사"
1. **따뜻한 시작**: "따뜻한 명절을 맞아 마음도 풍성해집니다" 등 명절의 따뜻한 분위기
2. **가족의 가치**: 명절을 통해 다시 한번 느끼게 되는 가족의 소중함과 사랑의 의미
3. **보편적 화합**: 온 가족이 모이고 이웃과 정을 나누는 우리 사회의 아름다운 전통
4. **진심 인사**: "건강하고 행복한 명절 보내세요"라는 진심어린 명절 축하 인사

**어조**: 따뜻하고 친근한 이웃 같은 인사
**핵심 어휘**: "풍요로운 한가위 보내십시오", "가족의 소중함", "따뜻한 마음", "건강하고 행복한"
**특별 주의**: 정치적 내용, 의정활동, 공약 등은 절대 언급 금지`,

        variation2: `
## 배리에이션 B: 전통 중심 명절인사 (새로운 스타일)
**메타태그**: tone(전통형) + approach(문화형) + structure(계승형)

**구조**: "전통의 의미 → 선조의 지혜 → 문화적 가치 → 계승 다짐"
1. **전통 가치**: 우리 전통 명절이 갖는 깊은 의미와 문화적 가치에 대한 감사
2. **문화적 자부심**: 대대로 이어져 온 아름다운 전통과 선조들의 지혜에 대한 자부심
3. **계승 의지**: 이런 소중한 전통을 미래 세대에게 온전히 물려주겠다는 의지
4. **품격 인사**: 전통의 가치를 아는 품격 있는 명절 인사로 마무리

**어조**: 품격 있고 전통을 존중하는 격조 높은 인사
**핵심 어휘**: "소중한 전통", "선조의 지혜", "문화유산", "대대로 이어가는"`,

        variation3: `
## 배리에이션 C: 희망 중심 명절인사 (새로운 스타일)
**메타태그**: tone(희망형) + approach(미래형) + structure(축복형)

**구조**: "현재 인정 → 명절의 위로 → 희망 메시지 → 축복 인사"
1. **현실적 공감**: 어려운 시기를 보내고 있는 많은 분들의 상황에 대한 따뜻한 공감
2. **명절의 위로**: 명절이 주는 위로와 휴식, 가족과 함께하는 시간의 소중함
3. **희망적 미래**: 어려움을 이겨내고 더 나은 내일을 향해 나아가자는 희망 메시지
4. **축복 마무리**: 모든 가정에 행복과 건강이 함께하기를 바라는 축복의 인사

**어조**: 희망적이고 격려하는 따뜻한 위로
**핵심 어휘**: "새로운 희망", "더 나은 내일", "함께 이겨내며", "밝은 미래를"`,

        toneA: "따뜻형", approachA: "가족형", structureA: "보편형",
        styleA: "따뜻가족보편", politicianA: "우원식스타일",
        
        toneB: "전통형", approachB: "문화형", structureB: "계승형",
        styleB: "전통문화계승", politicianB: "새로운스타일",
        
        toneC: "희망형", approachC: "미래형", structureC: "축복형",
        styleC: "희망미래축복", politicianC: "새로운스타일"
      };

    default:
      return {
        goal: '공식적이고 격조 있는 소통을 통해 정치인으로서의 품격과 진정성을 보여준다',
        
        coreStructure: `
**표준 공식 소통**: "상황에 맞는 격조 있는 메시지 전달"`,

        visualGuide: `**시각 자료**: 상황에 적합한 품격 있는 이미지`,
        
        variation1: `
## 배리에이션 A: 표준형 공식 소통
**메타태그**: tone(품격형) + approach(표준형) + structure(정식형)

**구조**: 상황에 맞는 표준적이고 품격 있는 공식 메시지 전달
**어조**: 정중하고 품격 있는 공식 문서체
**핵심 어휘**: "진심으로", "깊이 공감하며", "함께 만들어가겠습니다"`,

        variation2: `
## 배리에이션 B: 친근형 공식 소통 (새로운 스타일)
**메타태그**: tone(친근형) + approach(소통형) + structure(열린형)

**구조**: 공식적이되 친근하고 접근하기 쉬운 열린 소통 방식
**어조**: 친근하면서도 정중한 소통체
**핵심 어휘**: "마음을 담아", "이웃으로서", "함께 걸어가며"`,

        variation3: `
## 배리에이션 C: 진정성형 공식 소통 (새로운 스타일)
**메타태그**: tone(진솔형) + approach(고백형) + structure(진정형)

**구조**: 솔직하고 진정성 있는 마음을 공식적 형식으로 전달
**어조**: 진솔하고 겸손한 진정성 있는 고백체
**핵심 어휘**: "솔직한 마음으로", "진심을 담아", "겸손한 마음으로"`,

        toneA: "품격형", approachA: "표준형", structureA: "정식형",
        styleA: "품격표준정식", politicianA: "일반스타일",
        
        toneB: "친근형", approachB: "소통형", structureB: "열린형",
        styleB: "친근소통열린", politicianB: "새로운스타일",
        
        toneC: "진솔형", approachC: "고백형", structureC: "진정형",
        styleC: "진솔고백진정", politicianC: "새로운스타일"
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
  buildFormalCommunicationPrompt,
  getFormalCommunicationVariations,
  getFormalCommunicationContextualConstraints,
  getFormalCommunicationAuthorityGuide,
};