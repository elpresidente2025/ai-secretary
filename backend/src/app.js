import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import helmet from 'helmet'; // 보안 강화를 위해 helmet 추가

// 🔥 DB 연결 활성화
import './config/db.js'; // DB 연결 실행

// --- 라우터 임포트 ---
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import userRoutes from './routes/user.routes.js'; // 🔥 주석 해제
// 🔥 다른 라우터들은 여전히 주석처리 (필요에 따라 활성화)
// import adminRoutes from './routes/admin.routes.js';
// import postRoutes from './routes/post.routes.js';

const app = express();

// --- 🔥 수정된 CORS 설정 ---
const corsOptions = {
  origin: [
    'http://localhost:3000',                          // React 개발 서버
    'http://localhost:5173',                          // Vite 개발 서버
    'https://ai-secretary-36b03.web.app',            // Firebase Hosting
    'https://ai-secretary-36b03.firebaseapp.com',    // Firebase 백업 도메인
    process.env.CORS_ORIGIN                           // 환경변수로 추가 도메인 허용
  ].filter(Boolean), // undefined 값 제거
  credentials: true, // 쿠키를 포함한 요청을 허용합니다.
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ]
};

// --- 미들웨어 설정 ---
app.use(helmet()); // HTTP 헤더 보안 설정
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// --- 🔥 기본 테스트 라우터 ---
app.get('/', (req, res) => {
  res.json({ 
    message: '🎉 AI비서관 백엔드 서버가 정상 작동 중입니다!',
    timestamp: new Date().toISOString(),
    status: 'healthy',
    version: '1.0.0'
  });
});

app.get('/test', (req, res) => {
  res.json({ 
    message: '✅ 백엔드 서버 정상 작동!',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 8000,
    nodeEnv: process.env.NODE_ENV || 'development',
    dbStatus: 'enabled' // 🔥 DB 활성화 상태로 변경
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    message: '✅ API 라우터 정상!',
    availableRoutes: [
      'GET /',
      'GET /test', 
      'GET /health',
      'GET /api/test',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/verify',
      'GET /api/dashboard/data',
      'PUT /api/user/profile' // 🔥 DB 연결로 정상 작동
    ]
  });
});

// --- API 라우트 연결 ---
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/user', userRoutes); // 🔥 활성화됨
// 🔥 다른 라우터들은 필요에 따라 활성화
// app.use('/api/admin', adminRoutes);
// app.use('/api/posts', postRoutes);

// --- 404 핸들러 ---
app.use((req, res, next) => {
  res.status(404).json({ 
    success: false,
    message: '요청하신 API 경로를 찾을 수 없습니다.',
    path: req.path,
    method: req.method,
    availableRoutes: [
      'GET /',
      'GET /test',
      'GET /health',
      'GET /api/test',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/verify',
      'GET /api/dashboard/data',
      'PUT /api/user/profile'
    ]
  });
});

// --- 중앙 에러 핸들러 ---
app.use((err, req, res, next) => {
  console.error('🚨 서버 에러:', err);
  
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  
  const message = (isProduction && statusCode === 500)
    ? '서버 내부 오류가 발생했습니다.'
    : err.message;

  res.status(statusCode).json({ 
    success: false,
    message,
    timestamp: new Date().toISOString(),
    ...(isProduction ? {} : { 
      stack: err.stack,
      errorDetails: err.toString()
    })
  });
});

// --- 서버 실행 ---
const PORT = process.env.PORT || 8000;

// 🔥 서버 시작 에러 처리
const server = app.listen(PORT, () => {
  console.log(`✅ AI비서관 백엔드 서버가 ${PORT}번 포트에서 실행 중입니다.`);
  console.log(`🌐 서버 URL: http://localhost:${PORT}`);
  console.log(`🧪 테스트 URL: http://localhost:${PORT}/test`);
  console.log(`📊 대시보드 API: http://localhost:${PORT}/api/dashboard/data`);
  console.log(`👤 프로필 API: http://localhost:${PORT}/api/user/profile`);
  console.log(`✅ DB 연결 활성화됨`); // 🔥 DB 활성화 상태 표시
}).on('error', (err) => {
  console.error('🚨 서버 시작 실패:', err);
  process.exit(1);
});

// 🔥 graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 서버 종료 중...');
  server.close(() => {
    console.log('✅ 서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});