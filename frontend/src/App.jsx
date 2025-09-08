// frontend/src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import SynthwaveBackdrop from './components/SynthwaveBackdrop.jsx';
import { useAuth } from './hooks/useAuth';
import { getSystemStatus } from './services/firebaseService';
import MaintenancePage from './components/MaintenancePage';
import { LoadingOverlay } from './components/loading';

function App() {
  const { user, loading, logout } = useAuth();
  const [systemStatus, setSystemStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const location = useLocation();

  // 시스템 상태 확인 (타임아웃 1.5초로 단축)
  const checkSystemStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      // 1.5초 타임아웃 설정 (더 빠른 응답)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('타임아웃')), 1500)
      );
      
      const status = await Promise.race([
        getSystemStatus(),
        timeoutPromise
      ]);
      
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
    // 로그인 상태가 확정된 후에만 시스템 상태 확인 (최초 1회만)
    if (!loading && systemStatus === null) {
      // 탭 전환에서 돌아올 때 불필요한 재확인 방지
      const lastCheck = sessionStorage.getItem('systemStatusLastCheck');
      const now = Date.now();
      
      // 5분 이내에 확인했다면 스킵
      if (lastCheck && (now - parseInt(lastCheck)) < 300000) {
        setSystemStatus({ status: 'active' });
        setStatusLoading(false);
        return;
      }
      
      checkSystemStatus();
      sessionStorage.setItem('systemStatusLastCheck', now.toString());
    }
  }, [loading, checkSystemStatus, systemStatus]);

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
        height: '100vh',
        bgcolor: 'transparent',
        background: 'none'
      }}>
        <LoadingOverlay 
          open={true} 
          message="시스템 초기화 중..." 
          backdrop={false}
        />
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
    <Box sx={{ position: 'relative', minHeight: '100vh', bgcolor: 'transparent' }}>
      {/* 배경 레이어: 헤더/푸터/콘텐츠 아래, 기본 배경 위 */}
      <Box sx={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <SynthwaveBackdrop />
      </Box>

      {/* 상위 콘텐츠 레이어 */}
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Outlet />
      </Box>
    </Box>
  );
}

export default App;
