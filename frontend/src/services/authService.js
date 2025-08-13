// frontend/src/services/authService.js

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../config/firebase.js';
import { getUserProfile } from './firebaseApi.js'; // 중앙 API 서비스

const getAuthErrorMessage = (code) => {
  const map = {
    'auth/user-not-found': '등록되지 않은 이메일입니다.',
    'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
    'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
    'auth/weak-password': '비밀번호가 너무 약합니다. 6자 이상 입력해주세요.',
    'auth/invalid-email': '유효하지 않은 이메일 형식입니다.',
    'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'auth/invalid-login-credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'auth/too-many-requests': '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    'auth/network-request-failed': '네트워크 오류입니다. 연결을 확인해주세요.',
  };
  return map[code] ?? '인증 중 오류가 발생했습니다.';
};

export const authService = {
  register: async (fullName, email, password) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: fullName });
      return { success: true, user };
    } catch (error) {
      throw new Error(getAuthErrorMessage(error.code));
    }
  },

  login: async (email, password) => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user };
    } catch (error) {
      throw new Error(getAuthErrorMessage(error.code));
    }
  },

  logout: () => signOut(auth),

  // React에서 cleanup 가능하도록 unsubscribe 반환
  onAuthStateChanged: (callback) => firebaseOnAuthStateChanged(auth, callback),

  // 프로필 조회는 중앙 API로 위임
  getUserProfile,

  // 필요시 현재 사용자 즉시 접근
  getCurrentUser: () => auth.currentUser,
};
