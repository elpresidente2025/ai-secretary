import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  // 1. 브레이크포인트 설정 (가이드 2절)
  breakpoints: {
    values: {
      xs: 360,
      sm: 600,
      md: 900,
      lg: 1280,
      xl: 1680,
    },
  },
  // 2. 타이포그래피 설정 (가이드 4절)
  typography: {
    fontFamily: '"Noto Sans KR", "DM Sans", sans-serif',
    h1: { fontSize: '2.5rem' }, // 기본 폰트 크기 설정
    // ... 다른 폰트 스타일
  },
  // 3. 간격(Spacing) 설정 (가이드 4절)
  spacing: 4, // Spacing Base를 4px로 설정 (theme.spacing(2) === 8px)
  // 4. 컴포넌트 기본 스타일 오버라이드
  components: {
    MuiContainer: {
      styleOverrides: {
        root: ({ theme }) => ({
          [theme.breakpoints.up('xl')]: {
            maxWidth: '1440px', // XL 뷰포트에서 최대 너비 제한 (가이드 2절)
          },
        }),
      },
    },
  },
});

export default theme;