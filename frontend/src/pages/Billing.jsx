// frontend/src/pages/Billing.jsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  LinearProgress,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  CreditCard,
  CheckCircle,
  Cancel,
  Warning,
  Upload,
  Schedule,
  Payment,
  VerifiedUser,
  Person,
  AttachFile
} from '@mui/icons-material';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';

const Billing = () => {
  const { user, refreshUserProfile } = useAuth();
  const [currentPlan, setCurrentPlan] = useState(user?.plan || user?.subscription || '리전 인플루언서');
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [membershipDialogOpen, setMembershipDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [updatingPlan, setUpdatingPlan] = useState(false);

  // 사용자 정보가 변경될 때 currentPlan 동기화
  useEffect(() => {
    const actualPlan = user?.plan || user?.subscription;
    console.log('🔍 Billing: 사용자 플랜 확인:', { user, actualPlan });
    if (actualPlan) {
      setCurrentPlan(actualPlan);
    }
  }, [user?.plan, user?.subscription]);

  // 플랜 업데이트 함수
  const callUpdateUserPlan = httpsCallable(functions, 'updateUserPlan');

  // 더미 데이터
  const plans = [
    {
      name: '로컬 블로거',
      price: 55000, // 부가세 10% 포함
      features: ['월 8회 원고 생성', '8회 모두 발행 시 익월 4회 추가 증정', '12회 모두 발행 시 익월 SNS 원고 무료 생성'],
      color: '#003a87',
      recommended: false
    },
    {
      name: '리전 인플루언서',
      price: 132000, // 부가세 10% 포함
      features: ['월 20회 원고 생성', '20회 모두 발행 시 익월 10회 추가 증정', '30회 모두 발행 시 익월 SNS 원고 무료 생성'],
      color: '#55207d',
      recommended: true
    },
    {
      name: '오피니언 리더',
      price: 330000, // 부가세 10% 포함
      features: ['월 90회 원고 생성+SNS 원고 무료 생성'],
      color: '#006261',
      recommended: false
    }
  ];

  const paymentHistory = [
    { date: '2025-01-15', plan: '리전 인플루언서', amount: 132000, status: '완료' },
    { date: '2024-12-15', plan: '리전 인플루언서', amount: 132000, status: '완료' },
    { date: '2024-11-15', plan: '로컬 블로거', amount: 55000, status: '완료' }
  ];

  const authHistory = [
    { quarter: '2025년 1분기', status: '인증완료', date: '2025-01-05', method: 'OCR 자동인증' },
    { quarter: '2024년 4분기', status: '인증완료', date: '2024-10-03', method: '수동 검토' },
    { quarter: '2024년 3분기', status: '인증완료', date: '2024-07-02', method: 'OCR 자동인증' }
  ];

  const handlePlanChange = async (planName) => {
    if (updatingPlan) return;
    
    setUpdatingPlan(true);
    try {
      // 백엔드 함수 호출하여 사용자 플랜 업데이트
      const response = await callUpdateUserPlan({ plan: planName });
      console.log('플랜 업데이트 응답:', response.data);
      
      if (response.data.success) {
        setCurrentPlan(planName);
        
        // 사용자 컨텍스트 새로고침 (가능한 경우)
        if (refreshUserProfile) {
          await refreshUserProfile();
        }
        
        alert(`${planName} 플랜으로 변경이 완료되었습니다.`);
      } else {
        throw new Error(response.data.message || '플랜 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('플랜 변경 실패:', error);
      alert(`플랜 변경에 실패했습니다: ${error.message}`);
    } finally {
      setUpdatingPlan(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  const handleAuthSubmit = () => {
    if (!selectedFile) {
      alert('당적증명서를 업로드해주세요.');
      return;
    }
    
    setAuthDialogOpen(false);
    setSelectedFile(null);
    // 실제로는 파일 업로드 API 호출
    alert('당원 인증이 요청되었습니다. 검토 후 승인 알림을 드리겠습니다.');
  };

  const handleMembershipSubmit = () => {
    setMembershipDialogOpen(false);
    // 실제로는 당비 납부 API 호출
    alert('당비 납부가 처리되었습니다. 확인까지 1-2일 소요됩니다.');
  };

  return (
    <DashboardLayout title="인증 및 결제">
      <Container maxWidth="xl">
        {/* 페이지 헤더 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            인증 및 결제 관리
          </Typography>
          <Typography variant="body1" color="text.secondary">
            요금제 변경과 당원 인증을 관리하세요
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* 왼쪽: 현재 플랜 정보 */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <CreditCard sx={{ mr: 1 }} />
                현재 플랜
              </Typography>
              <Card sx={{ bgcolor: '#f5f5f5', mb: 2 }}>
                <CardContent>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#55207d' }}>
                    {currentPlan}
                  </Typography>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {plans.find(p => p.name === currentPlan)?.price.toLocaleString()}원/월 (VAT 포함)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    다음 결제일: 2025년 2월 15일
                  </Typography>
                </CardContent>
              </Card>

              {/* 사용량 현황 */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  이번 달 사용량
                </Typography>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    원고 생성: 15/20회
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={75} 
                    sx={{ mt: 0.5, height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* 오른쪽: 요금제 및 히스토리 */}
          <Grid item xs={12} lg={8}>
            {/* 플랜 선택 */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                플랜 선택
              </Typography>
              <Grid container spacing={2}>
                {plans.map((plan, index) => (
                  <Grid item xs={12} md={4} key={index}>
                    <Card sx={{ 
                      height: '100%',
                      position: 'relative',
                      border: currentPlan === plan.name ? `2px solid ${plan.color}` : '1px solid #e0e0e0',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <Box sx={{ 
                        bgcolor: plan.color, 
                        color: 'white', 
                        p: 2,
                        borderBottom: '1px solid #e0e0e0'
                      }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {plan.name}
                        </Typography>
                      </Box>
                      <CardContent sx={{ flex: 1 }}>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, color: plan.color }}>
                          {plan.price.toLocaleString()}
                          <Typography component="span" variant="body2">원/월 (VAT 포함)</Typography>
                        </Typography>
                        <List dense>
                          {plan.features.map((feature, idx) => (
                            <ListItem key={idx} sx={{ py: 0.5, px: 0 }}>
                              <ListItemIcon sx={{ minWidth: 20 }}>
                                <CheckCircle sx={{ fontSize: 16, color: plan.color }} />
                              </ListItemIcon>
                              <ListItemText 
                                primary={feature} 
                                primaryTypographyProps={{ variant: 'body2' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                      <CardActions sx={{ mt: 'auto', p: 2 }}>
                        <Button
                          variant="contained"
                          fullWidth
                          disabled={currentPlan === plan.name || updatingPlan}
                          onClick={() => handlePlanChange(plan.name)}
                          sx={{ 
                            bgcolor: plan.color,
                            '&:hover': { 
                              bgcolor: plan.color,
                              filter: 'brightness(0.9)'
                            },
                            '&:disabled': {
                              bgcolor: '#e0e0e0',
                              color: '#9e9e9e'
                            }
                          }}
                        >
                          {updatingPlan ? '처리 중...' : currentPlan === plan.name ? '현재 플랜' : '선택하기'}
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>

            {/* 애드온 서비스 섹션 */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                애드온 서비스
              </Typography>
              <Card sx={{ 
                border: '1px solid #e0e0e0'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    기본 요금제와 함께 사용할 수 있는 부가 서비스입니다.
                  </Typography>
                  
                  {/* 3개 버튼을 3열로 배치 */}
                  <Grid container spacing={2}>
                    {/* SNS 원고 추가 생성 */}
                    <Grid item xs={4}>
                      <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        sx={{ 
                          bgcolor: '#e89f2f',
                          color: 'white',
                          py: 3,
                          flexDirection: 'column',
                          gap: 1,
                          '&:hover': { 
                            bgcolor: '#d18a26'
                          }
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          SNS 원고 추가 생성
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          22,000원/월
                        </Typography>
                      </Button>
                    </Grid>

                    {/* 워드프레스 연동 (준비중) */}
                    <Grid item xs={4}>
                      <Button
                        variant="outlined"
                        fullWidth
                        size="large"
                        onClick={() => alert('워드프레스 연동 서비스는 준비 중입니다. 곧 출시 예정입니다!')}
                        sx={{ 
                          py: 3,
                          flexDirection: 'column',
                          gap: 1,
                          borderColor: '#6c757d',
                          color: '#6c757d',
                          opacity: 0.8,
                          '&:hover': {
                            opacity: 1,
                            borderColor: '#495057'
                          }
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          워드프레스 연동
                        </Typography>
                        <Typography variant="body2">
                          준비중입니다
                        </Typography>
                      </Button>
                    </Grid>

                    {/* 영상 자료 생성 (준비중) */}
                    <Grid item xs={4}>
                      <Button
                        variant="outlined"
                        fullWidth
                        size="large"
                        onClick={() => alert('영상 자료 생성 서비스는 준비 중입니다. 곧 출시 예정입니다!')}
                        sx={{ 
                          py: 3,
                          flexDirection: 'column',
                          gap: 1,
                          borderColor: '#6c757d',
                          color: '#6c757d',
                          opacity: 0.8,
                          '&:hover': {
                            opacity: 1,
                            borderColor: '#495057'
                          }
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          영상 자료 생성
                        </Typography>
                        <Typography variant="body2">
                          준비중입니다
                        </Typography>
                      </Button>
                    </Grid>
                  </Grid>

                  {/* SNS 원고 추가 생성 상세 설명 */}
                  <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: '#e89f2f' }}>
                      💡 SNS 원고 추가 생성 서비스
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <List dense>
                          <ListItem sx={{ py: 0.5, px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 20 }}>
                              <CheckCircle sx={{ fontSize: 16, color: '#e89f2f' }} />
                            </ListItemIcon>
                            <ListItemText 
                              primary="SNS 변환 기능 활성화" 
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                          <ListItem sx={{ py: 0.5, px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 20 }}>
                              <CheckCircle sx={{ fontSize: 16, color: '#e89f2f' }} />
                            </ListItemIcon>
                            <ListItemText 
                              primary="월 30회 SNS 원고 변환" 
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        </List>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <List dense>
                          <ListItem sx={{ py: 0.5, px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 20 }}>
                              <CheckCircle sx={{ fontSize: 16, color: '#e89f2f' }} />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Instagram, Facebook, X, Threads 지원" 
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                          <ListItem sx={{ py: 0.5, px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 20 }}>
                              <CheckCircle sx={{ fontSize: 16, color: '#e89f2f' }} />
                            </ListItemIcon>
                            <ListItemText 
                              primary="자동 해시태그 생성" 
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        </List>
                      </Grid>
                    </Grid>
                  </Box>
                </CardContent>
              </Card>
            </Paper>

            {/* 결제 내역 */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <Payment sx={{ mr: 1 }} />
                    결제 내역
                  </Typography>
                  <List>
                    {paymentHistory.map((payment, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemIcon>
                          <CheckCircle color="success" />
                        </ListItemIcon>
                        <ListItemText
                          primary={`${payment.plan} - ${payment.amount.toLocaleString()}원`}
                          secondary={`${payment.date} (${payment.status})`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <VerifiedUser sx={{ mr: 1 }} />
                    당원 인증 상태
                  </Typography>
                  
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      2025년 1분기 당원 인증이 완료되었습니다.
                    </Typography>
                  </Alert>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      다음 인증 예정: 2025년 4월 1일
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      분기마다 당적증명서 제출 및 최근 3개월 당비 납부 확인이 필요합니다.
                    </Typography>
                  </Box>

                  <Grid container spacing={1}>
                    <Grid item xs={12}>
                      <Button 
                        variant="outlined" 
                        fullWidth 
                        size="small"
                        onClick={() => setAuthDialogOpen(true)}
                        startIcon={<Upload />}
                        sx={{ mb: 1 }}
                      >
                        새 인증서 제출
                      </Button>
                    </Grid>
                    <Grid item xs={12}>
                      <Button 
                        variant="outlined" 
                        fullWidth 
                        size="small"
                        onClick={() => setMembershipDialogOpen(true)}
                        startIcon={<Payment />}
                        color="secondary"
                      >
                        당비 납부 내역 제출
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>


        {/* 당원 인증 다이얼로그 */}
        <Dialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>당원 인증서 제출</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              당적증명서를 업로드하시면 OCR 자동 인증 또는 수동 검토를 통해 처리됩니다.
            </Alert>
            
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<AttachFile />}
                fullWidth
                sx={{ mb: 2 }}
              >
                당적증명서 업로드 (PDF, JPG, PNG)
                <input
                  type="file"
                  hidden
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                />
              </Button>
              
              {selectedFile && (
                <Alert severity="success">
                  선택된 파일: {selectedFile.name}
                </Alert>
              )}
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              * 개인정보는 인증 완료 후 즉시 삭제됩니다.<br />
              * 인증 처리에는 1-2일이 소요될 수 있습니다.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAuthDialogOpen(false)}>취소</Button>
            <Button onClick={handleAuthSubmit} variant="contained">
              제출
            </Button>
          </DialogActions>
        </Dialog>

        {/* 당비 납부 내역 다이얼로그 */}
        <Dialog open={membershipDialogOpen} onClose={() => setMembershipDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>당비 납부 내역 제출</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              최근 3개월간의 당비 납부 내역을 제출해주세요. 계좌이체 내역서나 영수증을 업로드하시면 됩니다.
            </Alert>
            
            <Box sx={{ mt: 2, mb: 2 }}>
              <TextField
                fullWidth
                label="납부자명"
                placeholder="당비를 납부한 분의 성명을 입력해주세요"
                variant="outlined"
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="납부 기간"
                placeholder="예: 2024년 11월 ~ 2025년 1월"
                variant="outlined"
                sx={{ mb: 2 }}
              />

              <Button
                variant="outlined"
                component="label"
                startIcon={<AttachFile />}
                fullWidth
                sx={{ mb: 2 }}
              >
                납부 내역서 업로드 (PDF, JPG, PNG)
                <input
                  type="file"
                  hidden
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                />
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              * 계좌이체 내역서, 영수증, 당비 납부 확인서 등을 제출 가능합니다.<br />
              * 여러 파일을 동시에 업로드할 수 있습니다.<br />
              * 개인정보는 확인 완료 후 즉시 삭제됩니다.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMembershipDialogOpen(false)}>취소</Button>
            <Button onClick={handleMembershipSubmit} variant="contained">
              제출
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </DashboardLayout>
  );
};

export default Billing;