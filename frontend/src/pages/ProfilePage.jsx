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
import { functions } from '../services/firebase';
import DashboardLayout from '../components/DashboardLayout';
import allLocations from '../data/location/locations.index';

// 전국 모든 지역 데이터를 locations.index.js에서 가져옴
const DIST_DATA = allLocations;

const metroList = Object.keys(DIST_DATA);

function getLocalList(metro) {
  return metro && DIST_DATA[metro] ? Object.keys(DIST_DATA[metro]) : [];
}

function getElectoralList(metro, local, position) {
  if (!metro || !local || !DIST_DATA[metro]?.[local] || !position) return [];
  
  // position에 따라 적절한 선거구 유형 반환
  const districtData = DIST_DATA[metro][local];
  
  if (position === '국회의원') {
    return districtData['국회의원'] || [];
  } else if (position === '광역의원') {
    return districtData['광역의원'] || [];
  } else if (position === '기초의원') {
    return districtData['기초의원'] || [];
  }
  
  return [];
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
    () => getElectoralList(profile.regionMetro, profile.regionLocal, profile.position),
    [profile.regionMetro, profile.regionLocal, profile.position]
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
    if (name === 'position') {
      setProfile((prev) => ({
        ...prev,
        position: value,
        regionMetro: '',
        regionLocal: '',
        electoralDistrict: '',
      }));
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
      setSnack({ open: true, message: msg, severity: 'success' });
      
      // 원본 정보 업데이트(변경 감지용)
      setOriginal({
        position: profile.position,
        regionMetro: profile.regionMetro,
        regionLocal: profile.regionLocal,
        electoralDistrict: profile.electoralDistrict,
      });
    } catch (e) {
      console.error('[updateProfile]', e);
      const msg = e?.details?.message || e?.message || '저장 중 오류가 발생했습니다.';
      setError(msg);
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

        <Paper elevation={2} sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* 이름 */}
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="이름"
                  name="name"
                  value={profile.name}
                  onChange={handleText}
                  disabled={saving}
                />
              </Grid>

              {/* 상태 */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>상태</InputLabel>
                  <Select
                    name="status"
                    value={profile.status}
                    label="상태"
                    onChange={handleSelect}
                    disabled={saving}
                  >
                    <MenuItem value="현역">현역</MenuItem>
                    <MenuItem value="예비">예비</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* 직책 */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>직책</InputLabel>
                  <Select
                    name="position"
                    value={profile.position}
                    label="직책"
                    onChange={handleSelect}
                    disabled={saving}
                  >
                    <MenuItem value="국회의원">국회의원</MenuItem>
                    <MenuItem value="광역의원">광역의원(시/도의원)</MenuItem>
                    <MenuItem value="기초의원">기초의원(시/군/구의원)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* 광역자치단체 */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>광역자치단체</InputLabel>
                  <Select
                    name="regionMetro"
                    value={profile.regionMetro}
                    label="광역자치단체"
                    onChange={handleSelect}
                    disabled={saving}
                  >
                    {metroList.map((metro) => (
                      <MenuItem key={metro} value={metro}>
                        {metro}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* 기초자치단체 */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>기초자치단체</InputLabel>
                  <Select
                    name="regionLocal"
                    value={profile.regionLocal}
                    label="기초자치단체"
                    onChange={handleSelect}
                    disabled={saving || !profile.regionMetro}
                  >
                    {localList.map((local) => (
                      <MenuItem key={local} value={local}>
                        {local}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* 선거구 */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>선거구</InputLabel>
                  <Select
                    name="electoralDistrict"
                    value={profile.electoralDistrict}
                    label="선거구"
                    onChange={handleSelect}
                    disabled={saving || !profile.regionLocal || !profile.position}
                  >
                    {electoralList.map((district) => (
                      <MenuItem key={district} value={district}>
                        {district}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* 자기소개 */}
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  multiline
                  rows={4}
                  label="자기소개"
                  name="bio"
                  value={profile.bio}
                  onChange={handleText}
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