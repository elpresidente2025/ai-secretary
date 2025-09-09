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
    background: 'transparent',
    
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
