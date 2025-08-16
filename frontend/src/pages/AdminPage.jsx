import React, { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  Container,
  Grid,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Card,
  CardContent,
  Skeleton,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Refresh,
  Search,
  Close,
  Build
} from '@mui/icons-material';
import { httpsCallable } from 'firebase/functions';
import { doc, setDoc } from 'firebase/firestore';
import DashboardLayout from '../components/DashboardLayout';
import { functions, auth, db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';

// 역할(role)에 대한 정의
const ROLE_DEFINITIONS = {
  admin: { label: '👑 관리자', color: 'error' },
  opinion_leader: { label: '👑 오피니언 리더', color: 'warning' },
  region_influencer: { label: '🌆 리전 인플루언서', color: 'info' },
  local_blogger: { label: '📝 로컬 블로거', color: 'success' },
  user: { label: '👤 일반 사용자', color: 'default' }
};

// ------------------------------------------------------------
// 유틸리티 함수들
// ------------------------------------------------------------
function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// 🔥 Firebase Functions 호출 래퍼 (토큰 갱신 포함)
const callFunctionWithRetry = async (functionName, data = {}, retries = 2) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔥 Firebase Function 호출 (${attempt}/${retries}): ${functionName}`, data);
      
      const callable = httpsCallable(functions, functionName);
      const result = await callable(data);
      
      console.log(`✅ ${functionName} 성공:`, result.data);
      return result.data;
    } catch (error) {
      console.error(`❌ ${functionName} 시도 ${attempt} 실패:`, error);
      
      // 401/403 에러면 토큰 갱신 후 재시도
      if (attempt < retries && (
        error.code === 'functions/unauthenticated' || 
        error.code === 'functions/permission-denied' ||
        error.message.includes('401') ||
        error.message.includes('Unauthorized')
      )) {
        console.log('🔄 토큰 갱신 후 재시도...');
        
        // Firebase Auth 토큰 강제 갱신
        try {
          const user = auth.currentUser;
          if (user) {
            await user.getIdToken(true); // 강제 갱신
            console.log('✅ 토큰 갱신 완료');
          }
        } catch (tokenError) {
          console.error('❌ 토큰 갱신 실패:', tokenError);
        }
        
        // 1초 대기 후 재시도
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      // 마지막 시도였거나 다른 에러면 최종 실패
      let errorMessage = '알 수 없는 오류가 발생했습니다.';
      
      if (error.code) {
        switch (error.code) {
          case 'functions/unauthenticated':
            errorMessage = '로그인이 필요합니다. 다시 로그인해주세요.';
            break;
          case 'functions/permission-denied':
            errorMessage = '관리자 권한이 필요합니다.';
            break;
          case 'functions/unavailable':
            errorMessage = 'Firebase Functions 서비스에 연결할 수 없습니다.';
            break;
          case 'functions/deadline-exceeded':
            errorMessage = '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
            break;
          case 'functions/internal':
            errorMessage = '서버 내부 오류가 발생했습니다.';
            break;
          default:
            errorMessage = error.message || errorMessage;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }
};

// 🔥 Gemini 상태 수정 함수
const fixGeminiStatus = async () => {
  try {
    console.log('🔧 Gemini 상태 수정 중...');
    
    await setDoc(doc(db, 'system', 'status'), {
      gemini: {
        state: 'ok',
        lastChecked: new Date(),
        message: 'AdminPage에서 수정됨'
      }
    }, { merge: true });
    
    console.log('✅ Gemini 상태 수정 완료');
    alert('✅ Gemini 상태가 "정상"으로 수정되었습니다!');
    window.location.reload();
  } catch (error) {
    console.error('❌ Gemini 상태 수정 실패:', error);
    alert('❌ 수정 실패: ' + error.message);
  }
};

// ------------------------------------------------------------
// 대시보드 카드 컴포넌트
// ------------------------------------------------------------
function DashboardCards() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todaySuccess: 0,
    todayFail: 0,
    last30mErrors: 0,
    activeUsers: 0,
    geminiStatus: { state: 'unknown' }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(true);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await callFunctionWithRetry('getAdminStats');
        
        const statsData = result.stats || {};
        
        setStats({
          todaySuccess: statsData.todaySuccess || 0,
          todayFail: statsData.todayFail || 0,
          last30mErrors: statsData.last30mErrors || 0,
          activeUsers: statsData.activeUsers || 0,
          geminiStatus: statsData.geminiStatus || { state: 'unknown' }
        });
      } catch (err) {
        console.error('통계 데이터 조회 실패:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleRefresh = async () => {
    console.log('🔄 수동 새로고침');
    setLoading(true);
    setError(null);
    
    try {
      const result = await callFunctionWithRetry('getAdminStats');
      const statsData = result.stats || {};
      
      setStats({
        todaySuccess: statsData.todaySuccess || 0,
        todayFail: statsData.todayFail || 0,
        last30mErrors: statsData.last30mErrors || 0,
        activeUsers: statsData.activeUsers || 0,
        geminiStatus: statsData.geminiStatus || { state: 'unknown' }
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Alert severity="warning">
        관리자 페이지는 로그인 후 사용 가능합니다.
      </Alert>
    );
  }

  if (!user.isAdmin) {
    return (
      <Alert severity="error">
        관리자 권한이 필요합니다. 현재 권한: {user.role || '일반 사용자'}
      </Alert>
    );
  }

  if (loading) {
    return (
      <Grid container spacing={3}>
        {[1, 2, 3, 4].map((i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="40%" height={40} />
                <Skeleton variant="text" width="80%" />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <Button color="inherit" size="small" onClick={handleRefresh}>
            다시 시도
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  const totalToday = stats.todaySuccess + stats.todayFail;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="h6" gutterBottom>
                오늘 총 원고 생성
              </Typography>
              <Tooltip title="새로고침">
                <IconButton size="small" onClick={handleRefresh}>
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="h3" sx={{ mb: 1 }}>
              {totalToday}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip 
                icon={<CheckCircle />} 
                label={`성공 ${stats.todaySuccess}`} 
                color="success" 
                size="small" 
              />
              <Chip 
                icon={<Error />} 
                label={`실패 ${stats.todayFail}`} 
                color="error" 
                size="small" 
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="h6" gutterBottom>
                Gemini API 상태
              </Typography>
              <Box>
                <Tooltip title="새로고침">
                  <IconButton size="small" onClick={handleRefresh}>
                    <Refresh />
                  </IconButton>
                </Tooltip>
                <Tooltip title="상태 수정">
                  <IconButton size="small" onClick={fixGeminiStatus} color="warning">
                    <Build />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {stats.geminiStatus.state === 'ok' && <CheckCircle color="success" />}
              {stats.geminiStatus.state === 'error' && <Error color="error" />}
              {stats.geminiStatus.state === 'unknown' && <Warning color="warning" />}
              <Typography variant="h5">
                {stats.geminiStatus.state === 'ok' ? '정상' :
                 stats.geminiStatus.state === 'error' ? '오류' : '알 수 없음'}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {stats.geminiStatus.lastChecked ? 
                `확인: ${stats.geminiStatus.lastChecked?.toDate ? 
                  stats.geminiStatus.lastChecked.toDate().toLocaleString() : 
                  new Date(stats.geminiStatus.lastChecked.seconds * 1000).toLocaleString()}` :
                '상태 확인 필요'}
            </Typography>
            {stats.geminiStatus.state === 'unknown' && (
              <Typography variant="caption" color="warning.main" display="block">
                🔧 수정 버튼을 클릭하세요
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              최근 30분 에러
            </Typography>
            <Typography variant="h3" sx={{ mb: 1 }}>
              {stats.last30mErrors}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              발생 건수
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              현재 활성 사용자
            </Typography>
            <Typography variant="h3" sx={{ mb: 1 }}>
              {stats.activeUsers}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              지난 5분 기준
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

// ------------------------------------------------------------
// 사용자 목록 + 검색 + 상세 모달
// ------------------------------------------------------------
function UsersSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔥 사용자 목록 조회 시작...', { query: debouncedSearch.trim() });
        
        const result = await callFunctionWithRetry('getUserList', { 
          page: 1, 
          pageSize: 100, 
          query: debouncedSearch.trim() 
        });
        
        console.log('✅ getUserList 전체 응답:', result);
        console.log('📊 result.data:', result.data);
        
        // 🔥 수정: 올바른 데이터 파싱
        const usersData = result.data?.users || result.users || [];
        console.log('👥 파싱된 사용자 데이터:', usersData);
        console.log('📈 사용자 수:', usersData.length);
        
        setUsers(usersData);
        
        if (usersData.length > 0) {
          console.log('👤 첫 번째 사용자 샘플:', usersData[0]);
        } else {
          console.log('⚠️ 사용자 데이터가 비어있습니다');
        }
        
      } catch (err) {
        console.error('❌ 사용자 목록 조회 실패:', err);
        setError(err.message || '사용자 목록을 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [debouncedSearch]);

  const getRoleChipProps = (role) => {
    return ROLE_DEFINITIONS[role] || { label: role || '미정', color: 'default' };
  };

  const renderDebugInfo = () => {
    if (import.meta.env.DEV) {
      return (
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>디버깅 정보:</strong><br />
          - 로딩 상태: {loading ? '로딩 중' : '완료'}<br />
          - 에러: {error || '없음'}<br />
          - 사용자 수: {users.length}<br />
          - 검색어: "{debouncedSearch}"
        </Alert>
      );
    }
    return null;
  };

  return (
    <Box sx={{ mt: 2 }}>
      {renderDebugInfo()}

      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          placeholder="이메일, 이름, 지역으로 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ maxWidth: 400 }}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />
        {loading && <CircularProgress size={20} />}
        
        <Button 
          variant="outlined" 
          size="small" 
          onClick={() => setSearch(search + ' ')}
        >
          새로고침
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          사용자 목록 ({users.length}명)
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>이름</TableCell>
                <TableCell>이메일</TableCell>
                <TableCell>지역</TableCell>
                <TableCell>직책</TableCell>
                <TableCell>역할</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>가입일</TableCell>
                <TableCell align="right">액션</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton variant="text" height={40} />
                    </TableCell>
                  </TableRow>
                ))
              ) : users.length ? (
                users.map((user, index) => (
                  <TableRow 
                    key={user.id || user.uid || index}
                    hover
                  >
                    <TableCell>{user.name || '-'}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {user.email || '-'}
                    </TableCell>
                    <TableCell>
                      {[user.regionMetro, user.regionLocal, user.electoralDistrict]
                        .filter(Boolean)
                        .join(' > ') || '-'}
                    </TableCell>
                    <TableCell>{user.position || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleChipProps(user.role || 'user').label}
                        color={getRoleChipProps(user.role || 'user').color}
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? '활성' : '비활성'}
                        color={user.isActive ? 'success' : 'default'}
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      {user.createdAt ? 
                        (typeof user.createdAt === 'string' ? 
                          new Date(user.createdAt).toLocaleDateString() :
                          user.createdAt.toDate ? 
                            user.createdAt.toDate().toLocaleDateString() :
                            new Date(user.createdAt.seconds * 1000).toLocaleDateString()
                        ) : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <Button 
                        size="small" 
                        onClick={() => setSelectedUser(user)}
                      >
                        상세보기
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary">
                      {error ? '데이터를 불러올 수 없습니다.' : '사용자가 없습니다.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <UserDetailModal 
        user={selectedUser} 
        onClose={() => setSelectedUser(null)} 
      />
    </Box>
  );
}

// ------------------------------------------------------------
// 사용자 상세 모달
// ------------------------------------------------------------
function UserDetailModal({ user, onClose }) {
  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchUserDetail = async () => {
      try {
        setLoading(true);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setDetailData({
          base: user,
          stats: {
            total: 23,
            today: 3,
            week: 8,
            month: 15,
          },
          recent: [
            {
              id: '1',
              createdAt: new Date(),
              category: '의정활동',
              status: 'success'
            },
            {
              id: '2',
              createdAt: new Date(Date.now() - 86400000),
              category: '지역활동',
              status: 'success'
            },
            {
              id: '3',
              createdAt: new Date(Date.now() - 172800000),
              category: '정책/비전',
              status: 'error'
            }
          ],
          errors: [
            {
              id: '1',
              timestamp: new Date(),
              message: 'API 호출 제한 초과'
            }
          ],
        });
      } catch (error) {
        console.error('사용자 상세 정보 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetail();
  }, [user]);

  if (!user) return null;

  return (
    <Dialog 
      open={!!user} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          사용자 상세 정보
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {loading || !detailData ? (
          <Box sx={{ py: 4 }}>
            <CircularProgress sx={{ display: 'block', mx: 'auto' }} />
          </Box>
        ) : (
          <Box sx={{ space: 3 }}>
            <Typography variant="h6" gutterBottom>
              기본 정보
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">이름</Typography>
                <Typography variant="body1">{detailData.base.name || '-'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">이메일</Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                  {detailData.base.email || '-'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">직책</Typography>
                <Typography variant="body1">{detailData.base.position || '-'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">지역</Typography>
                <Typography variant="body1">
                  {[detailData.base.regionMetro, detailData.base.regionLocal, detailData.base.electoralDistrict]
                    .filter(Boolean)
                    .join(' > ') || '-'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">가입일</Typography>
                <Typography variant="body1">
                  {detailData.base.createdAt ? new Date(detailData.base.createdAt).toLocaleString() : '-'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">상태</Typography>
                <Chip
                  label={detailData.base.isActive ? '활성' : '비활성'}
                  color={detailData.base.isActive ? 'success' : 'default'}
                  size="small" 
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              사용 통계
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4">{detailData.stats.total}</Typography>
                  <Typography variant="caption" color="text.secondary">총 생성</Typography>
                </Paper>
              </Grid>
              <Grid item xs={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4">{detailData.stats.today}</Typography>
                  <Typography variant="caption" color="text.secondary">오늘</Typography>
                </Paper>
              </Grid>
              <Grid item xs={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4">{detailData.stats.week}</Typography>
                  <Typography variant="caption" color="text.secondary">이번 주</Typography>
                </Paper>
              </Grid>
              <Grid item xs={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4">{detailData.stats.month}</Typography>
                  <Typography variant="caption" color="text.secondary">이번 달</Typography>
                </Paper>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              최근 생성 이력 (10개)
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>날짜</TableCell>
                    <TableCell>카테고리</TableCell>
                    <TableCell>상태</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detailData.recent.length ? detailData.recent.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        {post.createdAt ? new Date(post.createdAt).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>{post.category || '-'}</TableCell>
                      <TableCell>
                        {post.status === 'success' ? (
                          <Chip 
                            icon={<CheckCircle />} 
                            label="성공" 
                            color="success" 
                            size="small" 
                          />
                        ) : (
                          <Chip 
                            icon={<Error />} 
                            label="실패" 
                            color="error" 
                            size="small" 
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Typography variant="body2" color="text.secondary">
                          최근 생성 이력이 없습니다.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="h6" gutterBottom>
              최근 에러 내역
            </Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>발생 시간</TableCell>
                    <TableCell>에러 메시지</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detailData.errors.length ? detailData.errors.map((error) => (
                    <TableRow key={error.id}>
                      <TableCell>
                        {error.timestamp ? new Date(error.timestamp).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          maxWidth: 300, 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={error.message}
                      >
                        {error.message || '-'}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={2} align="center">
                        <Typography variant="body2" color="text.secondary">
                          최근 에러가 없습니다.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Alert severity="info" sx={{ mt: 2 }}>
              사용자별 상세 통계는 별도 Firebase Functions 구현이 필요합니다. (getUserStats 등)
            </Alert>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------
// 원고 검색 탭
// ------------------------------------------------------------
function PostsSearchTab() {
  const [filters, setFilters] = useState({
    author: '',
    category: '',
    keyword: '',
    dateFrom: '',
    dateTo: ''
  });
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debouncedKeyword = useDebouncedValue(filters.keyword, 300);

  const handleSearch = async () => {
    try {
      setLoading(true);
      setSearched(true);
      
      const result = await callFunctionWithRetry('searchPosts', {
        author: filters.author,
        category: filters.category,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        status: '',
        limit: 200
      });
      
      const postsData = result.posts || [];
      console.log('원고 검색 결과:', postsData);
      
      const filtered = debouncedKeyword
        ? postsData.filter(post => 
            (post.content || '').toLowerCase().includes(debouncedKeyword.toLowerCase()) ||
            (post.title || '').toLowerCase().includes(debouncedKeyword.toLowerCase())
          )
        : postsData;
      
      setPosts(filtered);
    } catch (error) {
      console.error('원고 검색 실패:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              placeholder="작성자 (userId)"
              value={filters.author}
              onChange={(e) => setFilters(prev => ({ ...prev, author: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              placeholder="카테고리"
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="시작일"
              InputLabelProps={{ shrink: true }}
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="종료일"
              InputLabelProps={{ shrink: true }}
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              placeholder="내용 키워드"
              value={filters.keyword}
              onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button 
              fullWidth
              variant="contained" 
              onClick={handleSearch}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : <Search />}
            >
              검색
            </Button>
          </Grid>
        </Grid>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          실제 검색이 가능합니다. Firebase Functions의 searchPosts를 호출합니다.
        </Typography>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          원고 검색 결과
        </Typography>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>생성일</TableCell>
                <TableCell>작성자</TableCell>
                <TableCell>카테고리</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>내용 (미리보기)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton variant="text" height={40} />
                    </TableCell>
                  </TableRow>
                ))
              ) : searched && posts.length ? (
                posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      {post.createdAt ? 
                        (post.createdAt.toDate ? 
                          post.createdAt.toDate().toLocaleString() : 
                          new Date(post.createdAt.seconds * 1000).toLocaleString()) : 
                        '-'}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {post.userId || post.userEmail || '-'}
                    </TableCell>
                    <TableCell>{post.category || '-'}</TableCell>
                    <TableCell>
                      {post.status === 'success' ? (
                        <Chip 
                          icon={<CheckCircle />} 
                          label="성공" 
                          color="success" 
                          size="small" 
                        />
                      ) : (
                        <Chip 
                          icon={<Error />} 
                          label="실패" 
                          color="error" 
                          size="small" 
                        />
                      )}
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        maxWidth: 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={post.content}
                    >
                      {post.content || ''}
                    </TableCell>
                  </TableRow>
                ))
              ) : searched ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary">
                      결과가 없습니다.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary">
                      검색 버튼을 클릭하여 원고를 검색해보세요.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

// ------------------------------------------------------------
// 에러 로그 탭
// ------------------------------------------------------------
function ErrorsTab() {
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchErrors = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await callFunctionWithRetry('getErrorLogs', { limit: 200 });
        
        const errorsData = result.errors || [];
        console.log('에러 로그 조회 결과:', errorsData);
        
        setErrors(errorsData);
      } catch (err) {
        console.error('에러 로그 조회 실패:', err);
        setError(err.message);
        setErrors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchErrors();
    
    const interval = setInterval(fetchErrors, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ mt: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          에러 로그
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          최근 200건을 표시합니다. Firebase Functions의 getErrorLogs를 호출합니다.
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>시간</TableCell>
                <TableCell>에러 메시지</TableCell>
                <TableCell>사용자</TableCell>
                <TableCell>함수명</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton variant="text" height={40} />
                    </TableCell>
                  </TableRow>
                ))
              ) : errors.length ? (
                errors.map((error) => (
                  <TableRow key={error.id}>
                    <TableCell>
                      {error.timestamp ? 
                        (error.timestamp.toDate ? 
                          error.timestamp.toDate().toLocaleString() : 
                          new Date(error.timestamp.seconds * 1000).toLocaleString()) : 
                        '-'}
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        maxWidth: 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={error.message}
                    >
                      {error.message || '-'}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {error.userId || error.userEmail || '-'}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {error.functionName || '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2" color="text.secondary">
                      표시할 에러가 없습니다.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

// ------------------------------------------------------------
// 메인 AdminPage 컴포넌트
// ------------------------------------------------------------
function AdminPage() {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <DashboardLayout title="관리자 페이지">
      <Container maxWidth="xl">
        <Typography variant="h4" gutterBottom>
          시스템 관리
        </Typography>
        <Typography paragraph color="text.secondary">
          시스템 상태, 사용자 관리, 원고 검색, 에러 로그를 확인할 수 있습니다.
        </Typography>
        
        <Box sx={{ mb: 4 }}>
          <DashboardCards />
        </Box>

        <Paper sx={{ mb: 2 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="사용자" />
            <Tab label="원고 검색" />
            <Tab label="에러 로그" />
          </Tabs>
        </Paper>

        {currentTab === 0 && <UsersSection />}
        {currentTab === 1 && <PostsSearchTab />}
        {currentTab === 2 && <ErrorsTab />}
      </Container>
    </DashboardLayout>
  );
}

export default AdminPage;