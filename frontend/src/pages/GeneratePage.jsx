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
  AlertTitle,
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

// 카드 배경 컬러(텍스트 박스는 흰색 유지)
const CARD_BG = ['#003a87', '#55207d', '#006261'];

// 카테고리 및 세부 카테고리 정의
const CATEGORIES = {
  '의정활동': ['국정감사', '법안발의', '질의응답', '위원회활동', '예산심사', '정책토론'],
  '지역활동': ['현장방문', '주민간담회', '지역현안', '봉사활동', '상권점검', '민원해결'],
  '정책/비전': ['경제정책', '사회복지', '교육정책', '환경정책', '디지털정책', '청년정책'],
  '보도자료': ['성명서', '논평', '제안서', '건의문', '발표문', '입장문'],
  '일반': ['일상소통', '감사인사', '축하메시지', '격려글', '교육컨텐츠']
};

// 네이버 기준 글자수 계산 함수 (공백 제외)
const calculateWordCount = (html) => {
  if (!html) return 0;
  const clean = html.replace(/<[^>]*>/g, '').replace(/\s/g, '');
  return clean.length;
};

const GeneratePage = () => {
  const navigate = useNavigate();
  const { auth } = useAuth();

  const {
    loading,
    error,
    progress,
    drafts,                 // 누적 drafts 배열 (최대 3개)
    generationMetadata,
    generatePosts,          // 초안 생성
    saveDraft,              // 초안 저장
    clearDrafts,            // 모든 초안 초기화
    removeDraft,            // 특정 초안 삭제
    setError,               // 에러 표시
    getRateLimitInfo        // { canRequest, waitTime, requestsRemaining }
  } = usePostGenerator();

  // 폼 상태
  const [formData, setFormData] = useState({
    prompt: '',
    keywords: '',
    category: '일반',
    subCategory: ''
  });

  // 스낵바
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
    action: null
  });

  // 최대 3개까지 생성
  const maxAttempts = 3;
  const currentAttemptCount = drafts.length;

  // 요청 제한 정보(1초 폴링으로 실시간 갱신)
  const [limit, setLimit] = useState(
    getRateLimitInfo ? getRateLimitInfo() : { canRequest: true, waitTime: 0, requestsRemaining: 15 }
  );
  useEffect(() => {
    if (!getRateLimitInfo) return;
    setLimit(getRateLimitInfo());
    const t = setInterval(() => setLimit(getRateLimitInfo()), 1000);
    return () => clearInterval(t);
  }, [getRateLimitInfo]);

  // 카테고리 바뀌면 세부 카테고리 초기화
  useEffect(() => {
    setFormData((prev) => ({ ...prev, subCategory: '' }));
  }, [formData.category]);

  // 인증 확인
  if (!auth?.user?.id) {
    return (
      <DashboardLayout title="원고 생성">
        <Container maxWidth="xl">
          <Alert severity="error">사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.</Alert>
        </Container>
      </DashboardLayout>
    );
  }

  // 입력값 변경
  const handleInputChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  // 폼 검증
  const validateForm = () => {
    const trimmed = (formData.prompt || '').trim();
    if (!trimmed) {
      setError('주제를 입력해주세요.');
      return false;
    }
    if (trimmed.length < 5) {
      setError('주제는 최소 5자 이상 입력해주세요.');
      return false;
    }
    if (trimmed.length > 500) {
      setError('주제는 500자를 초과할 수 없습니다.');
      return false;
    }
    if (formData.keywords && formData.keywords.length > 200) {
      setError('키워드는 200자를 초과할 수 없습니다.');
      return false;
    }
    return true;
  };

  // 초안 생성
  const handleGenerate = async () => {
    if (currentAttemptCount >= maxAttempts) {
      setError(`최대 ${maxAttempts}개까지만 생성할 수 있습니다.`);
      return;
    }
    if (!limit.canRequest) {
      setError(`너무 빈번한 요청입니다. ${limit.waitTime}초 후 다시 시도해주세요.`);
      return;
    }
    setError('');

    if (!validateForm()) return;

    if (!auth?.user?.id) {
      setError('사용자 정보가 없습니다. 다시 로그인해주세요.');
      return;
    }

    const requestData = {
      prompt: formData.prompt.trim(),
      keywords: (formData.keywords || '').trim(),
      category: formData.category,
      subCategory: formData.subCategory || ''
    };

    if (!requestData.prompt) {
      setError('주제가 비어있습니다. 다시 입력해주세요.');
      return;
    }

    try {
      await generatePosts(requestData, auth);
      setSnackbar({
        open: true,
        message: `초안 ${currentAttemptCount + 1}이 생성되었습니다!`,
        severity: 'success',
        action: null
      });
    } catch (e) {
      // 상세 에러는 훅에서 처리됨
      console.error('원고 생성 실패:', e);
    }
  };

  // 초안 저장
  const handleSaveDraft = async (draft, index) => {
    try {
      if (!auth?.user?.id) {
        setError('사용자 정보가 없습니다. 다시 로그인해주세요.');
        return;
      }
      const result = await saveDraft(draft, index, formData, generationMetadata);
      if (result?.success) {
        setSnackbar({
          open: true,
          message: '초안이 성공적으로 저장되었습니다!',
          severity: 'success',
          action: (
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                navigate('/history');
                setSnackbar((prev) => ({ ...prev, open: false }));
              }}
            >
              목록 보기
            </Button>
          )
        });
      } else {
        setError('초안 저장에 실패했습니다.');
      }
    } catch (err) {
      console.error('초안 저장 실패:', err);
      setSnackbar({
        open: true,
        message: '초안 저장 중 오류가 발생했습니다: ' + (err.message || '알 수 없는 오류'),
        severity: 'error',
        action: null
      });
    }
  };

  // 초안 삭제
  const handleRemoveDraft = (draftId) => {
    removeDraft(draftId);
    setSnackbar({
      open: true,
      message: '초안이 삭제되었습니다.',
      severity: 'info',
      action: null
    });
  };

  // 복사
  const handleCopy = (content) => {
    try {
      const clean = content.replace(/<[^>]*>/g, '');
      navigator.clipboard.writeText(clean);
      setSnackbar({
        open: true,
        message: '클립보드에 복사되었습니다!',
        severity: 'success',
        action: null
      });
    } catch (e) {
      console.error('복사 실패:', e);
      setSnackbar({
        open: true,
        message: '복사에 실패했습니다.',
        severity: 'error',
        action: null
      });
    }
  };

  // 새로 시작
  const handleReset = () => {
    setFormData({ prompt: '', keywords: '', category: '일반', subCategory: '' });
    clearDrafts();
    setError('');
    setSnackbar({
      open: true,
      message: '모든 데이터가 초기화되었습니다.',
      severity: 'info',
      action: null
    });
  };

  // 스낵바 닫기
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar((prev) => ({ ...prev, open: false }));
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

            {/* 원하면 상단에도 '새로 시작' 버튼 배치 */}
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
                  <MenuItem value="">
                    <em>선택하세요</em>
                  </MenuItem>
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
                placeholder="어떤 내용의 원고를 작성하고 싶으신가요? 상세할수록 더 정확한 원고가 생성됩니다."
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

            {/* 키워드 칩 */}
            {formData.keywords && (
              <Grid item xs={12}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    입력된 키워드:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {formData.keywords.split(',').map((kw, i) => {
                      const k = kw.trim();
                      return k ? <Chip key={`${k}-${i}`} label={k} size="small" variant="outlined" /> : null;
                    })}
                  </Box>
                </Box>
              </Grid>
            )}

            {/* 버튼 영역 (남은 회수/대기시간 칩 포함) */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleGenerate}
                  disabled={
                    loading ||
                    !formData.prompt.trim() ||
                    currentAttemptCount >= maxAttempts ||
                    !limit.canRequest
                  }
                  startIcon={
                    loading
                      ? <CircularProgress size={20} />
                      : (currentAttemptCount === 0 ? <AutoAwesome /> : <Add />)
                  }
                  sx={{ minWidth: 200 }}
                >
                  {loading
                    ? 'AI가 원고를 생성하고 있습니다...'
                    : !limit.canRequest
                      ? `대기 중 (${limit.waitTime}초)`
                      : currentAttemptCount === 0
                        ? 'AI 초안 생성하기'
                        : `추가 생성하기 (${currentAttemptCount + 1}/${maxAttempts})`}
                </Button>

                {/* 생성 남은 회수 */}
                <Chip
                  label={`생성 ${currentAttemptCount}/${maxAttempts}`}
                  color="primary"
                  variant="outlined"
                />

                {/* 대기시간 (대기 중일 때만) */}
                {!limit.canRequest && (
                  <Chip
                    label={`대기 ${limit.waitTime}초`}
                    color="warning"
                    variant="filled"
                  />
                )}

                <Typography variant="caption" color="text.secondary">
                  남은 호출: {limit.requestsRemaining}회
                </Typography>

                {/* 새로 시작 버튼을 우측 정렬 */}
                {drafts.length > 0 && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleReset}
                    startIcon={<Refresh />}
                    color="secondary"
                    sx={{ ml: 'auto' }}
                  >
                    새로 시작
                  </Button>
                )}
              </Box>
            </Grid>

            {/* 에러 메시지 */}
            {error && (
              <Grid item xs={12}>
                <Alert
                  severity={typeof error === 'object' && error.type === 'quota_exceeded' ? 'warning' : 'error'}
                  onClose={() => setError('')}
                  action={
                    (typeof error === 'object' && error.canRetry) && (
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() => {
                          setError('');
                          if (validateForm()) handleGenerate();
                        }}
                        disabled={typeof error === 'object' && error.retryDelay && Date.now() < error.retryDelay}
                      >
                        다시 시도
                      </Button>
                    )
                  }
                >
                  <AlertTitle>{typeof error === 'object' ? error.title : '오류 발생'}</AlertTitle>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                    {typeof error === 'object' ? error.message : error}
                  </Typography>

                  {(typeof error === 'object' && error.type === 'quota_exceeded') && (
                    <Box sx={{ mt: 1, p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
                      <Typography variant="caption" color="warning.dark">
                        💡 <strong>팁:</strong> 유료 플랜 전환 시 월 $10-20으로 무제한 사용 가능
                      </Typography>
                    </Box>
                  )}

                  {(typeof error === 'object' && error.type === 'service_overloaded') && (
                    <Box sx={{ mt: 1, p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
                      <Typography variant="caption" color="info.dark">
                        🔄 <strong>상태:</strong> AI 서비스 과부하 - 백업 모델로 자동 재시도 중
                      </Typography>
                    </Box>
                  )}
                </Alert>
              </Grid>
            )}

            {/* 진행률 */}
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

        {/* 생성된 초안들 */}
        {drafts.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <Assignment sx={{ mr: 1, color: 'primary.main' }} />
              생성된 초안들 ({drafts.length}개)
            </Typography>

            <Grid container spacing={3}>
              {drafts.map((draft, index) => (
                <Grid item xs={12} md={4} key={draft.id || index}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: CARD_BG[index % CARD_BG.length],
                      color: '#fff',
                      borderRadius: 2
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ color: '#fff' }}>
                          초안 {index + 1}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Speed sx={{ fontSize: 16, color: 'rgba(255,255,255,0.8)' }} />
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                            {calculateWordCount(draft.content)}자
                          </Typography>
                          <Tooltip title="이 초안 삭제">
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveDraft(draft.id)}
                              sx={{ color: '#ffd2d2' }}
                            >
                              <DeleteOutline fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>

                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ color: '#fff' }}>
                        {draft.title}
                      </Typography>

                      <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.2)' }} />

                      {/* 텍스트 박스는 흰색 고정 */}
                      <Box
                        sx={{
                          maxHeight: 300,
                          overflow: 'auto',
                          fontSize: '0.95rem',
                          lineHeight: 1.7,
                          backgroundColor: '#fff',
                          color: 'text.primary',
                          p: 1.5,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'grey.200',
                          '& p': { m: '0.5rem 0' }
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
                          sx={{
                            bgcolor: '#ffffff',
                            '&:hover': { bgcolor: '#f5f5f5' }
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

            {/* 추가 생성 안내 */}
            {currentAttemptCount < maxAttempts && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                <Typography variant="body2" color="primary.main" align="center">
                  💡 마음에 드는 초안이 없다면 추가로 {maxAttempts - currentAttemptCount}개 더 생성할 수 있습니다!
                </Typography>
              </Box>
            )}

            {/* 최대치 안내 */}
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
                  최대 {maxAttempts}개의 초안 생성이 완료되었습니다. 마음에 드는 초안을 선택해주세요!
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* 안내 (아직 초안 없음) */}
        {drafts.length === 0 && !loading && (
          <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            <AutoAwesome sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" gutterBottom>AI 원고 생성을 시작해보세요</Typography>
            <Typography variant="body2">
              상단 폼을 작성하고 "AI 초안 생성하기" 버튼을 클릭하세요.<br />
              최대 3개까지 다른 버전의 초안을 생성할 수 있습니다.
            </Typography>
          </Paper>
        )}

        {/* 스낵바 */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          action={snackbar.action}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  );
};

export default GeneratePage;
