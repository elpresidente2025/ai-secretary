import React from 'react';
import { useAuth } from '../hooks/useAuth'; // 🔥 경로 수정
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

const AdminRoute = ({ children }) => {
  const { auth, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!auth?.user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (auth.user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AdminRoute;