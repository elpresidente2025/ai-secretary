import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
  Alert,
  CircularProgress,
  Badge,
  Chip,
  Snackbar,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  CardActions,
  Divider
} from '@mui/material';
import {
  AutoAwesome,
  Add,
  Refresh,
  Save,
  ArrowBack,
  Edit
} from '@mui/icons-material';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import { usePostGenerator } from '../hooks/usePostGenerator';
import { CATEGORIES } from '../constants/formConstants';

const GeneratePage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  
  const { user } = useAuth();
  
  // usePostGenerator 대신 직접 상태 관리 (임시)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 3;

  // State
  const [formData, setFormData] = useState({
    prompt: '',
    keywords: '',
    category: '일반',
    subCategory: ''
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
    action: null
  });

  // Rate limit 정보 (임시)
  const rateLimitInfo = { canRequest: true, waitTime: 0, attemptsRemaining: 3 - attempts };

  // 카테고리 변경 시 세부 카테고리 초기화
  useEffect(() => {
    setFormData(prev => ({ ...prev, subCategory: '' }));
  }, [formData.category]);

  // Hook 호출 이후에 조건부 렌더링
  if (!user?.uid) {
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
    const trimmedPrompt = formData.prompt?.trim() || '';
    
    if (!trimmedPrompt) {
      setSnackbar({
        open: true,
        message: '주제를 입력해주세요.',
        severity: 'error',
        action: null
      });
      return false;
    }
    
    if (trimmedPrompt.length < 5) {
      setSnackbar({
        open: true,
        message: '주제는 최소 5자 이상 입력해주세요.',
        severity: 'error',
        action: null
      });
      return false;
    }
    
    if (trimmedPrompt.length > 500) {
      setSnackbar({
        open: true,
        message: '주제는 500자를 초과할 수 없습니다.',
        severity: 'error',
        action: null
      });
      return false;
    }
    
    if (formData.keywords && formData.keywords.length > 200) {
      setSnackbar({
        open: true,
        message: '키워드는 200자를 초과할 수 없습니다.',
        severity: 'error',
        action: null
      });
      return false;
    }
    
    return true;
  };

  // 원고 생성 요청
  const handleGenerate = async () => {
    if (attempts >= maxAttempts) {
      setSnackbar({
        open: true,
        message: `최대 ${maxAttempts}개까지만 생성할 수 있습니다.`,
        severity: 'warning',
        action: null
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    if (!user?.uid) {
      setSnackbar({
        open: true,
        message: '사용자 정보가 없습니다. 다시 로그인해주세요.',
        severity: 'error',
        action: null
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const requestData = {
        prompt: formData.prompt.trim(),
        keywords: formData.keywords?.trim() || '',
        category: formData.category,
        subCategory: formData.subCategory || '',
        generateSingle: true
      };

      console.log('🚀 원고 생성 요청 데이터:', requestData);
      
      // 🔥 직접 Firebase Functions 호출
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../services/firebase');
      const generatePostFn = httpsCallable(functions, 'generateSinglePost');
      const { data } = await generatePostFn(requestData);
      
      console.log('✅ 원고 생성 응답:', data);
      console.log('📋 post 객체 상세:', data?.post);
      console.log('📄 post.content:', data?.post?.content);
      
      // 🔥 응답에서 post 객체 추출하여 drafts에 추가
      if (data?.post) {
        setDrafts(prev => [data.post, ...prev].slice(0, 3));
        setAttempts(prev => prev + 1);
        
        setSnackbar({
          open: true,
          message: '새 원고가 생성되었습니다!',
          severity: 'success',
          action: null
        });
      } else {
        throw new Error('응답에서 원고 데이터를 찾을 수 없습니다.');
      }

    } catch (error) {
      console.error('원고 생성 오류:', error);
      
      let errorMessage = '원고 생성 중 오류가 발생했습니다.';
      
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.code) {
        errorMessage = `오류 코드: ${error.code}`;
      }
      
      setError(errorMessage);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
        action: null
      });
    } finally {
      setLoading(false);
    }
  };

  // 저장하기
  const handleSave = async (draft) => {
    try {
      // 임시로 localStorage에 저장 (추후 Firebase 연동)
      const savedDrafts = JSON.parse(localStorage.getItem('ai-secretary-drafts') || '[]');
      savedDrafts.push({
        ...draft,
        savedAt: new Date().toISOString(),
        userId: user.uid
      });
      localStorage.setItem('ai-secretary-drafts', JSON.stringify(savedDrafts));
      
      setSnackbar({
        open: true,
        message: '원고가 저장되었습니다! 목록 페이지로 이동합니다.',
        severity: 'success',
        action: null
      });

      // 1초 후 PostListPage로 이동
      setTimeout(() => {
        navigate('/posts');
      }, 1000);
      
    } catch (error) {
      console.error('저장 실패:', error);
      
      let errorMessage = '저장에 실패했습니다.';
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
        action: null
      });
    }
  };

  // 새로 시작하기
  const handleReset = () => {
    setFormData({
      prompt: '',
      keywords: '',
      category: '일반',
      subCategory: ''
    });
    setDrafts([]);
    setAttempts(0);
    setError(null);
    setSnackbar({
      open: true,
      message: '모든 데이터가 초기화되었습니다.',
      severity: 'info',
      action: null
    });
  };

  // 스낵바 닫기
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // 모바일 레이아웃 렌더링
  const renderMobileLayout = () => (
    <Container maxWidth="sm">
      {/* 모바일 헤더 */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 2,
        p: 2,
        backgroundColor: 'primary.main',
        color: 'white',
        borderRadius: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ArrowBack sx={{ mr: 1 }} />
          <Typography variant="h6">AI비서관</Typography>
        </Box>
        <Typography variant="body2">← 뒤로</Typography>
      </Box>

      {/* 페이지 제목 */}
      <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        새 원고 생성 <Edit sx={{ ml: 1 }} />
      </Typography>

      {/* 생성 폼 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 카테고리 선택 */}
          <FormControl fullWidth>
            <InputLabel>카테고리 선택</InputLabel>
            <Select
              value={formData.category}
              onChange={handleInputChange('category')}
              label="카테고리 선택"
              disabled={loading}
            >
              {Object.keys(CATEGORIES).map((cat) => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 세부 카테고리 */}
          {formData.category && CATEGORIES[formData.category]?.length > 0 && (
            <FormControl fullWidth>
              <InputLabel>세부 카테고리</InputLabel>
              <Select
                value={formData.subCategory}
                onChange={handleInputChange('subCategory')}
                label="세부 카테고리"
                disabled={loading}
              >
                <MenuItem value=""><em>선택하세요</em></MenuItem>
                {CATEGORIES[formData.category]?.map((subCat) => (
                  <MenuItem key={subCat} value={subCat}>{subCat}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* 주제 */}
          <TextField
            fullWidth
            label="주제"
            placeholder="어떤 내용의 원고를 작성하고 싶으신가요?"
            value={formData.prompt}
            onChange={handleInputChange('prompt')}
            disabled={loading}
            helperText={`${formData.prompt.length}/500자 (필수 입력)`}
            error={!formData.prompt.trim() && formData.prompt.length > 0}
          />

          {/* 키워드 */}
          <TextField
            fullWidth
            label="키워드 (선택사항)"
            placeholder="원고에 포함할 키워드를 쉼표로 구분"
            value={formData.keywords}
            onChange={handleInputChange('keywords')}
            disabled={loading}
            helperText={`${formData.keywords.length}/200자`}
          />

          {/* 키워드 표시 */}
          {formData.keywords && (
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
          )}

          {/* 세부 지시 사항 */}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="세부 지시 사항 (선택사항)"
            placeholder="추가적인 요구사항이나 원고 스타일에 대한 지시를 입력하세요"
            disabled={loading}
          />
        </Box>

        {/* 버튼 영역 */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleGenerate}
                          disabled={loading || !formData.prompt.trim() || attempts >= maxAttempts || !rateLimitInfo.canRequest}
            startIcon={loading ? <CircularProgress size={20} /> : <AutoAwesome />}
          >
            {loading 
              ? 'AI가 원고를 생성하고 있습니다...' 
              : '새 원고 생성'
            }
          </Button>
          <Button
            variant="outlined"
            onClick={handleReset}
            disabled={loading}
          >
            취소
          </Button>
        </Box>

        {/* 제한 정보 */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
          한 번에 1개만 생성
        </Typography>
      </Paper>

      {/* 주의사항 */}
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight="bold">⚠️ 주의사항</Typography>
        <Typography variant="body2">
          AI비서관은 원고 초안을 제공하며,<br />
          반드시 사용자가 최종 검수 및 수정해야 합니다.
        </Typography>
      </Alert>

      {/* 미리보기 카드 리스트 (모바일 - 세로 배치) */}
      {drafts.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>미리보기 카드 리스트</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {drafts.map((draft, index) => (
              <Card key={index} sx={{ width: '100%', bgcolor: ['#003a87', '#55207d', '#006261'][index] || '#003a87', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6" component="div" gutterBottom sx={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                    초안 {index + 1}
                  </Typography>
                  <Box sx={{ 
                    bgcolor: 'white', 
                    p: 2, 
                    borderRadius: 1,
                    mt: 1
                  }}>
                    <Typography variant="subtitle1" sx={{ 
                      color: 'black',
                      fontWeight: 'bold',
                      mb: 1
                    }}>
                      제목: {draft.title || `${draft.category} - ${draft.subCategory || '일반'}`}
                    </Typography>
                    <Divider sx={{ my: 1, borderColor: 'rgba(0,0,0,0.1)' }} />
                    <Typography variant="body2" sx={{ 
                      maxHeight: 400, 
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      color: 'black',
                      lineHeight: 1.6
                    }}>
                      {draft.content ? 
                        draft.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
                        : '원고 내용이 없습니다.'
                      }
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {draft.generatedAt ? new Date(draft.generatedAt).toLocaleString() : new Date().toLocaleString()}
                  </Typography>
                  <Button 
                    size="small" 
                    startIcon={<Save />}
                    onClick={() => handleSave(draft)}
                    sx={{ color: 'white', borderColor: 'white' }}
                    variant="outlined"
                  >
                    저장
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Box>
        </Box>
      )}
    </Container>
  );

  // 데스크톱 레이아웃 렌더링
  const renderDesktopLayout = () => (
    <Container maxWidth="xl">
      {/* 상단 폼 영역 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
            <AutoAwesome sx={{ mr: 1, color: 'primary.main' }} />
            AI 원고 생성 (1회 1개씩)
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
              label="주제"
              placeholder="어떤 내용의 원고를 작성하고 싶으신가요?"
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
              placeholder="원고에 포함할 키워드를 쉼표로 구분"
              value={formData.keywords}
              onChange={handleInputChange('keywords')}
              disabled={loading}
              helperText={`${formData.keywords.length}/200자`}
            />
          </Grid>

          {/* 세부 지시 사항 */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="세부 지시 사항 (선택사항)"
              placeholder="추가적인 요구사항이나 원고 스타일에 대한 지시를 입력하세요"
              disabled={loading}
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

          {/* 버튼 영역 */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleGenerate}
                disabled={loading || !formData.prompt.trim() || attempts >= maxAttempts || !rateLimitInfo.canRequest}
                startIcon={loading ? <CircularProgress size={20} /> : <AutoAwesome />}
                sx={{ minWidth: 200 }}
              >
                {loading 
                  ? 'AI가 원고를 생성하고 있습니다...' 
                  : !rateLimitInfo.canRequest
                    ? `대기 중 (${rateLimitInfo.waitTime}초)`
                  : '새 원고 생성'
                }
              </Button>
              <Button
                variant="outlined"
                onClick={handleReset}
                disabled={loading}
              >
                취소
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              한 번에 1개만 생성
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* 주의사항 */}
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight="bold">⚠️ 주의사항</Typography>
        <Typography variant="body2">
          AI비서관은 원고 초안을 제공하며, 반드시 사용자가 최종 검수 및 수정해야 합니다.
        </Typography>
      </Alert>

      {/* 미리보기 (데스크톱 - 동적 정렬, 최신이 가장 왼쪽) */}
      {drafts.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>미리보기</Typography>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center',
            gap: 2 
          }}>
            {drafts.map((draft, index) => (
              <Card key={index} sx={{ 
                width: drafts.length === 1 ? '600px' : drafts.length === 2 ? '400px' : '350px',
                maxWidth: '100%',
                bgcolor: ['#003a87', '#55207d', '#006261'][index] || '#003a87',
                color: 'white',
                display: 'flex', 
                flexDirection: 'column' 
              }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="div" gutterBottom sx={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                    초안 {index + 1}
                  </Typography>
                  <Box sx={{ 
                    bgcolor: 'white', 
                    p: 2, 
                    borderRadius: 1,
                    mt: 1
                  }}>
                    <Typography variant="subtitle1" sx={{ 
                      color: 'black',
                      fontWeight: 'bold',
                      mb: 1
                    }}>
                      제목: {draft.title || `${draft.category} - ${draft.subCategory || '일반'}`}
                    </Typography>
                    <Divider sx={{ my: 1, borderColor: 'rgba(0,0,0,0.1)' }} />
                    <Typography variant="body2" sx={{ 
                      maxHeight: drafts.length === 1 ? 400 : drafts.length === 2 ? 300 : 200, 
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      color: 'black',
                      lineHeight: 1.6,
                      fontSize: drafts.length === 1 ? '0.95rem' : '0.875rem'
                    }}>
                      {draft.content ? 
                        draft.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
                        : '원고 내용이 없습니다.'
                      }
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    {draft.generatedAt ? new Date(draft.generatedAt).toLocaleString() : new Date().toLocaleString()}
                  </Typography>
                  <Button 
                    size="small" 
                    startIcon={<Save />}
                    onClick={() => handleSave(draft)}
                    sx={{ color: 'white', borderColor: 'white' }}
                    variant="outlined"
                  >
                    저장
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Box>
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
            상단 폼을 작성하고 "새 원고 생성" 버튼을 클릭하세요.<br />
            최대 {maxAttempts}개까지 다른 버전의 초안을 생성할 수 있습니다.
          </Typography>
        </Paper>
      )}
    </Container>
  );

  return (
    <DashboardLayout title={isMobile ? "새 원고 생성" : "AI 원고 생성"}>
      {/* 에러 표시 */}
      {error && (
        <Container maxWidth="xl">
          <Alert severity="error" sx={{ mb: 2 }}>
            {typeof error === 'string' ? error : error?.message || '오류가 발생했습니다.'}
          </Alert>
        </Container>
      )}

      {/* 모바일/데스크톱 분기 렌더링 */}
      {isMobile ? renderMobileLayout() : renderDesktopLayout()}

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        action={snackbar.action}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
};

export default GeneratePage;