/**
 * functions/templates/prompts.js (최종본)
 * AI비서관의 메인 프롬프트 라우터(Router)입니다.
 * 사용자의 요청에 따라 적절한 작법 모듈을 호출하고,
 * '지능적 프레이밍'과 'editorial' 규칙을 적용하여 최종 프롬프트를 완성합니다.
 */

'use strict';

// 가이드라인 및 규칙 import
const { SEO_RULES, FORMAT_RULES } = require('./guidelines/editorial');
const { OVERRIDE_KEYWORDS, HIGH_RISK_KEYWORDS, POLITICAL_FRAMES } = require('./guidelines/framingRules');

// [신규] 작법별 프롬프트 빌더 모듈 import
const { buildDailyCommunicationPrompt } = require('./prompts/daily-communication');
const { buildLogicalWritingPrompt } = require('./prompts/policy-proposal');
const { buildActivityReportPrompt } = require('./prompts/activity-report'); // direct-writing -> activity-report
const { buildCriticalWritingPrompt } = require('./prompts/current-affairs');
const { buildLocalIssuesPrompt } = require('./prompts/local-issues'); // analytical-writing -> local-issues

// ============================================================================
// 지능적 프레이밍 에이전트
// ============================================================================

function analyzeAndSelectFrame(topic) {
  if (!topic) return null;
  const isOverridden = Object.values(OVERRIDE_KEYWORDS).flat().some(keyword => topic.includes(keyword));
  if (isOverridden) return null;
  const isSelfCriticism = HIGH_RISK_KEYWORDS.SELF_CRITICISM.some(keyword => topic.includes(keyword));
  if (isSelfCriticism) return POLITICAL_FRAMES.CONSTRUCTIVE_CRITICISM;
  return null;
}

function applyFramingToPrompt(basePrompt, frame) {
  if (!frame) return basePrompt;
  return `${frame.promptInjection}\n\n---\n\n${basePrompt}`;
}

// ============================================================================
// 통합 프롬프트 빌더 (v3 - Router)
// ============================================================================

async function buildSmartPrompt(options) {
  try {
    const { writingMethod, topic } = options;
    let generatedPrompt;

    // 1. [라우팅] 사용자가 선택한 작법(writingMethod)에 따라 적절한 빌더 호출
    switch (writingMethod) {
      case 'emotional_writing':
        generatedPrompt = buildDailyCommunicationPrompt(options);
        break;
      case 'logical_writing':
        generatedPrompt = buildLogicalWritingPrompt(options);
        break;
      case 'direct_writing': // formConstants에서 activity-report, policy-proposal 등이 direct_writing을 사용할 수 있음
        generatedPrompt = buildActivityReportPrompt(options);
        break;
      case 'critical_writing':
        generatedPrompt = buildCriticalWritingPrompt(options);
        break;
      case 'analytical_writing':
        generatedPrompt = buildLocalIssuesPrompt(options);
        break;
      default:
        console.warn(`알 수 없는 작법: ${writingMethod}. 기본 작법으로 대체합니다.`);
        generatedPrompt = buildDailyCommunicationPrompt(options);
        break;
    }

    // 2. [프레이밍] 지능적 프레이밍 적용
    const selectedFrame = analyzeAndSelectFrame(topic);
    const framedPrompt = applyFramingToPrompt(generatedPrompt, selectedFrame);

    // 3. [Editorial] SEO 규칙 적용 (필요시)
    const finalPrompt = options.applyEditorialRules
      ? injectEditorialRules(framedPrompt, options)
      : framedPrompt;

    console.log('✅ buildSmartPrompt 완료:', {
      writingMethod,
      framingApplied: selectedFrame ? selectedFrame.id : 'None',
    });

    return finalPrompt;

  } catch (error) {
    console.error('❌ buildSmartPrompt 오류:', error);
    return `[시스템 오류] 프롬프트 생성에 실패했습니다: ${error.message}`;
  }
}

// Editorial 규칙 주입기
function injectEditorialRules(basePrompt, options) {
    const seoSection = `
[🎯 SEO 최적화 규칙 (editorial.js 적용)]
- **필수 분량**: ${SEO_RULES.wordCount.min}~${SEO_RULES.wordCount.max}자 (목표: ${SEO_RULES.wordCount.target}자)`;
    const formatSection = `
[📝 출력 형식 (editorial.js 적용)]
- **출력 구조**: 제목(title), 본문(content)을 포함한 JSON 형식으로 출력
- **HTML 가이드라인**: ${FORMAT_RULES.htmlGuidelines.structure.join(', ')}`;

    return basePrompt
        .replace(/(\[📊 SEO 최적화 규칙\])/g, seoSection)
        .replace(/(\[📝 출력 형식\])/g, formatSection);
}

// ============================================================================
// 내보내기
// ============================================================================

module.exports = {
  buildSmartPrompt,
};
