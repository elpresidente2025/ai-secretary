/* eslint-disable react-refresh/only-export-components */
// frontend/src/hooks/useAuth.jsx
import { useState, useEffect, createContext, useContext } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { auth } from '../services/firebase';

// Auth Context 생성
const AuthContext = createContext();

// Auth Provider 컴포넌트
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Firebase 사용자를 앱의 사용자 형식으로 변환
        const appUser = {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || '',
          emailVerified: firebaseUser.emailVerified,
          photoURL: firebaseUser.photoURL
        };
        setUser(appUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 로그인
  const login = async (email, password) => {
    try {
      setError('');
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: result.user };
    } catch (error) {
      console.error('로그인 실패:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // 회원가입
  const register = async (fullName, email, password) => {
    try {
      setError('');
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // 사용자 프로필 업데이트
      if (fullName) {
        await updateProfile(result.user, { displayName: fullName });
      }
      
      return { success: true, user: result.user };
    } catch (error) {
      console.error('회원가입 실패:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃
  const signOut = async () => {
    try {
      setError('');
      await firebaseSignOut(auth);
      return { success: true };
    } catch (error) {
      console.error('로그아웃 실패:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  const value = {
    auth: {
      user,
      loading,
      error
    },
    login,
    register,
    signOut,
    setError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// useAuth 훅
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}