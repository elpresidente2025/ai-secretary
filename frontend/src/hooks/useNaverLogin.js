import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export const useNaverLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasHandledCallbackRef = useRef(false);
  const navigate = useNavigate();

  const initializeNaverLogin = () => {
    if (typeof window !== 'undefined' && window.naver) {
      const naverLogin = new window.naver.LoginWithNaverId({
        clientId: "_E0OZLvkgp61fV7MFtND",
        callbackUrl: window.location.origin + "/auth/naver/callback",
        isPopup: false,
        callbackHandle: true,
        scope: 'name,gender,age,profile_image'
      });
      return naverLogin;
    }
    return null;
  };

  const loginWithNaver = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const naverLogin = initializeNaverLogin();
      if (!naverLogin) throw new Error('네이버 SDK를 불러오지 못했습니다.');
      naverLogin.authorize();
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNaverCallback = async () => {
    if (hasHandledCallbackRef.current) return;
    hasHandledCallbackRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      // Try implicit flow token from hash
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      let accessToken = hash.get('access_token');
      let state = hash.get('state');
      let code = null;

      // Or authorization code from query
      if (!accessToken) {
        const qs = new URLSearchParams(window.location.search);
        accessToken = qs.get('access_token');
        code = qs.get('code');
        state = qs.get('state') || state;
      }

      // Call Cloud Function with either accessToken or code
      const payload = accessToken ? { accessToken } : code ? { code, state } : null;
      if (!payload) throw new Error('네이버 콜백 파라미터가 없습니다. 다시 시도해 주세요.');

      const resp = await fetch('https://asia-northeast3-ai-secretary-6e9c8.cloudfunctions.net/naverLoginHTTP', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      const result = json.result;
      if (!result?.success) throw new Error('네이버 로그인 처리 실패');

      const { autoRegistered, user, naver, customToken } = result;
      
      // TODO: Firebase Auth 커스텀 토큰으로 로그인 (IAM 권한 해결 필요)
      // if (customToken) {
      //   const { signInWithCustomToken } = await import('firebase/auth');
      //   const { auth } = await import('../services/firebase');
      //   await signInWithCustomToken(auth, customToken);
      // }
      
      // Persist light session for Naver users (no Firebase Auth email/password)
      const currentUserData = {
        uid: user.uid,
        naverUserId: user.naverUserId,
        displayName: user.displayName,
        photoURL: user.photoURL,
        provider: user.provider,
        profileComplete: user.profileComplete
      };
      
      localStorage.setItem('currentUser', JSON.stringify(currentUserData));
      
      // 프로필 완료된 사용자라면 추가 프로필 정보 조회하여 localStorage 업데이트
      if (user.profileComplete) {
        try {
          const { callFunctionWithNaverAuth } = await import('../services/firebaseService');
          const profileResponse = await callFunctionWithNaverAuth('getUserProfile');
          if (profileResponse?.profile) {
            const updatedUserData = {
              ...currentUserData,
              ...profileResponse.profile
            };
            localStorage.setItem('currentUser', JSON.stringify(updatedUserData));
            console.log('✅ 네이버 사용자 프로필 정보 업데이트 완료:', updatedUserData);
          }
        } catch (profileError) {
          console.warn('프로필 정보 조회 실패 (무시):', profileError.message);
        }
      }

      if (autoRegistered || !user?.profileComplete) {
        navigate('/register', { state: { naverUserData: naver || null } });
      } else {
        window.location.href = '/dashboard';
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return { loginWithNaver, handleNaverCallback, isLoading, error, initializeNaverLogin };
};

