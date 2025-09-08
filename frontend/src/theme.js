import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  // 1. 색상(Color) 설정 - 원래 깔끔한 디자인
  palette: {
    primary: {
      main: '#013c95',
    },
    background: {
      default: '#ffffff',
      paper: '#f5f5f5',
    },
    text: {
      primary: '#000000',
      secondary: 'rgba(0, 0, 0, 0.7)',
    },
  },
  // 2. 브레이크포인트 설정 (가이드 2절)
  breakpoints: {
    values: {
      xs: 360,    // 모바일 세로
      sm: 600,    // 모바일 가로 / 태블릿 세로
      md: 900,    // 태블릿 가로
      lg: 1280,   // 데스크탑 작은 화면
      xl: 1680,   // 데스크탑 큰 화면
      xxl: 2560,  // QHD 2K 화면 (2560px)
      xxxl: 3840, // 4K UHD 화면 (3840px)
    },
  },
  // 3. 타이포그래피 설정 (가이드 4절)
  typography: {
    fontFamily: '"Noto Sans KR", "DM Sans", sans-serif',
    h1: { 
      fontSize: '2.5rem', // 기본 폰트 크기 설정
      '@media (min-width: 2560px)': {
        fontSize: '3rem', // 2K에서 더 큰 폰트
      },
      '@media (min-width: 3840px)': {
        fontSize: '3.5rem', // 4K에서 더 큰 폰트
      },
    },
    h2: {
      '@media (min-width: 2560px)': {
        fontSize: '2.5rem',
      },
      '@media (min-width: 3840px)': {
        fontSize: '3rem',
      },
    },
    h3: {
      '@media (min-width: 2560px)': {
        fontSize: '2rem',
      },
      '@media (min-width: 3840px)': {
        fontSize: '2.25rem',
      },
    },
    body1: {
      '@media (min-width: 2560px)': {
        fontSize: '1.125rem', // 2K에서 더 큰 본문 텍스트
      },
      '@media (min-width: 3840px)': {
        fontSize: '1.25rem', // 4K에서 더 큰 본문 텍스트
      },
    },
    body2: {
      '@media (min-width: 2560px)': {
        fontSize: '1rem',
      },
      '@media (min-width: 3840px)': {
        fontSize: '1.125rem',
      },
    },
    // 사이버펑크 터미널 폰트
    mono: {
      fontFamily: '"Courier New", "SF Mono", "Monaco", monospace',
    }
  },
  // 4. 간격(Spacing) 설정 (가이드 4절)
  spacing: 4, // Spacing Base를 4px로 설정 (theme.spacing(2) === 8px)
  // 5. 컴포넌트 기본 스타일 오버라이드
  components: {
    MuiContainer: {
      styleOverrides: {
        root: ({ theme }) => ({
          [theme.breakpoints.up('xl')]: {
            maxWidth: '1440px', // XL 뷰포트에서 최대 너비 제한
          },
          [theme.breakpoints.up('xxl')]: {
            maxWidth: '1920px', // 2K 화면에서 최대 너비
          },
          [theme.breakpoints.up('xxxl')]: {
            maxWidth: '2560px', // 4K 화면에서 최대 너비
          },
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          // 리퀴드 글래스 효과
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          color: '#000000',
          borderRadius: '6px',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          // 리퀴드 글래스 효과
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          color: '#000000',
          borderRadius: '6px',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          // Paper 내부의 Typography는 검은색
          '.MuiPaper-root &': {
            color: '#000000',
          },
          // Alert 내부의 Typography는 검은색
          '.MuiAlert-root &': {
            color: '#000000',
          },
        }),
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: '#f8c023',
          filter: 'drop-shadow(0 0 6px #f8c023)',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-input': {
            color: '#000000',
          },
          '& .MuiSelect-select': {
            color: '#000000',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-input': {
            color: '#000000',
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: '#000000',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#000000 !important',
          '&.Mui-focused': {
            color: '#000000 !important',
          },
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            color: '#000000',
          },
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#000000',
            },
            '&:hover fieldset': {
              borderColor: '#000000',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#000000',
            },
          },
        },
      },
    },
  },
});

export default theme;
