/**
 * functions/handlers/profile.js (통합본)
 * 사용자 프로필 관련 HTTP 요청 처리 및 Firestore 트리거를 모두 포함합니다.
 * 선거구 중복 방지 로직과 자동 스타일 분석 기능이 통합되었습니다.
 * [수정] 모든 onCall 함수에 CORS 옵션을 추가하여 통신 오류를 해결합니다.
 */

'use strict';

const { HttpsError } = require('firebase-functions/v2/https');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { wrap } = require('../common/wrap');
const { ok } = require('../common/response');
const { auth } = require('../common/auth');
const { logInfo } = require('../common/log');
const { admin, db } = require('../utils/firebaseAdmin');
const {
  districtKey,
  claimDistrict,
  scrubDuplicateHolders,
  checkDistrictAvailability: checkDistrictAvailabilityService,
} = require('../services/district');
const { analyzeBioForStyle } = require('../services/style-analysis');

// ============================================================================
// HTTP Callable Functions
// ============================================================================

/**
 * 사용자 프로필 조회
 */
exports.getUserProfile = wrap(async (req) => {
  const { uid, token } = auth(req);
  logInfo('getUserProfile 호출', { userId: uid });

  const userDoc = await db.collection('users').doc(uid).get();

  let profile = {
    name: token?.name || '',
    email: token?.email || '',
    position: '',
    regionMetro: '',
    regionLocal: '',
    electoralDistrict: '',
    status: '현역',
    bio: '',
  };

  if (userDoc.exists) profile = { ...profile, ...(userDoc.data() || {}) };

  logInfo('getUserProfile 성공', { userId: uid });
  return ok({ profile });
});

/**
 * 프로필 업데이트 (+ 선거구 유일성 락)
 */
