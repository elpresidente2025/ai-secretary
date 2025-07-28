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
  Container
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
import { useAuth } from '../context/AuthContext';
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
  const { auth } = useAuth();
  
  // 폼 상태
  const [formData, setFormData] = useState({
    prompt: '',
    keywords: '',
    category: '일반',
    subCategory: ''
  });
  
  // 🔥 로직을 커스텀 훅으로 분리
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
  
  // 카테고리 변경 시 세부 카테고리 초기화
  useEffect(() => {
    setFormData(prev => ({ ...prev, subCategory: '' }));
  }, [formData.category]);

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

  // 🔥 원고 생성 요청 (단순화됨)
  const handleGenerate = () => {
    setError('');
    if (validateForm() && auth?.user) {
      generatePosts(formData, auth);
    } else if (!auth?.user) {
      setError('로그인이 필요합니다.');
    }
  };

  // 초안 저장 (단순화됨)
  const handleSaveDraft = async (draft, index) => {
    try {
      const postId = await saveDraft(draft, index, formData, generationMetadata);
      if (postId) {
        navigate(`/post/${postId}`);
      }
    } catch (err) {
      console.error('초안 저장 실패:', err);
      setError('초안 저장 중 오류가 발생했습니다.');
    }
  };

  // 다시 생성 (단순화됨)
  const handleRegenerate = () => regenerate();

  // 텍스트 복사
  const handleCopyText = (draft) => {
    const plainText = `${draft.title}\n\n${draft.content.replace(/<[^>]*>/g, '')}`;
    navigator.clipboard.writeText(plainText);
  };

  return (
    <DashboardLayout title="AI 원고 생성">
      <Container maxWidth="xl">
        {/* 상단: 원고 생성 설정 */}
        <Paper elevation={2} sx={{ p: 4, mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <AutoAwesome sx={{ fontSize: 32, mr: 2 }} />
            <Typography variant="h4" component="h1" fontWeight="bold">
              AI 원고 생성 설정
            </Typography>
          </Box>
          
          <Typography variant="h6" sx={{ mb: 3, opacity: 0.9 }}>
            주제와 카테고리를 설정하여 전문적인 정치 블로그 원고를 생성하세요
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ 
                '& .MuiOutlinedInput-root': { backgroundColor: 'rgba(255,255,255,0.1)' },
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.8)' },
                '& .MuiOutlinedInput-input': { color: 'white' }
              }}>
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={formData.category}
                  onChange={handleInputChange('category')}
                  disabled={loading}
                  label="카테고리"
                >
                  {Object.keys(CATEGORIES).map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              {CATEGORIES[formData.category] && (
                <FormControl fullWidth sx={{ 
                  '& .MuiOutlinedInput-root': { backgroundColor: 'rgba(255,255,255,0.1)' },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.8)' },
                  '& .MuiOutlinedInput-input': { color: 'white' }
                }}>
                  <InputLabel>세부 카테고리 (선택사항)</InputLabel>
                  <Select
                    value={formData.subCategory}
                    onChange={handleInputChange('subCategory')}
                    disabled={loading}
                    label="세부 카테고리 (선택사항)"
                  >
                    <MenuItem value="">선택하지 않음</MenuItem>
                    {CATEGORIES[formData.category].map((subCategory) => (
                      <MenuItem key={subCategory} value={subCategory}>
                        {subCategory}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="주제 *"
                multiline
                rows={3}
                value={formData.prompt}
                onChange={handleInputChange('prompt')}
                placeholder="예) 지역 교통 인프라 개선 방안에 대해"
                disabled={loading}
                helperText={`${formData.prompt.length}/500자`}
                sx={{ 
                  '& .MuiOutlinedInput-root': { backgroundColor: 'rgba(255,255,255,0.1)' },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.8)' },
                  '& .MuiOutlinedInput-input': { color: 'white' },
                  '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.6)' }
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="키워드 (선택사항)"
                value={formData.keywords}
                onChange={handleInputChange('keywords')}
                placeholder="예) 교통, 인프라, 지역발전"
                disabled={loading}
                helperText={`${formData.keywords.length}/200자`}
                sx={{ 
                  '& .MuiOutlinedInput-root': { backgroundColor: 'rgba(255,255,255,0.1)' },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.8)' },
                  '& .MuiOutlinedInput-input': { color: 'white' },
                  '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.6)' }
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleGenerate}
                  disabled={loading || !formData.prompt.trim()}
                  startIcon={<AutoAwesome />}
                  sx={{ 
                    px: 4, 
                    py: 1.5,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.3)',
                    }
                  }}
                >
                  {loading ? '생성 중...' : 'AI 원고 생성'}
                </Button>

                {drafts.length > 0 && (
                  <Button
                    variant="outlined"
                    onClick={handleRegenerate}
                    disabled={loading}
                    startIcon={<Refresh />}
                    sx={{ 
                      borderColor: 'rgba(255,255,255,0.5)', 
                      color: 'white',
                      '&:hover': {
                        borderColor: 'white',
                        backgroundColor: 'rgba(255,255,255,0.1)'
                      }
                    }}
                  >
                    다시 생성
                  </Button>
                )}
              </Box>

              {loading && (
                <Box sx={{ mt: 3 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={progress} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: 'white'
                      }
                    }} 
                  />
                  <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                    {progress < 30 && '입력 내용을 분석하고 있습니다...'}
                    {progress >= 30 && progress < 70 && 'AI가 원고를 생성하고 있습니다...'}
                    {progress >= 70 && progress < 100 && '생성된 원고를 검토하고 있습니다...'}
                    {progress >= 100 && '완료되었습니다!'}
                  </Typography>
                </Box>
              )}

              {error && (
                <Alert severity="error" sx={{ mt: 2, backgroundColor: 'rgba(244, 67, 54, 0.1)', color: 'white' }}>
                  {error}
                </Alert>
              )}
            </Grid>
          </Grid>
        </Paper>

        {/* 중간: 생성된 원고들 (3열 그리드) */}
        {drafts.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Assignment sx={{ mr: 1 }} />
              생성된 원고 ({drafts.length}개)
            </Typography>

            <Grid container spacing={3}>
              {drafts.map((draft, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Card 
                    elevation={3}
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 6
                      }
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', flex: 1 }}>
                          {draft.title}
                        </Typography>
                        <Chip 
                          size="small" 
                          label={`${draft.wordCount || 0}자`} 
                          variant="outlined"
                        />
                      </Box>

                      <Divider sx={{ mb: 2 }} />

                      <Box 
                        sx={{ 
                          maxHeight: 300, 
                          overflow: 'auto', 
                          mb: 3,
                          '& p': { 
                            mb: 1.5, 
                            lineHeight: 1.6,
                            fontSize: '0.9rem'
                          },
                          '&::-webkit-scrollbar': {
                            width: '6px',
                          },
                          '&::-webkit-scrollbar-track': {
                            background: '#f1f1f1',
                            borderRadius: '3px',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            background: '#c1c1c1',
                            borderRadius: '3px',
                          },
                        }}
                        dangerouslySetInnerHTML={{ __html: draft.content }}
                      />
                    </CardContent>

                    <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ContentCopy />}
                        onClick={() => handleCopyText(draft)}
                        sx={{ minWidth: 'auto' }}
                      >
                        복사
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Save />}
                        onClick={() => handleSaveDraft(draft, index)}
                      >
                        저장
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* 하단: AI 원고 생성기 안내 */}
        {drafts.length === 0 && (
          <Paper sx={{ p: 6, textAlign: 'center', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
            <AutoAwesome sx={{ fontSize: 64, color: '#667eea', mb: 2 }} />
            <Typography variant="h4" gutterBottom color="primary" fontWeight="bold">
              AI 원고 생성기
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
              상단의 설정 패널에서 주제와 카테고리를 선택하고 '생성' 버튼을 클릭하세요.
            </Typography>
            
            <Grid container spacing={3} sx={{ mt: 2, maxWidth: 800, mx: 'auto' }}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Assignment sx={{ fontSize: 48, color: '#667eea', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    3개 초안 동시 생성
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    한 번의 요청으로 다양한 스타일의 원고 3개를 생성합니다
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Speed sx={{ fontSize: 48, color: '#667eea', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    즉시 사용 가능
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    별도 수정 없이 바로 포스팅할 수 있는 완성도 높은 원고
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <AutoAwesome sx={{ fontSize: 48, color: '#667eea', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    전문 품질 보장
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    정치인 전용 AI로 전문적이고 적절한 톤앤매너 유지
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Typography variant="body1" color="text.secondary" sx={{ mt: 4, fontStyle: 'italic' }}>
              💡 팁: 구체적이고 명확한 주제를 입력할수록 더 정확한 원고가 생성됩니다
            </Typography>
          </Paper>
        )}
      </Container>
    </DashboardLayout>
  );
};

export default GeneratePage;