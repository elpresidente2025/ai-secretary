// frontend/src/components/DashboardLayout.jsx
import React, { useMemo, useState, useCallback } from 'react';
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
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserDisplayTitle, getUserRegionInfo, getUserStatusIcon } from '../utils/userUtils';

const HeaderLogo = () => (
  <Box
    component={Link}
    to="/dashboard"
    aria-label="AI비서관 홈으로"
    sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}
  >
    <Box
      component="img"
      src="/logo.png" // public/logo.png
      alt="AI비서관 로고"
      onError={(e) => { e.currentTarget.style.display = 'none'; }}
      sx={{ height: 32, width: 32, mr: 1, borderRadius: 1, objectFit: 'contain' }}
    />
    <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1 }}>
      AI비서관
    </Typography>
  </Box>
);

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isLgDown = useMediaQuery(theme.breakpoints.down('lg')); // lg 미만 = 햄버거
  const navigate = useNavigate();
  const location = useLocation();

  const userIcon = getUserStatusIcon(user);
  const regionInfo = getUserRegionInfo(user);
  const isAdmin = user?.role === 'admin';

  const menuItems = useMemo(() => {
    const base = [
      { text: '새 원고 생성', icon: <Create />, path: '/generate' },
      { text: '히스토리', icon: <History />, path: '/posts' },
      { text: '프로필 수정', icon: <Settings />, path: '/profile' },
      { text: '인증 및 결제', icon: <CreditCard />, path: '/billing' },
    ];
    return isAdmin ? [...base, { text: '관리', icon: <AdminPanelSettings />, path: '/admin' }] : base;
  }, [isAdmin]);

  const isCurrentPath = (path) => location.pathname === path;
  const handleNavigate = (path) => { navigate(path); setDrawerOpen(false); };
  const handleDrawerToggle = () => setDrawerOpen((v) => !v);
  const handleLogout = useCallback(async () => { await logout(); setDrawerOpen(false); }, [logout]);

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
            <ListItemButton
              onClick={() => handleNavigate(item.path)}
              selected={isCurrentPath(item.path)}
              aria-current={isCurrentPath(item.path) ? 'page' : undefined}
            >
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
    // 헤더/본문/푸터 = 100vh, 본문만 스크롤
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: '#152484',
          borderBottom: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 1px 6px rgba(0,0,0,0.12)'
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          {/* Left: 로고 */}
          <HeaderLogo />

          {/* Center: 내비게이션 (lg 이상만) — NavLink로 활성 스타일 자동화 */}
          {!isLgDown && (
            <Box
              component="nav"
              aria-label="주요 메뉴"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                flex: 1,      // 가운데 확장
                minWidth: 0
              }}
            >
              {menuItems.map((item) => (
                <Button
                  key={item.text}
                  component={NavLink}
                  to={item.path}
                  end
                  startIcon={item.icon}
                  className={({ isActive }) => (isActive ? 'nav-active' : undefined)}
                  sx={{
                    color: 'white',
                    whiteSpace: 'nowrap',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.10)' },
                    '&.nav-active': { bgcolor: 'rgba(255,255,255,0.20)', fontWeight: 'bold' }
                  }}
                  aria-current={isCurrentPath(item.path) ? 'page' : undefined}
                >
                  {item.text}
                </Button>
              ))}
            </Box>
          )}

          {/* Spacer: 내비가 숨겨지는 경우에도 우측 고정 보장을 위해 남겨둠 */}
          {isLgDown && <Box sx={{ flex: 1 }} />}

          {/* Right: 액션/햄버거 (항상 우측 끝) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            {!isLgDown ? (
              <Button
                color="inherit"
                startIcon={<Logout />}
                onClick={handleLogout}
                sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                로그아웃
              </Button>
            ) : (
              <IconButton color="inherit" onClick={handleDrawerToggle} edge="end" aria-label="메뉴 열기">
                <MenuIcon />
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* 모바일 드로어 */}
      <Drawer anchor="right" open={drawerOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }}>
        {drawer}
      </Drawer>

      {/* 본문: 남은 공간 확장 + 내부 스크롤 */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          overscrollBehavior: 'contain',
          scrollbarGutter: 'stable',
          bgcolor: 'background.default',
          display: 'flex',
          justifyContent: 'center',
          width: '100%'
        }}
      >
        <Box sx={{ width: '100%', px: { xs: 1.5, sm: 2 }, maxWidth: { md: 980, lg: 1200, xl: 1440 } }}>
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
          textAlign: 'center',
          pb: 'max(8px, env(safe-area-inset-bottom))'
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
