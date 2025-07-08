import React from 'react';
import { Navigate } from 'react-router-dom';

// 이 컴포넌트는 로그인 여부를 확인하여 페이지 접근을 제어합니다.
// 지금은 간단하게 localStorage를 사용하지만, 나중에 Context API로 고도화할 수 있습니다.
const ProtectedRoute = ({ children }) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn');

  if (!isLoggedIn) {
    // 로그인하지 않았다면 로그인 페이지로 리디렉션
    return <Navigate to="/login" replace />;
  }

  // 로그인했다면 요청한 페이지를 보여줌
  return children;
};

export default ProtectedRoute;