// frontend/src/components/DashboardLayout.jsx
import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Button,
  Avatar,
  Menu,
  MenuItem,
  IconButton
} from '@mui/material';
import { 
  AccountCircle, 
  Logout,
  Dashboard,
  Create,
  History
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

const DashboardLayout = ({ title, children }) => {
  const { auth, signOut } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    handleClose();
    await signOut();
  };

  if (auth.loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <Typography variant="h6">로딩 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* 상단 네비게이션 */}
      <AppBar position="static" sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            AI 비서관 - {title}
          </Typography>
          
          {auth.user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ color: 'white' }}>
                {auth.user.name || auth.user.email}
              </Typography>
              
              <IconButton
                size="large"
                onClick={handleMenu}
                color="inherit"
              >
                <AccountCircle />
              </IconButton>
              
              <Menu
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem onClick={handleClose}>
                  <Dashboard sx={{ mr: 1 }} />
                  대시보드
                </MenuItem>
                <MenuItem onClick={handleClose}>
                  <Create sx={{ mr: 1 }} />
                  원고 생성
                </MenuItem>
                <MenuItem onClick={handleClose}>
                  <History sx={{ mr: 1 }} />
                  히스토리
                </MenuItem>
                <MenuItem onClick={handleSignOut}>
                  <Logout sx={{ mr: 1 }} />
                  로그아웃
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* 메인 콘텐츠 */}
      <Box sx={{ minHeight: 'calc(100vh - 64px)', bgcolor: 'grey.50', py: 3 }}>
        {children}
      </Box>
    </Box>
  );
};

export default DashboardLayout;