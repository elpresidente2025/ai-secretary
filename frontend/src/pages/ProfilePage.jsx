// frontend/src/pages/ProfilePage.jsx
import React, { useEffect, useState } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
} from '@mui/material';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import allLocations from '../data/location/locations.index';
import { getFunctions, httpsCallable } from 'firebase/functions';

function ProfilePage() {
  const { auth } = useAuth();

  const [profile, setProfile] = useState({
    name: '',
    position: '',
    regionMetro: '',
    regionLocal: '',
    electoralDistrict: '',
    status: '현역',
    bio: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  // Firebase Functions (리전 고정)
  const functions = getFunctions(undefined, 'asia-northeast3');
  const callGetProfile = httpsCallable(functions, 'getUserProfile');
  const callUpdateProfile = httpsCallable(functions, 'updateProfile');

  // 최초 로드: 서버 프로필 가져오기 (없으면 auth 기본값)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await callGetProfile();
        const p = res?.data?.profile || {};
        if (!mounted) return;

        setProfile({
          name: p.name || auth?.user?.name || '',
          position: p.position || '',
          regionMetro: p.regionMetro || '',
          regionLocal: p.regionLocal || '',
          electoralDistrict: p.electoralDistrict || '',
          status: p.status || '현역',
          bio: p.bio || '',
        });

        setIsActive(!!p.isActive || !!(p.bio && String(p.bio).trim()));
      } catch (e) {
        console.error(e);
        // 서버 실패 시 auth 값으로 최대한 채워 보여주기
        setProfile((prev) => ({
          ...prev,
          name: auth?.user?.name || prev.name,
        }));
        setError('프로필을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [auth?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 드롭다운 데이터
  const metroList = Object.keys(allLocations || {}).sort();
  const localList = profile.regionMetro
    ? Object.keys(allLocations[profile.regionMetro] || {}).sort()
    : [];
  const electoralList =
    profile.regionMetro &&
    profile.regionLocal &&
    profile.position &&
    allLocations[profile.regionMetro]?.[profile.regionLocal]?.[profile.position]
      ? allLocations[profile.regionMetro][profile.regionLocal][profile.position]
      : [];

  // 입력 변경
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'position') {
      setProfile((prev) => ({ ...prev, position: value, electoralDistrict: '' }));
      return;
    }
    if (name === 'regionMetro') {
      setProfile((prev) => ({
        ...prev,
        regionMetro: value,
        regionLocal: '',
        electoralDistrict: '',
      }));
      return;
    }
    if (name === 'regionLocal') {
      setProfile((prev) => ({ ...prev, regionLocal: value, electoralDistrict: '' }));
      return;
    }
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // 검증(자기소개 필수)
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
    return true;
  };

  // 저장
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    try {
      setSaving(true);
      const payload = {
        name: profile.name,
        position: profile.position,
        regionMetro: profile.regionMetro,
        regionLocal: profile.regionLocal,
        electoralDistrict: profile.electoralDistrict,
        status: profile.status,
        bio: profile.bio, // ⭐ 필수
      };
      const res = await callUpdateProfile(payload);
      const activeNow = !!res?.data?.isActive || !!(profile.bio && profile.bio.trim());
      setIsActive(activeNow);

      setSnack({
        open: true,
        message: activeNow
          ? '프로필이 저장되었습니다. 계정 상태: 활성화 ✅'
          : '프로필이 저장되었지만 자기소개가 비어 있어 비활성화 상태입니다.',
        severity: 'success',
      });
    } catch (err) {
      console.error(err);
      setSnack({ open: true, message: '프로필 저장 중 오류가 발생했습니다.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const bioLength = (profile.bio || '').length;

  // 로딩
  if (loading) {
    return (
      <DashboardLayout title="프로필 수정">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  // 인증 안 됨
  if (!auth?.user) {
    return (
      <DashboardLayout title="프로필 수정">
        <Container maxWidth="md">
          <Alert severity="error" sx={{ mt: 4 }}>
            사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.
          </Alert>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="프로필 수정">
      <Container maxWidth="md">
        <Paper sx={{ p: 4, mt: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h4" component="h1" gutterBottom>
              프로필 수정
            </Typography>
            <Chip
              label={isActive ? '활성화' : '비활성화'}
              color={isActive ? 'success' : 'default'}
              variant={isActive ? 'filled' : 'outlined'}
            />
          </Box>

          <Typography color="text.secondary" sx={{ mb: 2 }}>
            AI가 원고를 작성할 때 참조하는 중요한 정보입니다. 정확하게 입력해주세요.
          </Typography>

          {!isActive && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              계정이 <strong>비활성화</strong> 상태입니다. 아래 <b>자기소개(필수)</b>를
              입력하고 저장하면 활성화됩니다. 자기소개는 AI가 원고를 쓸 때 <strong>개인화 지침</strong>으로 활용됩니다.
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Divider sx={{ my: 2 }} />

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* 이름 */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  name="name"
                  label="이름"
                  value={profile.name}
                  onChange={handleChange}
                  disabled={saving}
                />
              </Grid>

              {/* 직책 / 상태 */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required disabled={saving}>
                  <InputLabel>직책</InputLabel>
                  <Select
                    name="position"
                    value={profile.position}
                    label="직책"
                    onChange={handleChange}
                  >
                    <MenuItem value="">
                      <em>선택하세요</em>
                    </MenuItem>
                    <MenuItem value="국회의원">국회의원</MenuItem>
                    <MenuItem value="광역의원">광역의원</MenuItem>
                    <MenuItem value="기초의원">기초의원</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required disabled={saving}>
                  <InputLabel>상태</InputLabel>
                  <Select
                    name="status"
                    value={profile.status}
                    label="상태"
                    onChange={handleChange}
                  >
                    <MenuItem value="현역">현역</MenuItem>
                    <MenuItem value="예비">예비</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* 지역 */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required disabled={saving}>
                  <InputLabel>광역자치단체</InputLabel>
                  <Select
                    name="regionMetro"
                    value={profile.regionMetro}
                    label="광역자치단체"
                    onChange={handleChange}
                  >
                    <MenuItem value="">
                      <em>선택하세요</em>
                    </MenuItem>
                    {metroList.map((metro) => (
                      <MenuItem key={metro} value={metro}>
                        {metro}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl
                  fullWidth
                  required
                  disabled={!profile.regionMetro || saving}
                >
                  <InputLabel>기초자치단체</InputLabel>
                  <Select
                    name="regionLocal"
                    value={profile.regionLocal}
                    label="기초자치단체"
                    onChange={handleChange}
                  >
                    <MenuItem value="">
                      <em>선택하세요</em>
                    </MenuItem>
                    {localList.map((local) => (
                      <MenuItem key={local} value={local}>
                        {local}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl
                  fullWidth
                  required
                  disabled={!profile.regionLocal || !profile.position || electoralList.length === 0 || saving}
                >
                  <InputLabel>선거구</InputLabel>
                  <Select
                    name="electoralDistrict"
                    value={profile.electoralDistrict}
                    label="선거구"
                    onChange={handleChange}
                  >
                    <MenuItem value="">
                      <em>선택하세요</em>
                    </MenuItem>
                    {electoralList.map((e) => (
                      <MenuItem key={e} value={e}>
                        {e}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* 자기소개 (필수) */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  name="bio"
                  label="자기소개 (필수)"
                  placeholder={`예) 저는 ${profile.regionLocal || '지역'}에서 ${profile.position || '직책'}로 활동 중입니다. 주 관심사는 …`}
                  value={profile.bio}
                  onChange={handleChange}
                  disabled={saving}
                  multiline
                  minRows={6}
                  helperText={`글자 수: ${bioLength} (권장 100~300자) — 이 내용은 AI의 개인화 지침으로 활용됩니다.`}
                />
              </Grid>

              {/* 저장 */}
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={saving}
                  sx={{ minWidth: 200 }}
                >
                  {saving ? (
                    <>
                      <CircularProgress size={22} sx={{ mr: 1 }} /> 저장 중…
                    </>
                  ) : (
                    '프로필 저장'
                  )}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>

        <Snackbar
          open={snack.open}
          autoHideDuration={5000}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnack((s) => ({ ...s, open: false }))}
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

export default ProfilePage;
