import React from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  CircularProgress, 
  Stack, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Typography,
  Chip,
  Alert,
  Paper,
  Divider
} from '@mui/material';
import { useAuth } from '../hooks/useAuth'; // 🔥 경로 변경
import { CATEGORIES, CATEGORY_DESCRIPTIONS } from '../constants/formConstants'; // 🔥 상수 import

/**
 * @description AI 포스트 생성을 위한 프롬프트 입력 폼 컴포넌트
 */
const PromptForm = ({ 
  category = '일반', 
  setCategory, 
  subCategory = '', 
  setSubCategory,
  prompt = '', 
  setPrompt, 
  keywords = '', 
  setKeywords, 
  onGenerate, 
  isLoading = false, 
  isGenerated = false,
  validation = {}
}) => {
  
  const { auth } = useAuth();
  
  // 카테고리 변경 시 세부 카테고리 초기화
  const handleCategoryChange = (event) => {
    const newCategory = event.target.value;
    setCategory(newCategory);
    if (setSubCategory) {
      setSubCategory(''); // 세부 카테고리 초기화
    }
  };

  // 폼 제출 핸들러
  const handleFormSubmit = (event) => {
    event.preventDefault();
    if (!validation.hasErrors && prompt.trim() && !isLoading) {
      onGenerate();
    }
  };

  // 입력값 실시간 검증
  const getPromptError = () => {
    if (!prompt.trim()) return '주제를 입력해주세요.';
    if (prompt.length < 5) return '주제는 최소 5자 이상 입력해주세요.';
    if (prompt.length > 500) return '주제는 500자를 초과할 수 없습니다.';
    return '';
  };

  const getKeywordsError = () => {
    if (keywords.length > 200) return '키워드는 200자를 초과할 수 없습니다.';
    return '';
  };

  const promptError = getPromptError();
  const keywordsError = getKeywordsError();
  const hasErrors = !!promptError || !!keywordsError;

  const buttonText = isGenerated ? '초안 다시 생성하기' : 'AI 초안 생성하기';

  // 🔥 사용자 정보: 지역 정보 구성 (districtInfo 제거)
  const regionInfo = auth?.user ? 
    `${auth.user.regionMetro || ''} ${auth.user.regionLocal || ''}`.trim() : '';

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        원고 생성 설정
      </Typography>
      
      {/* 🔥 사용자 정보 디버깅 표시 */}
      {auth?.user && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>작성자:</strong> {auth.user.name || '이름 없음'} 
            {auth.user.position && ` (${auth.user.position})`}
            {regionInfo && ` | ${regionInfo}`}
          </Typography>
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleFormSubmit}>
        <Stack spacing={3}>
          {/* 카테고리 선택 */}
          <FormControl fullWidth>
            <InputLabel>카테고리</InputLabel>
            <Select
              value={category}
              onChange={handleCategoryChange}
              label="카테고리"
              disabled={isLoading}
            >
              {Object.keys(CATEGORIES).map((cat) => (
                <MenuItem key={cat} value={cat}>
                  <Box>
                    <Typography>{cat}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {CATEGORY_DESCRIPTIONS[cat]}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 세부 카테고리 선택 */}
          {category && CATEGORIES[category] && (
            <FormControl fullWidth>
              <InputLabel>세부 카테고리</InputLabel>
              <Select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                label="세부 카테고리"
                disabled={isLoading}
              >
                {CATEGORIES[category].map((subCat) => (
                  <MenuItem key={subCat} value={subCat}>
                    {subCat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Divider />

          {/* 주제 입력 */}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="주제 및 내용"
            placeholder="어떤 내용의 원고를 작성하고 싶으신가요? 상세할수록 더 정확한 원고가 생성됩니다."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            error={!!promptError}
            helperText={promptError || `${prompt.length}/500자`}
          />

          {/* 키워드 입력 */}
          <TextField
            fullWidth
            label="키워드 (선택사항)"
            placeholder="원고에 포함되길 원하는 키워드를 쉼표로 구분해서 입력하세요"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            disabled={isLoading}
            error={!!keywordsError}
            helperText={keywordsError || `${keywords.length}/200자`}
          />

          {/* 키워드 표시 */}
          {keywords && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                입력된 키워드:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {keywords.split(',').map((keyword, index) => (
                  keyword.trim() && (
                    <Chip 
                      key={index} 
                      label={keyword.trim()} 
                      size="small" 
                      variant="outlined" 
                    />
                  )
                ))}
              </Box>
            </Box>
          )}

          {/* 생성 버튼 */}
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={hasErrors || !prompt.trim() || isLoading}
            sx={{ py: 1.5 }}
          >
            {isLoading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                AI가 원고를 생성하고 있습니다...
              </>
            ) : (
              buttonText
            )}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
};

export default PromptForm;