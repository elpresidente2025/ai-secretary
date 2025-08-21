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
    regionScale: (() => {
      if (regionMetro === '서울특별시') return '메가시티형';
      if (['부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시'].includes(regionMetro)) return '광역시형';
      if (regionMetro && regionMetro.endsWith('도')) return '도단위형';
      return '일반형';
    })(),
    
    // 시간 맥락 (강제)
    timeContext: (() => {
      const hour = new Date().getHours();
      if (hour >= 6 && hour < 12) return '아침형';
      if (hour >= 12 && hour < 18) return '오후형';
      if (hour >= 18 && hour < 22) return '저녁형';
      return '밤형';
    })()
  };
}

/**
 * 세부 카테고리별 3가지 배리에이션 생성
 * @param {string} subCategory - 세부 카테고리
 * @param {Object} contextualConstraints - 상황 제약사항
 * @returns {Object} 배리에이션 정보
 */
function getCommunicationVariations(subCategory, contextualConstraints) {
  // 기본 일반소통 배리에이션
  if (!subCategory || subCategory === '일반' || subCategory === '기타') {
    return getGeneralCommunicationVariations(contextualConstraints);
  }
  
  // 세부 카테고리별 전문 배리에이션
  switch (subCategory) {
    case '감사인사':
      return getGratitudeVariations(contextualConstraints);
    
    case '일상공유':
      return getDailyLifeVariations(contextualConstraints);
    
    case '소회표현':
      return getPersonalThoughtsVariations(contextualConstraints);
    
    case '격려응원':
      return getEncouragementVariations(contextualConstraints);
    
    case '행사참석':
      return getEventParticipationVariations(contextualConstraints);
    
    default:
      return getGeneralCommunicationVariations(contextualConstraints);
  }
}

/**
 * 기본 일반소통 배리에이션
 */
function getGeneralCommunicationVariations(contextualConstraints) {
  return {
    goal: '정치인으로서의 권위적 이미지를 탈피하고 친근하면서도 신뢰할 수 있는 모습을 보여준다',
    
    variation1: `
## 배리에이션 A: 논리적 친근형 (한정애 스타일)
**메타태그**: tone(논리형) + approach(데이터형) + structure(직진형)

**구조**: "현황 인식 → 데이터 기반 분석 → 명확한 입장 표명"
1. **친근한 도입**: "요즘 주변에서 자주 듣는 이야기가..." 등으로 일상적 시작
2. **논리적 전개**: 구체적 사례나 통계를 활용해 문제 상황을 명확히 분석
3. **직진적 메시지**: "저는 이렇게 생각합니다"라는 명확한 입장과 실행 가능한 방안 제시

**어조**: 차분하고 논리적이면서도 따뜻한 어조, 신뢰감을 주는 전문성
**핵심 어휘**: "살펴보니", "구체적으로 말씀드리면", "실제로", "분명한 것은", "함께 만들어가겠습니다"`,

    variation2: `
## 배리에이션 B: 경험담 위트형 (박지원 스타일)
**메타태그**: tone(친근형) + approach(경험형) + structure(순환형)

**구조**: "친근한 일상 → 경험적 연결 → 순환적 위트"
1. **친근한 일상**: "오늘 미용실에 갔다가..." 식으로 누구나 공감할 일상 소재로 시작
2. **경험적 연결**: 일상에서 만난 사람들의 이야기를 현재 정치 상황과 자연스럽게 연결
3. **순환적 위트**: 다시 일상으로 돌아와 "역시 정치 9단도 배울 게 많습니다" 식의 유머로 마무리

**어조**: 노련하면서도 친근한 어조, 삶의 지혜가 묻어나는 위트
**핵심 어휘**: "오늘 ~에 갔다가", "문득 생각이 들었습니다", "사람 사는 세상", "결국은 민심", "정치 9단도"`,

    variation3: `
## 배리에이션 C: 따뜻한 성찰형 (새로운 스타일)
**메타태그**: tone(감성형) + approach(철학형) + structure(점층형)

**구조**: "따뜻한 일상 → 인생 철학 → 깊어지는 감사"
1. **감성적 일상**: "길을 걷다가 마주친 따뜻한 순간들"을 감성적으로 묘사
2. **철학적 성찰**: 일상의 소중함과 인간관계의 의미에 대한 깊이 있는 성찰
3. **점층적 감사**: 개인적 감사 → 지역 공동체 → 정치인으로서의 감사로 확장

**어조**: 따뜻하고 서정적인 어조, 진심이 담긴 성찰
**핵심 어휘**: "마음이 따뜻해지는", "소중한 순간", "감사한 마음", "삶의 의미", "함께하는 기쁨"`,

    // 메타태그 정의
    toneA: "논리형", approachA: "데이터형", structureA: "직진형", 
    styleA: "논리데이터직진", politicianA: "한정애스타일",
    
    toneB: "친근형", approachB: "경험형", structureB: "순환형",
    styleB: "친근경험순환", politicianB: "박지원스타일",
    
    toneC: "감성형", approachC: "철학형", structureC: "점층형", 
    styleC: "감성철학점층", politicianC: "새로운스타일"
  };
}

