// frontend/src/components/admin/DashboardCards.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Alert,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Skeleton,
  CircularProgress
} from '@mui/material';
import {
  Refresh,
  CheckCircle,
  Error,
  People,
  Api
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { callFunctionWithRetry } from '../../services/firebaseService';

// Gemini 상태 수정 함수
const handleGeminiStatusUpdate = async (newState) => {
  try {
    console.log('🔧 Gemini 상태 업데이트:', newState);
    await callFunctionWithRetry('updateGeminiStatus', { newState });
    alert('✅ 상태가 성공적으로 업데이트되었습니다.');
    window.location.reload();
  } catch (error) {
    console.error('❌ Gemini 상태 수정 실패:', error);
    alert('❌ 수정 실패: ' + error.message);
  }
};

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
        
        console.log('📊 관리자 통계 조회 결과:', result);
        
        // 응답 구조에 따라 데이터 추출
        let statsData = {};
        
        if (result.success && result.data) {
          statsData = result.data;
        } else if (result.stats) {
          statsData = result.stats;
        } else {
          statsData = result;
        }
        
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
        // 에러 시 기본값 유지
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // 자동 폴링 제거 - 1인 운영 최적화
    // const interval = setInterval(fetchStats, 30000);
    // return () => clearInterval(interval);
  }, [user]);

  const handleRefresh = async () => {
    console.log('🔄 수동 새로고침');
    setLoading(true);
    setError(null);
    
    try {
      const result = await callFunctionWithRetry('getAdminStats');
      
      console.log('🔄 새로고침 결과:', result);
      
      // 응답 구조에 따라 데이터 추출
      let statsData = {};
      
      if (result.success && result.data) {
        statsData = result.data;
      } else if (result.stats) {
        statsData = result.stats;
      } else {
        statsData = result;
      }
      
      setStats({
        todaySuccess: statsData.todaySuccess || 0,
        todayFail: statsData.todayFail || 0,
        last30mErrors: statsData.last30mErrors || 0,
        activeUsers: statsData.activeUsers || 0,
        geminiStatus: statsData.geminiStatus || { state: 'unknown' }
      });
    } catch (err) {
      console.error('새로고침 실패:', err);
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
  const getGeminiStatusColor = (state) => {
    switch (state) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'maintenance': return 'warning';
      default: return 'default';
    }
  };

  const getGeminiStatusText = (state) => {
    switch (state) {
      case 'active': return '정상';
      case 'inactive': return '중단';
      case 'maintenance': return '점검';
      default: return '알 수 없음';
    }
  };

  return (
    <Grid container spacing={3}>
      {/* 오늘 총 원고 생성 */}
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

      {/* 활성 사용자 */}
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <People color="action" />
              <Typography variant="h6">활성 사용자</Typography>
            </Box>
            <Typography variant="h3" sx={{ mb: 1 }}>
              {stats.activeUsers}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              최근 7일 내 활동
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* 최근 30분 에러 */}
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Error color={stats.last30mErrors > 0 ? 'error' : 'action'} />
              <Typography variant="h6">최근 30분 에러</Typography>
            </Box>
            <Typography variant="h3" sx={{ mb: 1 }}>
              {stats.last30mErrors}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              시스템 상태 모니터링
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Gemini API 상태 */}
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Api color="action" />
              <Typography variant="h6">Gemini API</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Chip
                label={getGeminiStatusText(stats.geminiStatus.state)}
                color={getGeminiStatusColor(stats.geminiStatus.state)}
                sx={{ mb: 1 }}
              />
              {stats.geminiStatus.lastUpdated && (
                <Typography variant="caption" display="block" color="text.secondary">
                  업데이트: {new Date(stats.geminiStatus.lastUpdated).toLocaleString()}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              <Button
                size="small"
                variant="outlined"
                color="success"
                onClick={() => handleGeminiStatusUpdate('active')}
                disabled={stats.geminiStatus.state === 'active'}
              >
                정상
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                onClick={() => handleGeminiStatusUpdate('maintenance')}
                disabled={stats.geminiStatus.state === 'maintenance'}
              >
                점검
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => handleGeminiStatusUpdate('inactive')}
                disabled={stats.geminiStatus.state === 'inactive'}
              >
                중단
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default DashboardCards;