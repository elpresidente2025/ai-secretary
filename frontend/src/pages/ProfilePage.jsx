// frontend/src/pages/ProfilePage.jsx

import React, { useState, useEffect } from 'react';
import {
  Box, Button, TextField, Typography, Paper, Container, CircularProgress,
  Alert, Snackbar, Grid, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
// 수정된 API 서비스를 사용합니다.
import { authService } from '../services/authService';

function ProfilePage() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState({
    name: '', position: '', regionMetro: '', regionLocal: '', electoralDistrict: '', status: '현역',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 페이지 로드 시 사용자 프로필을 가져옵니다.
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        // authService에 통합된 프로필 조회 함수를 사용합니다.
        const data = await authService.getUserProfile();
        if (data.success && data.profile) {
          setProfile(prev => ({ ...prev, ...data.profile }));
        }
      } catch (err) {
        setError(err.message || '프로필을 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchProfile();
    }
  }, [currentUser]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // 프로필 저장 핸들러
  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      // authService를 통해 프로필 업데이트 함수를 호출합니다.
      const result = await authService.updateProfile(profile);
      if (result.success) {
        setSuccess(result.message || '프로필이 성공적으로 업데이트되었습니다.');
      }
    } catch (err) {
      setError(err.message || '프로필 업데이트 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="프로필 수정">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="프로필 수정">
      <Container maxWidth="md">
        <Paper sx={{ p: 4, mt: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>프로필 수정</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            AI가 원고를 작성할 때 참조하는 중요한 정보입니다. 정확하게 입력해주세요.
          </Typography>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}><TextField fullWidth required name="name" label="이름" value={profile.name} onChange={handleChange} disabled={saving} /></Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>직책</InputLabel>
                  <Select name="position" value={profile.position} label="직책" onChange={handleChange} disabled={saving}>
                    <MenuItem value="국회의원">국회의원</MenuItem>
                    <MenuItem value="광역의원">광역의원(시/도의원)</MenuItem>
                    <MenuItem value="기초의원">기초의원(시/군/구의원)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>상태</InputLabel>
                  <Select name="status" value={profile.status} label="상태" onChange={handleChange} disabled={saving}>
                    <MenuItem value="현역">현역</MenuItem>
                    <MenuItem value="예비">예비</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth required name="regionMetro" label="광역자치단체 (예: 서울특별시, 경기도)" value={profile.regionMetro} onChange={handleChange} disabled={saving} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth required name="regionLocal" label="기초자치단체 (예: 강남구, 수원시)" value={profile.regionLocal} onChange={handleChange} disabled={saving} /></Grid>
              <Grid item xs={12}><TextField fullWidth required name="electoralDistrict" label="선거구 (예: 갑, 을, 제1선거구)" value={profile.electoralDistrict} onChange={handleChange} disabled={saving} /></Grid>
              <Grid item xs={12}><Button type="submit" variant="contained" size="large" disabled={saving}>{saving ? <CircularProgress size={24} /> : '프로필 저장'}</Button></Grid>
            </Grid>
          </form>
        </Paper>
        <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess('')}><Alert severity="success">{success}</Alert></Snackbar>
        <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}><Alert severity="error">{error}</Alert></Snackbar>
      </Container>
    </DashboardLayout>
  );
}

export default ProfilePage;