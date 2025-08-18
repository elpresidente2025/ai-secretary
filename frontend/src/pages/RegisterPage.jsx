// frontend/src/pages/RegisterPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
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
  Avatar,
  Grid,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import UserInfoForm from '../components/UserInfoForm';

function RegisterPage() {
  const [formData, setFormData] = useState({
    // 인증 정보
    email: '',
    password: '',
    confirmPassword: '',
    // 사용자 기본 정보
    name: '',
    status: '현역',
    position: '',
    regionMetro: '',
    regionLocal: '',
    electoralDistrict: '',
    // 약관 동의
    agreedToTerms: false,
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  // 페이지 제목 설정
  useEffect(() => {
    document.title = 'AI비서관 - 회원가입';
  }, []);

  // 일반 입력 필드 변경 처리
  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  // UserInfoForm 컴포넌트에서 오는 변경사항 처리
  const handleUserInfoChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  // 폼 검증
  const validateForm = () => {
    const { email, password, confirmPassword, name, position, regionMetro, regionLocal, electoralDistrict, agreedToTerms } = formData;
    
    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('올바른 이메일 형식이 아닙니다.');
      return false;
    }
    
    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return false;
    }
    
    if (!position || !regionMetro || !regionLocal || !electoralDistrict) {
      setError('지역구 정보를 모두 선택해주세요.');
      return false;
    }
    
    if (!agreedToTerms) {
      setError('이용약관에 동의해주세요.');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // 회원가입 수행
      await register({
        email: formData.email,
        password: formData.password,
        displayName: formData.name,
        profileData: {
          name: formData.name,
          status: formData.status,
          position: formData.position,
          regionMetro: formData.regionMetro,
          regionLocal: formData.regionLocal,
          electoralDistrict: formData.electoralDistrict,
        }
      });

      setSuccess('회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      console.error('회원가입 오류:', error);
      
      let errorMessage = '회원가입 중 문제가 발생했습니다.';
      
      if (error.message.includes('already exists') || error.message.includes('중복')) {
        errorMessage = '이미 등록된 지역구입니다. 다른 지역구를 선택해주세요.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = '이미 사용 중인 이메일입니다.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = '비밀번호가 너무 간단합니다. 더 복잡한 비밀번호를 사용해주세요.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = '올바른 이메일 형식이 아닙니다.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 성공 화면
  if (success) {
    return (
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'success.main' }}>
            <PersonAddIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            회원가입 완료
          </Typography>
          <Alert severity="success" sx={{ mt: 2, width: '100%' }}>
            {success}
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
          <PersonAddIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          AI비서관 회원가입
        </Typography>

        <Paper elevation={2} sx={{ p: 4, mt: 3, width: '100%' }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>

              {/* 계정 정보 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  계정 정보
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="이메일 주소"
                  name="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="비밀번호"
                  type="password"
                  id="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  helperText="6자 이상 입력해주세요."
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="confirmPassword"
                  label="비밀번호 확인"
                  type="password"
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                  helperText="위와 같은 비밀번호를 입력해주세요."
                />
              </Grid>

              {/* 🔧 UserInfoForm 컴포넌트 사용 */}
              <UserInfoForm
                name={formData.name}
                status={formData.status}
                position={formData.position}
                regionMetro={formData.regionMetro}
                regionLocal={formData.regionLocal}
                electoralDistrict={formData.electoralDistrict}
                onChange={handleUserInfoChange}
                disabled={loading}
                enableDuplicateCheck={false} // 🔧 중복 체크 비활성화
                excludeUserId={null}
                showTitle={true}
              />

              {/* 이용약관 동의 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  약관 동의
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="agreedToTerms"
                      checked={formData.agreedToTerms}
                      onChange={handleChange}
                      disabled={loading}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      <strong>이용약관</strong> 및 <strong>개인정보처리방침</strong>에 동의합니다. (필수)
                      <br />
                      <Link 
                        component="button" 
                        variant="body2" 
                        onClick={(e) => {
                          e.preventDefault();
                          // TODO: 약관 모달 또는 페이지 열기
                          alert('이용약관 페이지가 구현 예정입니다.');
                        }}
                      >
                        약관 내용 보기
                      </Link>
                    </Typography>
                  }
                />
              </Grid>

              {/* 에러 메시지 */}
              {error && (
                <Grid item xs={12}>
                  <Alert severity="error">{error}</Alert>
                </Grid>
              )}

              {/* 가입 버튼 */}
              <Grid item xs={12}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ mt: 2, mb: 2, py: 1.5 }}
                >
                  {loading ? <CircularProgress size={24} /> : '회원가입'}
                </Button>
              </Grid>

              {/* 로그인 링크 */}
              <Grid item xs={12}>
                <Box textAlign="center">
                  <Link component={RouterLink} to="/login" variant="body2">
                    이미 계정이 있으신가요? 로그인하기
                  </Link>
                </Box>
              </Grid>

            </Grid>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default RegisterPage;