/**
 * 감사인사 배리에이션
 */
function getGratitudeVariations(contextualConstraints) {
  return {
    goal: '진심 어린 감사의 마음을 다양한 스타일로 전달하여 유권자와의 신뢰 관계를 강화한다',
    
    variation1: `
## 배리에이션 A: 구체적 감사형 (한정애 스타일)
**메타태그**: tone(진실형) + approach(구체형) + structure(단계형)

**구조**: "구체적 상황 → 세부적 감사 → 미래 다짐"
1. **구체적 언급**: 누가, 언제, 어디서, 무엇을 도와주었는지 구체적으로 기술
2. **세부적 감사**: 도움받은 내용을 자세히 설명하며 감사의 구체적 이유 제시
3. **단계적 다짐**: 받은 도움에 대한 보답 방법을 단계별로 명확히 제시

**어조**: 진실되고 구체적인 어조, 감사의 진정성이 느껴지는 표현
**핵심 어휘**: "구체적으로 말씀드리면", "정말 고마웠습니다", "하나하나 기억하고 있습니다", "보답하겠습니다"`,

    variation2: `
## 배리에이션 B: 감동적 스토리형 (새로운 스타일)
**메타태그**: tone(감성형) + approach(스토리형) + structure(기승전결형)

**구조**: "상황 설정 → 감동적 전개 → 깨달음 → 감사 표현"
1. **상황 설정**: 감사하게 된 배경 상황을 드라마틱하게 설정
2. **감동적 전개**: 도움을 받은 과정을 감동적인 스토리로 전개
3. **깨달음**: 그 경험을 통해 얻은 깨달음과 교훈 제시
4. **감사 표현**: 마음 깊은 곳에서 우러나는 감사의 표현

**어조**: 감동적이고 스토리텔링이 풍부한 어조, 마음을 움직이는 진정성
**핵심 어휘**: "그때 제게 일어난 일은", "잊을 수 없는 순간", "마음 깊이 새겨진", "평생 기억할", "감사의 마음을 담아"`,

    variation3: `
## 배리에이션 C: 겸손한 다짐형 (새로운 스타일)
**메타태그**: tone(겸손형) + approach(다짐형) + structure(확장형)

**구조**: "겸손한 고백 → 받은 은혜 인정 → 다짐 확장"
1. **겸손한 고백**: 혼자서는 할 수 없었던 일임을 겸손하게 인정
2. **은혜 인정**: 많은 분들의 도움이 있었기에 가능했다는 점 강조
3. **확장형 다짐**: 개인적 감사를 지역사회, 국가에 대한 봉사 다짐으로 확장

**어조**: 겸손하고 진중한 어조, 공인으로서의 책임감이 느껴지는 표현
**핵심 어휘**: "부족한 저에게", "많은 분들의 도움으로", "겸허한 마음으로", "더 큰 책임감을", "섬기는 마음으로"`,

    toneA: "진실형", approachA: "구체형", structureA: "단계형",
    styleA: "진실구체단계", politicianA: "한정애스타일",
    
    toneB: "감성형", approachB: "스토리형", structureB: "기승전결형",
    styleB: "감성스토리기승전결", politicianB: "새로운스타일",
    
    toneC: "겸손형", approachC: "다짐형", structureC: "확장형",
    styleC: "겸손다짐확장", politicianC: "새로운스타일"
  };
}

/**
 * 일상공유 배리에이션
 */
