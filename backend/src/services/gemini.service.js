import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

// API 키 검증
if (!process.env.GEMINI_API_KEY) {
  throw new Error('FATAL ERROR: GEMINI_API_KEY is not set in the .env file.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ===== 유효성 검증 상수 =====
const VALID_CATEGORIES = ['의정활동', '지역활동', '정책/비전', '보도자료', '일반'];

const VALID_SUB_CATEGORIES = {
  '의정활동': ['국정감사', '법안발의', '질의응답', '위원회활동', '예산심사', '정책토론'],
  '지역활동': ['현장방문', '주민간담회', '지역현안', '봉사활동', '상권점검', '민원해결'],
  '정책/비전': ['경제정책', '사회복지', '교육정책', '환경정책', '디지털정책', '청년정책'],
  '보도자료': ['성명서', '논평', '제안서', '건의문', '발표문', '입장문'],
  '일반': ['일상소통', '감사인사', '축하메시지', '격려글', '교육컨텐츠']
};

const POLITICAL_RISK_KEYWORDS = [
  '선거', '투표', '지지', '반대', '탄핵', '규탄', '비판', '공격',
  '후보', '당선', '낙선', '정치자금', '기부', '후원', '선거운동',
  '정적', '견제', '대립', '갈등', '논란', '스캔들'
];

// ===== 사용량 추적 및 로깅 =====
const logUsageStats = (userProfile, category, responseTime, success, errorType = null) => {
  const logData = {
    timestamp: new Date().toISOString(),
    user: {
      name: userProfile.name,
      position: userProfile.position,
      region: `${userProfile.regionMetro || ''} ${userProfile.regionLocal || ''}`.trim(),
      electoral_district: userProfile.electoralDistrict || ''
    },
    request: {
      category: category,
      success: success,
      responseTime: responseTime,
      errorType: errorType
    },
    system: {
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    }
  };
  
  console.log(`[USAGE_STATS] ${JSON.stringify(logData)}`);
};

/**
 * 고급 입력값 검증 및 정화 함수
 */
const validateAndSanitizeInput = (input) => {
  const errors = [];
  
  // userProfile 검증
  if (!input.userProfile || typeof input.userProfile !== 'object') {
    errors.push('유효하지 않은 사용자 프로필입니다.');
  } else {
    const { name, position, regionMetro, regionLocal, electoralDistrict } = input.userProfile;
    
    if (!name || typeof name !== 'string' || name.length > 50) {
      errors.push('이름은 필수이며 50자를 초과할 수 없습니다.');
    }
    if (!position || typeof position !== 'string' || position.length > 100) {
      errors.push('직책은 필수이며 100자를 초과할 수 없습니다.');
    }
    if (!regionMetro || typeof regionMetro !== 'string' || regionMetro.length > 50) {
      errors.push('광역시/도는 필수이며 50자를 초과할 수 없습니다.');
    }
  }
  
  // prompt 검증
  if (!input.prompt || typeof input.prompt !== 'string') {
    errors.push('주제는 필수입니다.');
  } else if (input.prompt.length < 5 || input.prompt.length > 500) {
    errors.push('주제는 5자 이상 500자 이하여야 합니다.');
  }
  
  // keywords 검증
  if (input.keywords && (typeof input.keywords !== 'string' || input.keywords.length > 200)) {
    errors.push('키워드는 200자를 초과할 수 없습니다.');
  }
  
  // category 검증 강화
  if (input.category) {
    if (!VALID_CATEGORIES.includes(input.category)) {
      errors.push(`유효하지 않은 카테고리입니다. 허용된 카테고리: ${VALID_CATEGORIES.join(', ')}`);
    }
    
    // subCategory 검증
    if (input.subCategory && VALID_SUB_CATEGORIES[input.category]) {
      if (!VALID_SUB_CATEGORIES[input.category].includes(input.subCategory)) {
        errors.push(`'${input.category}' 카테고리에서 유효하지 않은 세부 카테고리입니다.`);
      }
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`입력 검증 실패: ${errors.join(' ')}`);
  }
  
  // 정치적 리스크 키워드 검사
  const riskKeywords = checkPoliticalRisk(input.prompt, input.keywords);
  if (riskKeywords.length > 0) {
    console.warn(`[POLITICAL_RISK] 위험 키워드 감지: ${riskKeywords.join(', ')}`);
  }
  
  // 입력값 정화 (위험한 문자 제거/치환)
  const sanitize = (str) => {
    if (!str) return '';
    return str
      .replace(/[<>]/g, '') // HTML 태그 방지
      .replace(/["'`]/g, '') // 따옴표 제거
      .replace(/\n\s*#/g, '\n') // 프롬프트 명령어 방지
      .replace(/\n\s*-/g, '\n') // 프롬프트 명령어 방지
      .replace(/\\/g, '') // 백슬래시 제거
      .replace(/\{|\}/g, '') // 중괄호 제거
      .trim();
  };
  
  return {
    userProfile: {
      name: sanitize(input.userProfile.name),
      position: sanitize(input.userProfile.position),
      regionMetro: sanitize(input.userProfile.regionMetro || ''),
      regionLocal: sanitize(input.userProfile.regionLocal || ''),
      electoralDistrict: sanitize(input.userProfile.electoralDistrict || ''),
    },
    prompt: sanitize(input.prompt),
    keywords: sanitize(input.keywords || ''),
    category: sanitize(input.category || '일반'),
    subCategory: sanitize(input.subCategory || ''),
    riskLevel: riskKeywords.length > 0 ? 'HIGH' : 'LOW'
  };
};

/**
 * 정치적 리스크 키워드 검사
 */
const checkPoliticalRisk = (prompt, keywords) => {
  const text = `${prompt} ${keywords || ''}`.toLowerCase();
  return POLITICAL_RISK_KEYWORDS.filter(keyword => 
    text.includes(keyword.toLowerCase())
  );
};

/**
 * 고급 재시도 로직 (Circuit Breaker 패턴 포함)
 */
let circuitBreakerState = {
  failures: 0,
  lastFailTime: null,
  isOpen: false
};

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 60000;

const withRetry = async (fn, retries = 3, delay = 1000) => {
  // Circuit Breaker 확인
  if (circuitBreakerState.isOpen) {
    const timeSinceLastFail = Date.now() - circuitBreakerState.lastFailTime;
    if (timeSinceLastFail < CIRCUIT_BREAKER_TIMEOUT) {
      throw new Error('AI 서비스가 일시적으로 사용 불가능합니다. 잠시 후 다시 시도해주세요.');
    } else {
      circuitBreakerState.isOpen = false;
      circuitBreakerState.failures = 0;
    }
  }
  
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    try {
      const result = await fn();
      
      // 성공 시 서킷 브레이커 리셋
      circuitBreakerState.failures = 0;
      circuitBreakerState.isOpen = false;
      
      return result;
    } catch (error) {
      lastError = error;
      
      // 실패 카운트 증가
      circuitBreakerState.failures++;
      circuitBreakerState.lastFailTime = Date.now();
      
      // 임계치 초과 시 서킷 브레이커 열기
      if (circuitBreakerState.failures >= CIRCUIT_BREAKER_THRESHOLD) {
        circuitBreakerState.isOpen = true;
        console.error(`[CIRCUIT_BREAKER] 서킷 브레이커 활성화 - ${CIRCUIT_BREAKER_THRESHOLD}회 연속 실패`);
        throw new Error('AI 서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.');
      }
      
      // 재시도 가능한 오류인지 확인
      const errorMessage = (error.message || '').toLowerCase();
      const isRetryableError = 
        errorMessage.includes('503') || 
        errorMessage.includes('502') ||
        errorMessage.includes('429') || 
        errorMessage.includes('try again later') ||
        errorMessage.includes('temporarily unavailable') ||
        errorMessage.includes('timeout');
      
      if (isRetryableError && i < retries - 1) {
        console.warn(`[Gemini Service] 재시도 가능한 오류 (${i + 1}/${retries}): ${error.message}`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
        delay += Math.random() * 1000;
      } else {
        break;
      }
    }
  }
  
  console.error(`[Gemini Service] 모든 재시도 실패: ${lastError.message}`);
  throw lastError;
};

/**
 * ===== 완전히 새로운 AI 응답 파싱 시스템 =====
 */
const parseAIResponse = (text) => {
  console.log('[Gemini Service] === AI 응답 파싱 시작 ===');
  console.log('[Gemini Service] 원본 텍스트 길이:', text.length);
  console.log('[Gemini Service] 원본 텍스트 미리보기:', text.substring(0, 300) + '...');
  
  // 파싱 전략들을 순서대로 시도
  const strategies = [
    () => parseCleanJson(text),      // 1. 표준 JSON 파싱
    () => parseWithTextCleaning(text), // 2. 텍스트 정리 후 파싱
    () => parseWithSmartExtraction(text), // 3. 스마트 추출
    () => parseWithManualReconstruction(text), // 4. 수동 재구성
    () => parseWithFallbackExtraction(text) // 5. 최종 비상 방법
  ];
  
  let lastError;
  
  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`[Gemini Service] 파싱 전략 ${i + 1} 시도...`);
      const result = strategies[i]();
      
      if (result && Array.isArray(result) && result.length > 0) {
        console.log(`[Gemini Service] ✅ 전략 ${i + 1} 성공: ${result.length}개 초안 추출`);
        return validateAndCleanDrafts(result);
      } else {
        console.log(`[Gemini Service] ❌ 전략 ${i + 1} 실패: 유효한 결과 없음`);
      }
    } catch (error) {
      console.log(`[Gemini Service] ❌ 전략 ${i + 1} 실패:`, error.message);
      lastError = error;
    }
  }
  
  console.error('[Gemini Service] === 모든 파싱 전략 실패 ===');
  throw new Error(`AI 응답 파싱 실패. 마지막 오류: ${lastError?.message || '알 수 없는 오류'}`);
};

/**
 * 전략 1: 표준 JSON 파싱
 */
const parseCleanJson = (text) => {
  // 코드 블록 제거
  let cleanText = text.trim();
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleanText = codeBlockMatch[1].trim();
  }
  
  // JSON 배열 경계 찾기
  const startIndex = cleanText.indexOf('[');
  const endIndex = cleanText.lastIndexOf(']');
  
  if (startIndex === -1 || endIndex === -1) {
    throw new Error('JSON 배열 구조를 찾을 수 없음');
  }
  
  const jsonString = cleanText.substring(startIndex, endIndex + 1);
  const parsed = JSON.parse(jsonString);
  
  return Array.isArray(parsed) ? parsed : [parsed];
};

/**
 * 전략 2: 텍스트 정리 후 파싱
 */
const parseWithTextCleaning = (text) => {
  let cleanText = text.trim();
  
  // 코드 블록 제거
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleanText = codeBlockMatch[1].trim();
  }
  
  // JSON 배열 경계 찾기
  const startIndex = cleanText.indexOf('[');
  const endIndex = cleanText.lastIndexOf(']');
  
  if (startIndex === -1 || endIndex === -1) {
    throw new Error('JSON 배열 구조를 찾을 수 없음');
  }
  
  let jsonString = cleanText.substring(startIndex, endIndex + 1);
  
  // 단계별 텍스트 정리
  jsonString = cleanifyJsonString(jsonString);
  
  const parsed = JSON.parse(jsonString);
  return Array.isArray(parsed) ? parsed : [parsed];
};

