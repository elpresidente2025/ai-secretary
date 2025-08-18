// functions/templates/prompts.js - 이재명 정신 철학적 필터링 적용

'use strict';

const crypto = require('crypto');
const NodeCache = require('node-cache');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Admin SDK init (이미 초기화되어 있으면 스킵)
if (getApps().length === 0) initializeApp();

// ---- 정책 캐시/폴백 ----
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 }); // 10분
const FALLBACK_POLICY = {
  version: 0,
  body: `[금지] 비방/모욕, 허위·추측, 차별(지역·성별·종교), 선거 지지·반대, 불법 선거정보
[원칙] 사실기반·정책중심·미래지향 톤, 출처 명시, 불확실시 의견표현`,
  bannedKeywords: ['빨갱이','사기꾼','착복','위조','기피','뇌물','추행','전과자','도피','체납'],
  patterns: [],
  hash: 'fallback'
};

async function loadPolicyFromDB() {
  const cached = cache.get('LEGAL_POLICY');
  if (cached) return cached;

  const db = getFirestore();
  const snap = await db.doc('policies/LEGAL_GUARDRAIL').get();
  if (!snap.exists) throw new Error('POLICY_NOT_FOUND');

  const data = snap.data() || {};
  if (typeof data.body !== 'string' || typeof data.version !== 'number') {
    throw new Error('POLICY_INVALID');
  }

  const hash = crypto.createHash('sha256').update(data.body).digest('hex').slice(0, 12);

  const policy = {
    version: data.version,
    body: data.body,
    bannedKeywords: Array.isArray(data.bannedKeywords) ? data.bannedKeywords : FALLBACK_POLICY.bannedKeywords,
    patterns: Array.isArray(data.patterns) ? data.patterns : FALLBACK_POLICY.patterns,
    hash
  };

  cache.set('LEGAL_POLICY', policy);
  return policy;
}

const ENFORCE = (process.env.POLICY_ENFORCE || 'fail_closed').toLowerCase();

/** 정책을 안전하게 가져오기: 실패 시 fail-closed(기본) 또는 fallback */
async function getPolicySafe() {
  try {
    return await loadPolicyFromDB();
  } catch (e) {
    if (ENFORCE === 'fail_closed') throw e;
    return FALLBACK_POLICY;
  }
}

