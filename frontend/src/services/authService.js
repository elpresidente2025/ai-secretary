// frontend/src/services/authService.js
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth, functions } from '../config/firebase.js';
import { httpsCallable } from 'firebase/functions';

// 🔥 Firebase Auth 기반 인증 서비스
export const authService = {
  // 회원가입
  register: async (fullName, email, password) => {
    try {
      console.log('🔥 Firebase Auth 회원가입 시도:', { fullName, email });
      
      // Firebase Auth로 사용자 생성
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 사용자 프로필 업데이트 (displayName 설정)
      await updateProfile(user, {
        displayName: fullName
      });
      
      console.log('✅ Firebase Auth 회원가입 성공:', user.uid);
      
      return {
        success: true,
        user: {
          id: user.uid,
          email: user.email,
          name: fullName
        }
      };
    } catch (error) {
      console.error('❌ Firebase Auth 회원가입 실패:', error);
      throw {
        message: getAuthErrorMessage(error.code)
      };
    }
  },

  // 로그인
  login: async (email, password) => {
    try {
      console.log('🔥 Firebase Auth 로그인 시도:', { email });
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Firebase ID 토큰 가져오기
      const token = await user.getIdToken();
      
      console.log('✅ Firebase Auth 로그인 성공:', user.uid);
      
      return {
        success: true,
        user: {
          id: user.uid,
          email: user.email,
          name: user.displayName || ''
        },
        token: token
      };
    } catch (error) {
      console.error('❌ Firebase Auth 로그인 실패:', error);
      throw {
        message: getAuthErrorMessage(error.code)
      };
    }
  },

  // 로그아웃
  logout: async () => {
    try {
      await signOut(auth);
      console.log('✅ Firebase Auth 로그아웃 성공');
      return { success: true };
    } catch (error) {
      console.error('❌ Firebase Auth 로그아웃 실패:', error);
      throw error;
    }
  },

  // 인증 상태 감지
  onAuthStateChanged: (callback) => {
    return onAuthStateChanged(auth, callback);
  },

  // 현재 사용자 정보
  getCurrentUser: () => {
    return auth.currentUser;
  },

  // 사용자 프로필 조회 (Firestore에서)
  getUserProfile: async () => {
    try {
      const getUserProfileFunction = httpsCallable(functions, 'getUserProfile');
      const result = await getUserProfileFunction();
      return result.data;
    } catch (error) {
      console.error('❌ 사용자 프로필 조회 실패:', error);
      throw error;
    }
  }
};

// Firebase Auth 에러 메시지 한국어 변환
const getAuthErrorMessage = (errorCode) => {
  const errorMessages = {
    'auth/user-not-found': '등록되지 않은 이메일입니다.',
    'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
    'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
    'auth/weak-password': '비밀번호가 너무 약합니다. 6자 이상 입력해주세요.',
    'auth/invalid-email': '유효하지 않은 이메일 형식입니다.',
    'auth/too-many-requests': '너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.',
    'auth/network-request-failed': '네트워크 연결을 확인해주세요.',
    'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
  };
  
  return errorMessages[errorCode] || '인증 중 오류가 발생했습니다.';
};

export default authService;