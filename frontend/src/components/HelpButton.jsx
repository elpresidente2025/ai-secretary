import React, { useState, useEffect } from 'react';
import { Fab } from '@mui/material';
import { LightbulbOutlined } from '@mui/icons-material';
import HelpModal from './HelpModal';

const HelpButton = ({ title, children }) => {
  const [open, setOpen] = useState(false);
  const [bottomPosition, setBottomPosition] = useState(24);

  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          performScrollCalculation();
          ticking = false;
        });
        ticking = true;
      }
    };

    const performScrollCalculation = () => {
      // 푸터 요소 찾기
      const footer = document.querySelector('footer');
      if (!footer) return;

      // 현재 스크롤 위치와 화면 정보
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      
      // 푸터의 절대 위치 계산 (문서 기준)
      const footerRect = footer.getBoundingClientRect();
      const footerAbsoluteTop = scrollTop + footerRect.top;
      
      // 버튼 설정
      const buttonHeight = 40; // FAB small size
      const baseBottomMargin = 24;
      const bufferSpace = 60; // 푸터와의 최소 간격 (더 넉넉하게)
      
      // 화면 하단에서 버튼이 있어야 할 절대 위치 계산
      const buttonBottomAbsolutePosition = scrollTop + windowHeight - baseBottomMargin - buttonHeight;
      
      // 푸터 상단에서 버퍼 공간을 뺀 위치 (버튼이 멈춰야 할 최대 위치)
      const maxButtonBottomPosition = footerAbsoluteTop - bufferSpace - buttonHeight;
      
      // 버튼이 푸터와 충돌할지 미리 계산
      if (buttonBottomAbsolutePosition >= maxButtonBottomPosition) {
        // 충돌할 예정이므로 푸터 위에 고정
        const distanceFromFooter = (scrollTop + windowHeight) - footerAbsoluteTop;
        const newBottomPosition = Math.max(baseBottomMargin, distanceFromFooter + bufferSpace);
        setBottomPosition(newBottomPosition);
      } else {
        // 충돌하지 않으므로 기본 위치 유지
        setBottomPosition(baseBottomMargin);
      }
    };

    // 스크롤 이벤트 리스너 등록
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    
    // 초기 계산
    performScrollCalculation();

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <>
      <Fab
        color="primary"
        size="small"
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          bottom: `${bottomPosition}px`, // 동적으로 계산된 위치
          left: 24,   // 기본: 왼쪽에서 24px
          zIndex: 1000,
          bgcolor: '#f8c023', // 노란색으로 변경
          color: '#000000',   // 아이콘 색상을 검은색으로
          '&:hover': {
            bgcolor: '#e0a91f', // 호버 시 더 진한 노란색
            transform: 'scale(1.05)', // 살짝 확대 효과
            boxShadow: '0 8px 24px rgba(248, 192, 35, 0.8), 0 0 20px rgba(248, 192, 35, 0.6)', // 강화된 글로우 효과
          },
          boxShadow: '0 4px 12px rgba(248, 192, 35, 0.4)', // 기본 노란색 그림자
          transition: 'bottom 0.2s ease-out, transform 0.3s ease', // 더 빠르고 부드러운 위치 변경
          // 4K 화면에서는 더 안쪽으로 배치
          '@media (min-width: 2560px)': {
            left: 48, // 2K에서 더 안쪽
          },
          '@media (min-width: 3840px)': {
            left: 64, // 4K에서 더 안쪽
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