/**
 * functions/index.js (통합 최종본)
 * AI비서관의 모든 클라우드 함수를 포함하는 단일 엔드포인트입니다.
 * 모든 기능을 이 파일에서 관리하여 배포 오류를 최소화합니다.
 * (Firebase Functions v2 SDK, CORS, asia-northeast3 지역 설정 적용)
 */

'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

const { buildSmartPrompt } = require('./templates/prompts');
const { callGenerativeModel } = require('./services/gemini');
const { analyzeBioForStyle } = require('./services/style-analysis');
const { districtKey, claimDistrict, checkDistrictAvailability: checkDistrictAvailabilityService } = require('./services/district');

// ============================================================================
// 전역 설정 (Global Settings)
// ============================================================================

// 모든 함수에 공통적으로 적용될 기본 설정을 지정합니다.
setGlobalOptions({ region: 'asia-northeast3' });

// Firebase 앱 초기화 (중복 방지)
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// ============================================================================
// 1. 게시물 관련 함수 (Post Handlers)
// ============================================================================

/**
 * AI 모델을 사용하여 게시물 초안을 생성합니다.
 */
exports.generatePost = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', '인증이 필요합니다.');

  const { options, authorBio } = request.data;
  if (!options || !authorBio) throw new HttpsError('invalid-argument', 'options와 authorBio는 필수입니다.');

  let rawResult = ''; // 에러 로깅을 위해 try 블록 외부에서 선언
  try {
    const fullOptions = {
      ...options,
      authorName: authorBio.name || '정치인',
      authorPosition: authorBio.position || '의원',
      authorBio: JSON.stringify(authorBio, null, 2),
      applyEditorialRules: true,
    };

    const prompt = await buildSmartPrompt(fullOptions);
    rawResult = await callGenerativeModel(prompt);
    
    let result;
    try {
      const cleanText = rawResult.replace(/```json|```/g, '').trim();
      result = JSON.parse(cleanText);
      if (typeof result.title !== 'string' || typeof result.content !== 'string') {
        throw new Error('파싱된 객체에 title 또는 content가 없습니다.');
      }
    } catch (e) {
      console.error('Gemini 결과 파싱 실패:', { rawText: rawResult, error: e.message });
      result = {
        title: '제목 파싱 실패',
        content: `<p>AI 모델의 응답을 처리하는 중 오류가 발생했습니다.</p><pre>${rawResult}</pre>`,
      };
    }

    const postRef = await db.collection('users').doc(request.auth.uid).collection('posts').add({
      ...result,
      prompt,
      options: fullOptions,
      status: 'draft',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, postId: postRef.id, ...result };
  } catch(e) {
      console.error('generatePost 함수 오류:', { error: e.message, rawResult });
      throw new HttpsError('internal', '게시물 생성 중 오류가 발생했습니다.');
  }
});

/**
 * 특정 사용자의 게시물 목록을 조회합니다.
 */
exports.getUserPosts = onCall({ cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', '인증이 필요합니다.');
    const { uid } = request.auth;

    const postsSnapshot = await db.collection('users').doc(uid).collection('posts')
        .orderBy('createdAt', 'desc')
        .get();
    
    const posts = postsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.().toISOString(),
            updatedAt: data.updatedAt?.toDate?.().toISOString(),
        };
    });

    return { success: true, posts };
});


// ============================================================================
// 2. 사용자 프로필 관련 함수 (Profile Handlers)
// ============================================================================

/**
 * 사용자 프로필을 조회합니다.
 */
exports.getUserProfile = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', '인증이 필요합니다.');
  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  if (!userDoc.exists) {
    return { success: true, profile: null, isNewUser: true };
  }
  return { success: true, profile: userDoc.data() };
});

/**
 * 사용자 프로필을 업데이트합니다.
 */
exports.updateProfile = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', '인증이 필요합니다.');
  const { uid } = request.auth;
  const profileData = request.data;
  if (!profileData || typeof profileData !== 'object') {
    throw new HttpsError('invalid-argument', '올바른 프로필 데이터를 입력해주세요.');
  }

  const allowed = ['name', 'position', 'regionMetro', 'regionLocal', 'electoralDistrict', 'status', 'bio'];
  const sanitized = {};
  allowed.forEach(key => {
    if (profileData[key] !== undefined) sanitized[key] = profileData[key];
  });

  await db.collection('users').doc(uid).set({
    ...sanitized,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return { success: true, message: '프로필이 성공적으로 업데이트되었습니다.' };
});

