// frontend/src/pages/AboutPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Box, Container, Typography, Card, CardContent, Button, Grid, Chip } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Animation keyframes
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

// Preloader Component
const PreloaderWrapper = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: '#0a0a1a',
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  '&.fade-out': {
    opacity: 0,
    transition: 'opacity 0.6s ease-out',
  }
}));

const Logo = styled('img')({
  width: '60px',
  height: '60px',
  marginBottom: '20px',
});

const ScrollHint = styled(Typography)(({ theme }) => ({
  position: 'absolute',
  bottom: '30px',
  left: '50%',
  transform: 'translateX(-50%)',
  color: '#00d4ff',
  fontSize: '14px',
  animation: `${fadeIn} 0.6s ease-out 0.5s both`,
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
  }
}));

// Main sections - 높이 조정
const Section = styled(Box)({
  position: 'relative',
  minHeight: '120vh', // 120vh로 증가하여 여백 확보
  display: 'flex',
  alignItems: 'center',
  overflow: 'hidden',
  paddingTop: '10vh', // 상단 여백 추가
  paddingBottom: '10vh', // 하단 여백 추가
});

const LastSection = styled(Box)({
  position: 'relative',
  minHeight: '140vh', // 마지막 섹션은 더 크게
  display: 'flex',
  alignItems: 'center',
  overflow: 'hidden',
  paddingTop: '10vh',
  paddingBottom: '20vh', // 하단 여백 더 크게
});

const ParallaxLayer = styled(Box)(({ speed = 1 }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  willChange: 'transform',
  pointerEvents: 'none',
}));

const FixedContent = styled(Container)({
  position: 'relative',
  zIndex: 10,
  color: 'white',
  width: '100%',
  maxWidth: '1200px',
});

// Scene styling
const HeroSection = styled(Section)({
  background: 'linear-gradient(180deg, #0a0a2e 0%, #16213e 50%, #1a1a3a 100%)',
  minHeight: '100vh', // Hero는 100vh 유지
  paddingTop: 0,
  paddingBottom: 0,
});

const ProblemSection = styled(Section)({
  background: 'linear-gradient(180deg, #1a1a3a 0%, #2a2a4a 100%)',
});

const SolutionSection = styled(Section)({
  background: 'linear-gradient(180deg, #2a2a4a 0%, #1e3a5f 100%)',
});

const HowItWorksSection = styled(Section)({
  background: 'linear-gradient(180deg, #1e3a5f 0%, #2d4a6b 100%)',
});

const PricingSection = styled(LastSection)({
  background: 'linear-gradient(180deg, #2d4a6b 0%, #3a5f8b 100%)',
});

// Pricing card component
const PricingCard = styled(Card)(({ popular }) => ({
  background: popular ?
    'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 150, 255, 0.1) 100%)' :
    'rgba(255, 255, 255, 0.05)',
  border: popular ? '2px solid #00d4ff' : '1px solid rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  color: 'white',
  position: 'relative',
  transform: popular ? 'scale(1.05)' : 'scale(1)',
  transition: 'transform 0.3s ease',
  '&:hover': {
    transform: popular ? 'scale(1.08)' : 'scale(1.02)',
  }
}));

const PopularBadge = styled(Chip)({
  position: 'absolute',
  top: '-12px',
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'linear-gradient(45deg, #ff6b6b, #ee5a24)',
  color: 'white',
  fontWeight: 'bold',
});

const AboutPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showPreloader, setShowPreloader] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const containerRef = useRef(null);

  // Preloader effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPreloader(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      setScrollY(scrolled);

      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;

      // Update CSS custom properties for parallax effects
      document.documentElement.style.setProperty('--scroll', scrolled * -0.5);
      document.documentElement.style.setProperty('--search-scale', 1 + scrolled * 0.0002);
      document.documentElement.style.setProperty('--cards-y', `${scrolled * 0.3}px`);
      document.documentElement.style.setProperty('--stamp-y', `${scrolled * 0.5}px`);
      document.documentElement.style.setProperty('--tech-y', `${scrolled * 0.2}px`);
      document.documentElement.style.setProperty('--keyword-y', `${scrolled * -0.4}px`);
      document.documentElement.style.setProperty('--dot-x', `${Math.sin(scrolled * 0.01) * 20}px`);
      document.documentElement.style.setProperty('--dot-y', `${Math.cos(scrolled * 0.01) * 15}px`);
      document.documentElement.style.setProperty('--dot-x2', `${Math.sin(scrolled * 0.008) * -25}px`);
      document.documentElement.style.setProperty('--dot-y2', `${Math.cos(scrolled * 0.008) * -20}px`);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
  };

  if (showPreloader) {
    return (
      <PreloaderWrapper className={showPreloader ? '' : 'fade-out'}>
        <Logo src="/logo.png" alt="전뇌비서관" />
        <Typography variant="h6" color="white" sx={{ mb: 2 }}>
          전뇌비서관
        </Typography>
        <ScrollHint>스크롤하세요 ↓</ScrollHint>
      </PreloaderWrapper>
    );
  }

  return (
    <Box ref={containerRef} sx={{ position: 'relative' }}>
      {/* Scene 1: HERO */}
      <HeroSection>
        <ParallaxLayer speed={0.3}>
          <Box sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            opacity: 0.1,
            background: `
              radial-gradient(circle at 20% 30%, rgba(0, 212, 255, 0.3) 1px, transparent 1px),
              radial-gradient(circle at 80% 70%, rgba(0, 212, 255, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 212, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '100px 100px, 120px 120px, 50px 50px',
            transform: `translateY(${scrollY * 0.3}px)`,
          }} />
        </ParallaxLayer>
        <ParallaxLayer speed={0.6}>
          <Box sx={{
            position: 'absolute',
            top: '30%',
            left: '10%',
            width: '300px',
            height: '50px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '2px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '25px',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '20px',
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.7)',
            transform: `scale(${1 + scrollY * 0.0002}) translateY(${scrollY * 0.6}px)`,
            willChange: 'transform',
          }}>
            네이버 검색 최적화...
          </Box>
        </ParallaxLayer>
        <ParallaxLayer speed={0.9}>
          <Box sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            '&::before, &::after': {
              content: '""',
              position: 'absolute',
              width: '4px',
              height: '4px',
              background: '#00d4ff',
              borderRadius: '50%',
              boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
            },
            '&::before': {
              top: '40%',
              left: '15%',
              transform: `translate(${Math.sin(scrollY * 0.01) * 20}px, ${Math.cos(scrollY * 0.01) * 15}px)`,
            },
            '&::after': {
              top: '60%',
              right: '20%',
              transform: `translate(${Math.sin(scrollY * 0.008) * -25}px, ${Math.cos(scrollY * 0.008) * -20}px)`,
            },
          }} />
        </ParallaxLayer>
        <FixedContent maxWidth="lg">
          <Typography variant="h2" component="h1" sx={{
            fontWeight: 'bold',
            mb: 3,
            fontSize: { xs: '2rem', md: '3.5rem' },
            lineHeight: 1.2
          }}>
            의원님, 혹시 '정치인'이 아니라<br />
            '홍보 담당자'로 살고 계십니까?
          </Typography>
          <Typography variant="h5" sx={{
            mb: 4,
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: { xs: '1.1rem', md: '1.5rem' }
          }}>
            전뇌비서관이 반복 업무에서 해방시켜,<br />
            본질인 '정치'에 집중하게 합니다.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleGetStarted}
            sx={{
              background: 'linear-gradient(45deg, #00d4ff, #0099cc)',
              px: 4,
              py: 2,
              fontSize: '1.2rem',
              '&:hover': {
                background: 'linear-gradient(45deg, #00b8e6, #007799)',
              }
            }}
          >
            무료 원고 체험
          </Button>
        </FixedContent>
      </HeroSection>

      {/* Scene 2: PROBLEM */}
      <ProblemSection>
        <ParallaxLayer speed={0.5}>
          <Box sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            '& > div': {
              position: 'absolute',
              width: '200px',
              height: '250px',
              background: 'rgba(200, 200, 200, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transform: `translateY(${scrollY * 0.3}px)`,
              '&:nth-of-type(1)': { top: '10%', left: '10%' },
              '&:nth-of-type(2)': { top: '30%', right: '15%' },
              '&:nth-of-type(3)': { top: '50%', left: '5%' },
            }
          }}>
            <div />
            <div />
            <div />
          </Box>
        </ParallaxLayer>
        <ParallaxLayer speed={0.8}>
          <Box sx={{
            position: 'absolute',
            top: '20%',
            right: '10%',
            fontSize: '24px',
            color: 'rgba(255, 100, 100, 0.6)',
            transform: `translateY(${scrollY * 0.5}px) rotate(-15deg)`,
            fontWeight: 'bold',
          }}>
            ...했습니다
          </Box>
        </ParallaxLayer>
        <FixedContent maxWidth="lg">
          <Typography variant="h3" component="h2" sx={{
            fontWeight: 'bold',
            mb: 4,
            fontSize: { xs: '1.8rem', md: '2.5rem' }
          }}>
            의원님의 마지막 블로그 글,<br />
            '...했습니다'로 끝나지 않았습니까?
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.9)' }}>
              주민은 '업무일지'보다 '비전과 약속'을 원합니다.
            </Typography>
            <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
              SNS 활동 지수, 공천에 반영(정책 환경 변화).
            </Typography>
          </Box>
        </FixedContent>
      </ProblemSection>

      {/* Scene 3: SOLUTION */}
      <SolutionSection>
        <ParallaxLayer speed={0.4}>
          <Grid container spacing={2} sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            padding: '20px',
            '& .tech-card': {
              background: 'rgba(0, 212, 255, 0.05)',
              border: '1px solid rgba(0, 212, 255, 0.2)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              transform: `translateY(${scrollY * 0.2}px)`,
            }
          }}>
            <Grid item xs={12} sm={4}>
              <Box className="tech-card">
                <Typography variant="h6" sx={{ color: '#00d4ff', mb: 1 }}>
                  AI 원고 생성
                </Typography>
                <Typography variant="body2">
                  개인 맞춤형 정치 콘텐츠
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box className="tech-card">
                <Typography variant="h6" sx={{ color: '#00d4ff', mb: 1 }}>
                  네이버 최적화
                </Typography>
                <Typography variant="body2">
                  검색 노출률 극대화
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box className="tech-card">
                <Typography variant="h6" sx={{ color: '#00d4ff', mb: 1 }}>
                  지역구 독점
                </Typography>
                <Typography variant="body2">
                  1인 1지역 전략
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </ParallaxLayer>
        <FixedContent maxWidth="lg">
          <Typography variant="h3" component="h2" sx={{
            fontWeight: 'bold',
            mb: 4,
            fontSize: { xs: '1.8rem', md: '2.5rem' }
          }}>
            정치인을 위한 완전한 디지털 솔루션
          </Typography>
          <Typography variant="h6" sx={{
            mb: 4,
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: { xs: '1rem', md: '1.3rem' }
          }}>
            AI가 만든 원고를 네이버에서 찾아보세요.<br />
            지역 주민들이 가장 먼저 만나게 될 것입니다.
          </Typography>
        </FixedContent>
      </SolutionSection>

      {/* Scene 4: HOW IT WORKS */}
      <HowItWorksSection>
        <ParallaxLayer speed={0.6}>
          <Box sx={{
            position: 'absolute',
            top: '30%',
            left: '20%',
            width: '2px',
            height: '20px',
            background: '#00d4ff',
            animation: 'blink 1s infinite',
            '@keyframes blink': {
              '0%, 50%': { opacity: 1 },
              '51%, 100%': { opacity: 0 },
            }
          }} />
        </ParallaxLayer>
        <ParallaxLayer speed={0.8}>
          <Box sx={{
            position: 'absolute',
            width: '100%',
            '& .keyword-chip': {
              position: 'absolute',
              background: 'rgba(0, 212, 255, 0.2)',
              border: '1px solid rgba(0, 212, 255, 0.5)',
              color: '#00d4ff',
              transform: `translateY(${scrollY * -0.4}px)`,
              '&:nth-of-type(1)': { top: '20%', left: '20%' },
              '&:nth-of-type(2)': { top: '40%', right: '25%' },
              '&:nth-of-type(3)': { top: '60%', left: '15%' },
            }
          }}>
            <Chip label="정책 키워드" className="keyword-chip" />
            <Chip label="지역 이슈" className="keyword-chip" />
            <Chip label="민생 현안" className="keyword-chip" />
          </Box>
        </ParallaxLayer>
        <FixedContent maxWidth="lg">
          <Typography variant="h3" component="h2" sx={{
            fontWeight: 'bold',
            mb: 4,
            fontSize: { xs: '1.8rem', md: '2.5rem' }
          }}>
            3단계로 완성되는 스마트한 정치 활동
          </Typography>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#00d4ff' }}>
              Step 1: 프로필 등록 — 5분 입력으로 평생 활용
            </Typography>
            <Typography variant="h6" sx={{ mb: 2, color: '#00d4ff' }}>
              Step 2: 원고 생성 — 네이버 검색 최적화
            </Typography>
            <Typography variant="h6" sx={{ mb: 2, color: '#00d4ff' }}>
              Step 3: 독점 전략 — 동일 지역구 1명만 계약
            </Typography>
          </Box>
        </FixedContent>
      </HowItWorksSection>

      {/* Scene 5: TRUST & PRICING */}
      <PricingSection>
        <FixedContent maxWidth="lg">
          <Typography variant="h3" component="h2" sx={{
            fontWeight: 'bold',
            mb: 2,
            textAlign: 'center',
            fontSize: { xs: '1.8rem', md: '2.5rem' }
          }}>
            '소통의 리더'를 위한 가장 현명한 투자
          </Typography>
          <Typography variant="h6" sx={{
            mb: 2,
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.8)'
          }}>
            우리는 민주당 동지입니다. 데이터는 안전합니다.
          </Typography>
          <Typography variant="h6" sx={{
            mb: 6,
            textAlign: 'center',
            color: '#00d4ff',
            fontWeight: 'bold'
          }}>
            기존 홍보 대비 75~95% 절감
          </Typography>

          <Grid container spacing={3} sx={{ mb: 8 }}>
            <Grid item xs={12} md={4}>
              <PricingCard>
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    📝 기반 다지기
                  </Typography>
                  <Typography variant="h4" sx={{ mb: 2, color: '#00d4ff' }}>
                    월 50,000원
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 3, opacity: 0.8 }}>
                    기본 원고 생성 및 네이버 최적화
                  </Typography>
                  <Button
                    variant="outlined"
                    fullWidth
                    sx={{ borderColor: '#00d4ff', color: '#00d4ff' }}
                  >
                    기반 다지기
                  </Button>
                </CardContent>
              </PricingCard>
            </Grid>

            <Grid item xs={12} md={4}>
              <PricingCard popular>
                <PopularBadge label="인기" size="small" />
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    🌆 영향력 확대
                  </Typography>
                  <Typography variant="h4" sx={{ mb: 2, color: '#00d4ff' }}>
                    월 120,000원
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 3, opacity: 0.8 }}>
                    프리미엄 기능 + 분석 리포트
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{
                      background: 'linear-gradient(45deg, #00d4ff, #0099cc)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #00b8e6, #007799)',
                      }
                    }}
                  >
                    영향력 확대
                  </Button>
                </CardContent>
              </PricingCard>
            </Grid>

            <Grid item xs={12} md={4}>
              <PricingCard>
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    👑 리더십 증명
                  </Typography>
                  <Typography variant="h4" sx={{ mb: 2, color: '#00d4ff' }}>
                    월 300,000원
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 3, opacity: 0.8 }}>
                    전담 매니저 + 맞춤 전략
                  </Typography>
                  <Button
                    variant="outlined"
                    fullWidth
                    sx={{ borderColor: '#00d4ff', color: '#00d4ff' }}
                  >
                    리더십 증명
                  </Button>
                </CardContent>
              </PricingCard>
            </Grid>
          </Grid>

          {/* FAQ & Final CTA - 더 넓은 간격 */}
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h4" sx={{ mb: 4, color: 'rgba(255, 255, 255, 0.9)', fontWeight: 'bold' }}>
              자주 묻는 질문
            </Typography>
            <Grid container spacing={3} sx={{ mb: 6 }}>
              <Grid item xs={12} md={6}>
                <Box sx={{
                  background: 'rgba(0, 212, 255, 0.1)',
                  p: 3,
                  borderRadius: 2,
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  height: '100%'
                }}>
                  <Typography variant="h6" sx={{ color: '#00d4ff', mb: 2 }}>
                    선거법 위반 위험은 없나요?
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.8 }}>
                    모든 콘텐츠는 선거법 준수를 기본으로 제작됩니다.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{
                  background: 'rgba(0, 212, 255, 0.1)',
                  p: 3,
                  borderRadius: 2,
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  height: '100%'
                }}>
                  <Typography variant="h6" sx={{ color: '#00d4ff', mb: 2 }}>
                    네이버 정책 변화에 대응 가능한가요?
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.8 }}>
                    지속적인 모니터링으로 알고리즘 변화에 대응합니다.
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Box sx={{
              background: 'rgba(0, 212, 255, 0.15)',
              p: 4,
              borderRadius: 3,
              border: '2px solid rgba(0, 212, 255, 0.4)',
              mb: 6
            }}>
              <Typography variant="h5" sx={{ color: '#00d4ff', mb: 2, fontWeight: 'bold' }}>
                Before: 검색 노출률 5% 미만 → After: 50%+ 목표
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                실제 데이터 기반 성과 목표
              </Typography>
            </Box>
          </Box>

          <Box sx={{ textAlign: 'center', pb: 10 }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleGetStarted}
              sx={{
                background: 'linear-gradient(45deg, #00d4ff, #0099cc)',
                px: 8,
                py: 4,
                fontSize: '1.5rem',
                fontWeight: 'bold',
                '&:hover': {
                  background: 'linear-gradient(45deg, #00b8e6, #007799)',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s ease',
                boxShadow: '0 8px 32px rgba(0, 212, 255, 0.3)',
              }}
            >
              스마트한 정치의 시작
            </Button>
          </Box>
        </FixedContent>
      </PricingSection>
    </Box>
  );
};

export default AboutPage;