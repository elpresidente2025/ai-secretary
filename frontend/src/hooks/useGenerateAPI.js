// frontend/src/hooks/useGenerateAPI.js - 완전 개선된 버전
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

  // 🤖 generateSinglePost 함수 호출 - 완전 개선된 버전
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

      // 🔧 강화된 응답 구조 확인 및 방어 로직
      if (!result.data) {
        throw new Error('AI 응답 데이터가 없습니다.');
      }

      let singlePost = null;

      // 🔧 다양한 응답 구조에 대응
      if (result.data.singlePost) {
        // 정상적인 구조: result.data.singlePost
        singlePost = result.data.singlePost;
        console.log('✅ 정상 구조 감지: result.data.singlePost');
      } else if (result.data.title && result.data.content) {
        // 대안 구조 1: result.data 직접 (긴급 수정 시)
        singlePost = result.data;
        console.log('✅ 대안 구조 감지: result.data 직접 사용');
      } else if (result.data.data && result.data.data.title) {
        // 대안 구조 2: result.data.data (중첩 구조)
        singlePost = result.data.data;
        console.log('✅ 중첩 구조 감지: result.data.data 사용');
      } else if (result.data.content && typeof result.data.content === 'string') {
        // 대안 구조 3: content만 있는 경우
        singlePost = {
          title: `${formData.category || '일반'} 원고`,
          content: result.data.content,
          category: formData.category || '일반',
          wordCount: Math.ceil(result.data.content.replace(/<[^>]*>/g, '').length / 2),
          timestamp: new Date().toISOString()
        };
        console.log('✅ 컨텐츠만 감지: 제목 자동 생성');
      } else {
        // 최후의 수단: 기본 구조 생성
        console.warn('⚠️ 예상치 못한 응답 구조, 기본값 생성');
        console.warn('응답 구조:', Object.keys(result.data));
        singlePost = {
          title: `${formData.category || '일반'} 원고`,
          content: '<p>원고 생성 중 문제가 발생했습니다. 다시 시도해주세요.</p>',
          category: formData.category || '일반',
          wordCount: 50,
          timestamp: new Date().toISOString()
        };
      }

      // 🔧 필수 필드 검증 및 기본값 설정
      const newDraft = {
        id: Date.now(),
        title: singlePost.title || `${formData.category || '일반'} 원고`,
        content: singlePost.content || '<p>내용을 불러올 수 없습니다.</p>',
        category: singlePost.category || formData.category || '일반',
        subCategory: singlePost.subCategory || formData.subCategory || '',
        keywords: singlePost.keywords || formData.keywords || '',
        instructions: formData.instructions || '',
        generatedAt: singlePost.timestamp || singlePost.createdAt || new Date().toISOString(),
        wordCount: singlePost.wordCount || Math.ceil((singlePost.content || '').replace(/<[^>]*>/g, '').length / 2)
      };

      // 🔧 최종 검증
      if (!newDraft.title || newDraft.title.length < 2) {
        newDraft.title = `${formData.category || '일반'} 원고 ${attempts + 1}`;
      }
      
      if (!newDraft.content || newDraft.content.length < 10) {
        throw new Error('생성된 원고가 너무 짧습니다.');
      }

      // HTML 태그가 없는 경우 기본 구조 추가
      if (!newDraft.content.includes('<') && newDraft.content.length > 50) {
        newDraft.content = `<h2>${newDraft.title}</h2><p>${newDraft.content}</p>`;
      }

      setDrafts(prev => [newDraft, ...prev]);
      setAttempts(prev => prev + 1);
      
      console.log('✅ 원고 생성 완료:', {
        title: newDraft.title.substring(0, 30),
        contentLength: newDraft.content.length,
        wordCount: newDraft.wordCount
      });
      
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
      } else if (err.message && err.message.includes('AI 생성 결과가 올바르지 않습니다')) {
        errorMessage = 'AI 응답 형식에 문제가 있습니다. 다시 시도해주세요.';
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