import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, functions as firebaseFunctions } from '../config/firebase';
import { useAuth } from './useAuth';

export const usePostGenerator = () => {
  const { auth } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [drafts, setDrafts] = useState([]);
  const [generationMetadata, setGenerationMetadata] = useState(null);

  // 🔥 요청 제한을 위한 상태 관리
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const MIN_REQUEST_INTERVAL = 30000; // 30초
  const MAX_REQUESTS_PER_HOUR = 15;

  /**
   * 🔥 개선된 Firebase Functions 에러 처리
   */
  const handleFirebaseError = useCallback((err) => {
    console.error('Firebase 에러 상세:', err);
    
    // 🔥 할당량 관련 오류 처리 개선
    if (err.message.includes('429') || 
        err.message.includes('quota') ||
        err.message.includes('QUOTA_EXCEEDED') ||
        err.code === 'functions/resource-exhausted') {
      return {
        type: 'quota_exceeded',
        title: 'AI 서비스 사용량 초과',
        message: 'Gemini API 할당량을 초과했습니다.\n\n해결방법:\n1. 5-10분 후 다시 시도\n2. Google Cloud Console에서 유료 플랜 활성화\n3. 잠시 기다린 후 재시도',
        action: 'retry_later',
        retryDelay: 300000, // 5분
        canRetry: true
      };
    }
    
    if (err.message.includes('overloaded') || 
        err.message.includes('503') ||
        err.code === 'functions/unavailable') {
      return {
        type: 'service_overloaded', 
        title: 'AI 서비스 과부하',
        message: 'AI 서비스가 일시적으로 과부하 상태입니다.\n1-2분 후 다시 시도해주세요.',
        action: 'retry_later',
        retryDelay: 60000, // 1분
        canRetry: true
      };
    }
    
    if (err.message.includes('SAFETY') || 
        err.message.includes('안전') ||
        err.code === 'functions/invalid-argument') {
      return {
        type: 'safety_violation',
        title: 'AI 안전 정책 위반', 
        message: '입력하신 내용이 AI 안전 정책에 위배됩니다.\n다른 주제나 표현으로 다시 시도해주세요.',
        action: 'change_content',
        canRetry: false
      };
    }

    // 기본 Firebase 에러 코드 처리
    switch (err.code) {
      case 'functions/unauthenticated':
        return {
          type: 'auth_error',
          title: '인증 오류',
          message: '로그인이 필요합니다. 다시 로그인해주세요.',
          action: 'login',
          canRetry: false
        };
      case 'functions/permission-denied':
        return {
          type: 'permission_error',
          title: '권한 오류',
          message: '이 작업을 수행할 권한이 없습니다.',
          action: 'contact_admin',
          canRetry: false
        };
      case 'functions/deadline-exceeded':
        return {
          type: 'timeout_error',
          title: '요청 시간 초과',
          message: '요청 처리 시간이 초과되었습니다. 다시 시도해주세요.',
          action: 'retry',
          canRetry: true
        };
      case 'functions/cancelled':
        return {
          type: 'cancelled',
          title: '요청 취소',
          message: '요청이 취소되었습니다.',
          action: 'retry',
          canRetry: true
        };
      default:
        return {
          type: 'unknown',
          title: '원고 생성 실패',
          message: err.message || '알 수 없는 오류가 발생했습니다.',
          action: 'retry',
          canRetry: true
        };
    }
  }, []);

  /**
   * 🔥 요청 제한 체크 함수
   */
  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    // 30초 간격 제한
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = Math.ceil((MIN_REQUEST_INTERVAL - timeSinceLastRequest) / 1000);
      throw new Error(`너무 빈번한 요청입니다. ${waitTime}초 후 다시 시도해주세요.`);
    }
    
    // 시간당 요청 제한 (간단한 구현)
    const oneHourAgo = now - (60 * 60 * 1000);
    if (lastRequestTime > oneHourAgo && requestCount >= MAX_REQUESTS_PER_HOUR) {
      throw new Error('시간당 요청 제한에 도달했습니다. 1시간 후 다시 시도해주세요.');
    }
    
    return true;
  }, [lastRequestTime, requestCount]);

  /**
   * 🔥 UI용 제한 상태 정보
   */
  const getRateLimitInfo = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    const canRequest = timeSinceLastRequest >= MIN_REQUEST_INTERVAL;
    const waitTime = canRequest ? 0 : Math.ceil((MIN_REQUEST_INTERVAL - timeSinceLastRequest) / 1000);
    
    return {
      canRequest,
      waitTime,
      requestsRemaining: Math.max(0, MAX_REQUESTS_PER_HOUR - requestCount)
    };
  }, [lastRequestTime, requestCount]);

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
    console.log('🔍 validateAndNormalizeResponse 시작:', responseData);

    if (!responseData) {
      throw new Error('서버에서 응답을 받지 못했습니다.');
    }

    if (responseData.success === false) {
      throw new Error(responseData.message || '원고 생성에 실패했습니다.');
    }
    
    // drafts 필드를 먼저 확인
    let draftsArray = null;
    
    if (responseData.drafts && Array.isArray(responseData.drafts)) {
      console.log('✅ drafts 필드 발견');
      draftsArray = responseData.drafts;
    } else if (responseData.posts && Array.isArray(responseData.posts)) {
      console.log('✅ posts 필드 발견');
      draftsArray = responseData.posts;
    } else if (responseData.results && Array.isArray(responseData.results)) {
      console.log('✅ results 필드 발견');
      draftsArray = responseData.results;
    } else if (Array.isArray(responseData)) {
      console.log('✅ 응답 자체가 배열');
      draftsArray = responseData;
    }

    if (!draftsArray || draftsArray.length === 0) {
      throw new Error('생성된 원고가 없습니다.');
    }

    console.log(`📋 원고 ${draftsArray.length}개 발견`);

    const normalized = draftsArray.map((draft, index) => {
      console.log(`📝 Draft ${index + 1} 정규화:`, draft);
      
      return {
        id: draft.id || `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: draft.title || draft.subject || draft.heading || `원고 ${index + 1}`,
        content: draft.content || draft.body || draft.text || '<p>내용이 생성되지 않았습니다.</p>',
        wordCount: draft.wordCount || draft.length || Math.ceil((draft.content || draft.body || draft.text || '').length / 2),
        tags: draft.tags || draft.keywords || [],
        category: draft.category || '일반',
        subCategory: draft.subCategory || '',
        style: draft.style || '일반',
        metadata: draft.metadata || {},
        generatedAt: new Date()
      };
    });

    console.log('✅ 정규화 완료:', normalized);
    return normalized;
  }, []);

  /**
   * 🔥 자동 재시도 로직이 포함된 생성 함수
   */
  const generateWithRetry = useCallback(async (formData, maxRetries = 2) => {
    let lastError = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 재시도 ${attempt}/${maxRetries}`);
          setError(prev => ({
            ...prev,
            message: `재시도 중... (${attempt}/${maxRetries})`
          }));
          
          // 재시도 전 대기 (지수 백오프)
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Firebase Functions 호출
        const generatePostsFn = httpsCallable(firebaseFunctions, 'generatePosts');
        
        const requestPayload = {
          prompt: formData.prompt.trim(),
          category: formData.category,
          subCategory: formData.subCategory || '',
          keywords: formData.keywords || '',
          userId: auth.user.id,
          userName: auth.user.name || '작성자'
        };

        console.log(`📡 Firebase Functions 호출 (시도 ${attempt + 1}):`, requestPayload);
        const result = await generatePostsFn(requestPayload);
        
        return result;
        
      } catch (error) {
        lastError = error;
        
        // 재시도 불가능한 오류들
        if (error.message.includes('SAFETY') || 
            error.message.includes('unauthenticated') ||
            error.message.includes('invalid-argument') ||
            error.message.includes('permission-denied')) {
          throw error;
        }
        
        // 마지막 시도였다면 에러 throw
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.log(`⚠️ 시도 ${attempt + 1} 실패, 재시도 예정:`, error.message);
      }
    }
    
    throw lastError;
  }, [auth]);

  /**
   * 🔥 메인 원고 생성 함수 - 개선된 에러 처리와 재시도 로직
   */
  const generatePosts = useCallback(async (formData, authData) => {
    try {
      // 요청 제한 체크
      checkRateLimit();
      
      setLoading(true);
      setError('');
      setProgress(0);

      console.log('=== usePostGenerator 원고 생성 요청 ===');
      console.log('1. 입력 formData:', JSON.stringify(formData, null, 2));
      console.log('2. authData:', JSON.stringify(authData, null, 2));
      console.log('3. 현재 drafts 개수:', drafts.length);
      
      if (!authData?.user?.id) {
        throw new Error('사용자 정보가 없습니다.');
      }

      // 입력 데이터 검증
      const validationErrors = validateFormData(formData);
      if (validationErrors.length > 0) {
        console.error('❌ 검증 실패:', validationErrors);
        throw new Error(validationErrors[0]);
      }

      setProgress(25);

      // 요청 시간 기록
      const requestTime = Date.now();
      setLastRequestTime(requestTime);
      setRequestCount(prev => prev + 1);
      
      // 1시간 후 카운터 리셋
      setTimeout(() => {
        setRequestCount(prev => Math.max(0, prev - 1));
      }, 60 * 60 * 1000);

      setProgress(50);

      console.log('5. 재시도 로직이 포함된 생성 시작...');
      const result = await generateWithRetry(formData);
      console.log('6. Firebase Functions 응답:', result.data);

      setProgress(75);

      console.log('7. 응답 데이터 정규화 시작...');
      const normalizedDrafts = validateAndNormalizeResponse(result.data);
      console.log('8. 정규화된 drafts:', normalizedDrafts);
      
      // 기존 drafts에 새로운 draft 추가 (누적)
      setDrafts(prevDrafts => {
        const newDrafts = [...prevDrafts, ...normalizedDrafts];
        console.log('9. 누적된 drafts:', newDrafts);
        return newDrafts;
      });
      
      setGenerationMetadata(result.data.metadata || {});
      setProgress(100);

      console.log('✅ 원고 생성 완료! (누적)');

    } catch (err) {
      console.error('❌ usePostGenerator 원고 생성 실패:', err);
      
      const errorInfo = handleFirebaseError(err);
      setError(errorInfo);
      
      // 자동 재시도가 가능한 경우 사용자에게 알림
      if (errorInfo.action === 'retry_later') {
        setTimeout(() => {
          setError(prev => ({
            ...prev,
            message: `${prev.message}\n\n자동 재시도 가능한 상태입니다.`
          }));
        }, errorInfo.retryDelay);
      }
      
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }, [validateFormData, generateWithRetry, handleFirebaseError, checkRateLimit, drafts.length]);

  /**
   * 초안 저장 함수
   */
  const saveDraft = useCallback(async (draft, index, formData, metadata) => {
    try {
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

      // Firestore에 직접 저장
      const postData = {
        title: draft.title || `${formData.category || '원고'} - ${new Date().toLocaleDateString()}`,
        content: draft.content || '',
        category: formData.category || '일반',
        subCategory: formData.subCategory || '',
        keywords: formData.keywords || '',
        status: 'draft',
        userId: currentUserId, // Firebase Functions와 일치
        authorName: currentUserName || '작성자',
        wordCount: draft.wordCount || 0,
        tags: draft.tags || [],
        metadata: {
          generatedAt: new Date().toISOString(),
          originalPrompt: formData.prompt,
          aiModel: metadata?.model || 'gemini',
          draftIndex: index,
          processingTime: metadata?.processingTime || 0,
          draftId: draft.id
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('🔥 Firestore 저장 데이터 확인:', {
        ...postData,
        userId: postData.userId,
        contentLength: postData.content.length
      });

      const docRef = await addDoc(collection(db, 'posts'), postData);
      console.log('✅ 초안 저장 성공:', docRef.id);
      
      return {
        success: true,
        postId: docRef.id,
        message: '초안이 성공적으로 저장되었습니다.'
      };

    } catch (err) {
      console.error('❌ 초안 저장 실패:', err);
      throw new Error('초안 저장 중 오류가 발생했습니다: ' + (err.message || '알 수 없는 오류'));
    }
  }, [auth]);

  /**
   * 모든 초안 초기화
   */
  const clearDrafts = useCallback(() => {
    setDrafts([]);
    setGenerationMetadata(null);
    setError('');
    console.log('✅ 모든 초안 초기화 완료');
  }, []);

  /**
   * 특정 초안 삭제
   */
  const removeDraft = useCallback((draftId) => {
    setDrafts(prevDrafts => {
      const filteredDrafts = prevDrafts.filter(draft => draft.id !== draftId);
      console.log(`✅ 초안 삭제 완료: ${draftId}, 남은 개수: ${filteredDrafts.length}`);
      return filteredDrafts;
    });
  }, []);

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
   * 🔥 사용자 포스트 목록 조회
   */
  const getUserPosts = useCallback(async () => {
    try {
      setLoading(true);
      
      const getUserPostsFn = httpsCallable(firebaseFunctions, 'getUserPosts');
      const result = await getUserPostsFn();
      
      console.log('사용자 포스트 조회 성공:', result.data);
      
      return {
        success: true,
        posts: result.data.posts || []
      };
      
    } catch (err) {
      console.error('사용자 포스트 조회 실패:', err);
      throw new Error('포스트 목록을 불러오는데 실패했습니다: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 🔥 특정 포스트 조회
   */
  const getPost = useCallback(async (postId) => {
    try {
      setLoading(true);
      
      const getPostFn = httpsCallable(firebaseFunctions, 'getPost');
      const result = await getPostFn({ postId });
      
      console.log('포스트 조회 성공:', result.data);
      
      return {
        success: true,
        post: result.data.post
      };
      
    } catch (err) {
      console.error('포스트 조회 실패:', err);
      throw new Error('포스트를 불러오는데 실패했습니다: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 🔥 포스트 업데이트
   */
  const updatePost = useCallback(async (postId, updates) => {
    try {
      setLoading(true);
      
      const updatePostFn = httpsCallable(firebaseFunctions, 'updatePost');
      const result = await updatePostFn({ postId, updates });
      
      console.log('포스트 업데이트 성공:', result.data);
      
      return {
        success: true,
        message: result.data.message
      };
      
    } catch (err) {
      console.error('포스트 업데이트 실패:', err);
      throw new Error('포스트 업데이트에 실패했습니다: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 🔥 포스트 삭제
   */
  const deletePost = useCallback(async (postId) => {
    try {
      setLoading(true);
      
      const deletePostFn = httpsCallable(firebaseFunctions, 'deletePost');
      const result = await deletePostFn({ postId });
      
      console.log('포스트 삭제 성공:', result.data);
      
      return {
        success: true,
        message: result.data.message
      };
      
    } catch (err) {
      console.error('포스트 삭제 실패:', err);
      throw new Error('포스트 삭제에 실패했습니다: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setLoading(false);
    }
  }, []);

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
    setRequestCount(0);
    setLastRequestTime(0);
    console.log('✅ 전체 상태 초기화 완료');
  }, []);

  // 디버깅을 위한 현재 사용자 정보 로깅
  console.log('usePostGenerator - 현재 상태:', {
    isAuthenticated: !!auth?.user,
    userId: auth?.user?.id,
    userName: auth?.user?.name,
    draftsCount: drafts.length,
    loading,
    error: !!error,
    rateLimitInfo: getRateLimitInfo()
  });

  return {
    // 상태
    loading,
    error,
    progress,
    drafts,
    generationMetadata,
    
    // 생성 관련
    generatePosts,
    regenerate,
    
    // 초안 관리
    saveDraft,
    clearDrafts,
    removeDraft,
    
    // 포스트 CRUD
    getUserPosts,
    getPost,
    updatePost,
    deletePost,
    
    // 유틸리티
    setError: setErrorMessage,
    resetState,
    getRateLimitInfo,
    
    // 검증 함수 (필요 시 외부에서 사용)
    validateFormData
  };
};