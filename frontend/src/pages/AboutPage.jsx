// frontend/src/pages/AboutPage.jsx
import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, Card, CardContent, Button, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle, TrendingUp, Search, Star, Speed, Shield } from '@mui/icons-material';

const AboutPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const FeatureCard = ({ icon: Icon, title, description, color = '#2196f3' }) => (
    <Card sx={{ height: '100%', backgroundColor: '#ffffff', border: '1px solid #e0e0e0', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <CardContent sx={{ textAlign: 'center', p: 4 }}>
        <Icon sx={{ fontSize: 40, color, mb: 2 }} />
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1a1a1a !important', mb: 2 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: '#555555 !important', lineHeight: 1.6 }}>
          {description}
        </Typography>
      </CardContent>
    </Card>
  );

  const BeforeAfterCard = ({ before, after, title }) => (
    <Card sx={{ backgroundColor: '#ffffff', border: '1px solid #e0e0e0', height: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#1a1a1a !important', textAlign: 'center', mb: 3 }}>
          {title}
        </Typography>
        <Grid container spacing={2} sx={{ textAlign: 'center' }}>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ color: '#d32f2f !important', fontWeight: 600, mb: 1 }}>Before</Typography>
            <Typography variant="h4" sx={{ color: '#d32f2f !important', fontWeight: 700 }}>{before}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ color: '#4caf50 !important', fontWeight: 600, mb: 1 }}>After</Typography>
            <Typography variant="h4" sx={{ color: '#4caf50 !important', fontWeight: 700 }}>{after}</Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const FAQItem = ({ question, answer }) => (
    <Card sx={{ mb: 2, backgroundColor: '#ffffff', border: '1px solid #e0e0e0', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1976d2 !important', mb: 1 }}>
          {question}
        </Typography>
        <Typography variant="body2" sx={{ color: '#555555 !important', lineHeight: 1.6 }}>
          {answer}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{
      minHeight: '100vh',
      backgroundColor: '#ffffff !important',
      color: '#333333 !important',
      position: 'relative',
      overflow: 'hidden',
      '& *': {
        color: '#333333 !important'
      },
      '& .MuiTypography-root': {
        color: '#333333 !important'
      },
      '& .MuiButton-root': {
        color: '#ffffff !important',
        backgroundColor: '#1976d2 !important'
      },
      '& h1, & h2, & h3, & h4, & h5, & h6': {
        color: '#1a1a1a !important'
      },
      '& p, & span, & div': {
        color: '#555555 !important'
      },
      '& .MuiCard-root': {
        backgroundColor: '#ffffff !important',
        '& *': {
          color: '#333333 !important'
        },
        '& .MuiTypography-h6': {
          color: '#1a1a1a !important'
        },
        '& .MuiTypography-body2': {
          color: '#555555 !important'
        }
      }
    }}>
      {/* Parallax Background Elements */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '120vh',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          transform: `translateY(${scrollY * 0.5}px)`,
          zIndex: -2
        }}
      />
      <Box
        sx={{
          position: 'fixed',
          top: '20%',
          right: '-10%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'linear-gradient(45deg, rgba(33, 150, 243, 0.1), rgba(33, 150, 243, 0.05))',
          transform: `translateY(${scrollY * 0.3}px) rotate(${scrollY * 0.1}deg)`,
          zIndex: -1
        }}
      />
      <Box
        sx={{
          position: 'fixed',
          top: '60%',
          left: '-5%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'linear-gradient(45deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.05))',
          transform: `translateY(${scrollY * 0.2}px) rotate(${-scrollY * 0.05}deg)`,
          zIndex: -1
        }}
      />

      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ py: 16, position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            textAlign: 'center',
            mb: 12,
            mt: 8,
            transform: `translateY(${scrollY * 0.1}px)`,
            opacity: Math.max(0, 1 - scrollY / 400)
          }}
        >
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: 3,
              color: '#1a1a1a',
              lineHeight: 1.3
            }}
          >
            의원님, 혹시 '정치인'이 아니라<br />
            '홍보 담당자'로 일하고 계십니까?
          </Typography>
          <Typography variant="h6" sx={{ color: '#666666 !important', mb: 4, lineHeight: 1.6, maxWidth: '700px', mx: 'auto' }}>
            '전뇌비서관'이 반복 업무의 늪에서 당신을 구출하고,<br />
            가장 중요한 본질, <span style={{ color: '#1976d2 !important', fontWeight: 600 }}>정치</span>에만 집중하도록 만들겠습니다.
          </Typography>
          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleGetStarted}
              sx={{
                px: 6,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                backgroundColor: '#1976d2',
                color: '#fff',
                mb: 2,
                borderRadius: 2,
                '&:hover': {
                  backgroundColor: '#1565c0',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s ease'
              }}
            >
              {user ? '대시보드로 이동' : '무료 원고 체험'}
            </Button>
            <Typography variant="body2" sx={{ color: '#666666 !important' }}>
              30초면 충분합니다.
            </Typography>
          </Box>
        </Box>

        {/* Problem Section */}
        <Box
          sx={{
            mb: 10,
            p: 5,
            backgroundColor: '#f5f5f5',
            borderRadius: 3,
            border: '1px solid #e0e0e0',
            transform: `translateY(${Math.max(0, (scrollY - 300) * 0.1)}px)`,
            opacity: scrollY > 200 ? Math.min(1, (scrollY - 200) / 200) : 0
          }}
        >
          <Typography
            variant="h4"
            sx={{
              textAlign: 'center',
              fontWeight: 600,
              mb: 4,
              color: '#1a1a1a !important',
              lineHeight: 1.4
            }}
          >
            "의원님의 마지막 블로그 글,<br />
            혹시 '...했습니다'로 끝나지 않았습니까?"
          </Typography>
          <Typography variant="body1" sx={{ color: '#555555', mb: 4, lineHeight: 1.8, textAlign: 'center', maxWidth: '700px', mx: 'auto' }}>
            수많은 정치인들이 자신의 활동을 '알리기'보다, 단순히 '증명'하기 위해 글을 씁니다.<br />
            하지만 주민들은 당신의 '업무일지'를 궁금해하지 않습니다. 그들은 당신의 '비전'과 '약속'을 듣고 싶어 합니다.
          </Typography>
          <Box sx={{ textAlign: 'center', p: 4, backgroundColor: '#e3f2fd', borderRadius: 2, border: '1px solid #bbdefb' }}>
            <Typography variant="subtitle1" sx={{ color: '#1976d2', fontWeight: 600, mb: 2 }}>
              제도적 필수성
            </Typography>
            <Typography variant="h6" sx={{ color: '#1a1a1a', fontWeight: 500, mb: 1 }}>
              정청래 당대표 공약: SNS 활동 지수, 공천 반영
            </Typography>
            <Typography variant="body2" sx={{ color: '#555555' }}>
              이제 소통의 '질'은 선택이 아닌, 생존의 필수 조건입니다.
            </Typography>
          </Box>
        </Box>

        {/* Why Naver Section */}
        <Box
          sx={{
            mb: 10,
            transform: `translateY(${Math.max(0, (scrollY - 600) * 0.05)}px)`,
            opacity: scrollY > 500 ? Math.min(1, (scrollY - 500) / 300) : 0
          }}
        >
          <Typography
            variant="h4"
            sx={{
              textAlign: 'center',
              fontWeight: 600,
              mb: 6,
              color: '#1a1a1a'
            }}
          >
            왜 지금, '네이버 블로그'가 가장 강력한 베이스캠프입니까?
          </Typography>
          <Grid container spacing={4}>
            {[
              { icon: Star, title: "콘텐츠 허브", description: "모든 SNS 활동의 결과물이 쌓이는 유일한 '기록보관소'로 체계적인 정책 자료를 구축합니다.", color: "#2196f3", delay: 0 },
              { icon: Shield, title: "신뢰 자산", description: "깊이 있는 글로 '신뢰'라는 가장 중요한 정치적 자산을 구축하고 전문성을 인정받습니다.", color: "#4caf50", delay: 100 },
              { icon: Search, title: "검색 지배력", description: "유권자가 있는 곳, 네이버 검색의 특권을 활용하는 가장 스마트한 전략입니다.", color: "#ff9800", delay: 200 }
            ].map((item, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Box
                  sx={{
                    transform: `translateY(${Math.max(0, (scrollY - 800 - item.delay) * 0.1)}px)`,
                    opacity: scrollY > 700 + item.delay ? Math.min(1, (scrollY - 700 - item.delay) / 200) : 0,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <FeatureCard
                    icon={item.icon}
                    title={item.title}
                    description={item.description}
                    color={item.color}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Solution Section */}
        <Box
          sx={{
            mb: 10,
            transform: `translateY(${Math.max(0, (scrollY - 1200) * 0.05)}px)`,
            opacity: scrollY > 1100 ? Math.min(1, (scrollY - 1100) / 300) : 0
          }}
        >
          <Typography
            variant="h4"
            sx={{
              textAlign: 'center',
              fontWeight: 600,
              mb: 2,
              color: '#1a1a1a'
            }}
          >
            전자두뇌비서관으로, 당신은 '전략가'가 됩니다.
          </Typography>
          <Typography
            variant="h6"
            sx={{
              textAlign: 'center',
              color: '#666666',
              mb: 6,
              fontWeight: 400
            }}
          >
            3단계 변화로 정치적 소통의 새로운 차원을 경험하세요
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <FeatureCard
                icon={Speed}
                title="AI 원고 생성"
                description="당신은 글쓰기 고민에서 완전히 해방됩니다. AI가 정책과 지역 현안을 깊이 있게 분석한 고품질 원고를 생성합니다."
                color="#e91e63"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FeatureCard
                icon={TrendingUp}
                title="검색 최적화"
                description="당신은 주민들이 먼저 찾아보는 '일 잘하는 정치인'으로 각인됩니다. 네이버 검색 상위 노출로 브랜딩을 강화합니다."
                color="#2196f3"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FeatureCard
                icon={CheckCircle}
                title="지역구 독점권"
                description="당신은 경쟁자가 따라올 수 없는 압도적인 소통 우위를 점하게 됩니다. 차별화된 전략으로 선도적 위치를 확보합니다."
                color="#ff9800"
              />
            </Grid>
          </Grid>
        </Box>

        {/* Trust & Pricing Section */}
        <Box
          sx={{
            mb: 10,
            textAlign: 'center',
            p: 6,
            backgroundColor: '#f8f9fa',
            borderRadius: 4,
            border: '1px solid #e9ecef',
            transform: `translateY(${Math.max(0, (scrollY - 1800) * 0.08)}px)`,
            opacity: scrollY > 1700 ? Math.min(1, (scrollY - 1700) / 300) : 0
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 3, color: '#1976d2' }}>
            지금 가입하시면, 향후 모든 기능 업데이트를 무료로 제공받습니다.
          </Typography>
          <Typography variant="h6" sx={{ color: '#555555', mb: 4 }}>
            Phase 1: 네이버 블로그 최적화 → Phase 2: 멀티 SNS 연동 → Phase 3: 글로벌 AI 검색 대응
          </Typography>
          <Typography variant="body1" sx={{ color: '#666666' }}>
            미래 검색 시장을 선점하는 스마트한 투자입니다.
          </Typography>
        </Box>

        {/* Before/After Cards */}
        <Box
          sx={{
            mb: 10,
            transform: `translateY(${Math.max(0, (scrollY - 2200) * 0.06)}px)`,
            opacity: scrollY > 2100 ? Math.min(1, (scrollY - 2100) / 300) : 0
          }}
        >
          <Typography
            variant="h4"
            sx={{
              textAlign: 'center',
              fontWeight: 600,
              mb: 6,
              color: '#1a1a1a'
            }}
          >
            실제 성과
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <BeforeAfterCard
                title="검색 노출률"
                before="5% 미만"
                after="50% 이상"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <BeforeAfterCard
                title="콘텐츠 생산량"
                before="월 2-3개"
                after="월 20개+"
              />
            </Grid>
          </Grid>
        </Box>

        {/* FAQ Section */}
        <Box
          sx={{
            mb: 10,
            transform: `translateY(${Math.max(0, (scrollY - 2600) * 0.04)}px)`,
            opacity: scrollY > 2500 ? Math.min(1, (scrollY - 2500) / 300) : 0
          }}
        >
          <Typography
            variant="h4"
            sx={{
              textAlign: 'center',
              fontWeight: 600,
              mb: 6,
              color: '#1a1a1a'
            }}
          >
            자주 묻는 질문
          </Typography>
          <FAQItem
            question="Q. AI가 쓴 글을 그대로 써도 되나요?"
            answer="AI가 생성한 원고는 기본 틀을 제공하며, 사용자가 검토하고 수정하여 완성도를 높일 수 있습니다. 정책과 지역 현안에 맞게 개인화된 내용으로 제작되어 높은 품질을 보장합니다."
          />
          <FAQItem
            question="Q. 선거법 위반 위험은 없나요?"
            answer="모든 생성 내용은 선거법 준수를 기본으로 하며, 정책 홍보와 지역 소통에 특화된 안전한 콘텐츠입니다. 선거 기간 중에는 별도 가이드라인을 제공합니다."
          />
          <FAQItem
            question="Q. 네이버 정책 변화에 대응 가능한가요?"
            answer="네이버 검색 알고리즘 변화를 지속적으로 모니터링하고, 업데이트에 맞춰 콘텐츠 최적화 전략을 자동으로 조정합니다. 플랫폼 독립적인 멀티채널 전략도 준비 중입니다."
          />
        </Box>

        {/* Final CTA */}
        <Box
          sx={{
            textAlign: 'center',
            p: 8,
            backgroundColor: '#e3f2fd',
            borderRadius: 4,
            border: '1px solid #bbdefb',
            transform: `translateY(${Math.max(0, (scrollY - 3000) * 0.02)}px)`,
            opacity: scrollY > 2900 ? Math.min(1, (scrollY - 2900) / 300) : 0
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 4, color: '#1a1a1a' }}>
            스마트한 정치의 시작
          </Typography>
          <Typography variant="h6" sx={{ color: '#555555', mb: 6 }}>
            지금 시작하여 정치적 소통의 새로운 차원을 경험하세요
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleGetStarted}
            sx={{
              px: 8,
              py: 3,
              fontSize: '1.2rem',
              fontWeight: 600,
              backgroundColor: '#1976d2',
              color: '#fff',
              borderRadius: 3,
              boxShadow: '0 4px 16px rgba(25, 118, 210, 0.3)',
              '&:hover': {
                backgroundColor: '#1565c0',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(25, 118, 210, 0.4)',
              },
              transition: 'all 0.3s ease'
            }}
          >
            {user ? '대시보드로 이동' : '지금 시작하기'}
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default AboutPage;