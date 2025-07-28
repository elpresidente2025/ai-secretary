import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

const AdminRoute = ({ children }) => {
  const { auth, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // AuthContext가 인증 상태를 확인하는 동안 로딩 화면을 보여줍니다.
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!auth) {
    // 로그인하지 않은 사용자는 로그인 페이지로 보냅니다.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (auth.user.role !== 'admin') {
    // 관리자가 아닌 사용자는 접근 권한이 없으므로 대시보드로 보냅니다.
    return <Navigate to="/dashboard" replace />;
  }

  // 모든 조건을 통과하면 자식 컴포넌트(AdminPage)를 렌더링합니다.
  return children;
};

export default AdminRoute;
