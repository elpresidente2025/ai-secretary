// functions/templates/prompts.js - 순수 프롬프트 엔진

'use strict';

// Import guidelines (모든 정책과 가이드라인은 외부 모듈에서)
const { LEGAL_GUIDELINES, SEO_RULES, CONTENT_RULES, getPolicySafe, createFallbackDraft } = require('./guidelines/rules');
const { PARTY_VALUES } = require('./guidelines/theminjoo');
const { LEADERSHIP_PHILOSOPHY } = require('./guidelines/leadership');

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
  // 1. 정책 로드 (rules.js에서)
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
}

// ============================================================================
// 유틸리티 함수들
// ============================================================================

/** 간단 연결 테스트용 */
function testPrompt() {
  return `다음 JSON만 출력: {"hello":"world","ts":"${new Date().toISOString()}","philosophy":"이재명정신","engine":"smart"}`;
}

// ============================================================================
// 내보내기
// ============================================================================

module.exports = {
  // 메인 시스템
  buildSmartPrompt,
  selectPromptType,
  
  // 외부 모듈에서 가져온 함수들 재내보내기
  getPolicySafe,
  createFallbackDraft,
  
  // 유틸리티
  testPrompt,
};