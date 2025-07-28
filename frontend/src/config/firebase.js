// frontend/src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyAU8Q8bXjZNqDdDUYjei1S1hPkzuaytY40",
  authDomain: "ai-secretary-6e9c8.firebaseapp.com",
  projectId: "ai-secretary-6e9c8",
  storageBucket: "ai-secretary-6e9c8.firebasestorage.app",
  messagingSenderId: "527392419804",
  appId: "1:527392419804:web:9c9f355f250366cd716919",
  measurementId: "G-LFJQF290TW"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// 🔥 Functions 지역을 서울로 변경
export const functions = getFunctions(app, 'asia-northeast3');

export default app;