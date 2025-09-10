import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Firebase 설정
const firebaseConfig = {
  apiKey: 'AIzaSyAU8Q8bXjZNqDdDUYjei1S1hPkzuaytY40',
  authDomain: 'ai-secretary-6e9c8.firebaseapp.com',
  projectId: 'ai-secretary-6e9c8',
  storageBucket: 'ai-secretary-6e9c8.firebasestorage.app',
  messagingSenderId: '527392419804',
  appId: '1:527392419804:web:9c9f355f250366cd716919',
  measurementId: 'G-LFJQF290TW'
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// 다른 파일에서 사용하도록 export
export { app };
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Firebase Auth persistence 설정 (LocalStorage 사용)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Firebase Auth persistence 설정 실패:', error);
});

// Functions 인스턴스: Hosting 자동 설정(/__/functions) 경유 사용
// onCall 함수는 SDK를 통해 호출하면 CORS/프리플라이트를 안전하게 처리합니다.
// 리전 미지정시 Firebase Hosting 프록시(/__/functions/)를 통해 호출됩니다.
export const functions = getFunctions(app);

// Analytics
export const analytics = getAnalytics(app);
