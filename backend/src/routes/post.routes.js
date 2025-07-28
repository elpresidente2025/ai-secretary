// routes/posts.js - AI 원고 생성 라우터 (DB 조회 포함)
import express from 'express';
import { generateManuscript } from '../services/gemini.service.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import pool from '../config/db.js'; // 🔥 DB 연결 추가

const router = express.Router();

// ===== 상수 정의 =====
const VALID_CATEGORIES = ['의정활동', '지역활동', '정책/비전', '보도자료', '일반'];
const VALID_SUB_CATEGORIES = {
  '의정활동': ['국정감사', '법안발의', '질의응답', '위원회활동', '예산심사', '정책토론'],
  '지역활동': ['현장방문', '주민간담회', '지역현안', '봉사활동', '상권점검', '민원해결'],
  '정책/비전': ['경제정책', '사회복지', '교육정책', '환경정책', '디지털정책', '청년정책'],
  '보도자료': ['성명서', '논평', '제안서', '건의문', '발표문', '입장문'],
  '일반': ['일상소통', '감사인사', '축하메시지', '격려글', '교육컨텐츠']
};

// ===== 간단한 레이트 리미팅 (메모리 기반) =====
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15분
const RATE_LIMIT_MAX = 50; // 15분당 최대 50회

const simpleRateLimit = (req, res, next) => {
  const userId = req.user?.id || req.ip;
  const now = Date.now();
  
  if (!requestCounts.has(userId)) {
    requestCounts.set(userId, []);
  }
  
  const userRequests = requestCounts.get(userId);
  const validRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (validRequests.length >= RATE_LIMIT_MAX) {
    return res.status(429).json({
      success: false,
      error: 'TOO_MANY_REQUESTS',
      message: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.',
      retryAfter: Math.ceil((validRequests[0] + RATE_LIMIT_WINDOW - now) / 1000)
    });
  }
  
  validRequests.push(now);
  requestCounts.set(userId, validRequests);
  
  // 메모리 정리 (1% 확률로)
  if (Math.random() < 0.01) {
    for (const [key, value] of requestCounts.entries()) {
      const recent = value.filter(time => now - time < RATE_LIMIT_WINDOW);
      if (recent.length === 0) {
        requestCounts.delete(key);
      } else {
        requestCounts.set(key, recent);
      }
    }
  }
  
  next();
};

// ===== 헬퍼 함수 =====

/**
 * 입력값 검증 함수
 */
const validateInputs = (req, res, next) => {
  const { category, subCategory, prompt, keywords } = req.body;
  const errors = [];
  
  // prompt 검증
  if (!prompt || typeof prompt !== 'string') {
    errors.push('주제는 필수입니다.');
  } else if (prompt.length < 5) {
    errors.push('주제는 최소 5자 이상이어야 합니다.');
  } else if (prompt.length > 500) {
    errors.push('주제는 500자를 초과할 수 없습니다.');
  }
  
  // category 검증
  if (!category || !VALID_CATEGORIES.includes(category)) {
    errors.push(`유효하지 않은 카테고리입니다. 허용된 값: ${VALID_CATEGORIES.join(', ')}`);
  }
  
  // subCategory 검증
  if (subCategory && category) {
    const validSubs = VALID_SUB_CATEGORIES[category] || [];
    if (!validSubs.includes(subCategory)) {
      errors.push(`'${category}' 카테고리에서 유효하지 않은 세부 카테고리입니다.`);
    }
  }
  
  // keywords 검증
  if (keywords && (typeof keywords !== 'string' || keywords.length > 200)) {
    errors.push('키워드는 200자를 초과할 수 없습니다.');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: '입력값이 올바르지 않습니다.',
      details: errors
    });
  }
  
  next();
};

/**
 * 🔥 PostgreSQL 데이터베이스에서 사용자 프로필 정보 조회
 */
