// frontend/src/components/dashboard/ElectionDDay.jsx
import React, { useState, useEffect } from 'react';
import {
  Paper,
  Box,
  Typography,
  Chip,
  Alert,
  useTheme
} from '@mui/material';
import {
  CalendarToday,
  People,
  HowToVote
} from '@mui/icons-material';

/**
 * 선거일 디데이 컴포넌트
 * @param {Object} props
 * @param {string} props.position - 직책 ('국회의원', '광역의원', '기초의원')
 * @param {string} props.status - 상태 ('현역', '예비')
 */
function ElectionDDay({ position, status }) {
  const theme = useTheme(); // Hook을 맨 위로 이동
  const [electionInfo, setElectionInfo] = useState(null);
  const [dDay, setDDay] = useState(null);

  // 선거 정보 설정
  useEffect(() => {
    const getElectionInfo = () => {
      const currentYear = new Date().getFullYear();
      
      if (position === '국회의원') {
        // 국회의원 선거 (4년마다, 2024년 기준 - 다음은 2028년)
        const nextElectionYear = currentYear <= 2024 ? 2024 : Math.ceil((currentYear - 2024) / 4) * 4 + 2024;
        const electionDate = new Date(nextElectionYear, 3, 12); // 4월 12일
        
        return {
          type: nextElectionYear === 2024 ? '제22대 국회의원 선거' : '제23대 국회의원 선거',
          date: electionDate,
          description: '총선',
          icon: HowToVote,
          color: '#003A87'
        };
      } else if (position === '광역의원' || position === '기초의원') {
        // 지방선거 (4년마다, 2026년 기준)
        const nextElectionYear = Math.ceil((currentYear - 2026) / 4) * 4 + 2026;
        const electionDate = new Date(nextElectionYear, 5, 3); // 6월 3일
        
        return {
          type: '제9회 전국동시지방선거',
          date: electionDate,
          description: '지선',
          icon: People,
          color: '#006261'
        };
      }
      
      return null;
    };

    const info = getElectionInfo();
    setElectionInfo(info);
  }, [position]);

  // 디데이 계산
  useEffect(() => {
    if (!electionInfo) return;

    const calculateDDay = () => {
      const today = new Date();
      const electionDate = electionInfo.date;
      
      // 시간 정규화 (날짜만 비교)
      today.setHours(0, 0, 0, 0);
      electionDate.setHours(0, 0, 0, 0);
      
      const diffTime = electionDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    };

    const days = calculateDDay();
    setDDay(days);

    // 매일 자정에 업데이트
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow - now;
    
    const timeout = setTimeout(() => {
      setDDay(calculateDDay());
      
      // 이후 24시간마다 업데이트
      const interval = setInterval(() => {
        setDDay(calculateDDay());
      }, 24 * 60 * 60 * 1000);
      
      return () => clearInterval(interval);
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, [electionInfo]);

  // 선거 정보가 없으면 렌더링하지 않음
  if (!electionInfo || dDay === null) {
    return null;
  }

  // 디데이 텍스트 포맷팅
  const formatDDay = (days) => {
    if (days > 0) {
      return `D-${days}`;
    } else if (days === 0) {
      return '투표일';
    } else {
      return `D+${Math.abs(days)}`;
    }
  };


  // 기존 Chip 색상 함수 (알림에서 계속 사용)
  const getDDayChipProps = (days) => {
    if (days <= 0) {
      return { color: 'error', variant: 'filled' };
    } else if (days <= 30) {
      return { color: 'warning', variant: 'filled' };
    } else if (days <= 365) {
      return { color: 'primary', variant: 'filled' };
    } else {
      return { color: 'default', variant: 'outlined' };
    }
  };

  const Icon = electionInfo.icon;

  return (
    <Paper elevation={1} sx={{ p: 2.5 }}>
      {/* 상단: 제목과 D-Day를 좌우 배치 */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
        {/* 좌측: 제목과 아이콘 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box 
            sx={{ 
              p: 1.5, 
              borderRadius: 2, 
              bgcolor: electionInfo.color, 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              {electionInfo.description} 일정
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {electionInfo.type}
            </Typography>
          </Box>
        </Box>

        {/* 우측: D-Day */}
        <Box sx={{ textAlign: 'right', minWidth: '120px' }}>
          <Typography
            variant="h4"
            sx={{
              fontSize: { xs: '2.5rem', sm: '3rem', md: '3.5rem' },
              fontFamily: '"Noto Serif KR", "Times New Roman", serif',
              fontWeight: 600,
              color: 'text.primary',
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
              mb: 0.5
            }}
          >
            {formatDDay(dDay)}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 400,
              fontSize: '0.75rem'
            }}
          >
            {dDay > 0 ? '남은 일수' : dDay === 0 ? '투표일' : '경과 일수'}
          </Typography>
        </Box>
      </Box>

      {/* 하단: 날짜 정보 */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {electionInfo.date.toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'short'
            })}
          </Typography>
        </Box>
      </Box>

        {/* 선거법 준수 알림 */}
        {(() => {
          // 선거 단계 판단
          let phase = 'NORMAL_PERIOD';
          let alertProps = { severity: 'info' };
          let title = '';
          let message = '';

          if (dDay === 0) {
            phase = 'ELECTION_DAY';
            alertProps = { severity: 'error' };
            title = '투표일 - 선거운동 금지';
            message = '모든 형태의 선거운동이 금지됩니다.';
          } else if (dDay > 0 && dDay <= 14) {
            phase = 'CAMPAIGN_PERIOD';
            alertProps = { severity: 'success' };
            title = '공식 선거운동 기간';
            message = '선거법에 따른 제한 사항을 준수하여 선거운동이 가능합니다.';
          } else if (dDay > 14 && dDay <= 30) {
            phase = 'PRE_CAMPAIGN_WARNING';
            alertProps = { severity: 'warning' };
            title = '사전 선거운동 주의 기간';
            message = '과도한 자기 홍보나 투표 요청 표현을 피해주세요.';
          } else if (dDay > 30 && dDay <= 180) {
            phase = 'NORMAL_PERIOD';
            alertProps = { severity: 'info' };
            title = status === '예비' ? '예비후보 활동 기간' : '의정활동 홍보 기간';
            message = status === '예비' 
              ? 'SNS 활동과 지역 현안 해결에 집중하세요.'
              : '의정활동 성과를 중심으로 지지기반을 강화하세요.';
          }

          // 180일 이상 남은 경우는 알림 표시하지 않음
          if (dDay > 180 || dDay < 0) return null;

          return (
            <Alert {...alertProps} sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                {title}
              </Typography>
              <Typography variant="body2">
                {message}
              </Typography>
              {phase === 'PRE_CAMPAIGN_WARNING' && (
                <Typography variant="caption" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                  💡 원고 생성 시 자동으로 선거법 준수 검사가 수행됩니다.
                </Typography>
              )}
            </Alert>
          );
        })()}
    </Paper>
  );
}

export default ElectionDDay;