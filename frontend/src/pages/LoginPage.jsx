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
  Alert,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { LoadingButton } from '../components/loading';
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
  const [naverDialogOpen, setNaverDialogOpen] = useState(false);
  const [naverUserData, setNaverUserData] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signInWithNaver, user } = useAuth();

  useEffect(() => {
    if (user) {
      const redirectTo = location.state?.from?.pathname || '/dashboard';
      navigate(redirectTo, { replace: true });
    }
  }, [user, navigate, location.state]);

  useEffect(() => {
    document.title = '전자두뇌비서관 - 로그인';
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
          errorMessage = '로그인 실패: ' + error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleNaverLogin = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithNaver();
    } catch (error) {
      console.error('네이버 로그인 오류:', error);
      
      // 가입 정보가 없는 경우 팝업 띄우기
      if (error.code === 'auth/user-not-found' && error.isNaverUser) {
        setNaverUserData(error.naverUserData);
        setNaverDialogOpen(true);
      } else {
        let errorMessage = '네이버 로그인에 실패했습니다.';
        
        switch (error.code) {
          case 'auth/network-request-failed':
            errorMessage = '네트워크 오류입니다. 다시 시도해주세요.';
            break;
          case 'auth/cancelled-popup-request':
            errorMessage = '네이버 로그인이 취소되었습니다.';
            break;
          case 'auth/popup-blocked':
            errorMessage = '팝업이 차단되었습니다. 팝업 차단을 해제해주세요.';
            break;
          default:
            errorMessage = error.message || '네이버 로그인에 실패했습니다.';
        }
        
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNaverDialogClose = () => {
    setNaverDialogOpen(false);
  };

  const handleGoToRegister = () => {
    setNaverDialogOpen(false);
    // 네이버 사용자 데이터를 state로 전달
    navigate('/register', { 
      state: { 
        naverUserData: naverUserData 
      } 
    });
  };

  const handlePasswordReset = async () => {
    if (!resetEmail.trim()) {
      setResetMessage('이메일을 입력해주세요.');
      return;
    }
    
    if (!resetName.trim()) {
      setResetMessage('사용자 이름을 입력해주세요.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail.trim())) {
      setResetMessage('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    if (resetName.trim().length < 2) {
      setResetMessage('사용자 이름은 2글자 이상 입력해주세요.');
      return;
    }

    setResetLoading(true);
    setResetMessage('');

    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetMessage(resetName.trim() + '님, 비밀번호 재설정 이메일을 ' + resetEmail.trim() + '로 발송했습니다. 메일함을 확인해주세요.');
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
          errorMessage = '오류: ' + error.message;
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
          src="/logo-portrait.png"
          alt="전자두뇌비서관 로고"
          sx={{ 
            width: '80%', 
            mb: 3,
            objectFit: 'contain'
          }}
        />
        <Typography component="h1" variant="h5" sx={{ color: 'white' }}>
          전자두뇌비서관 로그인
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
            
            <LoadingButton
              type="submit"
              fullWidth
              variant="contained"
              loading={loading}
              loadingText="로그인 중..."
              sx={{ mt: 3, mb: 2 }}
            >
              로그인
            </LoadingButton>

            <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
              <Box sx={{ flexGrow: 1, height: '1px', bgcolor: 'divider' }} />
              <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
                또는
              </Typography>
              <Box sx={{ flexGrow: 1, height: '1px', bgcolor: 'divider' }} />
            </Box>

            <LoadingButton
              fullWidth
              variant="outlined"
              onClick={handleNaverLogin}
              loading={loading}
              loadingText="네이버 로그인 중..."
              sx={{ mb: 2 }}
              startIcon={
                <Box
                  component="img"
                  src="https://developers.naver.com/inc/devcenter/images/nd_img.png"
                  alt="네이버"
                  sx={{ width: 18, height: 18 }}
                />
              }
            >
              네이버로 로그인
            </LoadingButton>
            
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
          <LoadingButton 
            onClick={handlePasswordReset} 
            variant="contained" 
            loading={resetLoading}
            loadingText="이메일 발송 중..."
          >
            재설정 이메일 발송
          </LoadingButton>
        </DialogActions>
        </Dialog>

        {/* 네이버 로그인 실패 다이얼로그 */}
        <Dialog open={naverDialogOpen} onClose={handleNaverDialogClose} maxWidth="sm" fullWidth>
          <DialogTitle>가입 정보 없음</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              가입 정보가 없습니다. 회원가입 페이지로 이동합니다.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              네이버 계정으로 로그인하려면 먼저 회원가입을 완료해야 합니다. 
              회원가입 페이지에서 네이버 계정을 연결하여 가입할 수 있습니다.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleNaverDialogClose} color="secondary">
              취소
            </Button>
            <Button onClick={handleGoToRegister} variant="contained" color="primary">
              회원가입 페이지로 이동
            </Button>
          </DialogActions>
        </Dialog>
        </Box>
      </Container>
    </Box>
  );
}

export default LoginPage;