/**
 * 선거구 중복 여부를 확인합니다.
 */
exports.checkDistrictAvailability = onCall({ cors: true }, async (request) => {
    const { regionMetro, regionLocal, electoralDistrict, position } = request.data || {};
    if (!regionMetro || !regionLocal || !electoralDistrict || !position) {
        throw new HttpsError('invalid-argument', '지역/선거구/직책을 모두 입력해주세요.');
    }
    const newKey = districtKey({ position, regionMetro, regionLocal, electoralDistrict });
    const excludeUid = request.auth?.uid;
    const result = await checkDistrictAvailabilityService({ newKey, excludeUid });
    return { success: true, ...result };
});

/**
 * 회원가입 (선거구 중복 확인 포함)
 */
exports.registerWithDistrictCheck = onCall({ cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', '인증이 필요합니다.');
    const { uid } = request.auth;
    const { profileData } = request.data || {};
    if (!profileData) throw new HttpsError('invalid-argument', '프로필 데이터가 필요합니다.');

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

    delete profileData.isAdmin;
    delete profileData.role;

    await db.collection('users').doc(uid).set({
        ...profileData,
        bio,
        isActive,
        districtKey: newKey,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { success: true, message: '회원가입이 완료되었습니다.' };
});


// ============================================================================
// 3. 대시보드 및 공지사항 함수 (Dashboard & Notices)
// ============================================================================

/**
 * 대시보드 데이터를 조회합니다.
 */
exports.getDashboardData = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', '인증이 필요합니다.');
  const { uid } = request.auth;

  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const usageSnapshot = await db.collection('users').doc(uid).collection('posts')
    .where('createdAt', '>=', thisMonth)
    .get();
  
  const usage = {
    postsGenerated: usageSnapshot.size,
    monthlyLimit: 50,
  };

  const postsSnapshot = await db.collection('users').doc(uid).collection('posts')
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();
    
  const recentPosts = postsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.().toISOString(),
          updatedAt: data.updatedAt?.toDate?.().toISOString(),
      };
  });

  return { success: true, usage, recentPosts };
});

/**
 * 활성화된 공지사항을 조회합니다.
 */
exports.getActiveNotices = onCall({ cors: true }, async (request) => {
  const now = admin.firestore.Timestamp.now();
  // [수정] 복잡한 쿼리 대신, 생성일 기준으로만 정렬하여 안정성 확보
  const snapshot = await db.collection('notices')
    .where('isActive', '==', true)
    .where('expiresAt', '>=', now)
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  const notices = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.().toISOString(),
          updatedAt: data.updatedAt?.toDate?.().toISOString(),
          expiresAt: data.expiresAt?.toDate?.().toISOString(),
      };
  });
  return { success: true, notices };
});


// ============================================================================
// 4. 백그라운드 트리거 (Background Triggers)
// ============================================================================

/**
 * 사용자 프로필의 'bio'가 업데이트되면 자동으로 스타일을 분석합니다.
 */
exports.analyzeUserProfile = onDocumentUpdated('users/{userId}', async (event) => {
  const newData = event.data.after.data();
  const oldData = event.data.before.data();
  const userId = event.params.userId;

  if (newData.bio && newData.bio !== oldData.bio && newData.bio.length > 50) {
    console.log(`사용자 ${userId}의 자기소개 변경, 스타일 분석 시작...`);
    try {
      const styleProfile = await analyzeBioForStyle(newData.bio);
      if (styleProfile) {
        await event.data.after.ref.update({
          writingStyle: styleProfile,
          styleLastAnalyzed: new Date(),
        });
        console.log(`사용자 ${userId}의 스타일 프로필 저장 완료.`);
      }
    } catch (error) {
      console.error(`사용자 ${userId}의 스타일 프로필 분석 실패:`, error);
    }
  }
  return null;
});
