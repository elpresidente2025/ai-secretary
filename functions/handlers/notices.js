// functions/handlers/notices.js
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
 * 관리자 권한 체크
 */
async function requireAdmin(uid) {
  if (!uid) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }

  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError('not-found', '사용자 정보를 찾을 수 없습니다.');
  }

  const userData = userDoc.data();
  if (userData.role !== 'admin') {
    throw new HttpsError('permission-denied', '관리자 권한이 필요합니다.');
  }

  return userData;
}

// ============================================================================
// 공지사항 생성
// ============================================================================
exports.createNotice = onCall(functionOptions, async (request) => {
  try {
    const uid = request.auth?.uid;
    const adminUser = await requireAdmin(uid);
    
    const { title, content, type, priority, isActive, expiresAt, targetUsers } = request.data;
    
    // 입력 검증
    if (!title?.trim() || !content?.trim()) {
      throw new HttpsError('invalid-argument', '제목과 내용은 필수입니다.');
    }

    const noticeData = {
      title: title.trim(),
      content: content.trim(),
      type: type || 'info',
      priority: priority || 'medium',
      isActive: isActive !== false,
      targetUsers: targetUsers ? [targetUsers] : ['all'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: adminUser.email || uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // 만료일 설정
    if (expiresAt) {
      noticeData.expiresAt = admin.firestore.Timestamp.fromDate(new Date(expiresAt));
    }

    const docRef = await db.collection('notices').add(noticeData);
    
    console.log('✅ 공지 생성 완료:', docRef.id);
    
    return {
      success: true,
      noticeId: docRef.id,
      message: '공지가 성공적으로 작성되었습니다.'
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
    const uid = request.auth?.uid;
    await requireAdmin(uid);
    
    const { noticeId, ...updateData } = request.data;
    
    if (!noticeId) {
      throw new HttpsError('invalid-argument', '공지 ID가 필요합니다.');
    }

    const updateFields = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // 허용된 필드만 업데이트
    const allowedFields = ['title', 'content', 'type', 'priority', 'isActive', 'targetUsers', 'expiresAt'];
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (field === 'expiresAt' && updateData[field]) {
          updateFields[field] = admin.firestore.Timestamp.fromDate(new Date(updateData[field]));
        } else if (field === 'targetUsers') {
          updateFields[field] = updateData[field] ? [updateData[field]] : ['all'];
        } else {
          updateFields[field] = updateData[field];
        }
      }
    });

    await db.collection('notices').doc(noticeId).update(updateFields);
    
    console.log('✅ 공지 수정 완료:', noticeId);
    
    return {
      success: true,
      message: '공지가 성공적으로 수정되었습니다.'
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
    const uid = request.auth?.uid;
    await requireAdmin(uid);
    
    const { noticeId } = request.data;
    
    if (!noticeId) {
      throw new HttpsError('invalid-argument', '공지 ID가 필요합니다.');
    }

    await db.collection('notices').doc(noticeId).delete();
    
    console.log('✅ 공지 삭제 완료:', noticeId);
    
    return {
      success: true,
      message: '공지가 성공적으로 삭제되었습니다.'
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
    const uid = request.auth?.uid;
    await requireAdmin(uid);
    
    const { includeInactive = false, limit = 50 } = request.data || {};
    
    let query = db.collection('notices')
      .orderBy('createdAt', 'desc')
      .limit(limit);
    
    // 비활성화된 공지 포함 여부
    if (!includeInactive) {
      query = query.where('isActive', '==', true);
    }

    const snapshot = await query.get();
    
    const notices = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        content: data.content,
        type: data.type,
        priority: data.priority,
        isActive: data.isActive,
        targetUsers: data.targetUsers,
        createdAt: data.createdAt?.toDate()?.toISOString(),
        createdBy: data.createdBy,
        updatedAt: data.updatedAt?.toDate()?.toISOString(),
        expiresAt: data.expiresAt?.toDate()?.toISOString()
      };
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
// 활성 공지사항 조회 (일반 사용자용)
// ============================================================================
exports.getActiveNotices = onCall(functionOptions, async (request) => {
  try {
    const uid = request.auth?.uid;
    
    if (!uid) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const now = admin.firestore.Timestamp.now();
    
    // 활성화된 공지 중 만료되지 않은 것들만 조회
    const snapshot = await db.collection('notices')
      .where('isActive', '==', true)
      .where('targetUsers', 'array-contains', 'all') // 현재는 전체 공지만
      .orderBy('priority', 'desc')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const notices = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          content: data.content,
          type: data.type,
          priority: data.priority,
          createdAt: data.createdAt?.toDate()?.toISOString(),
          expiresAt: data.expiresAt?.toDate()?.toISOString()
        };
      })
      .filter(notice => {
        // 만료일 체크
        if (notice.expiresAt) {
          return new Date(notice.expiresAt) > new Date();
        }
        return true;
      });

    return {
      success: true,
      notices
    };

  } catch (error) {
    console.error('❌ 활성 공지 조회 실패:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '공지 조회 중 오류가 발생했습니다.');
  }
});