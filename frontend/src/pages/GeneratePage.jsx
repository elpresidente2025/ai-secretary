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
  CircularProgress
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
    regenerate,
    setError
  } = usePostGenerator();

  // 폼 상태
  const [formData, setFormData] = useState({
    prompt: '',
    keywords: '',
    category: '일반',
    subCategory: ''
  });

  console.log('GeneratePage - 현재 사용자 정보:', auth);

  // useEffect도 Hook이므로 조건부 return 이전에 호출
  useEffect(() => {
    setFormData(prev => ({ ...prev, subCategory: '' }));
  }, [formData.category]);

  // Hook 호출 이후에 조건부 렌더링
  if (!auth?.user?.id) {
    return (
      <DashboardLayout title="원고 생성">
        <Container maxWidth="lg">
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
    if (!formData.prompt.trim()) {
      setError('주제를 입력해주세요.');
      return false;
    }
    
    if (formData.prompt.length < 5) {
      setError('주제는 최소 5자 이상 입력해주세요.');
      return false;
    }
    
    if (formData.prompt.length > 500) {
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
  const handleGenerate = () => {
    console.log('원고 생성 요청 시작:', { formData, userId: auth.user.id });
    setError('');
    
    if (validateForm() && auth?.user?.id) {
      generatePosts(formData, auth);
    } else if (!auth?.user?.id) {
      setError('사용자 정보가 없습니다. 다시 로그인해주세요.');
    }
  };

  // 🔥 초안 저장 - 완전히 새로 작성
  const handleSaveDraft = async (draft, index) => {
    try {
      // 🔥 현재 사용자 정보 직접 확인
      console.log('🔥 저장 시 사용자 정보 확인:', {
        auth: auth,
        userId: auth?.user?.id,
        userName: auth?.user?.name,
        fullAuthObject: JSON.stringify(auth, null, 2)
      });
      
      if (!auth?.user?.id) {
        console.error('❌ 사용자 정보 없음');
        setError('사용자 정보가 없습니다. 다시 로그인해주세요.');
        return;
      }
      
      console.log('🔥 초안 저장 요청 시작:', { 
        draft, 
        index, 
        userId: auth.user.id,
        userName: auth.user.name,
        formData,
        generationMetadata 
      });
      
      // 🔥 auth 정보를 직접 전달
      const postId = await saveDraft(draft, index, formData, generationMetadata, auth);
      if (postId) {
        console.log('✅ 저장 성공, 페이지 이동:', postId);
        navigate(`/post/${postId}`);
      } else {
        console.error('❌ postId 없음');
        setError('초안 저장은 됐지만 페이지 이동에 실패했습니다.');
      }
    } catch (err) {
      console.error('❌ 초안 저장 실패:', err);
      setError('초안 저장 중 오류가 발생했습니다.');
    }
  };

  // 재생성
  const handleRegenerate = () => {
    if (regenerate) {
      regenerate();
    } else {
      handleGenerate();
    }
  };

  // 복사하기
  const handleCopy = (content) => {
    navigator.clipboard.writeText(content.replace(/<[^>]*>/g, ''));
    alert('클립보드에 복사되었습니다.');
  };

  return (
    <DashboardLayout title="원고 생성">
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          {/* 입력 폼 */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: 'fit-content' }}>
              <Typography variant="h6" gutterBottom>
                <AutoAwesome sx={{ mr: 1, verticalAlign: 'middle' }} />
                원고 생성 설정
              </Typography>
              
              {/* 사용자 정보 표시 */}
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>작성자:</strong> {auth.user.name || '이름 없음'} 
                  {auth.user.position && ` (${auth.user.position})`}
                  {auth.user.regionMetro && ` | ${auth.user.regionMetro} ${auth.user.regionLocal || ''}`.trim()}
                  <br />
                  <strong>사용자 ID:</strong> {auth.user.id}
                </Typography>
              </Alert>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* 카테고리 선택 */}
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

                {/* 세부 카테고리 선택 */}
                {formData.category && CATEGORIES[formData.category] && (
                  <FormControl fullWidth>
                    <InputLabel>세부 카테고리</InputLabel>
                    <Select
                      value={formData.subCategory}
                      onChange={handleInputChange('subCategory')}
                      label="세부 카테고리"
                      disabled={loading}
                    >
                      {CATEGORIES[formData.category].map((subCat) => (
                        <MenuItem key={subCat} value={subCat}>{subCat}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {/* 주제 입력 */}
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="주제 및 내용"
                  placeholder="어떤 내용의 원고를 작성하고 싶으신가요? 상세할수록 더 정확한 원고가 생성됩니다."
                  value={formData.prompt}
                  onChange={handleInputChange('prompt')}
                  disabled={loading}
                  helperText={`${formData.prompt.length}/500자`}
                />

                {/* 키워드 입력 */}
                <TextField
                  fullWidth
                  label="키워드 (선택사항)"
                  placeholder="원고에 포함되길 원하는 키워드를 쉼표로 구분해서 입력하세요"
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

                {/* 에러 메시지 */}
                {error && (
                  <Alert severity="error">
                    {error}
                  </Alert>
                )}

                {/* 생성 버튼 */}
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleGenerate}
                  disabled={loading || !formData.prompt.trim()}
                  sx={{ py: 1.5 }}
                  startIcon={loading ? <CircularProgress size={20} /> : <AutoAwesome />}
                >
                  {loading ? 'AI가 원고를 생성하고 있습니다...' : drafts.length > 0 ? '다시 생성하기' : 'AI 초안 생성하기'}
                </Button>

                {/* 진행률 표시 */}
                {loading && (
                  <Box sx={{ width: '100%' }}>
                    <LinearProgress variant="determinate" value={progress} />
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                      {progress}% 완료
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* 생성된 초안들 */}
          <Grid item xs={12} md={6}>
            {drafts.length > 0 ? (
              <Box>
                <Typography variant="h6" gutterBottom>
                  <Assignment sx={{ mr: 1, verticalAlign: 'middle' }} />
                  생성된 초안 ({drafts.length}개)
                </Typography>
                
                {drafts.map((draft, index) => (
                  <Card key={index} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" component="h3">
                          {draft.title || `초안 ${index + 1}`}
                        </Typography>
                        <Chip 
                          icon={<Speed />}
                          label={`${draft.wordCount || 0}자`} 
                          size="small" 
                          variant="outlined" 
                        />
                      </Box>
                      
                      <Divider sx={{ mb: 2 }} />
                      
                      <Box 
                        sx={{ 
                          maxHeight: 200, 
                          overflow: 'auto', 
                          mb: 2,
                          p: 1,
                          backgroundColor: 'grey.50',
                          borderRadius: 1
                        }}
                        dangerouslySetInnerHTML={{ __html: draft.content || '<p>내용이 없습니다.</p>' }}
                      />
                      
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Save />}
                          onClick={() => handleSaveDraft(draft, index)}
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
                          복사하기
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
                
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Refresh />}
                  onClick={handleRegenerate}
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  다른 초안 생성하기
                </Button>
              </Box>
            ) : (
              <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                <AutoAwesome sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" gutterBottom>
                  AI 원고 생성을 시작해보세요
                </Typography>
                <Typography variant="body2">
                  왼쪽 폼을 작성하고 "AI 초안 생성하기" 버튼을 클릭하세요.
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Container>
    </DashboardLayout>
  );
};

export default GeneratePage;