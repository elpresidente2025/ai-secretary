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
import { useAuth } from '../context/AuthContext';

// 백엔드 gemini.service.js와 일치하는 카테고리 목록
const CATEGORIES = {
  '일반': ['일상소통', '감사인사', '축하메시지', '격려글', '교육컨텐츠'],
  '의정활동': ['국정감사', '법안발의', '질의응답', '위원회활동', '예산심사', '정책토론'],
  '지역활동': ['현장방문', '주민간담회', '지역현안', '봉사활동', '상권점검', '민원해결'],
  '정책/비전': ['경제정책', '사회복지', '교육정책', '환경정책', '디지털정책', '청년정책'],
  '보도자료': ['성명서', '논평', '제안서', '건의문', '발표문', '입장문']
};

const CATEGORY_DESCRIPTIONS = {
  '일반': '일상적인 소통과 인사를 위한 친근한 글',
  '의정활동': '국회 내 공식 활동을 전문적으로 전달하는 글',
  '지역활동': '지역구 주민과의 소통을 위한 따뜻한 글',
  '정책/비전': '정책적 전문성과 비전을 보여주는 깊이 있는 글',
  '보도자료': '언론 배포를 위한 간결하고 명확한 공식 문서'
};

/**
 * @description AI 포스트 생성을 위한 프롬프트 입력 폼 컴포넌트 (사용자 정보 디버깅 포함)
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

  // 🔥 사용자 정보 디버깅: 지역 정보 구성
  const regionInfo = auth?.user ? 
    `${auth.user.regionMetro || ''} ${auth.user.regionLocal || ''}`.trim() : '';
  const districtInfo = auth?.user?.electoralDistrict || '';
  const expectedGreeting = regionInfo ? `${regionInfo} 주민 여러분 안녕하세요` : '';

  return (
    <Box component="form" onSubmit={handleFormSubmit} noValidate>
      <Stack spacing={3}>
        {/* 🔥 사용자 맥락 정보 표시 (지역 정보 디버깅) */}
        {auth?.user && (
          <Paper sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
            <Typography variant="h6" gutterBottom>
              📍 작성자 정보 (AI가 참조하는 정보)
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2">
                <strong>이름:</strong> {auth.user.name}
              </Typography>
              <Typography variant="body2">
                <strong>직책:</strong> {auth.user.position}
              </Typography>
              <Typography variant="body2">
                <strong>광역시/도:</strong> {auth.user.regionMetro || '미설정'}
              </Typography>
              <Typography variant="body2">
                <strong>기초자치단체:</strong> {auth.user.regionLocal || '미설정'}
              </Typography>
              <Typography variant="body2">
                <strong>선거구:</strong> {auth.user.electoralDistrict || '미설정'}
              </Typography>
              <Divider sx={{ my: 1, bgcolor: 'info.contrastText', opacity: 0.3 }} />
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                <strong>🎯 예상 시작 문구:</strong> "{expectedGreeting}"
              </Typography>
              {!regionInfo && (
                <Typography variant="caption" color="warning.main" sx={{ mt: 1 }}>
                  ⚠️ 지역 정보가 없어 "서울 시민 여러분" 등 엉뚱한 인사가 나올 수 있습니다. 
                  프로필에서 지역 정보를 설정해주세요.
                </Typography>
              )}
            </Box>
          </Paper>
        )}

        {/* 카테고리 선택 */}
        <FormControl fullWidth variant="outlined" disabled={isLoading}>
          <InputLabel id="category-select-label">원고 카테고리 *</InputLabel>
          <Select
            labelId="category-select-label"
            id="category"
            name="category"
            value={category}
            label="원고 카테고리 *"
            onChange={handleCategoryChange}
          >
            {Object.keys(CATEGORIES).map((categoryKey) => (
              <MenuItem key={categoryKey} value={categoryKey}>
                {categoryKey}
              </MenuItem>
            ))}
          </Select>
          {category && CATEGORY_DESCRIPTIONS[category] && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, ml: 1 }}>
              {CATEGORY_DESCRIPTIONS[category]}
            </Typography>
          )}
        </FormControl>

        {/* 세부 카테고리 선택 (선택사항) */}
        {category && CATEGORIES[category] && setSubCategory && (
          <FormControl fullWidth variant="outlined" disabled={isLoading}>
            <InputLabel id="subcategory-select-label">세부 카테고리 (선택사항)</InputLabel>
            <Select
              labelId="subcategory-select-label"
              id="subCategory"
              name="subCategory"
              value={subCategory}
              label="세부 카테고리 (선택사항)"
              onChange={(e) => setSubCategory(e.target.value)}
            >
              <MenuItem value="">선택하지 않음</MenuItem>
              {CATEGORIES[category].map((subCat) => (
                <MenuItem key={subCat} value={subCat}>
                  {subCat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* 주제 입력 */}
        <TextField
          fullWidth
          required
          id="prompt"
          label="포스트 주제 또는 핵심 내용"
          variant="outlined"
          multiline
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isLoading}
          error={!!promptError}
          helperText={promptError || `${prompt.length}/500자`}
          placeholder={`예시 (${category}): ${getExamplePrompt(category, regionInfo)}`}
          sx={{
            '& .MuiOutlinedInput-root': {
              minHeight: '120px',
              alignItems: 'flex-start',
            },
          }}
        />

        {/* 키워드 입력 */}
        <TextField
          fullWidth
          id="keywords"
          label="키워드 (선택사항, 쉼표로 구분)"
          variant="outlined"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          disabled={isLoading}
          error={!!keywordsError}
          helperText={keywordsError || `${keywords.length}/200자 | 예: 청년정책, 지역경제, 교통개선`}
          placeholder="관련 키워드를 쉼표로 구분하여 입력하세요"
        />

        {/* 키워드 미리보기 */}
        {keywords.trim() && (
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              입력된 키워드:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {keywords.split(',').filter(k => k.trim()).slice(0, 10).map((keyword, index) => (
                <Chip 
                  key={index} 
                  label={keyword.trim()} 
                  size="small" 
                  variant="outlined"
                  color="primary"
                />
              ))}
              {keywords.split(',').filter(k => k.trim()).length > 10 && (
                <Chip label="..." size="small" variant="outlined" />
              )}
            </Box>
          </Box>
        )}

        {/* 생성 버튼 */}
        <Button 
          type="submit" 
          variant="contained" 
          size="large" 
          disabled={isLoading || hasErrors || !prompt.trim()}
          sx={{ 
            height: '56px', 
            fontWeight: 'bold',
            position: 'relative'
          }}
        >
          {isLoading ? (
            <>
              <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
              생성 중...
            </>
          ) : (
            buttonText
          )}
        </Button>

        {/* 에러 메시지 */}
        {hasErrors && (
          <Box sx={{ mt: 1 }}>
            {promptError && (
              <Typography variant="caption" color="error" display="block">
                • {promptError}
              </Typography>
            )}
            {keywordsError && (
              <Typography variant="caption" color="error" display="block">
                • {keywordsError}
              </Typography>
            )}
          </Box>
        )}
      </Stack>
    </Box>
  );
};

// 🔥 지역 정보를 반영한 카테고리별 예시 프롬프트 생성
const getExamplePrompt = (category, regionInfo = '') => {
  const region = regionInfo || '우리 지역';
  
  const examples = {
    '일반': `${region} 주민들께 새해 인사드리며, 올해 중점 추진 계획을 공유하고 싶습니다`,
    '의정활동': `국정감사에서 제기한 공공기관 예산 낭비 문제와 ${region} 개선 방안`,
    '지역활동': `${region} 상권 활성화를 위한 주민 간담회 결과 및 후속 조치 계획`,
    '정책/비전': `${region} 청년 주거 문제 해결을 위한 정책 제안과 장기적 비전`,
    '보도자료': `${region} 교통 인프라 개선 예산 확보 관련 국토부 협의 결과`
  };
  return examples[category] || examples['일반'];
};

// 유효성 검사 헬퍼 함수들 export
export const validatePromptForm = (prompt, keywords, category) => {
  const errors = {};
  
  if (!prompt.trim()) {
    errors.prompt = '주제를 입력해주세요.';
  } else if (prompt.length < 5) {
    errors.prompt = '주제는 최소 5자 이상 입력해주세요.';
  } else if (prompt.length > 500) {
    errors.prompt = '주제는 500자를 초과할 수 없습니다.';
  }
  
  if (keywords && keywords.length > 200) {
    errors.keywords = '키워드는 200자를 초과할 수 없습니다.';
  }
  
  if (!category || !Object.keys(CATEGORIES).includes(category)) {
    errors.category = '유효한 카테고리를 선택해주세요.';
  }
  
  return {
    errors,
    hasErrors: Object.keys(errors).length > 0
  };
};

// 카테고리 목록 export
export { CATEGORIES, CATEGORY_DESCRIPTIONS };

export default PromptForm;