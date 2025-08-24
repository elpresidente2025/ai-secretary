/**
 * functions/templates/prompts.js
 * AI비서관의 핵심 프롬프트 엔진입니다.
 * editorial.js 규칙과 지능적 프레이밍(framingRules.js) 시스템이 완벽하게 통합되었습니다.
 */

'use strict';

// 가이드라인 및 규칙 import
const { SEO_RULES, CONTENT_RULES, FORMAT_RULES, EDITORIAL_WORKFLOW } = require('./guidelines/editorial');
const { LEGAL_GUIDELINES } = require('./guidelines/legal');
const { PARTY_VALUES } = require('./guidelines/theminjoo');
const { LEADERSHIP_PHILOSOPHY } = require('./guidelines/leadership');
// [신규] 지능적 프레이밍 규칙 import
const { OVERRIDE_KEYWORDS, HIGH_RISK_KEYWORDS, POLITICAL_FRAMES } = require('./guidelines/framingRules');


// 세부 작법(prompts) 모듈 import
const { buildActivityReportPrompt } = require('./prompts/activity-report');
const { buildLocalIssuesPrompt } = require('./prompts/local-issues');
const { buildPolicyProposalPrompt } = require('./prompts/policy-proposal');
const { buildCampaignPledgePrompt } = require('./prompts/campaign-pledge');
const { buildDailyCommunicationPrompt } = require('./prompts/daily-communication');
const { buildCurrentAffairsPrompt } = require('./prompts/current-affairs');

// 임시 함수 (실제 구현은 별도 파일에서)
async function getPolicySafe() {
  return Promise.resolve({
    body: "[SYSTEM_POLICY] AI 비서관은 항상 법적, 정치적 가이드라인을 준수하여 신중하게 발언해야 합니다."
  });
}

function createFallbackDraft(options) {
  return {
    title: `[임시] ${options.topic || '요청 주제'}`,
    content: `<p>시스템 오류로 인해 요청하신 초안을 생성하지 못했습니다. 관리자에게 문의해주세요.</p>`,
  };
}


// ============================================================================
// 지능적 프레이밍 에이전트 (신규 추가)
// ============================================================================

/**
 * @agent Intent Analysis Agent
 * @description 사용자의 주제(topic)를 분석하여 적용할 정치적 프레임을 결정합니다.
 * '규칙 우선순위'에 따라 예외 규칙을 먼저 확인합니다.
 * @param {string} topic - 사용자가 입력한 주제
 * @returns {Object|null} 적용할 프레임 객체 또는 null
 */
function analyzeAndSelectFrame(topic) {
  if (!topic) return null;

  // 1. [최우선] 프레이밍 '예외' 규칙을 먼저 확인합니다.
  const isOverridden = Object.values(OVERRIDE_KEYWORDS).flat().some(keyword => topic.includes(keyword));
  if (isOverridden) {
    // 예: '문재인 정부'가 포함된 경우, 프레이밍을 적용하지 않고 즉시 종료합니다.
    return null;
  }

  // 2. [차선] 예외에 해당하지 않을 경우에만 '고위험' 규칙을 확인합니다.
  const isSelfCriticism = HIGH_RISK_KEYWORDS.SELF_CRITICISM.some(keyword => topic.includes(keyword));
  if (isSelfCriticism) {
    return POLITICAL_FRAMES.CONSTRUCTIVE_CRITICISM;
  }

  // 어떤 규칙에도 해당하지 않으면 프레이밍을 적용하지 않음
  return null;
}

/**
 * @agent Prompt Restructuring Agent
 * @description 결정된 프레임에 따라 원본 프롬프트에 지시어를 삽입하여 재구성합니다.
 * @param {string} basePrompt - 원본 프롬프트
 * @param {Object} frame - 적용할 프레임 객체
 * @returns {string} 프레이밍 지시어가 삽입된 새로운 프롬프트
 */
function applyFramingToPrompt(basePrompt, frame) {
  if (!frame) {
    return basePrompt; // 적용할 프레임이 없으면 원본 그대로 반환
  }
  // 프레임에 정의된 지시어를 원본 프롬프트 앞부분에 삽입
  return `${frame.promptInjection}\n\n---\n\n${basePrompt}`;
}


// ============================================================================
// 통합 프롬프트 빌더 (기존 시스템 + 프레이밍 통합)
// ============================================================================

