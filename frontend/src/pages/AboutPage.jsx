// frontend/src/pages/AboutPage.jsx
// Secret LP build: no SEO exposure, demo-safe stats toggling, fast visuals.
// - Robots noindex via react-helmet-async
// - Demo numbers/claims only when ?demo=1 (or showDemo prop)
// - One eager hero image; all others lazy
// - Subtle in-view fades; reduced-motion respected

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Stack,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useMediaQuery,
  Fade,
  Switch,
  FormControlLabel,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { styled } from '@mui/material/styles';
import { Helmet } from 'react-helmet-async'; // ensure provider is set at app root
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// -----------------------------
// Data (constants)
// -----------------------------

const FEATURES = [
  {
    title: '하루 5분 투자',
    desc: 'AI가 원고를 써드리면, 의원님은 클릭 3번으로 승인만 하세요.',
  },
  {
    title: '월간 유입 극대화',
    desc: '주민들이 지역 현안을 검색할 때 의원님 관련 콘텐츠가 먼저 보이도록 설계합니다.',
  },
  {
    title: '선거구 독점 보장',
    desc: '같은 선거구에는 단 한 명만 서비스를 제공해 경쟁 걱정이 없습니다.',
  },
  {
    title: '당내 평가 상승',
    desc: '온라인 활동 지표를 안정적으로 채울 수 있게 운용합니다.',
  },
];

const TESTIMONIALS = [
  {
    name: '인천시 K 시의원',
    text: '선거 때만 부랴부랴? 이제 필요 없습니다. 평소에 꾸준히 노출되니 주민들이 먼저 연락 옵니다.',
  },
  {
    name: '서울시 P 구의원',
    text: '처음엔 반신반의했는데 정말 검색에 제가 보입니다. 동네 현안 검색 시 제 이름이 자연스럽게 노출됩니다.',
  },
  {
    name: '경기도 L 시의원',
    text: '복잡한 건 싫어하는데 이건 정말 간단합니다. AI가 써준 걸 보고 맘에 들면 확정 누르면 끝.',
  },
];

const FAQS = [
  {
    q: '정말 검색 1페이지에 노출되나요?',
    a: '지역 현안 키워드 기반으로 순차적 노출을 설계합니다. (구체 수치는 데모 모드에서만 표시)',
  },
  {
    q: '다른 의원도 쓰면 어떻게 되나요?',
    a: '선거구별 독점 정책입니다. 같은 지역구에는 한 명만 계약합니다.',
  },
  {
    q: '선거법 위반 아닌가요?',
    a: '정책 홍보와 의정활동 보고 중심으로 운영하며, 사전 자문을 거친 안전한 콘텐츠만 생성합니다.',
  },
];

// -----------------------------
// Styled
// -----------------------------

const Page = styled('main')({
  background: '#050511',
  color: '#fff',
  minHeight: '100vh',
});

const Section = styled('section')(({ theme }) => ({
  padding: theme.spacing(12, 0),
  borderBottom: '1px solid rgba(0, 212, 255, 0.10)',
  position: 'relative',
  [theme.breakpoints.down('sm')]: { padding: theme.spacing(8, 0) },
}));

const HeroRoot = styled('header')({
  position: 'relative',
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  overflow: 'hidden',
  borderBottom: '1px solid rgba(0, 212, 255, 0.10)',
});

const HeroOverlay = styled(Box)({
  position: 'absolute',
  inset: 0,
  background:
    'linear-gradient(180deg, rgba(5, 11, 17, 0.35) 0%, rgba(5, 11, 17, 0.55) 45%, rgba(5, 11, 17, 0.80) 100%)',
  pointerEvents: 'none',
  zIndex: -1,
});

const HeroContent = styled(Box)(({ theme }) => ({
  position: 'relative',
  zIndex: 10,
  textAlign: 'center',
  width: '100%',
  maxWidth: 960,
  padding: theme.spacing(0, 3),
}));

const CTAButton = styled(Button)(({ theme }) => ({
  background: 'linear-gradient(135deg, #00d4ff 0%, #0097d5 100%)',
  color: '#041120',
  fontWeight: 700,
  padding: theme.spacing(1.25, 3),
  borderRadius: 12,
  letterSpacing: '0.02em',
  transition: 'transform 200ms ease, box-shadow 200ms ease, background 200ms ease',
  boxShadow: '0 10px 30px rgba(0, 212, 255, 0.25)',
  '&:hover': {
    transform: 'translateY(-2px)',
    background: 'linear-gradient(135deg, #00bde6 0%, #0081b5 100%)',
    boxShadow: '0 16px 42px rgba(0, 212, 255, 0.32)',
  },
}));