const extractUserProfile = async (req) => {
  if (!req.user || !req.user.id) {
    throw new Error('인증된 사용자 정보가 없습니다.');
  }

  console.log('[DEBUG] JWT에서 추출된 사용자 ID:', req.user.id);

  try {
    // 🔥 PostgreSQL에서 사용자 정보 조회
    const userQuery = `
      SELECT 
        id, 
        name, 
        email,
        position,
        region_metro,
        region_local,
        electoral_district
      FROM users 
      WHERE id = $1
    `;
    
    const result = await pool.query(userQuery, [req.user.id]);
    
    if (result.rows.length === 0) {
      throw new Error(`사용자 ID ${req.user.id}를 데이터베이스에서 찾을 수 없습니다.`);
    }
    
    const dbUser = result.rows[0];
    console.log('[SUCCESS] 데이터베이스에서 조회된 사용자 정보:', dbUser);

    // 프로필 정보 구성 (다양한 컬럼명 대응)
    const userProfile = {
      name: dbUser.name || dbUser.username || '이름 없음',
      position: dbUser.position || '정치인',
      regionMetro: dbUser.region_metro || dbUser.regionmetro || dbUser.regionMetro || '',
      regionLocal: dbUser.region_local || dbUser.regionlocal || dbUser.regionLocal || '',
      electoralDistrict: dbUser.electoral_district || dbUser.electoraldistrict || dbUser.electoralDistrict || ''
    };

    console.log('[SUCCESS] 매핑된 사용자 프로필:', userProfile);

    // 필수 정보 검증
    const missingFields = [];
    if (!userProfile.name || userProfile.name === '이름 없음') missingFields.push('이름');
    if (!userProfile.regionMetro) missingFields.push('광역시/도');

    if (missingFields.length > 0) {
      console.warn(`[WARNING] 프로필 정보 부족: ${missingFields.join(', ')}`);
      console.warn('[ACTION] 사용자에게 프로필 완성을 요청해야 함');
      
      // 관대한 처리: 서비스 중단하지 않고 기본값 사용
      if (!userProfile.regionMetro) {
        userProfile.regionMetro = '서울특별시';
        userProfile.regionLocal = '중구';
        console.warn('[FALLBACK] 기본 지역(서울특별시 중구)으로 설정됨');
      }
    }

    return userProfile;

  } catch (error) {
    console.error('[ERROR] 사용자 프로필 조회 실패:', error.message);
    console.error('[ERROR] SQL 쿼리 오류일 수 있음 - 테이블/컬럼명 확인 필요');
    
    // 실패 시 기본값 반환 (서비스 중단 방지)
    const fallbackProfile = {
      name: `사용자_${req.user.id}`,
      position: '정치인',
      regionMetro: '서울특별시',
      regionLocal: '중구',
      electoralDistrict: ''
    };
    
    console.warn('[FALLBACK] 기본 프로필 사용:', fallbackProfile);
    return fallbackProfile;
  }
};

/**
 * 요청 로깅
 */
const logRequest = (req, userProfile, startTime, success = true, error = null) => {
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  const logData = {
    timestamp: new Date().toISOString(),
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    user: {
      id: req.user?.id,
      name: userProfile?.name,
      region: userProfile ? `${userProfile.regionMetro} ${userProfile.regionLocal}`.trim() : 'UNKNOWN'
    },
    request: {
      method: req.method,
      path: req.path,
      category: req.body?.category,
      subCategory: req.body?.subCategory,
      promptLength: req.body?.prompt?.length || 0,
      keywordsLength: req.body?.keywords?.length || 0
    },
    response: {
      success,
      duration,
      error: error?.message || null
    }
  };

  if (success) {
    console.log(`[SUCCESS] ${JSON.stringify(logData)}`);
  } else {
    console.error(`[ERROR] ${JSON.stringify(logData)}`);
  }
};

// ===== 라우트 정의 =====

/**
 * POST /api/posts/generate
 * AI 원고 생성 엔드포인트
 */
