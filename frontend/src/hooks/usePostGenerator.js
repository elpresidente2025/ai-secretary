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
  const [drafts, setDrafts] = useState([]); // 🔥 누적으로 관리
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
   * 응답 데이터 검증 및 정규화 - 🔥 drafts 필드 우선 처리 + 고유 ID 추가
   */
  const validateAndNormalizeResponse = useCallback((responseData) => {
    console.log('🔍 validateAndNormalizeResponse 시작:', responseData);

    if (!responseData) {
      throw new Error('서버에서 응답을 받지 못했습니다.');
    }

    // 🔥 success 필드 체크를 더 유연하게
    if (responseData.success === false) {
      throw new Error(responseData.message || '원고 생성에 실패했습니다.');
    }
    
    // 🔥 drafts 필드를 먼저 확인 (수정된 서버에서 drafts 필드 사용)
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
        id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // 🔥 고유 ID 추가
        title: draft.title || draft.subject || draft.heading || `원고 ${index + 1}`,
        content: draft.content || draft.body || draft.text || '<p>내용이 생성되지 않았습니다.</p>',
        wordCount: draft.wordCount || draft.length || Math.ceil((draft.content || draft.body || draft.text || '').length / 2),
        tags: draft.tags || draft.keywords || [],
        category: draft.category || '일반',
        style: draft.style || '일반',
        metadata: draft.metadata || {},
        generatedAt: new Date() // 🔥 생성 시간 추가
      };
    });

    console.log('✅ 정규화 완료:', normalized);
    return normalized;
  }, []);

  /**
   * 원고 생성 함수 - 🔥 누적으로 추가하도록 수정
   */
  const generatePosts = useCallback(async (formData, authData) => {
    try {
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

      // 🔥 Firebase Functions 호출 준비
      const generatePostsFn = httpsCallable(firebaseFunctions, 'generatePosts');
      
      // 🔥 서버로 전송할 데이터 구조 - prompt 필드 사용
      const requestPayload = {
        prompt: formData.prompt.trim(),
        category: formData.category,
        subCategory: formData.subCategory || '',
        keywords: formData.keywords || '',
        // 추가 정보
        userId: authData.user.id,
        userName: authData.user.name || '작성자'
      };

      console.log('4. 서버 전송 payload:', JSON.stringify(requestPayload, null, 2));

      setProgress(50);
      
      console.log('5. Firebase Functions 호출 시작...');
      const result = await generatePostsFn(requestPayload);
      console.log('6. Firebase Functions 응답:', result.data);

      setProgress(75);

      console.log('7. 응답 데이터 정규화 시작...');
      console.log('8. 서버 응답 원본 데이터:', JSON.stringify(result.data, null, 2));
      
      const normalizedDrafts = validateAndNormalizeResponse(result.data);
      console.log('9. 정규화된 drafts:', normalizedDrafts);
      
      // 🔥 기존 drafts에 새로운 draft 추가 (누적)
      setDrafts(prevDrafts => {
        const newDrafts = [...prevDrafts, ...normalizedDrafts];
        console.log('10. 누적된 drafts:', newDrafts);
        return newDrafts;
      });
      
      setGenerationMetadata(result.data.metadata || {});
      setProgress(100);

      console.log('✅ 원고 생성 완료! (누적)');

    } catch (err) {
      console.error('❌ usePostGenerator 원고 생성 실패:', err);
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      console.error('Error code:', err.code);
      console.error('Error details:', err.details);
      
      setError(handleFirebaseError(err));
      // 🔥 drafts는 그대로 유지 (기존 것들 삭제하지 않음)
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }, [validateFormData, validateAndNormalizeResponse, handleFirebaseError, drafts.length]); // 🔥 drafts.length 의존성 추가

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
          processingTime: metadata?.processingTime || 0,
          draftId: draft.id // 🔥 원본 draft ID 저장
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
      
      return {
        success: true,
        postId: docRef.id,
        message: '초안이 성공적으로 저장되었습니다.'
      };

    } catch (err) {
      console.error('❌ 초안 저장 실패:', err);
      throw new Error('초안 저장 중 오류가 발생했습니다: ' + (err.message || '알 수 없는 오류'));
    }
  }, [auth]); // 🔥 auth를 의존성에 추가

  /**
   * 🔥 모든 초안 초기화
   */
  const clearDrafts = useCallback(() => {
    setDrafts([]);
    setGenerationMetadata(null);
    setError('');
    console.log('✅ 모든 초안 초기화 완료');
  }, []);

  /**
   * 🔥 특정 초안 삭제
   */
  const removeDraft = useCallback((draftId) => {
    setDrafts(prevDrafts => {
      const filteredDrafts = prevDrafts.filter(draft => draft.id !== draftId);
      console.log(`✅ 초안 삭제 완료: ${draftId}, 남은 개수: ${filteredDrafts.length}`);
      return filteredDrafts;
    });
  }, []);

  /**
   * 재생성 함수 - 🔥 누적이 아닌 새로운 생성으로 동작
   */
  const regenerate = useCallback((formData, authData) => {
    if (formData && authData) {
      // 기존 generatePosts 호출 (누적으로 추가됨)
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
  const updatePost = useCallback(async (postId, title, content) => {
    try {
      setLoading(true);
      
      const updatePostFn = httpsCallable(firebaseFunctions, 'updatePost');
      const result = await updatePostFn({ postId, title, content });
      
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
   * 에러 설정 함수
   */
  const setErrorMessage = useCallback((message) => {
    setError(message);
  }, []);

  /**
   * 상태 초기화 함수 - 🔥 drafts도 함께 초기화
   */
  const resetState = useCallback(() => {
    setLoading(false);
    setError('');
    setProgress(0);
    setDrafts([]); // 🔥 drafts도 초기화
    setGenerationMetadata(null);
    console.log('✅ 전체 상태 초기화 완료');
  }, []);

  // 🔥 디버깅을 위한 현재 사용자 정보 로깅
  console.log('usePostGenerator - 현재 상태:', {
    isAuthenticated: !!auth?.user,
    userId: auth?.user?.id,
    userName: auth?.user?.name,
    draftsCount: drafts.length,
    loading,
    error: !!error
  });

  return {
    loading,
    error,
    progress,
    drafts, // 🔥 누적된 drafts 배열
    generationMetadata,
    generatePosts, // 🔥 누적으로 추가하는 함수
    saveDraft,
    regenerate,
    clearDrafts, // 🔥 새로 추가
    removeDraft, // 🔥 새로 추가
    getUserPosts, // 🔥 새로 추가
    getPost, // 🔥 새로 추가
    updatePost, // 🔥 새로 추가
    setError: setErrorMessage,
    resetState
  };
};