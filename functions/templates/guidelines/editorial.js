// functions/templates/prompts.js - editorial.js 규칙 완전 적용된 프롬프트 엔진

'use strict';

// ✅ editorial.js 직접 import (핵심!)
const { SEO_RULES, CONTENT_RULES, FORMAT_RULES, EDITORIAL_WORKFLOW } = require('./guidelines/editorial');

// Import other guidelines
const { LEGAL_GUIDELINES } = require('./guidelines/legal');
const { PARTY_VALUES } = require('./guidelines/theminjoo');
const { LEADERSHIP_PHILOSOPHY } = require('./guidelines/leadership');

// 임시 함수들 (실제 구현은 별도 파일에서)
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

// Import specialized prompts
const { buildActivityReportPrompt } = require('./prompts/activity-report');
const { buildLocalIssuesPrompt } = require('./prompts/local-issues');
const { buildPolicyProposalPrompt } = require('./prompts/policy-proposal');
const { buildCampaignPledgePrompt } = require('./prompts/campaign-pledge');
const { buildDailyCommunicationPrompt } = require('./prompts/daily-communication');
const { buildCurrentAffairsPrompt } = require('./prompts/current-affairs');


// ============================================================================
// ✅ [개선] 모든 프롬프트에 적용될 공통 규칙 정의
// ============================================================================
const COMMON_PROMPT_SECTIONS = {
  // editorial.js 규칙이 주입될 자리 표시자
  placeholders: `
[📊 SEO 최적화 규칙]
// 이 섹션은 시스템에 의해 자동으로 채워집니다.

[📝 출력 형식]
// 이 섹션은 시스템에 의해 자동으로 채워집니다.
`,

  // 할루시네이션 방지 가드레일
  hallucinationGuardrail: `
[🚫 절대 금지: 허위 사실 생성 (Hallucination Guardrail)]
- 작성자의 프로필(authorBio)에 명시되지 않은 개인적인 경험, 경력, 가족 관계, 과거사 등을 절대로 지어내거나 추측하여 작성하지 마세요.
- (나쁜 예): "제가 IMF 때 사업을 했던 경험...", "어릴 적 아버님과의 약속..." 등
- 모든 내용은 제공된 [기본 정보]와 [주제]에만 엄격하게 기반해야 합니다.
- 개인 서사를 만드는 것이 아니라, 주어진 정보를 바탕으로 메시지를 구성하는 것이 당신의 역할입니다.
`
};


// ============================================================================
// 프롬프트 타입 자동 선택 엔진
// ============================================================================

function selectPromptType(options) {
  const { category } = options;

  switch (category) {
    case '의정활동':
      return 'activity-report';
    case '지역현안':
    case '지역활동':
      return 'local-issues';
    case '정책제안':
    case '정책':
      return 'policy-proposal';
    case '선거공약':
    case '공약':
      return 'campaign-pledge';
    case '시사논평':
    case '논평':
    case '성명서':
      return 'current-affairs';
    case '일반소통':
    case '일반':
    default:
      return 'daily-communication';
  }
}

// ============================================================================
// ✅ editorial.js 규칙 적용 함수 (핵심 추가!)
// ============================================================================

/**
 * editorial.js의 SEO 및 콘텐츠 규칙을 options에 적용
 * @param {Object} options - 원본 옵션
 * @returns {Object} editorial.js 규칙이 적용된 옵션
 */
function applyEditorialRules(options) {
  // editorial.js에서 실제 규칙 값들을 가져옴
  const seoRules = SEO_RULES;
  const contentRules = CONTENT_RULES;
  const formatRules = FORMAT_RULES;
  
  return {
    ...options,
    
    // 🎯 SEO 최적화 규칙 (editorial.js에서 가져온 실제 값들)
    seoRules,
    wordCount: {
      min: seoRules.wordCount.min,
      max: seoRules.wordCount.max,
      target: seoRules.wordCount.target,
      description: seoRules.wordCount.description
    },
    
    // 🎯 키워드 배치 전략
    keywordStrategy: {
      title: seoRules.keywordPlacement.title,
      body: seoRules.keywordPlacement.body,
      density: seoRules.keywordPlacement.density
    },
    
    // 🎯 구조 최적화
    structureRules: {
      headings: seoRules.structure.headings,
      paragraphs: seoRules.structure.paragraphs,
      lists: seoRules.structure.lists
    },
    
    // 🎯 콘텐츠 작성 규칙
    contentRules,
    toneGuidelines: contentRules.tone,
    structureGuidelines: contentRules.structure,
    expressionGuidelines: contentRules.expression,
    
    // 🎯 출력 형식 규칙  
    formatRules,
    outputStructure: formatRules.outputStructure,
    htmlGuidelines: formatRules.htmlGuidelines,
    qualityStandards: formatRules.qualityStandards,
    
    // 🎯 편집 워크플로우
    editorialWorkflow: EDITORIAL_WORKFLOW,
    
    // 플래그 설정
    editorialRulesApplied: true,
    enforceWordCount: true,
    seoOptimized: true
  };
}

/**
 * 프롬프트에 editorial.js 규칙을 문자열로 삽입
 * @param {string} basePrompt - 기본 프롬프트
 * @param {Object} options - editorial.js 규칙이 적용된 옵션
 * @returns {string} 규칙이 삽입된 프롬프트
 */
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

  // 프롬프트에 규칙 삽입 (적절한 위치에)
  return basePrompt.replace(
    /(\[📊 SEO 최적화 규칙\])/g, 
    seoSection
  ).replace(
    /(\[📝 출력 형식\])/g,
    formatSection
  ) + '\n' + qualitySection;
}