const OutlineButton = styled(Button)(({ theme }) => ({
  borderColor: '#00d4ff',
  color: '#00d4ff',
  fontWeight: 700,
  padding: theme.spacing(1.25, 3),
  borderRadius: 12,
  letterSpacing: '0.02em',
  '&:hover': {
    backgroundColor: 'rgba(0, 212, 255, 0.10)',
    borderColor: '#00d4ff',
  },
}));

const CardSoft = styled(Card)({
  backgroundColor: 'rgba(255,255,255,0.04)',
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.06)',
  backdropFilter: 'blur(6px)',
});

const CardEmphasis = styled(Card)({
  backgroundColor: 'rgba(0, 212, 255, 0.10)',
  borderRadius: 16,
  border: '1px solid rgba(0, 212, 255, 0.25)',
  backdropFilter: 'blur(6px)',
});

const StatBadge = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: theme.spacing(0.75, 1.25),
  borderRadius: 999,
  fontSize: 13,
  lineHeight: 1.2,
  color: '#00d4ff',
  backgroundColor: 'rgba(0, 212, 255, 0.10)',
  border: '1px solid rgba(0, 212, 255, 0.22)',
}));

const DemoWatermark = styled(Box)({
  position: 'absolute',
  right: 12,
  bottom: 12,
  padding: '4px 8px',
  fontSize: 12,
  borderRadius: 8,
  color: 'rgba(255,255,255,0.85)',
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid rgba(255,255,255,0.25)',
  pointerEvents: 'none',
});

const ContentContainer = styled(Container)({
  position: 'relative',
  zIndex: 10,
});

// -----------------------------
// In-view fade (lightweight)
// -----------------------------

function InViewFade({ children, threshold = 0.16, timeout = 800, ...props }) {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const ref = React.useRef(null);
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [threshold]);

  return (
    <Box ref={ref} {...props}>
      <Fade in={inView} timeout={prefersReducedMotion ? 0 : timeout}>
        <Box>{children}</Box>
      </Fade>
    </Box>
  );
}

// -----------------------------
// Page
// -----------------------------

