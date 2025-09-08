// src/components/ParallaxSynthwaveCity.jsx
import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

// --- 튜닝 가능한 파라미터 ---
const CONFIG = {
  glowColor: '0, 255, 255', // 시안색 (RGB)
  buildingColor: '#a0a0a0',
  fogColor: '#f0f0f0',
  perspective: 800, // 원근감 (값이 작을수록 왜곡이 심해짐)
  scrollSpeed: 0.8, // 스크롤에 따른 이동 속도
};

// --- 스타일 컴포넌트 (CSS-in-JS) ---

// 1. 전체 씬을 감싸는 컨테이너
const SceneContainer = styled.div`
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  /* 3D 공간을 만들고 자식 요소들이 3D 변환을 따르도록 설정 */
  perspective: ${CONFIG.perspective}px;
  perspective-origin: 50% 100%; /* 원근의 소실점을 하단 중앙으로 */
`;

// 2. 각 레이어의 기본 스타일
const Layer = styled.div`
  position: absolute;
  inset: 0;
  /* 애니메이션을 부드럽게 처리 */
  transition: transform 0.1s linear;
`;

// 3. 배경 (그라데이션 및 안개 효과)
const BackgroundLayer = styled(Layer)`
  background: linear-gradient(to bottom, #d0d0d0 0%, ${CONFIG.fogColor} 60%);
  /* translateZ를 아주 큰 음수값으로 주어 가장 멀리 배치 */
  transform: translateZ(-${CONFIG.perspective * 2}px) scale(5);
`;

// 4. 거대한 발광체 (헤일로)
const HaloLayer = styled(Layer)`
  background: radial-gradient(
    circle at 50% 100%,
    rgba(${CONFIG.glowColor}, 0.25) 0%,
    transparent 40%
  );
  transform: translateZ(-${CONFIG.perspective}px) scale(2.2);
  bottom: -20%;
`;

// 5. 도시 실루엣 레이어 (이미지 사용)
const CityLayer = styled(Layer)`
  background-image: url('/path/to/your/city-silhouette.png'); // 💥 배경이 투명한 도시 실루엣 PNG 이미지
  background-size: contain;
  background-repeat: no-repeat;
  background-position: 50% 100%;
  
  /* props로 zIndex를 받아 가까운/먼 빌딩 표현 */
  transform: ${({ z }) => `translateZ(${z}px)`};
  opacity: ${({ opacity }) => opacity};
  filter: drop-shadow(0 0 15px rgba(${CONFIG.glowColor}, 0.5));
`;

// 6. 바닥 그리드 레이어
const subtlePulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.8; }
`;

const GridLayer = styled(Layer)`
  background-image: linear-gradient(
      to right,
      rgba(${CONFIG.glowColor}, 0.7) 1px,
      transparent 1px
    ),
    linear-gradient(
      to bottom,
      rgba(${CONFIG.glowColor}, 0.7) 1px,
      transparent 1px
    );
  background-size: 50px 50px;
  /* 그리드를 눕히고 바닥에 배치 */
  transform: translateY(100%) rotateX(85deg); 
  transform-origin: 50% 100%;
  animation: ${subtlePulse} 5s infinite ease-in-out;
`;

// --- 메인 컴포넌트 ---

export default function ParallaxSynthwaveCity() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 스크롤에 따라 각 레이어의 transform 값을 계산
  const transformStyle = (z) => ({
    // 멀리 있는 레이어(z값이 작음)일수록 스크롤에 느리게 반응 -> 패럴랙스 효과
    transform: `translateZ(${z}px) translateY(${scrollY * (z / CONFIG.perspective) * CONFIG.scrollSpeed}px)`,
  });

  return (
    <SceneContainer>
      <BackgroundLayer />
      <HaloLayer />
      {/* 먼 빌딩 */}
      <CityLayer z={-CONFIG.perspective * 0.8} opacity={0.6} style={transformStyle(-CONFIG.perspective * 0.8)} />
      {/* 가까운 빌딩 */}
      <CityLayer z={-CONFIG.perspective * 0.1} opacity={1} style={transformStyle(-CONFIG.perspective * 0.1)} />
      <GridLayer />
    </SceneContainer>
  );
}