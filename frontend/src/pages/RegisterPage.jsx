import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // 🔥 경로 수정
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Stack,
  TextField,
  CircularProgress,
  Alert,
  Link,
  Avatar,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const { fullName, email, password } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!fullName || !email || !password) {
      setError('이름, 이메일, 비밀번호를 모두 입력해야 합니다.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);

    try {
      console.log("🔥 Firebase Auth 회원가입 시도:", { fullName, email });
      
      await register(fullName, email, password);
      
      console.log("✅ Firebase Auth 회원가입 성공");
      
      setSuccess('회원가입이 성공적으로 완료되었습니다. 2초 후 로그인 페이지로 이동합니다.');
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (err) {
      console.error("❌ Firebase Auth 회원가입 실패:", err);
      const message = err.message || '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
              <PersonAddIcon />
            </Avatar>
            <Typography component="h1" variant="h4" gutterBottom>회원가입</Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
              AI 비서관 서비스에 오신 것을 환영합니다
            </Typography>
            {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{success}</Alert>}
            <Stack spacing={3} sx={{ width: '100%' }}>
              <TextField
                required
                fullWidth
                id="fullName"
                label="이름"
                name="fullName"
                autoComplete="name"
                autoFocus
                value={fullName}
                onChange={handleChange}
                disabled={loading || !!success}
              />
              <TextField
                required
                fullWidth
                id="email"
                label="이메일 주소"
                name="email"
                autoComplete="email"
                value={email}
                onChange={handleChange}
                disabled={loading || !!success}
              />
              <TextField
                required
                fullWidth
                name="password"
                label="비밀번호"
                type="password"
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={handleChange}
                disabled={loading || !!success}
                helperText="6자 이상 입력해주세요."
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 2, py: 1.5 }}
                disabled={loading || !!success}
                onClick={handleSubmit}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : '가입하기'}
              </Button>
              <Typography variant="body2" align="center" sx={{ mt: 2 }}>
                이미 계정이 있으신가요?{' '}
                <Link component={RouterLink} to="/" variant="body2">
                  로그인
                </Link>
              </Typography>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default RegisterPage;