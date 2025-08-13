// frontend/src/pages/GeneratePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Grid,
  LinearProgress,
  Alert,
  Chip,
  Card,
  CardContent,
  Container,
  CircularProgress,
  Badge,
  Snackbar
} from '@mui/material';
import {
  AutoAwesome,
  ContentCopy,
  Save,
  Refresh,
  CheckCircle,
  DeleteOutline
} from '@mui/icons-material';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import { usePostGenerator } from '../hooks/usePostGenerator';

// 카테고리 및 세부 카테고리 정의
const CATEGORIES = {
  '의정활동': ['국정감사', '법안발의', '질의응답', '위원회활동', '예산심사', '정책토론'],
  '지역활동': ['현장방문', '주민간담회', '지역현안', '봉사활동', '상권점검', '민원해결'],
  '정책/비전': ['경제정책', '사회복지', '교육정책', '환경정책', '디지털정책', '청년정책'],
  '보도자료': ['성명서', '논평', '제안서', '건의문', '발표문', '입장문'],
  '일반': ['일상소통', '감사인사', '축하메시지', '격려글', '교육컨텐츠']
};

// 카드 배경 컬러 (좌측으로 밀려나는 효과를 위한 색상 구분)
const CARD_COLORS = ['#003a87', '#55207d', '#006261'];

// 네이버 기준 글자수 계산 함수 (공백 제외)
const calculateWordCount = (html) => {
  if (!html) return 0;
  const clean = html.replace(/<[^>]*>/g, '').replace(/\s/g, '');
  return clean.length;
};

