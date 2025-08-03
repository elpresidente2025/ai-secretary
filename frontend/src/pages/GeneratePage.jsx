import React, { useState, useEffect } from 'react';
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
  Divider,
  Container,
  CircularProgress,
  Badge,
  IconButton,
  Tooltip,
  Snackbar
} from '@mui/material';
import { 
  AutoAwesome, 
  ContentCopy, 
  Save, 
  Refresh,
  Assignment,
  Speed,
  DeleteOutline,
  Add,
  CheckCircle
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
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

// 네이버 기준 글자수 계산 함수 (공백 제외)
const calculateWordCount = (text) => {
  if (!text) return 0;
  // HTML 태그 제거 후 공백 제거하여 글자수 계산
  const cleanText = text.replace(/<[^>]*>/g, '').replace(/\s/g, '');
  return cleanText.length;
};

const GeneratePage = () => {
  const navigate = useNavigate();
  
  // 모든 Hook들을 최상단에서 호출
  const { auth } = useAuth();
  const {
    loading,
    error,
    progress,
    drafts, // 🔥 누적된 drafts 배열
    generationMetadata,
    generatePosts, // 🔥 누적으로 추가하는 함수
    saveDraft,
    clearDrafts, // 🔥 새로 추가된 함수
    removeDraft, // 🔥 새로 추가된 함수
    setError
  } = usePostGenerator();

  // 폼 상태
  const [formData, setFormData] = useState({
    prompt: '',
    keywords: '',
    category: '일반',
    subCategory: ''
  });

  // 🔥 스낵바 상태 추가
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // 🔥 최대 시도 횟수
  const maxAttempts = 3;
  const currentAttemptCount = drafts.length; // 🔥 drafts 배열 길이가 곧 시도 횟수

  // 카테고리 변경 시 세부 카테고리 초기화
  useEffect(() => {
    setFormData(prev => ({ ...prev, subCategory: '' }));
  }, [formData.category]);

  // Hook 호출 이후에 조건부 렌더링
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

  // 입력값 변경 핸들러
  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  // 폼 검증
  const validateForm = () => {
    // 공백만 있는 경우도 체크
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
  };

  // 🔥 원고 생성 요청 - 누적 생성으로 수정
  const handleGenerate = async () => {
    if (currentAttemptCount >= maxAttempts) {
      setError(`최대 ${maxAttempts}개까지만 생성할 수 있습니다.`);
      return;
    }

    // 에러 초기화
    setError('');
    
    // 폼 검증
    if (!validateForm()) {
      return;
    }

    // auth 검증
    if (!auth?.user?.id) {
      setError('사용자 정보가 없습니다. 다시 로그인해주세요.');
      return;
    }

    try {
      // 서버로 전송할 데이터 준비 및 검증
      const requestData = {
        prompt: formData.prompt.trim(),
        keywords: formData.keywords?.trim() || '',
        category: formData.category,
        subCategory: formData.subCategory || ''
      };

      // 디버깅을 위한 로그
      console.log('=== 원고 생성 요청 데이터 ===');
      console.log('requestData:', requestData);
      console.log('currentAttemptCount:', currentAttemptCount);
      console.log('auth:', auth);
      console.log('===========================');

      // 다시 한번 검증
      if (!requestData.prompt) {
        setError('주제가 비어있습니다. 다시 입력해주세요.');
        return;
      }

      // 🔥 누적으로 추가되는 generatePosts 호출
      await generatePosts(requestData, auth);
      
      // 🔥 성공 시 스낵바 표시
      setSnackbar({
        open: true,
        message: `초안 ${currentAttemptCount + 1}이 생성되었습니다!`,
        severity: 'success'
      });
      
    } catch (error) {
      console.error('=== 원고 생성 실패 ===');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('==================');
      
      // 에러 메시지 개선
      let errorMessage = '원고 생성 중 오류가 발생했습니다.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code) {
        errorMessage = `오류 코드: ${error.code}`;
      }
      
      setError(errorMessage);
    }
  };

  // 🔥 초안 저장 - 스낵바 추가
  const handleSaveDraft = async (draft, index) => {
    try {
      if (!auth?.user?.id) {
        setError('사용자 정보가 없습니다. 다시 로그인해주세요.');
        return;
      }
      
      console.log('=== 초안 저장 시작 ===');
      console.log('draft:', draft);
      console.log('index:', index);
      console.log('formData:', formData);
      console.log('generationMetadata:', generationMetadata);
      console.log('auth:', auth);
      console.log('====================');
      
      const result = await saveDraft(draft, index, formData, generationMetadata, auth);
      
      if (result && result.success) {
        console.log('초안 저장 성공, postId:', result.postId);
        setSnackbar({
          open: true,
          message: '초안이 성공적으로 저장되었습니다!',
          severity: 'success'
        });
        // 필요시 페이지 이동
        // navigate(`/post/${result.postId}`);
      } else {
        setError('초안 저장에 실패했습니다.');
      }
    } catch (err) {
      console.error('=== 초안 저장 실패 ===');
      console.error('Error:', err);
      console.error('===================');
      setError('초안 저장 중 오류가 발생했습니다: ' + (err.message || '알 수 없는 오류'));
    }
  };

  // 🔥 초안 삭제
  const handleRemoveDraft = (draftId) => {
    removeDraft(draftId);
    setSnackbar({
      open: true,
      message: '초안이 삭제되었습니다.',
      severity: 'info'
    });
  };

  // 복사하기
  const handleCopy = (content) => {
    try {
      const cleanContent = content.replace(/<[^>]*>/g, '');
      navigator.clipboard.writeText(cleanContent);
      setSnackbar({
        open: true,
        message: '클립보드에 복사되었습니다!',
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
  };

  // 🔥 새로 시작하기 - clearDrafts 사용
  const handleReset = () => {
    setFormData({
      prompt: '',
      keywords: '',
      category: '일반',
      subCategory: ''
    });
    clearDrafts(); // 🔥 모든 drafts 초기화
    setError('');
    setSnackbar({
      open: true,
      message: '모든 데이터가 초기화되었습니다.',
      severity: 'info'
    });
  };

  // 🔥 스낵바 닫기
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <DashboardLayout title="원고 생성">
      <Container maxWidth="xl">
        {/* 상단 폼 영역 */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
              <AutoAwesome sx={{ mr: 1, color: 'primary.main' }} />
              AI 원고 생성
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Badge badgeContent={`${currentAttemptCount}/${maxAttempts}`} color="primary">
                <Typography variant="body2" color="text.secondary">
                  생성된 초안 수
                </Typography>
              </Badge>
              {/* 🔥 새로 시작 버튼 */}
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
            {/* 카테고리 선택 */}
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

            {/* 세부 카테고리 선택 */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>세부 카테고리</InputLabel>
                <Select
                  value={formData.subCategory}
                  onChange={handleInputChange('subCategory')}
                  label="세부 카테고리"
                  disabled={loading || !formData.category}
                >
                  <MenuItem value="">
                    <em>선택하세요</em>
                  </MenuItem>
                  {formData.category && CATEGORIES[formData.category]?.map((subCat) => (
                    <MenuItem key={subCat} value={subCat}>{subCat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* 주제 입력 */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="주제 및 내용 *"
                placeholder="어떤 내용의 원고를 작성하고 싶으신가요? 상세할수록 더 정확한 원고가 생성됩니다."
                value={formData.prompt}
                onChange={handleInputChange('prompt')}
                disabled={loading}
                helperText={`${formData.prompt.length}/500자 (필수 입력)`}
                error={!formData.prompt.trim() && formData.prompt.length > 0}
              />
            </Grid>

            {/* 키워드 입력 */}
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
              </Grid>
            )}

            {/* 🔥 버튼 영역 - 수정됨 */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleGenerate}
                  disabled={loading || !formData.prompt.trim() || currentAttemptCount >= maxAttempts}
                  startIcon={loading ? <CircularProgress size={20} /> : (currentAttemptCount === 0 ? <AutoAwesome /> : <Add />)}
                  sx={{ minWidth: 200 }}
                >
                  {loading 
                    ? 'AI가 원고를 생성하고 있습니다...' 
                    : currentAttemptCount === 0 
                      ? 'AI 초안 생성하기' 
                      : `추가 생성하기 (${currentAttemptCount + 1}/${maxAttempts})`
                  }
                </Button>
              </Box>
            </Grid>

            {/* 에러 메시지 */}
            {error && (
              <Grid item xs={12}>
                <Alert severity="error" onClose={() => setError('')}>
                  {error}
                </Alert>
              </Grid>
            )}

            {/* 진행률 표시 */}
            {loading && (
              <Grid item xs={12}>
                <Box sx={{ width: '100%' }}>
                  <LinearProgress variant="determinate" value={progress} />
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                    {progress}% 완료
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* 🔥 생성된 초안들 - 누적 표시 */}
        {drafts.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <Assignment sx={{ mr: 1, color: 'primary.main' }} />
              생성된 초안들 ({drafts.length}개)
            </Typography>
            
            <Grid container spacing={3}>
              {drafts.map((draft, index) => (
                <Grid item xs={12} md={4} key={draft.id || index}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" color="primary">
                          초안 {index + 1}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Speed sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {calculateWordCount(draft.content)}자
                          </Typography>
                          {/* 🔥 개별 삭제 버튼 */}
                          <Tooltip title="이 초안 삭제">
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveDraft(draft.id)}
                              color="error"
                            >
                              <DeleteOutline fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                      
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        {draft.title}
                      </Typography>
                      
                      <Divider sx={{ my: 1 }} />
                      
                      <Box 
                        sx={{ 
                          maxHeight: 300, 
                          overflow: 'auto',
                          fontSize: '0.9rem',
                          lineHeight: 1.6,
                          '& p': { margin: '0.5rem 0' },
                          backgroundColor: 'grey.50',
                          padding: 1.5,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'grey.200'
                        }}
                        dangerouslySetInnerHTML={{ __html: draft.content }}
                      />
                      
                      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Save />}
                          onClick={() => handleSaveDraft(draft, index)}
                          sx={{ flexGrow: 1 }}
                          disabled={loading}
                        >
                          저장하기
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<ContentCopy />}
                          onClick={() => handleCopy(draft.content)}
                        >
                          복사
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* 🔥 추가 생성 가능 안내 */}
            {currentAttemptCount < maxAttempts && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                <Typography variant="body2" color="primary.main" align="center">
                  💡 마음에 드는 초안이 없다면 추가로 {maxAttempts - currentAttemptCount}개 더 생성할 수 있습니다!
                </Typography>
              </Box>
            )}

            {/* 🔥 모든 초안 생성 완료 안내 */}
            {currentAttemptCount >= maxAttempts && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.200' }}>
                <Typography variant="body2" color="success.main" align="center" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <CheckCircle fontSize="small" />
                  최대 {maxAttempts}개의 초안 생성이 완료되었습니다. 마음에 드는 초안을 선택해주세요!
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* 안내 메시지 */}
        {drafts.length === 0 && !loading && (
          <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            <AutoAwesome sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" gutterBottom>
              AI 원고 생성을 시작해보세요
            </Typography>
            <Typography variant="body2">
              상단 폼을 작성하고 "AI 초안 생성하기" 버튼을 클릭하세요.<br />
              최대 3개까지 다른 버전의 초안을 생성할 수 있습니다.
            </Typography>
          </Paper>
        )}

        {/* 🔥 스낵바 */}
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