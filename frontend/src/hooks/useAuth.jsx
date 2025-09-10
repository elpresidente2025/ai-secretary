import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  linkWithPopup,
  linkWithCredential,
  EmailAuthProvider,
  unlink,
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { app, functions } from '../services/firebase';
import { useNaverLogin } from './useNaverLogin';

// AuthContext ?앹꽦
const AuthContext = createContext();

// ?ㅻⅨ 而댄룷?뚰듃?먯꽌 ?쎄쾶 ?ъ슜?????덈룄濡?export
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  // ???좎뒪?뚰겕 ?섏젙: useAuth ?낆뿉 而⑦뀓?ㅽ듃 寃利?異붽?
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// AuthProvider 而댄룷?뚰듃
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // 珥덇린媛?true濡??쒖옉
  const [error, setError] = useState(null);
  const auth = getAuth(app);
  const db = getFirestore(app);
  
  // 媛뺤젣 ??꾩븘?껋쑝濡?臾댄븳 濡쒕뵫 諛⑹? (5珥덈줈 蹂듭썝 - ???꾪솚 怨좊젮)
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('?좑툘 Auth 濡쒕뵫 ??꾩븘??- 媛뺤젣 ?꾨즺');
        setLoading(false);
      }
    }, 5000); // 5珥덈줈 蹂듭썝 (???꾪솚 ??異⑸텇???쒓컙 ?쒓났)
    
    return () => clearTimeout(timeout);
  }, [loading]);

  // ?뵦 Firestore?먯꽌 ?ъ슜???꾨줈???뺣낫 媛?몄삤湲?
  const fetchUserProfile = async (uid) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        return userData;
      } else {
        console.log('?좑툘 Firestore?먯꽌 ?ъ슜??臾몄꽌瑜?李얠쓣 ???놁쓬:', uid);
        return null;
      }
    } catch (error) {
      console.error('??Firestore ?ъ슜??議고쉶 ?ㅽ뙣:', error);
      return null;
    }
  };

  useEffect(() => {
    let isFirstLoad = true;
    
    // onAuthStateChanged??援щ룆???댁젣?섎뒗 ?⑥닔瑜?諛섑솚?⑸땲??
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      
      try {
        if (currentUser) {
          // 泥?濡쒕뱶媛 ?꾨땲怨??대? ?ъ슜?먭? ?ㅼ젙?섏뼱 ?덈떎硫??ㅽ궢 (???꾪솚 ??
          if (!isFirstLoad && user?.uid === currentUser.uid) {
            console.log('?????꾪솚 媛먯? - Auth ?ъ쿂由??ㅽ궢');
            setLoading(false);
            return;
          }
          
          // ?꾩떆濡?Firestore ?곌껐 ?놁씠 Firebase Auth留??ъ슜
          
          const combinedUser = {
            // Firebase Auth 湲곕낯 ?뺣낫留?
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            emailVerified: currentUser.emailVerified,
            
            // 湲곕낯媛믩뱾
            isActive: true,
            role: null,
            isAdmin: false,
            
            // ?먮낯 Firebase User 媛앹껜??蹂닿? (?꾩슂??
            _firebaseUser: currentUser
          };
          
          setUser(combinedUser);
          
          // Firestore ?꾨줈???뺣낫瑜?利됱떆 諛깃렇?쇱슫?쒖뿉??濡쒕뱶 (泥?濡쒕뱶 ?쒕쭔)
          if (isFirstLoad) {
            (async () => {
              try {
                const userProfile = await fetchUserProfile(currentUser.uid);
                if (userProfile) {
                  setUser(prev => ({
                    ...prev,
                    ...userProfile
                  }));
                }
              } catch (error) {
                console.warn('?좑툘 Firestore ?꾨줈??濡쒕뱶 ?ㅽ뙣:', error);
              }
            })();
          }
          
        } else {
          console.log('로그아웃됨');
          setUser(null);
        }
      } catch (error) {
        console.error('??Auth ?곹깭 泥섎━ 以??ㅻ쪟:', error);
        setUser(null);
      } finally {
        // ?깃났?섎뱺 ?ㅽ뙣?섎뱺 濡쒕뵫? ?꾨즺
        setLoading(false);
        isFirstLoad = false;
      }
    });

    // 而댄룷?뚰듃媛 ?몃쭏?댄듃????援щ룆???댁젣?섏뿬 硫붾え由??꾩닔瑜?諛⑹??⑸땲??
    return unsubscribe;
  }, [auth, db]);

  const login = async (email, password) => {
    setError(null); // ?댁쟾 ?ㅻ쪟 珥덇린??
    try {
      console.log('?뵍 濡쒓렇???쒕룄:', email);
      
      // ?ㅽ듃?뚰겕 ?ㅻ쪟 ?ъ떆??濡쒖쭅 (理쒕? 3??
      let lastError = null;
      let userCredential = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`?봽 濡쒓렇???쒕룄 ${attempt}/3`);
          userCredential = await signInWithEmailAndPassword(auth, email, password);
          console.log(`??濡쒓렇???깃났 (${attempt}踰덉㎏ ?쒕룄)`);
          break; // ?깃났?섎㈃ 猷⑦봽 醫낅즺
        } catch (err) {
          lastError = err;
          console.warn(`??濡쒓렇???쒕룄 ${attempt} ?ㅽ뙣:`, err.code);
          
          // ?ㅽ듃?뚰겕 ?ㅻ쪟媛 ?꾨땲硫?利됱떆 以묐떒
          if (err.code !== 'auth/network-request-failed') {
            throw err;
          }
          
          // 留덉?留??쒕룄媛 ?꾨땲硫?1珥??湲????ъ떆??
          if (attempt < 3) {
            console.log('??1珥????ъ떆??..');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // 紐⑤뱺 ?쒕룄媛 ?ㅽ뙣??寃쎌슦
      if (!userCredential) {
        throw lastError || new Error('濡쒓렇???ъ떆???ㅽ뙣');
      }
      
      // 濡쒓렇???깃났 ??Firestore?먯꽌 ?꾨줈???뺣낫 媛?몄삤湲?
      const userProfile = await fetchUserProfile(userCredential.user.uid);
      
      const combinedUser = {
        // Firebase Auth 湲곕낯 ?뺣낫
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        emailVerified: userCredential.user.emailVerified,
        
        // Firestore ?꾨줈???뺣낫 (?덈떎硫?
        ...userProfile,
        
        // ?먮낯 Firebase User 媛앹껜??蹂닿? (?꾩슂??
        _firebaseUser: userCredential.user
      };
      
      setUser(combinedUser);
      console.log('??濡쒓렇???깃났:', combinedUser);
      return combinedUser;
    } catch (err) {
      // Firebase?먯꽌 諛쒖깮???ㅻ쪟瑜??≪븘?낅땲??
      console.error('??濡쒓렇???ㅽ뙣:', err);
      // ?ㅻ쪟 硫붿떆吏瑜??곹깭????ν븯怨?
      setError(err.message);
      // ?뵦 媛??以묒슂??遺遺? ?≪? ?ㅻ쪟瑜??ㅼ떆 ?섏졇??HomePage媛 ?????덈룄濡??⑸땲??
      throw err;
    }
  };

  // Google 濡쒓렇???⑥닔 異붽?
  const signInWithGoogle = async () => {
    setError(null);
    try {
      console.log('?뵍 Google 濡쒓렇???쒕룄');
      const provider = new GoogleAuthProvider();
      
      // 異붽? ?ㅼ퐫???붿껌 (?대찓?? ?꾨줈??
      provider.addScope('email');
      provider.addScope('profile');
      
      // CORS ?뺤콉 臾몄젣濡??명빐 紐⑤뱺 ?섍꼍?먯꽌 由щ떎?대젆??諛⑹떇 ?ъ슜
      console.log('?봽 由щ떎?대젆??諛⑹떇?쇰줈 Google 濡쒓렇??吏꾪뻾');
      await signInWithRedirect(auth, provider);
      return; // 由щ떎?대젆????寃곌낵???섏씠吏 濡쒕뱶 ??泥섎━??
      
      if (result) {
        const user = result.user;
        console.log('??Google 濡쒓렇???깃났:', user.email);
        
        // Firestore?먯꽌 湲곗〈 ?꾨줈???뺣낫 媛?몄삤湲?
        const userProfile = await fetchUserProfile(user.uid);
        
        const combinedUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
          
          // Google 濡쒓렇???밸퀎 ?뺣낫
          isGoogleUser: true,
          
          // Firestore ?꾨줈???뺣낫
          ...userProfile,
          
          // ?먮낯 Firebase User 媛앹껜
          _firebaseUser: user
        };
        
        setUser(combinedUser);
        
        // ?좉퇋 Google ?ъ슜?먮㈃ ?꾨줈???ㅼ젙 ?섏씠吏濡??덈궡
        if (!userProfile || !userProfile.isActive) {
          console.log('?넅 ?좉퇋 Google ?ъ슜??- ?꾨줈???ㅼ젙 ?꾩슂');
        }
        
        return combinedUser;
      }
    } catch (err) {
      console.error('??Google 濡쒓렇???ㅽ뙣:', err);
      
      let errorMessage = 'Google 濡쒓렇?몄뿉 ?ㅽ뙣?덉뒿?덈떎.';
      
      switch (err.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Google 濡쒓렇??李쎌씠 ?ロ삍?듬땲??';
          break;
        case 'auth/popup-blocked':
          errorMessage = '?앹뾽??李⑤떒?섏뿀?듬땲?? ?앹뾽 李⑤떒???댁젣?댁＜?몄슂.';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'Google 濡쒓렇?몄씠 痍⑥냼?섏뿀?듬땲??';
          break;
        case 'auth/network-request-failed':
          errorMessage = '?ㅽ듃?뚰겕 ?ㅻ쪟?낅땲?? ?ㅼ떆 ?쒕룄?댁＜?몄슂.';
          break;
        default:
          errorMessage = `Google 濡쒓렇???ㅽ뙣: ${err.message}`;
      }
      
      setError(errorMessage);
      throw err;
    }
  };

  // 由щ떎?대젆??寃곌낵 泥섎━ (紐⑤뱺 Google 濡쒓렇?몄슜)
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const user = result.user;
          console.log('??Google 由щ떎?대젆??濡쒓렇???깃났:', user.email);
          
          // Firestore?먯꽌 湲곗〈 ?꾨줈???뺣낫 媛?몄삤湲?
          const userProfile = await fetchUserProfile(user.uid);
          
          const combinedUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
            
            // Google 濡쒓렇???밸퀎 ?뺣낫
            isGoogleUser: true,
            
            // Firestore ?꾨줈???뺣낫
            ...userProfile,
            
            // ?먮낯 Firebase User 媛앹껜
            _firebaseUser: user
          };
          
          setUser(combinedUser);
          
          // ?좉퇋 Google ?ъ슜?먮㈃ ?꾨줈???ㅼ젙 ?섏씠吏濡??덈궡
          if (!userProfile || !userProfile.isActive) {
            console.log('?넅 ?좉퇋 Google ?ъ슜??- ?꾨줈???ㅼ젙 ?꾩슂');
            // ?꾨줈???ㅼ젙 ?섏씠吏濡?由щ떎?대젆?명븷 ?섎룄 ?덉쓬
          }
        }
      } catch (error) {
        console.error('??Google 由щ떎?대젆??泥섎━ ?ㅽ뙣:', error);
        setError(error.message || 'Google 濡쒓렇??泥섎━ 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.');
      }
    };
    
    handleRedirectResult();
  }, []);

  const logout = async () => {
    setError(null);
    try {
      console.log('?슞 濡쒓렇?꾩썐 ?쒕룄');
      
      // Firebase Auth 濡쒓렇?꾩썐
      await signOut(auth);
      
      // ?곹깭 珥덇린??
      setUser(null);
      setLoading(false);
      
      // 釉뚮씪?곗? ?ㅽ넗由ъ? ?꾩쟾 ?뺣━
      try {
        localStorage.clear();
        sessionStorage.clear();
        
        // IndexedDB ?뺣━ (Firebase??
        if ('indexedDB' in window) {
          const deleteDB = (dbName) => {
            const deleteReq = indexedDB.deleteDatabase(dbName);
            deleteReq.onerror = () => console.log('IndexedDB ??젣 ?ㅽ뙣:', dbName);
            deleteReq.onsuccess = () => console.log('IndexedDB ??젣 ?깃났:', dbName);
          };
          deleteDB('firebaseLocalStorageDb');
          deleteDB('firebase-heartbeat-database');
          deleteDB('firebase-installations-database');
        }
        
        console.log('?㏏ 釉뚮씪?곗? ?ㅽ넗由ъ? ?뺣━ ?꾨즺');
      } catch (storageError) {
        console.warn('?좑툘 ?ㅽ넗由ъ? ?뺣━ 以??쇰? ?ㅻ쪟:', storageError);
      }
      
      console.log('???꾩쟾??濡쒓렇?꾩썐 ?깃났');
      
      // 媛뺤젣 ?섏씠吏 ?덈줈怨좎묠?쇰줈 紐⑤뱺 ?곹깭 珥덇린??
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
      
    } catch (err) {
      console.error('??濡쒓렇?꾩썐 ?ㅽ뙣:', err);
      setError(err.message);
      throw err;
    }
  };

  const register = async ({ email, password, displayName, profileData }) => {
    setError(null);
    try {
      console.log('?뱷 ?뚯썝媛???쒕룄:', email, displayName);
      
      // 1. Firebase Auth???ъ슜???앹꽦
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 2. ?ъ슜???꾨줈???낅뜲?댄듃 (displayName ?ㅼ젙)
      await updateProfile(user, {
        displayName: displayName
      });
      
      // 3. Firebase Functions瑜??듯빐 ?꾨줈???곗씠?????諛??좉굅援?泥댄겕
      const registerWithDistrictCheck = httpsCallable(functions, 'registerWithDistrictCheck');
      await registerWithDistrictCheck({ profileData });
      
      console.log('???뚯썝媛???깃났:', user.uid);
      
      // 4. ?덈줈???ъ슜???뺣낫濡??곹깭 ?낅뜲?댄듃
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
      console.error('???뚯썝媛???ㅽ뙣:', err);
      setError(err.message);
      throw err;
    }
  };

  // ?뵦 ?ъ슜???꾨줈???덈줈怨좎묠 ?⑥닔 (?꾩슂???몄텧)
  const refreshUserProfile = async () => {
    if (user?.uid) {
      console.log('?봽 ?ъ슜???꾨줈???덈줈怨좎묠');
      const userProfile = await fetchUserProfile(user.uid);
      if (userProfile) {
        setUser(prev => ({ ...prev, ...userProfile }));
      }
    }
  };

  // ?뵕 Google 怨꾩젙 ?곌껐 ?⑥닔
  const linkGoogleAccount = async () => {
    setError(null);
    try {
      console.log('?뵕 Google 怨꾩젙 ?곌껐 ?쒕룄');
      
      if (!user) {
        throw new Error('濡쒓렇?몄씠 ?꾩슂?⑸땲??');
      }

      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      const result = await linkWithPopup(auth.currentUser, provider);
      console.log('??Google 怨꾩젙 ?곌껐 ?깃났:', result.user.email);
      
      // ?ъ슜???뺣낫 ?낅뜲?댄듃
      const updatedUser = {
        ...user,
        photoURL: result.user.photoURL,
        linkedAccounts: [...(user.linkedAccounts || []), 'google.com'],
        _firebaseUser: result.user
      };
      
      setUser(updatedUser);
      return updatedUser;
      
    } catch (err) {
      console.error('??Google 怨꾩젙 ?곌껐 ?ㅽ뙣:', err);
      
      let errorMessage = 'Google 怨꾩젙 ?곌껐???ㅽ뙣?덉뒿?덈떎.';
      
      switch (err.code) {
        case 'auth/provider-already-linked':
          errorMessage = '?대? Google 怨꾩젙???곌껐?섏뼱 ?덉뒿?덈떎.';
          break;
        case 'auth/credential-already-in-use':
          errorMessage = '??Google 怨꾩젙? ?ㅻⅨ ?ъ슜?먭? ?ъ슜以묒엯?덈떎.';
          break;
        case 'auth/popup-blocked':
          errorMessage = '?앹뾽??李⑤떒?섏뿀?듬땲?? ?앹뾽 李⑤떒???댁젣?댁＜?몄슂.';
          break;
        case 'auth/popup-closed-by-user':
          errorMessage = '?곌껐??痍⑥냼?섏뿀?듬땲??';
          break;
        default:
          errorMessage = `Google 怨꾩젙 ?곌껐 ?ㅽ뙣: ${err.message}`;
      }
      
      setError(errorMessage);
      throw err;
    }
  };

  // ?뵕 ?대찓??鍮꾨?踰덊샇 怨꾩젙 ?곌껐 ?⑥닔
  const linkEmailAccount = async (email, password) => {
    setError(null);
    try {
      console.log('?뵕 ?대찓??怨꾩젙 ?곌껐 ?쒕룄:', email);
      
      if (!user) {
        throw new Error('濡쒓렇?몄씠 ?꾩슂?⑸땲??');
      }

      const credential = EmailAuthProvider.credential(email, password);
      const result = await linkWithCredential(auth.currentUser, credential);
      console.log('???대찓??怨꾩젙 ?곌껐 ?깃났:', result.user.email);
      
      // ?ъ슜???뺣낫 ?낅뜲?댄듃
      const updatedUser = {
        ...user,
        email: result.user.email,
        linkedAccounts: [...(user.linkedAccounts || []), 'password'],
        _firebaseUser: result.user
      };
      
      setUser(updatedUser);
      return updatedUser;
      
    } catch (err) {
      console.error('???대찓??怨꾩젙 ?곌껐 ?ㅽ뙣:', err);
      
      let errorMessage = '?대찓??怨꾩젙 ?곌껐???ㅽ뙣?덉뒿?덈떎.';
      
      switch (err.code) {
        case 'auth/provider-already-linked':
          errorMessage = '?대? ?대찓??怨꾩젙???곌껐?섏뼱 ?덉뒿?덈떎.';
          break;
        case 'auth/credential-already-in-use':
          errorMessage = '???대찓?쇱? ?ㅻⅨ ?ъ슜?먭? ?ъ슜以묒엯?덈떎.';
          break;
        case 'auth/invalid-email':
          errorMessage = '?좏슚?섏? ?딆? ?대찓??二쇱냼?낅땲??';
          break;
        case 'auth/weak-password':
          errorMessage = '鍮꾨?踰덊샇媛 ?덈Т ?쏀빀?덈떎.';
          break;
        default:
          errorMessage = `?대찓??怨꾩젙 ?곌껐 ?ㅽ뙣: ${err.message}`;
      }
      
      setError(errorMessage);
      throw err;
    }
  };

  // ?뵑 怨꾩젙 ?곌껐 ?댁젣 ?⑥닔
  const unlinkAccount = async (providerId) => {
    setError(null);
    try {
      console.log('?뵑 怨꾩젙 ?곌껐 ?댁젣 ?쒕룄:', providerId);
      
      if (!user) {
        throw new Error('濡쒓렇?몄씠 ?꾩슂?⑸땲??');
      }

      const result = await unlink(auth.currentUser, providerId);
      console.log('??怨꾩젙 ?곌껐 ?댁젣 ?깃났:', providerId);
      
      // ?ъ슜???뺣낫 ?낅뜲?댄듃
      const updatedUser = {
        ...user,
        linkedAccounts: (user.linkedAccounts || []).filter(id => id !== providerId),
        _firebaseUser: result
      };
      
      setUser(updatedUser);
      return updatedUser;
      
    } catch (err) {
      console.error('??怨꾩젙 ?곌껐 ?댁젣 ?ㅽ뙣:', err);
      
      let errorMessage = '怨꾩젙 ?곌껐 ?댁젣???ㅽ뙣?덉뒿?덈떎.';
      
      switch (err.code) {
        case 'auth/no-such-provider':
          errorMessage = '?곌껐??怨꾩젙???놁뒿?덈떎.';
          break;
        default:
          errorMessage = `怨꾩젙 ?곌껐 ?댁젣 ?ㅽ뙣: ${err.message}`;
      }
      
      setError(errorMessage);
      throw err;
    }
  };

  // ?ㅼ씠踰?濡쒓렇???⑥닔 - useNaverLogin ???ъ슜
  // 네이버 로그인: 컴포넌트에서 useNaverLogin()을 직접 사용하세요.

  // 而⑦뀓?ㅽ듃濡??쒓났??媛믩뱾
  const value = {
    user,
    loading,
    error,
    login,
    signInWithGoogle, // ?뵦 Google 濡쒓렇???⑥닔 異붽?

    register,
    logout,
    refreshUserProfile, // ?뵦 ?꾨줈???덈줈怨좎묠 ?⑥닔 異붽?
    // ?뵕 怨꾩젙 ?곌껐 ?⑥닔??異붽?
    linkGoogleAccount,
    linkEmailAccount,
    unlinkAccount,
    // ?몄쓽瑜??꾪븳 諛붾줈 ?묎렐 媛?ν븳 媛믩뱾
    auth: {
      user: user,
      isAuthenticated: !!user,
      isAdmin: user?.isAdmin || false,
      role: user?.role || null
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {/* ???좎뒪?뚰겕 ?섏젙: ??긽 children???뚮뜑留곹븯?꾨줉 ?섏젙 */}
      {children}
    </AuthContext.Provider>
  );
};
