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
  Chip
} from '@mui/material';
import {
  Create,
  KeyboardArrowRight,
  MoreVert,
  Settings
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
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
        {/* 인사말 + 플랜 카드 */}
        <Paper 
          elevation={2} 
          sx={{ 
            p: 3, 
            mb: 3, 
            background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}08)`
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
                  플랜: <strong>{planName}</strong>
                </Typography>
                {!isAdmin && (
                  <Typography variant="body2" color="text.secondary">
                    · 잔여 생성: {usage.postsGenerated}/{usage.monthlyLimit}회
                  </Typography>
                )}
                {isAdmin && (
                  <Chip label="무제한" color="primary" size="small" />
                )}
              </Box>
              
              {/* 액션 버튼들 */}
              <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
                <Button 
                  variant="contained" 
                  size="large" 
                  startIcon={<Create />}
                  onClick={handleGeneratePost}
                  fullWidth
                >
                  새 원고 생성
                </Button>
                <Button 
                  variant="outlined" 
                  size="large"
                  startIcon={<Settings />}
                  onClick={handleChangePlan}
                  fullWidth
                >
                  플랜 변경
                </Button>
              </Box>
              
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
                      플랜: <strong>{planName}</strong>
                    </Typography>
                    {!isAdmin && (
                      <Typography variant="body1" color="text.secondary">
                        · 잔여 생성: {usage.postsGenerated}/{usage.monthlyLimit}회
                      </Typography>
                    )}
                    {isAdmin && (
                      <Chip label="무제한" color="primary" />
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
                    >
                      새 원고 생성
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="large"
                      startIcon={<Settings />}
                      onClick={handleChangePlan}
                      fullWidth
                    >
                      플랜 변경
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
                    <Button variant="text" color="primary" onClick={handleViewAllPosts}>
                      전체 보기
                    </Button>
                  </Box>
                </>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    아직 생성한 원고가 없습니다.
                  </Typography>
                  <Button 
                    variant="outlined" 
                    startIcon={<Create />}
                    onClick={handleGeneratePost}
                    sx={{ mt: 2 }}
                  >
                    첫 원고 작성하기
                  </Button>
                </Box>
              )}
            </Paper>

            {/* 공지사항 - 추후 구현 예정 */}
            <Paper elevation={1}>
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  공지사항
                </Typography>
              </Box>
              
              {/* 임시 공지사항 (실제 구현 전까지) */}
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  새로운 공지사항이 있을 때 여기에 표시됩니다.
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  공지 시스템 준비 중...
                </Typography>
              </Box>
            </Paper>
          </Box>
        ) : (
          /* PC - 2컬럼 레이아웃 */
          <Grid container spacing={3}>
            {/* 좌측: 최근 생성한 글 */}
            <Grid item xs={12} md={7}>
              <Paper elevation={1}>
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
                              // 추가 옵션 메뉴
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
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      아직 생성한 원고가 없습니다.
                    </Typography>
                    <Button 
                      variant="outlined" 
                      startIcon={<Create />}
                      onClick={handleGeneratePost}
                    >
                      첫 원고 작성하기
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* 우측: 공지사항 - 추후 구현 예정 */}
            <Grid item xs={12} md={5}>
              <Paper elevation={1}>
                <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    공지사항
                  </Typography>
                </Box>
                
                {/* 임시 공지사항 (실제 구현 전까지) */}
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    새로운 공지사항이 있을 때 여기에 표시됩니다.
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    공지 시스템 준비 중...
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Container>
    </DashboardLayout>
  );
};

export default Dashboard;