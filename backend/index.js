require('dotenv').config(); // .env 파일을 읽어옴. 반드시 최상단에 위치!
const express = require('express');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = 3001;
const SECRET_KEY = 'my-secret-key'; // JWT 비밀키

// 미들웨어 설정
app.use(express.json());
app.use(cookieParser());

// Gemini 클라이언트 설정
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest"});

// --- 사용자 인증 미들웨어 ---
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: '인증 토큰이 없습니다.' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    res.clearCookie('token');
    return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
  }
};

// 데이터베이스 연결 설정
const dbConnectionString = 'postgresql://neondb_owner:npg_CTurSK7wc4lX@ep-royal-grass-a1v3rdtw-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({
  connectionString: dbConnectionString,
});

// --- API 엔드포인트들 ---

// 회원가입
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: '이메일과 비밀번호를 모두 입력해주세요.' });
  }
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUser = await pool.query("INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email", [email, passwordHash]);
    res.status(201).json({ message: '회원가입 성공!', user: newUser.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });
    }
    console.error(err);
    res.status(500).json({ message: '서버 내부 오류가 발생했습니다.' });
  }
});

// 로그인
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: '이메일과 비밀번호를 모두 입력해주세요.' });
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: '존재하지 않는 사용자입니다.' });
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
    }
    const token = jwt.sign({ userId: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, secure: false, maxAge: 3600000 });
    res.status(200).json({ message: '로그인 성공!', userId: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 내부 오류가 발생했습니다.' });
  }
});

// 로그아웃
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: '로그아웃 성공!' });
});

// 인증 확인 API
app.get('/api/check-auth', verifyToken, (req, res) => {
  res.status(200).json({ isAuthenticated: true, user: req.user });
});

// AI 원고 생성 API (Gemini 적용)
app.post('/api/generate-post', verifyToken, async (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ message: '주제를 입력해주세요.' });
  }

  try {
    const prompt = `당신은 대한민국 더불어민주당 소속 지방의원을 위한 블로그 원고를 작성하는 전문 AI 비서관입니다. 의정활동, 지역 현안, 공약 등을 주제로 전문적이고 신뢰감 있는 어조로 글을 작성해주세요. 다음 주제에 대한 블로그 원고를 작성해 주세요: ${topic}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const postContent = response.text();
    
    res.status(200).json({ content: postContent });

  } catch (error) {
    console.error('AI 원고 생성 중 에러:', error);
    res.status(500).json({ message: 'AI 원고 생성에 실패했습니다.' });
  }
});

app.listen(port, () => {
  console.log(`🚀 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});