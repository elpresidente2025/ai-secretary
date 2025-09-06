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
  AdminPanelSettings,
  MenuBook
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
  const isAdmin = user?.role === 'admin' || user?.isAdmin;
  const hasBio = user?.bio && user.bio.trim().length > 0;

  // 자기소개가 없는 사용자는 제한된 메뉴만 표시
  const menuItems = [];
  
  if (hasBio || isAdmin) {
    // 자기소개가 있거나 관리자인 경우 전체 메뉴 표시
    menuItems.push(
      { text: '새 원고 생성', icon: <Create />, path: '/generate' },
      { text: '히스토리', icon: <History />, path: '/posts' },
      { text: '가이드라인', icon: <MenuBook />, path: '/guidelines' }
    );
  }
  
  // 프로필과 결제는 항상 표시
  menuItems.push(
    { text: '프로필 수정', icon: <Settings />, path: '/profile' },
    { text: '인증 및 결제', icon: <CreditCard />, path: '/billing' }
  );
  
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
          <Typography variant="caption" sx={{ color: 'rgba(0, 0, 0, 0.7)' }}>
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
    // 전체를 자연스러운 흐름으로: 헤더 + 본문 + 푸터
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* 상단 헤더: 완전 고정 */}
      <AppBar 
        position="fixed" 
        elevation={0} 
        sx={{ 
          bgcolor: '#152484', 
          top: 0, 
          zIndex: (t) => t.zIndex.appBar + 1,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)',
            pointerEvents: 'none',
            zIndex: 1
          }
        }}
      >
        <Toolbar sx={{ position: 'relative', zIndex: 2 }}>
          {/* 로고 (왼쪽 정렬) */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, cursor: 'pointer' }}
            onClick={handleLogoClick}
          >
            <Box
              component="img"
              src="/logo-landscape.png"
              alt="전자두뇌비서관 로고"
              sx={{ height: 32, objectFit: 'contain' }}
            />
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

      <Drawer 
        anchor="right" 
        open={drawerOpen} 
        onClose={handleDrawerToggle} 
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(10px)',
            color: 'black'
          }
        }}
      >
        {drawer}
      </Drawer>

      {/* 본문 */}
      <Box
        component="main"
        sx={{
          flex: 1,
          bgcolor: 'transparent', // 카본 질감이 보이도록 투명하게 설정
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
          pt: '64px', // 고정 헤더 높이만큼 상단 여백
          pb: 4, // 푸터와의 간격
        }}
      >
        <Box sx={{ width: '100%', maxWidth: '85vw' }}>
          {children}
        </Box>
      </Box>

      {/* 푸터 - 콘텐츠 끝에 자연스럽게 배치 */}
      <Box
        component="footer"
        sx={{
          mt: 'auto', // 자동으로 하단에 밀어넣기
          py: 2,
          px: 2,
          bgcolor: '#152484',
          borderTop: '1px solid',
          borderColor: 'divider',
          textAlign: 'center',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)',
            pointerEvents: 'none',
            zIndex: 1
          }
        }}
      >
        <Typography variant="caption" sx={{ lineHeight: 1.6, color: 'white', position: 'relative', zIndex: 2 }}>
          사이버브레인 | 사업자등록번호: 870-55-00786 | 통신판매업신고번호: (비움)<br />
          대표: 차서영 | 인천광역시 계양구 용종로 124, 학마을한진아파트 139동 1504호 | 대표번호: 010-4885-6206<br />
          Copyright 2025. CyberBrain. All Rights Reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default DashboardLayout;
