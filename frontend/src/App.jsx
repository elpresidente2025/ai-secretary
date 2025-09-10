// frontend/src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth } from './hooks/useAuth';
import { getSystemStatus } from './services/firebaseService';
import MaintenancePage from './components/MaintenancePage';
import { LoadingOverlay } from './components/loading';

function App() {
  const { user, loading, logout } = useAuth();
  const [systemStatus, setSystemStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const location = useLocation();

  // 시스템 상태 확인 (타임아웃 10초로 조정)
  const checkSystemStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      // 10초 타임아웃 설정 (Firebase Functions 응답 시간 고려)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('타임아웃')), 10000)
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
    <Box sx={{ position: 'relative', minHeight: '100vh' }}>
      {/* Synthwave background image for top 50% */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '50vh',
          backgroundImage: 'url(/background/synthwave_city.png)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'top center',
          backgroundSize: 'cover',
          zIndex: -1,
        }}
      />
      {/* 시안색 가로선들 - 피보나치 수열 간격 (처음 3개 제외) */}
      {(() => {
        const fibonacci = [3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610];
        let cumulativeOffset = 15;
        const lines = [];
        
        fibonacci.forEach((fib, index) => {
          lines.push(
            <Box
              key={index}
              sx={{
                position: 'fixed',
                top: `calc(50vh + ${cumulativeOffset}px)`,
                left: 0,
                right: 0,
                height: (index === 2 || index === 3 || index === 5 || index === 7) ? '0.8px' : '1px', // 3,4,6,8번째 선은 0.8px
                backgroundColor: '#00ffff',
                zIndex: -1,
              }}
            />
          );
          cumulativeOffset += fib;
        });
        
        return lines;
      })()}
      
      {/* 시안색 세로선들 - 지평선 원근감 그리드 (소실점: 상단 45%) */}
      {(() => {
        const verticalLines = [];
        const baseSpacing = 300; // 화면 하단에서의 간격
        const spacingRatio = 0.7; // 간격 감소 비율
        const vanishingPointY = 45; // 소실점 Y: 상단에서 45%
        const vanishingPointX = 50; // 소실점 X: 중앙
        
        // 중앙선 (수직 유지) - 첫 번째 가로선에서 1px 위에서 시작
        verticalLines.push(
          <Box
            key="center"
            sx={{
              position: 'fixed',
              top: 'calc(50vh + 14px)', // 첫 번째 가로선(15px)에서 1px 위
              left: '50vw',
              bottom: 0,
              width: '0.8px',
              backgroundColor: '#00ffff',
              zIndex: -1,
            }}
          />
        );
        
        // 우측 선들 - 지평선 원근법
        for (let i = 1; i <= 10; i++) {
          let bottomOffset = 0;
          for (let j = 1; j <= i; j++) {
            bottomOffset += baseSpacing * Math.pow(spacingRatio, j - 1);
          }
          
          // 시작점 X 위치 (각 선의 실제 위치에서 시작)
          const startX = 50 + (bottomOffset * 0.05); // 시작점은 실제 세로선 위치
          // 화면 하단에서의 X 위치 (원근감으로 더 벌어짐)
          const bottomX = 50 + (bottomOffset * 0.3); // 간격을 vw로 변환
          
          // SVG로 정확한 선 그리기
          verticalLines.push(
            <svg
              key={`right-${i}`}
              style={{
                position: 'fixed',
                top: 'calc(50vh + 14px)', // 첫 번째 가로선 1px 위에서 시작
                left: 0,
                width: '100vw',
                height: 'calc(50vh - 14px)', // 첫 번째 가로선부터 화면 끝까지
                zIndex: -1,
                pointerEvents: 'none'
              }}
            >
              <line
                x1={`${startX}%`}
                y1="0"
                x2={`${bottomX}%`}
                y2="100%"
                stroke="#00ffff"
                strokeWidth="0.5"
              />
            </svg>
          );

          // 중간선 추가 (중앙선과 첫 번째 선 사이, 그리고 각 선들 사이)
          if (i === 1) {
            // 중앙선(50%)과 첫 번째 우측선 사이
            const midBottomOffset = bottomOffset / 2;
            const midStartX = 50 + (midBottomOffset * 0.05);
            const midBottomX = 50 + (midBottomOffset * 0.3);
            
            verticalLines.push(
              <svg
                key={`right-mid-center-${i}`}
                style={{
                  position: 'fixed',
                  top: 'calc(50vh + 14px)',
                  left: 0,
                  width: '100vw',
                  height: 'calc(50vh - 14px)',
                  zIndex: -1,
                  pointerEvents: 'none'
                }}
              >
                <line
                  x1={`${midStartX}%`}
                  y1="0"
                  x2={`${midBottomX}%`}
                  y2="100%"
                  stroke="#00ffff"
                  strokeWidth="0.5"
                />
              </svg>
            );
          } else {
            // 현재 선과 이전 선 사이
            let prevBottomOffset = 0;
            for (let j = 1; j < i; j++) {
              prevBottomOffset += baseSpacing * Math.pow(spacingRatio, j - 1);
            }
            
            const midBottomOffset = (prevBottomOffset + bottomOffset) / 2;
            const midStartX = 50 + (midBottomOffset * 0.05);
            const midBottomX = 50 + (midBottomOffset * 0.3);
            
            verticalLines.push(
              <svg
                key={`right-mid-${i}`}
                style={{
                  position: 'fixed',
                  top: 'calc(50vh + 14px)',
                  left: 0,
                  width: '100vw',
                  height: 'calc(50vh - 14px)',
                  zIndex: -1,
                  pointerEvents: 'none'
                }}
              >
                <line
                  x1={`${midStartX}%`}
                  y1="0"
                  x2={`${midBottomX}%`}
                  y2="100%"
                  stroke="#00ffff"
                  strokeWidth="0.5"
                />
              </svg>
            );
          }
        }
        
        // 좌측 선들 - 지평선 원근법
        for (let i = 1; i <= 10; i++) {
          let bottomOffset = 0;
          for (let j = 1; j <= i; j++) {
            bottomOffset += baseSpacing * Math.pow(spacingRatio, j - 1);
          }
          
          // 시작점 X 위치 (각 선의 실제 위치에서 시작)
          const startX = 50 - (bottomOffset * 0.05); // 시작점은 실제 세로선 위치
          // 화면 하단에서의 X 위치 (원근감으로 더 벌어짐)
          const bottomX = 50 - (bottomOffset * 0.3); // 간격을 vw로 변환
          
          // SVG로 정확한 선 그리기
          verticalLines.push(
            <svg
              key={`left-${i}`}
              style={{
                position: 'fixed',
                top: 'calc(50vh + 14px)', // 첫 번째 가로선 1px 위에서 시작
                left: 0,
                width: '100vw',
                height: 'calc(50vh - 14px)', // 첫 번째 가로선부터 화면 끝까지
                zIndex: -1,
                pointerEvents: 'none'
              }}
            >
              <line
                x1={`${startX}%`}
                y1="0"
                x2={`${bottomX}%`}
                y2="100%"
                stroke="#00ffff"
                strokeWidth="0.5"
              />
            </svg>
          );

          // 중간선 추가 (중앙선과 첫 번째 선 사이, 그리고 각 선들 사이)
          if (i === 1) {
            // 중앙선(50%)과 첫 번째 좌측선 사이
            const midBottomOffset = bottomOffset / 2;
            const midStartX = 50 - (midBottomOffset * 0.05);
            const midBottomX = 50 - (midBottomOffset * 0.3);
            
            verticalLines.push(
              <svg
                key={`left-mid-center-${i}`}
                style={{
                  position: 'fixed',
                  top: 'calc(50vh + 14px)',
                  left: 0,
                  width: '100vw',
                  height: 'calc(50vh - 14px)',
                  zIndex: -1,
                  pointerEvents: 'none'
                }}
              >
                <line
                  x1={`${midStartX}%`}
                  y1="0"
                  x2={`${midBottomX}%`}
                  y2="100%"
                  stroke="#00ffff"
                  strokeWidth="0.5"
                />
              </svg>
            );
          } else {
            // 현재 선과 이전 선 사이
            let prevBottomOffset = 0;
            for (let j = 1; j < i; j++) {
              prevBottomOffset += baseSpacing * Math.pow(spacingRatio, j - 1);
            }
            
            const midBottomOffset = (prevBottomOffset + bottomOffset) / 2;
            const midStartX = 50 - (midBottomOffset * 0.05);
            const midBottomX = 50 - (midBottomOffset * 0.3);
            
            verticalLines.push(
              <svg
                key={`left-mid-${i}`}
                style={{
                  position: 'fixed',
                  top: 'calc(50vh + 14px)',
                  left: 0,
                  width: '100vw',
                  height: 'calc(50vh - 14px)',
                  zIndex: -1,
                  pointerEvents: 'none'
                }}
              >
                <line
                  x1={`${midStartX}%`}
                  y1="0"
                  x2={`${midBottomX}%`}
                  y2="100%"
                  stroke="#00ffff"
                  strokeWidth="0.5"
                />
              </svg>
            );
          }
        }
        
        return verticalLines;
      })()}
      <Outlet />
    </Box>
  );
}

export default App;
