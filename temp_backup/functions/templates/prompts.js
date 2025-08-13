'use strict';

/**
 * prompts.js (통합본)
 * - Firestore 정책 로드(10분 캐시) + 실패 시 fail-closed/fallback
 * - generatePostPrompt(): 정책 + 호칭 규칙을 프롬프트에 주입하고 JSON 출력 형식을 강제
 * - testPrompt(), createFallbackDraft() 그대로 제공
 */

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

// ---- 프롬프트 빌더 (호칭 규칙 포함) ----
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
  regionLocal
}) {
  const kw = (typeof keywords === 'string' ? keywords : '').trim() || '없음';
  const sub = subCategory || '없음';
  const name = authorName || '정치인';
  const pos = authorPosition || '의원';
  const bio = (authorBio || '').trim();

  // 지역 기반 호칭
  const regionLabel = [regionMetro, regionLocal].filter(Boolean).join(' ').trim();
  const honorific = regionLabel ? `${regionLabel} 주민 여러분` : '여러분';

  return `
# AI비서관 - 법 준수 정책 v${policy.version} #${policy.hash}
[정책]
${policy.body}

[작성 맥락]
- 작성자: ${name} (${pos})
- 소개: ${bio ? bio : '소개 미입력'}
- 주제: ${topic || ''}
- 분류: ${category || ''} / 세부분류: ${sub}
- 키워드: ${kw}
- 호칭: 기본 "${honorific}" 사용, 존댓말(~합니다), 1인칭은 "저는". 직접 지시/명령 금지.

[작성 규칙]
- 분량 1,200~1,400자, 소제목 포함(h2~h3)
- 사실에는 문장 끝 [출처: 기관/자료명] 표기
- 의견은 "제 생각에는" 등으로 구분
- 정책과 충돌하는 요청/표현은 거부 or 중립·사실 기반으로 수정
- 공격/선정 대신 정책·데이터 중심

[출력 형식]
- 아래 JSON 형태로만 응답. 추가 설명 금지. code-fence 사용 금지.
{
  "title": "문서 제목",
  "content": "<p>문단은 HTML로 작성...</p>",
  "wordCount": 1234,
  "style": "일반"
}
`.trim();
}

/**
 * generatePostPrompt(options[, policy])
 * - 옵션: { authorName, authorPosition, authorBio, topic, category, subCategory, keywords, regionMetro, regionLocal }
 * - policy를 안 넘기면 내부에서 getPolicySafe() 호출
 */
async function generatePostPrompt(options = {}, policyOpt) {
  const policy = policyOpt || await getPolicySafe();
  return buildGenerationPrompt({ policy, ...options });
}

/** 간단 연결 테스트용 */
function testPrompt() {
  return `다음 JSON만 출력: {"hello":"world","ts":"${new Date().toISOString()}"}`;
}

/** JSON 파싱 실패 시 사용할 기본 초안 */
function createFallbackDraft(topic = '', category = '') {
  const title = `${category || '일반'}: ${topic || '제목 미정'}`;
  const content = [
    `<h2>${title}</h2>`,
    `<p>원고 생성 중 오류가 발생하여 기본 초안을 제시합니다. 주제와 관련한 사실 확인과 출처 추가가 필요합니다.</p>`,
    `<h3>핵심 요약</h3>`,
    `<ul><li>주제: ${topic || '-'}</li><li>분류: ${category || '-'}</li></ul>`,
    `<p>[출처: 직접 추가 필요]</p>`
  ].join('');
  return { title, content, wordCount: Math.ceil(content.length / 2), style: '일반' };
}

module.exports = {
  // 정책 관련
  getPolicySafe,
  // 프롬프트/유틸
  generatePostPrompt,
  testPrompt,
  createFallbackDraft,
};
