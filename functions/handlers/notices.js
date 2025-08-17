'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
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

    try {
      // 안전한 쿼리 (orderBy 없이)
      const snapshot = await db.collection('notices')
        .get();

      const notices = [];
      snapshot.docs.forEach(doc => {
        try {
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
            createdAt: data.createdAt?.toDate()?.toISOString(),
            updatedAt: data.updatedAt?.toDate()?.toISOString(),
            expiresAt: data.expiresAt?.toDate()?.toISOString()
          });
        } catch (docError) {
          console.warn('공지 문서 처리 오류:', docError.message);
        }
      });

      // 클라이언트에서 정렬
      notices.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      return {
        success: true,
        notices
      };

    } catch (dbError) {
      console.warn('Firestore 쿼리 실패, 빈 목록 반환:', dbError.message);
      return {
        success: true,
        notices: []
      };
    }

  } catch (error) {
    console.error('❌ 공지 목록 조회 실패:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '공지 목록 조회 중 오류가 발생했습니다.');
  }
});

// ============================================================================
// 🔥 활성 공지사항 조회 (일반 사용자용) - 완전 수정
// ============================================================================
exports.getActiveNotices = onCall(functionOptions, async (request) => {
  console.log('🔥 getActiveNotices 호출 시작');
  
  try {
    // 인증 선택사항으로 처리 (공지는 모든 사용자에게 공개)
    let userId = null;
    if (request.auth) {
      userId = request.auth.uid;
      console.log('✅ 사용자 인증:', userId);
    } else {
      console.log('ℹ️ 비인증 사용자 (공지는 공개)');
    }

    // 기본 응답
    const response = {
      success: true,
      notices: []
    };

    try {
      console.log('🔍 공지사항 조회 시작...');
      
      // 🔥 가장 단순한 쿼리로 시작 (조건 없이 모든 공지 가져오기)
      const snapshot = await db.collection('notices').get();
      
      console.log('✅ Firestore 전체 문서 수:', snapshot.size);

      const allNotices = [];
      snapshot.docs.forEach(doc => {
        try {
          const data = doc.data();
          console.log('📄 문서 데이터:', doc.id, data);
          
          allNotices.push({
            id: doc.id,
            title: data.title || '공지사항',
            content: data.content || '',
            type: data.type || 'info',
            priority: data.priority || 'medium',
            isActive: data.isActive,
            createdAt: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
            expiresAt: data.expiresAt?.toDate()?.toISOString(),
            rawData: data // 🔥 디버깅용 원시 데이터
          });
        } catch (docError) {
          console.warn('문서 처리 오류:', docError.message);
        }
      });

      console.log('✅ 전체 공지사항:', allNotices.length);

      // 🔥 필터링 로직을 단계별로 적용
      const now = new Date();
      console.log('⏰ 현재 시간:', now.toISOString());

      const activeNotices = allNotices.filter(notice => {
        console.log(`🔍 공지 "${notice.title}" 검사:`);
        console.log(`  - isActive: ${notice.isActive}`);
        console.log(`  - expiresAt: ${notice.expiresAt}`);
        
        // 1. isActive 체크
        if (notice.isActive !== true) {
          console.log(`  ❌ 비활성 상태`);
          return false;
        }
        
        // 2. 만료일 체크
        if (notice.expiresAt) {
          const expiresAt = new Date(notice.expiresAt);
          console.log(`  - 만료일: ${expiresAt.toISOString()}`);
          console.log(`  - 현재 < 만료일: ${now < expiresAt}`);
          
          if (now >= expiresAt) {
            console.log(`  ❌ 만료됨`);
            return false;
          }
        }
        
        console.log(`  ✅ 활성 공지`);
        return true;
      });

      console.log('✅ 필터링된 활성 공지:', activeNotices.length);

      // 우선순위별 정렬
      activeNotices.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityA = priorityOrder[a.priority] || 2;
        const priorityB = priorityOrder[b.priority] || 2;
        
        if (priorityA !== priorityB) {
          return priorityB - priorityA;
        }
        
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      // 🔥 rawData 제거하고 최종 응답 준비
      const finalNotices = activeNotices.map(notice => {
        const { rawData, ...cleanNotice } = notice;
        return cleanNotice;
      });

      response.notices = finalNotices;
      console.log('✅ 최종 응답 공지사항 개수:', finalNotices.length);

    } catch (dbError) {
      console.error('⚠️ Firestore 조회 실패:', dbError);
      response.notices = [];
    }

    return response;

  } catch (error) {
    console.error('❌ getActiveNotices 최종 오류:', error);
    
    // 어떤 오류가 발생해도 기본 응답 제공
    return {
      success: true,
      notices: []
    };
  }
});