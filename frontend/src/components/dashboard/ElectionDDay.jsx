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
  const [electionInfo, setElectionInfo] = useState(null);
  const [dDay, setDDay] = useState(null);

  // 선거 정보 설정
  useEffect(() => {
    const getElectionInfo = () => {
      const currentYear = new Date().getFullYear();
      
      if (position === '국회의원') {
        // 국회의원 선거 (4년마다, 2024년 기준)
        const nextElectionYear = Math.ceil((currentYear - 2024) / 4) * 4 + 2024;
        const electionDate = new Date(nextElectionYear, 3, 10); // 4월 10일 (예상)
        
        return {
          type: '제23대 국회의원 선거',
          date: electionDate,
          description: '총선',
          icon: HowToVote,
          color: '#1976d2'
        };
      } else if (position === '광역의원' || position === '기초의원') {
        // 지방선거 (4년마다, 2026년 기준)
        const nextElectionYear = Math.ceil((currentYear - 2026) / 4) * 4 + 2026;
        const electionDate = new Date(nextElectionYear, 5, 1); // 6월 1일 (예상)
        
        return {
          type: '제9회 전국동시지방선거',
          date: electionDate,
          description: '지선',
          icon: People,
          color: '#2e7d32'
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

  // 디데이 색상 결정
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

  const theme = useTheme();
  const Icon = electionInfo.icon;

  return (
    <Paper elevation={1} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
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
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            {electionInfo.description} 일정
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {electionInfo.type}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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

        <Box sx={{ textAlign: 'center', my: 2 }}>
          <Chip 
            label={formatDDay(dDay)}
            size="medium"
            sx={{ px: 2, py: 1, fontSize: '0.875rem', fontWeight: 600 }}
            {...getDDayChipProps(dDay)}
          />
        </Box>

        {status === '예비' && dDay > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              예비후보 공천 준비
            </Typography>
            <Typography variant="body2">
              SNS 활동 지수가 공천에 반영됩니다.
            </Typography>
          </Alert>
        )}

        {status === '현역' && dDay > 0 && dDay <= 365 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              선거 준비 기간
            </Typography>
            <Typography variant="body2">
              의정활동 홍보를 통해 지지기반을 강화하세요.
            </Typography>
          </Alert>
        )}
      </Box>
    </Paper>
  );
}

export default ElectionDDay;