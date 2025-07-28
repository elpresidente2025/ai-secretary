import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { authService } from '../services/authService';

// 1. Context 생성
const AuthContext = createContext(null);

// 2. AuthProvider 컴포넌트 정의
export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Firebase Auth 상태 변화 감지
    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      try {
        setError(null);
        
        if (user) {
          // 사용자가 로그인된 상태
          const userData = {
            id: user.uid,
            email: user.email,
            name: user.displayName || ''
          };
          
          setAuth({ user: userData });
          console.log("AuthContext: Firebase Auth 로그인 감지", userData);
        } else {
          // 사용자가 로그아웃된 상태
          setAuth(null);
          console.log("AuthContext: Firebase Auth 로그아웃 감지");
        }
      } catch (error) {
        console.error("AuthContext: 인증 상태 처리 오류", error);
        setError(error.message);
        setAuth(null);
      } finally {
        setLoading(false);
      }
    });

    // cleanup 함수
    return () => unsubscribe();
  }, []);

  // 로그인 함수 (Firebase Auth 사용)
  const login = useCallback(async (email, password) => {
    try {
      setError(null);
      const result = await authService.login(email, password);
      console.log("AuthContext: Firebase 로그인 성공", result.user);
      // Firebase onAuthStateChanged가 자동으로 상태를 업데이트함
      return result;
    } catch (error) {
      console.error("AuthContext: Firebase 로그인 실패", error);
      setError(error.message);
      throw error;
    }
  }, []);

  // 회원가입 함수 (Firebase Auth 사용)
  const register = useCallback(async (fullName, email, password) => {
    try {
      setError(null);
      const result = await authService.register(fullName, email, password);
      console.log("AuthContext: Firebase 회원가입 성공", result.user);
      // Firebase onAuthStateChanged가 자동으로 상태를 업데이트함
      return result;
    } catch (error) {
      console.error("AuthContext: Firebase 회원가입 실패", error);
      setError(error.message);
      throw error;
    }
  }, []);

  // 로그아웃 함수 (Firebase Auth 사용)
  const logout = useCallback(async () => {
    try {
      await authService.logout();
      console.log("AuthContext: Firebase 로그아웃 성공");
      // Firebase onAuthStateChanged가 자동으로 상태를 업데이트함
    } catch (error) {
      console.error("AuthContext: Firebase 로그아웃 실패", error);
      setError(error.message);
    }
  }, []);

  // context value를 메모이제이션
  const value = useMemo(() => ({
    auth,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!auth?.user,
  }), [auth, loading, error, login, register, logout]);

  // 로딩 컴포넌트
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. useAuth 커스텀 훅
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.');
  }
  return context;
};

export default AuthContext;