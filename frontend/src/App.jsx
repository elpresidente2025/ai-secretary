import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import Header from './components/layout/Header'; // Header 컴포넌트 경로 확인

function App() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {/* 페이지 로딩 시 로딩 스피너를 보여줍니다. */}
        <Suspense
          fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
              <CircularProgress />
            </Box>
          }
        >
          {/* 자식 라우트(페이지)들이 이 위치에 렌더링됩니다. */}
          <Outlet />
        </Suspense>
      </Box>
    </Box>
  );
}

export default App;
