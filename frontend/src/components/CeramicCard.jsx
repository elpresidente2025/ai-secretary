import React from 'react';
import { Paper } from '@mui/material';

const CeramicCard = ({ 
  children, 
  elevation = 0, 
  glowColor = '#00f0ff', // kept for backward compatibility, no longer used
  crackIntensity = 0.3,
  sx = {},
  ...props 
}) => {
  const ceramicCardStyle = {
    // 애플 리퀴드 글래스 질감
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(1px) saturate(1.8)',
    
    // 리퀴드 글래스 테두리 + 그림자
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: `
      0 8px 32px rgba(0, 0, 0, 0.12),
      0 2px 8px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      inset 0 -1px 0 rgba(255, 255, 255, 0.1)
    `,
    
    borderRadius: '16px',
    position: 'relative',
    overflow: 'hidden',
    
    // 호버 효과
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: `
        0 6px 20px rgba(0, 0, 0, 0.12),
        0 2px 8px rgba(0, 0, 0, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.7)
      `,
      borderColor: 'rgba(0, 0, 0, 0.12)'
    },
    
    // 글로시 효과를 위한 오버레이 준비
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `
        radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.4) 0%, transparent 50%),
        linear-gradient(135deg, 
          rgba(255, 255, 255, 0.2) 0%, 
          transparent 30%, 
          transparent 70%, 
          rgba(0, 0, 0, 0.05) 100%
        )
      `,
      pointerEvents: 'none',
      zIndex: 1,
      borderRadius: 'inherit',
    },
    
    // 세라믹 크랙 텍스처
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundImage: `
        radial-gradient(circle at 20% 80%, transparent 70%, rgba(0, 0, 0, ${crackIntensity * 0.1}) 71%, transparent 72%),
        radial-gradient(circle at 80% 20%, transparent 70%, rgba(0, 0, 0, ${crackIntensity * 0.1}) 71%, transparent 72%),
        radial-gradient(circle at 40% 40%, transparent 70%, rgba(0, 0, 0, ${crackIntensity * 0.08}) 71%, transparent 72%),
        linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, ${crackIntensity * 0.05}) 50%, transparent 100%),
        linear-gradient(0deg, transparent 0%, rgba(0, 0, 0, ${crackIntensity * 0.05}) 50%, transparent 100%)
      `,
      pointerEvents: 'none',
      zIndex: 0,
      borderRadius: 'inherit',
      opacity: 0.6,
    },
    
    // 자식 요소들이 오버레이 위에 표시되도록
    '& > *': {
      position: 'relative',
      zIndex: 2,
    },
    
    // 추가 스타일 병합
    ...sx
  };

  return (
    <Paper 
      elevation={elevation}
      sx={ceramicCardStyle}
      {...props}
    >
      {children}
    </Paper>
  );
};

export default CeramicCard;