function getDailyLifeVariations(contextualConstraints) {
  return {
    goal: '정치인도 일반인과 같은 일상을 보낸다는 친근함을 보여주며 공감대를 형성한다',
    
    variation1: `
## 배리에이션 A: 관찰형 일상공유 (새로운 스타일)
**메타태그**: tone(관찰형) + approach(세심형) + structure(연결형)

**구조**: "세심한 관찰 → 일상의 발견 → 사회적 연결"
1. **세심한 관찰**: 일상 속 작은 변화나 특별한 순간을 세심하게 관찰
2. **일상의 발견**: 평범해 보이는 일상에서 특별한 의미나 가치 발견
3. **사회적 연결**: 개인적 경험을 사회적 이슈나 정치적 의미와 자연스럽게 연결

**어조**: 예민하고 세심한 관찰력이 느껴지는 어조, 일상의 의미를 발견하는 통찰력
**핵심 어휘**: "문득 발견한 것은", "유심히 보니", "작은 변화가", "생각해보니", "일상 속에서 배우는"`,

    variation2: `
## 배리에이션 B: 유머러스 일상형 (박지원 스타일)  
**메타태그**: tone(유머형) + approach(자조형) + structure(반전형)

**구조**: "평범한 시작 → 예상치 못한 전개 → 유머러스 반전"
1. **평범한 시작**: "오늘도 별일 없이 시작된 하루..."로 평범하게 시작
2. **예상치 못한 전개**: 일상에서 벌어진 예상치 못한 상황이나 에피소드 소개
3. **유머러스 반전**: "역시 정치인의 일상은..." 식의 자조적 유머로 마무리

**어조**: 유머러스하고 자조적인 어조, 실수나 어색한 상황도 웃음으로 승화
**핵심 어휘**: "별일 없는 하루인줄 알았는데", "그런데 웬걸", "알고보니", "역시나", "정치인도 사람인지라"`,

    variation3: `
## 배리에이션 C: 감성적 일상형 (새로운 스타일)
**메타태그**: tone(감성형) + approach(추억형) + structure(회상형)

**구조**: "감성적 순간 → 추억 회상 → 현재와 연결"
1. **감성적 순간**: 일상에서 마주친 감성적이고 따뜻한 순간 묘사
2. **추억 회상**: 그 순간이 불러일으킨 과거의 소중한 추억들 회상
3. **현재와 연결**: 추억을 통해 현재의 감사함이나 다짐을 자연스럽게 연결

**어조**: 따뜻하고 감성적인 어조, 과거와 현재를 잇는 서정적 표현
**핵심 어휘**: "문득 떠오른 기억", "그때 그 시절", "시간이 흘러도", "여전히 따뜻한", "마음 한편으로"`,

    toneA: "관찰형", approachA: "세심형", structureA: "연결형",
    styleA: "관찰세심연결", politicianA: "새로운스타일",
    
    toneB: "유머형", approachB: "자조형", structureB: "반전형",
    styleB: "유머자조반전", politicianB: "박지원스타일",
    
    toneC: "감성형", approachC: "추억형", structureC: "회상형",
    styleC: "감성추억회상", politicianC: "새로운스타일"
  };
}

/**
 * 소회표현 배리에이션
 */
