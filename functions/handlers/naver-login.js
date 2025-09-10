/**
 * functions/handlers/naver-login.js
 * 네이버 로그인 처리 (회원가입 유도 정책 반영)
 */

'use strict';

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { admin, db } = require('../utils/firebaseAdmin');
const fetch = require('node-fetch');

// 네이버 OAuth 설정 (환경변수 필수)
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

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

// 기존 onCall 함수 유지
const naverLogin = onCall({
  region: 'asia-northeast3',
  cors: [
    'https://cyberbrain.kr',
    'https://ai-secretary-6e9c8.web.app',
    'https://ai-secretary-6e9c8.firebaseapp.com'
  ],
  memory: '256MiB',
  timeoutSeconds: 60
}, async (request) => {
  // 기존 onCall 로직은 단순히 유지
  try {
    return { success: false, message: "Use naverLoginHTTP instead" };
  } catch (error) {
    throw new HttpsError('internal', error.message);
  }
});

// 네이버 로그인 처리 (회원가입 유도 정책) - onRequest로 변경하여 CORS 완전 제어
const naverLoginHTTP = onRequest({
  region: 'asia-northeast3',
  cors: [
    'https://cyberbrain.kr',
    'https://ai-secretary-6e9c8.web.app',
    'https://ai-secretary-6e9c8.firebaseapp.com'
  ],
  memory: '256MiB',
  timeoutSeconds: 60
}, async (request, response) => {
  try {
    console.log('➡ naverLogin v2 함수 시작 (onRequest)');
    let stage = 'init';

    // POST 요청 데이터 파싱
    const requestData = request.body?.data || request.body || {};
    const { accessToken, naverUserInfo, code, state } = requestData;
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
        if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
          throw new Error('NAVER 환경변수(NAVER_CLIENT_ID/SECRET) 미설정');
        }
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
      return response.status(200).json({
        result: {
          success: true,
          registrationRequired: true,
          message: '네이버 계정 이메일이 없어 회원가입이 필요합니다.',
          naverUserData: {
            id: naverUserData.id,
            email: null,
            name: naverUserData.name || naverUserData.nickname || '네이버 사용자',
            profile_image: naverUserData.profile_image || null
          }
        }
      });
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
      return response.status(200).json({
        result: {
          success: true,
          registrationRequired: true,
          message: '추가 정보 입력을 위해 회원가입이 필요합니다.',
          naverUserData: {
            id: naverUserData.id,
            email: naverUserData.email,
            name: naverUserData.name || naverUserData.nickname || '네이버 사용자',
            profile_image: naverUserData.profile_image || null
          }
        }
      });
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

    return response.status(200).json({
      result: {
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
      }
    });

  } catch (error) {
    console.error('naverLogin 처리 오류:', error);
    return response.status(500).json({
      error: {
        code: 'internal',
        message: 'NAVER_LOGIN_INTERNAL',
        details: { message: error.message, stack: (error && error.stack) || null }
      }
    });
  }
});

module.exports = {
  naverLogin, // 기존 onCall 함수 유지
  naverLoginHTTP // 새로운 onRequest 함수 추가
};
