// frontend/src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
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

  // 시스템 상태 확인 (타임아웃 추가)
  const checkSystemStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      // 3초 타임아웃 설정
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('타임아웃')), 3000)
      );
      
      const status = await Promise.race([
        getSystemStatus(),
        timeoutPromise
      ]);
      
      console.log('🔍 시스템 상태 확인:', status.status);
      setSystemStatus(status);
    } catch (error) {
      console.error('❌ 시스템 상태 확인 실패:', error);
      setSystemStatus({ status: 'active' }); // 실패 시 정상 상태로 간주
    } finally {
      setStatusLoading(false);
    }
  }, []);

  // 관리자 계정 확인 (useEffect보다 먼저 선언)
  const isAdmin = user?.email === 'kjk6206@gmail.com' || user?.email === 'taesoo@secretart.ai';

  useEffect(() => {
    // 로그인 상태가 확정된 후에만 시스템 상태 확인
    if (!loading) {
      checkSystemStatus();
    }
  }, [loading, checkSystemStatus]); // loading 상태 변경 시에만 확인

  // 점검 모드일 때만 주기적으로 상태 확인 (복구 감지용)
  useEffect(() => {
    let interval = null;
    
    if (systemStatus?.status === 'maintenance' && !isAdmin) {
      // 점검 중일 때만 2분마다 복구 확인
      console.log('🔄 점검 모드: 2분마다 복구 상태 확인 시작');
      interval = setInterval(checkSystemStatus, 120000);
    }
    
    return () => {
      if (interval) {
        console.log('🛑 상태 확인 간격 정리');
        clearInterval(interval);
      }
    };
  }, [systemStatus?.status, isAdmin, checkSystemStatus]);

  // 점검 중이며 일반 사용자인 경우만 점검 페이지 표시
  const shouldShowMaintenance = () => {
    if (!systemStatus || systemStatus.status !== 'maintenance') {
      return false;
    }

    // 로그아웃 상태에서는 로그인 페이지 접근 허용
    if (!user && (location.pathname === '/' || location.pathname === '/login')) {
      return false;
    }

    // 관리자는 항상 접근 허용 (점검 해제를 위해)
    if (isAdmin) {
      return false;
    }

    // 로그인된 일반 사용자는 모든 페이지에서 점검 페이지 표시
    if (user && !isAdmin) {
      return true;
    }

    return false;
  };

  // 로딩 중 표시
  if (loading || statusLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        bgcolor: '#141414'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  // 점검 중 페이지 표시
  const showMaintenance = shouldShowMaintenance();
  
  if (showMaintenance) {
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
    <Box sx={{ minHeight: '100vh', bgcolor: '#141414' }}>
      {/* Suspense 제거 - lazy loading 없으므로 불필요 */}
      <Outlet />
    </Box>
  );
}

export default App;