// frontend/src/services/firebaseService.js
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// 네이버 전용 onCall 호출
export const callFunctionWithNaverAuth = async (functionName, data = {}) => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (!currentUser || currentUser.provider !== 'naver' || !currentUser.uid) {
    throw new Error('로그인 정보가 없습니다.');
  }
  const payload = { ...data, __naverAuth: { uid: currentUser.uid, provider: 'naver' } };
  const callable = httpsCallable(functions, functionName);
  const result = await callable(payload);
  return result.data;
};

// 재시도 지원 onCall 호출 (네이버 전용)
export const callFunctionWithRetry = async (functionName, data = {}, retries = 2) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (!currentUser || currentUser.provider !== 'naver' || !currentUser.uid) {
        throw new Error('로그인 정보가 없습니다.');
      }
      const payload = { ...data, __naverAuth: { uid: currentUser.uid, provider: 'naver' } };
      const callable = httpsCallable(functions, functionName);
      const result = await callable(payload);
      return result.data;
    } catch (error) {
      if (attempt < retries && (
        error?.code === 'functions/unauthenticated' ||
        error?.code === 'functions/permission-denied'
      )) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      throw error;
    }
  }
  throw new Error('호출 실패');
};

// HTTP onRequest 호출 (네이버 전용)
export const callHttpFunction = async (functionName, data = {}) => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (!currentUser || currentUser.provider !== 'naver' || !currentUser.uid) {
    throw new Error('로그인 정보가 없습니다.');
  }
  const payload = { ...data, __naverAuth: { uid: currentUser.uid, provider: 'naver' } };
  const projectId = functions.app.options.projectId;
  const region = 'asia-northeast3';
  const url = 'https://' + region + '-' + projectId + '.cloudfunctions.net/' + functionName;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error('HTTP ' + response.status + ': ' + text);
  }
  const raw = await response.json();
  return (raw && typeof raw === 'object' && 'data' in raw) ? raw.data : raw;
};
export const getSystemStatus = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const response = await fetch('https://asia-northeast3-ai-secretary-6e9c8.cloudfunctions.net/getSystemStatus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    return { success: false, status: 'unknown', message: '상태 확인 실패' };
  }
};

/**
 * 愿由ъ옄 ?듦퀎 議고쉶 (HTTP ?붿껌?쇰줈 蹂寃?
 * @returns {Promise<object>} 愿由ъ옄 ?듦퀎 ?곗씠??
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
    console.log('??getAdminStats HTTP ?몄텧 ?깃났:', result);
    
    return result;
  } catch (error) {
    console.error('愿由ъ옄 ?듦퀎 議고쉶 ?ㅽ뙣:', error);
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
 * ?먮윭 濡쒓렇 議고쉶 (HTTP ?붿껌?쇰줈 蹂寃?
 * @returns {Promise<object>} ?먮윭 濡쒓렇 ?곗씠??
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
    console.log('??getErrorLogs HTTP ?몄텧 ?깃났:', result);
    
    return result;
  } catch (error) {
    console.error('?먮윭 濡쒓렇 議고쉶 ?ㅽ뙣:', error);
    return {
      success: false,
      message: '?먮윭 濡쒓렇瑜?遺덈윭?????놁뒿?덈떎.'
    };
  }
};

/**
 * 怨듭??ы빆 議고쉶 (HTTP ?붿껌?쇰줈 蹂寃?
 * @returns {Promise<object>} 怨듭??ы빆 ?곗씠??
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
    console.log('??getNotices HTTP ?몄텧 ?깃났:', result);
    
    return result;
  } catch (error) {
    console.error('怨듭??ы빆 議고쉶 ?ㅽ뙣:', error);
    return {
      success: false,
      notices: []
    };
  }
};

/**
 * ?ъ슜??紐⑸줉 議고쉶 (HTTP ?붿껌?쇰줈 蹂寃?
 * @param {object} params - 議고쉶 ?뚮씪誘명꽣
 * @returns {Promise<object>} ?ъ슜??紐⑸줉
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
    console.log('??getUsers HTTP ?몄텧 ?깃났:', result);
    
    return result;
  } catch (error) {
    console.error('?ъ슜??紐⑸줉 議고쉶 ?ㅽ뙣:', error);
    return {
      success: false,
      users: [],
      total: 0
    };
  }
};

/**
 * ?ъ슜??寃??
 * @param {string} query - 寃?됱뼱
 * @param {number} limit - 寃곌낵 ?쒗븳
 * @returns {Promise<object>} 寃??寃곌낵
 */
