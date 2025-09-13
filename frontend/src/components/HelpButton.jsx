import React, { useState } from 'react';
import { Fab } from '@mui/material';
import { LightbulbOutlined } from '@mui/icons-material';
import HelpModal from './HelpModal';

const HelpButton = ({ title, children }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Fab
        color="primary"
        size="small"
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 16, // 화면 하단에서 16px 고정 (더 아래로)
          left: 16,   // 화면 왼쪽에서 16px 고정 (더 왼쪽으로)
          zIndex: 1500, // Drawer보다 높은 z-index
          bgcolor: '#f8c023', // 노란색
          color: '#000000',   // 아이콘 색상을 검은색으로
          '&:hover': {
            bgcolor: '#e0a91f', // 호버 시 더 진한 노란색
            transform: 'scale(1.05)', // 살짝 확대 효과
            boxShadow: '0 8px 24px rgba(248, 192, 35, 0.8), 0 0 20px rgba(248, 192, 35, 0.6)', // 강화된 글로우 효과
          },
          boxShadow: '0 4px 12px rgba(248, 192, 35, 0.4)', // 기본 노란색 그림자
          transition: 'transform 0.3s ease, box-shadow 0.3s ease', // 호버 효과만 애니메이션
          // 반응형 여백 조정
          '@media (max-width: 600px)': {
            bottom: 12, // 모바일에서는 더 아래로
            left: 12,   // 모바일에서는 더 왼쪽으로
          },
        }}
      >
        <LightbulbOutlined />
      </Fab>
      
      <HelpModal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
      >
        {children}
      </HelpModal>
    </>
  );
};

export default HelpButton;