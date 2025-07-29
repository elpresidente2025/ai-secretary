// frontend/src/services/firebaseApi.js

import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions(undefined, 'asia-northeast3'); // 리전 지정

const handleFirebaseError = (error) => {
  console.error('Firebase Functions 에러:', error);
  let userMessage = error.message || '알 수 없는 오류가 발생했습니다.';
  if (error.code) {
    switch (error.code) {
      case 'unauthenticated':
        userMessage = '로그인이 필요합니다. 다시 로그인해주세요.';
        break;
      case 'permission-denied':
        userMessage = '이 작업을 수행할 권한이 없습니다.';
        break;
      case 'invalid-argument':
        userMessage = '입력된 정보가 올바르지 않습니다.';
        break;
      // ... 다른 에러 코드들 추가
    }
  }
  return new Error(userMessage);
};

// 범용 API 호출 함수
const callApi = async (functionName, data) => {
  try {
    const callable = httpsCallable(functions, functionName);
    const result = await callable(data);
    return result.data;
  } catch (error) {
    throw handleFirebaseError(error);
  }
};

// API 함수 정의
export const generatePostDrafts = (promptData) => callApi('generatePostDrafts', promptData);
export const updateUserProfile = (profileData) => callApi('updateUserProfile', profileData);
export const getUserProfile = () => callApi('getUserProfile');
// 여기에 다른 API 함수들을 추가할 수 있습니다. (예: getPosts, deletePost 등)