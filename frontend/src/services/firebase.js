import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from "firebase/analytics";

// 사용자님께서 제공해주신 Firebase 설정값입니다.
const firebaseConfig = {
  apiKey: "AIzaSyAU8Q8bXjZNqDdDUYjei1S1hPkzuaytY40",
  authDomain: "ai-secretary-6e9c8.firebaseapp.com",
  projectId: "ai-secretary-6e9c8",
  storageBucket: "ai-secretary-6e9c8.firebasestorage.app",
  messagingSenderId: "527392419804",
  appId: "1:527392419804:web:9c9f355f250366cd716919",
  measurementId: "G-LFJQF290TW"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// 다른 파일에서 사용할 수 있도록 export 합니다.
export { app };
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
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
