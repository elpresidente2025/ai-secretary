// frontend/src/pages/ProfilePage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Container,
  CircularProgress,
  Alert,
  Snackbar,
  Grid,
} from '@mui/material';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';
import DashboardLayout from '../components/DashboardLayout';
import UserInfoForm from '../components/UserInfoForm';
import { useAuth } from '../hooks/useAuth';

export default function ProfilePage() {
  const { user } = useAuth();
  
  // httpsCallable 메모이즈
  const callGetProfile = useMemo(() => httpsCallable(functions, 'getUserProfile'), []);
  const callUpdateProfile = useMemo(() => httpsCallable(functions, 'updateProfile'), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const [profile, setProfile] = useState({
    name: '',
    status: '현역',
    position: '',
    regionMetro: '',
    regionLocal: '',
    electoralDistrict: '',
    bio: '',
  });

  // 최초 로드
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        console.log('프로필 로드 시작...');
        
        const res = await callGetProfile();
        console.log('Functions 응답:', res);
        
        if (!mounted) return;

        // 응답 형식에 따른 데이터 추출
        let profileData = {};
        
        if (res?.data?.success && res?.data?.data) {
          profileData = res.data.data;
        } else if (res?.data?.profile) {
          profileData = res.data.profile;
        } else if (res?.data) {
          profileData = res.data.profile || res.data;
        }

        console.log('추출된 프로필 데이터:', profileData);

        setProfile({
          name: profileData.name || '',
          status: profileData.status || '현역',
          position: profileData.position || '',
          regionMetro: profileData.regionMetro || '',
          regionLocal: profileData.regionLocal || '',
          electoralDistrict: profileData.electoralDistrict || '',
          bio: profileData.bio || '',
        });
        
      } catch (e) {
        console.error('[getUserProfile 오류]', e);
        setError('프로필 정보를 불러오지 못했습니다: ' + (e.message || '알 수 없는 오류'));
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [callGetProfile]);

  // UserInfoForm 컴포넌트에서 오는 변경사항 처리
  const handleUserInfoChange = (name, value) => {
    setError('');
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // 자기소개 변경 처리
  const handleBioChange = (e) => {
    const { value } = e.target;
    setError('');
    setProfile((prev) => ({ ...prev, bio: value }));
  };

  // 검증
  const validate = () => {
    const bioTrim = (profile.bio || '').trim();
    if (!bioTrim) {
      setError('자기소개는 필수입니다. 간단히라도 본인을 설명해 주세요.');
      return false;
    }
    if (bioTrim.length < 10) {
      setError('자기소개가 너무 짧습니다. 최소 10자 이상 입력해 주세요. (권장: 100~300자)');
      return false;
    }
    if (!profile.name || !profile.position || !profile.regionMetro || !profile.regionLocal || !profile.electoralDistrict) {
      setError('모든 필수 정보를 입력해 주세요.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    console.log('폼 제출 시작...');
    
    if (!validate()) return;

    try {
      setSaving(true);
      const payload = {
        name: profile.name,
        status: profile.status,
        position: profile.position,
        regionMetro: profile.regionMetro,
        regionLocal: profile.regionLocal,
        electoralDistrict: profile.electoralDistrict,
        bio: profile.bio,
      };
      
      console.log('전송할 데이터 (전체):', JSON.stringify(payload, null, 2));
      
      const res = await callUpdateProfile(payload);
      console.log('updateProfile 응답:', res);
      
      // 실제 성공 여부 확인 후 팝업 표시
      if (res && res.data) {
        let message = '프로필이 저장되었습니다.';
        if (res.data.message) {
          message = res.data.message;
        } else if (res.data.data && res.data.data.message) {
          message = res.data.data.message;
        }
        
        setSnack({ open: true, message, severity: 'success' });
      } else {
        throw new Error('서버 응답이 올바르지 않습니다.');
      }
      
    } catch (e) {
      console.error('[updateProfile 오류 - 전체 객체]', {
        error: e,
        code: e?.code,
        message: e?.message,
        details: e?.details,
        customData: e?.customData
      });
      
      // 사용자 친화적인 에러 메시지
      let errorMessage = '저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      
      // 다양한 경로로 오는 에러 메시지 체크
      const actualMessage = e?.message || e?.details?.message || '';
      console.log('[오류 메시지 분석]', { actualMessage });
      
      // 선거구 중복 관련 메시지 우선 체크
      if (actualMessage.includes('선거구') || actualMessage.includes('사용 중') || actualMessage.includes('다른 사용자')) {
        errorMessage = '해당 선거구는 이미 다른 사용자가 사용 중입니다. 다른 선거구를 선택해주세요.';
      } else if (e.code === 'functions/already-exists') {
        errorMessage = '해당 선거구에는 이미 등록된 사용자가 있습니다. 다른 선거구를 선택해주세요.';
      } else if (e.code === 'functions/failed-precondition') {
        errorMessage = actualMessage || '선거구 정보 업데이트에 실패했습니다.';
      } else if (e.code === 'functions/not-found') {
        errorMessage = '일시적으로 서비스에 접속할 수 없습니다. 잠시 후 다시 시도해주세요.';
      } else if (e.code === 'functions/unauthenticated') {
        errorMessage = '로그인이 만료되었습니다. 다시 로그인해주세요.';
      } else if (e.code === 'functions/internal') {
        errorMessage = '서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      } else if (e.code === 'functions/permission-denied') {
        errorMessage = '권한이 없습니다. 관리자에게 문의해주세요.';
      } else if (e.message && e.message.includes('CORS')) {
        errorMessage = '서비스 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.';
      } else if (e.details?.message) {
        errorMessage = e.details.message;
      } else if (e.message) {
        // 메시지 내용 기반 에러 처리 (백업용)
        if (e.message.includes('already exists') || e.message.includes('중복') || e.message.includes('사용 중')) {
          errorMessage = '해당 선거구에는 이미 등록된 사용자가 있습니다. 다른 선거구를 선택해주세요.';
        } else if (e.message.includes('network') || e.message.includes('연결')) {
          errorMessage = '인터넷 연결을 확인하고 다시 시도해주세요.';
        } else if (e.message.includes('선거구')) {
          errorMessage = '선거구 설정 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
        } else {
          errorMessage = '저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
        }
      }
      
      setError(errorMessage);
      
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          프로필 설정
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          💡 프로필 정보를 입력하고 저장하세요. 
          등록된 정보를 바탕으로 맞춤형 원고가 생성됩니다.
        </Alert>

        <Paper elevation={2} sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              
              {/* 🔧 UserInfoForm 컴포넌트 사용 */}
              <UserInfoForm
                name={profile.name}
                status={profile.status}
                position={profile.position}
                regionMetro={profile.regionMetro}
                regionLocal={profile.regionLocal}
                electoralDistrict={profile.electoralDistrict}
                onChange={handleUserInfoChange}
                disabled={saving}
                showTitle={true}
              />

              {/* 자기소개 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  자기소개
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  multiline
                  rows={4}
                  label="자기소개"
                  name="bio"
                  value={profile.bio}
                  onChange={handleBioChange}
                  disabled={saving}
                  placeholder="본인을 소개해주세요. 정치 철학, 주요 정책, 지역 활동 등을 포함하여 작성하시면 더 개인화된 원고를 생성할 수 있습니다."
                  helperText="최소 10자 이상 입력해주세요. (권장: 100~300자)"
                />
              </Grid>

              {/* 에러 메시지 */}
              {error && (
                <Grid item xs={12}>
                  <Alert severity="error">{error}</Alert>
                </Grid>
              )}

              {/* 저장 버튼 */}
              <Grid item xs={12}>
                <Box display="flex" justifyContent="flex-end">
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={saving}
                    sx={{ minWidth: 120 }}
                  >
                    {saving ? <CircularProgress size={24} /> : '저장하기'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {/* 성공 메시지 */}
        <Snackbar
          open={snack.open}
          autoHideDuration={6000}
          onClose={() => setSnack({ ...snack, open: false })}
        >
          <Alert
            onClose={() => setSnack({ ...snack, open: false })}
            severity={snack.severity}
            sx={{ width: '100%' }}
          >
            {snack.message}
          </Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  );
}