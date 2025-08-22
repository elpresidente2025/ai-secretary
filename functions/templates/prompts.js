// functions/templates/prompts.js - 순수 프롬프트 엔진

'use strict';

// Import guidelines (모든 정책과 가이드라인은 외부 모듈에서)
// NOTE: 'rules.js' 파일이 없어 개별 파일에서 직접 가이드라인을 가져오도록 수정했습니다.
const { LEGAL_GUIDELINES } = require('./guidelines/legal');
const { SEO_RULES, CONTENT_RULES } = require('./guidelines/editorial');
const { PARTY_VALUES } = require('./guidelines/theminjoo');
const { LEADERSHIP_PHILOSOPHY } = require('./guidelines/leadership');

// NOTE: './guidelines/rules.js' 모듈을 찾을 수 없어 임시 함수를 정의합니다.
// TODO: 향후 실제 정책 로드 및 대체 초안 생성 로직으로 교체해야 합니다.
async function getPolicySafe() {
  // 정책 데이터를 비동기적으로 가져오는 로직 (예: DB 조회)
  // 현재는 임시로 정적 객체를 반환합니다.
  return Promise.resolve({
    body: "[SYSTEM_POLICY] AI 비서관은 항상 법적, 정치적 가이드라인을 준수하여 신중하게 발언해야 합니다."
  });
}
function createFallbackDraft(options) {
  // 오류 발생 시 사용할 대체 초안을 생성하는 로직
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
// 프롬프트 타입 자동 선택 엔진
// ============================================================================

/**
 * 사용자가 선택한 카테고리에 따라 적절한 프롬프트 타입을 선택
 * @param {Object} options - 사용자 입력 옵션
 * @returns {string} 선택된 프롬프트 타입
 */
function selectPromptType(options) {
  const { category } = options;

  // 카테고리 직접 매핑
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
// 통합 프롬프트 빌더 (메인 시스템)
// ============================================================================

/**
 * 통합 프롬프트 빌더 - 타입 자동 선택 및 전문 프롬프트 생성
 * @param {Object} options - 프롬프트 생성 옵션
 * @returns {Promise<string>} 생성된 프롬프트
 */
async function buildSmartPrompt(options) {
  try {
    // 1. 정책 로드
    const policy = await getPolicySafe();
    
    // 2. 프롬프트 타입 자동 선택
    const promptType = selectPromptType(options);
    
    // 3. 공통 가이드라인 준비 (모든 가이드라인을 외부에서 가져옴)
    const baseOptions = {
      ...options,
      policy,
      legalGuidelines: LEGAL_GUIDELINES,
      seoRules: SEO_RULES,
      contentRules: CONTENT_RULES,
      partyValues: PARTY_VALUES,
      leadership: LEADERSHIP_PHILOSOPHY,
      promptType
    };
    
    // 4. 전문 프롬프트 생성 (각 파일에서 구현)
    switch (promptType) {
      case 'activity-report':
        return buildActivityReportPrompt(baseOptions);
      
      case 'local-issues':
        return buildLocalIssuesPrompt(baseOptions);
      
      case 'policy-proposal':
        return buildPolicyProposalPrompt(baseOptions);
      
      case 'campaign-pledge':
        return buildCampaignPledgePrompt(baseOptions);
      
      case 'current-affairs':
        return buildCurrentAffairsPrompt(baseOptions);
      
      case 'daily-communication':
      default:
        return buildDailyCommunicationPrompt(baseOptions);
    }
  } catch (error) {
    console.error('❌ buildSmartPrompt 오류:', error);
    
    // 폴백 프롬프트 생성
    return createFallbackPrompt(options);
  }
}

// ============================================================================
// 폴백 프롬프트 시스템
// ============================================================================

/**
 * 오류 발생시 사용할 폴백 프롬프트 생성
 * @param {Object} options - 프롬프트 생성 옵션
 * @returns {string} 폴백 프롬프트
 */
function createFallbackPrompt(options) {
  const { 
    topic = '주제 없음',
    category = '일반',
    authorName = '정치인',
    authorPosition = '의원'
  } = options;

  return `
# AI비서관 - 기본 글쓰기 모드

[🎯 기본 목표]
${authorName} ${authorPosition}의 입장에서 "${topic}" 주제로 ${category} 카테고리에 맞는 글을 작성한다.

[📋 기본 정보]
- 작성자: ${authorName} (${authorPosition})
- 주제: ${topic}
- 카테고리: ${category}

[✅ 필수 요구사항]
1. **이재명 정신 반영**: 서민을 위한 정치, 공정한 사회, 미래를 여는 혁신
2. **더불어민주당 가치**: 민주, 평화, 복지, 혁신의 가치 반영
3. **법적 안전성**: 선거법, 공직선거법, 정치자금법 등 관련 법령 준수
4. **품격 있는 표현**: 정치인으로서 품위를 지키며 건설적인 메시지

[📝 작성 지침]
- 주제와 관련된 구체적이고 실용적인 내용
- 지역민들의 관심사와 연결되는 메시지
- SNS 특성을 고려한 읽기 쉬운 문체
- 적절한 해시태그와 이모지 활용

위 지침에 따라 300-800자 분량의 글을 작성해주세요.

**중요**: 이재명 대통령의 철학과 더불어민주당의 가치를 반영하여 작성하되, 법적 문제가 없도록 신중하게 표현해주세요.
`;
}

// ============================================================================
// 유틸리티 함수들
// ============================================================================

/**
 * 간단 연결 테스트용
 * @returns {string} 테스트 프롬프트
 */
function testPrompt() {
  return `다음 JSON만 출력: {"hello":"world","ts":"${new Date().toISOString()}","philosophy":"이재명정신","engine":"smart"}`;
}

/**
 * 카테고리별 프롬프트 템플릿 가져오기
 * @param {string} category - 카테고리명
 * @returns {Object} 프롬프트 템플릿 정보
 */
function getPromptTemplate(category) {
  const templates = {
    '의정활동': {
      type: 'activity-report',
      description: '의정 활동 보고서 형식',
      defaultLength: '500-1000자'
    },
    '지역현안': {
      type: 'local-issues', 
      description: '지역 현안 해결 중심',
      defaultLength: '400-800자'
    },
    '정책제안': {
      type: 'policy-proposal',
      description: '정책 제안 및 설명',
      defaultLength: '600-1200자'
    },
    '선거공약': {
      type: 'campaign-pledge',
      description: '선거 공약 발표 형식',
      defaultLength: '400-800자'
    },
    '시사논평': {
      type: 'current-affairs',
      description: '시사 이슈 논평',
      defaultLength: '300-600자'
    },
    '일반소통': {
      type: 'daily-communication',
      description: '일상적 소통 메시지',
      defaultLength: '200-500자'
    }
  };

  return templates[category] || templates['일반소통'];
}

/**
 * 프롬프트 생성 옵션 유효성 검사
 * @param {Object} options - 프롬프트 생성 옵션
 * @returns {boolean} 유효성 검사 결과
 */
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

/**
 * 안전한 프롬프트 빌드 래퍼
 * @param {Object} options - 프롬프트 생성 옵션
 * @returns {Promise<string>} 생성된 프롬프트
 */
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
// 내보내기
// ============================================================================

module.exports = {
  // 메인 시스템
  buildSmartPrompt,
  buildSmartPromptSafe,
  selectPromptType,
  
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