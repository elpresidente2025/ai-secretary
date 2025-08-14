import React, { lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.jsx'; // ✅ 경로 수정
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import App from './App.jsx';
import ErrorPage from './pages/ErrorPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import './index.css';

// Lazy-load 페이지 컴포넌트들
// HomePage가 실제 로그인 페이지 역할을 하므로, 가독성을 위해 LoginPage 별칭을 사용합니다.
const LoginPage = lazy(() => import('./pages/HomePage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const GeneratePage = lazy(() => import('./pages/GeneratePage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage.jsx'));
const PostsListPage = lazy(() => import('./pages/PostsListPage.jsx'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorPage />, // 최상위 에러 바운더리 설정
    children: [
      // 사용자가 / 로 접근하면 로그인 페이지를 보여주고,
      // 인증된 사용자는 HomePage 내부 로직에 의해 /dashboard로 리디렉션됩니다.
      { index: true, element: <LoginPage /> },
      // ProtectedRoute에서 /login으로 리디렉션하므로, 해당 경로를 명시적으로 추가합니다.
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
        path: 'admin',
        element: <AdminRoute><AdminPage /></AdminRoute>,
      },
      {
        path: 'post/:postId',
        element: <ProtectedRoute><PostDetailPage /></ProtectedRoute>,
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
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);