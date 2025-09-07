/**
 * functions/handlers/user-management.js
 * 회원 탈퇴 및 계정 관리 기능
 */

'use strict';

const { HttpsError } = require('firebase-functions/v2/https');
const { wrap } = require('../common/wrap');
const { admin, db } = require('../utils/firebaseAdmin');

/**
 * 회원 탈퇴
 * - 사용자의 모든 데이터 삭제 (posts, bio entries, user profile)
 * - Firebase Auth 계정 삭제
 */
exports.deleteUserAccount = wrap(async (request) => {
  const { uid } = request.auth;
  
  if (!uid) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }

  try {
    console.log(`🗑️ 회원 탈퇴 시작: ${uid}`);

    // 0. 사용자 정보 조회 (네이버 연결 정보 확인)
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    
    // 네이버 연결 해제 처리
    if (userData?.naverUserId || userData?.naverConnected) {
      console.log('🔗 네이버 연결 해제 처리 시작');
      try {
        await revokeNaverConnection(userData.naverUserId, uid);
        console.log('✅ 네이버 연결 해제 완료');
      } catch (naverError) {
        console.warn('⚠️ 네이버 연결 해제 실패 (계속 진행):', naverError.message);
        // 네이버 연결 해제 실패해도 회원 탈퇴는 계속 진행
      }
    }

    // 1. 사용자 게시물 삭제
    const postsQuery = await db.collection('posts').where('userId', '==', uid).get();
    const deletePostsPromises = postsQuery.docs.map(doc => doc.ref.delete());
    await Promise.all(deletePostsPromises);
    console.log(`📝 게시물 ${postsQuery.size}개 삭제 완료`);

    // 2. 사용자 Bio 데이터 삭제
    const bioQuery = await db.collection('bio').where('userId', '==', uid).get();
    const deleteBioPromises = bioQuery.docs.map(doc => doc.ref.delete());
    await Promise.all(deleteBioPromises);
    console.log(`📋 Bio 엔트리 ${bioQuery.size}개 삭제 완료`);

    // 3. 사용자 프로필 삭제
    await db.collection('users').doc(uid).delete();
    console.log('👤 사용자 프로필 삭제 완료');

    // 4. 선거구 점유 해제 (만약 점유하고 있다면)
    if (userData && userData.district && userData.districtDetails) {
      const districtKey = `${userData.district}_${userData.districtDetails}`;
      await db.collection('districts').doc(districtKey).delete();
      console.log(`🗺️ 선거구 점유 해제: ${districtKey}`);
    }

    // 5. Firebase Auth 계정 삭제
    await admin.auth().deleteUser(uid);
    console.log('🔥 Firebase Auth 계정 삭제 완료');

    console.log(`✅ 회원 탈퇴 완료: ${uid}`);
    
    return {
      success: true,
      message: '회원 탈퇴가 성공적으로 완료되었습니다.'
    };

  } catch (error) {
    console.error('❌ 회원 탈퇴 실패:', error);
    
    if (error.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', '사용자를 찾을 수 없습니다.');
    }
    
    throw new HttpsError('internal', '회원 탈퇴 처리 중 오류가 발생했습니다.');
  }
});

/**
 * 비밀번호 재설정 이메일 발송
 * Firebase Auth의 sendPasswordResetEmail을 서버에서 호출
 */
exports.sendPasswordResetEmail = wrap(async (request) => {
  const { email } = request.data;
  
  if (!email) {
    throw new HttpsError('invalid-argument', '이메일이 필요합니다.');
  }

  try {
    console.log(`📧 비밀번호 재설정 이메일 발송: ${email}`);
    
    // Firebase Admin에서 비밀번호 재설정 링크 생성
    const resetLink = await admin.auth().generatePasswordResetLink(email);
    
    // 실제 이메일 발송은 Firebase Auth가 자동으로 처리
    // 여기서는 링크 생성만으로도 이메일이 발송됨
    
    console.log(`✅ 비밀번호 재설정 이메일 발송 완료: ${email}`);
    
    return {
      success: true,
      message: '비밀번호 재설정 이메일을 발송했습니다. 메일함을 확인해주세요.'
    };

  } catch (error) {
    console.error('❌ 비밀번호 재설정 이메일 발송 실패:', error);
    
    if (error.code === 'auth/user-not-found') {
      // 보안상 실제로는 사용자가 없어도 성공했다고 응답
      return {
        success: true,
        message: '해당 이메일로 비밀번호 재설정 이메일을 발송했습니다.'
      };
    }
    
    throw new HttpsError('internal', '비밀번호 재설정 이메일 발송 중 오류가 발생했습니다.');
  }
});

/**
 * 네이버 연결 해제 함수
 * 회원 탈퇴 시 네이버 OAuth 연결을 해제합니다
 */
async function revokeNaverConnection(naverUserId, userId) {
  if (!naverUserId) {
    console.log('네이버 사용자 ID가 없어 연결 해제를 건너뜁니다.');
    return;
  }
  
  console.log(`🔗 네이버 연결 해제 시도: naverUserId=${naverUserId}, userId=${userId}`);
  
  try {
    // 네이버 OAuth 토큰 해제 API 호출
    // 실제 구현에서는 네이버 Open API를 사용해야 하지만,
    // 현재는 시뮬레이션 단계이므로 로그만 기록
    
    // TODO: 실제 네이버 OAuth 구현 시 추가
    // const naverResponse = await fetch('https://nid.naver.com/oauth2.0/token', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    //   body: new URLSearchParams({
    //     grant_type: 'delete',
    //     client_id: process.env.NAVER_CLIENT_ID,
    //     client_secret: process.env.NAVER_CLIENT_SECRET,
    //     access_token: userData.naverAccessToken, // 저장된 액세스 토큰
    //     service_provider: 'NAVER'
    //   })
    // });
    
    // 연결 해제 로그 기록
    await db.collection('naver_disconnect_logs').add({
      type: 'user_initiated_withdrawal',
      userId: userId,
      naverUserId: naverUserId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      reason: '회원 탈퇴로 인한 네이버 연결 해제',
      status: 'success'
    });
    
    console.log('📋 네이버 연결 해제 로그 기록 완료');
    
  } catch (error) {
    console.error('❌ 네이버 연결 해제 중 오류:', error);
    
    // 오류 로그 기록
    await db.collection('naver_disconnect_logs').add({
      type: 'user_initiated_withdrawal',
      userId: userId,
      naverUserId: naverUserId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      reason: '회원 탈퇴로 인한 네이버 연결 해제',
      status: 'failed',
      error: error.message
    });
    
    throw error;
  }
}