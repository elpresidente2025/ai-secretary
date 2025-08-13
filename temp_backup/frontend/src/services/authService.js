// frontend/src/services/authService.js

import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from '../config/firebase.js';
import { getUserProfile } from './firebaseApi.js'; // 중앙 API 서비스에서 가져오기

const getAuthErrorMessage = (errorCode) => {
    // ... (에러 메시지 변환 로직은 동일)
    const errorMessages = {
        'auth/user-not-found': '등록되지 않은 이메일입니다.',
        'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
        'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
        'auth/weak-password': '비밀번호가 너무 약합니다. 6자 이상 입력해주세요.',
        'auth/invalid-email': '유효하지 않은 이메일 형식입니다.',
        'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
    };
    return errorMessages[errorCode] || '인증 중 오류가 발생했습니다.';
};

export const authService = {
  register: async (fullName, email, password) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: fullName });
      return { success: true, user: userCredential.user };
    } catch (error) {
      throw new Error(getAuthErrorMessage(error.code));
    }
  },

  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      throw new Error(getAuthErrorMessage(error.code));
    }
  },

  logout: () => signOut(auth),

  onAuthStateChanged: (callback) => onAuthStateChanged(auth, callback),
  
  // 프로필 조회는 이제 중앙 API 서비스를 통해 이루어집니다.
  getUserProfile: getUserProfile,
};