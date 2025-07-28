import { useState, useCallback } from 'react';
// Firebase SDK imports for backend communication
import { httpsCallable } from 'firebase/functions';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, functions as firebaseFunctions } from '../config/firebase'; // 🔥 경로 수정
import { useAuth } from '../context/AuthContext';

export const usePostGenerator = () => {
  const { auth } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [drafts, setDrafts] = useState([]);
  const [generationMetadata, setGenerationMetadata] = useState(null);

  const generatePosts = useCallback(async (formData) => {
    if (!auth?.user) {
      setError('로그인이 필요합니다.');
      return;
    }

    // 🔥 수정: 초기화 및 상태 설정
    setLoading(true);
    setProgress(0);
    setDrafts([]);
    setGenerationMetadata(null);
    setError('');

    // 🔥 수정: 진행률 시뮬레이션 추가
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 500);

    try {
      console.log('원고 생성 요청 시작:', formData);
      
      const requestData = {
        prompt: formData.prompt.trim(),
        keywords: formData.keywords.trim(),
        category: formData.category, // 🔥 추가: 누락된 카테고리
        subCategory: formData.subCategory,
        userId: auth.user.uid // 🔥 추가: 사용자 ID 전달
      };

      const generatePostsFn = httpsCallable(firebaseFunctions, 'generatePosts');
      const response = await generatePostsFn(requestData);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      console.log('원고 생성 성공:', response.data);
      
      // 🔥 수정: 응답 데이터 처리
      if (response.data.success && response.data.data) {
        setDrafts(response.data.data);
        setGenerationMetadata(response.data.metadata);
      } else if (response.data.drafts) {
        // 백업: drafts 필드 지원
        setDrafts(response.data.drafts);
        setGenerationMetadata(response.data.metadata);
      } else {
        console.error('예상과 다른 응답:', response.data);
        throw new Error('응답 데이터 형식이 올바르지 않습니다.');
      }

    } catch (err) {
      // 🔥 수정: 에러 처리 완성
      clearInterval(progressInterval);
      console.error('원고 생성 실패:', err);
      
      let errorMessage = '원고 생성 중 오류가 발생했습니다.';
      
      // Firebase Functions 에러 코드 처리
      if (err.code === 'unauthenticated') {
        errorMessage = '인증이 만료되었습니다. 다시 로그인해주세요.';
      } else if (err.code === 'resource-exhausted') {
        errorMessage = '요청 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.';
      } else if (err.code === 'invalid-argument') {
        errorMessage = err.message || '입력 데이터가 올바르지 않습니다.';
      } else if (err.code === 'permission-denied') {
        errorMessage = '권한이 없습니다. 관리자에게 문의하세요.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setProgress(0);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const saveDraft = useCallback(async (draft, index, formData) => {
    if (!auth?.user) {
      throw new Error('초안 저장을 위해 로그인이 필요합니다.');
    }

    try {
      const saveData = {
        title: draft.title,
        content: draft.content, // 🔥 추가: 누락된 content 필드
        category: formData.category, // 🔥 추가: 누락된 카테고리
        subCategory: formData.subCategory,
        keywords: formData.keywords,
        status: 'draft',
        metadata: {
          ...(generationMetadata || {}),
          originalPrompt: formData.prompt,
          draftIndex: index,
          wordCount: draft.wordCount || 0 // 🔥 추가: 글자 수
        },
        authorId: auth.user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log('초안 저장 요청:', saveData);
      const docRef = await addDoc(collection(db, "posts"), saveData);
      
      console.log('초안 저장 성공:', docRef.id);
      return docRef.id;
    } catch (err) {
      console.error('초안 저장 실패:', err);
      
      // Firebase 에러 코드별 처리
      if (err.code === 'permission-denied') {
        throw new Error('저장 권한이 없습니다.');
      } else if (err.code === 'unavailable') {
        throw new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      } else {
        throw new Error('초안 저장 중 오류가 발생했습니다.');
      }
    }
  }, [generationMetadata, auth]);

  const regenerate = useCallback(() => {
    setDrafts([]);
    setGenerationMetadata(null); // 🔥 추가: 누락된 메타데이터 초기화
    setError('');
    setProgress(0);
  }, []);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  const resetAll = useCallback(() => {
    setLoading(false);
    setError('');
    setProgress(0);
    setDrafts([]);
    setGenerationMetadata(null);
  }, []);

  // 🔥 추가: Firebase 연결 상태 체크 헬퍼
  const isFirebaseReady = useCallback(() => {
    return !!(db && firebaseFunctions && auth);
  }, [auth]);

  return {
    // 상태
    loading,
    error,
    progress,
    drafts,
    generationMetadata,
    
    // 액션
    generatePosts,
    saveDraft,
    regenerate,
    
    // 유틸리티
    setError,
    clearError,
    resetAll,
    
    // 상태 체크 헬퍼
    hasResults: drafts.length > 0,
    isGenerating: loading && progress < 100,
    isFirebaseReady: isFirebaseReady(),
    
    // 🔥 추가: 사용자 상태 체크
    isAuthenticated: !!auth?.user
  };
};