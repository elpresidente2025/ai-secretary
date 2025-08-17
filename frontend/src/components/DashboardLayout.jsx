// frontend/src/components/DashboardLayout.jsx
import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Box,
  useTheme,
  useMediaQuery,
  Avatar,
  Button
} from '@mui/material';
import {
  Menu as MenuIcon,
  Create,
  History,
  Settings,
  Logout,
  CreditCard,
  AdminPanelSettings
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUserDisplayTitle, getUserRegionInfo, getUserStatusIcon } from '../utils/userUtils';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => setDrawerOpen(!drawerOpen);
  const handleLogout = async () => { await logout(); setDrawerOpen(false); };
  const handleLogoClick = () => navigate('/dashboard');

  const userIcon = getUserStatusIcon(user);
  const regionInfo = getUserRegionInfo(user);
  const isAdmin = user?.role === 'admin';

  const menuItems = [
    { text: '새 원고 생성', icon: <Create />, path: '/generate' },
    { text: '히스토리', icon: <History />, path: '/posts' },
    { text: '프로필 수정', icon: <Settings />, path: '/profile' },
    { text: '인증 및 결제', icon: <CreditCard />, path: '/billing' },
  ];
  if (isAdmin) {
    menuItems.push({ text: '관리', icon: <AdminPanelSettings />, path: '/admin' });
  }

  const isCurrentPath = (path) => location.pathname === path;
  const handleNavigate = (path) => { navigate(path); setDrawerOpen(false); };

  const drawer = (
    <Box sx={{ width: 280, pt: 2 }}>
      <Box sx={{ px: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>{userIcon}</Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {user?.name || '사용자'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {getUserDisplayTitle(user)}
            </Typography>
          </Box>
        </Box>
        {regionInfo && (
          <Typography variant="caption" color="text.secondary">
            {regionInfo}
          </Typography>
        )}
      </Box>

      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton onClick={() => handleNavigate(item.path)} selected={isCurrentPath(item.path)}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon><Logout /></ListItemIcon>
            <ListItemText primary="로그아웃" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    // 전체를 100vh 플렉스 컬럼으로: 헤더 + 본문 + 푸터
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* 상단 헤더: sticky 고정 */}
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: '#152484', top: 0, zIndex: (t) => t.zIndex.appBar }}>
        <Toolbar>
          {/* 로고 + 타이틀 (왼쪽 정렬) */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, cursor: 'pointer', gap: 1 }}
            onClick={handleLogoClick}
          >
            <Box
              component="img"
              src="/logo.png"      // public/logo.png
              alt="AI비서관 로고"
              sx={{ height: 32, width: 32, objectFit: 'contain', borderRadius: 1 }}
            />
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'white', textDecoration: 'none' }}>
              AI비서관
            </Typography>
          </Box>

          {/* 데스크톱: 중앙 메뉴 + 우측 로그아웃 */}
          {!isMobile && (
            <>
              <Box sx={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                {menuItems.map((item) => (
                  <Button
                    key={item.text}
                    color="inherit"
                    startIcon={item.icon}
                    onClick={() => handleNavigate(item.path)}
                    sx={{
                      color: 'white',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                      ...(isCurrentPath(item.path) && { bgcolor: 'rgba(255,255,255,0.2)', fontWeight: 'bold' })
                    }}
                  >
                    {item.text}
                  </Button>
                ))}
              </Box>

              <Button
                color="inherit"
                startIcon={<Logout />}
                onClick={handleLogout}
                sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                로그아웃
              </Button>
            </>
          )}

          {/* 모바일: 햄버거 */}
          {isMobile && (
            <IconButton color="inherit" onClick={handleDrawerToggle} edge="end">
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      <Drawer anchor="right" open={drawerOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }}>
        {drawer}
      </Drawer>

      {/* 본문 */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          bgcolor: 'background.default',
          display: 'flex',
          justifyContent: 'center',
          width: '100%'
        }}
      >
        <Box sx={{ width: '100%', maxWidth: '85vw' }}>
          {children}
        </Box>
      </Box>

      {/* 푸터 */}
      <Box
        component="footer"
        sx={{
          flexShrink: 0,
          py: 2,
          px: 2,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          textAlign: 'center'
        }}
      >
        <Typography variant="caption" color="text.secondary">
          © AI비서관
        </Typography>
      </Box>
    </Box>
  );
};

export default DashboardLayout;
