import React, { useState } from 'react';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  Typography, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  CssBaseline, 
  Divider, 
  IconButton
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ArticleIcon from '@mui/icons-material/Article';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../hooks/useAuth';
import { getUserFullTitle, getUserStatusIcon } from '../utils/userUtils';

const drawerWidth = 240;

function DashboardLayout({ children, title }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const fullTitle = getUserFullTitle(auth?.user);
  const statusIcon = getUserStatusIcon(auth?.user);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { text: '대시보드', icon: <DashboardIcon />, path: '/dashboard' },
    { text: '새 포스트 생성', icon: <AddCircleOutlineIcon />, path: '/generate' },
    { text: '포스트 목록', icon: <ArticleIcon />, path: '/posts' },
    { text: '프로필 수정', icon: <AccountCircleIcon />, path: '/profile' },
  ];

  // 관리자일 경우, 관리자 메뉴를 추가합니다.
  if (auth?.user?.role === 'admin') {
    menuItems.push({ text: '관리자 페이지', icon: <AdminPanelSettingsIcon />, path: '/admin' });
  }

  const drawerContent = (
    <>
      <Toolbar
        onClick={() => navigate('/dashboard')}
        sx={{
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
          AI 비서관
        </Typography>
      </Toolbar>

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="로그아웃" />
          </ListItemButton>
        </ListItem>
      </List>
    </>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: '#1976d2'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            {title}
          </Typography>
          {auth?.user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontSize: '1.2em' }}>
                {statusIcon}
              </Typography>
              <Typography variant="body1">
                {`${fullTitle}, 안녕하세요.`}
              </Typography>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="navigation"
      >
        {/* Temporary Drawer for Mobile/Tablet */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
        >
          {drawerContent}
        </Drawer>
        {/* Permanent Drawer for Desktop */}
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

export default DashboardLayout;