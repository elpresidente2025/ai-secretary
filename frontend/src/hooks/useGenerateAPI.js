// frontend/src/hooks/useGenerateAPI.js
import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';

export function useGenerateAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [attempts, setAttempts] = useState(0);
  
  const maxAttempts = 3;

  // 🔥 Firebase 예열 (사용자 입력 감지시)
  const preloadFirebase = useCallback((formData) => {
    const titleLength = formData.prompt?.length || 0;
    const keywordsLength = formData.keywords?.length || 0;
    const instructionsLength = formData.instructions?.length || 0;
    
    if (titleLength + keywordsLength + instructionsLength > 2) {
      import('firebase/functions');
      import('../services/firebase');
    }
  }, []);

  // 🤖 generateSinglePost 함수 호출 (functions/index.js에 존재)
  const generate = useCallback(async (formData) => {
    if (attempts >= maxAttempts) {
      return { success: false, error: '재생성 한도에 도달했습니다.' };
    }

    setLoading(true);
    setError(null);

    try {
      // ✅ 올바른 함수명: generateSinglePost
      console.log('🔥 generateSinglePost 호출 시작');
      const generateSinglePost = httpsCallable(functions, 'generateSinglePost');
      
      const requestData = {
        prompt: formData.prompt,
        category: formData.category,
        subCategory: formData.subCategory,
        keywords: formData.keywords,
        userName: '정치인',
        generateSingle: true // 필수 플래그
      };
      
      console.log('📝 요청 데이터:', requestData);
      
      const result = await generateSinglePost(requestData);
      
      console.log('✅ generateSinglePost 응답:', result.data);

      // 응답 구조 확인
      if (!result.data || !result.data.singlePost) {
        throw new Error('AI 생성 결과가 올바르지 않습니다.');
      }

      const singlePost = result.data.singlePost;
      
      const newDraft = {
        id: Date.now(),
        title: singlePost.title || `${formData.category} - ${formData.subCategory || '일반'}`,
        content: singlePost.content, // ✅ 실제 Gemini 생성 원고
        category: singlePost.category || formData.category,
        subCategory: singlePost.subCategory || formData.subCategory,
        keywords: singlePost.keywords || formData.keywords,
        instructions: formData.instructions,
        generatedAt: singlePost.timestamp || new Date().toISOString(),
        wordCount: singlePost.wordCount || 0
      };

      setDrafts(prev => [newDraft, ...prev]);
      setAttempts(prev => prev + 1);
      
      return { 
        success: true, 
        message: `AI가 생성한 원고 ${attempts + 1}번이 완성되었습니다!` 
      };

    } catch (err) {
      console.error('❌ generateSinglePost 호출 실패:', err);
      console.error('에러 코드:', err.code);
      console.error('에러 메시지:', err.message);
      
      let errorMessage = '원고 생성 중 오류가 발생했습니다.';
      
      // Firebase Functions 에러 코드별 처리
      if (err.code === 'functions/unauthenticated') {
        errorMessage = '로그인이 필요합니다. 다시 로그인해주세요.';
      } else if (err.code === 'functions/resource-exhausted') {
        errorMessage = 'AI API 사용량이 초과되었습니다. 5-10분 후 다시 시도해주세요.';
      } else if (err.code === 'functions/unavailable') {
        errorMessage = 'AI 서비스가 현재 과부하 상태입니다. 1-2분 후 다시 시도해주세요.';
      } else if (err.code === 'functions/deadline-exceeded') {
        errorMessage = 'AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
      } else if (err.code === 'functions/internal') {
        errorMessage = 'AI 서버 내부 오류입니다. 잠시 후 다시 시도해주세요.';
      } else if (err.code === 'functions/invalid-argument') {
        errorMessage = '입력 데이터에 문제가 있습니다. 폼을 다시 확인해주세요.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      setLoading(false);
    }
  }, [attempts, maxAttempts]);

  const reset = useCallback(() => {
    setDrafts([]);
    setAttempts(0);
    setError(null);
  }, []);

  const save = useCallback(async (draft) => {
    try {
      console.log('💾 === 저장 프로세스 시작 ===');
      console.log('💾 저장할 초안:', {
        title: draft.title,
        contentLength: draft.content?.length,
        category: draft.category
      });
      
      const savePost = httpsCallable(functions, 'savePost');
      
      const requestData = {
        post: {
          title: draft.title,
          content: draft.content,
          category: draft.category,
          status: 'saved'
        },
        metadata: {
          wordCount: draft.wordCount,
          generatedAt: draft.generatedAt
        }
      };
      
      console.log('💾 요청 데이터:', requestData);
      
      const result = await savePost(requestData);
      
      console.log('💾 === Firebase Functions 응답 ===');
      console.log('💾 전체 result:', result);
      console.log('💾 result.data:', result.data);
      console.log('💾 result.data.success:', result.data?.success);
      console.log('💾 result.data.message:', result.data?.message);
      console.log('💾 === 응답 분석 완료 ===');

      // 안전한 응답 처리
      const responseData = result.data || {};
      const isSuccess = responseData.success === true;
      const message = responseData.message || '';
      
      console.log('💾 처리된 결과:', { isSuccess, message });

      if (isSuccess) {
        const finalMessage = message || '원고가 성공적으로 저장되었습니다.';
        console.log('💾 성공 메시지:', finalMessage);
        
        return { 
          success: true, 
          message: finalMessage 
        };
      } else {
        const errorMsg = responseData.error || '저장에 실패했습니다.';
        console.log('💾 실패 메시지:', errorMsg);
        
        return { 
          success: false, 
          error: errorMsg 
        };
      }
      
    } catch (err) {
      console.error('💾 === 저장 에러 ===');
      console.error('💾 에러 객체:', err);
      console.error('💾 에러 코드:', err.code);
      console.error('💾 에러 메시지:', err.message);
      console.error('💾 === 에러 분석 완료 ===');
      
      return { 
        success: false, 
        error: err.message || '저장 중 알 수 없는 오류가 발생했습니다.' 
      };
    }
  }, []);

  const canGenerate = attempts < maxAttempts && !loading;

  return {
    loading,
    error,
    drafts,
    attempts,
    maxAttempts,
    generate,
    reset,
    save,
    canGenerate,
    preloadFirebase
  };
}