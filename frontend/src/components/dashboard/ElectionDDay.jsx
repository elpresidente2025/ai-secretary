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

// 작은 7-세그먼트 문자 컴포넌트 (color 표시용)
const SmallSevenSegmentChar = ({ character, color, inactiveColor = '#333', size = 'small' }) => {
  const digitPatterns = {
    'C': [1, 0, 0, 1, 1, 1, 0],
    'O': [1, 1, 1, 1, 1, 1, 0],
    'L': [0, 0, 0, 1, 1, 1, 0],
    'R': [0, 0, 0, 0, 1, 0, 1],
    'c': [0, 0, 0, 1, 1, 0, 1],
    'o': [0, 0, 1, 1, 1, 0, 1],
    'l': [0, 1, 1, 0, 0, 0, 0],
    'r': [0, 0, 0, 0, 1, 0, 1],
    ' ': [0, 0, 0, 0, 0, 0, 0]
  };

  const pattern = digitPatterns[character] || digitPatterns[' '];
  const segmentIds = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

  const segments = {
    a: { top: '1px', left: '2px', width: '6px', height: '1.5px' },
    b: { top: '2.5px', right: '0.5px', width: '1.5px', height: '8px' },
    c: { bottom: '2.5px', right: '0.5px', width: '1.5px', height: '8px' },
    d: { bottom: '1px', left: '2px', width: '6px', height: '1.5px' },
    e: { bottom: '2.5px', left: '0.5px', width: '1.5px', height: '8px' },
    f: { top: '2.5px', left: '0.5px', width: '1.5px', height: '8px' },
    g: { top: '50%', left: '2px', width: '6px', height: '1.5px', transform: 'translateY(-50%)' }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: '10px',
        height: '22px',
        margin: '0 0.5px'
      }}
    >
      {segmentIds.map((segmentId, index) => (
        <Box
          key={segmentId}
          sx={{
            position: 'absolute',
            backgroundColor: pattern[index] === 1 ? color : inactiveColor,
            borderRadius: '0.5px',
            opacity: pattern[index] === 1 ? 1 : 0.2,
            transition: 'background-color 0.8s ease, box-shadow 0.8s ease',
            ...segments[segmentId]
          }}
        />
      ))}
    </Box>
  );
};

// 개별 세그먼트 컴포넌트 (컴포넌트 외부에서 정의)
const Segment = ({ isActive, segmentId, mainColor, glowColor }) => {
  const segments = {
    a: { top: '2px', left: '7px', width: '31px', height: '6.5px' },        // 상단
    b: { top: '8.5px', right: '2px', width: '6.5px', height: '32.5px' },        // 우상
    c: { bottom: '8.5px', right: '2px', width: '6.5px', height: '32.5px' },     // 우하
    d: { bottom: '2px', left: '7px', width: '31px', height: '6.5px' },     // 하단
    e: { bottom: '8.5px', left: '2px', width: '6.5px', height: '32.5px' },      // 좌하
    f: { top: '8.5px', left: '2px', width: '6.5px', height: '32.5px' },         // 좌상
    g: { top: '50%', left: '7px', width: '31px', height: '6.5px', transform: 'translateY(-50%)' }  // 중간
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        backgroundColor: isActive ? mainColor : '#222',
        borderRadius: '3px',
        boxShadow: isActive 
          ? `0 0 8px ${glowColor}80, 0 0 16px ${glowColor}40, inset 0 0 4px ${glowColor}60`
          : 'none',
        opacity: isActive ? 1 : 0.15,
        transition: 'background-color 0.5s ease-out, box-shadow 0.5s ease-out, opacity 0.5s ease-out',
        ...segments[segmentId]
      }}
    />
  );
};

// 색상 옵션 (컴포넌트 외부에서 정의)
const colorOptions = [
  { main: '#d22730', glow: '#d22730' }, // 클래식 레드
  { main: '#152484', glow: '#152484' }, // 사이버 블루  
  { main: '#006261', glow: '#006261' }, // 네온 그린
  { main: '#f8c023', glow: '#f8c023' }, // 사이버펑키 옐로우
  { main: '#55207d', glow: '#55207d' }, // 퍼플
  { main: '#ffffff', glow: '#ffffff' }  // 화이트
];

// 7세그먼트 숫자 패턴 (a, b, c, d, e, f, g 순서)
const digitPatterns = {
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
  ' ': [0, 0, 0, 0, 0, 0, 0]
};

