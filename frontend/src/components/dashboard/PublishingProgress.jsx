import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Box,
  Chip,
  Grid,
  Tooltip,
  IconButton,
  Alert,
  Button
} from '@mui/material';
import { 
  TrendingUp, 
  EmojiEvents, 
  Publish,
  Info,
  AutoAwesome
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../services/firebase';

const PublishingProgress = () => {
  const { user } = useAuth();
  const [publishingStats, setPublishingStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const callGetPublishingStats = httpsCallable(functions, 'getPublishingStats');

  useEffect(() => {
    let mounted = true;
    
    const loadStats = async () => {
      if (user?.uid && mounted) {
        try {
          await fetchPublishingStats();
        } catch (error) {
          console.error('PublishingProgress mount error:', error);
        }
      }
    };
    
    loadStats();
    
    return () => {
      mounted = false;
    };
  }, [user?.uid, user?.plan, user?.subscription]); // 플랜 변경 시에도 데이터 새로고침

  const fetchPublishingStats = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      console.log('PublishingProgress: 함수 호출 시작');
      const response = await callGetPublishingStats();
      console.log('PublishingProgress: 전체 응답:', JSON.stringify(response, null, 2));
      
      // 백엔드 응답 구조 확인 및 안전한 데이터 처리
      // Firebase Functions는 { data: { success: true, data: {...} } } 구조로 응답
      const responseData = response.data || {};
      console.log('PublishingProgress: Firebase response:', responseData);
      
      // responseData가 { success: true, data: {...} } 형태라면 data를 추출
      let statsData = responseData.data || responseData;
      console.log('PublishingProgress: 파싱된 statsData:', statsData);
      
      // currentMonth가 없거나 올바르지 않은 경우 기본값 설정
      if (!statsData.currentMonth || typeof statsData.currentMonth !== 'object') {
        console.log('PublishingProgress: currentMonth가 없음, 기본값 설정');
        statsData = {
          ...statsData,
          currentMonth: {
            published: statsData.totalPublished || 0,
            target: getMonthlyTarget(user)
          },
          bonusEarned: statsData.bonusEarned || 0,
          nextBonusEligible: statsData.nextBonusEligible !== false
        };
      } else {
        console.log('PublishingProgress: currentMonth 존재, 필드 검증');
        // currentMonth는 있지만 필수 필드가 없는 경우
        const userBasedTarget = getMonthlyTarget(user);
        console.log('🎯 Target 결정:', {
          backendTarget: statsData.currentMonth.target,
          userBasedTarget: userBasedTarget,
          willUse: userBasedTarget || statsData.currentMonth.target
        });
        
        statsData.currentMonth = {
          published: statsData.currentMonth.published || 0,
          target: userBasedTarget || statsData.currentMonth.target // 사용자 기반 target을 우선 사용
        };
      }
      
      console.log('PublishingProgress: 설정할 데이터:', statsData);
      console.log('PublishingProgress: currentMonth 최종 확인:', statsData.currentMonth);
      setPublishingStats(statsData);
    } catch (error) {
      console.error('Failed to fetch publishing stats:', error);
      console.error('Error details:', error.message, error.code);
      // 실패 시 기본값 설정
      setPublishingStats({
        currentMonth: {
          published: 0,
          target: getMonthlyTarget(user)
        },
        bonusEarned: 0,
        nextBonusEligible: true
      });
    } finally {
      setLoading(false);
    }
  };

  const getMonthlyTarget = (user) => {
    // 사용자의 플랜 정보만 기반으로 목표 결정
    const plan = user?.plan || user?.subscription;
    
    console.log('📊 PublishingProgress - getMonthlyTarget:', {
      user: user,
      userPlan: user?.plan,
      userSubscription: user?.subscription,
      finalPlan: plan
    });
    
    if (plan) {
      switch (plan) {
        case '오피니언 리더':
          return 90;
        case '리전 인플루언서':
          return 20;
        case '로컬 블로거':
          return 8;
        default:
          return 8;
      }
    }
    
    // 플랜 정보가 없으면 결제되지 않은 상태
    return null;
  };

  const getBonusAmount = (user) => {
    // 사용자의 플랜 정보를 기반으로 보너스 결정
    const plan = user?.plan || user?.subscription;
    
    if (plan) {
      switch (plan) {
        case '오피니언 리더':
          return 0; // 오피니언 리더는 이미 SNS 원고 무료이므로 별도 보너스 없음
        case '리전 인플루언서':
          return 10;
        case '로컬 블로거':
          return 4;
        default:
          return 4;
      }
    }
    
    // 플랜 정보가 없으면 결제되지 않은 상태
    return 0;
  };

  const getFullTarget = (user) => {
    const basicTarget = getMonthlyTarget(user);
    const bonusAmount = getBonusAmount(user);
    return basicTarget ? basicTarget + bonusAmount : null;
  };

  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
  };

  if (loading || !publishingStats || !user) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Publish sx={{ color: '#152484' }} />
            <Typography variant="h6">발행 목표</Typography>
          </Box>
          <LinearProgress />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            로딩 중...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // publishingStats가 {success: true, data: {...}} 구조인 경우 data 추출
  const actualData = publishingStats?.data || publishingStats || {};
  const { currentMonth } = actualData;
  
  console.log('🔥🔥🔥 실제 사용할 데이터:', actualData);
  console.log('🔥🔥🔥 currentMonth 최종:', currentMonth);
  console.log('🔥🔥🔥 사용자 정보 확인:', user);
  const published = currentMonth?.published || 0;
  
  // 플랜 검증을 먼저 수행 (관리자는 예외)
  const plan = user?.plan || user?.subscription;
  const isAdmin = user?.isAdmin || user?.role === 'admin';
  
  console.log('📊 PublishingProgress - 최종 렌더링 전 확인:', {
    userUid: user?.uid,
    userPlan: user?.plan,
    userSubscription: user?.subscription,
    finalPlan: plan,
    isAdmin
  });
  
  if (!plan && !isAdmin) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Publish sx={{ color: '#152484' }} />
            <Typography variant="h6">발행 목표</Typography>
          </Box>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              요금제가 설정되지 않았습니다
            </Typography>
            <Typography variant="body2">
              발행 목표를 확인하려면 요금제를 선택해주세요.
            </Typography>
          </Alert>
          
          <Button 
            variant="contained" 
            fullWidth 
            sx={{ 
              bgcolor: '#152484',
              '&:hover': { bgcolor: '#003A87' }
            }}
            onClick={() => window.location.href = '/billing'}
          >
            요금제 선택하기
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // 관리자이거나 플랜이 있는 경우 정상 처리 - 2단계 시스템
  const basicTarget = getMonthlyTarget(user);
  const fullTarget = getFullTarget(user);
  const bonusAmount = getBonusAmount(user);
  
  // 백엔드에서 받은 데이터 우선, 없으면 프론트엔드 계산값 사용
  const currentStage = actualData?.currentMonth?.currentStage || 'basic';
  const nextStageTarget = actualData?.currentMonth?.nextStageTarget || basicTarget;
  const achievements = actualData?.achievements || {};
  
  console.log('🎯 2단계 시스템 상태:', {
    published,
    basicTarget,
    fullTarget,
    currentStage,
    nextStageTarget,
    achievements,
    userPlan: user?.plan || user?.subscription
  });
  
  // 현재 진행 상황에 따른 UI 결정
  let displayTarget, progress, isCompleted, remaining, statusMessage;
  
  if (currentStage === 'completed') {
    // 2단계 완료 (SNS 무료 자격 획득)
    displayTarget = fullTarget;
    progress = 100;
    isCompleted = true;
    remaining = 0;
    statusMessage = {
      icon: 'trophy',
      text: `완전 달성! 다음 달 SNS 원고 무료 생성`,
      color: '#006261'
    };
  } else if (currentStage === 'bonus') {
    // 1단계 완료, 2단계 진행 중
    displayTarget = fullTarget;
    progress = Math.min((published / fullTarget) * 100, 100);
    isCompleted = false;
    remaining = Math.max(fullTarget - published, 0);
    statusMessage = {
      icon: 'star',
      text: `보너스 단계! ${remaining}회 더 발행하면 SNS 무료 획득`,
      color: '#55207D'
    };
  } else {
    // 기본 단계
    displayTarget = basicTarget;
    progress = Math.min((published / basicTarget) * 100, 100);
    isCompleted = published >= basicTarget;
    remaining = Math.max(basicTarget - published, 0);
    statusMessage = {
      icon: 'trending',
      text: isCompleted 
        ? `1단계 달성! 익월 보너스 ${bonusAmount}회 제공 예정`
        : `${remaining}회 더 발행하면 보너스 ${bonusAmount}회 획득!`,
      color: isCompleted ? '#006261' : '#152484'
    };
  }

  return (
    <Card sx={{ height: '100%', position: 'relative' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Publish sx={{ color: '#152484' }} />
            발행 목표
          </Typography>
          <Tooltip title="월간 목표 달성 시 익월 보너스 원고 제공">
            <IconButton size="small">
              <Info fontSize="small" sx={{ color: '#55207D' }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          {getCurrentMonth()} 진행률
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 12,
                borderRadius: 6,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: isCompleted ? '#006261' : '#152484',
                  borderRadius: 6,
                },
              }}
            />
          </Box>
          <Typography variant="h6" sx={{ 
            color: statusMessage.color,
            fontWeight: 600,
            minWidth: 'fit-content'
          }}>
            {published}/{displayTarget}
            {currentStage === 'bonus' && (
              <Typography component="span" sx={{ fontSize: '0.75em', color: 'text.secondary', ml: 0.5 }}>
                (기본 {basicTarget} + 보너스 {bonusAmount})
              </Typography>
            )}
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: '#55207D', fontWeight: 700 }}>
                {Math.round(progress)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                달성률
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ 
                color: isCompleted ? '#006261' : '#003A87', 
                fontWeight: 700 
              }}>
                {remaining}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                남은 목표
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {statusMessage.icon === 'trophy' && <EmojiEvents sx={{ color: statusMessage.color }} />}
            {statusMessage.icon === 'star' && <AutoAwesome sx={{ color: statusMessage.color }} />}
            {statusMessage.icon === 'trending' && <TrendingUp sx={{ color: statusMessage.color }} />}
            
            <Typography variant="body2" sx={{ 
              color: statusMessage.color, 
              fontWeight: currentStage !== 'basic' ? 600 : 'normal' 
            }}>
              {statusMessage.text}
            </Typography>
          </Box>
          
          {/* 진행 상태 표시 */}
          {fullTarget && currentStage !== 'completed' && (
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                전체 진행률: {published}/{fullTarget} ({Math.round((published / fullTarget) * 100)}%)
              </Typography>
            </Box>
          )}
        </Box>

        {(actualData?.bonusEarned || 0) > 0 && (
          <Box sx={{ mt: 2 }}>
            <Chip
              icon={<AutoAwesome />}
              label={`이번 달 보너스: ${actualData.bonusEarned}회`}
              color="primary"
              variant="outlined"
              size="small"
              sx={{ backgroundColor: 'rgba(21, 36, 132, 0.1)' }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default PublishingProgress;