import React from 'react';
import { Paper } from '@mui/material';

const HongKongNeonCard = ({ 
  children, 
  elevation = 0, 
  sx = {},
  ...props 
}) => {

  const neonCardStyle = {
    // 깔끔한 화이트 카드
    background: 'transparent',
    
    // 심플한 테두리와 그림자
    border: '1px solid rgba(0, 200, 200, 0.3)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    
    borderRadius: '8px',
    position: 'relative',
    overflow: 'hidden',
    
    // 부드러운 전환 효과
    transition: 'all 0.3s ease',
    
    // 호버 시 깔끔한 리프트 효과
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
      borderColor: 'rgba(0, 200, 200, 0.5)',
    },
    
    // 깔끔한 액센트 라인 (상단)
    '&::before': { content: 'none' },
    
    // 자식 요소들이 효과 위에 표시되도록
    '& > *': {
      position: 'relative',
      zIndex: 1,
    },
    
    // 텍스트 스타일링
    '& .MuiTypography-h6, & .MuiTypography-h5, & .MuiTypography-h4': {
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
      fontWeight: 700,
    },
    
    // 추가 스타일 병합
    ...sx
  };

  return (
    <Paper 
      elevation={elevation}
      sx={neonCardStyle}
      {...props}
    >
      {children}
    </Paper>
  );
};

export default HongKongNeonCard;
