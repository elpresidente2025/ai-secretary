// 🚨🚨🚨 새로운 ProfilePage.jsx 2024년 12월 버전 🚨🚨🚨
console.log('🚨🚨🚨 새로운 ProfilePage.jsx 파일 로드됨!!! 🚨🚨🚨');

import React, { useState, useEffect } from 'react';
import {
  Box, Button, TextField, Typography, Paper, Container, CircularProgress,
  Alert, Snackbar, Grid, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../hooks/useAuth';

function ProfilePage() {
  console.log('🚨 ProfilePage 함수 실행 - 새 버전임!!!');
  
  const { auth, updateUserProfile } = useAuth();
  
  console.log('🚨 useAuth 후크 결과:', {
    authExists: !!auth,
    userExists: !!auth?.user,
    userId: auth?.user?.id,
    updateUserProfileExists: !!updateUserProfile,
    updateUserProfileType: typeof updateUserProfile
  });
  
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
    console.log('🚨 useEffect 실행 - 프로필 로드');
    
    const loadProfile = () => {
      try {
        setLoading(true);
        
        if (auth?.user) {
          console.log('🚨 사용자 정보 로드:', auth.user);
          
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
        console.error('🚨 프로필 로드 오류:', err);
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

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // 🚨 새로운 프로필 저장 핸들러
  const handleSubmit = async (event) => {
    event.preventDefault();
    console.log('🚨🚨🚨 프로필 저장 버튼 클릭됨 - 새 버전!!!');
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      console.log('🚨 updateUserProfile 함수 확인:', {
        exists: !!updateUserProfile,
        type: typeof updateUserProfile
      });
      
      if (!updateUserProfile) {
        throw new Error('updateUserProfile 함수가 없습니다. useAuth 문제일 수 있습니다.');
      }
      
      console.log('🚨 AuthContext updateUserProfile 호출 시작:', profile);
      
      // 🚨 AuthContext의 updateUserProfile 사용
      const result = await updateUserProfile(profile);
      
      console.log('🚨 AuthContext updateUserProfile 성공:', result);
      
      if (result?.success) {
        setSuccess(result.message || '프로필이 성공적으로 업데이트되었습니다.');
      } else {
        setError(result?.message || '프로필 업데이트에 실패했습니다.');
      }
    } catch (err) {
      console.error('🚨 AuthContext updateUserProfile 실패:', err);
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
        {/* 🚨 새 버전 표시 */}
        <Alert severity="info" sx={{ mb: 2 }}>
          🚨 새로운 ProfilePage.jsx 버전이 로드되었습니다! (AuthContext 사용)
        </Alert>
        
        <Paper sx={{ p: 4, mt: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            프로필 수정
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            AI가 원고를 작성할 때 참조하는 중요한 정보입니다. 정확하게 입력해주세요.
          </Typography>
          
          {/* 현재 사용자 정보 표시 */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>이메일:</strong> {auth.user.email}<br />
              <strong>사용자 ID:</strong> {auth.user.id}<br />
              <strong>updateUserProfile 함수:</strong> {updateUserProfile ? '✅ 존재함' : '❌ 없음'}
            </Typography>
          </Alert>
          
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
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
              
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  required 
                  name="regionMetro" 
                  label="광역자치단체 (예: 서울특별시, 경기도)" 
                  value={profile.regionMetro} 
                  onChange={handleChange} 
                  disabled={saving} 
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  required 
                  name="regionLocal" 
                  label="기초자치단체 (예: 강남구, 수원시)" 
                  value={profile.regionLocal} 
                  onChange={handleChange} 
                  disabled={saving} 
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField 
                  fullWidth 
                  required 
                  name="electoralDistrict" 
                  label="선거구 (예: 갑, 을, 제1선거구)" 
                  value={profile.electoralDistrict} 
                  onChange={handleChange} 
                  disabled={saving} 
                />
              </Grid>
              
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
                    '🚨 새 버전 프로필 저장'
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