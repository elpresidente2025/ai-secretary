import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // 🔧 코드 스플릿 최적화
  build: {
    // 청크 크기 경고 임계값 조정 (현재 프로젝트에 맞게)
    chunkSizeWarningLimit: 1000,
    
    rollupOptions: {
      output: {
        // 🎯 핵심: 라이브러리별 청크 분리
        manualChunks: {
          // React 관련 라이브러리 분리
          'react-vendor': [
            'react', 
            'react-dom', 
            'react-router-dom'
          ],
          
          // Material-UI 라이브러리 분리 (가장 큰 용량)
          'mui-vendor': [
            '@mui/material',
            '@mui/icons-material', 
            '@emotion/react',
            '@emotion/styled'
          ],
          
          // Firebase 라이브러리 분리
          'firebase-vendor': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/functions'
          ],
          
          // 관리자 전용 기능 분리 (선택적 로딩)
          'admin-chunk': [
            // AdminPage 관련 컴포넌트들이 여기 포함됨
          ]
        },
        
        // 파일명 패턴 최적화
        chunkFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'mui-vendor') {
            return 'assets/mui-[hash].js';
          }
          if (chunkInfo.name === 'firebase-vendor') {
            return 'assets/firebase-[hash].js';
          }
          return 'assets/[name]-[hash].js';
        }
      }
    },
    
    // 🔧 추가 최적화 옵션 (terser 제거)
    minify: true, // 기본 esbuild minify 사용 (더 빠름)
  },
  
  // 개발 서버 최적화
  server: {
    fs: {
      strict: false
    }
  }
})