const AboutPage = ({ showDemo: showDemoProp }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Demo toggle: prop OR ?demo=1 OR dev env
  const [demoMode, setDemoMode] = React.useState(() => {
    if (typeof showDemoProp === 'boolean') return showDemoProp;
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    return params.get('demo') === '1';
  });

  // Show demo switch only in dev or with ?demo=1
  const showDemoSwitch = process.env.NODE_ENV !== 'production' ||
    new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('demo') === '1';

  const handlePrimaryCTA = () => {
    if (user) navigate('/dashboard');
    else navigate('/register');
  };

  return (
    <Page>
      {/* Secret: noindex */}
      <Helmet>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="googlebot" content="noindex,nofollow" />
      </Helmet>

      {/* Demo switch (only in dev or with ?demo=1) */}
      {showDemoSwitch && (
        <Box sx={{ position: 'fixed', right: 16, top: 16, zIndex: 10 }}>
          <FormControlLabel
            control={
              <Switch
                checked={demoMode}
                onChange={(e) => setDemoMode(e.target.checked)}
                color="info"
                size="small"
              />
            }
            label="데모 데이터"
            sx={{
              color: 'rgba(255,255,255,0.75)',
              bgcolor: 'rgba(255,255,255,0.06)',
              px: 1.25,
              py: 0.5,
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          />
        </Box>
      )}

      {/* Hero */}
      <HeroRoot>
        <Box sx={{ position: 'absolute', inset: 0, zIndex: -2 }}>
          <picture>
            <source
              media="(min-width:1200px)"
              srcSet="/images/hero-search-xl.webp"
              type="image/webp"
            />
            <source
              media="(min-width:600px)"
              srcSet="/images/hero-search-lg.webp"
              type="image/webp"
            />
            <img
              src="/images/hero-search.jpg"
              alt="검색 노출 예시 화면"
              loading="eager"
              decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              fetchpriority="high"
            />
          </picture>
          {demoMode && <DemoWatermark>DEMO</DemoWatermark>}
        </Box>
        <HeroOverlay />
        <HeroContent>
          <InViewFade threshold={0.01} timeout={650}>
            <Typography
              component="h1"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                fontSize: { xs: 'clamp(28px, 7vw, 40px)', md: 'clamp(40px, 5vw, 56px)' },
                mb: 1.5,
              }}
            >
              재선 걱정 끝. <Box component="span" sx={{ color: '#00d4ff' }}>검색부터 이기세요</Box>
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: 'rgba(255,255,255,0.86)', fontWeight: 500, letterSpacing: '0.01em', mb: 3.5 }}
            >
              3개월이면 지역 검색 1위. 주민이 먼저 찾는 의원이 됩니다
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <CTAButton aria-label="검색 1위 되기" onClick={handlePrimaryCTA}>
                검색 1위 되기
              </CTAButton>
            </Stack>

            {/* Demo-only case studies link */}
            {demoMode && (
              <Stack sx={{ mt: 1.5 }} alignItems="center">
                <Typography
                  component="a"
                  href="#proof"
                  sx={{ color: 'rgba(255,255,255,0.72)', textDecoration: 'underline', fontSize: 14 }}
                >
                  사례 모음 보기
                </Typography>
              </Stack>
            )}

            {/* Demo-only proof badges */}
            {demoMode && (
              <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 3, flexWrap: 'wrap' }}>
                <StatBadge>고객 87% 3개월 내 1페이지</StatBadge>
                <StatBadge>평균 +18위 상승</StatBadge>
                <StatBadge>월 5,000+ 유입</StatBadge>
              </Stack>
            )}
          </InViewFade>
        </HeroContent>
      </HeroRoot>

      {/* Features */}
      <Section id="how" aria-labelledby="features-heading">
        <ContentContainer maxWidth="lg">
          <InViewFade>
            <Typography id="features-heading" variant="h4" sx={{ fontWeight: 800, mb: 6 }}>
              결과로 증명되는 간결한 운영
            </Typography>
          </InViewFade>
          <Grid container spacing={3}>
            {FEATURES.map((f, idx) => (
              <Grid item xs={12} md={6} key={f.title}>
                <InViewFade timeout={600 + idx * 80}>
                  <CardSoft>
                    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {f.title}
                      </Typography>
                      <Typography sx={{ mt: 1.25, color: 'rgba(255,255,255,0.82)' }}>
                        {f.desc}
                      </Typography>
                    </CardContent>
                  </CardSoft>
                </InViewFade>
              </Grid>
            ))}
          </Grid>
        </ContentContainer>
      </Section>

      {/* Testimonials */}
      <Section id="proof" aria-labelledby="testimonials-heading">
        <ContentContainer maxWidth="lg">
          <InViewFade>
            <Typography id="testimonials-heading" variant="h4" sx={{ fontWeight: 800, mb: 4 }}>
              의원님들이 먼저 말합니다
            </Typography>
          </InViewFade>
          <Grid container spacing={3}>
            {TESTIMONIALS.map((t, idx) => (
              <Grid item xs={12} md={4} key={t.name}>
                <InViewFade timeout={600 + idx * 80}>
                  <CardSoft role="figure" aria-label={`${t.name} 후기`}>
                    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                      <Typography component="figcaption" variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                        {t.name}
                      </Typography>
                      <Typography sx={{ color: 'rgba(255,255,255,0.85)' }}>{t.text}</Typography>
                    </CardContent>
                  </CardSoft>
                </InViewFade>
              </Grid>
            ))}
          </Grid>
        </ContentContainer>
      </Section>

      {/* Before / After */}
      <Section aria-labelledby="beforeafter-heading">
        <ContentContainer maxWidth="lg">
          <InViewFade>
            <Typography id="beforeafter-heading" variant="h4" sx={{ fontWeight: 800, mb: 4 }}>
              3개월 전과 지금, 이렇게 달라집니다
            </Typography>
          </InViewFade>

          <Grid container spacing={3} alignItems="stretch">
            <Grid item xs={12} md={6}>
              <InViewFade>
                <CardSoft sx={{ height: '100%' }}>
                  <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Before
                    </Typography>
                    <Typography sx={{ mt: 1.25, color: 'rgba(255,255,255,0.85)' }}>
                      열심히 일해도 검색하면 안 나옴. 주민들은 내가 뭘 하는지 모름.
                    </Typography>
                    <Box
                      component="img"
                      src="/images/search-before.jpg"
                      alt="검색 하위 노출 예시 화면"
                      loading="lazy"
                      decoding="async"
                      style={{ width: '100%', marginTop: 16, borderRadius: 12 }}
                    />
                  </CardContent>
                </CardSoft>
              </InViewFade>
            </Grid>

            <Grid item xs={12} md={6}>
              <InViewFade>
                <CardEmphasis sx={{ height: '100%' }}>
                  <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      After
                    </Typography>
                    <Typography sx={{ mt: 1.25, color: 'rgba(255,255,255,0.9)' }}>
                      지역 현안 검색하면 1페이지. 주민들이 "의원님 글 봤어요" 먼저 연락.
                    </Typography>
                    {demoMode && (
                      <>
                        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.15)' }} />
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                          단 3개월 기준 데모 수치: 평균 +18위, 월 방문 120 → 5,400
                        </Typography>
                      </>
                    )}
                    <Box
                      component="img"
                      src="/images/search-after.jpg"
                      alt="검색 상위 노출 예시 화면"
                      loading="lazy"
                      decoding="async"
                      style={{ width: '100%', marginTop: 16, borderRadius: 12 }}
                    />
                  </CardContent>
                </CardEmphasis>
              </InViewFade>
            </Grid>
          </Grid>
        </ContentContainer>
      </Section>

      {/* FAQ */}
      <Section aria-labelledby="faq-heading">
        <ContentContainer maxWidth="lg">
          <InViewFade>
            <Typography id="faq-heading" variant="h4" sx={{ fontWeight: 800, mb: 4 }}>
              자주 묻는 질문
            </Typography>
          </InViewFade>
          <Stack spacing={2}>
            {FAQS.map((item, i) => (
              <InViewFade key={item.q} timeout={600 + i * 80}>
                <Accordion
                  disableGutters
                  sx={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 2, '&::before': { display: 'none' } }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#00d4ff' }} />}>
                    <Typography sx={{ fontWeight: 600 }}>{item.q}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography sx={{ color: 'rgba(255,255,255,0.85)' }}>{item.a}</Typography>
                  </AccordionDetails>
                </Accordion>
              </InViewFade>
            ))}
          </Stack>
        </ContentContainer>
      </Section>

      {/* Final CTA */}
      <Section aria-labelledby="final-cta-heading" sx={{ backgroundColor: '#001320', borderBottom: 'none' }}>
        <ContentContainer maxWidth="md" sx={{ textAlign: 'center' }}>
          <InViewFade>
            <Typography id="final-cta-heading" variant="h4" sx={{ fontWeight: 900, mb: 2 }}>
              선거 6개월 전 시작? 늦습니다. 지금 시작하세요.
            </Typography>
            <Typography sx={{ mb: 4, color: 'rgba(255,255,255,0.9)' }}>
              검색 순위는 하루아침에 오르지 않습니다. 지금 시작해야 다음 선거 때 효과를 봅니다.
              선거구 독점. 먼저 신청하는 의원님이 갖습니다.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <CTAButton aria-label="지금 선거구 선점하기" onClick={handlePrimaryCTA}>
                지금 선거구 선점하기
              </CTAButton>
            </Stack>
          </InViewFade>
        </ContentContainer>
      </Section>

      {/* Footer */}
      <Box component="footer" sx={{ py: 6, textAlign: 'center', backgroundColor: '#050511' }}>
        <ContentContainer maxWidth="lg">
          <Typography sx={{ color: 'rgba(255,255,255,0.8)', mb: 1.5 }}>
            검색되지 않는 정치인은 존재하지 않는 것과 같습니다.
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, mt: 2, whiteSpace: 'pre-line' }}>
            {`사이버브레인 | 사업자등록번호: 870-55-00786 | 통신판매업신고번호: -
대표: 차서영 | 인천광역시 계양구 용종로 124, 학마을한진아파트 139동 1504호 | 대표번호: 010-4885-6206
Copyright © 2025 CyberBrain. All Rights Reserved.`}
          </Typography>
        </ContentContainer>
      </Box>
    </Page>
  );
};

export default AboutPage;