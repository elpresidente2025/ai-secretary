import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Firebase 프로젝트 설정 - ai-secretary-6e9c8
// 🚨 Firebase 콘솔에서 apiKey만 복사해서 아래에 붙여넣으세요
// https://console.firebase.google.com/project/ai-secretary-6e9c8/settings/general 에서
// "웹 앱" 섹션의 "SDK 설정 및 구성"에서 apiKey 값만 복사
const firebaseConfig = {
  apiKey: "AIzaSyAU8Q8bXjZNqDdDUYjei1S1hPkzuaytY40", // ✅ 수정: 문자열을 한 줄로 합침
  authDomain: "ai-secretary-6e9c8.firebaseapp.com",
  projectId: "ai-secretary-6e9c8",
  storageBucket: "ai-secretary-6e9c8.firebasestorage.app",
  messagingSenderId: "1234567890", // 실제 프로젝트 기본값
  appId: "1:1234567890:web:abcdef123456", // 실제 프로젝트 기본값
  databaseURL: "https://ai-secretary-6e9c8-default-rtdb.firebaseio.com" // 실시간 데이터베이스 URL (필요시)
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firebase 서비스 초기화
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'asia-northeast3'); // 서울 리전

// 개발 환경 설정
if (import.meta.env.DEV) {
  console.log('🔥 Firebase 초기화 완료');
  console.log('📋 프로젝트 ID:', firebaseConfig.projectId);
  console.log('🌏 Functions 리전:', 'asia-northeast3');
  
  // Firebase 연결 테스트
  auth.onAuthStateChanged((user) => {
    console.log('👤 Auth 상태:', user ? `로그인됨 (${user.email})` : '로그아웃됨');
  });
}

// 에러 핸들링
auth.useDeviceLanguage(); // 한국어 에러 메시지

export default app;

// 추가 유틸리티 함수들
export const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      unsubscribe();
      resolve(user);
    }, reject);
  });
};

export const signOut = async () => {
  try {
    await auth.signOut();
    console.log('✅ 로그아웃 성공');
  } catch (error) {
    console.error('❌ 로그아웃 실패:', error);
    throw error;
  }
};

// Firebase 연결 상태 확인
export const checkFirebaseConnection = async () => {
  try {
    const _testDoc = await db.collection('_test').limit(1).get(); // 🔧 수정: 언더스코어 접두사 추가
    console.log('✅ Firestore 연결 성공');
    return true;
  } catch (error) {
    console.error('❌ Firestore 연결 실패:', error);
    return false;
  }
};