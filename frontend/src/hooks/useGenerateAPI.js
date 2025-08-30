// frontend/src/hooks/useGenerateAPI.js - 완전 수정된 최종 버전

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
    const totalLength = (formData.topic?.length || 0) + (formData.keywords?.length || 0);
    if (totalLength > 2) {
      import('firebase/functions');
      import('../services/firebase');
    }
  }, []);

  // 🆕 메타데이터 축적 및 분석 함수 (임시 비활성화)
  const collectMetadata = useCallback(async (draft) => {
    try {
      console.log('📊 메타데이터 수집 시작 (비활성화):', draft.title);
      
      // 메타데이터 함수가 백엔드에 없으므로 임시 비활성화
      // const collectMetadata = httpsCallable(functions, 'collectMetadata');
      return null; // 바로 반환
      
      /* 임시 비활성화
      const metadataPackage = {
        // 원고 기본 정보
        contentData: {
          title: draft.title,
          content: draft.content,
          wordCount: draft.wordCount,
          category: draft.category,
          subCategory: draft.subCategory,
          keywords: draft.keywords
        },
        
        // AI 생성 메타데이터
        aiMetadata: draft.meta || {},
        
        // 사용자 선택 행동 데이터
        userBehavior: {
          generatedAt: draft.generatedAt,
          selectedStyle: draft.style,
          selectedType: draft.type,
          isFirstChoice: attempts === 1 // 첫 시도에서 선택했는지
        },
        
        // 성과 추적용
        performanceMetrics: {
          generationAttempt: attempts,
          totalVariations: 3, // 기본 3개 생성
          selectedVariationIndex: 0 // 첫 번째 선택
        }
      };
      
      const result = await collectMetadata(metadataPackage);
      
      if (result.data?.success) {
        console.log('✅ 메타데이터 수집 완료:', result.data.insights);
        return result.data.insights; // 학습된 인사이트 반환
      }
      */
      
    } catch (error) {
      console.warn('⚠️ 메타데이터 수집 실패 (기능에는 영향 없음):', error.message);
    }
    
    return null;
  }, [attempts]);

  // HTML 태그 제거 유틸리티 함수
  const stripHtmlTags = useCallback((html) => {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, '')  // HTML 태그 제거
      .replace(/&nbsp;/g, ' ')  // &nbsp; → 공백
      .replace(/&amp;/g, '&')   // &amp; → &
      .replace(/&lt;/g, '<')    // &lt; → <
      .replace(/&gt;/g, '>')    // &gt; → >
      .replace(/&quot;/g, '"')  // &quot; → "
      .trim();
  }, []);

  // HTML 렌더링용 정리 함수
  const sanitizeHtml = useCallback((html) => {
    if (!html) return '';
    // 기본적인 HTML 태그만 허용 (보안상 필요시 라이브러리 사용 권장)
    return html
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // 스크립트 제거
      .replace(/<style[^>]*>.*?<\/style>/gi, '')   // 스타일 제거
      .replace(/on\w+="[^"]*"/gi, '');             // 이벤트 핸들러 제거
  }, []);

  // 원고 생성 함수
  const generate = useCallback(async (formData, useBonus = false) => {
    if (attempts >= maxAttempts) {
      return { success: false, error: '재생성 한도에 도달했습니다.' };
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔥 generatePosts 호출 시작');
      const generatePosts = httpsCallable(functions, 'generatePosts');
      
      const requestData = {
        ...formData,
        prompt: formData.topic || formData.prompt,
        generateSingle: true,
        useBonus: useBonus,
        // 🆕 editorial.js 규칙 적용 요청 (백엔드에서 처리)
        applyEditorialRules: true
      };
      
      delete requestData.topic;
      
      console.log('📝 요청 데이터:', requestData);
      
      const result = await generatePosts(requestData);
      console.log('✅ generatePosts 응답 수신:', result);

      const responseData = result?.data;
      console.log('🔍 백엔드 응답 전체 구조:', responseData);
      
      const drafts = responseData?.drafts;

      if (!drafts) {
        console.error('⚠️ 유효하지 않은 응답 구조:', result.data);
        console.error('⚠️ responseData:', responseData);
        throw new Error('AI 응답에서 유효한 원고 데이터를 찾을 수 없습니다.');
      }
      
      console.log('👍 원고 데이터 추출 성공:', drafts);

      // 🔥 핵심 수정: drafts 데이터 직접 사용
      const selectedVariation = drafts;
      
      const newDraft = {
        id: Date.now(),
        title: selectedVariation.title,
        content: selectedVariation.content,
        
        // 🆕 HTML/텍스트 분리 처리
        htmlContent: sanitizeHtml(selectedVariation.content), // HTML 렌더링용
        plainText: stripHtmlTags(selectedVariation.content),  // 텍스트 편집용
        
        category: selectedVariation.meta?.category || formData.category || '일반',
        subCategory: selectedVariation.meta?.subCategory || formData.subCategory || '',
        keywords: formData.keywords || '',
        generatedAt: new Date().toISOString(),
        wordCount: selectedVariation.wordCount || stripHtmlTags(selectedVariation.content).length,
        
        // 메타데이터 보존
        style: selectedVariation.style,
        type: selectedVariation.type,
        meta: selectedVariation.meta,
        
        // 🆕 추가 메타정보
        aiGeneratedVariations: 1, // 총 생성된 개수
        selectedVariationIndex: 0, // 선택된 인덱스
        seoOptimized: selectedVariation.wordCount >= 1500 // SEO 최적화 여부
      };

      setDrafts(prev => [...prev, newDraft]);
      setAttempts(prev => prev + 1);
      
      // 🆕 메타데이터 수집 (비동기, 에러 무시)
      collectMetadata(newDraft).catch(console.warn);
      
      console.log('✅ 원고 생성 완료:', { 
        title: newDraft.title, 
        wordCount: newDraft.wordCount,
        seoOptimized: newDraft.seoOptimized 
      });
      
      const message = useBonus 
        ? `보너스 원고가 성공적으로 생성되었습니다! (${newDraft.wordCount}자)` 
        : `AI 원고가 성공적으로 생성되었습니다! (${newDraft.wordCount}자)`;

      return { 
        success: true, 
        message: message
      };

    } catch (err) {
      console.error('❌ generatePosts 호출 실패:', err);
      
      let errorMessage = '원고 생성 중 오류가 발생했습니다.';
      if (err.code === 'functions/resource-exhausted') {
        errorMessage = 'AI 사용량을 초과했습니다. 잠시 후 다시 시도해주세요.';
      } else if (err.code === 'functions/unavailable') {
        errorMessage = 'AI 서비스가 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.';
      } else if (err.code === 'functions/deadline-exceeded') {
        errorMessage = 'AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
      } else if (err.code === 'functions/invalid-argument') {
        errorMessage = err.message || '입력된 정보를 확인해주세요.';
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
      
    } finally {
      setLoading(false);
    }
  }, [attempts, collectMetadata, stripHtmlTags, sanitizeHtml]);

  // 초안 저장 함수
  const save = useCallback(async (draft) => {
    try {
      console.log('💾 savePost 호출 시작:', draft.title);
      const savePost = httpsCallable(functions, 'savePost');
      
      const result = await savePost({
        title: draft.title,
        content: draft.content,
        htmlContent: draft.htmlContent,
        plainText: draft.plainText,
        category: draft.category,
        subCategory: draft.subCategory,
        keywords: draft.keywords,
        wordCount: draft.wordCount,
        style: draft.style,
        type: draft.type,
        meta: draft.meta
      });
      
      console.log('✅ savePost 응답 수신:', result);
      
      if (result.data?.success) {
        // 🆕 저장 시에도 메타데이터 수집
        collectMetadata({
          ...draft,
          savedAt: new Date().toISOString()
        }).catch(console.warn);
        
        return { 
          success: true, 
          message: result.data.message || '원고가 성공적으로 저장되었습니다.' 
        };
      } else {
        throw new Error(result.data?.error || '저장에 실패했습니다.');
      }
      
    } catch (err) {
      console.error('❌ savePost 호출 실패:', err);
      
      let errorMessage = '원고 저장 중 오류가 발생했습니다.';
      if (err.code === 'functions/permission-denied') {
        errorMessage = '저장 권한이 없습니다. 로그인을 확인해주세요.';
      } else if (err.code === 'functions/invalid-argument') {
        errorMessage = '저장할 수 없는 데이터입니다. 내용을 확인해주세요.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      return { success: false, error: errorMessage };
    }
  }, [collectMetadata]);

  // 상태 초기화 함수
  const reset = useCallback(() => {
    setDrafts([]);
    setAttempts(0);
    setError(null);
  }, []);

  return {
    loading,
    error,
    drafts,
    setDrafts,
    attempts,
    maxAttempts,
    generate,
    save,
    reset,
    preloadFirebase,
    // 🆕 추가 유틸리티 함수들
    stripHtmlTags,
    sanitizeHtml
  };
};