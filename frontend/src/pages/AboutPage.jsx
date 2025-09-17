// frontend/src/pages/AboutPage.jsx
import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const PageWrapper = styled(Box)(({ theme }) => ({
  backgroundColor: '#05070f',
  color: 'rgba(255, 255, 255, 0.92)',
  minHeight: '100vh',
}));

const Section = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(12),
  paddingBottom: theme.spacing(12),
  [theme.breakpoints.down('sm')]: {
    paddingTop: theme.spacing(8),
    paddingBottom: theme.spacing(8),
  },
}));

const HeroSection = styled(Section)(({ theme }) => ({
  paddingTop: theme.spacing(16),
  paddingBottom: theme.spacing(14),
  background: 'linear-gradient(135deg, #0b1e4c 0%, #0a1530 45%, #05070f 100%)',
}));

const Accent = styled('span')(() => ({
  color: '#00d4ff',
}));

const HighlightCard = styled(Card)(() => ({
  backgroundColor: 'rgba(0, 212, 255, 0.08)',
  border: '1px solid rgba(0, 212, 255, 0.3)',
  boxShadow: '0 24px 45px rgba(0, 212, 255, 0.08)',
  height: '100%',
}));

const NeutralCard = styled(Card)(() => ({
  backgroundColor: 'rgba(10, 16, 35, 0.78)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  backdropFilter: 'blur(10px)',
  height: '100%',
}));

const heroHighlights = [
  {
    value: '92%',
    label: '콘텐츠 승인율',
    description: '최근 3개월 중앙선관위 심의 결과 기준',
  },
  {
    value: '48시간',
    label: '캠페인 가이드 제작',
    description: '전략 수립부터 검수까지 평균 리드타임',
  },
  {
    value: '30%',
    label: '광고 효율 개선',
    description: '실제 캠페인 CPM 기준 평균 절감 폭',
  },
  {
    value: '70+',
    label: '축적된 캠페인 레퍼런스',
    description: '지방·국회 선거 포함 누적 협업 사례',
  },
];

const differentiators = [
  {
    title: '선거법 준수형 언어 모델',
    description:
      '최근 위반 판례 1만+건을 분석한 민감 키워드 필터와 문장 단위 검수를 통해 안심하고 콘텐츠를 배포할 수 있습니다.',
  },
  {
    title: '행동 데이터 기반 인사이트',
    description:
      'SNS·커뮤니티 반응, 지역 이슈 데이터를 통합해 후보별 우선 메시지와 필요한 채널 전략을 추천합니다.',
  },
  {
    title: '캠페인 운영 자동화',
    description:
      '캘린더, 성과 리포트, 실시간 알림까지 통합해 팀 전체가 같은 속도로 움직일 수 있도록 워크플로를 정리했습니다.',
  },
];

const workflowSteps = [
  {
    title: '캠페인 진단 워크숍',
    description: '핵심 의제, 타깃 유권자, 기존 자산을 분석해 우선순위를 설정합니다.',
    deliverable: '산출물: Kickoff 리포트 · 리스크 매트릭스',
  },
  {
    title: 'AI 콘텐츠 생성 & 검수',
    description: '시나리오별 템플릿을 통해 메시지를 생성하고, 선거법 필터로 즉시 검수합니다.',
    deliverable: '산출물: 채널별 콘텐츠 패키지',
  },
  {
    title: '성과 측정 & 최적화',
    description: '성과 데이터와 피드백을 반영해 메시지를 조정하고, 주간 리포트를 제공합니다.',
    deliverable: '산출물: 주간 리포트 · 개선 제안',
  },
];

const pricingPlans = [
  {
    name: 'Starter',
    price: '월 99,000원',
    description: '첫 캠페인을 준비하는 후보자를 위한 기본 플랜',
    features: [
      'AI 콘텐츠 생성 50건/월',
      '선거법 위반 키워드 사전 필터',
      '캠페인 캘린더 & 체크리스트',
    ],
    cta: '시작하기',
    action: 'start',
  },
  {
    name: 'Growth',
    price: '월 199,000원',
    description: '온라인 여론 관리를 본격화하려는 팀을 위한 추천 구성',
    features: [
      'AI 콘텐츠 생성 150건/월',
      '전문 에디터 1:1 검수',
      '실시간 이슈 모니터링 알림',
      '주간 성과 리포트',
    ],
    cta: '상담 요청',
    action: 'contact',
    popular: true,
  },
  {
    name: 'Campaign Suite',
    price: '맞춤 견적',
    description: '대규모 선거 또는 연중 상시 캠페인 운영을 위한 맞춤 서비스',
    features: [
      '무제한 콘텐츠 생성 워크플로',
      '지역별/이슈별 데이터 분석',
      '현장 운영 컨설턴트 파견',
      '통합 대시보드 구축',
    ],
    cta: '맞춤 제안 받기',
    action: 'contact',
  },
];

