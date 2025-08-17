// frontend/src/hooks/useGenerateForm.js
import { useState, useCallback } from 'react';

export function useGenerateForm() {
  const [formData, setFormData] = useState({
    prompt: '',
    instructions: '',
    keywords: '',
    category: '일반',
    subCategory: ''
  });

  const updateForm = useCallback((newData) => {
    setFormData(prev => ({ ...prev, ...newData }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      prompt: '',
      instructions: '',
      keywords: '',
      category: '일반',
      subCategory: ''
    });
  }, []);

  const validateForm = useCallback(() => {
    const trimmedPrompt = formData.prompt?.trim() || '';
    
    if (!trimmedPrompt) {
      return { 
        isValid: false, 
        error: '주제를 입력해주세요.' 
      };
    }
    
    if (trimmedPrompt.length < 5) {
      return { 
        isValid: false, 
        error: '주제는 최소 5자 이상 입력해주세요.' 
      };
    }
    
    if (trimmedPrompt.length > 500) {
      return { 
        isValid: false, 
        error: '주제는 500자를 초과할 수 없습니다.' 
      };
    }
    
    if (formData.keywords && formData.keywords.length > 200) {
      return { 
        isValid: false, 
        error: '키워드는 200자를 초과할 수 없습니다.' 
      };
    }

    if (formData.instructions && formData.instructions.length > 1000) {
      return { 
        isValid: false, 
        error: '세부지시사항은 1000자를 초과할 수 없습니다.' 
      };
    }
    
    return { isValid: true };
  }, [formData]);

  const canGenerate = useCallback(() => {
    return Boolean(formData.prompt?.trim());
  }, [formData.prompt]);

  return {
    formData,
    updateForm,
    resetForm,
    validateForm,
    canGenerate: canGenerate()
  };
}