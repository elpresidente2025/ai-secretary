import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist', // 기본값 사용
    emptyOutDir: true
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})