// 7-세그먼트 디스플레이 컴포넌트
const SevenSegmentDisplay = ({ dDay, cardHeight = '140px', color = '#d22730', onColorChange }) => {
  // localStorage에서 저장된 색상 인덱스 불러오기
  const [currentColorIndex, setCurrentColorIndex] = useState(() => {
    const saved = localStorage.getItem('electionDDayColorIndex');
    return saved ? parseInt(saved) : 0;
  });

  // 현재 색상을 별도 state로 관리
  const [currentColors, setCurrentColors] = useState(() => {
    const saved = localStorage.getItem('electionDDayColorIndex');
    const index = saved ? parseInt(saved) : 0;
    return colorOptions[index] || colorOptions[0];
  });

  // 실시간 색상 변경 감지
  useEffect(() => {
    const updateColors = () => {
      const saved = localStorage.getItem('electionDDayColorIndex');
      if (saved) {
        const savedIndex = parseInt(saved);
        if (savedIndex >= 0 && savedIndex < colorOptions.length) {
          setCurrentColorIndex(savedIndex);
          setCurrentColors(colorOptions[savedIndex]);
          onColorChange && onColorChange(colorOptions[savedIndex].main);
        }
      }
    };

    // 초기 색상 설정
    updateColors();

    // localStorage 변경 감지 (다른 탭)
    const handleStorageChange = (e) => {
      if (e.key === 'electionDDayColorIndex') {
        updateColors();
      }
    };

    // 폴링으로 같은 탭에서의 변경 감지
    const interval = setInterval(updateColors, 100);

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [onColorChange]);

  const handleColorChange = (direction) => {
    let newIndex;
    if (direction === 'prev') {
      newIndex = currentColorIndex === 0 ? colorOptions.length - 1 : currentColorIndex - 1;
    } else {
      newIndex = currentColorIndex === colorOptions.length - 1 ? 0 : currentColorIndex + 1;
    }
    setCurrentColorIndex(newIndex);
    setCurrentColors(colorOptions[newIndex]);
    // localStorage에 저장
    localStorage.setItem('electionDDayColorIndex', newIndex.toString());
    onColorChange && onColorChange(colorOptions[newIndex].main);
  };

  // 디데이 텍스트 생성
  const getDDayText = (days) => {
    if (days > 0) {
      return `D-${days.toString().padStart(3, ' ')}`;
    } else if (days === 0) {
      return 'D- 0';
    } else {
      return `D+${Math.abs(days)}`;
    }
  };

  // 개별 숫자/문자 디스플레이
  const DigitDisplay = ({ character, colors }) => {
    const pattern = digitPatterns[character] || digitPatterns[' '];
    const segmentIds = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

    return (
      <Box
        sx={{
          position: 'relative',
          width: '45px',
          height: '85px',
          margin: '0 0.5px'
        }}
      >
        {segmentIds.map((segmentId, index) => (
          <Segment
            key={segmentId}
            isActive={pattern[index] === 1}
            segmentId={segmentId}
            mainColor={colors.main}
            glowColor={colors.glow}
          />
        ))}
      </Box>
    );
  };

  const displayText = getDDayText(dDay);

  return (
    <Box
      sx={{
        backgroundColor: '#0a0a0a',
        border: '2px solid #333',
        borderRadius: 2,
        padding: '16px 20px',
        minWidth: '280px',
        height: cardHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'inset 4px 4px 12px rgba(0,0,0,0.8), inset -2px -2px 6px rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.2)',
        gap: 2
      }}
    >
      {/* 메인 디스플레이 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0'
        }}
      >
        {displayText.split('').map((char, index) => (
          <DigitDisplay key={index} character={char} colors={currentColors} />
        ))}
      </Box>

      {/* 색상 변경 컨트롤 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1
        }}
      >
        {/* 왼쪽 화살표 */}
        <Box
          onClick={() => handleColorChange('prev')}
          sx={{
            color: '#666',
            cursor: 'pointer',
            fontSize: '14px',
            userSelect: 'none',
            '&:hover': { color: '#999' },
            transition: 'color 0.2s ease'
          }}
        >
          ◀
        </Box>

        {/* color 텍스트 (7세그먼트) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {'color'.split('').map((char, index) => (
            <SmallSevenSegmentChar 
              key={index} 
              character={char} 
              color={currentColors.main}
              inactiveColor="#333"
            />
          ))}
        </Box>

        {/* 오른쪽 화살표 */}
        <Box
          onClick={() => handleColorChange('next')}
          sx={{
            color: '#666',
            cursor: 'pointer',
            fontSize: '14px',
            userSelect: 'none',
            '&:hover': { color: '#999' },
            transition: 'color 0.2s ease'
          }}
        >
          ▶
        </Box>
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
  const [displayColor, setDisplayColor] = useState(() => {
    const saved = localStorage.getItem('electionDDayColorIndex');
    const colorOptions = [
      '#d22730', '#152484', '#006261', '#f8c023', '#55207d', '#ffffff'
    ];
    if (saved) {
      const savedIndex = parseInt(saved);
      if (savedIndex >= 0 && savedIndex < colorOptions.length) {
        return colorOptions[savedIndex];
      }
    }
    return '#d22730';
  });

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
        <SevenSegmentDisplay 
          dDay={dDay} 
          cardHeight="150px" 
          color={displayColor} 
          onColorChange={setDisplayColor}
        />
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