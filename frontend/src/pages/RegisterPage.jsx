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
  Alert,
  Link,
  Avatar,
  Grid,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import UserInfoForm from '../components/UserInfoForm';
import { LoadingButton } from '../components/loading';

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
    document.title = '전자두뇌비서관 - 회원가입';
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
          <Box
            component="img"
            src="/logo-portrait.png"
            alt="전자두뇌비서관 로고"
            sx={{
              height: 80,
              width: 'auto',
              mb: 2
            }}
          />
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
    <Container component="main" maxWidth="md" sx={{ height: '100vh', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 2,
        }}
      >
        <Box
          component="img"
          src="/logo-portrait.png"
          alt="전자두뇌비서관 로고"
          sx={{
            height: 80,
            width: 'auto',
            mb: 2
          }}
        />
        <Typography component="h1" variant="h5" sx={{ color: 'white' }}>
          전자두뇌비서관 회원가입
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
                  FormHelperTextProps={{ sx: { color: 'black' } }}
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
                  FormHelperTextProps={{ sx: { color: 'black' } }}
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
                      sx={{
                        color: '#152484',
                        '&.Mui-checked': {
                          color: '#152484',
                        },
                        '&.Mui-disabled': {
                          color: 'rgba(0, 0, 0, 0.26)',
                        }
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2">
                      <strong>이용약관</strong> 및 <strong>개인정보처리방침</strong>에 동의합니다. (필수)
                    </Typography>
                  }
                />
              </Grid>

              {/* 약관 내용을 스크롤 가능한 텍스트박스로 표시 */}
              <Grid item xs={12}>
                <Box
                  sx={{
                    border: '1px solid #ccc',
                    borderRadius: 1,
                    p: 2,
                    maxHeight: 150,
                    overflowY: 'auto',
                    backgroundColor: '#f9f9f9',
                    fontSize: '0.875rem',
                    lineHeight: 1.5
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, color: '#152484' }}>
                    전자두뇌비서관 이용약관
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    최종 개정일: 2025년 9월 1일
                  </Typography>
                  
                  <Typography paragraph sx={{ fontSize: '0.75rem' }}>
                    본 이용약관은 사이버브레인(이하 "회사")이 제공하는 전자두뇌비서관(이하 "서비스")를 이용함에 있어 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
                  </Typography>

                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2, mb: 1, color: '#152484', fontSize: '0.8rem' }}>
                    제1조 (목적)
                  </Typography>
                  <Typography paragraph sx={{ fontSize: '0.75rem' }}>
                    이 약관은 회사가 제공하는 AI 콘텐츠 생성 서비스의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 이용조건 및 절차 등 기본적인 사항을 규정합니다.
                  </Typography>

                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2, mb: 1, color: '#152484', fontSize: '0.8rem' }}>
                    제2조 (정의)
                  </Typography>
                  <Typography paragraph sx={{ fontSize: '0.75rem' }}>
                    1. "서비스"란 회사가 제공하는 블로그 원고 초안 자동 생성 및 관련 지원 서비스를 말합니다.<br />
                    2. "이용자"란 본 약관에 동의하고 회사의 서비스를 이용하는 개인 또는 단체를 말합니다.
                  </Typography>

                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2, mb: 1, color: '#152484', fontSize: '0.8rem' }}>
                    제3조 (약관의 효력 및 변경)
                  </Typography>
                  <Typography paragraph sx={{ fontSize: '0.75rem' }}>
                    1. 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력을 발생합니다.<br />
                    2. 회사는 필요한 경우 관련 법령을 위반하지 않는 범위에서 이 약관을 변경할 수 있습니다.
                  </Typography>

                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2, mb: 1, color: '#152484', fontSize: '0.8rem' }}>
                    제4조 (이용계약의 성립)
                  </Typography>
                  <Typography paragraph sx={{ fontSize: '0.75rem' }}>
                    1. 이용계약은 이용자가 약관의 내용에 동의하고 서비스 이용을 신청한 후, 회사가 이를 승낙함으로써 성립합니다.<br />
                    2. 회사는 타인의 명의를 도용하거나 허위 정보를 기재한 경우, 기타 회사의 정책상 부적절하다고 판단되는 경우 승낙을 하지 않을 수 있습니다.
                  </Typography>

                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2, mb: 1, color: '#152484', fontSize: '0.8rem' }}>
                    제5조 (개인정보 수집 및 이용)
                  </Typography>
                  <Typography paragraph sx={{ fontSize: '0.75rem' }}>
                    회사는 서비스 제공을 위해 필요한 개인정보를 수집하고 이를 안전하게 보호하기 위해 노력합니다. 자세한 내용은 개인정보처리방침을 참조하시기 바랍니다.
                  </Typography>

                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2, mb: 1, color: '#152484', fontSize: '0.8rem' }}>
                    제6조 (개인정보의 국외이전)
                  </Typography>
                  <Typography paragraph sx={{ fontSize: '0.75rem' }}>
                    1. 회사는 서비스 제공을 위하여 개인정보를 국외에 이전합니다.<br />
                    2. 이전받는 자: Google LLC (Firebase, Gemini API), 이전 국가: 미국<br />
                    3. 이전 목적: 데이터 저장, 서비스 운영 및 안정성 확보<br />
                    4. 보유 및 이용기간: 이용자의 서비스 탈퇴 또는 동의 철회 시까지
                  </Typography>

                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2, mb: 1, color: '#152484', fontSize: '0.8rem' }}>
                    제10조 (환불 규정)
                  </Typography>
                  <Typography paragraph sx={{ fontSize: '0.75rem' }}>
                    1. 구매일 또는 서비스 제공 시작일로부터 7일 이내에는 전액 환불이 가능합니다.<br />
                    2. 원고 생성 횟수를 일부 사용한 이후에는 미사용 횟수에 해당하는 금액을 일할 계산하여 환불합니다.<br />
                    3. 회사는 환불 요청을 받은 날로부터 7영업일 이내에 환불을 완료하며, 환불은 카드 결제 취소를 통해 처리됩니다.
                  </Typography>

                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2, mb: 1, color: '#152484', fontSize: '0.8rem' }}>
                    제12조 (이중당적자의 이용 제한)
                  </Typography>
                  <Typography paragraph sx={{ fontSize: '0.75rem' }}>
                    1. 이용자가 이중당적 상태임이 확인될 경우, 회사는 서비스 이용계약을 해지하고 관련 사실을 관계기관에 통보할 수 있습니다.<br />
                    2. 이중당적 사실로 인해 발생한 모든 불이익은 이용자 본인의 책임이며, 회사는 이에 대해 일절 책임지지 않습니다.
                  </Typography>

                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2, mb: 1, color: '#152484', fontSize: '0.8rem' }}>
                    제13조 (결제 및 정기결제)
                  </Typography>
                  <Typography paragraph sx={{ fontSize: '0.75rem' }}>
                    1. 서비스 이용료는 매월 1일에 자동 결제됩니다.<br />
                    2. 월 중 가입 시에도 정가로 결제되며, 다음 결제일은 익월 1일입니다.<br />
                    3. 원고 생성 횟수는 매월 1일 0시에 플랜별 기본 횟수로 초기화됩니다.<br />
                    4. 잔여 생성 횟수는 다음 달로 이월되지 않습니다.
                  </Typography>

                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2, mb: 1, color: '#152484', fontSize: '0.8rem' }}>
                    제14조 (면책조항)
                  </Typography>
                  <Typography paragraph sx={{ fontSize: '0.75rem' }}>
                    1. 회사는 AI가 생성한 콘텐츠의 정확성, 완전성, 적법성에 대해 보장하지 않으며, 이용자가 해당 콘텐츠를 사용하는 과정에서 발생한 문제에 대해 책임지지 않습니다.<br />
                    2. 회사는 천재지변, 기술적 장애 등 불가항력적인 사유로 인한 서비스 제공 중단에 대해 책임을 지지 않습니다.
                  </Typography>

                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 2, mb: 1, color: '#152484', fontSize: '0.8rem' }}>
                    제15조 (준거법 및 관할)
                  </Typography>
                  <Typography paragraph sx={{ fontSize: '0.75rem' }}>
                    1. 본 약관은 대한민국 법률에 따라 해석됩니다.<br />
                    2. 서비스 이용과 관련하여 회사와 이용자 간에 발생한 분쟁에 대해서는 인천지방법원 부천지원 또는 인천지방법원 북부지원을 1심 관할법원으로 합니다.
                  </Typography>

                  <Box sx={{ mt: 2, p: 1.5, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#152484' }}>
                      부칙: 본 약관은 2025년 9월 1일부터 시행됩니다.
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {/* 에러 메시지 */}
              {error && (
                <Grid item xs={12}>
                  <Alert severity="error">{error}</Alert>
                </Grid>
              )}

              {/* 가입 버튼 */}
              <Grid item xs={12}>
                <LoadingButton
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  loading={loading}
                  loadingText="가입 처리 중..."
                  sx={{ 
                    mt: 2, mb: 2, py: 1.5,
                    bgcolor: '#152484',
                    '&:hover': { bgcolor: '#003A87' }
                  }}
                >
                  회원가입
                </LoadingButton>
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