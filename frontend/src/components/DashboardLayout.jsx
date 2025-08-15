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
  Badge,
  Avatar
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Create,
  History,
  Settings,
  Notifications,
  Search,
  Logout,
  Person
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getUserFullTitle, getUserDisplayTitle, getUserRegionInfo, getUserStatusIcon } from '../utils/userUtils';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleLogout = async () => {
    await logout();
    setDrawerOpen(false);
  };

  // 사용자 정보 가져오기
  const userTitle = getUserFullTitle(user);
  const userIcon = getUserStatusIcon(user);
  const regionInfo = getUserRegionInfo(user);

  // 모바일 드로어 메뉴 항목
  const drawerItems = [
    { text: '대시보드', icon: <Dashboard />, path: '/dashboard' },
    { text: '새 원고 생성', icon: <Create />, path: '/generate' },
    { text: '히스토리', icon: <History />, path: '/posts' },
    { text: '설정', icon: <Settings />, path: '/profile' },
  ];

  const navigate = useNavigate();

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
        {drawerItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              onClick={() => {
                navigate(item.path);
                setDrawerOpen(false);
              }}
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
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          {/* 로고/제목 */}
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            AI비서관
          </Typography>

          {/* PC 버전 - 검색, 알림, 프로필 */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton color="inherit">
                <Search />
              </IconButton>
              <IconButton color="inherit">
                <Badge badgeContent={2} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
              <IconButton color="inherit">
                <Person />
              </IconButton>
            </Box>
          )}

          {/* 모바일 버전 - 햄버거 메뉴 */}
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