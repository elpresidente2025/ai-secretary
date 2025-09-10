/**
 * functions/handlers/naver-login.js
 * 네이버 로그인 처리 (회원가입 유도 정책 반영)
 */

'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { admin, db } = require('../utils/firebaseAdmin');
const fetch = require('node-fetch');

// 네이버 OAuth 설정 (환경변수 우선)
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID || '_E0OZLvkgp61fV7MFtND';
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || 'GZStmR1dwa';

// 네이버 사용자 정보 조회
async function getNaverUserInfo(accessToken) {
  try {
    const response = await fetch('https://openapi.naver.com/v1/nid/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`네이버 API 호출 실패: ${response.status}`);
    }

    const data = await response.json();
    if (data.resultcode !== '00') {
      throw new Error(`네이버 사용자 정보 조회 실패: ${data.message}`);
    }

    return data.response;
  } catch (error) {
    console.error('네이버 사용자 정보 조회 오류:', error);
    throw error;
  }
}

// 네이버 로그인 처리 (회원가입 유도 정책)
const naverLogin = onCall({
  region: 'asia-northeast3',
  cors: true,
  memory: '256MiB',
  timeoutSeconds: 60
}, async (request) => {
  try {
    console.log('➡ naverLogin v2 함수 시작');
    let stage = 'init';

    const { accessToken, naverUserInfo, code, state } = request.data || {};
    let naverUserData;

    if (naverUserInfo) {
      stage = 'use_client_userinfo';
      console.log('➡ 네이버 사용자 데이터(직접 전달):', {
        id: naverUserInfo.id,
        email: naverUserInfo.email,
        name: naverUserInfo.name || naverUserInfo.nickname
      });
      naverUserData = naverUserInfo;
    } else if (accessToken) {
      stage = 'fetch_userinfo_with_token';
      console.log('➡ 액세스 토큰으로 사용자 정보 조회');
      naverUserData = await getNaverUserInfo(accessToken);
    } else if (code) {
      // Authorization Code 플로우 지원: code -> access_token 교환
      stage = 'exchange_code_for_token';
      console.log('➡ Authorization Code 플로우: 토큰 교환 시도');
      try {
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('client_id', NAVER_CLIENT_ID);
        params.append('client_secret', NAVER_CLIENT_SECRET);
        params.append('code', code);
        if (state) params.append('state', state);

        const tokenResp = await fetch('https://nid.naver.com/oauth2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });

        if (!tokenResp.ok) {
          const txt = await tokenResp.text();
          throw new Error(`토큰 교환 실패: ${tokenResp.status} ${txt}`);
        }

        const tokenJson = await tokenResp.json();
        if (!tokenJson.access_token) {
          throw new Error('토큰 교환 응답에 access_token 없음');
        }

        console.log('➡ 토큰 교환 성공, 사용자 정보 조회');
        stage = 'fetch_userinfo_after_exchange';
        naverUserData = await getNaverUserInfo(tokenJson.access_token);
      } catch (ex) {
        console.error('네이버 토큰 교환 오류:', ex);
        throw new HttpsError('unauthenticated', '네이버 토큰 교환 실패', { stage, message: ex.message });
      }
    } else {
      throw new HttpsError('invalid-argument', '네이버 사용자 정보 또는 액세스 토큰이 필요합니다.');
    }

    // 이메일 없으면 회원가입 유도
    if (!naverUserData.email) {
      return {
        success: true,
        registrationRequired: true,
        message: '네이버 계정 이메일이 없어 회원가입이 필요합니다.',
        naverUserData: {
          id: naverUserData.id,
          email: null,
          name: naverUserData.name || naverUserData.nickname || '네이버 사용자',
          profile_image: naverUserData.profile_image || null
        }
      };
    }

    // 기존 가입 여부 확인
    stage = 'query_user';
    const userQuery = await db.collection('users')
      .where('email', '==', naverUserData.email)
      .limit(1)
      .get();

    // 미가입: 회원가입 유도(자동 생성 중단)
    if (userQuery.empty) {
      stage = 'registration_required';
      console.log('📝 회원가입 필요(네이버):', naverUserData.email);
      return {
        success: true,
        registrationRequired: true,
        message: '추가 정보 입력을 위해 회원가입이 필요합니다.',
        naverUserData: {
          id: naverUserData.id,
          email: naverUserData.email,
          name: naverUserData.name || naverUserData.nickname || '네이버 사용자',
          profile_image: naverUserData.profile_image || null
        }
      };
    }

    // 기가입: 로그인 처리
    stage = 'prepare_login_existing_user';
    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();

    stage = 'update_last_login';
    await userDoc.ref.update({
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      naverUserId: naverUserData.id
    });

    stage = 'create_custom_token';
    const customToken = await admin.auth().createCustomToken(userDoc.id, {
      email: userData.email,
      name: userData.name,
      provider: 'naver'
    });

    return {
      success: true,
      registrationRequired: false,
      customToken,
      user: {
        uid: userDoc.id,
        email: userData.email,
        displayName: userData.name || userData.displayName,
        photoURL: userData.profileImage || naverUserData.profile_image,
        provider: 'naver'
      }
    };

  } catch (error) {
    console.error('naverLogin 처리 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'NAVER_LOGIN_INTERNAL', { message: error.message, stack: (error && error.stack) || null });
  }
});

module.exports = {
  naverLogin
};
