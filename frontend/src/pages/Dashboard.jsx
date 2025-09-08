// frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Grid,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Divider,
  Chip,
  LinearProgress,
  Card,
  CardContent,
  Snackbar
} from '@mui/material';
import {
  Create,
  KeyboardArrowRight,
  MoreVert,
  Settings,
  TrendingUp,
  CalendarToday,
  Notifications,
  CheckCircle,
  Warning,
  CreditCard,
  Schedule,
  ContentCopy
} from '@mui/icons-material';
import { LoadingSpinner } from '../components/loading';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import NoticeBanner from '../components/dashboard/NoticeBanner';
import ElectionDDay from '../components/dashboard/ElectionDDay';
import PublishingProgress from '../components/dashboard/PublishingProgress';
import PostViewerModal from '../components/PostViewerModal';
import { useAuth } from '../hooks/useAuth';
import { getUserFullTitle, getUserDisplayTitle, getUserRegionInfo, getUserStatusIcon } from '../utils/userUtils';
import { functions } from '../services/firebase';
import { httpsCallable } from 'firebase/functions';
import HelpButton from '../components/HelpButton';
import DashboardGuide from '../components/guides/DashboardGuide';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // 상태 관리
  const [usage, setUsage] = useState({ postsGenerated: 0, monthlyLimit: 50 });
  const [recentPosts, setRecentPosts] = useState([]);
  const [notices, setNotices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  
  // 모달 관리
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPost, setViewerPost] = useState(null);

  // 사용자 정보
  const userTitle = getUserFullTitle(user);
  const userIcon = getUserStatusIcon(user);
  const regionInfo = getUserRegionInfo(user);
  
  // 플랜 정보 (실제 사용자 데이터 기반)
  const isAdmin = user?.role === 'admin';
  const planName = isAdmin ? '관리자' : getPlanName(usage.monthlyLimit);

  // 플랜명 결정 함수
  function getPlanName(limit) {
    if (limit >= 90) return '오피니언 리더';
    if (limit >= 30) return '리전 인플루언서';
    return '로컬 블로거';
  }

  // 플랜별 색상 가져오기
  function getPlanColor(planName) {
    switch(planName) {
      case '로컬 블로거': return '#003a87';
      case '리전 인플루언서': return '#55207d';
      case '오피니언 리더': return '#006261';
      default: return '#003a87';
    }
  }

  const planColor = getPlanColor(planName);

  // 데이터 로딩 함수 (재사용 가능하도록 분리)
  const fetchDashboardData = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // 사용량 정보와 포스트 목록을 별도로 호출
      const getDashboardDataFn = httpsCallable(functions, 'getDashboardData');
      const getUserPostsFn = httpsCallable(functions, 'getUserPosts');
      
      // 병렬로 두 함수 호출
      const [dashboardResponse, postsResponse] = await Promise.all([
        getDashboardDataFn(),
        getUserPostsFn()
      ]);
      
      const dashboardData = dashboardResponse.data;
      const postsData = postsResponse.data?.posts || [];
      
      // 사용량 정보 설정
      setUsage(dashboardData.usage || { postsGenerated: 0, monthlyLimit: 50 });
      
      // 히스토리 페이지와 동일한 포스트 목록 사용 (최신순으로 정렬)
      const sortedPosts = postsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRecentPosts(sortedPosts);
      
    } catch (err) {
      console.error('❌ Dashboard: 데이터 요청 실패:', err);
      
      // 에러 처리
      let errorMessage = '데이터를 불러오는 데 실패했습니다.';
      if (err.code === 'functions/unauthenticated') {
        errorMessage = '로그인이 필요합니다.';
      } else if (err.code === 'functions/internal') {
        errorMessage = '서버에서 오류가 발생했습니다.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 실제 데이터 로딩
  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  // 페이지 포커스 시 데이터 새로고침 (새 포스트 생성 후 대시보드 복귀 시)
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Dashboard 페이지 포커스 - 데이터 새로고침');
      fetchDashboardData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  // 공지사항 별도 로딩 (대시보드 데이터와 독립적으로)
  useEffect(() => {
    const fetchNotices = async () => {
      if (!user?.uid) return;

      try {
        const getActiveNoticesFn = httpsCallable(functions, 'getActiveNotices');
        const noticesResponse = await getActiveNoticesFn();
        
        // 올바른 경로로 공지사항 데이터 추출
        const noticesData = noticesResponse.data?.notices || [];
        setNotices(noticesData);
        
      } catch (noticeError) {
        console.error('❌ 공지사항 로딩 실패:', noticeError);
        setNotices([]);
      }
    };

    fetchNotices();
  }, [user]);


  // 이벤트 핸들러들
  const handleGeneratePost = () => {
    // 비활성화 조건 체크는 버튼 레벨에서 처리
    navigate('/generate');
  };

  const handleChangePlan = () => {
    navigate('/profile');
  };

  const handleViewAllPosts = () => {
    navigate('/posts');
  };

  const handleViewBilling = () => {
    navigate('/billing');
  };

  // 유틸리티 함수들 (PostsListPage에서 가져옴)
  const formatDate = (iso) => {
    try {
      if (!iso) return '-';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '-';
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${day} ${hh}:${mm}`;
    } catch {
      return '-';
    }
  };

  const stripHtml = (html = '') => {
    try {
      return html.replace(/<[^>]*>/g, '');
    } catch {
      return html || '';
    }
  };

  const handlePostClick = (postId) => {
    const post = recentPosts.find(p => p.id === postId);
    if (post) {
      setViewerPost(post);
      setViewerOpen(true);
    }
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerPost(null);
  };

  const handleDelete = async (postId, e) => {
    if (e) e.stopPropagation();
    if (!postId) return;
    const ok = window.confirm('정말 이 원고를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.');
    if (!ok) return;
    try {
      // HTTP 요청으로 변경 (CORS 문제 해결)
      const token = await user.getIdToken();
      const response = await fetch('https://asia-northeast3-ai-secretary-6e9c8.cloudfunctions.net/deletePost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ postId })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || '삭제에 실패했습니다.');
      }
      
      // 대시보드의 최근 포스트 목록에서 제거
      setRecentPosts((prev) => prev.filter((p) => p.id !== postId));
      
      setSnack({ open: true, message: '삭제되었습니다.', severity: 'info' });
      if (viewerPost?.id === postId) {
        setViewerOpen(false);
        setViewerPost(null);
      }
    } catch (err) {
      console.error(err);
      setSnack({ open: true, message: err.message || '삭제에 실패했습니다.', severity: 'error' });
    }
  };

  const handleCopy = (content, e) => {
    if (e) e.stopPropagation();
    try {
      const text = stripHtml(content);
      navigator.clipboard.writeText(text);
      setSnack({ open: true, message: '클립보드에 복사되었습니다!', severity: 'success' });
    } catch (err) {
      console.error(err);
      setSnack({ open: true, message: '복사에 실패했습니다.', severity: 'error' });
    }
  };


  // 사용량 퍼센트 계산
  const usagePercentage = isAdmin ? 100 : 
    usage.monthlyLimit > 0 ? (usage.postsGenerated / usage.monthlyLimit) * 100 : 0;

  // 로딩 중
  if (isLoading) {
    return (
      <DashboardLayout>
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        </Container>
      </DashboardLayout>
    );
  }

  // 에러 발생
  if (error) {
    return (
      <DashboardLayout>
        <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, md: 4 } }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button variant="contained" onClick={() => window.location.reload()}>
            다시 시도
          </Button>
        </Container>
      </DashboardLayout>
    );
  }

  // 자기소개 완성 여부 확인
  const hasBio = user?.bio && user.bio.trim().length > 0;
  const showBioAlert = !hasBio && !isAdmin;
  
  // 버튼 비활성화 조건 계산
  const canGeneratePost = isAdmin || (hasBio && usage.postsGenerated < usage.monthlyLimit);

  return (
    <DashboardLayout>
      <Container 
        maxWidth="xl" 
        sx={{ 
          py: 4, 
          px: { xs: 2, md: 4 }
        }}
      >
        {/* 공지사항 배너 - 최상단에 위치 */}
        <NoticeBanner />
        
        {/* 자기소개 미작성 알림 */}
        {showBioAlert && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => navigate('/profile')}
              >
                작성하기
              </Button>
            }
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              프로필 설정이 완료되지 않았습니다
            </Typography>
            <Typography variant="body2">
              AI 원고 생성 등 일부 기능을 이용하려면 자기소개 작성이 필요합니다.
            </Typography>
          </Alert>
        )}
        
        {/* 인사말 + 플랜 카드 */}
        <Paper 
          elevation={2} 
          sx={{ 
            p: 3, 
            mb: 3, 
            bgcolor: '#f5f5f5'
          }}
        >
          {/* 모바일 버전 - 수직 스택 */}
          {isMobile ? (
            <Box>
              {/* 인사말 */}
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                안녕하세요, {user?.name || '사용자'} {getUserDisplayTitle(user)} {userIcon}
              </Typography>
              
              {/* 지역 정보 */}
              {regionInfo && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {regionInfo}
                </Typography>
              )}
              
              {/* 플랜 정보 */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="body1">
                  플랜: <strong style={{ color: planColor }}>{planName}</strong>
                </Typography>
                {!isAdmin && (
                  <Typography variant="body2" color="text.secondary">
                    · 잔여 생성: {usage.postsGenerated}/{usage.monthlyLimit}회
                  </Typography>
                )}
                {isAdmin && (
                  <Chip label="무제한" sx={{ bgcolor: planColor, color: 'white' }} size="small" />
                )}
              </Box>
              
              {/* 액션 버튼들 */}
              <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column', mb: 3 }}>
                <Button 
                  variant="contained" 
                  size="large" 
                  startIcon={<Create />}
                  onClick={handleGeneratePost}
                  disabled={!canGeneratePost}
                  fullWidth
                  sx={{ 
                    bgcolor: canGeneratePost ? planColor : '#757575',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': canGeneratePost ? { 
                      bgcolor: planColor, 
                      filter: 'brightness(0.9)',
                      transform: 'scale(0.98)',
                      boxShadow: `0 8px 32px ${planColor}40, 0 4px 16px ${planColor}20`,
                    } : {},
                    '&.Mui-disabled': {
                      bgcolor: '#757575 !important',
                      color: 'rgba(255, 255, 255, 0.6) !important'
                    }
                  }}
                >
                  새 원고 생성
                </Button>
                <Button 
                  variant="outlined" 
                  size="large"
                  startIcon={<Settings />}
                  onClick={handleChangePlan}
                  fullWidth
                  sx={{ 
                    color: planColor, 
                    borderColor: planColor,
                    '&:hover': { borderColor: planColor, bgcolor: `${planColor}08` }
                  }}
                >
                  프로필 수정
                </Button>
              </Box>

              {/* 사용량 현황 */}
              {!isAdmin && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                    이번 달 사용량
                  </Typography>
                  <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        원고 생성
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {usage.postsGenerated}/{usage.monthlyLimit}회
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={usagePercentage} 
                      sx={{ 
                        height: 8, 
                        borderRadius: 4,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: planColor
                        }
                      }}
                    />
                  </Box>
                  <Button 
                    variant="text" 
                    size="small" 
                    onClick={handleViewBilling}
                    sx={{ 
                      color: planColor,
                      fontSize: '0.75rem'
                    }}
                  >
                    플랜 관리
                  </Button>
                </Box>
              )}
              
              {/* 당원 인증 상태 */}
              <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                  <Schedule sx={{ mr: 1, color: '#55207d', fontSize: 18 }} />
                  당원 인증 상태
                </Typography>
                <Alert severity="success" sx={{ mb: 1, py: 0.5 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                    2025년 1분기 인증 완료
                  </Typography>
                </Alert>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  다음 인증 예정: 2025년 4월 1일
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={handleViewBilling}
                  sx={{ 
                    color: '#55207d', 
                    borderColor: '#55207d',
                    fontSize: '0.75rem',
                    py: 0.5
                  }}
                >
                  인증 관리
                </Button>
              </Box>
              
              {/* 사용 안내 */}
              <Alert severity="info" sx={{ mt: 2 }}>
                참고: 한 번 누를 때 원고 1개 생성, 세션당 최대 3회 재생성
              </Alert>
            </Box>
          ) : (
            /* PC 버전 - 수평 레이아웃 (2:1:1 비율) */
            <Box>
              <Grid container spacing={3} alignItems="stretch">
                {/* 인사말 영역 (2/4 = 50%) */}
                <Grid item xs={12} md={6}>
                  {/* 인사말 */}
                  <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                    안녕하세요, {user?.name || '사용자'} {getUserDisplayTitle(user)} {userIcon}
                  </Typography>
                  
                  {/* 지역 정보 */}
                  {regionInfo && (
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                      {regionInfo}
                    </Typography>
                  )}
                  
                  {/* 플랜 정보 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Typography variant="h6">
                      플랜: <strong style={{ color: planColor }}>{planName}</strong>
                    </Typography>
                    {!isAdmin && (
                      <Typography variant="body1" color="text.secondary">
                        · 잔여 생성: {usage.postsGenerated}/{usage.monthlyLimit}회
                      </Typography>
                    )}
                    {isAdmin && (
                      <Chip label="무제한" sx={{ bgcolor: planColor, color: 'white' }} />
                    )}
                  </Box>
                  
                  {/* 사용 안내 */}
                  <Typography variant="body2" color="text.secondary">
                    참고: 클릭 시 원고 1개만 생성, 세션당 재생성 3회 제한
                  </Typography>

                  {/* PC용 사용량 현황 */}
                  {!isAdmin && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        이번 달 사용량
                      </Typography>
                      <Box sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            원고 생성
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {usage.postsGenerated}/{usage.monthlyLimit}회
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={usagePercentage} 
                          sx={{ 
                            height: 6, 
                            borderRadius: 3,
                            '& .MuiLinearProgress-bar': {
                              bgcolor: planColor
                            }
                          }}
                        />
                      </Box>
                      <Button 
                        variant="text" 
                        size="small" 
                        onClick={handleViewBilling}
                        sx={{ 
                          color: planColor,
                          fontSize: '0.75rem'
                        }}
                      >
                        플랜 관리
                      </Button>
                    </Box>
                  )}
                </Grid>
                
                {/* 인증 상태 영역 (1/4 = 25%) */}
                <Grid item xs={12} md={3}>
                  <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, height: 'fit-content' }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                        <Schedule sx={{ mr: 1, color: '#55207d', fontSize: 18 }} />
                        당원 인증 상태
                      </Typography>
                      <Alert severity="success" sx={{ mb: 1, py: 0.5 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                          2025년 1분기 인증 완료
                        </Typography>
                      </Alert>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        다음 인증 예정: 2025년 4월 1일
                      </Typography>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={handleViewBilling}
                        sx={{ 
                          color: '#55207d', 
                          borderColor: '#55207d',
                          fontSize: '0.75rem',
                          py: 0.5,
                          width: '100%'
                        }}
                      >
                        인증 관리
                      </Button>
                    </Box>
                  </Box>
                </Grid>

                {/* 액션 버튼 영역 (1/4 = 25%) */}
                <Grid item xs={12} md={3}>
                  <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
                    <Button 
                      variant="contained" 
                      size="large" 
                      startIcon={<Create />}
                      onClick={handleGeneratePost}
                      disabled={!canGeneratePost}
                      fullWidth
                      sx={{ 
                        bgcolor: canGeneratePost ? planColor : '#757575',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': canGeneratePost ? { 
                          bgcolor: planColor, 
                          filter: 'brightness(0.9)',
                          transform: 'scale(0.98)',
                          boxShadow: `0 8px 32px ${planColor}40, 0 4px 16px ${planColor}20`,
                        } : {},
                        '&.Mui-disabled': {
                          bgcolor: '#757575 !important',
                          color: 'rgba(255, 255, 255, 0.6) !important'
                        }
                      }}
                    >
                      새 원고 생성
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="large"
                      startIcon={<Settings />}
                      onClick={handleChangePlan}
                      fullWidth
                      sx={{ 
                        color: planColor, 
                        borderColor: planColor,
                        '&:hover': { borderColor: planColor, bgcolor: `${planColor}08` }
                      }}
                    >
                      프로필 수정
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>

        {/* 콘텐츠 섹션 */}
        {isMobile ? (
          /* 모바일 - 수직 스택 */
          <Box>
            {/* 공지사항 카드 - 항상 표시 */}
            <Paper elevation={1} sx={{ mb: 3 }}>
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                  <Notifications sx={{ mr: 1, color: '#55207D' }} />
                  공지사항
                </Typography>
              </Box>
              
              {notices.length === 0 ? (
                <Box sx={{ p: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    현재 공지사항이 없습니다.
                  </Typography>
                </Box>
              ) : (
                <>
                  <List>
                    {notices.slice(0, 5).map((notice, index) => (
                      <React.Fragment key={notice.id || index}>
                        <ListItem sx={{ alignItems: 'flex-start' }}>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    {notice.title || '제목 없음'}
                                  </Typography>
                                  {notice.priority === 'high' && (
                                    <Chip label="중요" color="error" size="small" />
                                  )}
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                  {notice.createdAt ? new Date(notice.createdAt).toLocaleDateString('ko-KR', { 
                                    month: 'short', 
                                    day: 'numeric' 
                                  }) : ''}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{
                                  mt: 0.5,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical'
                                }}
                              >
                                {notice.content || '내용 없음'}
                              </Typography>
                            }
                          />
                        </ListItem>
                        {index < Math.min(notices.length, 5) - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                  
                  {notices.length > 5 && (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Button variant="text" size="small" sx={{ color: planColor }}>
                        더 보기 ({notices.length - 5}개 더)
                      </Button>
                    </Box>
                  )}
                </>
              )}
            </Paper>

            {/* 발행 진행률 카드 */}
            <Box sx={{ mb: 3 }}>
              <PublishingProgress />
            </Box>

            {/* 선거 일정 카드 */}
            <Box sx={{ mb: 3 }}>
              <ElectionDDay 
                position={user?.position || '기초의원'} 
                status={user?.status || '현역'} 
              />
            </Box>


            {/* 최근 생성한 글 */}
            <Paper elevation={1} sx={{ mb: 3 }}>
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  최근 생성한 글
                </Typography>
              </Box>
              
              {recentPosts.length > 0 ? (
                <>
                  <List>
                    {recentPosts.slice(0, 5).map((post, index) => (
                      <React.Fragment key={post.id}>
                        <ListItem 
                          button 
                          onClick={() => handlePostClick(post.id)}
                        >
                          <ListItemText
                            primary={`${index + 1}) ${new Date(post.createdAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} ${post.title || '제목 없음'}`}
                            secondary={post.category || '일반'}
                          />
                          <ListItemSecondaryAction>
                            <IconButton edge="end" onClick={() => handlePostClick(post.id)}>
                              <KeyboardArrowRight />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                        {index < Math.min(recentPosts.length, 5) - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Button variant="text" onClick={handleViewAllPosts} sx={{ color: planColor }}>
                      전체 보기
                    </Button>
                  </Box>
                </>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    아직 생성한 원고가 없습니다.
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        ) : (
          /* PC - 반응형 레이아웃: 2K 이상에서 3컬럼, 이하에서 2컬럼 */
          <Grid container spacing={3}>
            {/* 좌측: 최근 생성한 글 */}
            <Grid item xs={12} md={6} xl={4}>
              <Paper elevation={1} sx={{ height: 'fit-content' }}>
                <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    최근 생성한 글
                  </Typography>
                </Box>
                
                {recentPosts.length > 0 ? (
                  <List>
                    {recentPosts.slice(0, 5).map((post, index) => (
                      <React.Fragment key={post.id}>
                        <ListItem 
                          button 
                          onClick={() => handlePostClick(post.id)}
                        >
                          <ListItemText
                            primary={`${new Date(post.createdAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} ${post.title || '제목 없음'}`}
                            secondary={post.category || '일반'}
                          />
                          <ListItemSecondaryAction>
                            <IconButton edge="end" onClick={(e) => {
                              e.stopPropagation();
                            }}>
                              <MoreVert />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                        {index < Math.min(recentPosts.length, 5) - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      아직 생성한 원고가 없습니다.
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* 가운데: 공지사항 (2K 이상에서만 표시) */}
            <Grid 
              item 
              xl={4}
              sx={{ 
                display: { xs: 'none', xl: 'block' } // 2K 미만에서는 숨김
              }}
            >
              <Paper elevation={1} sx={{ height: 'fit-content' }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                    <Notifications sx={{ mr: 1, color: '#55207D' }} />
                    공지사항
                  </Typography>
                </Box>
                
                {notices.length === 0 ? (
                  <Box sx={{ p: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      현재 공지사항이 없습니다.
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <List>
                      {notices.slice(0, 8).map((notice, index) => ( // 더 많은 공지사항 표시
                        <React.Fragment key={notice.id || index}>
                          <ListItem sx={{ alignItems: 'flex-start' }}>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                      {notice.title || '제목 없음'}
                                    </Typography>
                                    {notice.priority === 'high' && (
                                      <Chip label="중요" color="error" size="small" />
                                    )}
                                  </Box>
                                  <Typography variant="caption" color="text.secondary">
                                    {notice.createdAt ? new Date(notice.createdAt).toLocaleDateString('ko-KR', { 
                                      month: 'short', 
                                      day: 'numeric' 
                                    }) : ''}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary"
                                  sx={{
                                    mt: 0.5,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical'
                                  }}
                                >
                                  {notice.content || '내용 없음'}
                                </Typography>
                              }
                            />
                          </ListItem>
                          {index < Math.min(notices.length, 8) - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                    
                    {notices.length > 8 && (
                      <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Button variant="text" size="small" sx={{ color: planColor }}>
                          더 보기 ({notices.length - 8}개 더)
                        </Button>
                      </Box>
                    )}
                  </>
                )}
              </Paper>
            </Grid>

            {/* 우측: 발행 진행률(상단) + 선거일정(하단), 2K 미만에서는 공지사항도 포함 */}
            <Grid item xs={12} md={6} xl={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* 발행 진행률 카드 - 항상 상단에 */}
                <PublishingProgress />

                {/* 2K 이상에서 표시되는 선거 일정 */}
                <Box sx={{ display: { xs: 'none', xl: 'block' } }}>
                  <ElectionDDay 
                    position={user?.position || '기초의원'} 
                    status={user?.status || '현역'} 
                  />
                </Box>

                {/* 2K 미만에서만 표시되는 공지사항 */}
                <Box sx={{ display: { xs: 'block', xl: 'none' } }}>
                  <Paper elevation={1}>
                    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                        <Notifications sx={{ mr: 1, color: '#55207D' }} />
                        공지사항
                      </Typography>
                    </Box>
                    
                    {notices.length === 0 ? (
                      <Box sx={{ p: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                          현재 공지사항이 없습니다.
                        </Typography>
                      </Box>
                    ) : (
                      <>
                        <List>
                          {notices.slice(0, 5).map((notice, index) => (
                            <React.Fragment key={notice.id || index}>
                              <ListItem sx={{ alignItems: 'flex-start' }}>
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                          {notice.title || '제목 없음'}
                                        </Typography>
                                        {notice.priority === 'high' && (
                                          <Chip label="중요" color="error" size="small" />
                                        )}
                                      </Box>
                                      <Typography variant="caption" color="text.secondary">
                                        {notice.createdAt ? new Date(notice.createdAt).toLocaleDateString('ko-KR', { 
                                          month: 'short', 
                                          day: 'numeric' 
                                        }) : ''}
                                      </Typography>
                                    </Box>
                                  }
                                  secondary={
                                    <Typography 
                                      variant="body2" 
                                      color="text.secondary"
                                      sx={{
                                        mt: 0.5,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical'
                                      }}
                                    >
                                      {notice.content || '내용 없음'}
                                    </Typography>
                                  }
                                />
                              </ListItem>
                              {index < Math.min(notices.length, 5) - 1 && <Divider />}
                            </React.Fragment>
                          ))}
                        </List>
                        
                        {notices.length > 5 && (
                          <Box sx={{ p: 2, textAlign: 'center' }}>
                            <Button variant="text" size="small" sx={{ color: planColor }}>
                              더 보기 ({notices.length - 5}개 더)
                            </Button>
                          </Box>
                        )}
                      </>
                    )}
                  </Paper>
                </Box>

                {/* 2K 미만에서만 표시되는 선거 일정 */}
                <Box sx={{ display: { xs: 'block', xl: 'none' } }}>
                  <ElectionDDay 
                    position={user?.position || '기초의원'} 
                    status={user?.status || '현역'} 
                  />
                </Box>

              </Box>
            </Grid>
          </Grid>
        )}
      </Container>

      {/* 원고 보기 모달 */}
      <PostViewerModal
        open={viewerOpen}
        onClose={closeViewer}
        post={viewerPost}
        onDelete={handleDelete}
      />

      {/* 스낵바 */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          sx={{ width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>

      {/* 도움말 버튼 */}
      <HelpButton title="대시보드 사용 가이드">
        <DashboardGuide />
      </HelpButton>
    </DashboardLayout>
  );
};

export default Dashboard;