router.post('/generate', 
  simpleRateLimit,
  verifyToken,
  validateInputs,
  async (req, res) => { // 🔥 async 추가
    const startTime = Date.now();
    let userProfile = null;
    
    try {
      // 🔥 데이터베이스에서 사용자 프로필 조회
      userProfile = await extractUserProfile(req);
      
      // 요청 데이터 구성
      const { category, subCategory, prompt, keywords } = req.body;
      
      console.log(`[API] 원고 생성 요청 시작 - 사용자: ${userProfile.name} (${userProfile.regionMetro} ${userProfile.regionLocal})`);
      console.log(`[API] 요청 내용: 카테고리=${category}, 주제="${prompt.substring(0, 50)}..."`);
      
      // AI 원고 생성 서비스 호출
      const result = await generateManuscript({
        userProfile,
        category,
        subCategory,
        prompt,
        keywords
      });
      
      // 성공 응답
      const responseData = {
        success: true,
        data: result.drafts,
        metadata: {
          ...result.metadata,
          userInfo: {
            name: userProfile.name,
            position: userProfile.position,
            region: `${userProfile.regionMetro} ${userProfile.regionLocal}`.trim(),
            district: userProfile.electoralDistrict,
            expectedGreeting: `${userProfile.regionMetro} ${userProfile.regionLocal}`.trim() + ' 주민 여러분 안녕하세요'
          },
          request: {
            category,
            subCategory,
            promptLength: prompt.length,
            keywordsCount: keywords ? keywords.split(',').filter(k => k.trim()).length : 0
          }
        }
      };

      // 로깅 및 응답
      logRequest(req, userProfile, startTime, true);
      
      res.json(responseData);
      
    } catch (error) {
      console.error('[API] 원고 생성 오류:', error.message);
      console.error('[API] 오류 스택:', error.stack);
      
      // 에러 로깅
      logRequest(req, userProfile, startTime, false, error);
      
      // 에러 타입별 응답 처리
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let errorMessage = '원고 생성 중 예기치 못한 오류가 발생했습니다.';
      
      if (error.message.includes('프로필 정보가 불완전')) {
        statusCode = 400;
        errorCode = 'INCOMPLETE_PROFILE';
        errorMessage = error.message;
      } else if (error.message.includes('입력 검증 실패')) {
        statusCode = 400;
        errorCode = 'INPUT_VALIDATION_ERROR';
        errorMessage = error.message;
      } else if (error.message.includes('AI 서비스가 일시적으로')) {
        statusCode = 503;
        errorCode = 'SERVICE_UNAVAILABLE';
        errorMessage = 'AI 서비스가 일시적으로 사용 불가능합니다. 잠시 후 다시 시도해주세요.';
      } else if (error.message.includes('API 사용량 한도')) {
        statusCode = 429;
        errorCode = 'QUOTA_EXCEEDED';
        errorMessage = 'API 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.message.includes('인증된 사용자 정보가 없습니다')) {
        statusCode = 401;
        errorCode = 'UNAUTHORIZED';
        errorMessage = '인증이 필요합니다.';
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorCode,
        message: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/posts/test-user-info
 * 사용자 정보 테스트 엔드포인트 (개발용)
 */
router.get('/test-user-info', 
  simpleRateLimit,
  verifyToken,
  async (req, res) => { // 🔥 async 추가
    try {
      const userProfile = await extractUserProfile(req); // 🔥 await 추가
      
      const regionString = `${userProfile.regionMetro} ${userProfile.regionLocal}`.trim();
      const expectedGreeting = regionString + ' 주민 여러분 안녕하세요';
      
      res.json({
        success: true,
        message: 'JWT에서 추출된 사용자 정보',
        data: {
          userProfile,
          computed: {
            regionString,
            districtString: userProfile.electoralDistrict,
            expectedGreeting,
            isProfileComplete: !!(userProfile.name && userProfile.position && 
                                 userProfile.regionMetro && userProfile.regionLocal)
          },
          rawJWTData: req.user // 디버깅용
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'PROFILE_ERROR',
        message: error.message,
        rawJWTData: req.user, // 디버깅을 위해 포함
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/posts/categories
 * 사용 가능한 카테고리 목록 조회
 */
router.get('/categories', 
  simpleRateLimit,
  (req, res) => {
    res.json({
      success: true,
      data: {
        categories: VALID_CATEGORIES,
        subCategories: VALID_SUB_CATEGORIES,
        descriptions: {
          '일반': '일상적인 소통과 인사를 위한 친근한 글',
          '의정활동': '국회 내 공식 활동을 전문적으로 전달하는 글',
          '지역활동': '지역구 주민과의 소통을 위한 따뜻한 글',
          '정책/비전': '정책적 전문성과 비전을 보여주는 깊이 있는 글',
          '보도자료': '언론 배포를 위한 간결하고 명확한 공식 문서'
        }
      },
      timestamp: new Date().toISOString()
    });
  }
);

/**
 * GET /api/posts/health
 * 서비스 상태 확인 엔드포인트
 */
router.get('/health', (req, res) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'posts-api',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      checks: {
        database: 'ok', // 실제 DB 연결 체크 로직 추가 필요
        geminiService: process.env.GEMINI_API_KEY ? 'ok' : 'error',
        authentication: 'ok'
      }
    };
    
    res.json(healthStatus);
    
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 404 핸들러 (정의되지 않은 라우트)
 */
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `경로 '${req.method} ${req.originalUrl}'을 찾을 수 없습니다.`,
    availableEndpoints: [
      'POST /api/posts/generate',
      'GET /api/posts/test-user-info',
      'GET /api/posts/categories',
      'GET /api/posts/health'
    ],
    timestamp: new Date().toISOString()
  });
});

/**
 * 에러 핸들러 (라우터 내 에러 처리)
 */
router.use((error, req, res, next) => {
  console.error('[Posts Router] 예기치 못한 오류:', error);
  
  res.status(500).json({
    success: false,
    error: 'ROUTER_ERROR',
    message: '라우터에서 예기치 못한 오류가 발생했습니다.',
    timestamp: new Date().toISOString()
  });
});

export default router;