async function buildSmartPrompt(options) {
  try {
    const topic = options.topic || options.prompt || '';
    
    // 1. 정책 로드 및 프롬프트 타입 선택
    const policy = await getPolicySafe();
    const promptType = selectPromptType(options);
    
    // 2. editorial.js 규칙 적용
    const enhancedOptions = options.applyEditorialRules ? applyEditorialRules(options) : options;
    
    const baseOptions = {
      ...enhancedOptions,
      policy,
      legalGuidelines: LEGAL_GUIDELINES,
      partyValues: PARTY_VALUES,
      leadership: LEADERSHIP_PHILOSOPHY,
      promptType
    };

    // 3. 전문 프롬프트 생성 (원본)
    let generatedPrompt;
    switch (promptType) {
      case 'activity-report': generatedPrompt = buildActivityReportPrompt(baseOptions); break;
      case 'local-issues': generatedPrompt = buildLocalIssuesPrompt(baseOptions); break;
      case 'policy-proposal': generatedPrompt = buildPolicyProposalPrompt(baseOptions); break;
      case 'campaign-pledge': generatedPrompt = buildCampaignPledgePrompt(baseOptions); break;
      case 'current-affairs': generatedPrompt = buildCurrentAffairsPrompt(baseOptions); break;
      case 'daily-communication': 
      default: 
        generatedPrompt = buildDailyCommunicationPrompt(baseOptions); 
        break;
    }

    // --- 지능적 프레이밍 로직 적용 ---
    // 4. 사용자의 주제(topic)로 의도 분석 및 프레임 결정
    const selectedFrame = analyzeAndSelectFrame(topic);

    // 5. 결정된 프레임으로 프롬프트 재구성
    const framedPrompt = applyFramingToPrompt(generatedPrompt, selectedFrame);
    // ----------------------------------

    // 6. editorial.js 규칙을 최종 프롬프트 문자열에 삽입
    const finalPrompt = injectEditorialRules(framedPrompt, baseOptions);
    
    console.log('✅ buildSmartPrompt 완료:', {
      promptType,
      editorialRulesApplied: !!baseOptions.editorialRulesApplied,
      framingApplied: selectedFrame ? selectedFrame.id : 'None',
      promptLength: finalPrompt.length,
    });
    
    return finalPrompt;
    
  } catch (error) {
    console.error('❌ buildSmartPrompt 오류:', error);
    return createFallbackPrompt(options);
  }
}

// ============================================================================
// 하위 모듈 및 유틸리티 함수
// ============================================================================

function selectPromptType(options) {
  const { category } = options;

  switch (category) {
    case '의정활동': return 'activity-report';
    case '지역현안': case '지역활동': return 'local-issues';
    case '정책제안': case '정책': return 'policy-proposal';
    case '선거공약': case '공약': return 'campaign-pledge';
    case '시사논평': case '논평': case '성명서': return 'current-affairs';
    case '일반소통': case '일반': 
    default: 
      return 'daily-communication';
  }
}

function applyEditorialRules(options) {
  const seoRules = SEO_RULES;
  const contentRules = CONTENT_RULES;
  const formatRules = FORMAT_RULES;
  
  return {
    ...options,
    seoRules,
    wordCount: { min: seoRules.wordCount.min, max: seoRules.wordCount.max, target: seoRules.wordCount.target, description: seoRules.wordCount.description },
    keywordStrategy: { title: seoRules.keywordPlacement.title, body: seoRules.keywordPlacement.body, density: seoRules.keywordPlacement.density },
    structureRules: { headings: seoRules.structure.headings, paragraphs: seoRules.structure.paragraphs, lists: seoRules.structure.lists },
    contentRules,
    toneGuidelines: contentRules.tone,
    structureGuidelines: contentRules.structure,
    expressionGuidelines: contentRules.expression,
    formatRules,
    outputStructure: formatRules.outputStructure,
    htmlGuidelines: formatRules.htmlGuidelines,
    qualityStandards: formatRules.qualityStandards,
    editorialWorkflow: EDITORIAL_WORKFLOW,
    editorialRulesApplied: true,
    enforceWordCount: true,
    seoOptimized: true
  };
}

