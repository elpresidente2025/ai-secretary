// frontend/src/App.jsx
import React, { Suspense, useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './hooks/useAuth';
import { getSystemStatus } from './services/firebaseService';
import MaintenancePage from './components/MaintenancePage';

function App() {
  const { user, loading, logout } = useAuth();
  const [systemStatus, setSystemStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const location = useLocation();

  // 시스템 상태 확인
  const checkSystemStatus = async () => {
    setStatusLoading(true);
    try {
      const status = await getSystemStatus();
      console.log('🔍 시스템 상태 확인:', status);
      setSystemStatus(status);
    } catch (error) {
      console.error('❌ 시스템 상태 확인 실패:', error);
      setSystemStatus({ status: 'active' }); // 실패 시 정상 상태로 간주
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    checkSystemStatus();
    // 30초마다 상태 확인
    const interval = setInterval(checkSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // 관리자 계정 확인
  const isAdmin = user?.email === 'kjk6206@gmail.com' || user?.email === 'taesoo@secretart.ai';

  // 점검 중이며 일반 사용자인 경우만 점검 페이지 표시
  const shouldShowMaintenance = () => {
    console.log('🔍 점검 페이지 표시 확인:', {
      systemStatus,
      isAdmin,
      userEmail: user?.email,
      statusValue: systemStatus?.status,
      currentPath: location.pathname,
      isLoginPage: location.pathname === '/' || location.pathname === '/login'
    });
    
    if (!systemStatus || systemStatus.status !== 'maintenance') {
      return false;
    }

    // 로그아웃 상태에서는 로그인 페이지 접근 허용
    if (!user && (location.pathname === '/' || location.pathname === '/login')) {
      console.log('🔑 로그아웃 상태 - 로그인 페이지 접근 허용');
      return false;
    }

    // 관리자는 항상 접근 허용 (점검 해제를 위해)
    if (isAdmin) {
      console.log('👨‍💼 관리자 접근 허용');
      return false;
    }

    // 로그인된 일반 사용자는 모든 페이지에서 점검 페이지 표시
    if (user && !isAdmin) {
      console.log('🚫 로그인된 일반 사용자 - 점검 페이지 표시');
      return true;
    }

    console.log('❓ 점검 페이지 표시하지 않음');
    return false;
  };

  // 로딩 중 표시
  if (loading || statusLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // 점검 중 페이지 표시
  const showMaintenance = shouldShowMaintenance();
  console.log('🔧 shouldShowMaintenance 결과:', showMaintenance);
  
  if (showMaintenance) {
    console.log('🚨 MaintenancePage 렌더링 시작');
    return (
      <MaintenancePage 
        maintenanceInfo={systemStatus.maintenanceInfo}
        onRetry={checkSystemStatus}
        isAdmin={isAdmin}
        onLogout={user ? logout : null}
      />
    );
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* 페이지 로딩 시 로딩 스피너를 보여줍니다. */}
      <Suspense
        fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
          </Box>
        }
      >
        {/* 자식 라우트(페이지)들이 이 위치에 렌더링됩니다. */}
        <Outlet />
      </Suspense>
    </Box>
  );
}

export default App;