// frontend/src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth } from './hooks/useAuth';
import { getSystemStatus } from './services/firebaseService';
import MaintenancePage from './components/MaintenancePage';
import { LoadingOverlay } from './components/loading';
import { HelpProvider } from './contexts/HelpContext';
import { ColorProvider } from './contexts/ColorContext';
import BackgroundGrid from './components/BackgroundGrid';

function App() {
  const { user, loading, logout } = useAuth();
  const [systemStatus, setSystemStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const location = useLocation();

  // ?œìŠ¤???íƒœ ?•ì¸ (?€?„ì•„??10ì´ˆë¡œ ì¡°ì •)
  const checkSystemStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      // 10ì´??€?„ì•„???¤ì • (Firebase Functions ?‘ë‹µ ?œê°„ ê³ ë ¤)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 10000)
      );
      
      const status = await Promise.race([
        getSystemStatus(),
        timeoutPromise
      ]);
      
      setSystemStatus(status);
    } catch (error) {
      console.error('???œìŠ¤???íƒœ ?•ì¸ ?¤íŒ¨:', error);
      setSystemStatus({ status: 'active' }); // ?¤íŒ¨ ???•ìƒ ?íƒœë¡?ê°„ì£¼
    } finally {
      setStatusLoading(false);
    }
  }, []);

  // ê´€ë¦¬ì ê³„ì • ?•ì¸ (useEffectë³´ë‹¤ ë¨¼ì? ? ì–¸)
  const isAdmin = user?.email === 'kjk6206@gmail.com' || user?.email === 'taesoo@secretart.ai';

  useEffect(() => {
    // ë¡œê·¸???íƒœê°€ ?•ì •???„ì—ë§??œìŠ¤???íƒœ ?•ì¸ (ìµœì´ˆ 1?Œë§Œ)
    if (!loading && systemStatus === null) {
      // ???„í™˜?ì„œ ?Œì•„????ë¶ˆí•„?”í•œ ?¬í™•??ë°©ì?
      const lastCheck = sessionStorage.getItem('systemStatusLastCheck');
      const now = Date.now();
      
      // 5ë¶??´ë‚´???•ì¸?ˆë‹¤ë©??¤í‚µ
      if (lastCheck && (now - parseInt(lastCheck)) < 300000) {
        setSystemStatus({ status: 'active' });
        setStatusLoading(false);
        return;
      }
      
      checkSystemStatus();
      sessionStorage.setItem('systemStatusLastCheck', now.toString());
    }
  }, [loading, checkSystemStatus, systemStatus]);

  // ?ê? ëª¨ë“œ???Œë§Œ ì£¼ê¸°?ìœ¼ë¡??íƒœ ?•ì¸ (ë³µêµ¬ ê°ì???
  useEffect(() => {
    let interval = null;
    
    if (systemStatus?.status === 'maintenance' && !isAdmin) {
      // ?ê? ì¤‘ì¼ ?Œë§Œ 2ë¶„ë§ˆ??ë³µêµ¬ ?•ì¸
      console.log('?”„ ?ê? ëª¨ë“œ: 2ë¶„ë§ˆ??ë³µêµ¬ ?íƒœ ?•ì¸ ?œì‘');
      interval = setInterval(checkSystemStatus, 120000);
    }
    
    return () => {
      if (interval) {
        console.log('?›‘ ?íƒœ ?•ì¸ ê°„ê²© ?•ë¦¬');
        clearInterval(interval);
      }
    };
  }, [systemStatus?.status, isAdmin, checkSystemStatus]);

  // ?ê? ì¤‘ì´ë©??¼ë°˜ ?¬ìš©?ì¸ ê²½ìš°ë§??ê? ?˜ì´ì§€ ?œì‹œ
  const shouldShowMaintenance = () => {
    if (!systemStatus || systemStatus.status !== 'maintenance') {
      return false;
    }

    // ë¡œê·¸?„ì›ƒ ?íƒœ?ì„œ??ë¡œê·¸???˜ì´ì§€ ?‘ê·¼ ?ˆìš©
    const publicGuestPaths = ['/', '/login', '/about'];
    if (!user && publicGuestPaths.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'))) {
      return false;
    }

    // ê´€ë¦¬ì????ƒ ?‘ê·¼ ?ˆìš© (?ê? ?´ì œë¥??„í•´)
    if (isAdmin) {
      return false;
    }

    // ë¡œê·¸?¸ëœ ?¼ë°˜ ?¬ìš©?ëŠ” ëª¨ë“  ?˜ì´ì§€?ì„œ ?ê? ?˜ì´ì§€ ?œì‹œ
    if (user && !isAdmin) {
      return true;
    }

    return false;
  };

  // ë¡œë”© ì¤??œì‹œ
  if (loading || statusLoading) {
    return (
      <Box sx={{ 
        height: '100vh',
        bgcolor: 'transparent',
        background: 'none'
      }}>
        <LoadingOverlay 
          open={true} 
          message="?œìŠ¤??ì´ˆê¸°??ì¤?.." 
          backdrop={false}
        />
      </Box>
    );
  }

  // ?ê? ì¤??˜ì´ì§€ ?œì‹œ
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
    <HelpProvider>
      <ColorProvider>
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
            pointerEvents: 'none',
            zIndex: -10,
          }}
        />

        {/* Background Grid */}
        <BackgroundGrid />
        <Outlet />
      </Box>
      </ColorProvider>
    </HelpProvider>
  );
}

export default App;