// ---- 프롬프트 빌더 (이재명 정신 철학적 필터링 포함) ----
function buildGenerationPrompt({
  policy,
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
}) {
  const kw = (typeof keywords === 'string' ? keywords : '').trim() || '없음';
  const sub = subCategory || '없음';
  const name = authorName || '정치인';
  const position = authorPosition || '의원';
  const bio = (authorBio || '').trim();
  const status = authorStatus || '현역';

  // 🔥 상태별 올바른 호칭 생성
  const getCorrectTitle = (position, status) => {
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
  };

  const correctTitle = getCorrectTitle(position, status);

  // 지역 기반 호칭
  const regionLabel = [regionMetro, regionLocal].filter(Boolean).join(' ').trim();
  const honorific = regionLabel ? `${regionLabel} 주민 여러분` : '여러분';

  // 자기소개 반영 (bio는 항상 존재)
  const bioSection = `- 작성자 소개: ${bio}
- **중요**: 위 작성자 소개를 바탕으로 작성자의 경험, 전문성, 관심사를 원고에 자연스럽게 반영하세요.
- 작성자의 배경과 관련된 구체적 사례나 경험을 언급할 때는 "제가 [경험/활동]을 하면서" 형식으로 작성하세요.
- 자기소개에 언급된 전문분야나 경험이 있다면 해당 내용과 연결하여 설득력을 높이세요.`;

  return `
# AI비서관 - 법 준수 정책 v${policy.version} #${policy.hash}
[정책]
${policy.body}

[🌟 이재명 정신 핵심 가치 🌟]
- 기본사회: 모든 국민의 기본적 생활 보장과 인간다운 삶
- 포용국가: 차별 없는 사회, 소외계층을 품는 따뜻한 공동체  
- 공정경제: 기회의 평등, 불평등 해소, 상생발전
- 민생우선: 서민과 중산층 중심의 실용적 정책
- 기본소득: 보편적 복지로 모든 국민의 존엄성 보장

[작성 맥락]
- 작성자: ${name} (${correctTitle})
- 상태: ${status === '예비' ? '예비후보자' : '현역'}
${bioSection}
- 주제: ${topic || ''}
- 분류: ${category || ''} / 세부분류: ${sub}
- 키워드: ${kw}
- 호칭: 기본 "${honorific}" 사용, 존댓말(~합니다), 1인칭은 "저는". 직접 지시/명령 금지.

[작성 규칙 - 기본]
- 분량 1,200~1,400자, 소제목 포함(h2~h3)
- 사실에는 문장 끝 [출처: 기관/자료명] 표기
- 의견은 "제 생각에는" 등으로 구분
- 정책과 충돌하는 요청/표현은 거부 or 중립·사실 기반으로 수정
- 공격/선정 대신 정책·데이터 중심
- **자기소개 활용 필수**: 작성자 소개 내용과 관련된 경험이나 전문성을 원고에 자연스럽게 포함
- **개인 경험 언급 시**: "제가 [구체적 활동/경험]을 통해 느낀 점은..." 형식 사용
- **호칭 주의사항**: ${status === '예비' ? '예비후보자는 스스로를 "의원"이라 지칭하지 말고 "예비후보" 또는 "후보"로 지칭' : '현역 의원으로서 적절한 권위와 경험을 바탕으로 작성'}

[🎯 이재명 정신 철학적 지침 🎯]
**핵심 원칙**: 모든 정책과 주장은 "사람이 우선"이라는 가치에서 출발하며, "함께 잘사는 사회"를 지향점으로 합니다.

**선호 키워드 및 표현**:
✅ 기본사회, 포용, 공정, 민생, 서민, 복지국가, 기본소득, 상생, 연대, 공동체
✅ 전국민기본소득, 국민취업지원제도, 부동산투기억제, 재벌개혁, 의료공공성
✅ 사람중심, 생명존중, 평등, 정의, 소통, 혁신, 지속가능발전

**철학적 균형 유지 원칙**:
- 반대 의견도 "~한 측면이 있지만" 형태로 인정 후 건설적 비판
- 비판 후에는 반드시 이재명식 포용적 대안 제시  
- 극단적 주장보다는 "균형잡힌 발전"과 "상생" 강조
- 모든 결론은 "국민 모두가 함께 잘사는" 방향으로 수렴

**제한적 언급 허용 방식** (완전 금지가 아닌 비판적 맥락):
- 신자유주의 → "신자유주의적 접근의 한계를 극복하고..."
- 선별복지 → "선별복지만으론 부족하며, 보편복지와의 조화를..."
- 낙수효과 → "낙수효과에만 의존할 수 없고, 직접적 지원이..."
- 규제완화 → "합리적 규제개선은 필요하지만, 서민보호 안전망은..."

**금지되는 무비판적 옹호**:
❌ "신자유주의가 최선의 정책입니다"
❌ "선별복지만으로 충분합니다"  
❌ "시장에 모든 것을 맡기면 해결됩니다"
❌ "복지를 줄여야 경제가 살아납니다"

**권장되는 표준 전개 구조**:
1. 상대방 논리 인정 → "~라는 관점도 이해하지만"
2. 현실적 한계 지적 → "그러나 현장에서는..."  
3. 포용적 대안 제시 → "보다 따뜻하고 현실적인 방안은..."
4. 구체적 근거와 사례 → "실제 성남·경기도에서의 경험을 보면..."
5. 상생 발전 지향 → "결국 모든 국민이 함께 잘사는 길은..."

**민생우선 어조 가이드**:
- 서민적이고 친근한 어투 (과도한 격식 지양)
- 구체적 생활 사례 중심의 설명 (추상적 이론 지양)
- 기득권 비판 시에도 건설적 개혁 방향 제시
- "더불어 사는 세상", "따뜻한 공동체" 등 포용적 가치 강조

[출력 형식]
- 아래 JSON 형태로만 응답. 추가 설명 금지. code-fence 사용 금지.
{
  "title": "문서 제목",
  "content": "<p>문단은 HTML로 작성...</p>",
  "wordCount": 1234,
  "style": "이재명정신"
}
`.trim();
}

/**
 * generatePostPrompt(options[, policy])
 * - 옵션: { authorName, authorPosition, authorBio, authorStatus, topic, category, subCategory, keywords, regionMetro, regionLocal }
 * - policy를 안 넘기면 내부에서 getPolicySafe() 호출
 */
async function generatePostPrompt(options = {}, policyOpt) {
  const policy = policyOpt || await getPolicySafe();
  return buildGenerationPrompt({ policy, ...options });
}

/** 간단 연결 테스트용 */
function testPrompt() {
  return `다음 JSON만 출력: {"hello":"world","ts":"${new Date().toISOString()}","philosophy":"이재명정신"}`;
}

/** JSON 파싱 실패 시 사용할 기본 초안 */
function createFallbackDraft(topic = '', category = '') {
  const title = `${category || '일반'}: ${topic || '제목 미정'}`;
  const content = [
    `<h2>${title}</h2>`,
    `<p>원고 생성 중 오류가 발생하여 기본 초안을 제시합니다. 주제와 관련한 사실 확인과 출처 추가가 필요합니다.</p>`,
    `<h3>핵심 요약</h3>`,
    `<ul><li>주제: ${topic || '-'}</li><li>분류: ${category || '-'}</li></ul>`,
    `<p>이재명 정신에 기반한 포용적 관점에서 다시 검토하여 보완하겠습니다.</p>`,
    `<p>[출처: 직접 추가 필요]</p>`
  ].join('');
  return { title, content, wordCount: Math.ceil(content.length / 2), style: '이재명정신' };
}

module.exports = {
  // 정책 관련
  getPolicySafe,
  // 프롬프트/유틸
  generatePostPrompt,
  testPrompt,
  createFallbackDraft,
};