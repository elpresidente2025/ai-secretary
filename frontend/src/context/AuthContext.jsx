import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { authService } from '../services/authService';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

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
          // 기본 사용자 정보
          let userData = {
            id: user.uid,
            email: user.email,
            name: user.displayName || ''
          };

          // Firestore에서 추가 프로필 정보 (role 포함) 가져오기
          try {
            const getUserProfile = httpsCallable(functions, 'getUserProfile');
            const profileResult = await getUserProfile();
            
            if (profileResult.data.success && profileResult.data.profile) {
              // Firebase Functions에서 가져온 프로필 정보 병합
              userData = {
                ...userData,
                ...profileResult.data.profile,
                role: profileResult.data.profile.role || 'user' // 기본값 'user'
              };
              console.log("AuthContext: 사용자 프로필 로드 완료", userData);
            }
          } catch (profileError) {
            console.warn("AuthContext: 프로필 로드 실패, 기본값 사용", profileError);
            // 프로필 로드 실패해도 기본 정보로 진행
            userData.role = 'user';
          }
          
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
      
      // 이메일과 패스워드가 올바른 타입인지 확인
      if (typeof email !== 'string' || typeof password !== 'string') {
        throw new Error('이메일과 패스워드는 문자열이어야 합니다.');
      }
      
      console.log("AuthContext: Firebase 로그인 시도:", { email: email, passwordLength: password.length });
      
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

  // 회원가입 함수 (Firebase Auth + 선거구 검사)
  const register = useCallback(async (fullName, email, password, profileData = null) => {
    try {
      setError(null);
      
      // 1단계: Firebase Auth 회원가입
      const result = await authService.register(fullName, email, password);
      console.log("AuthContext: Firebase 회원가입 성공", result.user);
      
      // 2단계: 추가 프로필 정보가 있으면 선거구 중복 검사 및 저장
      if (profileData) {
        try {
          const registerWithDistrictCheck = httpsCallable(functions, 'registerWithDistrictCheck');
          const profileResult = await registerWithDistrictCheck({ profileData });
          
          if (!profileResult.data.success) {
            // 프로필 저장 실패 시 생성된 Auth 계정 삭제
            await authService.logout();
            throw new Error(profileResult.data.message || '프로필 저장에 실패했습니다.');
          }
          
          console.log("AuthContext: 프로필 저장 성공");
        } catch (profileError) {
          // 프로필 저장 실패 시 생성된 Auth 계정 삭제
          await authService.logout();
          console.error("AuthContext: 프로필 저장 실패, 계정 삭제함", profileError);
          throw profileError;
        }
      }
      
      return result;
    } catch (error) {
      console.error("AuthContext: 회원가입 실패", error);
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

  // 프로필 업데이트 함수
  const updateUserProfile = useCallback(async (profileData) => {
    try {
      setError(null);
      console.log('프로필 업데이트 요청:', profileData);
      
      const updateProfile = httpsCallable(functions, 'updateProfile');
      const result = await updateProfile(profileData);
      
      if (result.data.success) {
        // 로컬 상태만 업데이트, 재인증은 하지 않음
        setAuth(prevAuth => {
          if (!prevAuth) return prevAuth;
          
          const updatedAuth = {
            ...prevAuth,
            user: {
              ...prevAuth.user,
              ...profileData
            }
          };
          
          console.log("AuthContext: 프로필 로컬 업데이트 완료", updatedAuth.user);
          return updatedAuth;
        });
      }
      
      return result.data;
    } catch (error) {
      console.error("AuthContext: 프로필 업데이트 실패", error);
      setError(error.message);
      throw error;
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
    updateUserProfile,
    isAuthenticated: !!auth?.user,
  }), [auth, loading, error, login, register, logout, updateUserProfile]);

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

// Context만 default export
export default AuthContext;