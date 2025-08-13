'use strict';

const { HttpsError } = require('firebase-functions/v2/https');
const { wrap } = require('../common/wrap');
const { ok } = require('../common/response');
const { auth } = require('../common/auth');
const { log } = require('../common/log');
const { admin, db } = require('../utils/firebaseAdmin');
const {
  districtKey,
  claimDistrict,
  scrubDuplicateHolders,
  checkDistrictAvailability: checkDistrictAvailabilityService,
} = require('../services/district');

/**
 * 사용자 프로필 조회
 */
exports.getUserProfile = wrap(async (req) => {
  const { uid, token } = auth(req);
  log('PROFILE', 'getUserProfile 호출', { userId: uid });

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

  log('PROFILE', '성공');
  return ok({ profile });
});

/**
 * 프로필 업데이트 (+ 선거구 유일성 락, fail-closed)
 */
exports.updateProfile = wrap(async (req) => {
  const { uid } = auth(req);
  const profileData = req.data;
  if (!profileData || typeof profileData !== 'object') {
    throw new HttpsError('invalid-argument', '올바른 프로필 데이터를 입력해주세요.');
  }

  log('PROFILE', 'updateProfile 호출', { userId: uid });

  const allowed = [
    'name',
    'position',
    'regionMetro',
    'regionLocal',
    'electoralDistrict',
    'status',
    'bio',
  ];
  const sanitized = {};
  for (const k of allowed) if (profileData[k] !== undefined) sanitized[k] = profileData[k];

  const userRef = db.collection('users').doc(uid);

  // 현재 값 읽기
  const currentDoc = await userRef.get();
  const current = currentDoc.data() || {};

  const nowFields = {
    position: current.position,
    regionMetro: current.regionMetro,
    regionLocal: current.regionLocal,
    electoralDistrict: current.electoralDistrict,
  };
  const nextFields = {
    position: sanitized.position ?? current.position,
    regionMetro: sanitized.regionMetro ?? current.regionMetro,
    regionLocal: sanitized.regionLocal ?? current.regionLocal,
    electoralDistrict: sanitized.electoralDistrict ?? current.electoralDistrict,
  };

  const haveNext =
    nextFields.position &&
    nextFields.regionMetro &&
    nextFields.regionLocal &&
    nextFields.electoralDistrict;

  const haveNow =
    nowFields.position &&
    nowFields.regionMetro &&
    nowFields.regionLocal &&
    nowFields.electoralDistrict;

  const recomputedOldKey = haveNow ? districtKey(nowFields) : null;
  const storedOldKey = current.districtKey || null;
  const oldKey = recomputedOldKey || storedOldKey;
  const newKey = haveNext ? districtKey(nextFields) : null;

  const bio = typeof sanitized.bio === 'string' ? sanitized.bio.trim() : sanitized.bio || '';
  const isActive = !!bio;

  // 선거구 변경 시에만 클레임 처리
  if (haveNext && newKey && newKey !== oldKey) {
    try {
      await claimDistrict({ uid, newKey, oldKey });
      await scrubDuplicateHolders({ key: newKey, ownerUid: uid });

      // 과거에 저장된 districtKey가 불일치할 때 추가 정리
      if (storedOldKey && storedOldKey !== oldKey && storedOldKey !== newKey) {
        try {
          const extraRef = db.collection('district_claims').doc(storedOldKey);
          await db.runTransaction(async (tx) => {
            const s = await tx.get(extraRef);
            if (s.exists && s.get('userId') === uid) {
              tx.delete(extraRef);
            }
          });
        } catch (cleanupError) {
          console.warn('[updateProfile] 추가 정리 실패(무시):', cleanupError.message);
        }
      }

      log('PROFILE', '선거구 변경 성공', { oldKey, newKey });
    } catch (e) {
      console.error('[updateProfile][claimDistrict]', {
        uid,
        oldKey,
        newKey,
        msg: e?.message,
        code: e?.code,
      });
      if (e && e.code && typeof e.code === 'string') throw e;
      throw new HttpsError('failed-precondition', String(e?.message || '선거구 점유 중 오류'));
    }
  }

  // 민감 필드 보호: 클라이언트에서 보내더라도 무시
  delete sanitized.isAdmin;
  delete sanitized.role;

  await userRef.set(
    {
      ...sanitized,
      bio,
      isActive,
      districtKey: newKey ?? storedOldKey ?? null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true } // 🔒 덮어쓰기 방지 (권한 필드 보존)
  );

  log('PROFILE', 'updateProfile 성공', { isActive });
  return ok({ message: '프로필이 성공적으로 업데이트되었습니다.', isActive });
});

/**
 * 가입 전 중복 확인 (advisory)
 */
exports.checkDistrictAvailability = wrap(async (req) => {
  const { regionMetro, regionLocal, electoralDistrict, position } = req.data || {};
  if (!regionMetro || !regionLocal || !electoralDistrict || !position) {
    throw new HttpsError('invalid-argument', '지역/선거구/직책을 모두 입력해주세요.');
  }

  const newKey = districtKey({ position, regionMetro, regionLocal, electoralDistrict });
  const excludeUid = req.auth?.uid; // 로그인 사용자는 본인 점유 예외

  const result = await checkDistrictAvailabilityService({ newKey, excludeUid });
  log('DISTRICT_CHECK', '성공', { newKey, available: result.available });
  return ok(result);
});

/**
 * 회원가입 + 선거구 중복 검사
 * - merge: true 로 기존 문서 덮어쓰기 방지
 * - isAdmin/role 필드는 서버에서 강제 제거
 */
exports.registerWithDistrictCheck = wrap(async (req) => {
  const { uid } = auth(req);
  const { profileData } = req.data || {};
  if (!profileData) throw new HttpsError('invalid-argument', '프로필 데이터가 필요합니다.');

  log('REGISTER', 'registerWithDistrictCheck 호출', { userId: uid });

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

  // 🔒 민감 필드 제거(사용자가 보내더라도 무시)
  const sanitizedProfileData = { ...profileData };
  delete sanitizedProfileData.isAdmin;
  delete sanitizedProfileData.role;

  await db
    .collection('users')
    .doc(uid)
    .set(
      {
        ...sanitizedProfileData,
        bio,
        isActive,
        districtKey: newKey,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true } // 🔒 기존 권한 필드 보존
    );

  log('REGISTER', '성공', { newKey, isActive });
  return ok({ message: '회원가입이 완료되었습니다.', isActive });
});
