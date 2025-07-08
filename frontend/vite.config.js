import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 이 부분을 추가해 주세요!
  server: {
    proxy: {
      // '/api'로 시작하는 모든 요청을 백엔드 서버 주소로 보냅니다.
      '/api': 'http://localhost:3001'
    }
  }
})