// frontend/src/main.jsx
import React, { lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.jsx';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import App from './App.jsx';
import ErrorPage from './pages/ErrorPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import './index.css';

// 🚀 라우트 레벨 lazy loading
const LoginPage = lazy(() => import('./pages/HomePage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const GeneratePage = lazy(() => import('./pages/GeneratePage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage.jsx'));
const PostsListPage = lazy(() => import('./pages/PostsListPage.jsx'));
const Billing = lazy(() => import('./pages/Billing.jsx'));

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
        element: <ProtectedRoute><GeneratePage /></ProtectedRoute>,
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
        element: <ProtectedRoute><PostsListPage /></ProtectedRoute>,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);