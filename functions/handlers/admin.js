// firebase/functions/src/admin.js - onCall 형식으로 변경
'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const db = admin.firestore();

// 공통 함수 옵션
const functionOptions = {
  cors: true,
  maxInstances: 5,
  timeoutSeconds: 60,
  memory: '512MiB'
};

/**
 * 관리자 권한 체크 함수
 */
async function requireAdmin(uid) {
  if (!uid) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }

  try {
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      throw new HttpsError('not-found', '사용자 정보를 찾을 수 없습니다.');
    }

    const userData = userDoc.data();
    
    if (userData.role !== 'admin') {
      throw new HttpsError('permission-denied', '관리자 권한이 필요합니다.');
    }

    return userData;
  } catch (error) {
    console.error('관리자 권한 체크 실패:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '권한 확인 중 오류가 발생했습니다.');
  }
}

/**
 * 로그 함수 (기존 코드 호환성)
 */
function log(category, message, data = {}) {
  console.log(`[${category}] ${message}`, data);
}

// ============================================================================
// 관리자: 통계
// ============================================================================
exports.getAdminStats = onCall(functionOptions, async (request) => {
  try {
    const uid = request.auth?.uid;
    await requireAdmin(uid);

    console.log('📊 관리자 통계 데이터 조회 시작');

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
      const queries = await Promise.allSettled([
        db.collection('users').get(),
        db.collection('posts').get(),
        db.collection('users').where('createdAt', '>=', todayTs).get(),
        db.collection('posts').where('createdAt', '>=', todayTs).get(),
        db.collection('errors').where('timestamp', '>=', thirtyMinutesAgo).get(),
        db.collection('users').where('lastLoginAt', '>=', fiveMinutesAgo).get(),
      ]);

      // 성공한 쿼리 결과만 처리
      if (queries[0].status === 'fulfilled') stats.totalUsers = queries[0].value.size;
      if (queries[1].status === 'fulfilled') stats.totalPosts = queries[1].value.size;
      if (queries[2].status === 'fulfilled') stats.todayNewUsers = queries[2].value.size;
      if (queries[3].status === 'fulfilled') stats.todayPosts = queries[3].value.size;
      if (queries[4].status === 'fulfilled') stats.last30mErrors = queries[4].value.size;
      if (queries[5].status === 'fulfilled') stats.activeUsers = queries[5].value.size;

      // 실패한 쿼리 로그
      queries.forEach((result, index) => {
        if (result.status === 'rejected') {
          const queryNames = ['users', 'posts', 'todayUsers', 'todayPosts', 'errors', 'activeUsers'];
          log('ADMIN_STATS', `${queryNames[index]} 쿼리 실패`, result.reason?.message);
        }
      });

    } catch (e) {
      log('ADMIN_STATS', '통계 쿼리 실패', e.message);
    }

    log('ADMIN_STATS', '성공', stats);
    
    return {
      success: true,
      data: { stats }
    };

  } catch (error) {
    console.error('❌ getAdminStats 실패:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '통계 데이터 조회 중 오류가 발생했습니다.');
  }
});