function getPersonalThoughtsVariations(contextualConstraints) {
  return {
    goal: '정치인으로서의 솔직한 생각과 감정을 진정성 있게 표현하여 인간적 신뢰감을 조성한다',
    
    variation1: `
## 배리에이션 A: 성찰적 소회형 (새로운 스타일)
**메타태그**: tone(성찰형) + approach(깊이형) + structure(내면형)

**구조**: "내면 탐색 → 깊은 성찰 → 깨달음 공유"
1. **내면 탐색**: 최근 경험한 일들에 대한 솔직하고 깊이 있는 내면 탐색
2. **깊은 성찰**: 그 경험들이 자신에게 준 의미와 교훈에 대한 진지한 성찰
3. **깨달음 공유**: 개인적 깨달음을 공적 인물로서의 다짐과 연결하여 공유

**어조**: 진중하고 성찰적인 어조, 내면의 진실함이 느껴지는 표현
**핵심 어휘**: "돌이켜보니", "깊이 생각해보면", "제 마음 한구석에는", "솔직히 말씀드리면", "앞으로는"`,

    variation2: `
## 배리에이션 B: 진솔한 고백형 (새로운 스타일)
**메타태그**: tone(진솔형) + approach(고백형) + structure(단계형)

**구조**: "솔직한 고백 → 이유 설명 → 변화 다짐"
1. **솔직한 고백**: 최근 느낀 감정이나 생각을 숨김없이 솔직하게 고백
2. **이유 설명**: 그런 감정이나 생각을 갖게 된 배경과 이유를 구체적으로 설명
3. **변화 다짐**: 그 깨달음을 바탕으로 한 앞으로의 변화나 다짐 표현

**어조**: 솔직하고 진실한 어조, 가식 없는 진정성이 느껴지는 표현
**핵심 어휘**: "솔직히 털어놓자면", "제가 요즘 느끼는 것은", "이런 마음이 든 이유는", "앞으로는 달라지겠습니다"`,

    variation3: `
## 배리에이션 C: 감사와 다짐형 (새로운 스타일)
**메타태그**: tone(감사형) + approach(다짐형) + structure(순환형)

**구조**: "감사 인식 → 책임감 표현 → 미래 다짐 → 감사 순환"
1. **감사 인식**: 현재 자신이 처한 상황과 받은 도움에 대한 깊은 감사 인식
2. **책임감 표현**: 그 감사함이 가져다 준 무거운 책임감에 대한 진솔한 표현
3. **미래 다짐**: 그 책임감을 바탕으로 한 구체적이고 실현 가능한 미래 다짐
4. **감사 순환**: 다시 감사의 마음으로 돌아가는 순환적 구조

**어조**: 감사하고 겸손한 어조, 책임감이 느껴지는 진중한 표현
**핵심 어휘**: "정말 감사한 것은", "무거운 책임감을", "다짐하게 됩니다", "감사의 마음으로", "보답하는 길은"`,

    toneA: "성찰형", approachA: "깊이형", structureA: "내면형",
    styleA: "성찰깊이내면", politicianA: "새로운스타일",
    
    toneB: "진솔형", approachB: "고백형", structureB: "단계형",
    styleB: "진솔고백단계", politicianB: "새로운스타일",
    
    toneC: "감사형", approachC: "다짐형", structureC: "순환형",
    styleC: "감사다짐순환", politicianC: "새로운스타일"
  };
}

/**
 * 격려응원 배리에이션
 */
function getEncouragementVariations(contextualConstraints) {
  return {
    goal: '어려운 상황에 처한 사람들에게 진심 어린 격려와 응원을 전달하여 희망과 용기를 준다',
    
    variation1: `
## 배리에이션 A: 공감형 격려 (새로운 스타일)
**메타태그**: tone(공감형) + approach(경험형) + structure(단계형)

**구조**: "상황 공감 → 경험 공유 → 희망 메시지"
1. **상황 공감**: 상대방의 어려운 상황을 진심으로 이해하고 공감하는 마음 표현
2. **경험 공유**: 자신도 비슷한 어려움을 겪었던 경험을 자연스럽게 공유
3. **희망 메시지**: 그 경험을 바탕으로 한 구체적이고 실현 가능한 희망의 메시지

**어조**: 따뜻하고 공감적인 어조, 진심이 느껴지는 위로의 표현
**핵심 어휘**: "마음이 아픕니다", "저도 그런 경험이", "분명히 좋아질 것입니다", "함께 이겨내요", "응원하겠습니다"`,

    variation2: `
## 배리에이션 B: 실질적 지원형 (한정애 스타일)
**메타태그**: tone(실용형) + approach(구체형) + structure(해결형)

**구조**: "문제 파악 → 구체적 방안 → 실행 의지"
1. **문제 파악**: 상대방이 처한 구체적 문제 상황을 명확히 파악하고 정리
2. **구체적 방안**: 실제로 도움이 될 수 있는 구체적인 방법이나 자원 제시
3. **실행 의지**: 그 방안들을 실제로 추진하겠다는 구체적 의지와 계획 표명

**어조**: 실용적이고 해결 지향적인 어조, 신뢰할 수 있는 전문성
**핵심 어휘**: "구체적으로 도울 수 있는 것은", "이런 방법이 있습니다", "실제로 추진하겠습니다", "함께 해결해나가요"`,

    variation3: `
## 배리에이션 C: 영감형 격려 (새로운 스타일)
**메타태그**: tone(영감형) + approach(철학형) + structure(상승형)

**구조**: "현재 인정 → 잠재력 발견 → 비전 제시"
1. **현재 인정**: 지금까지 견뎌온 상대방의 노력과 용기를 충분히 인정하고 격려
2. **잠재력 발견**: 상대방 안에 숨어있는 강점과 가능성을 발견하여 제시
3. **비전 제시**: 그 잠재력이 실현되었을 때의 밝은 미래 비전을 영감적으로 제시

**어조**: 영감을 주고 희망적인 어조, 상대방의 가능성을 믿는 확신
**핵심 어휘**: "대단한 용기입니다", "이미 충분히 강합니다", "무한한 가능성이", "꿈을 이루실 것입니다", "함께 만들어가요"`,

    toneA: "공감형", approachA: "경험형", structureA: "단계형",
    styleA: "공감경험단계", politicianA: "새로운스타일",
    
    toneB: "실용형", approachB: "구체형", structureB: "해결형",
    styleB: "실용구체해결", politicianB: "한정애스타일",
    
    toneC: "영감형", approachC: "철학형", structureC: "상승형",
    styleC: "영감철학상승", politicianC: "새로운스타일"
  };
}