/**
 * JSON 문자열 정리 함수
 */
const cleanifyJsonString = (jsonString) => {
  return jsonString
    // 1. 스마트 따옴표 정규화
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    
    // 2. 잘못된 백슬래시 처리
    .replace(/\\\s+/g, ' ')  // 백슬래시 + 공백들
    .replace(/\\([^"\\\/bfnrtu])/g, '$1')  // 잘못된 이스케이프 시퀀스
    
    // 3. 특수문자 이스케이프
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r')
    
    // 4. 후행 쉼표 제거
    .replace(/,\s*([}\]])/g, '$1')
    
    // 5. 중복 백슬래시 정리
    .replace(/\\\\/g, '\\')
    
    // 6. 잘못된 줄바꿈 정리
    .replace(/"\s*\n\s*"/g, '""')
    .replace(/"\s*\n\s*([^"])/g, '" $1');
};

/**
 * 전략 3: 스마트 추출
 */
const parseWithSmartExtraction = (text) => {
  console.log('[Gemini Service] 스마트 추출 시작');
  
  // 여러 패턴으로 title과 content 추출 시도
  const extractionPatterns = [
    // 패턴 1: 표준 JSON 구조
    {
      title: /"title"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/g,
      content: /"content"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/g
    },
    // 패턴 2: 멀티라인 허용
    {
      title: /"title"\s*:\s*"([^"]*?)"/g,
      content: /"content"\s*:\s*"([\s\S]*?)"/g
    },
    // 패턴 3: 더 관대한 패턴
    {
      title: /title['":\s]*([^'",}\]]+)/gi,
      content: /content['":\s]*((?:[^'"}]|}[^'",}])*)/gi
    }
  ];
  
  for (let i = 0; i < extractionPatterns.length; i++) {
    try {
      const pattern = extractionPatterns[i];
      const titles = [...text.matchAll(pattern.title)].map(m => m[1]?.trim()).filter(Boolean);
      const contents = [...text.matchAll(pattern.content)].map(m => m[1]?.trim()).filter(Boolean);
      
      console.log(`[Gemini Service] 패턴 ${i + 1}: 제목 ${titles.length}개, 내용 ${contents.length}개 발견`);
      
      if (titles.length > 0 && contents.length > 0) {
        const drafts = [];
        const count = Math.min(titles.length, contents.length, 3);
        
        for (let j = 0; j < count; j++) {
          if (titles[j] && contents[j]) {
            drafts.push({
              title: cleanExtractedText(titles[j]),
              content: cleanExtractedText(contents[j])
            });
          }
        }
        
        if (drafts.length > 0) {
          console.log(`[Gemini Service] 패턴 ${i + 1}으로 ${drafts.length}개 초안 추출 성공`);
          return drafts;
        }
      }
    } catch (error) {
      console.log(`[Gemini Service] 패턴 ${i + 1} 실패:`, error.message);
    }
  }
  
  throw new Error('스마트 추출 실패');
};

