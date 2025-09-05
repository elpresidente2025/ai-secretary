// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.jsx';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import App from './App.jsx';
import ErrorPage from './pages/ErrorPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import ProfileRequiredRoute from './components/ProfileRequiredRoute.jsx';
import './index.css';

// 🔧 임시: lazy loading 제거하고 직접 import
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import GeneratePage from './pages/GeneratePage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import PostDetailPage from './pages/PostDetailPage.jsx';
import PostsListPage from './pages/PostsListPage.jsx';
import Billing from './pages/Billing.jsx';
import GuidelinesPage from './pages/GuidelinesPage.jsx';
import PaymentSuccess from './pages/PaymentSuccess.jsx';
import PaymentFail from './pages/PaymentFail.jsx';

// 🎯 프리로드 함수들 (사용자 의도 감지 시 사용)
export const preloadGenerate = () => import('./pages/GeneratePage.jsx');
export const preloadPosts = () => import('./pages/PostsListPage.jsx');
export const preloadBilling = () => import('./pages/Billing.jsx');
export const preloadProfile = () => import('./pages/ProfilePage.jsx');

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <LoginPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      {
        path: 'dashboard',
        element: <ProtectedRoute><Dashboard /></ProtectedRoute>,
      },
      {
        path: 'generate',
        element: <ProtectedRoute><ProfileRequiredRoute><GeneratePage /></ProfileRequiredRoute></ProtectedRoute>,
      },
      {
        path: 'profile',
        element: <ProtectedRoute><ProfilePage /></ProtectedRoute>,
      },
      {
        path: 'billing',
        element: <ProtectedRoute><Billing /></ProtectedRoute>,
      },
      {
        path: 'admin',
        element: <AdminRoute><AdminPage /></AdminRoute>,
      },
      {
        path: 'posts',
        element: <ProtectedRoute><ProfileRequiredRoute><PostsListPage /></ProfileRequiredRoute></ProtectedRoute>,
      },
      {
        path: 'guidelines',
        element: <ProtectedRoute><ProfileRequiredRoute><GuidelinesPage /></ProfileRequiredRoute></ProtectedRoute>,
      },
      {
        path: 'payment/success',
        element: <ProtectedRoute><PaymentSuccess /></ProtectedRoute>,
      },
      {
        path: 'payment/fail',
        element: <ProtectedRoute><PaymentFail /></ProtectedRoute>,
      },
    ],
  },
]);

// React 앱 렌더링
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);

// React 마운트 완료 후 즉시 로딩 스피너 숨기기
const loadingContainer = document.getElementById('loading-container');
if (loadingContainer) {
  console.log('🎯 React 마운트 완료 - 로딩 스피너 즉시 제거');
  loadingContainer.classList.add('hidden');
}