/**
 * 행사참석 배리에이션
 */
function getEventParticipationVariations(contextualConstraints) {
  return {
    goal: '행사 참석 경험을 통해 지역민들과의 소통과 화합의 모습을 보여주며 친근함을 어필한다',
    
    variation1: `
## 배리에이션 A: 생생한 현장형 (새로운 스타일)
**메타태그**: tone(생생형) + approach(현장형) + structure(시간순형)

**구조**: "현장 도착 → 생생한 참여 → 마무리 소감"
1. **현장 도착**: 행사장에 도착했을 때의 첫인상과 분위기를 생생하게 묘사
2. **생생한 참여**: 행사 진행 과정에서의 인상 깊었던 순간들을 시간 순으로 생생하게 전달
3. **마무리 소감**: 행사를 마치며 느낀 감동과 앞으로의 다짐을 진솔하게 표현

**어조**: 생생하고 현장감 넘치는 어조, 마치 함께 있는 듯한 생동감
**핵심 어휘**: "현장에 도착하니", "정말 인상 깊었던 것은", "그 순간", "생생히 느낄 수 있었던", "마음 깊이 새겨졌습니다"`,

    variation2: `
## 배리에이션 B: 감동 스토리형 (새로운 스타일)
**메타태그**: tone(감동형) + approach(스토리형) + structure(기승전결형)

**구조**: "특별한 만남 → 감동적 에피소드 → 깨달음 → 감사"
1. **특별한 만남**: 행사에서 만난 특별한 사람이나 상황 소개
2. **감동적 에피소드**: 그 만남에서 벌어진 감동적인 이야기나 에피소드 전개
3. **깨달음**: 그 경험을 통해 얻은 새로운 깨달음이나 교훈 공유
4. **감사**: 그런 만남과 경험을 할 수 있게 해준 것에 대한 감사 표현

**어조**: 감동적이고 따뜻한 어조, 진심이 우러나는 스토리텔링
**핵심 어휘**: "특별한 만남이 있었습니다", "정말 감동적이었던 것은", "그때 깨달은 것은", "평생 잊지 못할", "감사의 마음으로"`,

    variation3: `
## 배리에이션 C: 소통 중심형 (새로운 스타일)
**메타태그**: tone(소통형) + approach(대화형) + structure(쌍방향형)

**구조**: "대화 시작 → 다양한 의견 → 소통의 가치 → 지속 약속"
1. **대화 시작**: 참석자들과 어떻게 대화를 시작하게 되었는지 자연스럽게 소개
2. **다양한 의견**: 대화 과정에서 나온 다양하고 소중한 의견들을 균형있게 소개
3. **소통의 가치**: 그런 소통을 통해 느낀 민주적 대화의 소중함과 가치 강조
4. **지속 약속**: 이런 소통을 지속하겠다는 약속과 구체적 방법 제시

**어조**: 열린 마음과 소통 의지가 느껴지는 어조, 상호 존중의 자세
**핵심 어휘**: "대화를 나누며", "다양한 의견을 들으니", "소통의 힘을", "앞으로도 계속", "열린 마음으로"`,

    toneA: "생생형", approachA: "현장형", structureA: "시간순형",
    styleA: "생생현장시간순", politicianA: "새로운스타일",
    
    toneB: "감동형", approachB: "스토리형", structureB: "기승전결형",
    styleB: "감동스토리기승전결", politicianB: "새로운스타일",
    
    toneC: "소통형", approachC: "대화형", structureC: "쌍방향형",
    styleC: "소통대화쌍방향", politicianC: "새로운스타일"
  };
}

