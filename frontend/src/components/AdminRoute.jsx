import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

const AdminRoute = ({ children }) => {
  const { auth, loading } = useAuth();
  const location = useLocation();

  // 🔥 상세 디버깅 로그
  console.log('🔍 === 관리자 라우트 디버깅 시작 ===');
  console.log('📍 현재 경로:', window.location.pathname);
  console.log('⏳ loading 상태:', loading);
  console.log('👤 auth 객체:', auth);
  
  if (auth) {
    console.log('👤 사용자 정보:', auth.user);
    if (auth.user) {
      console.log('🎭 사용자 role:', auth.user.role);
      console.log('🔑 isAdmin:', auth.user.isAdmin);
      console.log('📧 email:', auth.user.email);
      console.log('📝 name:', auth.user.name);
    }
  }
  console.log('🔍 === 디버깅 끝 ===');

  if (loading) {
    console.log('⏳ 로딩 중... 스피너 표시');
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!auth?.user) {
    console.log('🚫 사용자 없음 - 로그인 페이지로 리다이렉트');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 🔥 임시로 관리자 체크 비활성화 (테스트용)
  console.log('🔐 관리자 권한 확인 중...');
  console.log('현재 role 값:', `"${auth.user.role}"`);
  console.log('role 타입:', typeof auth.user.role);
  
  if (auth.user.role !== 'admin') {
    console.log('🚫 관리자 권한 없음!');
    console.log('필요한 권한: "admin"');
    console.log('현재 권한:', `"${auth.user.role}"`);
    console.log('대시보드로 리다이렉트합니다.');
    
    // 🔥 임시: 아래 줄을 주석 처리하면 관리자 체크 건너뛰기
    return <Navigate to="/dashboard" replace />;
  }

  console.log('✅ 관리자 권한 확인됨! 관리자 페이지 로드');
  return children;
};

export default AdminRoute;