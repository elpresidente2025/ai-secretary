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
  Badge
} from '@mui/material';
import { 
  AutoAwesome, 
  ContentCopy, 
  Save, 
  Refresh,
  Assignment,
  Speed
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
    drafts,
    generationMetadata,
    generatePosts,
    saveDraft,
    setError
  } = usePostGenerator();

  // 폼 상태
  const [formData, setFormData] = useState({
    prompt: '',
    keywords: '',
    category: '일반',
    subCategory: ''
  });

  // 생성 이력 관리 (최대 3번)
  const [generationHistory, setGenerationHistory] = useState([]);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const maxAttempts = 3;

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

  // 원고 생성 요청
  const handleGenerate = async () => {
    if (currentAttempt >= maxAttempts) {
      setError(`최대 ${maxAttempts}번까지만 생성할 수 있습니다.`);
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
      console.log('auth:', auth);
      console.log('auth.user:', auth.user);
      console.log('===========================');

      // 다시 한번 검증
      if (!requestData.prompt) {
        setError('주제가 비어있습니다. 다시 입력해주세요.');
        return;
      }

      await generatePosts(requestData, auth);
      
      // 생성 성공 시 이력에 추가
      const newAttempt = currentAttempt + 1;
      setCurrentAttempt(newAttempt);
      
      setGenerationHistory(prev => [...prev, {
        attempt: newAttempt,
        timestamp: new Date(),
        formData: { ...requestData },
        success: true
      }]);
      
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
      
      // 실패한 시도도 이력에 기록
      setGenerationHistory(prev => [...prev, {
        attempt: currentAttempt + 1,
        timestamp: new Date(),
        formData: { ...formData },
        success: false,
        error: errorMessage
      }]);
    }
  };

  // 초안 저장
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
      
      const postId = await saveDraft(draft, index, formData, generationMetadata, auth);
      
      if (postId) {
        console.log('초안 저장 성공, postId:', postId);
        navigate(`/post/${postId}`);
      } else {
        setError('초안 저장은 됐지만 페이지 이동에 실패했습니다.');
      }
    } catch (err) {
      console.error('=== 초안 저장 실패 ===');
      console.error('Error:', err);
      console.error('===================');
      setError('초안 저장 중 오류가 발생했습니다: ' + (err.message || '알 수 없는 오류'));
    }
  };

  // 복사하기
  const handleCopy = (content) => {
    try {
      const cleanContent = content.replace(/<[^>]*>/g, '');
      navigator.clipboard.writeText(cleanContent);
      alert('클립보드에 복사되었습니다.');
    } catch (error) {
      console.error('복사 실패:', error);
      alert('복사에 실패했습니다.');
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
    setGenerationHistory([]);
    setCurrentAttempt(0);
    setError('');
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
            <Badge badgeContent={`${currentAttempt}/${maxAttempts}`} color="primary">
              <Typography variant="body2" color="text.secondary">
                생성 횟수
              </Typography>
            </Badge>
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

            {/* 버튼 영역 */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleGenerate}
                  disabled={loading || !formData.prompt.trim() || currentAttempt >= maxAttempts}
                  startIcon={loading ? <CircularProgress size={20} /> : <AutoAwesome />}
                  sx={{ minWidth: 200 }}
                >
                  {loading 
                    ? 'AI가 원고를 생성하고 있습니다...' 
                    : currentAttempt === 0 
                      ? 'AI 초안 생성하기' 
                      : `다시 생성하기 (${currentAttempt + 1}/${maxAttempts})`
                  }
                </Button>

                {currentAttempt > 0 && (
                  <Button
                    variant="outlined"
                    onClick={handleReset}
                    disabled={loading}
                    startIcon={<Refresh />}
                  >
                    새로 시작하기
                  </Button>
                )}
              </Box>
            </Grid>

            {/* 에러 메시지 */}
            {error && (
              <Grid item xs={12}>
                <Alert severity="error">
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

        {/* 생성 이력 표시 */}
        {generationHistory.length > 0 && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              생성 이력
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {generationHistory.map((history, index) => (
                <Chip
                  key={index}
                  label={`${history.attempt}회차 ${history.success ? '성공' : '실패'}`}
                  color={history.success ? 'success' : 'error'}
                  variant="outlined"
                  size="small"
                />
              ))}
            </Box>
          </Paper>
        )}

        {/* 생성된 초안들 - 하단에 가로로 나열 */}
        {drafts.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <Assignment sx={{ mr: 1, color: 'primary.main' }} />
              생성된 초안 ({currentAttempt}번째 시도)
            </Typography>
            
            <Grid container spacing={3}>
              {drafts.map((draft, index) => (
                <Grid item xs={12} md={4} key={index}>
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
                          '& p': { margin: '0.5rem 0' }
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
              최대 3번까지 다른 조건으로 재생성할 수 있습니다.
            </Typography>
          </Paper>
        )}
      </Container>
    </DashboardLayout>
  );
};

export default GeneratePage;