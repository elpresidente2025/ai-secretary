// frontend/src/App.jsx
import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

function App() {
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