/**
 * 상태별 올바른 호칭 생성
 * @param {string} position - 직책
 * @param {string} status - 상태 (예비/현역)
 * @returns {string} 올바른 호칭
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
# AI비서관 - 일상 소통형 글쓰기 (${subCategory || '일반소통'})

${policy?.body || '이재명 대통령의 정치 철학과 더불어민주당의 가치를 반영하여 작성합니다.'}

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
민주, 평화, 복지, 혁신의 가치를 자연스럽게 반영

[👨‍💼 이재명 리더십 철학]
서민을 위한 정치, 현장 중심의 정치, 포용적 리더십을 바탕으로 작성

[📊 SEO 최적화 규칙]
- 분량: 300~800자 (고정)
- 키워드 배치: 제목에 1회, 본문에 400자당 1회 자연스럽게 포함
- 구조화: h2 소제목 2-3개, h3 세부제목 활용

[⚖️ 준수사항]
모든 주장은 사실에 근거하되, 의견은 "제 생각에는" 등으로 명확히 구분
법적 문제가 없도록 신중하게 작성

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

{
  "variations": [
    {
      "title": "첫 번째 배리에이션 제목",
      "content": "<p>HTML 형식의 본문 내용</p>",
      "wordCount": 실제_글자수,
      "style": "${subCategory || '일반소통'}_${variations.styleA || '논리데이터직진'}",
      "type": "${variations.politicianA || '새로운스타일'}",
      "meta": {
        "category": "일상소통",
        "subCategory": "${subCategory || '일반'}",
        "personalPreferences": {
          "tone": "${variations.toneA || '논리형'}",
          "approach": "${variations.approachA || '데이터형'}",
          "structure": "${variations.structureA || '직진형'}"
        },
        "contextualConstraints": {
          "authority": "${contextualConstraints.authority}",
          "regionScale": "${contextualConstraints.regionScale}",
          "timeContext": "${contextualConstraints.timeContext}"
        },
        "politician": "${variations.politicianA || '새로운스타일'}"
      }
    },
    {
      "title": "두 번째 배리에이션 제목",
      "content": "<p>HTML 형식의 본문 내용</p>",
      "wordCount": 실제_글자수,
      "style": "${subCategory || '일반소통'}_${variations.styleB || '친근경험순환'}",
      "type": "${variations.politicianB || '새로운스타일'}",
      "meta": {
        "category": "일상소통",
        "subCategory": "${subCategory || '일반'}",
        "personalPreferences": {
          "tone": "${variations.toneB || '친근형'}",
          "approach": "${variations.approachB || '경험형'}",
          "structure": "${variations.structureB || '순환형'}"
        },
        "contextualConstraints": {
          "authority": "${contextualConstraints.authority}",
          "regionScale": "${contextualConstraints.regionScale}",
          "timeContext": "${contextualConstraints.timeContext}"
        },
        "politician": "${variations.politicianB || '새로운스타일'}"
      }
    },
    {
      "title": "세 번째 배리에이션 제목",
      "content": "<p>HTML 형식의 본문 내용</p>",
      "wordCount": 실제_글자수,
      "style": "${subCategory || '일반소통'}_${variations.styleC || '감성철학점층'}",
      "type": "${variations.politicianC || '새로운스타일'}",
      "meta": {
        "category": "일상소통",
        "subCategory": "${subCategory || '일반'}",
        "personalPreferences": {
          "tone": "${variations.toneC || '감성형'}",
          "approach": "${variations.approachC || '철학형'}",
          "structure": "${variations.structureC || '점층형'}"
        },
        "contextualConstraints": {
          "authority": "${contextualConstraints.authority}",
          "regionScale": "${contextualConstraints.regionScale}",
          "timeContext": "${contextualConstraints.timeContext}"
        },
        "politician": "${variations.politicianC || '새로운스타일'}"
      }
    }
  ]
}
`.trim();
}

// ============================================================================
// 모듈 내보내기
// ============================================================================

module.exports = {
  buildDailyCommunicationPrompt,
  getCommunicationVariations,
  getContextualConstraints,
  getAuthorityLanguageGuide,
  getCorrectTitle,
  getGeneralCommunicationVariations,
  getGratitudeVariations,
  getDailyLifeVariations,
  getPersonalThoughtsVariations,
  getEncouragementVariations,
  getEventParticipationVariations
};