const GeneratePage = () => {
  const { auth } = useAuth();

  const {
    loading,
    error,
    progress,
    drafts,                 // 최대 3개의 단일 원고들
    generationMetadata,
    generateSinglePost,     // 수정된 함수명
    saveDraft,
    clearDrafts,
    removeDraft,
    setError,
    getRateLimitInfo
  } = usePostGenerator();

  // 폼 상태
  const [formData, setFormData] = useState({
    prompt: '',
    keywords: '',
    category: '일반',
    subCategory: ''
  });

  // 스낵바 상태
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // 요청 제한 정보
  const rateLimitInfo = getRateLimitInfo ? getRateLimitInfo() : { 
    canRequest: true, 
    waitTime: 0, 
    requestsRemaining: 15,
    attemptsRemaining: 3
  };

  // 현재 시도 횟수 및 최대 횟수
  const maxAttempts = 3;
  const currentAttemptCount = drafts.length;
  const canGenerateMore = currentAttemptCount < maxAttempts && rateLimitInfo.canRequest;

  // 카테고리 변경 시 세부 카테고리 초기화
  useEffect(() => {
    setFormData(prev => ({ ...prev, subCategory: '' }));
  }, [formData.category]);

  // 입력 핸들러
  const handleInputChange = useCallback((field) => (event) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
  }, []);

  // 폼 유효성 검사
  const validateForm = useCallback(() => {
    const trimmedPrompt = formData.prompt?.trim() || '';
    if (!trimmedPrompt) { 
      setError('주제를 입력해주세요.'); 
      return false; 
    }
    if (trimmedPrompt.length < 5) { 
      setError('주제는 최소 5자 이상 입력해주세요.'); 
      return false; 
    }
    if (trimmedPrompt.length > 500) { 
      setError('주제는 500자를 초과할 수 없습니다.'); 
      return false; 
    }
    if (formData.keywords && formData.keywords.length > 200) { 
      setError('키워드는 200자를 초과할 수 없습니다.'); 
      return false; 
    }
    return true;
  }, [formData.prompt, formData.keywords, setError]);

  // 단일 원고 생성 핸들러
  const handleGenerate = useCallback(async () => {
    if (!canGenerateMore) {
      if (currentAttemptCount >= maxAttempts) {
        setError(`최대 ${maxAttempts}개까지만 생성할 수 있습니다.`);
      } else {
        setError(`너무 빈번한 요청입니다. ${rateLimitInfo.waitTime}초 후 다시 시도해주세요.`);
      }
      return;
    }

    if (!validateForm()) return;
    
    if (!auth?.user?.id) { 
      setError('사용자 정보가 없습니다. 다시 로그인해주세요.'); 
      return; 
    }

    try {
      setError('');
      
      const requestData = {
        prompt: formData.prompt.trim(),
        keywords: formData.keywords?.trim() || '',
        category: formData.category,
        subCategory: formData.subCategory || ''
      };

      console.log('🚀 단일 원고 생성 요청:', requestData);
      await generateSinglePost(requestData, auth);
      
      setSnackbar({
        open: true,
        message: `원고 ${currentAttemptCount + 1}이 생성되었습니다! 🎉`,
        severity: 'success'
      });

    } catch (error) {
      console.error('원고 생성 실패:', error);
      // 에러는 usePostGenerator에서 처리됨
    }
  }, [canGenerateMore, currentAttemptCount, maxAttempts, rateLimitInfo.waitTime, validateForm, auth, formData, generateSinglePost, setError]);

  // 초안 저장 핸들러
  const handleSaveDraft = useCallback(async (draft, index) => {
    try {
      if (!auth?.user?.id) { 
        setError('사용자 정보가 없습니다. 다시 로그인해주세요.'); 
        return; 
      }
      
      const result = await saveDraft(draft, index, formData, generationMetadata);
      if (result && result.success) {
        setSnackbar({
          open: true,
          message: '원고가 성공적으로 저장되었습니다! 📝',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('저장 실패:', error);
      setSnackbar({
        open: true,
        message: error.message || '저장에 실패했습니다.',
        severity: 'error'
      });
    }
  }, [auth, formData, generationMetadata, saveDraft, setError]);

  // 원고 복사 핸들러
  const handleCopy = useCallback(async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      setSnackbar({
        open: true,
        message: '클립보드에 복사되었습니다! 📋',
        severity: 'success'
      });
    } catch (error) {
      console.error('복사 실패:', error);
      setSnackbar({
        open: true,
        message: '복사에 실패했습니다.',
        severity: 'error'
      });
    }
  }, []);

  // 새로 시작 핸들러
  const handleReset = useCallback(() => {
    clearDrafts();
    setFormData({
      prompt: '',
      keywords: '',
      category: '일반',
      subCategory: ''
    });
    setError('');
    setSnackbar({
      open: true,
      message: '새로 시작합니다! ✨',
      severity: 'info'
    });
  }, [clearDrafts, setError]);

  // 초안 삭제 핸들러
  const handleRemoveDraft = useCallback((index) => {
    removeDraft(index);
    setSnackbar({
      open: true,
      message: `원고 ${index + 1}이 삭제되었습니다.`,
      severity: 'info'
    });
  }, [removeDraft]);

  // 스낵바 닫기
  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // 사용자 인증 확인
  if (!auth?.user?.id) {
    return (
      <DashboardLayout title="원고 생성">
        <Container maxWidth="xl">
          <Alert severity="error">
            사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.
          </Alert>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="AI 원고 생성">
      <Container maxWidth="xl">
        {/* 상단 폼 영역 */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
              <AutoAwesome sx={{ mr: 1, color: 'primary.main' }} />
              AI 원고 생성 (1회 1개씩)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Badge badgeContent={`${currentAttemptCount}/${maxAttempts}`} color="primary">
                <Typography variant="body2" color="text.secondary">
                  생성된 원고 수
                </Typography>
              </Badge>
              <Typography variant="caption" color="text.secondary">
                남은 시도: {rateLimitInfo.attemptsRemaining}회
              </Typography>
              {drafts.length > 0 && (
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={handleReset} 
                  startIcon={<Refresh />} 
                  color="secondary"
                >
                  새로 시작
                </Button>
              )}
            </Box>
          </Box>

          <Grid container spacing={3}>
            {/* 카테고리 */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={formData.category}
                  onChange={handleInputChange('category')}
                  label="카테고리"
                  disabled={loading}
                >
                  {Object.keys(CATEGORIES).map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* 세부 카테고리 */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>세부 카테고리</InputLabel>
                <Select
                  value={formData.subCategory}
                  onChange={handleInputChange('subCategory')}
                  label="세부 카테고리"
                  disabled={loading || !formData.category}
                >
                  <MenuItem value=""><em>선택하세요</em></MenuItem>
                  {formData.category && CATEGORIES[formData.category]?.map((subCat) => (
                    <MenuItem key={subCat} value={subCat}>{subCat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* 주제 */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="주제 및 내용 *"
                placeholder="어떤 내용의 원고를 작성하고 싶으신가요? 구체적으로 설명해주세요."
                value={formData.prompt}
                onChange={handleInputChange('prompt')}
                disabled={loading}
                helperText={`${formData.prompt.length}/500자 (필수 입력)`}
                error={!formData.prompt.trim() && formData.prompt.length > 0}
              />
            </Grid>

            {/* 키워드 */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="키워드 (선택사항)"
                placeholder="원고에 포함되길 원하는 키워드를 쉼표로 구분해서 입력하세요"
                value={formData.keywords}
                onChange={handleInputChange('keywords')}
                disabled={loading}
                helperText={`${formData.keywords.length}/200자`}
              />
            </Grid>

            {/* 키워드 표시 */}
            {formData.keywords && (
              <Grid item xs={12}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    입력된 키워드:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {formData.keywords.split(',').map((keyword, index) => (
                      keyword.trim() && (
                        <Chip key={index} label={keyword.trim()} size="small" variant="outlined" />
                      )
                    ))}
                  </Box>
                </Box>
              </Grid>
            )}

            {/* 생성 버튼 */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleGenerate}
                  disabled={loading || !formData.prompt.trim() || !canGenerateMore}
                  startIcon={loading ? <CircularProgress size={20} /> : <AutoAwesome />}
                  sx={{ minWidth: 200 }}
                >
                  {loading 
                    ? 'AI가 원고를 생성하고 있습니다...' 
                    : !rateLimitInfo.canRequest
                      ? `대기 중 (${rateLimitInfo.waitTime}초)`
                    : currentAttemptCount === 0 
                      ? '첫 번째 원고 생성하기' 
                      : currentAttemptCount >= maxAttempts
                        ? '최대 3개 생성 완료'
                        : `${currentAttemptCount + 1}번째 원고 생성하기`
                  }
                </Button>
                
                {currentAttemptCount > 0 && currentAttemptCount < maxAttempts && (
                  <Typography variant="body2" color="text.secondary">
                    💡 마음에 드는 원고가 없다면 {maxAttempts - currentAttemptCount}번 더 시도할 수 있습니다!
                  </Typography>
                )}
              </Box>
            </Grid>

            {/* 에러 표시 */}
            {error && (
              <Grid item xs={12}>
                <Alert severity="error">
                  {error}
                </Alert>
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* 진행률 표시 */}
        {loading && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
              AI가 원고를 생성하고 있습니다... {progress}%
            </Typography>
          </Box>
        )}

        {/* 생성된 원고들 표시 (좌측으로 밀려나는 효과) */}
        {drafts.length > 0 && (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
              생성된 원고들 ({drafts.length}/{maxAttempts})
            </Typography>
            
            <Grid container spacing={3}>
              {drafts.map((draft, index) => (
                <Grid item xs={12} md={4} key={draft.id}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      bgcolor: CARD_COLORS[index] || '#666',
                      color: 'white',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4
                      }
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                          원고 #{index + 1}
                        </Typography>
                        <Button
                          size="small"
                          onClick={() => handleRemoveDraft(index)}
                          sx={{ color: 'white', minWidth: 'auto', p: 0.5 }}
                        >
                          <DeleteOutline fontSize="small" />
                        </Button>
                      </Box>

                      <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
                        {draft.title}
                      </Typography>

                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2 }}>
                        카테고리: {draft.category}
                        {draft.subCategory && ` > ${draft.subCategory}`}
                      </Typography>

                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2 }}>
                        글자수: {calculateWordCount(draft.content)}자
                      </Typography>

                      {/* 내용 미리보기 (흰색 배경) */}
                      <Box 
                        sx={{ 
                          bgcolor: 'white', 
                          color: 'black', 
                          p: 2, 
                          borderRadius: 1, 
                          mb: 2,
                          maxHeight: 200,
                          overflow: 'hidden',
                          position: 'relative'
                        }}
                      >
                        <div 
                          dangerouslySetInnerHTML={{ __html: draft.content.slice(0, 300) + '...' }}
                          style={{ fontSize: '14px', lineHeight: '1.4' }}
                        />
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Save />}
                          onClick={() => handleSaveDraft(draft, index)}
                          sx={{ 
                            flexGrow: 1,
                            bgcolor: 'rgba(255,255,255,0.2)',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                          }}
                          disabled={loading}
                        >
                          저장하기
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<ContentCopy />}
                          onClick={() => handleCopy(draft.content)}
                          sx={{
                            color: 'white',
                            borderColor: 'rgba(255,255,255,0.5)',
                            '&:hover': { 
                              borderColor: 'white',
                              bgcolor: 'rgba(255,255,255,0.1)'
                            }
                          }}
                        >
                          복사
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* 최대 생성 완료 안내 */}
            {currentAttemptCount >= maxAttempts && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: 'success.50',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'success.200'
                }}
              >
                <Typography
                  variant="body2"
                  color="success.main"
                  align="center"
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}
                >
                  <CheckCircle fontSize="small" />
                  최대 {maxAttempts}개의 원고 생성이 완료되었습니다! 마음에 드는 원고를 선택해주세요.
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* 안내 메시지 (아직 원고가 없을 때) */}
        {drafts.length === 0 && !loading && (
          <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            <AutoAwesome sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" gutterBottom>
              AI 원고 생성을 시작해보세요
            </Typography>
            <Typography variant="body2">
              상단 폼을 작성하고 "첫 번째 원고 생성하기" 버튼을 클릭하세요.<br />
              <strong>한 번에 1개씩, 최대 3번까지</strong> 다른 버전의 원고를 생성할 수 있습니다.<br />
              새로운 원고가 생성될 때마다 기존 원고들이 좌측으로 밀려납니다.
            </Typography>
          </Paper>
        )}

        {/* 스낵바 */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  );
};

export default GeneratePage;