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

// 7-세그먼트 디스플레이 컴포넌트
const SevenSegmentDisplay = ({ dDay, cardHeight = '140px' }) => {
  // 각 숫자별 세그먼트 매핑 (a, b, c, d, e, f, g)
  const segmentPatterns = {
    '0': [1, 1, 1, 1, 1, 1, 0],
    '1': [0, 1, 1, 0, 0, 0, 0],
    '2': [1, 1, 0, 1, 1, 0, 1],
    '3': [1, 1, 1, 1, 0, 0, 1],
    '4': [0, 1, 1, 0, 0, 1, 1],
    '5': [1, 0, 1, 1, 0, 1, 1],
    '6': [1, 0, 1, 1, 1, 1, 1],
    '7': [1, 1, 1, 0, 0, 0, 0],
    '8': [1, 1, 1, 1, 1, 1, 1],
    '9': [1, 1, 1, 1, 0, 1, 1],
    'D': [0, 1, 1, 1, 1, 0, 1],
    '-': [0, 0, 0, 0, 0, 0, 1],
    '+': [0, 1, 1, 0, 0, 1, 1], // 4와 같은 패턴 사용
    ' ': [0, 0, 0, 0, 0, 0, 0]
  };

  const formatDDayForSegment = (days) => {
    if (days > 0) {
      return `D-${days.toString().padStart(3, ' ')}`;
    } else if (days === 0) {
      return 'D- 0';
    } else {
      return `D+${Math.abs(days).toString().padStart(2, ' ')}`;
    }
  };

  const displayText = formatDDayForSegment(dDay);

  // 개별 세그먼트 컴포넌트
  const Segment = ({ active, type }) => {
    const isHorizontal = ['a', 'd', 'g'].includes(type);
    
    return (
      <Box
        sx={{
          position: 'absolute',
          bgcolor: active ? '#FF0000' : '#330000',
          boxShadow: active ? '0 0 12px #FF0000, 0 0 24px #FF0000' : 'none',
          transition: 'all 0.1s ease',
          ...(isHorizontal ? {
            // 가로 세그먼트
            width: '30px',
            height: '6px',
            borderRadius: '3px',
            ...(type === 'a' && { top: '0px', left: '5px' }),
            ...(type === 'd' && { bottom: '0px', left: '5px' }),
            ...(type === 'g' && { top: '50%', left: '5px', transform: 'translateY(-50%)' })
          } : {
            // 세로 세그먼트
            width: '6px',
            height: '32px',
            borderRadius: '3px',
            ...(type === 'b' && { top: '4px', right: '0px' }),
            ...(type === 'c' && { bottom: '4px', right: '0px' }),
            ...(type === 'e' && { bottom: '4px', left: '0px' }),
            ...(type === 'f' && { top: '4px', left: '0px' })
          })
        }}
      />
    );
  };

  // 개별 문자 디스플레이
  const CharacterDisplay = ({ char }) => {
    const pattern = segmentPatterns[char] || [0, 0, 0, 0, 0, 0, 0];
    const segmentTypes = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

    return (
      <Box
        sx={{
          position: 'relative',
          width: '40px',
          height: '80px',
          mx: 1
        }}
      >
        {segmentTypes.map((type, index) => (
          <Segment key={type} active={pattern[index]} type={type} />
        ))}
      </Box>
    );
  };

  return (
    <Box 
      sx={{ 
        textAlign: 'right', 
        minWidth: '220px',
        bgcolor: '#000',
        borderRadius: 2,
        py: 3,
        px: 2,
        border: '2px solid #333',
        position: 'relative',
        height: cardHeight,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}
    >
      {/* 디지털 문자 표시 */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        {displayText.split('').map((char, index) => (
          <CharacterDisplay key={index} char={char} />
        ))}
      </Box>
      
    </Box>
  );
};

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
      const today = new Date();
      const currentYear = today.getFullYear();
      
      if (position === '국회의원') {
        // 총선: 4년 주기, 기준일 2028-04-12
        const baseElection = {
          year: 2028,
          month: 3, // 0-based (4월)
          day: 12,
          cycle: 4
        };
        
        const nextElection = getNextElectionDate(baseElection, today);
        const termNumber = Math.floor((nextElection.year - 2024) / 4) + 22; // 22대부터 시작
        
        return {
          type: `제${termNumber}대 국회의원 선거`,
          date: nextElection.date,
          description: '총선',
          icon: HowToVote,
          color: '#003A87',
          cycle: '4년'
        };
      } else if (position === '광역의원' || position === '기초의원') {
        // 지선: 4년 주기, 기준일 2026-06-03
        const baseElection = {
          year: 2026,
          month: 5, // 0-based (6월)
          day: 3,
          cycle: 4
        };
        
        const nextElection = getNextElectionDate(baseElection, today);
        const termNumber = Math.floor((nextElection.year - 2026) / 4) + 9; // 9회부터 시작
        
        return {
          type: `제${termNumber}회 전국동시지방선거`,
          date: nextElection.date,
          description: '지선',
          icon: People,
          color: '#006261',
          cycle: '4년'
        };
      }
      
      return null;
    };

    // 다음 선거일 계산 함수
    const getNextElectionDate = (baseElection, today) => {
      const { year: baseYear, month: baseMonth, day: baseDay, cycle } = baseElection;
      
      // 기준 선거일
      let candidateYear = baseYear;
      let candidateDate = new Date(candidateYear, baseMonth, baseDay);
      
      // 오늘 이후의 가장 가까운 선거일 찾기
      while (candidateDate <= today) {
        candidateYear += cycle;
        candidateDate = new Date(candidateYear, baseMonth, baseDay);
      }
      
      return {
        year: candidateYear,
        date: candidateDate
      };
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
            <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {electionInfo.date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
              })}
            </Typography>
          </Box>
        </Box>

        {/* 우측: 7-세그먼트 디지털 D-Day 카운터 */}
        <SevenSegmentDisplay dDay={dDay} cardHeight="150px" />
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