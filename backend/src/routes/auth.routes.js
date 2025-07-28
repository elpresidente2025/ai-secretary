import express from 'express';
const router = express.Router();
import { 
  register, 
  login, 
  logout, 
  verify,
  registerTest,
  loginTest,
  verifyTest
} from '../controllers/auth.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

// 🔥 기존 라우터 (DB 사용)
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/verify', verifyToken, verify);

// 🔥 임시 테스트 라우터 (DB 없이)
router.post('/register-test', registerTest);
router.post('/login-test', loginTest);
router.get('/verify-test', verifyTest);

// 🔥 중요: default export 반드시 필요
export default router;