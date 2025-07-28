// frontend/src/services/api.js
import { functions } from '../config/firebase.js';
import { httpsCallable } from 'firebase/functions';

// 🔥 Firebase Functions API
export const profileApi = {
  // 프로필 업데이트
  updateProfile: async (profileData) => {
    try {
      console.log('🔥 Firebase Functions로 프로필 업데이트 시도:', profileData);
      
      const updateProfileFunction = httpsCallable(functions, 'updateProfile');
      const result = await updateProfileFunction({
        name: profileData.name,
        position: profileData.position,
        regionMetro: profileData.regionMetro,
        regionLocal: profileData.regionLocal,
        electoralDistrict: profileData.electoralDistrict
      });

      console.log('✅ Firebase 프로필 업데이트 성공:', result.data);
      return result.data;
    } catch (error) {
      console.error('❌ Firebase 프로필 업데이트 실패:', error);
      
      // Firebase 에러를 사용자 친화적 메시지로 변환
      const friendlyError = handleFirebaseError(error);
      throw friendlyError;
    }
  },

  // 사용자 프로필 조회
  getUserProfile: async () => {
    try {
      const getUserProfileFunction = httpsCallable(functions, 'getUserProfile');
      const result = await getUserProfileFunction();
      return result.data;
    } catch (error) {
      console.error('❌ 사용자 프로필 조회 실패:', error);
      throw handleFirebaseError(error);
    }
  }
};

// 🔥 Dashboard API
export const dashboardApi = {
  // Dashboard 데이터 조회
  getDashboardData: async () => {
    try {
      console.log('🔥 Firebase Functions로 Dashboard 데이터 요청');
      
      const getDashboardDataFn = httpsCallable(functions, 'getDashboardData');
      const result = await getDashboardDataFn();
      
      console.log('✅ Dashboard 응답:', result.data);
      return result.data;
    } catch (error) {
      console.error('❌ Dashboard 데이터 요청 실패:', error);
      throw handleFirebaseError(error);
    }
  }
};

// 🔥 테스트 함수
export const testApi = {
  testFunction: async () => {
    try {
      const testFunction = httpsCallable(functions, 'testFunction');
      const result = await testFunction();
      console.log('✅ Firebase 테스트 성공:', result.data);
      return result.data;
    } catch (error) {
      console.error('❌ Firebase 테스트 실패:', error);
      const friendlyError = handleFirebaseError(error);
      throw friendlyError;
    }
  }
};

// 🔥 Firebase 에러 처리 유틸리티
export const handleFirebaseError = (error) => {
  console.error('Firebase 함수 에러:', error);
  
  let userMessage = '알 수 없는 오류가 발생했습니다.';
  
  if (error.code) {
    switch (error.code) {
      case 'functions/unauthenticated':
        userMessage = '로그인이 필요합니다.';
        break;
      case 'functions/permission-denied':
        userMessage = '권한이 없습니다.';
        break;
      case 'functions/internal':
        userMessage = '서버에서 오류가 발생했습니다.';
        break;
      case 'functions/invalid-argument':
        userMessage = '입력한 정보가 올바르지 않습니다.';
        break;
      case 'functions/deadline-exceeded':
        userMessage = '요청 시간이 초과되었습니다.';
        break;
      case 'functions/unavailable':
        userMessage = '서비스가 일시적으로 사용할 수 없습니다.';
        break;
      default:
        userMessage = error.message || '서비스 오류가 발생했습니다.';
    }
  }
  
  return { ...error, userMessage };
};

// 🔥 유틸리티 함수들
export const apiUtils = {
  // 재시도 로직
  retryRequest: async (requestFn, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        
        console.warn(`🔄 재시도 ${i + 1}/${maxRetries} (${delay}ms 후)`);
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  },

  // 로딩 상태 관리
  showLoading: () => {
    if (window.startGlobalLoading) {
      window.startGlobalLoading();
    }
  },

  hideLoading: () => {
    if (window.stopGlobalLoading) {
      window.stopGlobalLoading();
    }
  }
};

// 🔥 개발 환경 로깅
if (import.meta.env.DEV) {
  console.log('🔧 Firebase API 클라이언트 초기화됨:', {
    functions: '활성화됨',
    mode: 'Firebase Only'
  });
}

// 기본 내보내기
export default { profileApi, dashboardApi, testApi };