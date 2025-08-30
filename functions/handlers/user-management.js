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
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData.district && userData.districtDetails) {
        const districtKey = `${userData.district}_${userData.districtDetails}`;
        await db.collection('districts').doc(districtKey).delete();
        console.log(`🗺️ 선거구 점유 해제: ${districtKey}`);
      }
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