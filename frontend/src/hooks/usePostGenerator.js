import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, functions as firebaseFunctions } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

export const usePostGenerator = () => {
  const { auth } = useAuth();
  
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
    
    // Firebase Functions 특정 에러 코드 처리
    switch (err.code) {
      case 'functions/unauthenticated':
        return '로그인이 필요합니다. 다시 로그인해주세요.';
      case 'functions/permission-denied':
        return '이 작업을 수행할 권한이 없습니다.';
      case 'functions/invalid-argument':
        return err.message || '입력된 정보가 올바르지 않습니다.';
      case 'functions/resource-exhausted':
        return '일일 사용량을 초과했습니다. 내일 다시 시도해주세요.';
      case 'functions/unavailable':
        return '서비스가 일시적으로 이용할 수 없습니다. 잠시 후 다시 시도해주세요.';
      case 'functions/deadline-exceeded':
        return '요청 처리 시간이 초과되었습니다. 다시 시도해주세요.';
      case 'functions/cancelled':
        return '요청이 취소되었습니다.';
      default:
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
    
    // 필수 필드 검증
    if (!formData.prompt?.trim()) {
      errors.push('주제를 입력해주세요.');
    } else if (formData.prompt.trim().length < 10) {
      errors.push('주제는 최소 10자 이상 입력해주세요.');
    } else if (formData.prompt.trim().length > 500) {
      errors.push('주제는 500자 이하로 입력해주세요.');
    }
    
    if (!formData.category?.trim()) {
      errors.push('카테고리를 선택해주세요.');
    }
    
    // 키워드 검증 (선택사항이지만 있다면 검증)
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
    
    // 여러 가능한 응답 형식 지원
    let draftsData = null;
    let metadata = null;
    
    if (responseData.success && responseData.data) {
      draftsData = responseData.data;
      metadata = responseData.metadata;
    } else if (responseData.success && responseData.drafts) {
      draftsData = responseData.drafts;
      metadata = responseData.metadata;
    } else if (responseData.drafts) {
      draftsData = responseData.drafts;
      metadata = responseData.metadata;
    } else {
      console.error('예상과 다른 응답 구조:', responseData);
      throw new Error('서버 응답 형식이 올바르지 않습니다.');
    }
    
    // 초안 데이터 검증
    if (!Array.isArray(draftsData) || draftsData.length === 0) {
      throw new Error('생성된 초안이 없습니다.');
    }
    
    // 각 초안의 필수 필드 검증
    const validatedDrafts = draftsData.map((draft, index) => {
      if (!draft || typeof draft !== 'object') {
        throw new Error(`${index + 1}번째 초안 데이터가 올바르지 않습니다.`);
      }
      
      if (!draft.title || typeof draft.title !== 'string' || !draft.title.trim()) {
        throw new Error(`${index + 1}번째 초안의 제목이 없습니다.`);
      }
      
      if (!draft.content || typeof draft.content !== 'string' || !draft.content.trim()) {
        throw new Error(`${index + 1}번째 초안의 내용이 없습니다.`);
      }
      
      return {
        title: draft.title.trim(),
        content: draft.content.trim(),
        wordCount: draft.wordCount || Math.ceil(draft.content.length / 2), // 대략적인 단어 수
        tags: draft.tags || [],
        category: draft.category || '',
        metadata: draft.metadata || {}
      };
    });
    
    return {
      drafts: validatedDrafts,
      metadata: metadata || {
        generatedAt: new Date().toISOString(),
        model: 'gemini-1.5-flash',
        processingTime: null
      }
    };
  }, []);

  /**
   * 원고 생성 메인 함수
   */
  const generatePosts = useCallback(async (formData) => {
    // 1. 인증 확인
    if (!auth?.user) {
      setError('로그인이 필요합니다.');
      return;
    }

    // 2. 입력 데이터 검증
    const validationErrors = validateFormData(formData);
    if (validationErrors.length > 0) {
      setError(validationErrors[0]); // 첫 번째 에러만 표시
      return;
    }

    // 3. 상태 초기화
    setLoading(true);
    setProgress(0);
    setDrafts([]);
    setGenerationMetadata(null);
    setError('');

    // 4. 진행률 시뮬레이션
    let progressValue = 0;
    const progressInterval = setInterval(() => {
      progressValue += Math.random() * 15;
      if (progressValue > 90) progressValue = 90;
      setProgress(progressValue);
    }, 800);

    try {
      console.log('원고 생성 요청 시작:', formData);
      
      // 5. 요청 데이터 구성
      const requestData = {
        category: formData.category,
        topic: formData.prompt.trim(),
        postLength: formData.postLength || '1000자 내외',
        toneAndStyle: formData.toneAndStyle || '진중하고 신뢰도 높은',
        keywords: formData.keywords?.trim().split(',').map(k => k.trim()).filter(k => k) || [],
        contentType: formData.contentType || '일반 블로그 포스트',
        customRequirements: formData.customRequirements || '',
        subCategory: formData.subCategory || ''
      };

      // 6. Firebase Functions 호출
      const generatePostsFn = httpsCallable(firebaseFunctions, 'generatePostDrafts');
      const response = await generatePostsFn(requestData);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      console.log('원고 생성 성공:', response.data);
      
      // 7. 응답 검증 및 정규화
      const { drafts: validatedDrafts, metadata } = validateAndNormalizeResponse(response.data);
      
      setDrafts(validatedDrafts);
      setGenerationMetadata(metadata);

    } catch (err) {
      // 8. 에러 처리
      clearInterval(progressInterval);
      setProgress(0);
      
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
      
      console.error('원고 생성 실패:', {
        error: err,
        formData,
        timestamp: new Date().toISOString()
      });

    } finally {
      setLoading(false);
    }
  }, [auth, validateFormData, validateAndNormalizeResponse, handleFirebaseError]);

  /**
   * 초안 저장 함수
   */
  const saveDraft = useCallback(async (draft, index, formData) => {
    if (!auth?.user) {
      throw new Error('초안 저장을 위해 로그인이 필요합니다.');
    }

    // 입력 검증
    if (!draft || !draft.title || !draft.content) {
      throw new Error('저장할 초안 데이터가 올바르지 않습니다.');
    }

    try {
      const saveData = {
        title: draft.title.trim(),
        content: draft.content.trim(),
        category: formData?.category || '기타',
        subCategory: formData?.subCategory || '',
        keywords: formData?.keywords?.trim() || '',
        status: 'draft',
        metadata: {
          ...(generationMetadata || {}),
          originalPrompt: formData?.prompt || '',
          draftIndex: index,
          wordCount: draft.wordCount || Math.ceil(draft.content.length / 2),
          generatedAt: generationMetadata?.generatedAt || new Date().toISOString(),
          savedAt: new Date().toISOString()
        },
        tags: draft.tags || [],
        authorId: auth.user.uid,
        authorEmail: auth.user.email || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log('초안 저장 요청:', saveData);
      const docRef = await addDoc(collection(db, "posts"), saveData);
      
      console.log('초안 저장 성공:', docRef.id);
      return docRef.id;
    } catch (err) {
      console.error('초안 저장 실패:', err);
      
      // Firestore 에러 코드별 처리
      if (err.code === 'permission-denied') {
        throw new Error('저장 권한이 없습니다. 관리자에게 문의하세요.');
      } else if (err.code === 'unavailable') {
        throw new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      } else if (err.code === 'resource-exhausted') {
        throw new Error('저장 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        throw new Error(err.message || '초안 저장 중 오류가 발생했습니다.');
      }
    }
  }, [generationMetadata, auth]);

  /**
   * 재생성 함수
   */
  const regenerate = useCallback(() => {
    setDrafts([]);
    setGenerationMetadata(null);
    setError('');
    setProgress(0);
  }, []);

  /**
   * 에러 초기화 함수
   */
  const clearError = useCallback(() => {
    setError('');
  }, []);

  /**
   * 전체 상태 초기화 함수
   */
  const resetAll = useCallback(() => {
    setLoading(false);
    setError('');
    setProgress(0);
    setDrafts([]);
    setGenerationMetadata(null);
  }, []);

  /**
   * Firebase 연결 상태 체크
   */
  const isFirebaseReady = useCallback(() => {
    return !!(db && firebaseFunctions && auth);
  }, [auth]);

  /**
   * 특정 초안 수정 함수
   */
  const updateDraft = useCallback((index, updatedDraft) => {
    setDrafts(prevDrafts => 
      prevDrafts.map((draft, i) => 
        i === index ? { ...draft, ...updatedDraft } : draft
      )
    );
  }, []);

  /**
   * 초안 삭제 함수
   */
  const removeDraft = useCallback((index) => {
    setDrafts(prevDrafts => prevDrafts.filter((_, i) => i !== index));
  }, []);

  return {
    // 기본 상태
    loading,
    error,
    progress,
    drafts,
    generationMetadata,
    
    // 메인 액션
    generatePosts,
    saveDraft,
    regenerate,
    
    // 상태 관리
    setError,
    clearError,
    resetAll,
    updateDraft,
    removeDraft,
    
    // 상태 체크 헬퍼
    hasResults: drafts.length > 0,
    isGenerating: loading && progress < 100,
    isFirebaseReady: isFirebaseReady(),
    isAuthenticated: !!auth?.user,
    canGenerate: !!auth?.user && !loading,
    
    // 통계 정보
    totalDrafts: drafts.length,
    averageWordCount: drafts.length > 0 
      ? Math.round(drafts.reduce((sum, draft) => sum + (draft.wordCount || 0), 0) / drafts.length)
      : 0
  };
};