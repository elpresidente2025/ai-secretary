// frontend/src/components/generate/PromptForm.jsx
import React from 'react';
import {
  Paper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box
} from '@mui/material';
import { AutoAwesome } from '@mui/icons-material';

export default function PromptForm({ 
  formData, 
  onChange, 
  disabled = false, 
  categories = {},
  isMobile = false 
}) {
  const handleInputChange = (field) => (event) => {
    onChange({ ...formData, [field]: event.target.value });
  };

  const formSize = isMobile ? "small" : "medium";

  return (
    <Paper sx={{ p: isMobile ? 2 : 3, mb: isMobile ? 2 : 3 }}>
      <Typography 
        variant={isMobile ? "h6" : "h5"} 
        sx={{ mb: 2, display: 'flex', alignItems: 'center' }}
      >
        <AutoAwesome sx={{ mr: 1, color: 'primary.main' }} />
        {isMobile ? "원고 생성" : "AI 원고 생성 (1회 1개씩)"}
      </Typography>

      <Grid container spacing={isMobile ? 2 : 3}>
        {/* 카테고리 */}
        <Grid item xs={isMobile ? 6 : 12} sm={6} md={3}>
          <FormControl fullWidth size={formSize}>
            <InputLabel>카테고리</InputLabel>
            <Select
              value={formData.category || '일반'}
              onChange={handleInputChange('category')}
              label="카테고리"
              disabled={disabled}
            >
              {Object.keys(categories).map((cat) => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* 세부 카테고리 */}
        <Grid item xs={isMobile ? 6 : 12} sm={6} md={3}>
          <FormControl fullWidth size={formSize}>
            <InputLabel>세부 카테고리</InputLabel>
            <Select
              value={formData.subCategory || ''}
              onChange={handleInputChange('subCategory')}
              label="세부 카테고리"
              disabled={disabled || !formData.category}
            >
              <MenuItem value=""><em>선택하세요</em></MenuItem>
              {formData.category && categories[formData.category]?.map((subCat) => (
                <MenuItem key={subCat} value={subCat}>{subCat}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* 주제 */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size={formSize}
            label="주제"
            placeholder="어떤 내용의 원고를 작성하고 싶으신가요?"
            value={formData.prompt || ''}
            onChange={handleInputChange('prompt')}
            disabled={disabled}
            multiline
            rows={2}
            helperText={`${formData.prompt?.length || 0}/500자`}
          />
        </Grid>

        {/* 세부지시사항 */}
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
            helperText={`예: 젊은 층 대상으로 친근하게, 통계 자료 포함, 구체적인 사례 제시 등 (${formData.instructions?.length || 0}/1000자)`}
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
            helperText={`예: 복지정책, 일자리창출, 지역발전 (${formData.keywords?.length || 0}/200자)`}
          />
        </Grid>
      </Grid>
    </Paper>
  );
}