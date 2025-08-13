'use strict';

const { HttpsError } = require('firebase-functions/v2/https');

/**
 * 인증 정보 추출
 */
exports.auth = (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }
  
  return {
    uid: request.auth.uid,
    token: request.auth.token || {}
  };
};