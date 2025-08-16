// frontend/src/pages/AdminPage.jsx (단순화 버전)
import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Alert,
  Snackbar
} from '@mui/material';
import { Refresh, Speed } from '@mui/icons-material';
import DashboardLayout from '../components/DashboardLayout';
import DashboardCards from '../components/admin/DashboardCards';
import QuickActions from '../components/admin/QuickActions';
import ErrorsMiniTable from '../components/admin/ErrorsMiniTable';
import NoticeManager from '../components/admin/NoticeManager';
import { useAuth } from '../hooks/useAuth';

function AdminPage() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  // 전체 새로고침 함수
  const handleGlobalRefresh = async () => {
    setRefreshing(true);
    
    try {
      // 페이지 전체 새로고침으로 모든 데이터 갱신
      window.location.reload();
    } catch (error) {
      console.error('새로고침 실패:', error);
      setNotification({
        open: true,
        message: '새로고침 중 오류가 발생했습니다.',
        severity: 'error'
      });
    } finally {
      setRefreshing(false);
    }
  };

  // 권한 체크
  if (!user) {
    return (
      <DashboardLayout title="관리자 페이지">
        <Container maxWidth="xl">
          <Alert severity="warning">
            관리자 페이지는 로그인 후 사용 가능합니다.
          </Alert>
        </Container>
      </DashboardLayout>
    );
  }

  if (!user.isAdmin) {
    return (
      <DashboardLayout title="관리자 페이지">
        <Container maxWidth="xl">
          <Alert severity="error">
            <Typography variant="h6" gutterBottom>접근 권한이 없습니다</Typography>
            <Typography variant="body2">
              이 페이지는 관리자만 접근할 수 있습니다. 
              현재 권한: {user.role || '일반 사용자'}
            </Typography>
          </Alert>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="시스템 관리">
      <Container maxWidth="xl">
        {/* 헤더 영역 */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 4,
          pb: 2,
          borderBottom: '2px solid #152484'
        }}>
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                color: '#152484', 
                fontWeight: 700,
                mb: 1
              }}
            >
              시스템 관리
            </Typography>
            <Typography variant="body1" color="text.secondary">
              AI비서관 서비스의 전반적인 상태를 모니터링하고 관리합니다.
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Speed />}
              sx={{ 
                borderColor: '#006261',
                color: '#006261',
                '&:hover': { 
                  borderColor: '#006261',
                  backgroundColor: 'rgba(0, 98, 97, 0.04)'
                }
              }}
            >
              성능 모니터
            </Button>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={handleGlobalRefresh}
              disabled={refreshing}
              sx={{ 
                backgroundColor: '#152484',
                '&:hover': { 
                  backgroundColor: '#1a2a9e'
                }
              }}
            >
              {refreshing ? '새로고침 중...' : '전체 새로고침'}
            </Button>
          </Box>
        </Box>

        {/* 대시보드 카드 영역 */}
        <Box sx={{ mb: 4 }}>
          <DashboardCards />
        </Box>

        {/* 빠른 작업 영역 */}
        <Box sx={{ mb: 4 }}>
          <QuickActions />
        </Box>

        {/* 에러 로그 영역 */}
        <Box sx={{ mb: 4 }}>
          <ErrorsMiniTable />
        </Box>

        {/* 공지사항 관리 영역 */}
        <Box sx={{ mb: 4 }}>
          <NoticeManager />
        </Box>

        {/* 푸터 정보 */}
        <Box 
          sx={{ 
            mt: 6, 
            pt: 3, 
            borderTop: '1px solid #e0e0e0',
            textAlign: 'center'
          }}
        >
          <Typography variant="body2" color="text.secondary">
            💡 <strong>1인 운영 최적화</strong>: 필요한 정보만 간단히 표시하고, 
            상세 분석은 CSV 다운로드를 활용하세요.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            자동 새로고침이 비활성화되어 API 비용을 절약합니다. 
            필요시 수동 새로고침을 이용하세요.
          </Typography>
        </Box>
      </Container>

      {/* 알림 스낵바 */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
        message={notification.message}
      />
    </DashboardLayout>
  );
}

export default AdminPage;