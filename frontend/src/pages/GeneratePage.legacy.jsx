// frontend/src/pages/GeneratePage.jsx
import React, { useState, useEffect, useMemo } from 'react';
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
  const cleanText = text.replace(/<[^>]*>/g, '').replace(/\s/g, '');
  return cleanText.length;
};

// HTML → 텍스트
const htmlToText = (html) => {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const text = tmp.textContent || tmp.innerText || '';
  return text.replace(/\u00A0/g, ' ').trim();
};

const GeneratePage = () => {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const {
    loading,
    error,
    progress,
    drafts, // 누적된 drafts 배열
    generationMetadata,
    generatePosts, // 누적으로 추가
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

  // 스낵바
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
    action: null
  });

  // 최대 3개
  const maxAttempts = 3;
  const currentAttemptCount = drafts.length;

  // 요청 제한
  const rateLimitInfo = getRateLimitInfo ? getRateLimitInfo() : { canRequest: true, waitTime: 0, requestsRemaining: 15 };

  // 카테고리 변경 시 세부 카테고리 초기화
  useEffect(() => {
    setFormData(prev => ({ ...prev, subCategory: '' }));
  }, [formData.category]);

  if (!auth?.user?.id) {
    return (
      <DashboardLayout title="원고 생성">
        <Container maxWidth="xl">
          <Alert severity="error">사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.</Alert>
        </Container>
      </DashboardLayout>
    );
  }

  // 입력 변경
  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
  };

  // 폼 검증
  const validateForm = () => {
    const trimmedPrompt = formData.prompt?.trim() || '';
    if (!trimmedPrompt) { setError('주제를 입력해주세요.'); return false; }
    if (trimmedPrompt.length < 5) { setError('주제는 최소 5자 이상 입력해주세요.'); return false; }
    if (trimmedPrompt.length > 500) { setError('주제는 500자를 초과할 수 없습니다.'); return false; }
    if (formData.keywords && formData.keywords.length > 200) { setError('키워드는 200자를 초과할 수 없습니다.'); return false; }
    return true;
  };

  // 생성
  const handleGenerate = async () => {
    if (currentAttemptCount >= maxAttempts) { setError(`최대 ${maxAttempts}개까지만 생성할 수 있습니다.`); return; }
    if (!rateLimitInfo.canRequest) { setError(`너무 빈번한 요청입니다. ${rateLimitInfo.waitTime}초 후 다시 시도해주세요.`); return; }
    setError('');
    if (!validateForm()) return;
    if (!auth?.user?.id) { setError('사용자 정보가 없습니다. 다시 로그인해주세요.'); return; }

    try {
      const requestData = {
        prompt: formData.prompt.trim(),
        keywords: formData.keywords?.trim() || '',
        category: formData.category,
        subCategory: formData.subCategory || ''
      };
      if (!requestData.prompt) { setError('주제가 비어있습니다. 다시 입력해주세요.'); return; }

      await generatePosts(requestData, auth);
      setSnackbar({
        open: true,
        message: `초안 ${currentAttemptCount + 1}이 생성되었습니다!`,
        severity: 'success',
        action: null
      });
    } catch (error) {
      console.error('원고 생성 실패:', error);
      // usePostGenerator에서 에러 처리
    }
  };

  // 저장
  const handleSaveDraft = async (draft, index) => {
    try {
      if (!auth?.user?.id) { setError('사용자 정보가 없습니다. 다시 로그인해주세요.'); return; }
      const result = await saveDraft(draft, index, formData, generationMetadata);
      if (result && result.success) {
        setSnackbar({
          open: true,
          message: '초안이 성공적으로 저장되었습니다!',
          severity: 'success',
          action: (
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => { navigate('/history'); setSnackbar(prev => ({ ...prev, open: false })); }}
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

  // 삭제
  const handleRemoveDraft = (draftId) => {
    removeDraft(draftId);
    setSnackbar({ open: true, message: '초안이 삭제되었습니다.', severity: 'info', action: null });
  };

  // 복사
  const handleCopy = (content) => {
    try {
      const clean = htmlToText(content);
      navigator.clipboard.writeText(clean);
      setSnackbar({ open: true, message: '클립보드에 복사되었습니다!', severity: 'success', action: null });
    } catch (error) {
      console.error('복사 실패:', error);
      setSnackbar({ open: true, message: '복사에 실패했습니다.', severity: 'error', action: null });
    }
  };

  // 초기화
  const handleReset = () => {
    setFormData({ prompt: '', keywords: '', category: '일반', subCategory: '' });
    clearDrafts();
    setError('');
    setSnackbar({ open: true, message: '모든 데이터가 초기화되었습니다.', severity: 'info', action: null });
  };

  const handleCloseSnackbar = (_, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // ==== 여기부터 레이아웃/색/크기 커스터마이즈 ====
  const BOX_COLORS = ['#003a87', '#55207d', '#006261']; // 1~3번째 박스 배경

  // 1개면 중앙, 2개면 좌측 2열, 3개면 3열 꽉차게
  const gridProps = useMemo(
    () => ({ justifyContent: drafts.length === 1 ? 'center' : 'flex-start' }),
    [drafts.length]
  );
  // ===============================================

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
                <Typography variant="body2" color="text.secondary">생성된 초안 수</Typography>
              </Badge>
              <Typography variant="caption" color="text.secondary">
                남은 횟수: {rateLimitInfo.requestsRemaining}회
              </Typography>
              {drafts.length > 0 && (
                <Button variant="outlined" size="small" onClick={handleReset} startIcon={<Refresh />} color="secondary">
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

            {/* 버튼 */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleGenerate}
                  disabled={loading || !formData.prompt.trim() || currentAttemptCount >= maxAttempts || !rateLimitInfo.canRequest}
                  startIcon={loading ? <CircularProgress size={20} /> : (currentAttemptCount === 0 ? <AutoAwesome /> : <Add />)}
                  sx={{ minWidth: 200 }}
                >
                  {loading 
                    ? 'AI가 원고를 생성하고 있습니다...' 
                    : !rateLimitInfo.canRequest
                      ? `대기 중 (${rateLimitInfo.waitTime}초)`
                    : currentAttemptCount === 0 
                      ? 'AI 초안 생성하기' 
                      : `추가 생성하기 (${currentAttemptCount + 1}/${maxAttempts})`
                  }
                </Button>
              </Box>
            </Grid>

            {/* 에러 */}
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
                        onClick={() => { setError(''); if (validateForm()) handleGenerate(); }}
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

            {/* 🔥 여기서부터 변경: 1개 중앙 / 2개 좌정렬 2열 / 3개 3열, 박스색 지정, 본문 더 큼 */}
            <Grid container spacing={2} {...gridProps}>
              {drafts.map((draft, index) => {
                const bg = BOX_COLORS[index]; // 1~3번째만 존재
                const fg = '#ffffff';

                // 열/폭 동적 결정
                const itemProps =
                  drafts.length >= 3
                    ? { xs: 12, sm: 6, md: 4, lg: 4, xl: 4 } // 3개 → PC에서 3열
                    : drafts.length === 2
                    ? { xs: 12, sm: 6, md: 6, lg: 6 }       // 2개 → 2열(좌정렬)
                    : { xs: 12, sm: 10, md: 8, lg: 6 };     // 1개 → 넓게 중앙

                return (
                  <Grid item key={draft.id || index} {...itemProps}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6" sx={{ color: bg }}>
                            초안 {index + 1}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Speed sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {calculateWordCount(draft.content)}자
                            </Typography>
                            <Tooltip title="이 초안 삭제">
                              <IconButton size="small" onClick={() => handleRemoveDraft(draft.id)} color="error">
                                <DeleteOutline fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>

                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                          {draft.title}
                        </Typography>

                        <Divider sx={{ my: 1 }} />

                        {/* 본문 박스: 색/크기/반응형 */}
                        <Box 
                          sx={{ 
                            maxHeight: { xs: 340, md: 600 },   // PC에서 크게
                            minHeight: { md: 380 },
                            overflow: 'auto',
                            fontSize: { xs: '0.95rem', md: '1rem' },
                            lineHeight: 1.65,
                            '& p': { m: '0.5rem 0' },
                            bgcolor: bg,
                            color: fg,
                            p: 2,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'rgba(255,255,255,0.24)',
                            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
                            '& a': { color: fg, textDecorationColor: 'rgba(255,255,255,0.6)' },
                            '& strong, & b': { color: fg },
                            '& img': { maxWidth: '100%' }
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
                );
              })}
            </Grid>

            {/* 추가 생성 안내 */}
            {currentAttemptCount < maxAttempts && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                <Typography variant="body2" color="primary.main" align="center">
                  💡 마음에 드는 초안이 없다면 추가로 {maxAttempts - currentAttemptCount}개 더 생성할 수 있습니다!
                </Typography>
              </Box>
            )}

            {/* 완료 안내 */}
            {currentAttemptCount >= maxAttempts && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.200' }}>
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

        {/* 안내 */}
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
