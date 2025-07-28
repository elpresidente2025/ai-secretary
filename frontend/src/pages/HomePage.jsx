import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Stack,
  TextField,
  Snackbar,
  CircularProgress,
  Alert,
  Link,
  Avatar,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

function HomePage() {
  const { auth, login } = useAuth();
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Form state를 하나의 객체로 관리합니다.
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { email, password } = formData;

  useEffect(() => {
    // 사용자가 이미 로그인되어 있다면 대시보드로 리디렉션합니다.
    if (auth) {
      navigate('/dashboard', { replace: true });
    } else {
      // 인증 확인이 끝났으므로 로딩 상태를 해제합니다.
      setIsCheckingAuth(false);
    }
  }, [auth, navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setError('');
  };

  // 🔥 Firebase Auth 기반 로그인
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log("🔥 Firebase Auth 로그인 시도:", { email });
      
      // AuthContext의 login 함수 사용 (Firebase Auth 기반)
      await login(email, password);
      
      console.log("✅ Firebase Auth 로그인 성공");
      
      // 성공 시 useEffect가 대시보드로 리디렉션합니다.
    } catch (err) {
      console.error("❌ Firebase Auth 로그인 실패:", err);
      const message = err.message || '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // 인증 상태를 확인하는 동안에는 로딩 화면을 보여주어 깜빡임을 방지합니다.
  if (isCheckingAuth) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container component="main" maxWidth="xs" sx={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
      <Paper
        elevation={6}
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderRadius: 4,
          width: '100%',
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
          <AutoAwesomeIcon />
        </Avatar>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 'bold' }}>
          안녕하세요.
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          AI비서관입니다.
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%' }}>
          <Stack spacing={1}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="이메일 주소"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
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
              value={password}
              onChange={handleChange}
              disabled={loading}
            />
            <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 2, py: 1.5 }} disabled={loading}>
              {loading ? <CircularProgress size={24} color="inherit" /> : '로그인'}
            </Button>
            <Typography variant="body2" align="center" sx={{ mt: 2 }}>
              계정이 없으신가요?{' '}
              <Link component={RouterLink} to="/register" variant="body2">
                회원가입
              </Link>
            </Typography>
          </Stack>
        </Box>
      </Paper>
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error" variant="filled" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default HomePage;