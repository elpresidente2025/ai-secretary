import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  // 1. 색상(Color) 설정 - 원래 깔끔한 디자인
  palette: {
    primary: {
      main: '#013c95',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
  },
  // 2. 브레이크포인트 설정 (가이드 2절)
  breakpoints: {
    values: {
      xs: 360,
      sm: 600,
      md: 900,
      lg: 1280,
      xl: 1680,
    },
  },
  // 3. 타이포그래피 설정 (가이드 4절)
  typography: {
    fontFamily: '"Noto Sans KR", "DM Sans", sans-serif',
    h1: { fontSize: '2.5rem' }, // 기본 폰트 크기 설정
    // ... 다른 폰트 스타일
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
            maxWidth: '1440px', // XL 뷰포트에서 최대 너비 제한 (가이드 2절)
          },
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#f5f5f5',
          color: '#000000',
          borderRadius: '0px',
          border: '1px solid #333',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '0px',
          border: '1px solid #333',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
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