export const searchUsers = async (query, limit = 20) => {
  return await callFunctionWithRetry('searchUsers', { query, limit });
};

/**
 * ?먭퀬 寃??
 * @param {object} params - 寃???뚮씪誘명꽣
 * @returns {Promise<object>} 寃??寃곌낵
 */
export const searchPosts = async (params) => {
  return await callFunctionWithRetry('searchPosts', params);
};

/**
 * ?먮윭 濡쒓렇 議고쉶
 * @param {object} params - 議고쉶 ?뚮씪誘명꽣
 * @returns {Promise<object>} ?먮윭 濡쒓렇 紐⑸줉
 */
export const getErrors = async (params = {}) => {
  try {
    // 諛깆뿏???⑥닔紐낆씠 getErrorLogs??
    const result = await callFunctionWithRetry('getErrorLogs', params);
    
    // ?묐떟 援ъ“ ?뺢퇋??{ success: true, data: { errors: [...] } } -> { errors: [...] }
    if (result.success && result.data) {
      return {
        errors: result.data.errors || [],
        hasMore: result.data.hasMore || false,
        nextPageToken: result.data.nextPageToken || null
      };
    }
    
    return { errors: [] };
  } catch (error) {
    console.error('?먮윭 濡쒓렇 議고쉶 ?ㅽ뙣:', error);
    return { errors: [] };
  }
};

/**
 * ?ъ슜???곸꽭 ?뺣낫 議고쉶
 * @param {string} userEmail - ?ъ슜???대찓??
 * @returns {Promise<object>} ?ъ슜???곸꽭 ?뺣낫
 */
export const getUserDetail = async (userEmail) => {
  return await callFunctionWithRetry('getUserDetail', { userEmail });
};

/**
 * ?쒖뒪???곹깭 ?낅뜲?댄듃 (HTTP ?붿껌?쇰줈 蹂寃?
 * @param {object} statusData - ?곹깭 ?곗씠??
 * @returns {Promise<object>} ?낅뜲?댄듃 寃곌낵
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
    console.log('??updateSystemStatus HTTP ?몄텧 ?깃났:', result);
    
    return result;
  } catch (error) {
    console.error('?쒖뒪???곹깭 ?낅뜲?댄듃 ?ㅽ뙣:', error);
    return {
      success: false,
      message: '?쒖뒪???곹깭 ?낅뜲?댄듃???ㅽ뙣?덉뒿?덈떎: ' + error.message
    };
  }
};

/**
 * Gemini ?곹깭 ?낅뜲?댄듃 (湲곗〈 ?명솚??
 * @param {string} newState - ?덈줈???곹깭
 * @returns {Promise<object>} ?낅뜲?댄듃 寃곌낵
 */
export const updateGeminiStatus = async (newState) => {
  return await callFunctionWithRetry('updateGeminiStatus', { newState });
};

/**
 * ?쒖뒪??罹먯떆 鍮꾩슦湲?
 * @returns {Promise<object>} 寃곌낵
 */
export const clearSystemCache = async () => {
  return await callFunctionWithRetry('clearSystemCache');
};

// ============================================================================
// SNS ?좊뱶??愿???⑥닔??
// ============================================================================

/**
 * ?먭퀬瑜?SNS?⑹쑝濡?蹂??
 * @param {string} postId - ?먭퀬 ID
 * @param {string} platform - SNS ?뚮옯??('facebook', 'instagram', 'x')
 * @returns {Promise<object>} 蹂??寃곌낵
 */
export const convertToSNS = async (postId) => {
  // 愿由ъ옄 ?뚯뒪??紐⑤뱶?먯꽌 紐⑤뜽 ?좏깮
  const modelName = localStorage.getItem('gemini_model') || 'gemini-1.5-flash';

  return await callHttpFunction('convertToSNS', { postId, modelName });
};

/**
 * SNS ?뚯뒪???⑥닔
 */
export const testSNS = async () => {
  return await callFunctionWithRetry('testSNS');
};

/**
 * SNS ?좊뱶???ъ슜??議고쉶
 * @returns {Promise<object>} ?ъ슜???뺣낫
 */
export const getSNSUsage = async () => {
  return await callHttpFunction('getSNSUsage', {});
};

/**
 * SNS ?좊뱶??援щℓ/?쒖꽦??
 * @returns {Promise<object>} 援щℓ 寃곌낵
 */
export const purchaseSNSAddon = async () => {
  return await callFunctionWithNaverAuth('purchaseSNSAddon');
};





