import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { app } from '../services/firebase'; // firebase.js에서 app을 가져옵니다.

// AuthContext 생성
const AuthContext = createContext();

// 다른 컴포넌트에서 쉽게 사용할 수 있도록 export
export const useAuth = () => {
  return useContext(AuthContext);
};

// AuthProvider 컴포넌트
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const auth = getAuth(app);

  useEffect(() => {
    // onAuthStateChanged는 구독을 해제하는 함수를 반환합니다.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // 컴포넌트가 언마운트될 때 구독을 해제하여 메모리 누수를 방지합니다.
    return unsubscribe;
  }, [auth]);

  const login = async (email, password) => {
    setError(null); // 이전 오류 초기화
    try {
      // Firebase에 로그인을 시도합니다.
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      return userCredential.user;
    } catch (err) {
      // Firebase에서 발생한 오류를 잡아냅니다.
      // 오류 메시지를 상태에 저장하고,
      setError(err.message);
      // 🔥 가장 중요한 부분: 잡은 오류를 다시 던져서 HomePage가 알 수 있도록 합니다.
      throw err;
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // 컨텍스트로 제공할 값들
  const value = {
    user,
    loading,
    error,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* 로딩 중이 아닐 때만 children을 렌더링 (깜빡임 방지) */}
      {!loading && children}
    </AuthContext.Provider>
  );
};
