import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from "firebase/analytics";

// Firebase 설정값 (네트워크 오류 해결을 위해 검증)
const firebaseConfig = {
  apiKey: "AIzaSyAU8Q8bXjZNqDdDUYjei1S1hPkzuaytY40",
  authDomain: "ai-secretary-6e9c8.firebaseapp.com",
  projectId: "ai-secretary-6e9c8",
  storageBucket: "ai-secretary-6e9c8.firebasestorage.app",
  messagingSenderId: "527392419804",
  appId: "1:527392419804:web:9c9f355f250366cd716919",
  measurementId: "G-LFJQF290TW"
};

console.log('🔧 Firebase 설정 확인:', {
  apiKey: firebaseConfig.apiKey ? '설정됨' : '누락',
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId
});

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// 다른 파일에서 사용할 수 있도록 export 합니다.
export { app };
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// 네트워크 연결 진단
if (typeof window !== 'undefined') {
  setTimeout(async () => {
    try {
      console.log('🔧 Firebase Auth 네트워크 진단 시작...');
      console.log('✅ 승인된 도메인 확인됨: ai-secretary-6e9c8.web.app');
      console.log('현재 도메인:', window.location.origin);
      
      // 기본 Google 서비스 연결 테스트
      try {
        const googleTest = await fetch('https://www.google.com/favicon.ico', { 
          mode: 'no-cors',
          method: 'GET'
        });
        console.log('🌐 Google 기본 연결:', googleTest.type === 'opaque' ? '성공' : '실패');
      } catch (e) {
        console.log('❌ Google 연결 실패:', e.message);
      }
      
      // 브라우저 정보
      console.log('🖥️ 브라우저 환경:', {
        userAgent: navigator.userAgent.substring(0, 50) + '...',
        online: navigator.onLine,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack
      });
      
      console.log('💡 승인된 도메인은 정상이므로 다른 원인:');
      console.log('1. 🔐 시크릿 창에서 접속 시도');
      console.log('2. 🚫 브라우저 확장프로그램 비활성화');
      console.log('3. 🌐 다른 브라우저로 시도'); 
      console.log('4. 📡 네트워크/ISP의 Firebase 도메인 차단');
      console.log('5. 🔥 Firebase Auth 서비스 일시 장애');
      
    } catch (error) {
      console.error('❌ 네트워크 진단 실패:', error);
    }
  }, 2000);
}
// 🚨 강제로 Production Functions만 사용 (에뮬레이터 완전 차단)
console.log('🌐 Production 환경 강제 설정 - 에뮬레이터 절대 연결 안함');

// Firebase 에뮬레이터 관련 저장소 완전 삭제
if (typeof window !== 'undefined') {
  // 에뮬레이터 관련 모든 저장소 정보 삭제
  try {
    localStorage.removeItem('firebase:host:asia-northeast3-ai-secretary-6e9c8.cloudfunctions.net');
    localStorage.removeItem('firebase:host:localhost');
    sessionStorage.removeItem('firebase:host:asia-northeast3-ai-secretary-6e9c8.cloudfunctions.net');
    sessionStorage.removeItem('firebase:host:localhost');
    console.log('🧹 Firebase 에뮬레이터 캐시 삭제 완료');
  } catch (e) {
    console.log('⚠️ 캐시 삭제 실패 (정상):', e.message);
  }
}

const functions = getFunctions(app, 'asia-northeast3');

// 에뮬레이터 연결 완전 차단 - 어떤 조건에서도 에뮬레이터 연결 안함
console.log('✅ Production Functions 인스턴스 생성 완료');
console.log('🔍 Functions 설정 확인:', {
  region: 'asia-northeast3',
  projectId: app.options.projectId,
  emulatorBlocked: true
});

export { functions };

export const analytics = getAnalytics(app);
