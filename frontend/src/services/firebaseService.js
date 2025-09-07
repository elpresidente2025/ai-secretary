// frontend/src/services/firebaseService.js
import { httpsCallable } from 'firebase/functions';
import { functions, auth } from './firebase';

/**
 * Firebase Functions 호출 래퍼 (토큰 갱신 포함)
 * @param {string} functionName - 호출할 함수명
 * @param {object} data - 전달할 데이터
 * @param {number} retries - 재시도 횟수
 * @returns {Promise} 함수 실행 결과
 */
export const callFunctionWithRetry = async (functionName, data = {}, retries = 2) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔥 Firebase Function 호출 (${attempt}/${retries}): ${functionName}`, data);
      console.log('🔍 Functions 인스턴스:', functions);
      console.log('🔍 Functions 설정:', {
        projectId: functions.app.options.projectId,
        region: functions._region,
        customDomain: functions._customDomain,
        url: functions._url
      });
      
      const callable = httpsCallable(functions, functionName);
      console.log('🔍 Callable 인스턴스:', callable);
      const result = await callable(data);
      
      console.log(`✅ ${functionName} 성공:`, result.data);
      return result.data;
    } catch (error) {
      console.error(`❌ ${functionName} 시도 ${attempt} 실패:`, error);
      
      // 함수가 존재하지 않는 경우 (404, not-found)
      if (error.code === 'functions/not-found') {
        console.warn(`⚠️ 함수 ${functionName}이 존재하지 않습니다.`);
        throw new Error(`함수 ${functionName}이 구현되지 않았습니다.`);
      }
      
      // 401/403 에러면 토큰 갱신 후 재시도
      if (attempt < retries && (
        error.code === 'functions/unauthenticated' || 
        error.code === 'functions/permission-denied' ||
        error.message.includes('401') ||
        error.message.includes('Unauthorized')
      )) {
        console.log('🔄 토큰 갱신 후 재시도...');
        
        // Firebase Auth 토큰 강제 갱신
        try {
          const user = auth.currentUser;
          if (user) {
            await user.getIdToken(true); // 강제 갱신
            console.log('✅ 토큰 갱신 완료');
          }
        } catch (tokenError) {
          console.error('❌ 토큰 갱신 실패:', tokenError);
        }
        
        // 1초 대기 후 재시도
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      // 마지막 시도였거나 다른 에러면 최종 실패
      let errorMessage = '알 수 없는 오류가 발생했습니다.';
      
      if (error.code === 'functions/unauthenticated') {
        errorMessage = '로그인이 필요합니다.';
      } else if (error.code === 'functions/permission-denied') {
        errorMessage = '권한이 없습니다.';
      } else if (error.code === 'functions/not-found') {
        errorMessage = '요청한 기능을 찾을 수 없습니다.';
      } else if (error.code === 'functions/unavailable') {
        errorMessage = '서비스가 일시적으로 이용 불가능합니다.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }
};

/**
 * 에러 로그를 Firestore에 저장
 * @param {Error} error - 에러 객체
 * @param {string} context - 에러 발생 컨텍스트
 * @param {object} metadata - 추가 메타데이터
 */
export const logError = async (error, context = '', metadata = {}) => {
  try {
    await callFunctionWithRetry('logError', {
      message: error.message,
      stack: error.stack,
      context,
      metadata,
      timestamp: new Date().toISOString()
    });
  } catch (logError) {
    console.error('에러 로그 저장 실패:', logError);
  }
};

/**
 * 시스템 상태 확인 (HTTP 요청으로 변경)
 * @returns {Promise<object>} 시스템 상태 정보
 */
export const getSystemStatus = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15초 타임아웃
    
    const response = await fetch('https://asia-northeast3-ai-secretary-6e9c8.cloudfunctions.net/getSystemStatus', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const result = await response.json();
    
    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ 시스템 상태 확인 실패: 타임아웃');
      throw new Error('타임아웃');
    }
    console.error('❌ 시스템 상태 확인 실패:', error);
    return {
      success: false,
      status: 'unknown',
      message: '상태를 확인할 수 없습니다.'
    };
  }
};

/**
 * 관리자 통계 조회 (HTTP 요청으로 변경)
 * @returns {Promise<object>} 관리자 통계 데이터
 */
export const getAdminStats = async () => {
  try {
    const response = await fetch('https://asia-northeast3-ai-secretary-6e9c8.cloudfunctions.net/getAdminStats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    const result = await response.json();
    console.log('✅ getAdminStats HTTP 호출 성공:', result);
    
    return result;
  } catch (error) {
    console.error('관리자 통계 조회 실패:', error);
    return {
      success: false,
      stats: {
        todaySuccess: 0,
        todayFail: 0,
        last30mErrors: 0,
        activeUsers: 0,
        geminiStatus: { state: 'unknown' }
      }
    };
  }
};

/**
 * 에러 로그 조회 (HTTP 요청으로 변경)
 * @returns {Promise<object>} 에러 로그 데이터
 */
export const getErrorLogs = async () => {
  try {
    const response = await fetch('https://asia-northeast3-ai-secretary-6e9c8.cloudfunctions.net/getErrorLogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    const result = await response.json();
    console.log('✅ getErrorLogs HTTP 호출 성공:', result);
    
    return result;
  } catch (error) {
    console.error('에러 로그 조회 실패:', error);
    return {
      success: false,
      message: '에러 로그를 불러올 수 없습니다.'
    };
  }
};

/**
 * 공지사항 조회 (HTTP 요청으로 변경)
 * @returns {Promise<object>} 공지사항 데이터
 */
export const getNotices = async () => {
  try {
    const response = await fetch('https://asia-northeast3-ai-secretary-6e9c8.cloudfunctions.net/getNotices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    const result = await response.json();
    console.log('✅ getNotices HTTP 호출 성공:', result);
    
    return result;
  } catch (error) {
    console.error('공지사항 조회 실패:', error);
    return {
      success: false,
      notices: []
    };
  }
};

/**
 * 사용자 목록 조회 (HTTP 요청으로 변경)
 * @param {object} params - 조회 파라미터
 * @returns {Promise<object>} 사용자 목록
 */
export const getUsers = async (params = {}) => {
  try {
    const response = await fetch('https://asia-northeast3-ai-secretary-6e9c8.cloudfunctions.net/getUsers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    });
    
    const result = await response.json();
    console.log('✅ getUsers HTTP 호출 성공:', result);
    
    return result;
  } catch (error) {
    console.error('사용자 목록 조회 실패:', error);
    return {
      success: false,
      users: [],
      total: 0
    };
  }
};

/**
 * 사용자 검색
 * @param {string} query - 검색어
 * @param {number} limit - 결과 제한
 * @returns {Promise<object>} 검색 결과
 */
export const searchUsers = async (query, limit = 20) => {
  return await callFunctionWithRetry('searchUsers', { query, limit });
};

/**
 * 원고 검색
 * @param {object} params - 검색 파라미터
 * @returns {Promise<object>} 검색 결과
 */
export const searchPosts = async (params) => {
  return await callFunctionWithRetry('searchPosts', params);
};

/**
 * 에러 로그 조회
 * @param {object} params - 조회 파라미터
 * @returns {Promise<object>} 에러 로그 목록
 */
export const getErrors = async (params = {}) => {
  try {
    // 백엔드 함수명이 getErrorLogs임
    const result = await callFunctionWithRetry('getErrorLogs', params);
    
    // 응답 구조 정규화 { success: true, data: { errors: [...] } } -> { errors: [...] }
    if (result.success && result.data) {
      return {
        errors: result.data.errors || [],
        hasMore: result.data.hasMore || false,
        nextPageToken: result.data.nextPageToken || null
      };
    }
    
    return { errors: [] };
  } catch (error) {
    console.error('에러 로그 조회 실패:', error);
    return { errors: [] };
  }
};

/**
 * 사용자 상세 정보 조회
 * @param {string} userEmail - 사용자 이메일
 * @returns {Promise<object>} 사용자 상세 정보
 */
export const getUserDetail = async (userEmail) => {
  return await callFunctionWithRetry('getUserDetail', { userEmail });
};

/**
 * 시스템 상태 업데이트 (HTTP 요청으로 변경)
 * @param {object} statusData - 상태 데이터
 * @returns {Promise<object>} 업데이트 결과
 */
export const updateSystemStatus = async (statusData) => {
  try {
    const response = await fetch('https://asia-northeast3-ai-secretary-6e9c8.cloudfunctions.net/updateSystemStatus', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(statusData)
    });
    
    const result = await response.json();
    console.log('✅ updateSystemStatus HTTP 호출 성공:', result);
    
    return result;
  } catch (error) {
    console.error('시스템 상태 업데이트 실패:', error);
    return {
      success: false,
      message: '시스템 상태 업데이트에 실패했습니다: ' + error.message
    };
  }
};

/**
 * Gemini 상태 업데이트 (기존 호환성)
 * @param {string} newState - 새로운 상태
 * @returns {Promise<object>} 업데이트 결과
 */
export const updateGeminiStatus = async (newState) => {
  return await callFunctionWithRetry('updateGeminiStatus', { newState });
};

/**
 * 시스템 캐시 비우기
 * @returns {Promise<object>} 결과
 */
export const clearSystemCache = async () => {
  return await callFunctionWithRetry('clearSystemCache');
};

// ============================================================================
// SNS 애드온 관련 함수들
// ============================================================================

/**
 * 원고를 SNS용으로 변환
 * @param {string} postId - 원고 ID
 * @param {string} platform - SNS 플랫폼 ('facebook', 'instagram', 'x')
 * @returns {Promise<object>} 변환 결과
 */
export const convertToSNS = async (postId) => {
  // 관리자 테스트 모드에서 모델 선택
  const modelName = localStorage.getItem('gemini_model') || 'gemini-1.5-flash';
  
  return await callFunctionWithRetry('convertToSNS', { postId, modelName });
};

/**
 * SNS 테스트 함수
 */
export const testSNS = async () => {
  return await callFunctionWithRetry('testSNS');
};

/**
 * SNS 애드온 사용량 조회
 * @returns {Promise<object>} 사용량 정보
 */
export const getSNSUsage = async () => {
  return await callFunctionWithRetry('getSNSUsage');
};

/**
 * SNS 애드온 구매/활성화
 * @returns {Promise<object>} 구매 결과
 */
export const purchaseSNSAddon = async () => {
  return await callFunctionWithRetry('purchaseSNSAddon');
};