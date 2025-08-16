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
import { getUserFullTitle, getUserDisplayTitle, getUserRegionInfo, getUserStatusIcon } from '../utils/userUtils';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg')); // lg 기준으로 변경
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleLogout = async () => {
    await logout();
    setDrawerOpen(false);
  };

  const handleLogoClick = () => {
    navigate('/dashboard');
  };

  // 사용자 정보 가져오기
  const userTitle = getUserFullTitle(user);
  const userIcon = getUserStatusIcon(user);
  const regionInfo = getUserRegionInfo(user);
  const isAdmin = user?.role === 'admin';

  // 메뉴 항목 - 대시보드 제거하고 관리자 메뉴 추가
  const menuItems = [
    { text: '새 원고 생성', icon: <Create />, path: '/generate' },
    { text: '히스토리', icon: <History />, path: '/posts' },
    { text: '프로필 수정', icon: <Settings />, path: '/profile' },
    { text: '인증 및 결제', icon: <CreditCard />, path: '/billing' },
  ];

  // 관리자 메뉴 추가
  if (isAdmin) {
    menuItems.push({
      text: '관리',
      icon: <AdminPanelSettings />,
      path: '/admin'
    });
  }

  // 현재 경로 확인
  const isCurrentPath = (path) => location.pathname === path;

  // 페이지 이동 핸들러
  const handleNavigate = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const drawer = (
    <Box sx={{ width: 280, pt: 2 }}>
      {/* 드로어 헤더 - 사용자 정보 */}
      <Box sx={{ px: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
            {userIcon}
          </Avatar>
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

      {/* 메뉴 항목 */}
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              onClick={() => handleNavigate(item.path)}
              selected={isCurrentPath(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
        
        {/* 로그아웃 */}
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
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* 상단 헤더 */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: '#152484' }}>
        <Toolbar>
          {/* 로고/제목 - 클릭 시 대시보드로 이동 */}
          <Typography 
            variant="h6" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: 600,
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.8
              }
            }}
            onClick={handleLogoClick}
          >
            AI비서관
          </Typography>

          {/* PC/4K 버전 - 메뉴 버튼들 */}
          {!isMobile && (
            <>
              {/* 중앙 정렬된 메뉴 */}
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
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)'
                      },
                      ...(isCurrentPath(item.path) && {
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        fontWeight: 'bold'
                      })
                    }}
                  >
                    {item.text}
                  </Button>
                ))}
              </Box>
              
              {/* 오른쪽 로그아웃 버튼 */}
              <Button
                color="inherit"
                startIcon={<Logout />}
                onClick={handleLogout}
                sx={{
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                로그아웃
              </Button>
            </>
          )}

          {/* 모바일/태블릿 버전 - 햄버거 메뉴 */}
          {isMobile && (
            <IconButton 
              color="inherit" 
              onClick={handleDrawerToggle}
              edge="end"
            >
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* 모바일 드로어 */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
      >
        {drawer}
      </Drawer>

      {/* 메인 콘텐츠 - 강제 중앙 정렬 */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          bgcolor: 'background.default',
          minHeight: 'calc(100vh - 64px)',
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