/**
 * 추출된 텍스트 정리
 */
const cleanExtractedText = (text) => {
  if (!text) return '';
  
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\')
    .trim();
};

/**
 * 전략 4: 수동 재구성
 */
const parseWithManualReconstruction = (text) => {
  console.log('[Gemini Service] 수동 재구성 시작');
  
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const drafts = [];
  let currentDraft = null;
  let collectingContent = false;
  let contentBuffer = [];
  
  for (const line of lines) {
    // 제목 감지
    if (line.includes('title') && (line.includes(':') || line.includes('='))) {
      // 이전 초안 저장
      if (currentDraft && contentBuffer.length > 0) {
        currentDraft.content = contentBuffer.join(' ').trim();
        drafts.push(currentDraft);
      }
      
      // 새 초안 시작
      const titleMatch = line.match(/(?:title['":\s]*|"title"\s*:\s*["])([^"'\n]+)/i);
      if (titleMatch) {
        currentDraft = { title: titleMatch[1].trim() };
        contentBuffer = [];
        collectingContent = false;
      }
    }
    // 내용 감지
    else if (line.includes('content') && currentDraft) {
      collectingContent = true;
      const contentMatch = line.match(/(?:content['":\s]*|"content"\s*:\s*["])([^"'\n]*)/i);
      if (contentMatch && contentMatch[1]) {
        contentBuffer.push(contentMatch[1]);
      }
    }
    // 내용 수집 중
    else if (collectingContent && currentDraft) {
      if (line.includes('}') || line.includes(']') || line.includes('title')) {
        collectingContent = false;
      } else {
        // 불필요한 문자 제거
        const cleanLine = line.replace(/^['"]+|['"]+$/g, '').replace(/^[,\s]+|[,\s]+$/g, '');
        if (cleanLine && !cleanLine.match(/^[{}\[\],]*$/)) {
          contentBuffer.push(cleanLine);
        }
      }
    }
  }
  
  // 마지막 초안 저장
  if (currentDraft && contentBuffer.length > 0) {
    currentDraft.content = contentBuffer.join(' ').trim();
    drafts.push(currentDraft);
  }
  
  if (drafts.length === 0) {
    throw new Error('수동 재구성으로 초안을 찾을 수 없음');
  }
  
  console.log(`[Gemini Service] 수동 재구성으로 ${drafts.length}개 초안 생성`);
  return drafts;
};

/**
 * 전략 5: 최종 비상 방법
 */
const parseWithFallbackExtraction = (text) => {
  console.log('[Gemini Service] 최종 비상 방법 시작');
  
  // 가장 단순한 방법: 텍스트를 그대로 활용
  const sections = text.split(/(?:초안|draft)\s*[0-9]+/i).filter(section => section.trim().length > 50);
  
  if (sections.length === 0) {
    // 정말 마지막 수단: 전체 텍스트를 하나의 초안으로
    return [{
      title: "AI 생성 원고",
      content: `<p>${text.replace(/\n/g, '</p><p>').substring(0, 1500)}</p>`
    }];
  }
  
  const drafts = [];
  for (let i = 0; i < Math.min(sections.length, 3); i++) {
    const section = sections[i].trim();
    if (section.length > 20) {
      // 첫 줄을 제목으로, 나머지를 내용으로
      const lines = section.split('\n').filter(line => line.trim());
      const title = lines[0]?.substring(0, 100).trim() || `초안 ${i + 1}`;
      const content = lines.slice(1).join(' ').trim() || section.substring(0, 500);
      
      drafts.push({
        title: title,
        content: `<p>${content}</p>`
      });
    }
  }
  
  if (drafts.length === 0) {
    throw new Error('최종 비상 방법도 실패');
  }
  
  console.log(`[Gemini Service] 최종 비상 방법으로 ${drafts.length}개 초안 생성`);
  return drafts;
};

/**
 * 추출된 초안들의 유효성 검사 및 정리
 */
const validateAndCleanDrafts = (drafts) => {
  const cleanedDrafts = [];
  
  for (let i = 0; i < Math.min(drafts.length, 3); i++) {
    const draft = drafts[i];
    
    if (!draft || typeof draft !== 'object') {
      console.warn(`[Gemini Service] 초안 ${i + 1}: 유효하지 않은 객체`);
      continue;
    }
    
    let title = draft.title || draft.제목 || draft.name || `초안 ${i + 1}`;
    let content = draft.content || draft.내용 || draft.text || '';
    
    // 제목 정리
    title = String(title).trim().substring(0, 200);
    if (!title) {
      title = `초안 ${i + 1}`;
    }
    
    // 내용 정리
    content = String(content).trim();
    if (!content) {
      console.warn(`[Gemini Service] 초안 ${i + 1}: 내용이 없음`);
      continue;
    }
    
    // HTML 태그가 없으면 <p> 태그로 감싸기
    if (!content.includes('<p>') && !content.includes('<div>')) {
      // 문단 나누기 (더블 줄바꿈 또는 특정 패턴)
      const paragraphs = content
        .split(/\n\s*\n|\.\s+(?=[A-Z가-힣])|(?<=[.!?])\s+(?=[A-Z가-힣])/g)
        .map(p => p.trim())
        .filter(p => p.length > 10);
      
      if (paragraphs.length > 1) {
        content = paragraphs.map(p => `<p>${p}</p>`).join('');
      } else {
        content = `<p>${content}</p>`;
      }
    }
    
    cleanedDrafts.push({
      title: title,
      content: content,
      riskLevel: 'LOW',
      wordCount: content.replace(/<[^>]*>/g, '').length,
      category: 'AI생성'
    });
  }
  
  if (cleanedDrafts.length === 0) {
    throw new Error('유효한 초안을 생성할 수 없습니다.');
  }
  
  console.log(`[Gemini Service] 최종 ${cleanedDrafts.length}개 초안 검증 완료`);
  return cleanedDrafts;
};

/**
 * AI 응답 검증 및 정화 (강화됨)
 */
const validateAIResponse = (drafts, category) => {
  if (!Array.isArray(drafts)) {
    throw new Error('AI 응답이 배열 형태가 아닙니다.');
  }
  
  if (drafts.length === 0) {
    throw new Error('AI가 초안을 생성하지 못했습니다.');
  }
  
  if (drafts.length > 5) {
    console.warn(`[Gemini Service] 예상보다 많은 초안 생성됨: ${drafts.length}개`);
    drafts = drafts.slice(0, 3);
  }
  
  return drafts.map((draft, index) => {
    if (!draft.title || !draft.content) {
      throw new Error(`초안 ${index + 1}에 제목 또는 내용이 없습니다.`);
    }
    
    if (typeof draft.title !== 'string' || typeof draft.content !== 'string') {
      throw new Error(`초안 ${index + 1}의 제목 또는 내용이 문자열이 아닙니다.`);
    }
    
    const minLengths = {
      '보도자료': 600,
      '정책/비전': 1200,
      '의정활동': 1000,
      '지역활동': 800,
      '일반': 600
    };
    
    const minLength = minLengths[category] || 600;
    if (draft.content.length < minLength) {
      console.warn(`[Gemini Service] 초안 ${index + 1}이 ${category} 카테고리 기준보다 짧습니다 (${draft.content.length}자 < ${minLength}자)`);
    }
    
    const riskExpressions = checkContentRisk(draft.content);
    if (riskExpressions.length > 0) {
      console.warn(`[CONTENT_RISK] 초안 ${index + 1}에서 위험 표현 감지: ${riskExpressions.join(', ')}`);
    }
    
    return {
      title: draft.title.trim(),
      content: draft.content.trim(),
      riskLevel: riskExpressions.length > 0 ? 'MEDIUM' : 'LOW',
      wordCount: draft.content.length,
      category: category
    };
  });
};

/**
 * 콘텐츠 위험도 검사
 */
const checkContentRisk = (content) => {
  const riskPatterns = [
    /지지.*해주세요/g,
    /투표.*부탁/g,
    /후원.*요청/g,
    /기부.*해주/g,
    /.*반대.*해야/g,
    /.*규탄.*합니다/g
  ];
  
  const risks = [];
  riskPatterns.forEach((pattern, index) => {
    if (pattern.test(content)) {
      risks.push(`선거법_위험_패턴_${index + 1}`);
    }
  });
  
  return risks;
};

/**
 * 완전 강화된 원고 생성 함수
 */
export async function generateManuscript(input) {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[${requestId}] === 원고 생성 요청 시작 ===`);
  
  try {
    // 1. 입력 검증 및 정화 (강화됨)
    const sanitizedInput = validateAndSanitizeInput(input);
    console.log(`[${requestId}] 입력 검증 완료: ${sanitizedInput.userProfile.name} - ${sanitizedInput.category}`);
    
    // 2. 고위험 요청 추가 검토
    if (sanitizedInput.riskLevel === 'HIGH') {
      console.warn(`[${requestId}] 고위험 요청 감지 - 추가 검토 필요`);
    }
    
    // 3. JSON 생성에 최적화된 프롬프트 구성
    const safePrompt = buildRobustPrompt(sanitizedInput);
    
    // 4. 모델 설정 최적화
    const modelConfig = {
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.6, // JSON 생성을 위해 낮춤
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192,
        candidateCount: 1, // 하나의 결과만
        stopSequences: [] // 중단 시퀀스 없음
      },
    };
    
    // 5. AI 호출 (Circuit Breaker 포함)
    const model = genAI.getGenerativeModel(modelConfig);
    
    console.log(`[${requestId}] AI 호출 시작...`);
    const result = await withRetry(() => model.generateContent(safePrompt));
    const response = result.response;
    const text = response.text();
    
    console.log(`[${requestId}] AI 응답 수신 완료`);
    console.log(`[${requestId}] 응답 길이: ${text.length}자`);
    console.log(`[${requestId}] 응답 미리보기: ${text.substring(0, 200)}...`);
    
    // 6. 강화된 JSON 파싱
    const drafts = parseAIResponse(text);
    
    // 7. 응답 검증 및 품질 보증
    const validatedDrafts = validateAIResponse(drafts, sanitizedInput.category);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // 8. 사용량 통계 로깅
    logUsageStats(sanitizedInput.userProfile, sanitizedInput.category, responseTime, true);
    
    console.log(`[${requestId}] === 원고 생성 완료 ===`);
    console.log(`[${requestId}] 소요시간: ${responseTime}ms`);
    console.log(`[${requestId}] 생성 초안수: ${validatedDrafts.length}`);
    
    return {
      success: true,
      requestId: requestId,
      drafts: validatedDrafts,
      metadata: {
        category: sanitizedInput.category,
        subCategory: sanitizedInput.subCategory,
        responseTime: responseTime,
        riskLevel: sanitizedInput.riskLevel,
        generatedAt: new Date().toISOString(),
        aiModel: 'gemini-1.5-flash',
        processingSteps: [
          'input_validation',
          'prompt_generation',
          'ai_generation',
          'response_parsing',
          'content_validation'
        ]
      }
    };
    
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // 에러 분류 및 로깅
    let errorType = 'UNKNOWN';
    let userMessage = '원고 생성 중 예기치 못한 오류가 발생했습니다.';
    
    if (error.message.includes('입력 검증 실패')) {
      errorType = 'VALIDATION_ERROR';
      userMessage = error.message; // 검증 오류는 그대로 전달
    } else if (error.message.includes('AI 서비스가 일시적으로')) {
      errorType = 'CIRCUIT_BREAKER';
      userMessage = 'AI 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.';
    } else if (error.message.includes('GEMINI_API_KEY')) {
      errorType = 'API_KEY_ERROR';
      userMessage = 'AI 서비스 설정에 문제가 있습니다. 관리자에게 문의해주세요.';
    } else if (error.message.includes('응답 파싱 실패') || error.message.includes('JSON')) {
      errorType = 'PARSING_ERROR';
      userMessage = 'AI 응답 처리 중 오류가 발생했습니다. 다시 시도해주세요.';
    } else if (error.message.includes('quota') || error.message.includes('limit')) {
      errorType = 'QUOTA_EXCEEDED';
      userMessage = 'API 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.';
    }
    
    logUsageStats(
      input.userProfile || { name: 'UNKNOWN', position: 'UNKNOWN', regionMetro: 'UNKNOWN' }, 
      input.category || 'UNKNOWN', 
      responseTime, 
      false, 
      errorType
    );
    
    console.error(`[${requestId}] === 원고 생성 실패 ===`);
    console.error(`[${requestId}] 소요시간: ${responseTime}ms`);
    console.error(`[${requestId}] 에러타입: ${errorType}`);
    console.error(`[${requestId}] 에러메시지: ${error.message}`);
    console.error(`[${requestId}] 스택트레이스: ${error.stack}`);
    
    // 사용자에게 적절한 메시지 전달
    throw new Error(userMessage);
  }
}

/**
 * 🔥 핵심 수정: JSON 생성에 최적화된 프롬프트 구성 (지역 정보 반영)
 */
const buildRobustPrompt = ({ userProfile, prompt, keywords, category, subCategory }) => {
  const categoryInstructions = getAdvancedCategoryInstructions(category, subCategory, userProfile);
  const currentDate = new Date().toLocaleDateString('ko-KR');

  // 🔥 핵심 수정: 지역 정보 정확히 추출
  const regionInfo = `${userProfile.regionMetro || ''} ${userProfile.regionLocal || ''}`.trim();
  const districtInfo = userProfile.electoralDistrict || '';
  const fullRegionInfo = districtInfo ? `${regionInfo} ${districtInfo}` : regionInfo;
  
  const promptParts = [
    "# AI 비서관 역할",
    "당신은 더불어민주당 정치인의 전문 비서관입니다.",
    "",
    "## 작성자 정보",
    `이름: ${userProfile.name}`,
    `직책: ${userProfile.position}`, 
    `지역: ${regionInfo}`,
    `선거구: ${districtInfo}`,
    `작성일: ${currentDate}`,
    "",
    "## 🔥 중요한 지역 맥락 지침",
    `- 반드시 '${regionInfo} 주민 여러분 안녕하세요'로 시작하세요`,
    `- 서울, 부산, 대구, 인천 등 다른 지역명은 절대 언급하지 마세요`,
    `- ${regionInfo} 지역의 구체적인 현안과 특성을 반영하세요`,
    `- ${districtInfo ? `${districtInfo} 선거구 맥락에 맞는 내용으로 작성하세요` : '해당 지역구 맥락에 맞는 내용으로 작성하세요'}`,
    `- '우리 지역', '우리 ${userProfile.regionLocal}' 등의 표현을 자주 사용하세요`,
    "",
    "## 작성 요청",
    `주제: ${prompt}`,
    `키워드: ${keywords || "없음"}`,
    `카테고리: ${category}${subCategory ? ` > ${subCategory}` : ''}`,
    "",
    categoryInstructions,
    "",
    "## 중요한 JSON 형식 지침",
    "- 반드시 아래 정확한 JSON 형식으로만 응답하세요",
    "- 다른 설명이나 텍스트는 절대 포함하지 마세요",
    "- JSON 외부에 어떤 텍스트도 쓰지 마세요",
    "- 백슬래시(\\)는 사용하지 마세요",
    "- 따옴표 안에서 따옴표가 필요하면 작은따옴표(')를 사용하세요",
    "",
    "## 응답 형식 (정확히 이대로)",
    '[',
    '  {',
    '    "title": "첫 번째 초안의 제목",',
    '    "content": "<p>첫 번째 문단입니다.</p><p>두 번째 문단입니다.</p>"',
    '  },',
    '  {',
    '    "title": "두 번째 초안의 제목",', 
    '    "content": "<p>첫 번째 문단입니다.</p><p>두 번째 문단입니다.</p>"',
    '  },',
    '  {',
    '    "title": "세 번째 초안의 제목",',
    '    "content": "<p>첫 번째 문단입니다.</p><p>두 번째 문단입니다.</p>"',
    '  }',
    ']',
    "",
    "지금 시작하세요:"
  ];
  
  return promptParts.join("\n");
};

/**
 * 🔥 핵심 수정: 고급 카테고리 지침 생성 (지역 정보 반영)
 */
const getAdvancedCategoryInstructions = (category, subCategory, userProfile) => {
  const regionInfo = `${userProfile?.regionMetro || ''} ${userProfile?.regionLocal || ''}`.trim();
  const districtInfo = userProfile?.electoralDistrict || '';
  
  const baseInstructions = {
    '의정활동': {
      goal: "국회 내에서의 공식적인 활동을 전문적이고 신뢰도 높게 전달합니다.",
      content: `활동의 구체적인 내용, 법적 근거, 그리고 ${regionInfo} 주민들에게 미치는 긍정적인 영향을 명확히 서술해야 합니다.`,
      tone: "객관적이고 논리적인 어조를 유지하며, 전문 용어는 쉽게 풀어서 설명해주세요."
    },
    '지역활동': {
      goal: `${regionInfo} 주민들과의 유대감을 강화하고, 지역 현안 해결을 위한 노력을 진정성 있게 보여줍니다.`,
      content: `${regionInfo} 주민들의 목소리를 직접 반영하고, 구체적인 활동 내용과 향후 계획을 공유하여 신뢰를 얻어야 합니다.`,
      tone: "따뜻하고 친근한 어조를 사용하되, 문제 해결에 대한 의지를 단호하게 보여주세요."
    },
    '정책/비전': {
      goal: `의원의 정책적 전문성과 ${regionInfo} 지역 발전에 대한 깊은 고민을 보여주며, 정책 리더로서의 이미지를 구축합니다.`,
      content: `${regionInfo} 지역의 사회 문제에 대한 날카로운 분석과 함께, 실현 가능한 대안과 장기적인 비전을 제시해야 합니다.`,
      tone: "예리하고 통찰력 있는 어조를 사용하며, 데이터나 근거를 바탕으로 주장을 뒷받침해주세요."
    },
    '보도자료': {
      goal: `언론을 통해 ${regionInfo} 지역구 의원의 공식 입장을 명확하고 간결하게 전달합니다.`,
      content: "육하원칙에 따라 사실 관계를 정확히 전달해야 하며, 제목은 핵심 내용을 함축적으로 보여줘야 합니다.",
      tone: "간결하고 명료한 문체를 사용하여, 오해의 소지가 없도록 작성해야 합니다."
    },
    '일반': {
      goal: `${regionInfo} 주민들이 흥미를 느끼고 쉽게 이해할 수 있는 블로그 게시물을 작성합니다.`,
      content: "서론, 본론, 결론의 구조를 갖추고, 논리적인 흐름에 따라 내용을 전개해주세요.",
      tone: "대중 친화적이고 설득력 있는 어조를 사용해주세요."
    }
  };

  const instructions = baseInstructions[category] || baseInstructions['일반'];
  
  return `## 작성 가이드라인 (${category}${subCategory ? ` > ${subCategory}` : ''})
- 작성 목표: ${instructions.goal}
- 핵심 내용: ${subCategory ? `${subCategory}에 초점을 맞춰, ` : ''}${instructions.content}
- 톤앤매너: ${instructions.tone}
- **지역 특화**: 반드시 ${regionInfo} 지역구 맥락을 반영하여 작성하세요

## 작성 요구사항
- 블로그 원고 초안 3개를 작성하세요
- 각 초안은 1500자 이상으로 작성하세요
- 각 문단을 <p> 태그로 감싸서 HTML 형식으로 작성하세요
- 제목은 흥미롭고 클릭하고 싶게 만드세요
- **첫 문장은 반드시 "${regionInfo} 주민 여러분 안녕하세요"로 시작하세요**
- **다른 지역(서울, 부산, 대구, 인천 등) 언급 절대 금지**`;
};

// ===== 미들웨어 및 헬퍼 함수들 =====

/**
 * 레이트 리미팅 미들웨어
 */
export const createGeminiRateLimit = () => {
  const requests = new Map();
  
  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15분
    const maxRequests = req.user?.role === 'admin' ? 50 : 10;
    
    if (!requests.has(userId)) {
      requests.set(userId, []);
    }
    
    const userRequests = requests.get(userId);
    const validRequests = userRequests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'AI 원고 생성 요청이 너무 많습니다.',
        retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000),
        limit: maxRequests,
        windowMs: windowMs
      });
    }
    
    validRequests.push(now);
    requests.set(userId, validRequests);
    
    // 메모리 정리
    if (Math.random() < 0.01) {
      for (const [key, value] of requests.entries()) {
        if (value.length === 0 || now - value[value.length - 1] > 60 * 60 * 1000) {
          requests.delete(key);
        }
      }
    }
    
    next();
  };
};

/**
 * 요청 사전 검증 미들웨어
 */
export const validateManuscriptRequest = (req, res, next) => {
  try {
    const { userProfile, prompt, category } = req.body;
    
    if (!userProfile || !prompt) {
      return res.status(400).json({
        error: '사용자 프로필과 주제는 필수입니다.',
        required: ['userProfile', 'prompt']
      });
    }
    
    const requestSize = JSON.stringify(req.body).length;
    if (requestSize > 10000) {
      return res.status(413).json({
        error: '요청 데이터가 너무 큽니다.',
        maxSize: '10KB',
        currentSize: `${Math.round(requestSize / 1024)}KB`
      });
    }
    
    next();
  } catch (error) {
    res.status(400).json({
      error: '요청 데이터 형식이 올바르지 않습니다.',
      details: error.message
    });
  }
};

/**
 * 시스템 상태 모니터링
 */
export const getSystemHealth = () => {
  return {
    status: circuitBreakerState.isOpen ? 'DEGRADED' : 'HEALTHY',
    circuitBreaker: {
      isOpen: circuitBreakerState.isOpen,
      failures: circuitBreakerState.failures,
      lastFailTime: circuitBreakerState.lastFailTime
    },
    api: {
      geminiConnected: !!process.env.GEMINI_API_KEY,
      rateLimitActive: true
    },
    performance: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version
    },
    timestamp: new Date().toISOString()
  };
};

// 기본 export
export default {
  generateManuscript,
  createGeminiRateLimit,
  validateManuscriptRequest,
  getSystemHealth
};