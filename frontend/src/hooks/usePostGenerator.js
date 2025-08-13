// frontend/src/hooks/usePostGenerator.js
import { useState, useCallback, useMemo } from 'react';
import { httpsCallable } from 'firebase/functions';
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { functions as firebaseFunctions, db as firestore } from '../services/firebase';
import { useAuth } from './useAuth';

// 요청 제한 상수
const MIN_REQUEST_INTERVAL = 3000; // 3초
const MAX_REQUESTS_PER_HOUR = 15;

export const usePostGenerator = () => {
  const { auth } = useAuth();

  // 핵심 상태
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [drafts, setDrafts] = useState([]); // 최대 3개까지만 저장
  const [generationMetadata, setGenerationMetadata] = useState(null);
  
  // 요청 제한 상태
  const [requestCount, setRequestCount] = useState(0);
  const [lastRequestTime, setLastRequestTime] = useState(0);

  /**
   * 요청 제한 체크
   */
  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = Math.ceil((MIN_REQUEST_INTERVAL - timeSinceLastRequest) / 1000);
      throw new Error(`너무 빠른 요청입니다. ${waitTime}초 후 다시 시도해주세요.`);
    }
    
    if (requestCount >= MAX_REQUESTS_PER_HOUR) {
      throw new Error('시간당 요청 제한을 초과했습니다. 나중에 다시 시도해주세요.');
    }
  }, [requestCount, lastRequestTime]);

  /**
   * 입력 데이터 검증
   */
  const validateFormData = useCallback((formData) => {
    const errors = [];
    
    if (!formData.prompt || !formData.prompt.trim()) {
      errors.push('주제를 입력해주세요.');
    }
    
    if (formData.prompt && formData.prompt.trim().length < 5) {
      errors.push('주제는 최소 5자 이상 입력해주세요.');
    }
    
    if (formData.prompt && formData.prompt.trim().length > 500) {
      errors.push('주제는 500자 이하로 입력해주세요.');
    }
    
    if (formData.keywords && formData.keywords.trim().length > 200) {
      errors.push('키워드는 200자 이하로 입력해주세요.');
    }
    
    return errors;
  }, []);

  /**
   * 응답 데이터 검증 및 정규화 (단일 원고용)
   */
  const validateAndNormalizeResponse = useCallback((responseData) => {
    console.log('🔍 응답 검증 시작:', responseData);

    if (!responseData) {
      throw new Error('서버에서 응답을 받지 못했습니다.');
    }

    if (responseData.success === false) {
      throw new Error(responseData.message || '원고 생성에 실패했습니다.');
    }
    
    // 단일 원고 데이터 추출
    let singlePost = null;
    
    if (responseData.post) {
      singlePost = responseData.post;
    } else if (responseData.draft) {
      singlePost = responseData.draft;
    } else if (responseData.content) {
      singlePost = responseData;
    } else {
      throw new Error('생성된 원고를 찾을 수 없습니다.');
    }

    console.log('📝 단일 원고 정규화:', singlePost);
    
    // 정규화된 단일 원고 반환
    const normalized = {
      id: singlePost.id || `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: singlePost.title || singlePost.subject || singlePost.heading || '생성된 원고',
      content: singlePost.content || singlePost.body || singlePost.text || '<p>내용이 생성되지 않았습니다.</p>',
      wordCount: singlePost.wordCount || singlePost.length || Math.ceil((singlePost.content || singlePost.body || singlePost.text || '').length / 2),
      tags: singlePost.tags || singlePost.keywords || [],
      category: singlePost.category || '일반',
      subCategory: singlePost.subCategory || '',
      style: singlePost.style || '일반',
      metadata: singlePost.metadata || {},
      generatedAt: new Date()
    };

    console.log('✅ 정규화 완료:', normalized);
    return normalized;
  }, []);

  /**
   * 재시도 로직이 포함된 단일 원고 생성 함수
   */
  const generateWithRetry = useCallback(async (formData, maxRetries = 2) => {
    let lastError = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 재시도 ${attempt}/${maxRetries}`);
          setError(`재시도 중... (${attempt}/${maxRetries})`);
          
          // 재시도 전 대기 (지수 백오프)
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Firebase Functions 호출 - 단일 원고 생성
        const generatePostFn = httpsCallable(firebaseFunctions, 'generateSinglePost');
        
        const requestPayload = {
          prompt: formData.prompt.trim(),
          category: formData.category,
          subCategory: formData.subCategory || '',
          keywords: formData.keywords || '',
          generateSingle: true, // 단일 생성 플래그
          userId: auth.user.id,
          userName: auth.user.name || '작성자'
        };

        console.log(`📡 단일 원고 생성 요청 (시도 ${attempt + 1}):`, requestPayload);
        const result = await generatePostFn(requestPayload);
        
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
  }, [auth, setError]);

  /**
   * 🔥 메인 단일 원고 생성 함수 (핵심 요구사항에 맞게 수정)
   */
  const generateSinglePost = useCallback(async (formData, authData) => {
    try {
      // 최대 3개 제한 체크
      if (drafts.length >= 3) {
        throw new Error('최대 3개까지만 생성할 수 있습니다.');
      }

      // 요청 제한 체크
      checkRateLimit();
      
      setLoading(true);
      setError('');
      setProgress(0);

      console.log('=== 단일 원고 생성 요청 ===');
      console.log('1. 입력 formData:', JSON.stringify(formData, null, 2));
      console.log('2. 현재 drafts 개수:', drafts.length);
      
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

      console.log('🚀 단일 원고 생성 시작...');
      const result = await generateWithRetry(formData);
      console.log('📨 Firebase Functions 응답:', result.data);

      setProgress(75);

      // 응답 정규화 (단일 원고)
      const normalizedPost = validateAndNormalizeResponse(result.data);
      console.log('📋 정규화된 단일 원고:', normalizedPost);

      // 새 원고를 배열 앞쪽에 추가 (좌측으로 밀어내기 효과)
      setDrafts(prevDrafts => {
        const newDrafts = [normalizedPost, ...prevDrafts];
        console.log(`✅ 새 원고 추가 완료. 총 ${newDrafts.length}개`);
        return newDrafts;
      });

      // 메타데이터 업데이트
      setGenerationMetadata({
        requestTime,
        totalAttempts: drafts.length + 1,
        lastCategory: formData.category,
        lastPrompt: formData.prompt.slice(0, 50) + '...'
      });

      setProgress(100);
      setError('');

      console.log('🎉 단일 원고 생성 완료!');
      return normalizedPost;

    } catch (error) {
      console.error('❌ 단일 원고 생성 실패:', error);
      setError(error.message || '원고 생성에 실패했습니다.');
      throw error;
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, [drafts.length, checkRateLimit, validateFormData, generateWithRetry, validateAndNormalizeResponse]);

  /**
   * 초안 저장
   */
  const saveDraft = useCallback(async (draft, index, formData, metadata) => {
    try {
      console.log('💾 초안 저장 시작:', { draft, index, formData });
      
      if (!draft || !draft.content) {
        throw new Error('저장할 초안 데이터가 유효하지 않습니다.');
      }

      if (!auth?.user?.id) {
        throw new Error('사용자 정보가 없습니다.');
      }

      const docRef = await addDoc(collection(firestore, 'posts'), {
        ...draft,
        originalFormData: formData,
        generationMetadata: metadata,
        confirmed: true,
        userId: auth.user.id,
        userName: auth.user.name || '작성자',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('✅ 초안 저장 성공:', docRef.id);
      return {
        success: true,
        message: '초안이 성공적으로 저장되었습니다.',
        postId: docRef.id
      };

    } catch (error) {
      console.error('❌ 초안 저장 실패:', error);
      throw new Error('초안 저장에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
    }
  }, [auth]);

  /**
   * 모든 초안 초기화
   */
  const clearDrafts = useCallback(() => {
    setDrafts([]);
    setGenerationMetadata(null);
    console.log('✅ 초안 전체 초기화 완료');
  }, []);

  /**
   * 특정 초안 제거
   */
  const removeDraft = useCallback((index) => {
    setDrafts(prevDrafts => {
      const newDrafts = prevDrafts.filter((_, i) => i !== index);
      console.log(`🗑️ 초안 ${index + 1} 제거, 남은 초안: ${newDrafts.length}개`);
      return newDrafts;
    });
  }, []);

  /**
   * 재생성 함수 (기존 generateSinglePost와 동일)
   */
  const regenerate = useCallback(async (formData, authData) => {
    console.log('🔄 재생성 요청 - generateSinglePost 호출');
    return await generateSinglePost(formData, authData);
  }, [generateSinglePost]);

  /**
   * 🔥 사용자 포스트 목록 조회
   */
  const getUserPosts = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!auth?.user?.id) {
        throw new Error('사용자 정보가 없습니다.');
      }

      const q = query(
        collection(firestore, 'posts'),
        where('userId', '==', auth.user.id),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const posts = [];
      
      querySnapshot.forEach((doc) => {
        posts.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log('사용자 포스트 조회 성공:', posts.length, '개');
      
      return {
        success: true,
        posts: posts
      };
      
    } catch (err) {
      console.error('사용자 포스트 조회 실패:', err);
      throw new Error('포스트 목록을 불러오는데 실패했습니다: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setLoading(false);
    }
  }, [auth]);

  /**
   * 🔥 특정 포스트 조회
   */
  const getPost = useCallback(async (postId) => {
    try {
      setLoading(true);
      
      if (!postId) {
        throw new Error('포스트 ID가 필요합니다.');
      }

      const docRef = doc(firestore, 'posts', postId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('포스트를 찾을 수 없습니다.');
      }

      const post = {
        id: docSnap.id,
        ...docSnap.data()
      };

      console.log('포스트 조회 성공:', post.id);
      
      return {
        success: true,
        post: post
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
      
      if (!postId) {
        throw new Error('포스트 ID가 필요합니다.');
      }

      if (!auth?.user?.id) {
        throw new Error('사용자 정보가 없습니다.');
      }

      const docRef = doc(firestore, 'posts', postId);
      
      // 업데이트할 데이터 준비
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      await updateDoc(docRef, updateData);

      console.log('포스트 업데이트 성공:', postId);
      
      return {
        success: true,
        message: '포스트가 성공적으로 업데이트되었습니다.'
      };
      
    } catch (err) {
      console.error('포스트 업데이트 실패:', err);
      throw new Error('포스트 업데이트에 실패했습니다: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setLoading(false);
    }
  }, [auth]);

  /**
   * 🔥 포스트 삭제
   */
  const deletePost = useCallback(async (postId) => {
    try {
      setLoading(true);
      
      if (!postId) {
        throw new Error('포스트 ID가 필요합니다.');
      }

      if (!auth?.user?.id) {
        throw new Error('사용자 정보가 없습니다.');
      }

      const docRef = doc(firestore, 'posts', postId);
      await deleteDoc(docRef);
      
      console.log('포스트 삭제 성공:', postId);
      
      return {
        success: true,
        message: '포스트가 성공적으로 삭제되었습니다.'
      };
      
    } catch (err) {
      console.error('포스트 삭제 실패:', err);
      throw new Error('포스트 삭제에 실패했습니다: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setLoading(false);
    }
  }, [auth]);

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

  /**
   * 요청 제한 정보 조회
   */
  const getRateLimitInfo = useMemo(() => {
    return () => {
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      const canRequest = timeSinceLastRequest >= MIN_REQUEST_INTERVAL && requestCount < MAX_REQUESTS_PER_HOUR && drafts.length < 3;
      const waitTime = canRequest ? 0 : Math.ceil((MIN_REQUEST_INTERVAL - timeSinceLastRequest) / 1000);
      
      return {
        canRequest,
        waitTime,
        requestsRemaining: Math.max(0, MAX_REQUESTS_PER_HOUR - requestCount),
        attemptsRemaining: Math.max(0, 3 - drafts.length)
      };
    };
  }, [lastRequestTime, requestCount, drafts.length]);

  // 개발 환경에서 디버깅 정보
  if (import.meta.env.DEV) {
    console.log('usePostGenerator - 현재 상태:', {
      isAuthenticated: !!auth?.user,
      userId: auth?.user?.id,
      userName: auth?.user?.name,
      draftsCount: drafts.length,
      loading,
      error: !!error,
      canGenerateMore: drafts.length < 3
    });
  }

  return {
    // 상태
    loading,
    error,
    progress,
    drafts,
    generationMetadata,
    
    // 핵심 함수 (이름 변경: generatePosts → generateSinglePost)
    generateSinglePost,
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
    validateFormData
  };
};