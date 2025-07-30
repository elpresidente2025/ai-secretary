import React, { useState, useEffect } from 'react';
import {
  Box, Button, TextField, Typography, Paper, Container, CircularProgress,
  Alert, Snackbar, Grid, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import allLocations from '../data/location/locations.index';

function ProfilePage() {
  const { auth, updateUserProfile } = useAuth();
  
  const [profile, setProfile] = useState({
    name: '', 
    position: '', 
    regionMetro: '', 
    regionLocal: '', 
    electoralDistrict: '', 
    status: '현역',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 페이지 로드 시 사용자 프로필을 auth에서 가져오기
  useEffect(() => {
    const loadProfile = () => {
      try {
        setLoading(true);
        
        if (auth?.user) {
          setProfile(prev => ({
            ...prev,
            name: auth.user.name || '',
            position: auth.user.position || '',
            regionMetro: auth.user.regionMetro || '',
            regionLocal: auth.user.regionLocal || '',
            electoralDistrict: auth.user.electoralDistrict || '',
            status: auth.user.status || '현역'
          }));
        }
      } catch (err) {
        console.error('프로필 로드 오류:', err);
        setError('프로필을 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (auth?.user) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [auth?.user]);

  // 광역자치단체 목록 생성
  const metroList = Object.keys(allLocations).sort();

  // 선택된 광역자치단체의 기초자치단체 목록
  const localList = profile.regionMetro ? Object.keys(allLocations[profile.regionMetro]).sort() : [];

  // 선택된 기초자치단체의 선거구 목록
  const electoralList = (profile.regionMetro && profile.regionLocal && profile.position && allLocations[profile.regionMetro]?.[profile.regionLocal]?.[profile.position]) 
    ? allLocations[profile.regionMetro][profile.regionLocal][profile.position] 
    : [];

  const handleChange = (event) => {
    const { name, value } = event.target;
    
    // 지역 관련 필드 변경 시 하위 필드 초기화
    if (name === 'position') {
      setProfile((prev) => ({ 
        ...prev, 
        [name]: value,
        electoralDistrict: '' // 직책 변경 시 선거구 초기화
      }));
    } else if (name === 'regionMetro') {
      setProfile((prev) => ({ 
        ...prev, 
        [name]: value,
        regionLocal: '', // 광역자치단체 변경 시 기초자치단체 초기화
        electoralDistrict: '' // 선거구도 초기화
      }));
    } else if (name === 'regionLocal') {
      setProfile((prev) => ({ 
        ...prev, 
        [name]: value,
        electoralDistrict: '' // 기초자치단체 변경 시 선거구 초기화
      }));
    } else {
      setProfile((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      if (!updateUserProfile) {
        throw new Error('updateUserProfile 함수가 없습니다. useAuth 문제일 수 있습니다.');
      }
      
      const result = await updateUserProfile(profile);
      
      if (result?.success) {
        setSuccess(result.message || '프로필이 성공적으로 업데이트되었습니다.');
      } else {
        setError(result?.message || '프로필 업데이트에 실패했습니다.');
      }
    } catch (err) {
      console.error('프로필 업데이트 실패:', err);
      setError(err.message || '프로필 업데이트 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 로딩 상태 처리
  if (loading) {
    return (
      <DashboardLayout title="프로필 수정">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  // 인증되지 않은 사용자 처리
  if (!auth?.user) {
    return (
      <DashboardLayout title="프로필 수정">
        <Container maxWidth="md">
          <Alert severity="error">
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
          <Typography variant="h4" component="h1" gutterBottom>
            프로필 수정
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            AI가 원고를 작성할 때 참조하는 중요한 정보입니다. 정확하게 입력해주세요.
          </Typography>
          
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
              
              {/* 직책과 상태 */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>직책</InputLabel>
                  <Select 
                    name="position" 
                    value={profile.position} 
                    label="직책" 
                    onChange={handleChange} 
                    disabled={saving}
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
                <FormControl fullWidth required>
                  <InputLabel>상태</InputLabel>
                  <Select 
                    name="status" 
                    value={profile.status} 
                    label="상태" 
                    onChange={handleChange} 
                    disabled={saving}
                  >
                    <MenuItem value="현역">현역</MenuItem>
                    <MenuItem value="예비">예비</MenuItem>
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
                    onChange={handleChange} 
                    disabled={saving}
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
              
              {/* 기초자치단체 */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required disabled={!profile.regionMetro || saving}>
                  <InputLabel>기초자치단체</InputLabel>
                  <Select 
                    name="regionLocal" 
                    value={profile.regionLocal} 
                    label="기초자치단체" 
                    onChange={handleChange} 
                    disabled={!profile.regionMetro || saving}
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
              
              {/* 선거구 */}
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
                    disabled={!profile.regionLocal || !profile.position || electoralList.length === 0 || saving}
                  >
                    <MenuItem value="">
                      <em>선택하세요</em>
                    </MenuItem>
                    {electoralList.map((electoral) => (
                      <MenuItem key={electoral} value={electoral}>
                        {electoral}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* 저장 버튼 */}
              <Grid item xs={12}>
                <Button 
                  type="submit" 
                  variant="contained" 
                  size="large" 
                  disabled={saving || !updateUserProfile}
                  sx={{ 
                    minWidth: 200,
                    backgroundColor: saving ? 'grey.500' : 'primary.main'
                  }}
                >
                  {saving ? (
                    <>
                      <CircularProgress size={24} sx={{ mr: 1 }} />
                      저장 중...
                    </>
                  ) : (
                    '프로필 저장'
                  )}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
        
        {/* 성공/에러 메시지 */}
        <Snackbar 
          open={!!success} 
          autoHideDuration={6000} 
          onClose={() => setSuccess('')}
        >
          <Alert severity="success">{success}</Alert>
        </Snackbar>
        
        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError('')}
        >
          <Alert severity="error">{error}</Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  );
}

export default ProfilePage;