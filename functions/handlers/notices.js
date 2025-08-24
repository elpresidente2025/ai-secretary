/**
 * functions/handlers/notices.js
 * 공지사항 관련 함수입니다. (CORS 옵션 전체 적용)
 */

'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

// Admin 초기화 (중복 방지)
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// 공통 옵션 (CORS 포함)
const functionOptions = {
  region: 'asia-northeast3',
  cors: true, // 모든 함수에 CORS 허용
};

// ============================================================================
// 공지사항 생성
// ============================================================================
exports.createNotice = onCall(functionOptions, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }
  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    throw new HttpsError('permission-denied', '관리자 권한이 필요합니다.');
  }
  const { title, content, type, priority, isActive, expiresAt } = request.data;
  if (!title || !content) {
    throw new HttpsError('invalid-argument', '제목과 내용을 입력해주세요.');
  }
  const noticeData = {
    title: title.trim(),
    content: content.trim(),
    type: type || 'info',
    priority: priority || 'medium',
    isActive: isActive !== false,
    createdBy: request.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  if (expiresAt) {
    noticeData.expiresAt = admin.firestore.Timestamp.fromDate(new Date(expiresAt));
  }
  const docRef = await db.collection('notices').add(noticeData);
  return { success: true, noticeId: docRef.id, message: '공지사항이 생성되었습니다.' };
});

// ============================================================================
// 공지사항 수정
// ============================================================================
exports.updateNotice = onCall(functionOptions, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }
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
  if (updateData.expiresAt) {
    updates.expiresAt = admin.firestore.Timestamp.fromDate(new Date(updateData.expiresAt));
  } else if (updateData.expiresAt === '') {
    updates.expiresAt = admin.firestore.FieldValue.delete();
  }
  await db.collection('notices').doc(noticeId).update(updates);
  return { success: true, message: '공지사항이 수정되었습니다.' };
});

// ============================================================================
// 공지사항 삭제
// ============================================================================
exports.deleteNotice = onCall(functionOptions, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }
  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    throw new HttpsError('permission-denied', '관리자 권한이 필요합니다.');
  }
  const { noticeId } = request.data;
  if (!noticeId) {
    throw new HttpsError('invalid-argument', '공지 ID가 필요합니다.');
  }
  await db.collection('notices').doc(noticeId).delete();
  return { success: true, message: '공지사항이 삭제되었습니다.' };
});

// ============================================================================
// 공지사항 목록 조회 (관리자용)
// ============================================================================
exports.getNotices = onCall(functionOptions, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }
  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    throw new HttpsError('permission-denied', '관리자 권한이 필요합니다.');
  }
  const snapshot = await db.collection('notices').orderBy('createdAt', 'desc').get();
  const notices = [];
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    notices.push({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.().toISOString(),
      updatedAt: data.updatedAt?.toDate?.().toISOString(),
      expiresAt: data.expiresAt?.toDate?.().toISOString()
    });
  });
  return { success: true, notices };
});

// ============================================================================
// 활성 공지사항 조회 (일반 사용자용)
// ============================================================================
exports.getActiveNotices = onCall(functionOptions, async (request) => {
  const now = admin.firestore.Timestamp.now();
  
  // 활성 공지사항 조회 (expiresAt 조건 분리)
  const snapshot = await db.collection('notices')
    .where('isActive', '==', true)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  const notices = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    
    // 만료되지 않은 공지사항만 포함 (expiresAt이 없으면 만료되지 않은 것으로 처리)
    if (!data.expiresAt || data.expiresAt.toDate() >= now.toDate()) {
      notices.push({
        id: doc.id,
        title: data.title || '공지사항',
        content: data.content || '',
        type: data.type || 'info',
        priority: data.priority || 'medium',
        createdAt: data.createdAt?.toDate?.().toISOString(),
        expiresAt: data.expiresAt?.toDate?.().toISOString()
      });
    }
  });
  
  // 우선순위와 생성일로 정렬 후 최대 10개 반환
  notices.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority] || 2;
    const bPriority = priorityOrder[b.priority] || 2;
    if (aPriority !== bPriority) return bPriority - aPriority;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  
  return { success: true, notices: notices.slice(0, 10) };
});
