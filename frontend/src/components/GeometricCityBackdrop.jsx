import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

// --- 튜닝 파라미터 ---
const CONFIG = {
  glowColor: '0, 255, 255',
  lineColor: '190, 200, 210', // 빌딩 라인 색상
  bgColor: '#f0f4f8',
  gridSpeed: 1.5,
};

// --- 애니메이션 ---
const subtleGlow = keyframes`
  0%, 100% { filter: drop-shadow(0 0 5px rgba(${CONFIG.glowColor}, 0.5)); }
  50% { filter: drop-shadow(0 0 10px rgba(${CONFIG.glowColor}, 0.7)); }
`;

// --- 스타일 컴포넌트 ---
const BackdropContainer = styled.div`
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: linear-gradient(to bottom, #ffffff, ${CONFIG.bgColor});
  pointer-events: none; // 콘텐츠 클릭 방해 방지
`;

const CitySVG = styled.svg`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: auto;
  z-index: 2; // 그리드보다 위에 위치
  animation: ${subtleGlow} 6s infinite ease-in-out alternate;
`;

const Grid = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 50vh;
  background-image: 
    linear-gradient(to right, rgba(${CONFIG.glowColor}, 0.4) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(${CONFIG.glowColor}, 0.4) 1px, transparent 1px);
  background-size: 40px 40px;
  transform-origin: bottom center;
  transition: transform 0.1s linear;
  z-index: 1; // 도시보다 아래에 위치
`;

// --- 최종 컴포넌트 ---
export default function WireframeCityBackdrop() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // 스크롤에 따라 그리드의 Y 위치를 변경
  const gridStyle = {
    transform: `perspective(600px) rotateX(75deg) translateY(${scrollY * CONFIG.gridSpeed}px)`
  };

  return (
    <BackdropContainer>
      <CitySVG viewBox="0 0 1440 450" preserveAspectRatio="xMidYMax slice">
        <g stroke={`rgba(${CONFIG.lineColor}, 1)`} strokeWidth="1.5" fill="none">
          {/* 먼 빌딩 (투명도 낮음) */}
          <path opacity="0.4" d="M0 450 V 300 L 50 300 V 250 H 100 V 320 H 150 V 220 H 200 V 350 H 250 V 280 H 300 V 450 Z" />
          <path opacity="0.4" d="M300 450 V 310 L 350 310 V 260 H 400 V 330 H 450 V 230 H 500 V 360 H 550 V 290 H 600 V 450 Z" />
          <path opacity="0.4" d="M1000 450 V 300 L 1050 300 V 250 H 1100 V 320 H 1150 V 220 H 1200 V 350 H 1250 V 280 H 1300 V 450 Z" />

          {/* 중간 빌딩 (투명도 중간) */}
          <path opacity="0.7" d="M150 450 V 280 L 200 280 V 210 H 250 V 300 H 300 V 180 H 350 V 340 H 400 V 250 H 450 V 450 Z" />
          <path opacity="0.7" d="M800 450 V 290 L 850 290 V 220 H 900 V 310 H 950 V 190 H 1000 V 350 H 1050 V 260 H 1100 V 450 Z" />

          {/* 가까운 빌딩 (투명도 없음) */}
          <path opacity="1" d="M500 450 V 250 L 550 250 V 150 H 600 V 280 H 650 V 120 H 700 V 320 H 750 V 200 H 800 V 450 Z" />
          <path opacity="1" d="M1200 450 V 260 L 1250 260 V 160 H 1300 V 290 H 1350 V 130 H 1400 V 330 H 1440 V 450 Z" />
        </g>
      </CitySVG>
      <Grid style={gridStyle} />
    </BackdropContainer>
  );
}

