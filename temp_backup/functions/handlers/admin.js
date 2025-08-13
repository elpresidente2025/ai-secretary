'use strict';

const { wrap } = require('../common/wrap');
const { ok } = require('../common/response');
const { auth } = require('../common/auth');
const { log } = require('../common/log');
const { requireAdmin } = require('../common/rbac');
const { admin, db } = require('../utils/firebaseAdmin');
const { makeCursorToken, parseCursorToken } = require('../common/pagination');

// 관리자: 통계
exports.getAdminStats = wrap(async (req) => {
  const { uid, token } = auth(req);
  await requireAdmin(uid, token);

  const stats = { 
    totalUsers: 0, 
    totalPosts: 0, 
    todayNewUsers: 0, 
    todayPosts: 0, 
    geminiStatus: null,
    last30mErrors: 0,
    activeUsers: 0
  };

  const todayTs = admin.firestore.Timestamp.fromDate(new Date(new Date().setHours(0, 0, 0, 0)));
  const thirtyMinutesAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 30 * 60 * 1000));
  const fiveMinutesAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000));

  try {
    // Gemini 상태 확인
    const statusDoc = await db.collection('system').doc('status').get();
    const s = statusDoc.exists ? statusDoc.data() : {};
    if (s?.gemini) {
      stats.geminiStatus = { 
        state: s.gemini.state || 'unknown', 
        lastChecked: s.gemini.lastChecked || null 
      };
    }
  } catch (e) {
    log('ADMIN_STATS', 'Gemini 상태 조회 실패', e.message);
    stats.geminiStatus = { state: 'unknown', lastChecked: null };
  }

  try {
    // 병렬 쿼리 실행
    const [uSnap, pSnap, todayUsersSnap, todayPostsSnap, errorsSnap, activeSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('posts').get(),
      db.collection('users').where('createdAt', '>=', todayTs).get(),
      db.collection('posts').where('createdAt', '>=', todayTs).get(),
      db.collection('errors').where('timestamp', '>=', thirtyMinutesAgo).get(),
      db.collection('users').where('lastLoginAt', '>=', fiveMinutesAgo).get(),
    ]);

    stats.totalUsers = uSnap.size;
    stats.totalPosts = pSnap.size;
    stats.todayNewUsers = todayUsersSnap.size;
    stats.todayPosts = todayPostsSnap.size;
    stats.last30mErrors = errorsSnap.size;
    stats.activeUsers = activeSnap.size;

  } catch (e) {
    log('ADMIN_STATS', '통계 쿼리 실패', e.message);
  }

  log('ADMIN_STATS', '성공', stats);
  return ok({ stats });
});

// 관리자: 에러 로그 (커서 기반 페이지네이션)
exports.getErrorLogs = wrap(async (req) => {
  const { uid, token } = auth(req);
  await requireAdmin(uid, token);

  const { limit = 200, startAfter } = req.data || {};
  const usedLimit = Math.min(Number(limit) || 200, 500);

  let query = db.collection('errors').orderBy('timestamp', 'desc').limit(usedLimit);
  const cursor = parseCursorToken(startAfter);
  if (cursor?.timestamp) query = query.startAfter(cursor.timestamp);

  const snapshot = await query.get();
  const errors = snapshot.docs.map((doc) => {
    const d = doc.data() || {};
    return {
      id: doc.id,
      timestamp: d.timestamp?.toDate?.()?.toISOString() || null,
      message: d.message || '',
      userId: d.userId || '',
      userEmail: d.userEmail || '',
      functionName: d.functionName || '',
      errorCode: d.errorCode || '',
      stack: d.stack || '',
    };
  });

  const last = snapshot.docs[snapshot.docs.length - 1];
  const nextPageToken = last ? makeCursorToken(last.get('timestamp'), last.id) : null;

  log('ERROR_LOGS', '성공', errors.length);
  return ok({ errors, hasMore: snapshot.size === usedLimit, nextPageToken });
});

// 관리자: 사용자 목록 (커서 기반 페이지네이션)
exports.getUsers = wrap(async (req) => {
  const { uid, token } = auth(req);
  await requireAdmin(uid, token);

  const { limit = 50, startAfter, status, query: searchQuery } = req.data || {};
  const usedLimit = Math.min(Number(limit) || 50, 100);

  let query = db.collection('users');
  if (status === 'active') query = query.where('isActive', '==', true);
  else if (status === 'inactive') query = query.where('isActive', '==', false);

  query = query.orderBy('createdAt', 'desc').limit(usedLimit);

  const cursor = parseCursorToken(startAfter);
  if (cursor?.timestamp) query = query.startAfter(cursor.timestamp);

  const snapshot = await query.get();
  let users = snapshot.docs.map((doc) => {
    const d = doc.data() || {};
    return {
      id: doc.id,
      name: d.name || '',
      email: d.email || '',
      position: d.position || '',
      regionMetro: d.regionMetro || '',
      regionLocal: d.regionLocal || '',
      electoralDistrict: d.electoralDistrict || '',
      status: d.status || '',
      isActive: !!d.isActive,
      isAdmin: !!d.isAdmin,
      role: d.role || 'user',
      createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
      lastLoginAt: d.lastLoginAt?.toDate?.()?.toISOString() || null,
    };
  });

  // 검색 필터 적용 (클라이언트 사이드)
  if (searchQuery?.trim()) {
    const searchTerm = searchQuery.trim().toLowerCase();
    users = users.filter(user => 
      user.name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm) ||
      user.position.toLowerCase().includes(searchTerm)
    );
  }

  const last = snapshot.docs[snapshot.docs.length - 1];
  const nextPageToken = last ? makeCursorToken(last.get('createdAt'), last.id) : null;

  log('ADMIN_USERS', '성공', users.length);
  return ok({ users, hasMore: snapshot.size === usedLimit, nextPageToken });
});

// 관리자: 고아 락 정리
exports.cleanupOrphanLocks = wrap(async (req) => {
  const { uid, token } = auth(req);
  await requireAdmin(uid, token);

  try {
    let cleanedCount = 0;
    const claimsSnapshot = await db.collection('district_claims').get();

    let batch = db.batch();
    let ops = 0;
    const commitAndReset = async () => {
      if (ops > 0) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    };

    for (const doc of claimsSnapshot.docs) {
      const data = doc.data() || {};
      const userId = data.userId;

      if (!userId) {
        batch.delete(doc.ref); 
        cleanedCount++; 
        ops++;
      } else {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) { 
          batch.delete(doc.ref); 
          cleanedCount++; 
          ops++; 
          log('CLEANUP', '고아 락', { claimId: doc.id, userId }); 
        }
      }
      if (ops >= 400) await commitAndReset();
    }

    await commitAndReset();
    log('CLEANUP', '완료', { cleanedCount });
    return ok({ message: `${cleanedCount}개의 고아 락이 정리되었습니다.`, cleanedCount });
  } catch (error) {
    log('CLEANUP', '오류', error.message);
    throw error; // wrap()이 표준 에러로 변환
  }
});