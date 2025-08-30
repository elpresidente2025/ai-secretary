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
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  Chip,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Add, Remove, AutoAwesome, DeleteForever, Warning } from '@mui/icons-material';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';
import DashboardLayout from '../components/DashboardLayout';
import UserInfoForm from '../components/UserInfoForm';
import { useAuth } from '../hooks/useAuth';
import { BIO_ENTRY_TYPES, BIO_TYPE_ORDER, BIO_CATEGORIES, VALIDATION_RULES } from '../constants/bio-types';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  
  // httpsCallable 메모이즈
  const callGetProfile = useMemo(() => httpsCallable(functions, 'getUserProfile'), []);
  const callUpdateProfile = useMemo(() => httpsCallable(functions, 'updateProfile'), []);
  const callDeleteUserAccount = useMemo(() => httpsCallable(functions, 'deleteUserAccount'), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  
  // 회원탈퇴 다이얼로그 상태
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [profile, setProfile] = useState({
    name: '',
    status: '현역',
    position: '',
    regionMetro: '',
    regionLocal: '',
    electoralDistrict: '',
    bio: '',
  });

  // 회원탈퇴 처리
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== '회원탈퇴') {
      setSnack({
        open: true,
        message: '확인 문구를 정확히 입력해주세요.',
        severity: 'error'
      });
      return;
    }

    setDeleting(true);
    try {
      console.log('회원탈퇴 시작...');
      await callDeleteUserAccount();
      
      setSnack({
        open: true,
        message: '회원탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.',
        severity: 'success'
      });
      
      // 잠시 후 로그아웃 처리
      setTimeout(async () => {
        try {
          await logout();
        } catch (logoutError) {
          console.error('로그아웃 오류:', logoutError);
          window.location.href = '/login';
        }
      }, 2000);
      
    } catch (error) {
      console.error('회원탈퇴 오류:', error);
      let errorMessage = '회원탈퇴 처리 중 오류가 발생했습니다.';
      
      if (error.code === 'unauthenticated') {
        errorMessage = '로그인이 필요합니다.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setSnack({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteConfirmText('');
    }
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteConfirmText('');
  };

  // Bio 엔트리 상태 관리
  const [bioEntries, setBioEntries] = useState([
    {
      id: 'entry_initial',
      type: 'self_introduction',
      title: '자기소개',
      content: '',
      tags: [],
      weight: 1.0
    }
  ]);

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

        // Bio 엔트리 초기화 (기존 bio를 첫 번째 엔트리로)
        if (profileData.bio && profileData.bio.trim()) {
          setBioEntries([
            {
              id: 'entry_initial',
              type: 'self_introduction',
              title: '자기소개',
              content: profileData.bio.trim(),
              tags: [],
              weight: 1.0
            }
          ]);
        }
        
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

  // 자기소개 변경 처리 (기존 호환성)
  const handleBioChange = (e) => {
    const { value } = e.target;
    setError('');
    setProfile((prev) => ({ ...prev, bio: value }));
    
    // Bio 엔트리의 첫 번째 항목(자기소개)도 동기화
    setBioEntries(prev => prev.map((entry, index) => 
      index === 0 ? { ...entry, content: value } : entry
    ));
  };

  // Bio 엔트리 변경 핸들러
  const handleBioEntryChange = (index, field, value) => {
    setBioEntries(prev => prev.map((entry, i) => 
      i === index ? { ...entry, [field]: value } : entry
    ));
    
    // 첫 번째 엔트리(자기소개)면 기존 bio 필드도 동기화
    if (index === 0 && field === 'content') {
      setProfile(prev => ({ ...prev, bio: value }));
    }
    setError('');
  };

  // 카테고리별 Bio 엔트리 필터링
  const getEntriesByCategory = (category) => {
    if (category === 'PERSONAL') {
      return bioEntries.filter(entry => 
        BIO_CATEGORIES.PERSONAL.types.some(type => type.id === entry.type)
      );
    }
    if (category === 'PERFORMANCE') {
      return bioEntries.filter(entry => 
        BIO_CATEGORIES.PERFORMANCE.types.some(type => type.id === entry.type)
      );
    }
    return [];
  };

  // Bio 엔트리 추가 (카테고리별)
  const addBioEntry = (category = 'PERFORMANCE') => {
    if (bioEntries.length >= VALIDATION_RULES.maxEntries) {
      setError(`최대 ${VALIDATION_RULES.maxEntries}개의 엔트리까지 추가 가능합니다.`);
      return;
    }

    let defaultType = 'policy';
    if (category === 'PERSONAL') {
      defaultType = 'vision';
    }

    const newEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: defaultType,
      title: '',
      content: '',
      tags: [],
      weight: 1.0
    };

    setBioEntries(prev => [...prev, newEntry]);
  };

  // Bio 엔트리 삭제
  const removeBioEntry = (index) => {
    if (index === 0) {
      setError('자기소개는 삭제할 수 없습니다.');
      return;
    }
    
    setBioEntries(prev => prev.filter((_, i) => i !== index));
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

              {/* 자기소개 및 추가 정보 섹션 */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AutoAwesome sx={{ mr: 1, color: '#006261' }} />
                  자기소개 및 추가 정보
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  다양한 유형의 정보를 추가하여 더 정확한 개인화 원고를 생성하세요.
                </Typography>
              </Grid>

              {/* 1. 자기소개 섹션 */}
              <Grid item xs={12}>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ color: '#003A87', fontWeight: 600 }}>
                      👤 자기소개
                    </Typography>
                    <Tooltip title="자기소개 항목 추가">
                      <IconButton 
                        size="small" 
                        onClick={() => addBioEntry('PERSONAL')}
                        disabled={saving || bioEntries.length >= VALIDATION_RULES.maxEntries}
                        sx={{ 
                          width: 24,
                          height: 24,
                          backgroundColor: '#006261',
                          color: 'white',
                          border: '1px solid',
                          borderColor: '#006261',
                          '&:hover': { 
                            backgroundColor: '#003A87',
                            borderColor: '#003A87'
                          },
                          '&:disabled': {
                            backgroundColor: 'grey.50',
                            borderColor: 'grey.200',
                            color: 'grey.400'
                          }
                        }}
                      >
                        <Add fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  <Stack spacing={2}>
                    {getEntriesByCategory('PERSONAL').map((entry) => {
                      const index = bioEntries.findIndex(e => e.id === entry.id);
                      const typeConfig = Object.values(BIO_ENTRY_TYPES).find(t => t.id === entry.type) || BIO_ENTRY_TYPES.SELF_INTRODUCTION;
                      const isRequired = entry.type === 'self_introduction';
                      
                      return (
                        <Paper key={entry.id} elevation={1} sx={{ p: 2, borderRadius: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                              <TextField
                                required={isRequired}
                                fullWidth
                                multiline
                                rows={isRequired ? 4 : 5}
                                label={isRequired ? '자기소개 *필수' : '내용'}
                                value={entry.content}
                                onChange={(e) => handleBioEntryChange(index, 'content', e.target.value)}
                                disabled={saving}
                                placeholder={isRequired ? '본인의 정치 철학, 가치관, 지역에 대한 애정 등을 자유롭게 작성해주세요.' : '연설문, 기고문, 인터뷰 등을 자유롭게 올려 주세요.'}
                                inputProps={{ maxLength: typeConfig.maxLength }}
                                helperText={`${entry.content?.length || 0}/${typeConfig.maxLength}자`}
                              />
                            </Box>
                            
                            {!isRequired && (
                              <Tooltip title="이 항목 삭제">
                                <IconButton
                                  size="small"
                                  onClick={() => removeBioEntry(index)}
                                  disabled={saving}
                                  sx={{ 
                                    mt: 1,
                                    width: 24,
                                    height: 24,
                                    backgroundColor: '#55207d',
                                    color: 'white',
                                    border: '1px solid',
                                    borderColor: '#55207d',
                                    '&:hover': { 
                                      backgroundColor: '#152484',
                                      borderColor: '#152484'
                                    },
                                    '&:disabled': {
                                      backgroundColor: 'grey.50',
                                      borderColor: 'grey.200',
                                      color: 'grey.400'
                                    }
                                  }}
                                >
                                  <Remove />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Paper>
                      );
                    })}
                  </Stack>
                </Box>
              </Grid>

              {/* 2. 추가 정보 섹션 (카드형 3열 배치) */}
              <Grid item xs={12}>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ color: '#55207D', fontWeight: 600 }}>
                      📋 추가 정보
                    </Typography>
                    <Tooltip title="추가 정보 항목 추가">
                      <IconButton 
                        size="small" 
                        onClick={() => addBioEntry('PERFORMANCE')}
                        disabled={saving || bioEntries.length >= VALIDATION_RULES.maxEntries}
                        sx={{ 
                          width: 24,
                          height: 24,
                          backgroundColor: '#006261',
                          color: 'white',
                          border: '1px solid',
                          borderColor: '#006261',
                          '&:hover': { 
                            backgroundColor: '#003A87',
                            borderColor: '#003A87'
                          },
                          '&:disabled': {
                            backgroundColor: 'grey.50',
                            borderColor: 'grey.200',
                            color: 'grey.400'
                          }
                        }}
                      >
                        <Add fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  <Grid container spacing={2}>
                    {getEntriesByCategory('PERFORMANCE').map((entry) => {
                      const index = bioEntries.findIndex(e => e.id === entry.id);
                      const typeConfig = Object.values(BIO_ENTRY_TYPES).find(t => t.id === entry.type) || BIO_ENTRY_TYPES.POLICY;
                      
                      return (
                        <Grid item xs={12} sm={6} md={4} key={entry.id}>
                          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <CardContent sx={{ flex: 1 }}>
                              <Box sx={{ mb: 2 }}>
                                <Chip 
                                  label={typeConfig.name}
                                  size="small"
                                  sx={{ 
                                    bgcolor: typeConfig.color + '20',
                                    color: typeConfig.color,
                                    fontWeight: 600
                                  }}
                                />
                              </Box>
                              
                              <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>유형 선택</InputLabel>
                                <Select
                                  value={entry.type}
                                  label="유형 선택"
                                  onChange={(e) => handleBioEntryChange(index, 'type', e.target.value)}
                                  disabled={saving}
                                  size="small"
                                >
                                  {BIO_CATEGORIES.PERFORMANCE.types.map((type) => (
                                    <MenuItem key={type.id} value={type.id}>
                                      {type.name}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              
                              <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="내용"
                                value={entry.content}
                                onChange={(e) => handleBioEntryChange(index, 'content', e.target.value)}
                                disabled={saving}
                                placeholder={typeConfig.placeholder}
                                inputProps={{ maxLength: typeConfig.maxLength }}
                                size="small"
                              />
                            </CardContent>
                            
                            <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                              <Typography variant="caption" color="text.secondary">
                                {entry.content?.length || 0}/{typeConfig.maxLength}자
                              </Typography>
                              <Tooltip title="이 항목 삭제">
                                <IconButton
                                  size="small"
                                  onClick={() => removeBioEntry(index)}
                                  disabled={saving}
                                  sx={{ 
                                    width: 24,
                                    height: 24,
                                    backgroundColor: '#55207d',
                                    color: 'white',
                                    border: '1px solid',
                                    borderColor: '#55207d',
                                    '&:hover': { 
                                      backgroundColor: '#152484',
                                      borderColor: '#152484'
                                    },
                                    '&:disabled': {
                                      backgroundColor: 'grey.50',
                                      borderColor: 'grey.200',
                                      color: 'grey.400'
                                    }
                                  }}
                                >
                                  <Remove />
                                </IconButton>
                              </Tooltip>
                            </CardActions>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              </Grid>

              {bioEntries.length >= VALIDATION_RULES.maxEntries && (
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    최대 {VALIDATION_RULES.maxEntries}개의 엔트리까지 추가할 수 있습니다.
                  </Alert>
                </Grid>
              )}

              {/* 에러 메시지 */}
              {error && (
                <Grid item xs={12}>
                  <Alert severity="error">{error}</Alert>
                </Grid>
              )}

              {/* 저장 버튼 */}
              <Grid item xs={12}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteForever />}
                    onClick={() => setDeleteDialogOpen(true)}
                    size="large"
                    disabled={saving || deleting}
                  >
                    회원탈퇴
                  </Button>
                  
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={saving}
                    sx={{ 
                      minWidth: 120,
                      bgcolor: '#152484',
                      '&:hover': { bgcolor: '#003A87' }
                    }}
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

        {/* 회원탈퇴 확인 다이얼로그 */}
        <Dialog 
          open={deleteDialogOpen} 
          onClose={handleCloseDeleteDialog}
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <Warning color="error" />
              <Typography variant="h6" component="span">
                회원탈퇴 확인
              </Typography>
            </Box>
          </DialogTitle>
          
          <DialogContent>
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                ⚠️ 회원탈퇴 시 다음 데이터가 영구적으로 삭제됩니다:
              </Typography>
              <Typography component="div">
                • 모든 게시물 및 댓글<br/>
                • 프로필 정보 및 Bio 데이터<br/>
                • 선거구 점유 정보<br/>
                • 계정 정보 (복구 불가능)
              </Typography>
            </Alert>
            
            <Typography variant="body1" sx={{ mb: 2 }}>
              정말로 회원탈퇴를 진행하시겠습니까?
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              탈퇴를 확인하려면 아래에 <strong>"회원탈퇴"</strong>를 정확히 입력해주세요.
            </Typography>
            
            <TextField
              fullWidth
              label="확인 문구 입력"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="회원탈퇴"
              disabled={deleting}
              error={deleteConfirmText !== '' && deleteConfirmText !== '회원탈퇴'}
              helperText={
                deleteConfirmText !== '' && deleteConfirmText !== '회원탈퇴' 
                  ? '정확히 "회원탈퇴"를 입력해주세요.' 
                  : ''
              }
            />
          </DialogContent>
          
          <DialogActions>
            <Button 
              onClick={handleCloseDeleteDialog} 
              disabled={deleting}
            >
              취소
            </Button>
            <Button
              onClick={handleDeleteAccount}
              color="error"
              variant="contained"
              disabled={deleting || deleteConfirmText !== '회원탈퇴'}
              startIcon={deleting ? <CircularProgress size={20} /> : <DeleteForever />}
            >
              {deleting ? '처리 중...' : '회원탈퇴'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </DashboardLayout>
  );
}