function injectEditorialRules(basePrompt, options) {
  if (!options.editorialRulesApplied) {
    return basePrompt;
  }

  const seoSection = `
[🎯 SEO 최적화 규칙 (editorial.js 적용)]
- **필수 분량**: ${options.wordCount.min}~${options.wordCount.max}자 (목표: ${options.wordCount.target}자)
- **키워드 배치**: 제목에 ${options.keywordStrategy.title.count}회, 본문 ${options.keywordStrategy.body.interval}자당 1회
- **키워드 밀도**: ${options.keywordStrategy.density.optimal} (최대 ${options.keywordStrategy.density.maximum})
- **구조화**: H2 소제목 ${options.structureRules.headings.h2.count}, H3 소제목 ${options.structureRules.headings.h3.count}
- **문단 구성**: ${options.structureRules.paragraphs.count}, 각 ${options.structureRules.paragraphs.length}`;

  const qualitySection = `
[✅ 품질 기준 (editorial.js 적용)]
- **가독성**: 평균 문장길이 ${options.formatRules.qualityStandards.readability.sentenceLength}
- **문단길이**: ${options.formatRules.qualityStandards.readability.paragraphLength}
- **일관성**: ${options.formatRules.qualityStandards.coherence.logicalFlow}
- **참여도**: ${options.formatRules.qualityStandards.engagement.personalTouch}`;

  const formatSection = `
[📝 출력 형식 (editorial.js 적용)]
${JSON.stringify(options.formatRules.outputStructure.required, null, 2)}

**HTML 가이드라인 (매우 중요):**
${options.formatRules.htmlGuidelines.structure.map(rule => `- ${rule}`).join('\n')}
- **강조**: 핵심 메시지나 키워드는 \`<strong>\` 태그를 사용하여 문단별로 1~2회 자연스럽게 강조하세요.

**금지사항**:
${options.formatRules.htmlGuidelines.prohibitions.map(rule => `- ${rule}`).join('\n')}`;

  return basePrompt.replace(
    /(\[📊 SEO 최적화 규칙\])/g, 
    seoSection
  ).replace(
    /(\[📝 출력 형식\])/g,
    formatSection
  ) + '\n' + qualitySection;
}

function createFallbackPrompt(options) {
  const { 
    topic = '주제 없음',
    category = '일반',
    authorName = '정치인',
    authorPosition = '의원',
    applyEditorialRules = false
  } = options;

  const targetLength = applyEditorialRules 
    ? `${SEO_RULES.wordCount.min}-${SEO_RULES.wordCount.max}자 (SEO 최적화 적용)`
    : '300-800자';

  const seoGuideline = applyEditorialRules ? `

[🎯 SEO 최적화 필수 (editorial.js 적용)]
- 분량: ${SEO_RULES.wordCount.target}자 목표 (최소 ${SEO_RULES.wordCount.min}자)
- 키워드 자연스러운 배치
- H2, H3 소제목 활용
- 구조화된 HTML 형식` : '';

  return `
# AI비서관 - 기본 글쓰기 모드 ${applyEditorialRules ? '(SEO 최적화)' : ''}

[🎯 기본 목표]
${authorName} ${authorPosition}의 입장에서 "${topic}" 주제로 ${category} 카테고리에 맞는 글을 작성한다.

[📋 기본 정보]
- 작성자: ${authorName} (${authorPosition})
- 주제: ${topic}
- 카테고리: ${category}
- 목표 분량: ${targetLength}

[✅ 필수 요구사항]
1. **이재명 정신 반영**: 서민을 위한 정치, 공정한 사회, 미래를 여는 혁신
2. **더불어민주당 가치**: 민주, 평화, 복지, 혁신의 가치 반영
3. **법적 안전성**: 선거법, 공직선거법, 정치자금법 등 관련 법령 준수
4. **품격 있는 표현**: 정치인으로서 품위를 지키며 건설적인 메시지${seoGuideline}

[📝 작성 지침]
- 주제와 관련된 구체적이고 실용적인 내용
- 지역민들의 관심사와 연결되는 메시지
- ${applyEditorialRules ? 'SEO 최적화를 고려한 구조화된' : 'SNS 특성을 고려한 읽기 쉬운'} 문체
- 적절한 ${applyEditorialRules ? 'HTML 태그와' : ''} 해시태그 활용

위 지침에 따라 ${targetLength} 분량의 글을 작성해주세요.

**중요**: 이재명 대통령의 철학과 더불어민주당의 가치를 반영하여 작성하되, 법적 문제가 없도록 신중하게 표현해주세요.
`;
}

async function buildSmartPromptSafe(options) {
  try {
    if (!validatePromptOptions(options)) {
      return createFallbackPrompt(options || {});
    }
    return await buildSmartPrompt(options);
  } catch (error) {
    console.error('❌ buildSmartPromptSafe 오류:', error);
    return createFallbackPrompt(options || {});
  }
}

function validatePromptOptions(options) {
  if (!options || (!options.topic && !options.prompt)) {
    console.warn('⚠️ 주제(topic) 또는 프롬프트(prompt)가 필요합니다.');
    return false;
  }
  return true;
}


// ============================================================================
// 내보내기
// ============================================================================

module.exports = {
  // 메인 시스템
  buildSmartPrompt,
  buildSmartPromptSafe,
  
  // 지능적 프레이밍 관련 함수들 (신규 추가)
  analyzeAndSelectFrame,
  applyFramingToPrompt,
  
  // 기존 유틸리티 및 하위 모듈 함수들
  selectPromptType,
  applyEditorialRules,
  injectEditorialRules,
  createFallbackPrompt,
  validatePromptOptions,
  getPolicySafe,
  createFallbackDraft,
};