// ============================================================================
// 통합 프롬프트 빌더 (메인 시스템) - editorial.js 완전 적용
// ============================================================================

async function buildSmartPrompt(options) {
  try {
    console.log('🔧 buildSmartPrompt 시작:', options.category, options.applyEditorialRules ? '(editorial.js 적용)' : '');
    
    // 1. 정책 로드
    const policy = await getPolicySafe();
    
    // 2. 프롬프트 타입 자동 선택
    const promptType = selectPromptType(options);
    
    // 3. ✅ editorial.js 규칙 적용 (핵심!)
    const enhancedOptions = options.applyEditorialRules 
      ? applyEditorialRules(options) 
      : options;
    
    // 4. 공통 가이드라인 준비
    const baseOptions = {
      ...enhancedOptions,
      policy,
      legalGuidelines: LEGAL_GUIDELINES,
      partyValues: PARTY_VALUES,
      leadership: LEADERSHIP_PHILOSOPHY,
      promptType
    };
    
    console.log('🎯 프롬프트 타입:', promptType, 
                '| SEO 최적화:', baseOptions.seoOptimized ? 'ON' : 'OFF',
                '| 목표분량:', baseOptions.wordCount?.target || 'N/A');
    
    // 5. 전문 프롬프트 생성
    let generatedPrompt;
    switch (promptType) {
      case 'activity-report':
        generatedPrompt = buildActivityReportPrompt(baseOptions);
        break;
      case 'local-issues':
        generatedPrompt = buildLocalIssuesPrompt(baseOptions);
        break;
      case 'policy-proposal':
        generatedPrompt = buildPolicyProposalPrompt(baseOptions);
        break;
      case 'campaign-pledge':
        generatedPrompt = buildCampaignPledgePrompt(baseOptions);
        break;
      case 'current-affairs':
        generatedPrompt = buildCurrentAffairsPrompt(baseOptions);
        break;
      case 'daily-communication':
      default:
        generatedPrompt = buildDailyCommunicationPrompt(baseOptions);
        break;
    }
    
    // 🔥 [핵심 개선] 생성된 프롬프트에 '공통 규칙'을 강제로 추가합니다.
    const finalPromptWithRules = generatedPrompt + 
                               COMMON_PROMPT_SECTIONS.placeholders + 
                               COMMON_PROMPT_SECTIONS.hallucinationGuardrail;

    // 6. ✅ editorial.js 규칙을 '자리 표시자'에 직접 삽입
    const finalPrompt = injectEditorialRules(finalPromptWithRules, baseOptions);
    
    console.log('✅ buildSmartPrompt 완료:', {
      promptType,
      editorialRulesApplied: baseOptions.editorialRulesApplied,
      promptLength: finalPrompt.length,
      targetWordCount: baseOptions.wordCount?.target
    });
    
    return finalPrompt;
    
  } catch (error) {
    console.error('❌ buildSmartPrompt 오류:', error);
    return createFallbackPrompt(options);
  }
}

// ============================================================================
// 폴백 프롬프트 시스템 - editorial.js 적용
// ============================================================================

function createFallbackPrompt(options) {
  const { 
    topic = '주제 없음',
    category = '일반',
    authorName = '정치인',
    authorPosition = '의원',
    applyEditorialRules = false
  } = options;

  // editorial.js 규칙 적용 여부에 따른 분량 조정
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

// ============================================================================
// 안전한 프롬프트 빌드 래퍼
// ============================================================================

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

// ============================================================================
// 유틸리티 함수들
// ============================================================================

function testPrompt() {
  return `다음 JSON만 출력: {"hello":"world","ts":"${new Date().toISOString()}","philosophy":"이재명정신","engine":"smart","editorial":"applied"}`;
}

function getPromptTemplate(category) {
  const templates = {
    '의정활동': {
      type: 'activity-report',
      description: '의정 활동 보고서 형식',
      defaultLength: SEO_RULES.wordCount.target + '자 (SEO 최적화)'
    },
    '지역현안': {
      type: 'local-issues', 
      description: '지역 현안 해결 중심',
      defaultLength: SEO_RULES.wordCount.target + '자 (SEO 최적화)'
    },
    '정책제안': {
      type: 'policy-proposal',
      description: '정책 제안 및 설명',
      defaultLength: SEO_RULES.wordCount.target + '자 (SEO 최적화)'
    },
    '선거공약': {
      type: 'campaign-pledge',
      description: '선거 공약 발표 형식',
      defaultLength: SEO_RULES.wordCount.target + '자 (SEO 최적화)'
    },
    '시사논평': {
      type: 'current-affairs',
      description: '시사 이슈 논평',
      defaultLength: SEO_RULES.wordCount.target + '자 (SEO 최적화)'
    },
    '일반소통': {
      type: 'daily-communication',
      description: '일상적 소통 메시지',
      defaultLength: SEO_RULES.wordCount.target + '자 (SEO 최적화)'
    }
  };

  return templates[category] || templates['일반소통'];
}

function validatePromptOptions(options) {
  if (!options) {
    console.warn('⚠️ 프롬프트 옵션이 없습니다.');
    return false;
  }

  if (!options.topic && !options.prompt) {
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
  selectPromptType,
  
  // ✅ editorial.js 관련 함수들 (새로 추가)
  applyEditorialRules,
  injectEditorialRules,
  
  // 외부 모듈에서 가져온 함수들 재내보내기
  getPolicySafe,
  createFallbackDraft,
  
  // 폴백 시스템
  createFallbackPrompt,
  
  // 유틸리티
  testPrompt,
  getPromptTemplate,
  validatePromptOptions
};