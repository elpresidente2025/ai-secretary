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

const SynthwaveImage = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 50vh;
  background: url('/background/synthwave_city.png') no-repeat top center;
  background-size: cover;
  z-index: 1;
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

const GridSVG = styled.svg`
  position: absolute;
  top: 50vh;
  left: 0;
  width: 100vw;
  height: 50vh;
  transform-origin: top center;
  transition: transform 0.1s linear;
  z-index: 1;
  overflow: hidden;
  clip-path: inset(0 0 0 0);
`;

// --- 최종 컴포넌트 ---
export default function WireframeCityBackdrop() {
  const [gridOffset, setGridOffset] = useState(0);

  useEffect(() => {
    const handleWheel = (e) => {
      // 휠 델타에 따라 그리드 오프셋 누적 (50px 단위로 무한 순환)
      setGridOffset(prev => {
        const newOffset = prev + e.deltaY * CONFIG.gridSpeed * 0.5;
        // 73px 단위로 순환 - 그리드와 안 맞는 주기로 자연스럽게
        return ((newOffset % 73) + 73) % 73;
      });
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);
  
  // 휠 입력에 따라 그리드의 Y 위치를 변경
  const gridStyle = {
    transform: `perspective(600px) rotateX(75deg) translateY(${gridOffset}px)`
  };

  // 개빡센 무한 그리드 생성
  const generateGridLines = () => {
    const lines = [];
    // 모바일에서는 더 큰 그리드 사용
    const isMobile = window.innerWidth <= 768;
    const gridSizeX = isMobile ? 200 : 300; // 모바일에서는 더 작은 간격
    const gridSizeY = isMobile ? 100 : 150; // 모바일에서는 더 작은 간격 (2:1 비율 유지)
    const range = 15000; // 존나 크게 만들어서 절대 면적 끝이 안 보이게
    
    // 세로줄 생성 (존나게 많이)
    for (let x = -range; x <= range; x += gridSizeX) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={-range}
          x2={x}
          y2={range}
          stroke={`rgb(${CONFIG.glowColor})`}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      );
    }
    
    // 가로줄 생성 (존나게 많이)
    for (let y = -range; y <= range; y += gridSizeY) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={-range}
          y1={y}
          x2={range}
          y2={y}
          stroke={`rgb(${CONFIG.glowColor})`}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      );
    }
    
    return lines;
  };

  return (
    <BackdropContainer>
      <SynthwaveImage />
      <GridSVG 
        viewBox="-7500 0 15000 7500" 
        style={gridStyle}
        preserveAspectRatio="none"
      >
        {generateGridLines()}
      </GridSVG>
    </BackdropContainer>
  );
}

