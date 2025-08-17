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
  CardContent
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
  Schedule
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import NoticeBanner from '../components/NoticeBanner';
import { useAuth } from '../hooks/useAuth';
import { getUserFullTitle, getUserDisplayTitle, getUserRegionInfo, getUserStatusIcon } from '../utils/userUtils';
import { functions } from '../services/firebase';
import { httpsCallable } from 'firebase/functions';

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

  // 실제 데이터 로딩
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.uid) return;
      
      setIsLoading(true);
      setError(null);

      try {
        console.log('🔥 Dashboard 데이터 로딩 시작');
        
        // Firebase Functions 호출
        const getDashboardDataFn = httpsCallable(functions, 'getDashboardData');
        const response = await getDashboardDataFn();
        
        console.log('✅ Dashboard 응답:', response.data);
        
        const dashboardData = response.data.data;
        
        // 사용량 정보 설정
        setUsage(dashboardData.usage || { postsGenerated: 0, monthlyLimit: 50 });
        
        // 최근 포스트 설정
        setRecentPosts(dashboardData.recentPosts || []);
        
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

    fetchDashboardData();
  }, [user]);

  // 공지사항 별도 로딩 (대시보드 데이터와 독립적으로)
  useEffect(() => {
    const fetchNotices = async () => {
      if (!user?.uid) return;

      try {
        console.log('🔥 공지사항 로딩 시작');
        
        const getActiveNoticesFn = httpsCallable(functions, 'getActiveNotices');
        const noticesResponse = await getActiveNoticesFn();
        
        console.log('✅ 공지사항 응답:', noticesResponse.data);
        
        // 올바른 경로로 공지사항 데이터 추출
        const noticesData = noticesResponse.data?.data?.notices || [];
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
    navigate('/generate');
  };

  const handleChangePlan = () => {
    navigate('/profile');
  };

  const handleViewAllPosts = () => {
    navigate('/posts');
  };

  const handlePostClick = (postId) => {
    navigate(`/post/${postId}`);
  };

  const handleViewBilling = () => {
    navigate('/billing');
  };

  // 사용량 퍼센트 계산
  const usagePercentage = isAdmin ? 100 : 
    usage.monthlyLimit > 0 ? (usage.postsGenerated / usage.monthlyLimit) * 100 : 0;

  // 로딩 중
  if (isLoading) {
    return (
      <DashboardLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>로딩 중...</Typography>
        </Box>
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

  return (
    <DashboardLayout>
      <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, md: 4 } }}>
        {/* 공지사항 배너 - 최상단에 위치 */}
        <NoticeBanner />
        
        {/* 인사말 + 플랜 카드 */}
        <Paper 
          elevation={2} 
          sx={{ 
            p: 3, 
            mb: 3, 
            background: `linear-gradient(135deg, ${planColor}15, ${planColor}08)`
          }}
        >
          {/* 모바일 버전 - 수직 스택 */}
          {isMobile ? (
            <Box>
              {/* 인사말 */}
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                안녕하세요, {user?.name || '사용자'} {getUserDisplayTitle(user)}님 {userIcon}
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
                  fullWidth
                  sx={{ 
                    bgcolor: planColor,
                    '&:hover': { bgcolor: planColor, filter: 'brightness(0.9)' }
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
              
              {/* 사용 안내 */}
              <Alert severity="info" sx={{ mt: 2 }}>
                참고: 한 번 누를 때 원고 1개 생성, 세션당 최대 3회 재생성
              </Alert>
            </Box>
          ) : (
            /* PC 버전 - 수평 레이아웃 */
            <Box>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={8}>
                  {/* 인사말 */}
                  <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                    안녕하세요, {user?.name || '사용자'} {getUserDisplayTitle(user)}님 {userIcon}
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
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button 
                      variant="contained" 
                      size="large" 
                      startIcon={<Create />}
                      onClick={handleGeneratePost}
                      fullWidth
                      sx={{ 
                        bgcolor: planColor,
                        '&:hover': { bgcolor: planColor, filter: 'brightness(0.9)' }
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

                    {/* PC용 사용량 현황 */}
                    {!isAdmin && (
                      <Box sx={{ mt: 1 }}>
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
                  <Notifications sx={{ mr: 1, color: '#e91e63' }} />
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
                    {notices.slice(0, 3).map((notice, index) => (
                      <React.Fragment key={notice.id || index}>
                        <ListItem>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {notice.title || '제목 없음'}
                                </Typography>
                                {notice.priority === 'high' && (
                                  <Chip label="중요" color="error" size="small" />
                                )}
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
                        {index < Math.min(notices.length, 3) - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                  
                  {notices.length > 3 && (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Button variant="text" size="small" sx={{ color: planColor }}>
                        더 보기 ({notices.length - 3}개 더)
                      </Button>
                    </Box>
                  )}
                </>
              )}
            </Paper>

            {/* 다음 인증 일정 카드 */}
            <Paper elevation={1} sx={{ mb: 3 }}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <Schedule sx={{ mr: 1, color: '#55207d' }} />
                  당원 인증 상태
                </Typography>
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    2025년 1분기 인증 완료
                  </Typography>
                </Alert>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  다음 인증 예정: 2025년 4월 1일
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={handleViewBilling}
                  sx={{ 
                    color: '#55207d', 
                    borderColor: '#55207d' 
                  }}
                >
                  인증 관리
                </Button>
              </Box>
            </Paper>

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
                    {recentPosts.slice(0, 3).map((post, index) => (
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
                        {index < Math.min(recentPosts.length, 3) - 1 && <Divider />}
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
          /* PC - 2컬럼 레이아웃 */
          <Grid container spacing={3}>
            {/* 좌측: 최근 생성한 글 */}
            <Grid item xs={12} md={6}>
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

            {/* 우측: 사이드바 카드들 */}
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* 공지사항 카드 - 항상 표시 */}
                <Paper elevation={1}>
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                      <Notifications sx={{ mr: 1, color: '#e91e63' }} />
                      공지사항
                    </Typography>
                    
                    {notices.length === 0 ? (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          현재 공지사항이 없습니다.
                        </Typography>
                      </Box>
                    ) : (
                      <>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {notices.slice(0, 2).map((notice, index) => (
                            <Box 
                              key={notice.id || index}
                              sx={{ 
                                p: 2, 
                                border: '1px solid', 
                                borderColor: 'divider',
                                borderRadius: 1,
                                bgcolor: notice.priority === 'high' ? '#ffebee' : 'background.paper'
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {notice.title || '제목 없음'}
                                </Typography>
                                {notice.priority === 'high' && (
                                  <Chip label="중요" color="error" size="small" />
                                )}
                              </Box>
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical'
                                }}
                              >
                                {notice.content || '내용 없음'}
                              </Typography>
                            </Box>
                          ))}
                        </Box>

                        {notices.length > 2 && (
                          <Button 
                            variant="text" 
                            size="small" 
                            fullWidth 
                            sx={{ mt: 2, color: planColor }}
                          >
                            더 보기 ({notices.length - 2}개 더)
                          </Button>
                        )}
                      </>
                    )}
                  </Box>
                </Paper>

                {/* 당원 인증 상태 */}
                <Paper elevation={1}>
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                      <Schedule sx={{ mr: 1, color: '#55207d' }} />
                      당원 인증 상태
                    </Typography>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        2025년 1분기 인증 완료
                      </Typography>
                    </Alert>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      다음 인증 예정: 2025년 4월 1일
                    </Typography>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={handleViewBilling}
                      sx={{ 
                        color: '#55207d', 
                        borderColor: '#55207d' 
                      }}
                    >
                      인증 관리
                    </Button>
                  </Box>
                </Paper>
              </Box>
            </Grid>
          </Grid>
        )}
      </Container>
    </DashboardLayout>
  );
};

export default Dashboard;