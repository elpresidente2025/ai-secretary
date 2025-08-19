// frontend/src/hooks/useGenerateAPI.js - 수정된 최종 버전

import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';

export function useGenerateAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [attempts, setAttempts] = useState(0);
  
  const maxAttempts = 3;

  // Firebase 예열 함수 (최적화를 위해 유지)
  const preloadFirebase = useCallback((formData) => {
    const totalLength = (formData.prompt?.length || 0) + (formData.keywords?.length || 0);
    if (totalLength > 2) {
      import('firebase/functions');
      import('../services/firebase');
    }
  }, []);

  // 원고 생성 함수
  const generate = useCallback(async (formData) => {
    if (attempts >= maxAttempts) {
      return { success: false, error: '재생성 한도에 도달했습니다.' };
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔥 generateSinglePost 호출 시작');
      const generateSinglePost = httpsCallable(functions, 'generateSinglePost');
      
      const requestData = {
        ...formData,
        generateSingle: true // 백엔드에 단일 생성을 요청하는 필수 플래그
      };
      
      console.log('📝 요청 데이터:', requestData);
      
      const result = await generateSinglePost(requestData);
      
      console.log('✅ generateSinglePost 응답 수신:', result);

      // ✅ 핵심 수정: 백엔드의 중첩된 데이터 구조에서 실제 원고를 정확히 추출합니다.
      const singlePost = result?.data?.data?.singlePost;

      // 원고 데이터가 없는 경우 에러 처리
      if (!singlePost || !singlePost.title || !singlePost.content) {
        console.error('⚠️ 유효하지 않은 응답 구조:', result.data);
        throw new Error('AI 응답에서 유효한 원고 데이터를 찾을 수 없습니다.');
      }
      
      console.log('👍 원고 데이터 추출 성공:', singlePost.title);

      const newDraft = {
        id: Date.now(), // 고유 ID 생성
        title: singlePost.title,
        content: singlePost.content,
        category: singlePost.category || formData.category || '일반',
        subCategory: singlePost.subCategory || formData.subCategory || '',
        keywords: singlePost.keywords || formData.keywords || '',
        generatedAt: singlePost.timestamp || new Date().toISOString(),
        wordCount: singlePost.wordCount || Math.ceil((singlePost.content || '').replace(/<[^>]*>/g, '').length / 2)
      };

      setDrafts(prev => [newDraft, ...prev]);
      setAttempts(prev => prev + 1);
      
      console.log('✅ 원고 생성 완료:', { title: newDraft.title, wordCount: newDraft.wordCount });
      
      return { 
        success: true, 
        message: `AI 원고가 성공적으로 생성되었습니다!` 
      };

    } catch (err) {
      console.error('❌ generateSinglePost 호출 실패:', err);
      
      let errorMessage = '원고 생성 중 오류가 발생했습니다.';
      if (err.code === 'functions/resource-exhausted') {
        errorMessage = 'AI 사용량을 초과했습니다. 잠시 후 다시 시도해주세요.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [attempts, maxAttempts]);

  // 초기화 함수
  const reset = useCallback(() => {
    setDrafts([]);
    setAttempts(0);
    setError(null);
  }, []);

  // 저장 함수
  const save = useCallback(async (draft) => {
    try {
      console.log('💾 저장할 초안:', draft.title);
      const savePost = httpsCallable(functions, 'savePost');
      
      const result = await savePost({
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
      });
      
      const responseData = result.data || {};
      if (responseData.success) {
        return { success: true, message: responseData.message || '원고가 저장되었습니다.' };
      } else {
        return { success: false, error: responseData.error || '저장에 실패했습니다.' };
      }
    } catch (err) {
      console.error('💾 저장 에러:', err);
      return { success: false, error: err.message || '저장 중 알 수 없는 오류가 발생했습니다.' };
    }
  }, []);

  return {
    loading,
    error,
    drafts,
    attempts,
    maxAttempts,
    canGenerate: attempts < maxAttempts && !loading,
    generate,
    reset,
    save,
    preloadFirebase
  };
}
