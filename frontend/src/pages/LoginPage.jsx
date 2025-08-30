// frontend/src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  TextField,
  CircularProgress,
  Alert,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';

function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetName, setResetName] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();

  // 이미 로그인된 경우 리다이렉트
  useEffect(() => {
    if (user) {
      const redirectTo = location.state?.from?.pathname || '/dashboard';
      navigate(redirectTo, { replace: true });
    }
  }, [user, navigate, location.state]);

  // 페이지 제목 설정
  useEffect(() => {
    document.title = 'AI비서관 - 로그인';
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      // 성공 시 useAuth의 useEffect에서 자동으로 리다이렉트됩니다.
    } catch (error) {
      console.error('로그인 오류:', error);
      let errorMessage = '로그인에 실패했습니다.';
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = '유효하지 않은 이메일 주소입니다.';
          break;
        case 'auth/user-disabled':
          errorMessage = '비활성화된 계정입니다.';
          break;
        case 'auth/user-not-found':
          errorMessage = '존재하지 않는 계정입니다.';
          break;
        case 'auth/wrong-password':
          errorMessage = '잘못된 비밀번호입니다.';
          break;
        case 'auth/invalid-credential':
          errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
          break;
        case 'auth/too-many-requests':
          errorMessage = '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
          break;
        default:
          errorMessage = `로그인 실패: ${error.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    // 입력 검증
    if (!resetEmail.trim()) {
      setResetMessage('이메일을 입력해주세요.');
      return;
    }
    
    if (!resetName.trim()) {
      setResetMessage('사용자 이름을 입력해주세요.');
      return;
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail.trim())) {
      setResetMessage('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    // 사용자 이름 길이 검증
    if (resetName.trim().length < 2) {
      setResetMessage('사용자 이름은 2글자 이상 입력해주세요.');
      return;
    }

    setResetLoading(true);
    setResetMessage('');

    try {
      // Firebase Auth로 비밀번호 재설정 이메일 발송
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetMessage(`${resetName.trim()}님, 비밀번호 재설정 이메일을 ${resetEmail.trim()}로 발송했습니다. 메일함을 확인해주세요.`);
    } catch (error) {
      console.error('비밀번호 재설정 오류:', error);
      let errorMessage = '비밀번호 재설정 이메일 발송에 실패했습니다.';
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = '유효하지 않은 이메일 주소입니다.';
          break;
        case 'auth/user-not-found':
          errorMessage = '해당 이메일로 등록된 계정이 존재하지 않습니다.';
          break;
        case 'auth/too-many-requests':
          errorMessage = '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.';
          break;
        default:
          errorMessage = `오류: ${error.message}`;
      }
      
      setResetMessage(errorMessage);
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetDialogClose = () => {
    setResetDialogOpen(false);
    setResetEmail('');
    setResetName('');
    setResetMessage('');
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <Container component="main" maxWidth="xs">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box
          component="img"
          src="/logo.png"
          alt="AI비서관 로고"
          sx={{ 
            width: '80%', 
            mb: 3,
            objectFit: 'contain'
          }}
        />
        <Typography component="h1" variant="h5">
          AI비서관 로그인
        </Typography>

        <Paper elevation={2} sx={{ p: 4, mt: 3, width: '100%' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="이메일 주소"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="비밀번호"
              type="password"
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                mt: 3, 
                mb: 2,
                bgcolor: '#152484',
                '&:hover': {
                  bgcolor: '#003A87'
                }
              }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : '로그인'}
            </Button>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={() => setResetDialogOpen(true)}
                sx={{ textDecoration: 'none' }}
              >
                비밀번호 찾기
              </Link>
              <Link component={RouterLink} to="/register" variant="body2">
                회원가입하기
              </Link>
            </Box>
          </Box>
        </Paper>

        {/* 비밀번호 재설정 다이얼로그 */}
        <Dialog open={resetDialogOpen} onClose={handleResetDialogClose} maxWidth="sm" fullWidth>
          <DialogTitle>비밀번호 재설정</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              계정 확인을 위해 사용자 이름과 이메일 주소를 입력해주세요.
            </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="사용자 이름"
            type="text"
            fullWidth
            variant="outlined"
            value={resetName}
            onChange={(e) => setResetName(e.target.value)}
            disabled={resetLoading}
            placeholder="홍길동"
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            label="이메일 주소"
            type="email"
            fullWidth
            variant="outlined"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            disabled={resetLoading}
            placeholder="example@domain.com"
            sx={{ mt: 2 }}
          />
          {resetMessage && (
            <Alert 
              severity={resetMessage.includes('발송했습니다') ? 'success' : 'error'} 
              sx={{ mt: 2 }}
            >
              {resetMessage}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetDialogClose} disabled={resetLoading}>
            취소
          </Button>
          <Button 
            onClick={handlePasswordReset} 
            variant="contained" 
            disabled={resetLoading}
          >
            {resetLoading ? <CircularProgress size={20} /> : '재설정 이메일 발송'}
          </Button>
        </DialogActions>
        </Dialog>
        </Box>
      </Container>
    </Box>
  );
}

export default LoginPage;