exports.updateProfile = wrap(async (req) => {
  const { uid, token } = auth(req);
  const profileData = req.data;
  if (!profileData || typeof profileData !== 'object') {
    throw new HttpsError('invalid-argument', '올바른 프로필 데이터를 입력해주세요.');
  }

  logInfo('updateProfile 호출', { userId: uid, email: token?.email });

  const allowed = [
    'name', 'position', 'regionMetro', 'regionLocal',
    'electoralDistrict', 'status', 'bio',
  ];
  const sanitized = {};
  for (const k of allowed) if (profileData[k] !== undefined) sanitized[k] = profileData[k];

  const userRef = db.collection('users').doc(uid);
  const currentDoc = await userRef.get();
  const current = currentDoc.data() || {};

  const nextFields = {
    position: sanitized.position ?? current.position,
    regionMetro: sanitized.regionMetro ?? current.regionMetro,
    regionLocal: sanitized.regionLocal ?? current.regionLocal,
    electoralDistrict: sanitized.electoralDistrict ?? current.electoralDistrict,
  };

  const oldKey = current.districtKey || null;
  const newKey = (nextFields.position && nextFields.regionMetro && nextFields.regionLocal && nextFields.electoralDistrict)
    ? districtKey(nextFields)
    : null;

  console.log('🔍 [DEBUG] 선거구 키 생성 결과:', { 
    uid, 
    oldKey, 
    newKey, 
    nextFields,
    willCheckDistrict: !!(newKey && newKey !== oldKey),
    timestamp: new Date().toISOString()
  });

  if (newKey) {
    try {
      console.log('🔒 선거구 점유 시도 중...', { uid, newKey, oldKey });
      await claimDistrict({ uid, newKey, oldKey });
      console.log('🧹 중복 점유자 정리 중...', { uid, newKey });
      await scrubDuplicateHolders({ key: newKey, ownerUid: uid });
      logInfo('선거구 점유 성공', { oldKey, newKey, changed: oldKey !== newKey });
    } catch (e) {
      console.error('❌ [updateProfile][claimDistrict] 실패:', { uid, oldKey, newKey, error: e?.message, code: e?.code });
      throw new HttpsError('failed-precondition', e?.message || '선거구 점유 중 오류');
    }
  } else {
    console.log('ℹ️ 선거구 키 생성 불가', { oldKey, newKey, hasAllFields: !!(nextFields.position && nextFields.regionMetro && nextFields.regionLocal && nextFields.electoralDistrict) });
  }

  const bio = typeof sanitized.bio === 'string' ? sanitized.bio.trim() : '';
  const isActive = !!bio;

  delete sanitized.isAdmin;
  delete sanitized.role;

  await userRef.set(
    {
      ...sanitized,
      email: token?.email || null, // Firebase Auth에서 이메일 가져와서 저장
      bio,
      isActive,
      districtKey: newKey ?? oldKey,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  logInfo('updateProfile 성공', { isActive });
  return ok({ message: '프로필이 성공적으로 업데이트되었습니다.', isActive });
});

/**
 * 가입 전 선거구 중복 확인
 */
exports.checkDistrictAvailability = wrap(async (req) => {
  const { regionMetro, regionLocal, electoralDistrict, position } = req.data || {};
  if (!regionMetro || !regionLocal || !electoralDistrict || !position) {
    throw new HttpsError('invalid-argument', '지역/선거구/직책을 모두 입력해주세요.');
  }
  const newKey = districtKey({ position, regionMetro, regionLocal, electoralDistrict });
  const excludeUid = req.auth?.uid;
  const result = await checkDistrictAvailabilityService({ newKey, excludeUid });
  logInfo('선거구 중복 확인 성공', { newKey, available: result.available });
  return ok(result);
});

/**
 * 회원가입 + 선거구 중복 검사
 */
exports.registerWithDistrictCheck = wrap(async (req) => {
  const { uid, token } = auth(req);
  const { profileData } = req.data || {};
  if (!profileData) throw new HttpsError('invalid-argument', '프로필 데이터가 필요합니다.');

  logInfo('registerWithDistrictCheck 호출', { userId: uid, email: token?.email });

  const { position, regionMetro, regionLocal, electoralDistrict } = profileData;
  if (!position || !regionMetro || !regionLocal || !electoralDistrict) {
    throw new HttpsError('invalid-argument', '직책과 지역 정보를 모두 입력해주세요.');
  }

  const newKey = districtKey({ position, regionMetro, regionLocal, electoralDistrict });
  const availability = await checkDistrictAvailabilityService({ newKey });
  if (!availability.available) {
    throw new HttpsError('already-exists', '해당 선거구는 이미 다른 사용자가 사용 중입니다.');
  }

  await claimDistrict({ uid, newKey, oldKey: null });

  const bio = typeof profileData.bio === 'string' ? profileData.bio.trim() : '';
  const isActive = !!bio;

  const sanitizedProfileData = { ...profileData };
  delete sanitizedProfileData.isAdmin;
  delete sanitizedProfileData.role;

  await db.collection('users').doc(uid).set(
    {
      ...sanitizedProfileData,
      email: token?.email || null, // Firebase Auth에서 이메일 가져오기
      bio,
      isActive,
      districtKey: newKey,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  logInfo('회원가입 성공', { newKey, isActive });
  return ok({ message: '회원가입이 완료되었습니다.', isActive });
});


// ============================================================================
// Firestore Trigger
// ============================================================================

/**
 * @trigger analyzeUserProfileOnUpdate
 * @description 'users' 문서의 'bio' 필드가 업데이트되면 자동으로 스타일 분석을 실행합니다.
 */
exports.analyzeUserProfileOnUpdate = onDocumentUpdated('users/{userId}', async (event) => {
  const newData = event.data.after.data();
  const oldData = event.data.before.data();
  const userId = event.params.userId;

  if (newData.bio && newData.bio !== oldData.bio && newData.bio.length > 50) {
    console.log(`사용자 ${userId}의 자기소개가 변경되어 스타일 분석을 시작합니다.`);
    try {
      const styleProfile = await analyzeBioForStyle(newData.bio);
      if (styleProfile) {
        await event.data.after.ref.update({
          writingStyle: styleProfile,
          styleLastAnalyzed: new Date(),
        });
        console.log(`사용자 ${userId}의 스타일 프로필을 성공적으로 저장했습니다.`);
      }
    } catch (error) {
      console.error(`사용자 ${userId}의 스타일 프로필 분석 및 저장에 실패했습니다:`, error);
    }
  }
  return null;
});
