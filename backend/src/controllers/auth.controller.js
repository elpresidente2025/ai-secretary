// 🔥 DB 관련 import 주석처리 (서버 크래시 방지)
// import pool from '../config/db.js';
// import bcrypt from 'bcryptjs'; // 🔥 사용하지 않으므로 주석처리
// import { createJwtPayload, signAndSetCookie } from '../services/token.service.js';

/**
 * 데이터베이스 사용자 객체를 프론트엔드 응답 형식으로 변환합니다.
 * @param {object} dbUser - 데이터베이스에서 조회한 사용자 객체 (snake_case)
 * @returns {object} 프론트엔드에 전달할 사용자 객체 (camelCase)
 */
const _transformUserForResponse = (dbUser) => {
  if (!dbUser) {
    return null;
  }
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    position: dbUser.position,
    regionMetro: dbUser.region_metro,
    regionLocal: dbUser.region_local,
    electoralDistrict: dbUser.electoral_district,
  };
};

/**
 * @description 사용자 회원가입을 처리하는 컨트롤러 (임시 버전)
 */
export const register = async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;
    
    console.log('📝 회원가입 요청:', { email, fullName });
    
    if (!email || !password || !fullName) {
      return res.status(400).json({ 
        success: false,
        error: '이메일, 비밀번호, 이름을 모두 입력해주세요.' 
      });
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: '올바른 이메일 형식을 입력해주세요.'
      });
    }

    // 비밀번호 길이 검증
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: '비밀번호는 6자 이상이어야 합니다.'
      });
    }

    // 기존 사용자 체크 (임시)
    if (email === 'existing@test.com') {
      return res.status(409).json({
        success: false,
        error: '이미 존재하는 이메일입니다.'
      });
    }

    // 임시 응답 (DB 저장 없이)
    res.status(201).json({ 
      success: true,
      message: '회원가입이 완료되었습니다. (임시 DB 없음)',
      user: {
        id: Date.now(),
        email: email,
        name: fullName,
        role: 'user',
        position: '시의원',
        regionMetro: '서울시',
        regionLocal: '강남구',
        electoralDistrict: '강남구을'
      },
      token: 'temp-register-token-' + Date.now()
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: '회원가입 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

/**
 * @description 사용자 로그인을 처리하는 컨트롤러 (임시 버전)
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 로그인 요청:', { email });
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: '이메일과 비밀번호를 모두 입력해주세요.' 
      });
    }

    // 🔥 모든 이메일 허용 (테스트 모드)
    // 비밀번호만 간단히 체크 (6자 이상)
    if (password.length < 6) {
      return res.status(401).json({ 
        success: false,
        error: '비밀번호는 6자 이상이어야 합니다.',
        hint: '테스트 모드: 아무 이메일이나 사용 가능 (비밀번호 6자 이상)'
      });
    }

    // 🔥 이메일에서 이름 추출 (@ 앞부분)
    const name = email.split('@')[0] || '테스트 사용자';
    
    res.status(200).json({ 
      success: true,
      message: '로그인 성공! (임시 DB 없음)',
      user: {
        id: Date.now(), // 고유 ID
        email: email,
        name: name,
        role: email.includes('admin') ? 'admin' : 'user',
        position: '시의원',
        regionMetro: '서울시',
        regionLocal: '강남구',
        electoralDistrict: '강남구을'
      },
      token: 'temp-jwt-token-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: '로그인 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

/**
 * @description 사용자 로그아웃을 처리하는 컨트롤러
 */
export const logout = (req, res, next) => {
  res.clearCookie('authToken', { path: '/' });
  res.status(200).json({ 
    success: true,
    message: '로그아웃 되었습니다.' 
  });
};

/**
 * @description 토큰 유효성을 검증하는 컨트롤러 (임시 버전)
 */
export const verify = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    console.log('🔍 토큰 검증 요청:', { authHeader: authHeader ? 'Bearer ***' : 'none' });
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'Authorization token required' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    // 임시 토큰 검증
    if (token && token.startsWith('temp-')) {
      return res.status(200).json({
        success: true,
        message: '토큰이 유효합니다. (임시 DB 없음)',
        user: {
          id: 1,
          email: 'test@test.com',
          name: '테스트 사용자',
          role: 'user',
          position: '시의원',
          regionMetro: '서울시',
          regionLocal: '강남구',
          electoralDistrict: '강남구을'
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        error: '유효하지 않은 토큰입니다.'
      });
    }
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({
      success: false,
      error: '토큰 검증 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

/**
 * 🔥 임시 테스트용 회원가입 (DB 없이)
 */
export const registerTest = async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;
    
    console.log('📝 회원가입 요청:', { email, fullName });
    
    if (!email || !password || !fullName) {
      return res.status(400).json({ 
        success: false,
        error: '이메일, 비밀번호, 이름을 모두 입력해주세요.' 
      });
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: '올바른 이메일 형식을 입력해주세요.'
      });
    }

    // 비밀번호 길이 검증
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: '비밀번호는 6자 이상이어야 합니다.'
      });
    }

    // 기존 사용자 체크 (임시)
    if (email === 'existing@test.com') {
      return res.status(409).json({
        success: false,
        error: '이미 존재하는 이메일입니다.'
      });
    }

    // 임시 응답 (DB 저장 없이)
    res.status(201).json({ 
      success: true,
      message: '회원가입이 완료되었습니다. (임시 DB 없음)',
      user: {
        id: Date.now(),
        email: email,
        name: fullName,
        role: 'user',
        position: null,
        regionMetro: null,
        regionLocal: null,
        electoralDistrict: null
      },
      token: 'temp-register-token-' + Date.now()
    });
  } catch (error) {
    console.error('Register test error:', error);
    res.status(500).json({
      success: false,
      error: '회원가입 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

/**
 * 🔥 임시 테스트용 로그인 (DB 없이)
 */
export const loginTest = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 로그인 요청:', { email });
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: '이메일과 비밀번호를 모두 입력해주세요.' 
      });
    }

    // 임시 로그인 계정들
    const testAccounts = [
      { email: 'test@test.com', password: 'test123', name: '테스트 사용자' },
      { email: 'admin@test.com', password: 'admin123', name: '관리자' },
      { email: 'user@test.com', password: 'user123', name: '일반 사용자' }
    ];

    const account = testAccounts.find(acc => acc.email === email && acc.password === password);

    if (account) {
      res.status(200).json({ 
        success: true,
        message: '로그인 성공! (임시 DB 없음)',
        user: {
          id: 1,
          email: account.email,
          name: account.name,
          role: email.includes('admin') ? 'admin' : 'user',
          position: '시의원',
          regionMetro: '서울시',
          regionLocal: '강남구',
          electoralDistrict: '강남구을'
        },
        token: 'temp-jwt-token-' + Date.now()
      });
    } else {
      res.status(401).json({ 
        success: false,
        error: '이메일 또는 비밀번호가 올바르지 않습니다.',
        hint: '테스트 계정: test@test.com / test123'
      });
    }
  } catch (error) {
    console.error('Login test error:', error);
    res.status(500).json({
      success: false,
      error: '로그인 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

/**
 * 🔥 임시 테스트용 토큰 검증 (DB 없이)
 */
export const verifyTest = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    console.log('🔍 토큰 검증 요청:', { authHeader: authHeader ? 'Bearer ***' : 'none' });
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'Authorization token required' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    // 임시 토큰 검증
    if (token.startsWith('temp-')) {
      return res.status(200).json({
        success: true,
        message: '토큰이 유효합니다. (임시 DB 없음)',
        user: {
          id: 1,
          email: 'test@test.com',
          name: '테스트 사용자',
          role: 'user',
          position: '시의원',
          regionMetro: '서울시',
          regionLocal: '강남구',
          electoralDistrict: '강남구을'
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        error: '유효하지 않은 토큰입니다.'
      });
    }
  } catch (error) {
    console.error('Verify test error:', error);
    res.status(500).json({
      success: false,
      error: '토큰 검증 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};