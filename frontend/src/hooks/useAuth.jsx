import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { app } from '../services/firebase';

// AuthContext 생성
const AuthContext = createContext();

// 다른 컴포넌트에서 쉽게 사용할 수 있도록 export
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  // ✅ 젠스파크 수정: useAuth 훅에 컨텍스트 검증 추가
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// AuthProvider 컴포넌트
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // 🔥 Firestore에서 사용자 프로필 정보 가져오기
  const fetchUserProfile = async (uid) => {
    try {
      console.log('🔍 Firestore에서 사용자 프로필 조회 중...', uid);
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        console.log('✅ Firestore 사용자 데이터:', userData);
        return userData;
      } else {
        console.log('⚠️ Firestore에서 사용자 문서를 찾을 수 없음:', uid);
        return null;
      }
    } catch (error) {
      console.error('❌ Firestore 사용자 조회 실패:', error);
      return null;
    }
  };

  useEffect(() => {
    // onAuthStateChanged는 구독을 해제하는 함수를 반환합니다.
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('🔥 Auth 상태 변경:', currentUser?.uid);
      
      if (currentUser) {
        // Firebase Auth 사용자 정보와 Firestore 프로필 정보 병합
        const userProfile = await fetchUserProfile(currentUser.uid);
        
        const combinedUser = {
          // Firebase Auth 기본 정보
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          emailVerified: currentUser.emailVerified,
          
          // Firestore 프로필 정보 (있다면)
          ...userProfile,
          
          // 원본 Firebase User 객체도 보관 (필요시)
          _firebaseUser: currentUser
        };
        
        console.log('👤 통합된 사용자 정보:', combinedUser);
        setUser(combinedUser);
      } else {
        console.log('🚫 로그아웃됨');
        setUser(null);
      }
      
      setLoading(false);
    });

    // 컴포넌트가 언마운트될 때 구독을 해제하여 메모리 누수를 방지합니다.
    return unsubscribe;
  }, [auth, db]);

  const login = async (email, password) => {
    setError(null); // 이전 오류 초기화
    try {
      console.log('🔐 로그인 시도:', email);
      // Firebase에 로그인을 시도합니다.
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // 로그인 성공 후 Firestore에서 프로필 정보 가져오기
      const userProfile = await fetchUserProfile(userCredential.user.uid);
      
      const combinedUser = {
        // Firebase Auth 기본 정보
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        emailVerified: userCredential.user.emailVerified,
        
        // Firestore 프로필 정보 (있다면)
        ...userProfile,
        
        // 원본 Firebase User 객체도 보관 (필요시)
        _firebaseUser: userCredential.user
      };
      
      setUser(combinedUser);
      console.log('✅ 로그인 성공:', combinedUser);
      return combinedUser;
    } catch (err) {
      // Firebase에서 발생한 오류를 잡아냅니다.
      console.error('❌ 로그인 실패:', err);
      // 오류 메시지를 상태에 저장하고,
      setError(err.message);
      // 🔥 가장 중요한 부분: 잡은 오류를 다시 던져서 HomePage가 알 수 있도록 합니다.
      throw err;
    }
  };

  const logout = async () => {
    setError(null);
    try {
      console.log('🚪 로그아웃 시도');
      await signOut(auth);
      setUser(null);
      console.log('✅ 로그아웃 성공');
    } catch (err) {
      console.error('❌ 로그아웃 실패:', err);
      setError(err.message);
      throw err;
    }
  };

  // 🔥 사용자 프로필 새로고침 함수 (필요시 호출)
  const refreshUserProfile = async () => {
    if (user?.uid) {
      console.log('🔄 사용자 프로필 새로고침');
      const userProfile = await fetchUserProfile(user.uid);
      if (userProfile) {
        setUser(prev => ({ ...prev, ...userProfile }));
      }
    }
  };

  // 컨텍스트로 제공할 값들
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    refreshUserProfile, // 🔥 프로필 새로고침 함수 추가
    // 편의를 위한 바로 접근 가능한 값들
    auth: {
      user: user,
      isAuthenticated: !!user,
      isAdmin: user?.isAdmin || false,
      role: user?.role || null
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {/* ✅ 젠스파크 수정: 항상 children을 렌더링하도록 수정 */}
      {children}
    </AuthContext.Provider>
  );
};