// ============================================================================
// 관리자: 에러 로그 (커서 기반 페이지네이션)
// ============================================================================
exports.getErrorLogs = onCall(functionOptions, async (request) => {
  try {
    const uid = request.auth?.uid;
    await requireAdmin(uid);

    console.log('📋 에러 로그 조회 시작');

    const { limit = 200, startAfter } = request.data || {};
    const usedLimit = Math.min(Number(limit) || 200, 500);

    try {
      let query = db.collection('errors').orderBy('timestamp', 'desc').limit(usedLimit);
      
      // 커서 기반 페이지네이션
      if (startAfter) {
        // startAfter가 timestamp 형태라고 가정
        const cursorTs = admin.firestore.Timestamp.fromDate(new Date(startAfter));
        query = query.startAfter(cursorTs);
      }

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
      const nextPageToken = last ? last.get('timestamp')?.toDate?.()?.toISOString() : null;

      log('ERROR_LOGS', '성공', errors.length);
      
      return {
        success: true,
        data: { 
          errors, 
          hasMore: snapshot.size === usedLimit, 
          nextPageToken 
        }
      };

    } catch (firestoreError) {
      console.error('Firestore 에러 로그 조회 실패:', firestoreError);
      
      // 에러 컬렉션이 없는 경우 빈 결과 반환
      if (firestoreError.code === 'not-found' || firestoreError.code === 'failed-precondition') {
        return {
          success: true,
          data: {
            errors: [],
            hasMore: false,
            nextPageToken: null
          }
        };
      }
      throw firestoreError;
    }

  } catch (error) {
    console.error('❌ getErrorLogs 실패:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '에러 로그 조회 중 오류가 발생했습니다.');
  }
});

// ============================================================================
// 관리자: 사용자 목록 (커서 기반 페이지네이션)
// ============================================================================
exports.getUsers = onCall(functionOptions, async (request) => {
  try {
    const uid = request.auth?.uid;
    await requireAdmin(uid);

    console.log('📋 사용자 목록 조회 시작');

    const { limit = 50, startAfter, status, query: searchQuery } = request.data || {};
    const usedLimit = Math.min(Number(limit) || 50, 100);

    try {
      let query = db.collection('users');
      
      // 상태별 필터링
      if (status === 'active') {
        query = query.where('isActive', '==', true);
      } else if (status === 'inactive') {
        query = query.where('isActive', '==', false);
      }

      query = query.orderBy('createdAt', 'desc').limit(usedLimit);

      // 커서 기반 페이지네이션
      if (startAfter) {
        const cursorTs = admin.firestore.Timestamp.fromDate(new Date(startAfter));
        query = query.startAfter(cursorTs);
      }

      const snapshot = await query.get();
      let users = snapshot.docs.map((doc) => {
        const d = doc.data() || {};
        return {
          id: doc.id,
          uid: doc.id, // AdminPage 호환성
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
      const nextPageToken = last ? last.get('createdAt')?.toDate?.()?.toISOString() : null;

      log('ADMIN_USERS', '성공', users.length);
      
      return {
        success: true,
        data: { 
          users, 
          hasMore: snapshot.size === usedLimit, 
          nextPageToken,
          pagination: {
            currentPage: 1, // 커서 기반이므로 페이지 개념은 단순화
            totalUsers: users.length,
            totalPages: 1,
            hasNext: snapshot.size === usedLimit
          }
        }
      };

    } catch (firestoreError) {
      console.error('Firestore 사용자 조회 실패:', firestoreError);
      
      // 사용자 컬렉션이 없는 경우 빈 결과 반환
      if (firestoreError.code === 'not-found' || firestoreError.code === 'failed-precondition') {
        return {
          success: true,
          data: {
            users: [],
            hasMore: false,
            nextPageToken: null,
            pagination: {
              currentPage: 1,
              totalUsers: 0,
              totalPages: 0,
              hasNext: false
            }
          }
        };
      }
      throw firestoreError;
    }

  } catch (error) {
    console.error('❌ getUsers 실패:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '사용자 목록 조회 중 오류가 발생했습니다.');
  }
});

// ============================================================================
// 관리자: 고아 락 정리
// ============================================================================
exports.cleanupOrphanLocks = onCall(functionOptions, async (request) => {
  try {
    const uid = request.auth?.uid;
    await requireAdmin(uid);

    console.log('🧹 고아 락 정리 시작');

    try {
      let cleanedCount = 0;
      const claimsSnapshot = await db.collection('district_claims').get();

      if (claimsSnapshot.empty) {
        log('CLEANUP', '완료 - 정리할 항목 없음', { cleanedCount: 0 });
        return {
          success: true,
          data: { 
            message: '정리할 고아 락이 없습니다.',
            cleanedCount: 0 
          }
        };
      }

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
          try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists) { 
              batch.delete(doc.ref); 
              cleanedCount++; 
              ops++; 
              log('CLEANUP', '고아 락 발견', { claimId: doc.id, userId }); 
            }
          } catch (userCheckError) {
            log('CLEANUP', '사용자 체크 실패', { claimId: doc.id, userId, error: userCheckError.message });
          }
        }
        
        if (ops >= 400) {
          await commitAndReset();
        }
      }

      await commitAndReset();
      
      log('CLEANUP', '완료', { cleanedCount });
      
      return {
        success: true,
        data: { 
          message: `${cleanedCount}개의 고아 락이 정리되었습니다.`, 
          cleanedCount 
        }
      };

    } catch (firestoreError) {
      console.error('Firestore 정리 작업 실패:', firestoreError);
      
      // district_claims 컬렉션이 없는 경우
      if (firestoreError.code === 'not-found' || firestoreError.code === 'failed-precondition') {
        return {
          success: true,
          data: {
            message: '정리할 고아 락이 없습니다.',
            cleanedCount: 0
          }
        };
      }
      throw firestoreError;
    }

  } catch (error) {
    console.error('❌ cleanupOrphanLocks 실패:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '고아 락 정리 중 오류가 발생했습니다.');
  }
});