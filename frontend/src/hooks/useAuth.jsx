import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { app, functions } from '../services/firebase';

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
  const [loading, setLoading] = useState(true); // 초기값 true로 시작
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
      
      try {
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
      } catch (error) {
        console.error('❌ Auth 상태 처리 중 오류:', error);
        setUser(null);
      } finally {
        // 성공하든 실패하든 로딩은 완료
        setLoading(false);
      }
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
      
      // Firebase Auth 로그아웃
      await signOut(auth);
      
      // 상태 초기화
      setUser(null);
      setLoading(false);
      
      // 브라우저 스토리지 완전 정리
      try {
        localStorage.clear();
        sessionStorage.clear();
        
        // IndexedDB 정리 (Firebase용)
        if ('indexedDB' in window) {
          const deleteDB = (dbName) => {
            const deleteReq = indexedDB.deleteDatabase(dbName);
            deleteReq.onerror = () => console.log('IndexedDB 삭제 실패:', dbName);
            deleteReq.onsuccess = () => console.log('IndexedDB 삭제 성공:', dbName);
          };
          deleteDB('firebaseLocalStorageDb');
          deleteDB('firebase-heartbeat-database');
          deleteDB('firebase-installations-database');
        }
        
        console.log('🧹 브라우저 스토리지 정리 완료');
      } catch (storageError) {
        console.warn('⚠️ 스토리지 정리 중 일부 오류:', storageError);
      }
      
      console.log('✅ 완전한 로그아웃 성공');
      
      // 강제 페이지 새로고침으로 모든 상태 초기화
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
      
    } catch (err) {
      console.error('❌ 로그아웃 실패:', err);
      setError(err.message);
      throw err;
    }
  };

  const register = async ({ email, password, displayName, profileData }) => {
    setError(null);
    try {
      console.log('📝 회원가입 시도:', email, displayName);
      
      // 1. Firebase Auth에 사용자 생성
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 2. 사용자 프로필 업데이트 (displayName 설정)
      await updateProfile(user, {
        displayName: displayName
      });
      
      // 3. Firebase Functions를 통해 프로필 데이터 저장 및 선거구 체크
      const registerWithDistrictCheck = httpsCallable(functions, 'registerWithDistrictCheck');
      await registerWithDistrictCheck({ profileData });
      
      console.log('✅ 회원가입 성공:', user.uid);
      
      // 4. 새로운 사용자 정보로 상태 업데이트
      const combinedUser = {
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        emailVerified: user.emailVerified,
        ...profileData,
        _firebaseUser: user
      };
      
      setUser(combinedUser);
      return combinedUser;
      
    } catch (err) {
      console.error('❌ 회원가입 실패:', err);
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
    register,
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