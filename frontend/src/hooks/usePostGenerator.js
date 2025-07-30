import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, functions as firebaseFunctions } from '../config/firebase';
import { useAuth } from './useAuth';

export const usePostGenerator = () => {
  const { auth } = useAuth(); // 🔥 useAuth 훅 사용
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [drafts, setDrafts] = useState([]);
  const [generationMetadata, setGenerationMetadata] = useState(null);

  /**
   * Firebase Functions 에러를 사용자 친화적 메시지로 변환
   */
  const handleFirebaseError = useCallback((err) => {
    console.error('Firebase 에러 상세:', err);
    
    switch (err.code) {
      case 'functions/resource-exhausted':
        return '현재 AI 서비스 사용량이 많습니다. 5-10분 후 다시 시도해주세요. 💡 잠시 기다렸다가 다시 시도하시면 정상적으로 이용하실 수 있습니다.';
      case 'functions/unauthenticated':
        return '로그인이 필요합니다. 다시 로그인해주세요.';
      case 'functions/permission-denied':
        return '이 작업을 수행할 권한이 없습니다.';
      case 'functions/invalid-argument':
        return err.message || '입력된 정보가 올바르지 않습니다.';
      case 'functions/unavailable':
        return 'AI 서비스에 일시적 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      case 'functions/deadline-exceeded':
        return '요청 처리 시간이 초과되었습니다. 다시 시도해주세요.';
      case 'functions/cancelled':
        return '요청이 취소되었습니다.';
      default:
        // 메시지에서 할당량 관련 키워드 확인
        if (err.message.includes('quota') || err.message.includes('429') || err.message.includes('할당량')) {
          return '현재 AI 서비스 사용량이 많습니다. 5-10분 후 다시 시도해주세요. ⏰';
        }
        return err.message || '알 수 없는 오류가 발생했습니다.';
    }
  }, []);

  /**
   * 입력 데이터 유효성 검증
   */
  const validateFormData = useCallback((formData) => {
    const errors = [];
    
    if (!formData) {
      errors.push('폼 데이터가 없습니다.');
      return errors;
    }
    
    if (!formData.prompt?.trim()) {
      errors.push('주제를 입력해주세요.');
    } else if (formData.prompt.trim().length < 5) {
      errors.push('주제는 최소 5자 이상 입력해주세요.');
    } else if (formData.prompt.trim().length > 500) {
      errors.push('주제는 500자 이하로 입력해주세요.');
    }
    
    if (!formData.category?.trim()) {
      errors.push('카테고리를 선택해주세요.');
    }
    
    if (formData.keywords && formData.keywords.trim().length > 200) {
      errors.push('키워드는 200자 이하로 입력해주세요.');
    }
    
    return errors;
  }, []);

  /**
   * 응답 데이터 검증 및 정규화
   */
  const validateAndNormalizeResponse = useCallback((responseData) => {
    if (!responseData) {
      throw new Error('서버에서 응답을 받지 못했습니다.');
    }

    if (!responseData.success) {
      throw new Error(responseData.message || '원고 생성에 실패했습니다.');
    }

    if (!responseData.drafts || !Array.isArray(responseData.drafts)) {
      throw new Error('유효한 원고가 생성되지 않았습니다.');
    }

    if (responseData.drafts.length === 0) {
      throw new Error('생성된 원고가 없습니다.');
    }

    return responseData.drafts.map((draft, index) => ({
      title: draft.title || `원고 ${index + 1}`,
      content: draft.content || '<p>내용이 생성되지 않았습니다.</p>',
      wordCount: draft.wordCount || Math.ceil((draft.content || '').length / 2),
      tags: draft.tags || [],
      category: draft.category || '일반',
      style: draft.style || '일반',
      metadata: draft.metadata || {}
    }));
  }, []);

  /**
   * 원고 생성 함수
   */
  const generatePosts = useCallback(async (formData, authData) => {
    try {
      setLoading(true);
      setError('');
      setProgress(0);

      console.log('원고 생성 요청:', { formData, userId: authData?.user?.id });
      
      if (!authData?.user?.id) {
        throw new Error('사용자 정보가 없습니다.');
      }

      // 입력 데이터 검증
      const validationErrors = validateFormData(formData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors[0]);
      }

      setProgress(25);

      const generatePostsFn = httpsCallable(firebaseFunctions, 'generatePosts');
      
      setProgress(50);
      
      const result = await generatePostsFn({
        topic: formData.prompt,
        category: formData.category,
        subCategory: formData.subCategory || '',
        keywords: formData.keywords || '',
      });

      setProgress(75);

      console.log('원고 생성 성공:', result.data);
      
      const normalizedDrafts = validateAndNormalizeResponse(result.data);
      
      setDrafts(normalizedDrafts);
      setGenerationMetadata(result.data.metadata);
      setProgress(100);

    } catch (err) {
      console.error('원고 생성 실패:', err);
      setError(handleFirebaseError(err));
      setDrafts([]);
      setGenerationMetadata(null);
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }, [validateFormData, validateAndNormalizeResponse, handleFirebaseError]);

  /**
   * 초안 저장 함수 - 🔥 authorId 문제 해결
   */
  const saveDraft = useCallback(async (draft, index, formData, metadata) => {
    try {
      // 🔥 현재 auth 상태에서 직접 사용자 ID 가져오기
      const currentUserId = auth?.user?.id;
      const currentUserName = auth?.user?.name;
      
      console.log('초안 저장 시작:', { 
        draft, 
        index, 
        formData, 
        metadata,
        currentUserId,
        currentUserName,
        authState: auth
      });

      if (!currentUserId) {
        throw new Error('사용자 정보가 없습니다. 다시 로그인해주세요.');
      }

      if (!draft || !draft.content) {
        throw new Error('저장할 초안 내용이 없습니다.');
      }

      // 🔥 Firestore에 직접 저장 - authorId 확실히 설정
      const postData = {
        title: draft.title || `${formData.category || '원고'} - ${new Date().toLocaleDateString()}`,
        content: draft.content || '',
        category: formData.category || '일반',
        subCategory: formData.subCategory || '',
        keywords: formData.keywords || '',
        status: 'draft',
        authorId: currentUserId, // 🔥 현재 사용자 ID 직접 설정
        authorName: currentUserName || '작성자',
        wordCount: draft.wordCount || 0,
        tags: draft.tags || [],
        metadata: {
          generatedAt: new Date().toISOString(),
          originalPrompt: formData.prompt,
          aiModel: metadata?.model || 'gemini',
          draftIndex: index,
          processingTime: metadata?.processingTime || 0
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('🔥 Firestore 저장 데이터 확인:', {
        ...postData,
        authorId: postData.authorId, // 명시적으로 확인
        contentLength: postData.content.length
      });

      const docRef = await addDoc(collection(db, 'posts'), postData);
      console.log('✅ 초안 저장 성공:', docRef.id);
      
      return docRef.id;

    } catch (err) {
      console.error('❌ 초안 저장 실패:', err);
      throw new Error('초안 저장 중 오류가 발생했습니다.');
    }
  }, [auth]); // 🔥 auth를 의존성에 추가

  /**
   * 재생성 함수
   */
  const regenerate = useCallback((formData, authData) => {
    if (formData && authData) {
      generatePosts(formData, authData);
    } else {
      setError('재생성하려면 폼 데이터가 필요합니다.');
    }
  }, [generatePosts]);

  /**
   * 에러 설정 함수
   */
  const setErrorMessage = useCallback((message) => {
    setError(message);
  }, []);

  /**
   * 상태 초기화 함수
   */
  const resetState = useCallback(() => {
    setLoading(false);
    setError('');
    setProgress(0);
    setDrafts([]);
    setGenerationMetadata(null);
  }, []);

  // 🔥 디버깅을 위한 현재 사용자 정보 로깅
  console.log('usePostGenerator - 현재 auth 상태:', {
    isAuthenticated: !!auth?.user,
    userId: auth?.user?.id,
    userName: auth?.user?.name
  });

  return {
    loading,
    error,
    progress,
    drafts,
    generationMetadata,
    generatePosts,
    saveDraft,
    regenerate,
    setError: setErrorMessage,
    resetState
  };
};