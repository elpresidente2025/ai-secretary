'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/hhttps');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

// 글로벌 옵션
setGlobalOptions({
  region: 'asia-northeast3',
  maxInstances: 10,
});

// Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// 공통 옵션
const functionOptions = {
  cors: {
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
  maxInstances: 5,
  timeoutSeconds: 60,
  memory: '512MiB'
};

// ============================================================================
// 공지사항 생성
// ============================================================================
exports.createNotice = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    // 관리자 권한 확인
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      throw new HttpsError('permission-denied', '관리자 권한이 필요합니다.');
    }

    const { title, content, type, priority, isActive, expiresAt, targetUsers } = request.data;

    if (!title || !content) {
      throw new HttpsError('invalid-argument', '제목과 내용을 입력해주세요.');
    }

    const noticeData = {
      title: title.trim(),
      content: content.trim(),
      type: type || 'info',
      priority: priority || 'medium',
      isActive: isActive !== false,
      targetUsers: targetUsers || ['all'],
      createdBy: request.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // 만료일 설정
    if (expiresAt) {
      noticeData.expiresAt = admin.firestore.Timestamp.fromDate(new Date(expiresAt));
    }

    const docRef = await db.collection('notices').add(noticeData);

    return {
      success: true,
      noticeId: docRef.id,
      message: '공지사항이 생성되었습니다.'
    };

  } catch (error) {
    console.error('❌ 공지 생성 실패:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '공지 생성 중 오류가 발생했습니다.');
  }
});

// ============================================================================
// 공지사항 수정
// ============================================================================
exports.updateNotice = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    // 관리자 권한 확인
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      throw new HttpsError('permission-denied', '관리자 권한이 필요합니다.');
    }

    const { noticeId, ...updateData } = request.data;

    if (!noticeId) {
      throw new HttpsError('invalid-argument', '공지 ID가 필요합니다.');
    }

    const updates = {
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // 만료일 처리
    if (updateData.expiresAt) {
      updates.expiresAt = admin.firestore.Timestamp.fromDate(new Date(updateData.expiresAt));
    } else if (updateData.expiresAt === '') {
      updates.expiresAt = admin.firestore.FieldValue.delete();
    }

    await db.collection('notices').doc(noticeId).update(updates);

    return {
      success: true,
      message: '공지사항이 수정되었습니다.'
    };

  } catch (error) {
    console.error('❌ 공지 수정 실패:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '공지 수정 중 오류가 발생했습니다.');
  }
});

// ============================================================================
// 공지사항 삭제
// ============================================================================
exports.deleteNotice = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    // 관리자 권한 확인
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      throw new HttpsError('permission-denied', '관리자 권한이 필요합니다.');
    }

    const { noticeId } = request.data;

    if (!noticeId) {
      throw new HttpsError('invalid-argument', '공지 ID가 필요합니다.');
    }

    await db.collection('notices').doc(noticeId).delete();

    return {
      success: true,
      message: '공지사항이 삭제되었습니다.'
    };

  } catch (error) {
    console.error('❌ 공지 삭제 실패:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '공지 삭제 중 오류가 발생했습니다.');
  }
});

// ============================================================================
// 공지사항 목록 조회 (관리자용)
// ============================================================================
exports.getNotices = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    // 관리자 권한 확인
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      throw new HttpsError('permission-denied', '관리자 권한이 필요합니다.');
    }

    const snapshot = await db.collection('notices').get();

    const notices = [];
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      notices.push({
        id: doc.id,
        title: data.title || '제목 없음',
        content: data.content || '',
        type: data.type || 'info',
        priority: data.priority || 'medium',
        isActive: data.isActive !== false,
        targetUsers: data.targetUsers || ['all'],
        createdBy: data.createdBy || '',
        createdAt: data.createdAt?.toDate?.().toISOString(),
        updatedAt: data.updatedAt?.toDate?.().toISOString(),
        expiresAt: data.expiresAt?.toDate?.().toISOString()
      });
    });

    // 최신순으로 정렬
    notices.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    return {
      success: true,
      notices
    };

  } catch (error) {
    console.error('❌ 공지 목록 조회 실패:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '공지 목록 조회 중 오류가 발생했습니다.');
  }
});

// ============================================================================
// 🔥 활성 공지사항 조회 (일반 사용자용) - 수정된 버전
// ============================================================================
exports.getActiveNotices = onCall(functionOptions, async (request) => {
  try {
    // Firestore에서 활성화된 공지사항만 쿼리
    const now = new Date();
    const snapshot = await db.collection('notices')
      .where('isActive', '==', true)
      .get();

    const notices = [];
    snapshot.forEach(doc => {
      const data = doc.data();

      // 만료일 체크 (만료일이 없거나, 있더라도 현재보다 미래인 경우)
      if (!data.expiresAt || data.expiresAt.toDate() > now) {
        notices.push({
          id: doc.id,
          title: data.title || '공지사항',
          content: data.content || '',
          type: data.type || 'info',
          priority: data.priority || 'medium',
          // ✅ toDate()와 toISOString()을 안전하게 호출
          createdAt: data.createdAt?.toDate?.().toISOString() || new Date(0).toISOString(),
          expiresAt: data.expiresAt?.toDate?.().toISOString() || null,
        });
      }
    });

    // 우선순위 및 최신순으로 정렬 (안전장치 추가)
    notices.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityA = priorityOrder[a.priority] || 2;
      const priorityB = priorityOrder[b.priority] || 2;
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      
      // ✅ createdAt이 유효하지 않을 경우를 대비한 안전장치
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    return {
      success: true,
      notices,
    };

  } catch (error) {
    console.error('❌ getActiveNotices 함수 오류:', error);
    // HttpsError가 아닌 다른 에러일 경우, 클라이언트에게는 일반적인 오류 메시지를 보냄
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '활성 공지사항을 불러오는 중 오류가 발생했습니다.');
  }
});