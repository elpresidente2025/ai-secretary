// frontend/src/components/generate/PromptForm.jsx (최종 수정본)

import React, { useMemo } from 'react';
import {
  Paper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import { AutoAwesome } from '@mui/icons-material';
// ✅ 1. formConstants에서 카테고리 데이터를 직접 불러와서 자급자족합니다.
import { CATEGORIES } from '../../constants/formConstants';

export default function PromptForm({
  formData,
  // ✅ 2. 부모가 사용하는 `onChange` prop을 정상적으로 받습니다.
  onChange,
  disabled = false,
  isMobile = false
}) {
  const handleInputChange = (field) => (event) => {
    const { value } = event.target;
    
    // ✅ 3. 부모로부터 받은 `onChange` 함수를 올바른 방식으로 호출합니다.
    if (field === 'category') {
      // 카테고리가 바뀌면, 세부 카테고리 값을 초기화하라는 신호를 함께 보냅니다.
      onChange({ category: value, subCategory: '' });
    } else {
      // 그 외의 경우는 해당 필드만 업데이트하라는 신호를 보냅니다.
      onChange({ [field]: value });
    }
  };

  // 선택된 카테고리에 맞는 세부 카테고리 목록을 안전하게 찾습니다.
  const subCategories = useMemo(() => {
    const selectedCategory = CATEGORIES.find(cat => cat.value === formData.category);
    // subCategories가 배열이 아니거나 없으면, 안전하게 빈 배열을 반환하여 오류를 방지합니다.
    return Array.isArray(selectedCategory?.subCategories) ? selectedCategory.subCategories : [];
  }, [formData.category]);

  const formSize = isMobile ? "small" : "medium";

  return (
    <Paper sx={{ p: isMobile ? 2 : 3, mb: isMobile ? 2 : 3 }}>
      <Typography
        variant={isMobile ? "h6" : "h5"}
        sx={{ mb: 2, display: 'flex', alignItems: 'center' }}
      >
        <AutoAwesome sx={{ mr: 1, color: 'primary.main' }} />
        {isMobile ? "원고 생성" : "AI 원고 생성"}
      </Typography>

      <Grid container spacing={isMobile ? 2 : 3}>
        {/* 카테고리 */}
        <Grid item xs={isMobile ? 6 : 12} md={6}>
          <FormControl fullWidth size={formSize}>
            <InputLabel>카테고리</InputLabel>
            <Select
              value={formData.category || ''}
              label="카테고리"
              onChange={handleInputChange('category')}
              disabled={disabled}
            >
              {/* ✅ 4. 직접 불러온 CATEGORIES 배열을 사용해 정상적인 메뉴를 보여줍니다. */}
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* 세부 카테고리 */}
        <Grid item xs={isMobile ? 6 : 12} md={6}>
          <FormControl fullWidth size={formSize} disabled={disabled || subCategories.length === 0}>
            <InputLabel>세부 카테고리</InputLabel>
            <Select
              value={formData.subCategory || ''}
              label="세부 카테고리"
              onChange={handleInputChange('subCategory')}
            >
              {subCategories.length === 0 ? (
                <MenuItem value="" disabled>
                  선택사항 없음
                </MenuItem>
              ) : (
                subCategories.map((sub) => (
                  <MenuItem key={sub.value} value={sub.value}>
                    {sub.label}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Grid>

        {/* ✅ 5. 주제 입력칸을 `topic`에 연결하여 버튼 활성화 문제를 해결합니다. */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            size={formSize}
            label="주제"
            placeholder="어떤 내용의 원고를 작성하고 싶으신가요?"
            value={formData.topic || ''}
            onChange={handleInputChange('topic')}
            disabled={disabled}
            multiline
            rows={2}
            inputProps={{ maxLength: 500 }}
            helperText={`${formData.topic?.length || 0}/500자`}
          />
        </Grid>
        
        {/* ✅ 6. 누락되었던 세부지시사항 입력칸을 다시 추가합니다. */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            size={formSize}
            label="세부지시사항 (선택사항)"
            placeholder="AI에게 추가로 전달하고 싶은 구체적인 지시사항을 입력하세요"
            value={formData.instructions || ''}
            onChange={handleInputChange('instructions')}
            disabled={disabled}
            multiline
            rows={3}
            inputProps={{ maxLength: 1000 }}
            helperText={`예: 젊은 층 대상으로 친근하게, 통계 자료 포함 등 (${formData.instructions?.length || 0}/1000자)`}
          />
        </Grid>

        {/* 키워드 */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            size={formSize}
            label="키워드 (선택사항)"
            placeholder="쉼표(,)로 구분하여 입력하세요"
            value={formData.keywords || ''}
            onChange={handleInputChange('keywords')}
            disabled={disabled}
            helperText="예: 민생안정, 경제활성화, 부동산문제"
          />
        </Grid>
      </Grid>
    </Paper>
  );
}