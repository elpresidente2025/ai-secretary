import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
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
export const functions = getFunctions(app, 'asia-northeast3');
export const analytics = getAnalytics(app);
