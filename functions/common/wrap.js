'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');

// 공통 함수 옵션 - CORS 설정 강화
const functionOptions = {
  cors: true,
  maxInstances: 5,
  timeoutSeconds: 60,
  memory: '512MiB'
};

/**
 * Firebase Functions v2 onCall 래퍼
 * 에러 처리 및 로깅을 공통화
 */
exports.wrap = (handler) => {
  return onCall(functionOptions, async (request) => {
    const startTime = Date.now();
    const { uid } = request.auth || {};
    
    try {
      console.log(`🔥 함수 시작: ${handler.name || 'unknown'}, 사용자: ${uid || 'anonymous'}`);
      
      const result = await handler(request);
      
      const duration = Date.now() - startTime;
      console.log(`✅ 함수 완료: ${handler.name || 'unknown'}, 소요시간: ${duration}ms`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ 함수 오류: ${handler.name || 'unknown'}, 소요시간: ${duration}ms`, error);
      
      // Firebase HttpsError는 그대로 전달
      if (error instanceof HttpsError) {
        throw error;
      }
      
      // 일반 에러는 internal 에러로 변환
      throw new HttpsError('internal', '서버 내부 오류가 발생했습니다.');
    }
  });
};