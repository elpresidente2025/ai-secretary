import { useState, useEffect, useRef } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { useNavigate } from 'react-router-dom';
import { auth, functions } from '../services/firebase';

// Firebase Hosting 프록시를 통한 네이버 로그인 호출 (Popup 방식)
const callNaverLoginViaProxy = (data) => {
  return new Promise((resolve, reject) => {
    // 작은 팝업 창 열기
    const popup = window.open(
      'https://ai-secretary-6e9c8.web.app/proxy/naver-login.html',
      'naverLoginProxy',
      'width=400,height=300,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      reject(new Error('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.'));
      return;
    }

    const handleMessage = (event) => {
      if (event.origin !== 'https://ai-secretary-6e9c8.web.app') {
        return;
      }

      if (event.data.type === 'proxy-ready') {
        // 프록시 준비 완료, 데이터 전송
        popup.postMessage(data, 'https://ai-secretary-6e9c8.web.app');
      } else if (event.data.type === 'naver-login-result') {
        // 결과 수신
        window.removeEventListener('message', handleMessage);
        popup.close();

        if (event.data.success) {
          resolve({ data: event.data.data.result });
        } else {
          reject(new Error(event.data.error));
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // 팝업이 닫힌 경우 처리
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        reject(new Error('사용자가 팝업을 닫았습니다.'));
      }
    }, 1000);

    // 타임아웃 설정
    setTimeout(() => {
      clearInterval(checkClosed);
      window.removeEventListener('message', handleMessage);
      if (!popup.closed) {
        popup.close();
      }
      reject(new Error('Proxy timeout'));
    }, 30000); // 30초로 연장
  });
};

export const useNaverLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const hasHandledCallbackRef = useRef(false);

  const initializeNaverLogin = () => {
    if (typeof window !== 'undefined' && window.naver) {
      const naverLogin = new window.naver.LoginWithNaverId({
        clientId: "_E0OZLvkgp61fV7MFtND",
        callbackUrl: window.location.origin + "/auth/naver/callback",
        isPopup: false,
        callbackHandle: true,
        scope: 'email,name,nickname,profile_image'
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
      if (!naverLogin) {
        throw new Error('네이버 로그인 SDK를 불러올 수 없습니다.');
      }

      // 직접 네이버 로그인 페이지로 이동
      naverLogin.authorize();

    } catch (err) {
      console.error('네이버 로그인 오류:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 네이버 로그인 콜백 처리
  const handleNaverCallback = async () => {
    if (hasHandledCallbackRef.current) {
      return;
    }
    hasHandledCallbackRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 네이버 콜백 처리 시작');
      
      // URL에서 직접 액세스 토큰 추출 (SDK 2.0.0 방식)
      const urlParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = urlParams.get('access_token');
      const state = urlParams.get('state');
      const error_code = urlParams.get('error');
      const error_description = urlParams.get('error_description');
      
      console.log('🔑 콜백 URL 파라미터:', { 
        accessToken: accessToken ? '존재' : '없음',
        state,
        error_code,
        error_description
      });
      
      // 에러 체크
      if (error_code) {
        throw new Error(`네이버 로그인 오류: ${error_description || error_code}`);
      }
      
      if (!accessToken) {
        // URL 파라미터에서도 토큰을 찾을 수 없는 경우
        const queryParams = new URLSearchParams(window.location.search);
        const queryAccessToken = queryParams.get('access_token');
        const code = queryParams.get('code');
        const queryState = queryParams.get('state');
        
        console.log('🔍 Query 파라미터 확인:', {
          queryAccessToken: queryAccessToken ? '존재' : '없음',
          code: code ? '존재' : '없음'
        });
        
        if (queryAccessToken) {
          // Query 파라미터에서 토큰 발견 → Functions 호출
          console.log('🌉 Using Firebase Hosting proxy (query token)');
          const result = await callNaverLoginViaProxy({ accessToken: queryAccessToken });
          
          if (result.data && result.data.registrationRequired) {
            navigate('/register', { state: { naverUserData: result.data.naverUserData } });
            return;
          }
          
          if (!result.data?.success) {
            throw new Error(result.data?.message || '네이버 로그인 처리 중 오류가 발생했습니다.');
          }

          const { customToken } = result.data;
          await signInWithCustomToken(auth, customToken);
          console.log('✅ Firebase Auth 로그인 성공');
          
          window.location.href = '/dashboard';
          return;
        }

        // Authorization Code 플로우: code만 있는 경우 Functions로 교환 위임
        if (code) {
          console.log('🌉 Using Firebase Hosting proxy (code)');
          const result = await callNaverLoginViaProxy({ code, state: queryState || state });

          if (result.data && result.data.registrationRequired) {
            navigate('/register', { state: { naverUserData: result.data.naverUserData } });
            return;
          }

          if (!result.data?.success) {
            throw new Error(result.data?.message || '네이버 로그인 처리 중 오류가 발생했습니다.');
          }

          const { customToken } = result.data;
          await signInWithCustomToken(auth, customToken);
          console.log('✅Firebase Auth 로그인 성공');
          window.location.href = '/dashboard';
          return;
        }

        throw new Error('네이버 로그인 응답에서 액세스 토큰을 찾을 수 없습니다. 다시 시도해주세요.');
      }
      
      // URL에서 추출한 액세스 토큰으로 처리
      console.log('🔥 Firebase Function 호출 시작 (토큰 방식)');
      
      // Firebase Hosting 프록시를 통한 호출
      console.log('🌉 Using Firebase Hosting proxy for CORS bypass');
      const result = await callNaverLoginViaProxy({ accessToken });
      
      if (result.data && result.data.registrationRequired) {
        navigate('/register', { state: { naverUserData: result.data.naverUserData } });
        return;
      }
      console.log('🔥 Firebase Function 결과:', result.data);

      if (!result.data?.success) {
        throw new Error(result.data?.message || '네이버 로그인 처리 중 오류가 발생했습니다.');
      }

      const { customToken } = result.data;
      
      // Firebase Auth에 커스텀 토큰으로 로그인
      console.log('🔐 Firebase Auth 로그인 시작');
      await signInWithCustomToken(auth, customToken);
      console.log('✅ Firebase Auth 로그인 성공');
      
      // 로그인 완료 후 대시보드로 리다이렉트
      window.location.href = '/dashboard';

    } catch (err) {
      console.error('❌ 네이버 로그인 콜백 오류:', err, {
        code: err?.code,
        message: err?.message,
        details: err?.details
      });
      setError(err.message);
      // 3초 후 로그인 페이지로 리다이렉트
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    loginWithNaver,
    handleNaverCallback,
    isLoading,
    error,
    initializeNaverLogin
  };
};