const faqItems = [
  {
    question: '생성된 콘텐츠는 선거법을 준수하나요?',
    answer:
      '모든 문장은 중앙선관위 가이드라인을 반영한 규칙 기반 필터와 전문가 검수를 거칩니다. 필요 시 법률 자문 연결도 지원합니다.',
  },
  {
    question: '우리 캠페인 데이터는 안전하게 관리되나요?',
    answer:
      '캠페인 자료는 암호화 저장되며 프로젝트별 접근 권한을 분리합니다. 요청 시 계약 종료와 함께 즉시 파기합니다.',
  },
  {
    question: '온보딩에 얼마나 걸리나요?',
    answer:
      '계약 후 3일 이내에 기초 워크숍과 시스템 세팅을 마치고, 최대 1주 안에 첫 주간 운영을 시작합니다.',
  },
  {
    question: '기존 팀과 함께 사용해도 되나요?',
    answer:
      '내부 팀 또는 외부 대행사와 협업할 수 있도록 역할별 계정과 코멘트 워크플로를 제공합니다.',
  },
];

const AboutPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
  };

  const handleContact = () => {
    window.location.href = 'mailto:hello@aisecretary.co';
  };

  return (
    <PageWrapper component="main">
      <HeroSection>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Stack spacing={3}>
                <Chip
                  label="AI Secretary 소개"
                  sx={{
                    alignSelf: 'flex-start',
                    backgroundColor: 'rgba(0, 212, 255, 0.12)',
                    color: '#00d4ff',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                  }}
                />
                <Typography variant="h2" component="h1" sx={{ fontWeight: 700, lineHeight: 1.15 }}>
                  선거 캠페인을 위한 <Accent>AI 전략 파트너</Accent>
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.72)' }}>
                  AI Secretary는 복잡한 선거 메시지를 빠르게 정리하고, 법적 리스크 없이 커뮤니케이션을 운영하도록 돕는 캠페인 운영 솔루션입니다.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleGetStarted}
                    sx={{
                      background: 'linear-gradient(135deg, #00d4ff 0%, #0097d5 100%)',
                      color: '#041120',
                      fontWeight: 600,
                      px: 4,
                      py: 1.5,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #00bde6 0%, #0081b5 100%)',
                      },
                    }}
                  >
                    지금 시작하기
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={handleContact}
                    sx={{ borderColor: '#00d4ff', color: '#00d4ff', px: 4, py: 1.5 }}
                  >
                    상담 일정 잡기
                  </Button>
                </Stack>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Grid container spacing={3}>
                {heroHighlights.map((item) => (
                  <Grid item xs={12} sm={6} key={item.label}>
                    <HighlightCard>
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="h3" component="p" sx={{ fontWeight: 700, color: '#00d4ff' }}>
                          {item.value}
                        </Typography>
                        <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 600 }}>
                          {item.label}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1.5, color: 'rgba(255, 255, 255, 0.72)' }}>
                          {item.description}
                        </Typography>
                      </CardContent>
                    </HighlightCard>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </HeroSection>

      <Section>
        <Container maxWidth="lg">
          <Stack spacing={3} alignItems="flex-start">
            <Chip
              label="우리가 해결하는 문제"
              sx={{
                backgroundColor: 'rgba(0, 212, 255, 0.08)',
                color: '#00d4ff',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              복잡한 캠페인 메시지를 데이터를 기반으로 정리합니다
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.72)', maxWidth: 720 }}>
              후보자의 강점과 지역 이슈를 빠르게 정리하고, 상황에 맞는 메시지를 지속적으로 배포할 수 있도록 데이터와 경험을 결합했습니다.
            </Typography>
          </Stack>
          <Grid container spacing={3} sx={{ mt: 6 }}>
            {differentiators.map((item) => (
              <Grid item xs={12} md={4} key={item.title}>
                <NeutralCard>
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {item.title}
                    </Typography>
                    <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.12)' }} />
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.72)' }}>
                      {item.description}
                    </Typography>
                  </CardContent>
                </NeutralCard>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Section>

      <Section sx={{ backgroundColor: 'rgba(10, 20, 45, 0.65)' }}>
        <Container maxWidth="lg">
          <Stack spacing={3} alignItems="flex-start">
            <Chip
              label="워크플로"
              sx={{
                backgroundColor: 'rgba(0, 212, 255, 0.08)',
                color: '#00d4ff',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              팀 전체가 같은 속도로 움직이도록 설계된 프로세스
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.72)', maxWidth: 720 }}>
              전략 수립부터 생성, 검수, 성과 분석까지 하나의 대시보드에서 운영합니다.
            </Typography>
          </Stack>
          <Grid container spacing={3} sx={{ mt: 6 }}>
            {workflowSteps.map((step) => (
              <Grid item xs={12} md={4} key={step.title}>
                <NeutralCard sx={{ borderTop: '3px solid rgba(0, 212, 255, 0.5)' }}>
                  <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {step.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.72)' }}>
                      {step.description}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(0, 212, 255, 0.9)', fontWeight: 600 }}>
                      {step.deliverable}
                    </Typography>
                  </CardContent>
                </NeutralCard>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Section>

      <Section>
        <Container maxWidth="lg">
          <Stack spacing={3} alignItems="flex-start">
            <Chip
              label="서비스 구성과 요금"
              sx={{
                backgroundColor: 'rgba(0, 212, 255, 0.08)',
                color: '#00d4ff',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              캠페인 규모에 맞는 플랜을 선택하세요
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.72)', maxWidth: 720 }}>
              모든 플랜에는 선거법 준수 필터, 프로젝트 관리 도구, 기본 온보딩이 포함됩니다.
            </Typography>
          </Stack>
          <Grid container spacing={3} sx={{ mt: 6 }}>
            {pricingPlans.map((plan) => (
              <Grid item xs={12} md={4} key={plan.name}>
                <NeutralCard
                  sx={{
                    border: plan.popular ? '2px solid rgba(0, 212, 255, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                    transform: plan.popular ? 'translateY(-8px)' : 'none',
                    boxShadow: plan.popular ? '0 24px 45px rgba(0, 212, 255, 0.18)' : 'none',
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {plan.popular && (
                      <Chip
                        label="가장 많이 선택"
                        size="small"
                        sx={{
                          alignSelf: 'flex-start',
                          backgroundColor: 'rgba(0, 212, 255, 0.15)',
                          color: '#00d4ff',
                          fontWeight: 600,
                        }}
                      />
                    )}
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {plan.name}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#00d4ff' }}>
                      {plan.price}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.72)' }}>
                      {plan.description}
                    </Typography>
                    <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 2, display: 'grid', rowGap: 1.5 }}>
                      {plan.features.map((feature) => (
                        <Typography
                          component="li"
                          key={feature}
                          variant="body2"
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            color: 'rgba(255, 255, 255, 0.76)',
                          }}
                        >
                          <Box
                            component="span"
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: '#00d4ff',
                              display: 'inline-block',
                            }}
                          />
                          {feature}
                        </Typography>
                      ))}
                    </Box>
                    <Button
                      variant={plan.popular ? 'contained' : 'outlined'}
                      onClick={() => (plan.action === 'start' ? handleGetStarted() : handleContact())}
                      sx={{
                        mt: 2,
                        background: plan.popular ? 'linear-gradient(135deg, #00d4ff 0%, #0097d5 100%)' : 'transparent',
                        borderColor: '#00d4ff',
                        color: plan.popular ? '#041120' : '#00d4ff',
                        fontWeight: 600,
                        '&:hover': {
                          background:
                            plan.popular
                              ? 'linear-gradient(135deg, #00bde6 0%, #0081b5 100%)'
                              : 'rgba(0, 212, 255, 0.12)',
                        },
                      }}
                    >
                      {plan.cta}
                    </Button>
                  </CardContent>
                </NeutralCard>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Section>

      <Section sx={{ backgroundColor: 'rgba(10, 16, 35, 0.78)' }}>
        <Container maxWidth="lg">
          <Stack spacing={3} alignItems="flex-start">
            <Chip
              label="자주 묻는 질문"
              sx={{
                backgroundColor: 'rgba(0, 212, 255, 0.08)',
                color: '#00d4ff',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              질문이 더 있으신가요?
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.72)', maxWidth: 720 }}>
              필요한 정보가 없다면 언제든지 연락을 주세요. 팀이 직접 도와드립니다.
            </Typography>
          </Stack>
          <Stack spacing={2.5} sx={{ mt: 6 }}>
            {faqItems.map((item) => (
              <Accordion
                key={item.question}
                disableGutters
                sx={{
                  background: 'rgba(5, 11, 24, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'rgba(255, 255, 255, 0.88)',
                  '&::before': { display: 'none' },
                }}
              >
                <AccordionSummary
                  expandIcon={
                    <Box component="span" sx={{ color: '#00d4ff', fontWeight: 700, fontSize: '1.25rem' }}>
                      +
                    </Box>
                  }
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {item.question}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.72)' }}>
                    {item.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        </Container>
      </Section>

      <Section>
        <Container maxWidth="md">
          <NeutralCard>
            <CardContent sx={{ p: { xs: 4, md: 6 }, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                지금 팀의 메시지를 정리할 준비가 되셨나요?
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.72)' }}>
                온보딩부터 운영까지 함께하며, 매주 성과를 확인할 수 있는 리포트와 가이드를 제공합니다.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleGetStarted}
                  sx={{
                    background: 'linear-gradient(135deg, #00d4ff 0%, #0097d5 100%)',
                    color: '#041120',
                    fontWeight: 600,
                    px: 4,
                    py: 1.5,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #00bde6 0%, #0081b5 100%)',
                    },
                  }}
                >
                  무료로 시작하기
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={handleContact}
                  sx={{ borderColor: '#00d4ff', color: '#00d4ff', px: 4, py: 1.5 }}
                >
                  상담 요청하기
                </Button>
              </Stack>
            </CardContent>
          </NeutralCard>
        </Container>
      </Section>
    </PageWrapper>
  );
};

export default AboutPage;
