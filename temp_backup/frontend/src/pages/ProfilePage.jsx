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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import DashboardLayout from '../components/DashboardLayout';

// 최소 지역 데이터(필요하면 실제 데이터로 교체)
// 예시: 인천/계양구/가~라선거구
const DIST_DATA = {
  인천광역시: {
    계양구: ['가선거구', '나선거구', '다선거구', '라선거구'],
  },
  // 다른 광역/기초 추가 가능
};

const metroList = Object.keys(DIST_DATA);

function getLocalList(metro) {
  return metro && DIST_DATA[metro] ? Object.keys(DIST_DATA[metro]) : [];
}
function getElectoralList(metro, local) {
  return metro && local && DIST_DATA[metro]?.[local] ? DIST_DATA[metro][local] : [];
}

// 서버와 동일한 districtKey 규칙(공백 제거/소문자/문자숫자만)
const norm = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{Letter}\p{Number}]/gu, '');
const makeDistrictKey = ({ position, regionMetro, regionLocal, electoralDistrict }) =>
  [position, regionMetro, regionLocal, electoralDistrict].map(norm).join('__');

export default function ProfilePage() {
  // httpsCallable 메모이즈(react-hooks/exhaustive-deps 해소)
  const callGetProfile = useMemo(() => httpsCallable(functions, 'getUserProfile'), []);
  const callUpdateProfile = useMemo(() => httpsCallable(functions, 'updateProfile'), []);
  const callCheckAvailability = useMemo(() => httpsCallable(functions, 'checkDistrictAvailability'), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const [profile, setProfile] = useState({
    name: '',
    bio: '',
    position: '',
    regionMetro: '',
    regionLocal: '',
    electoralDistrict: '',
    status: '현역',
  });

  // 원래 값(선거구 변경 감지용)
  const [original, setOriginal] = useState({
    position: '',
    regionMetro: '',
    regionLocal: '',
    electoralDistrict: '',
  });

  // 셀렉트 목록
  const localList = useMemo(() => getLocalList(profile.regionMetro), [profile.regionMetro]);
  const electoralList = useMemo(
    () => getElectoralList(profile.regionMetro, profile.regionLocal),
    [profile.regionMetro, profile.regionLocal]
  );

  // 최초 로드
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await callGetProfile();
        const p = res?.data?.profile || {};
        if (!mounted) return;

        setProfile({
          name: p.name || '',
          bio: p.bio || '',
          position: p.position || '',
          regionMetro: p.regionMetro || '',
          regionLocal: p.regionLocal || '',
          electoralDistrict: p.electoralDistrict || '',
          status: p.status || '현역',
        });
        setOriginal({
          position: p.position || '',
          regionMetro: p.regionMetro || '',
          regionLocal: p.regionLocal || '',
          electoralDistrict: p.electoralDistrict || '',
        });
      } catch (e) {
        console.error('[getUserProfile]', e);
        setError('프로필 정보를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [callGetProfile]);

  const handleText = (e) => {
    const { name, value } = e.target;
    setError('');
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelect = (e) => {
    const { name, value } = e.target;
    setError('');

    // 의존성 초기화
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
      setProfile((prev) => ({
        ...prev,
        regionLocal: value,
        electoralDistrict: '',
      }));
      return;
    }
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // 프런트 검증 + (변경 시) 사전 가용성 체크
  const validate = async () => {
    const bioTrim = (profile.bio || '').trim();
    if (!bioTrim) {
      setError('자기소개는 필수입니다. 간단히라도 본인을 설명해 주세요.');
      return false;
    }
    if (bioTrim.length < 10) {
      setError('자기소개가 너무 짧습니다. 최소 10자 이상 입력해 주세요. (권장: 100~300자)');
      return false;
    }
    // 4개 필드 모두 채워져야 서버에서 선거구 처리 가능
    if (!profile.position || !profile.regionMetro || !profile.regionLocal || !profile.electoralDistrict) {
      setError('직책, 광역/기초자치단체, 선거구를 모두 선택해 주세요.');
      return false;
    }

    // 변경 여부 확인
    const oldKey = makeDistrictKey(original);
    const newKey = makeDistrictKey(profile);
    const changed = oldKey !== newKey;

    // 바뀐 경우 저장 전에 가용성 체크(UX 개선)
    if (changed) {
      try {
        const res = await callCheckAvailability({
          position: profile.position,
          regionMetro: profile.regionMetro,
          regionLocal: profile.regionLocal,
          electoralDistrict: profile.electoralDistrict,
        });
        const { available } = res?.data || {};
        if (!available) {
          setError('이미 사용 중인 선거구입니다. 다른 선거구를 선택해 주세요.');
          return false;
        }
      } catch (e) {
        console.error('[checkDistrictAvailability]', e);
        // 가용성 체크 실패 시에도 서버에 맡겨 저장 시도는 허용(네트워크 요동 대비)
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!(await validate())) return;

    try {
      setSaving(true);
      const payload = {
        name: profile.name,
        bio: profile.bio,
        status: profile.status || '현역',
        position: profile.position,
        regionMetro: profile.regionMetro,
        regionLocal: profile.regionLocal,
        electoralDistrict: profile.electoralDistrict,
      };
      const res = await callUpdateProfile(payload);
      const msg = res?.data?.message || '프로필이 저장되었습니다.';

      // 저장 성공 시 원본 키 갱신
      setOriginal({
        position: profile.position,
        regionMetro: profile.regionMetro,
        regionLocal: profile.regionLocal,
        electoralDistrict: profile.electoralDistrict,
      });

      setSnack({ open: true, message: msg, severity: 'success' });
    } catch (err) {
      console.error('[updateProfile]', err);
      const msg =
        err?.message ||
        err?.details ||
        (err?.code === 'already-exists' ? '이미 사용 중인 선거구입니다.' : '프로필 저장 중 오류가 발생했습니다.');
      setSnack({ open: true, message: msg, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const bioLength = (profile.bio || '').length;

  if (loading) {
    return (
      <DashboardLayout title="프로필 수정">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="프로필 수정">
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            기본 정보
          </Typography>

          {error && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="이름"
                  name="name"
                  value={profile.name}
                  onChange={handleText}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="position-label">직책</InputLabel>
                  <Select
                    labelId="position-label"
                    label="직책"
                    name="position"
                    value={profile.position}
                    onChange={handleSelect}
                    required
                  >
                    <MenuItem value="">
                      <em>선택하세요</em>
                    </MenuItem>
                    <MenuItem value="광역의원">광역의원</MenuItem>
                    <MenuItem value="기초의원">기초의원</MenuItem>
                    <MenuItem value="예비후보">예비후보</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="metro-label">광역자치단체</InputLabel>
                  <Select
                    labelId="metro-label"
                    label="광역자치단체"
                    name="regionMetro"
                    value={profile.regionMetro}
                    onChange={handleSelect}
                    required
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
                <FormControl fullWidth>
                  <InputLabel id="local-label">기초자치단체</InputLabel>
                  <Select
                    labelId="local-label"
                    label="기초자치단체"
                    name="regionLocal"
                    value={profile.regionLocal}
                    onChange={handleSelect}
                    required
                    disabled={!profile.regionMetro}
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
                <FormControl fullWidth>
                  <InputLabel id="district-label">선거구</InputLabel>
                  <Select
                    labelId="district-label"
                    label="선거구"
                    name="electoralDistrict"
                    value={profile.electoralDistrict}
                    onChange={handleSelect}
                    required
                    disabled={!profile.regionLocal}
                  >
                    <MenuItem value="">
                      <em>선택하세요</em>
                    </MenuItem>
                    {electoralList.map((d) => (
                      <MenuItem key={d} value={d}>
                        {d}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={`자기소개 (${bioLength}자)`}
                  name="bio"
                  value={profile.bio}
                  onChange={handleText}
                  multiline
                  minRows={5}
                  placeholder="정책 중심, 지역 발전 계획, 공약 방향 등… (100~300자 권장)"
                  inputProps={{ maxLength: 1000 }}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button type="submit" variant="contained" disabled={saving}>
                    {saving ? <CircularProgress size={20} /> : '저장'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        <Snackbar
          open={snack.open}
          autoHideDuration={4000}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
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
