import jwt from 'jsonwebtoken';

// JWT 비밀키 확인
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET is not set in the .env file.');
}

/**
 * JWT 토큰 검증 미들웨어
 */
export const verifyToken = (req, res, next) => {
  try {
    console.log('=== 인증 디버깅 ===');
    console.log('쿠키:', req.cookies);
    console.log('헤더:', req.headers.authorization);
    console.log('요청 URL:', req.url);
    console.log('요청 메소드:', req.method);
    
    // 토큰 찾기 시도 (여러 위치에서)
    let token = null;
    
    // 1. 쿠키에서 찾기 (여러 이름 시도)
    if (req.cookies && req.cookies.authToken) {
      token = req.cookies.authToken;
      console.log('쿠키에서 authToken 발견:', token.substring(0, 20) + '...');
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('쿠키에서 token 발견:', token.substring(0, 20) + '...');
    }
    
    // 2. Authorization 헤더에서 찾기
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        console.log('Authorization 헤더에서 토큰 발견');
      }
    }
    
    // 3. 커스텀 헤더에서 찾기
    if (!token && req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
      console.log('커스텀 헤더에서 토큰 발견');
    }
    
    if (!token) {
      console.log('❌ 토큰을 찾을 수 없음');
      return res.status(401).json({ 
        error: '인증 토큰이 없습니다.',
        debug: {
          hasCookies: !!req.cookies,
          hasAuthHeader: !!req.headers.authorization,
          cookieNames: req.cookies ? Object.keys(req.cookies) : [],
          userAgent: req.headers['user-agent']
        }
      });
    }
    
    // JWT 검증
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      console.log('✅ 토큰 검증 성공 - 사용자:', decoded.email || decoded.username);
      next();
    } catch (jwtError) {
      console.log('❌ 토큰 검증 실패:', jwtError.message);
      return res.status(401).json({ 
        error: '유효하지 않은 토큰입니다.',
        details: jwtError.message 
      });
    }
    
  } catch (error) {
    console.error('인증 미들웨어 에러:', error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
};

/**
 * 관리자 권한 확인 미들웨어
 * verifyToken 다음에 사용해야 함
 */
export const requireAdmin = (req, res, next) => {
  try {
    console.log('=== 관리자 권한 확인 ===');
    console.log('사용자 정보:', req.user);
    
    // 토큰 검증이 먼저 되어야 함
    if (!req.user) {
      console.log('❌ 사용자 정보가 없음 - verifyToken이 먼저 실행되어야 함');
      return res.status(401).json({ 
        error: '인증이 필요합니다.' 
      });
    }
    
    // 관리자 권한 확인
    if (!req.user.isAdmin && req.user.role !== 'admin') {
      console.log('❌ 관리자 권한 없음 - 사용자 역할:', req.user.role || '없음');
      return res.status(403).json({ 
        error: '관리자 권한이 필요합니다.',
        userRole: req.user.role || '없음'
      });
    }
    
    console.log('✅ 관리자 권한 확인 완료');
    next();
    
  } catch (error) {
    console.error('관리자 권한 확인 에러:', error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
};

/**
 * 선택적 인증 미들웨어 (토큰이 있으면 검증, 없어도 통과)
 */
export const optionalAuth = (req, res, next) => {
  try {
    let token = null;
    
    if (req.cookies && req.cookies.authToken) {
      token = req.cookies.authToken;
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
    }
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        console.log('✅ 선택적 인증 성공:', decoded.email || decoded.username);
      } catch (jwtError) {
        console.log('⚠️ 선택적 인증 실패, 비로그인 상태로 진행:', jwtError.message);
        req.user = null;
      }
    } else {
      console.log('ℹ️ 토큰 없음, 비로그인 상태로 진행');
      req.user = null;
    }
    
    next();
    
  } catch (error) {
    console.error('선택적 인증 에러:', error);
    req.user = null;
    next();
  }
};

/**
 * 사용자 소유권 확인 미들웨어 (자신의 리소스만 접근)
 */
export const requireOwnership = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: '인증이 필요합니다.' });
      }
      
      // URL 파라미터나 요청 본문에서 리소스 소유자 ID 확인
      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
      
      if (!resourceUserId) {
        return res.status(400).json({ error: '리소스 소유자 정보가 없습니다.' });
      }
      
      // 관리자는 모든 리소스 접근 가능
      if (req.user.isAdmin || req.user.role === 'admin') {
        console.log('✅ 관리자 권한으로 리소스 접근 허용');
        next();
        return;
      }
      
      // 자신의 리소스인지 확인
      if (req.user.id !== resourceUserId && req.user.userId !== resourceUserId) {
        console.log('❌ 리소스 소유권 없음 - 요청자:', req.user.id, '리소스 소유자:', resourceUserId);
        return res.status(403).json({ error: '해당 리소스에 접근할 권한이 없습니다.' });
      }
      
      console.log('✅ 리소스 소유권 확인 완료');
      next();
      
    } catch (error) {
      console.error('소유권 확인 에러:', error);
      return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
    }
  };
};

// 기본 export (다른 파일에서 사용할 수 있도록)
export default {
  verifyToken,
  requireAdmin,
  optionalAuth,
  requireOwnership
};