import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
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
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import allLocations from '../data/location/locations.index.js';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';

function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    position: '',
    regionMetro: '',
    regionLocal: '',
    electoralDistrict: '',
    status: '현역',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [districtCheck, setDistrictCheck] = useState({ status: null, message: '' });
  const [districtCheckLoading, setDistrictCheckLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const { 
    fullName, 
    email, 
    password, 
    position, 
    regionMetro, 
    regionLocal, 
    electoralDistrict, 
    status 
  } = formData;

  // 페이지 제목 설정
  useEffect(() => {
    document.title = 'AI비서관 - 회원가입';
  }, []);

  // 지역 선택에 따른 하위 옵션 업데이트
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      regionLocal: '',
      electoralDistrict: ''
    }));
    setDistrictCheck({ status: null, message: '' });
  }, [formData.regionMetro]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      electoralDistrict: ''
    }));
    setDistrictCheck({ status: null, message: '' });
  }, [formData.regionLocal]);

  // 선거구 중복 검사
  useEffect(() => {
    const checkDistrict = async () => {
      if (!regionMetro || !regionLocal || !electoralDistrict || !position) {
        setDistrictCheck({ status: null, message: '' });
        return;
      }

      setDistrictCheckLoading(true);
      try {
        const checkDistrictAvailability = httpsCallable(functions, 'checkDistrictAvailability');
        const result = await checkDistrictAvailability({
          regionMetro,
          regionLocal,
          electoralDistrict,
          position
        });

        if (result.data.available) {
          setDistrictCheck({ 
            status: 'available', 
            message: '✅ 해당 선거구에 등록 가능합니다.' 
          });
        } else {
          setDistrictCheck({ 
            status: 'occupied', 
            message: `❌ 해당 선거구에는 이미 등록된 ${position}이 있습니다. (${result.data.occupiedBy})` 
          });
        }
      } catch (err) {
        console.error('선거구 확인 실패:', err);
        setDistrictCheck({ 
          status: 'error', 
          message: '선거구 확인 중 오류가 발생했습니다.' 
        });
      } finally {
        setDistrictCheckLoading(false);
      }
    };

    const timeoutId = setTimeout(checkDistrict, 500); // 디바운싱
    return () => clearTimeout(timeoutId);
  }, [regionMetro, regionLocal, electoralDistrict, position]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  // 광역자치단체 목록
  const metroOptions = Object.keys(allLocations);

  // 기초자치단체 목록
  const localOptions = formData.regionMetro && allLocations[formData.regionMetro] 
    ? Object.keys(allLocations[formData.regionMetro]) 
    : [];

  // 선거구 목록
  const getElectoralDistricts = () => {
    if (!formData.regionMetro || !formData.regionLocal || !formData.position) {
      return [];
    }

    const locationData = allLocations[formData.regionMetro]?.[formData.regionLocal];
    if (!locationData) return [];

    switch (formData.position) {
      case '국회의원':
        return locationData['국회의원'] || [];
      case '광역의원':
        return locationData['광역의원'] || [];
      case '기초의원':
        return locationData['기초의원'] || [];
      default:
        return [];
    }
  };

  const electoralDistrictOptions = getElectoralDistricts();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    // 기본 유효성 검사
    if (!fullName || !email || !password) {
      setError('이름, 이메일, 비밀번호를 모두 입력해야 합니다.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    // 정치인 정보 유효성 검사
    if (!position || !regionMetro || !regionLocal || !electoralDistrict) {
      setError('모든 지역구 정보를 입력해주세요.');
      return;
    }

    // 선거구 중복 검사 결과 확인
    if (districtCheck.status !== 'available') {
      setError('선거구 사용 가능 여부를 확인해주세요.');
      return;
    }

    setLoading(true);

    try {
      console.log("🔥 회원가입 시도:", { 
        fullName, 
        email, 
        position, 
        regionMetro, 
        regionLocal, 
        electoralDistrict, 
        status 
      });
      
      // register 함수에 추가 프로필 정보 전달
      await register(fullName, email, password, {
        name: fullName,
        position,
        regionMetro,
        regionLocal,
        electoralDistrict,
        status
      });
      
      console.log("✅ 회원가입 성공");
      
      setSuccess('회원가입이 성공적으로 완료되었습니다. 2초 후 로그인 페이지로 이동합니다.');
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (err) {
      console.error("❌ 회원가입 실패:", err);
      const message = err.message || '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // 선거구 상태에 따른 아이콘과 색상
  const getDistrictCheckDisplay = () => {
    if (districtCheckLoading) {
      return <CircularProgress size={20} />;
    }
    
    switch (districtCheck.status) {
      case 'available':
        return <CheckCircleIcon sx={{ color: 'success.main' }} />;
      case 'occupied':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: 'warning.main' }} />;
      default:
        return null;
    }
  };

  return (
    <Container component="main" maxWidth="md">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
              <PersonAddIcon />
            </Avatar>
            <Typography component="h1" variant="h4" gutterBottom>
              회원가입
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
              AI 비서관 서비스에 오신 것을 환영합니다
            </Typography>
            
            {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ width: '100%', mb: 2 }}>{success}</Alert>}
            
            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
              <Grid container spacing={3}>
                {/* 기본 정보 */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    기본 정보
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
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
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>직책</InputLabel>
                    <Select 
                      name="position" 
                      value={position} 
                      label="직책" 
                      onChange={handleChange} 
                      disabled={loading || !!success}
                    >
                      <MenuItem value="국회의원">국회의원</MenuItem>
                      <MenuItem value="광역의원">광역의원(시/도의원)</MenuItem>
                      <MenuItem value="기초의원">기초의원(시/군/구의원)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>상태</InputLabel>
                    <Select 
                      name="status" 
                      value={status} 
                      label="상태" 
                      onChange={handleChange} 
                      disabled={loading || !!success}
                    >
                      <MenuItem value="현역">현역</MenuItem>
                      <MenuItem value="예비">예비</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
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
                </Grid>

                <Grid item xs={12}>
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
                </Grid>

                {/* 지역구 정보 */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    지역구 정보
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>광역자치단체</InputLabel>
                    <Select
                      name="regionMetro"
                      value={regionMetro}
                      label="광역자치단체"
                      onChange={handleChange}
                      disabled={loading || !!success}
                    >
                      {metroOptions.map((metro) => (
                        <MenuItem key={metro} value={metro}>
                          {metro}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>기초자치단체</InputLabel>
                    <Select
                      name="regionLocal"
                      value={regionLocal}
                      label="기초자치단체"
                      onChange={handleChange}
                      disabled={loading || !!success || !regionMetro}
                    >
                      {localOptions.map((local) => (
                        <MenuItem key={local} value={local}>
                          {local}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>선거구</InputLabel>
                    <Select
                      name="electoralDistrict"
                      value={electoralDistrict}
                      label="선거구"
                      onChange={handleChange}
                      disabled={loading || !!success || !regionLocal || !position}
                      endAdornment={
                        <Box sx={{ mr: 2 }}>
                          {getDistrictCheckDisplay()}
                        </Box>
                      }
                    >
                      {electoralDistrictOptions.map((district) => (
                        <MenuItem key={district} value={district}>
                          {district}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* 선거구 상태 메시지 */}
                {districtCheck.message && (
                  <Grid item xs={12}>
                    <Alert 
                      severity={
                        districtCheck.status === 'available' ? 'success' : 
                        districtCheck.status === 'occupied' ? 'error' : 'warning'
                      }
                    >
                      {districtCheck.message}
                    </Alert>
                  </Grid>
                )}

                {/* 가입 버튼 */}
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    sx={{ mt: 2, py: 1.5 }}
                    disabled={
                      loading || 
                      !!success || 
                      districtCheck.status !== 'available' ||
                      districtCheckLoading
                    }
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : '가입하기'}
                  </Button>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="body2" align="center" sx={{ mt: 2 }}>
                    이미 계정이 있으신가요?{' '}
                    <Link component={RouterLink} to="/" variant="body2">
                      로그인
                    </Link>
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default RegisterPage;