/**
 * functions/handlers/naver-login.js
 * 네이버 로그인 처리를 위한 핸들러
 */

'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { admin, db } = require('../utils/firebaseAdmin');

// 네이버 로그인 처리
const naverLogin = onCall({
  cors: true,
  memory: '256MiB',
  timeoutSeconds: 60
}, async (request) => {
  console.log('🔐 naverLogin 함수 시작');
  
  try {
    // 실제 네이버 OAuth 구현 전까지는 시뮬레이션
    // 실제로는 네이버 OAuth 토큰을 받아서 사용자 정보를 조회해야 함
    
    // 임시로 테스트용 네이버 사용자 시뮬레이션
    const mockNaverUserData = {
      id: 'naver_test_' + Date.now(),
      email: 'naveruser@naver.com',
      name: '홍길동',
      profile_image: 'https://ssl.pstatic.net/static/pwe/address/img_profile.png',
      age: '30-39',
      gender: 'M'
    };
    
    console.log('📋 네이버 사용자 데이터 (시뮬레이션):', mockNaverUserData);
    
    // Firestore에서 해당 이메일로 가입된 사용자 확인
    const userQuery = await db.collection('users')
      .where('email', '==', mockNaverUserData.email)
      .limit(1)
      .get();
    
    if (userQuery.empty) {
      console.log('❌ 가입 정보 없음:', mockNaverUserData.email);
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '가입 정보가 없습니다.',
        naverUserData: mockNaverUserData // 네이버 사용자 정보 포함
      };
    }
    
    // 기존 사용자 정보 반환
    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();
    
    console.log('✅ 네이버 로그인 성공:', userData.name);
    
    return {
      success: true,
      user: {
        uid: userDoc.id,
        email: userData.email,
        displayName: userData.name || userData.displayName,
        photoURL: mockNaverUserData.profile_image,
        ...userData
      }
    };
    
  } catch (error) {
    console.error('❌ naverLogin 오류:', error);
    throw new HttpsError('internal', '네이버 로그인 처리 중 오류가 발생했습니다: ' + error.message);
  }
});

module.exports = {
  naverLogin
};