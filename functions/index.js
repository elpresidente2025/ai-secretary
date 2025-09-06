/**
 * functions/index.js (간소화된 진입점)
 * 기존 핸들러 구조를 사용하여 안정적인 배포를 위한 진입점입니다.
 */

'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');

// 전역 설정
setGlobalOptions({ region: 'asia-northeast3' });

// 각 핸들러 모듈 임포트
const postsHandler = require('./handlers/posts');
const profileHandler = require('./handlers/profile');
const bioHandler = require('./handlers/bio');
const dashboardHandler = require('./handlers/dashboard');
const noticesHandler = require('./handlers/notices');
const adminHandler = require('./handlers/admin');
const performanceHandler = require('./handlers/performance');
const publishingHandler = require('./handlers/publishing');
const adminUsersHandler = require('./handlers/admin-users');
const snsAddonHandler = require('./handlers/sns-addon');
const tossPaymentsHandler = require('./handlers/toss-payments');
const naverLoginHandler = require('./handlers/naver-login');

// 스크래핑 테스트 함수들
const { testElectionScraping, checkCacheStatus, refreshCache } = require('./handlers/test-scraper');
const { debugElection } = require('./handlers/debug-election');

// 기본 함수 설정 (메모리와 타임아웃 최적화)
const defaultConfig = {
  cors: true,
  memory: '512MiB',
  timeoutSeconds: 120
};

const fastConfig = {
  cors: true,
  memory: '256MiB',
  timeoutSeconds: 60
};

const heavyConfig = {
  cors: true,
  memory: '1GiB',
  timeoutSeconds: 540
};

// 게시물 관련 함수들 (이미 wrap으로 onCall이 적용됨)
exports.getUserPosts = postsHandler.getUserPosts;
exports.getPost = postsHandler.getPost;
exports.updatePost = postsHandler.updatePost;
// deletePost는 HTTP 함수로 별도 구현 (CORS 문제 해결)
exports.checkUsageLimit = postsHandler.checkUsageLimit;
exports.generatePosts = postsHandler.generatePosts;

// 프로필 관련 함수들 (이미 wrap으로 onCall이 적용됨)
exports.getUserProfile = profileHandler.getUserProfile;
exports.updateProfile = profileHandler.updateProfile;
exports.updateUserPlan = profileHandler.updateUserPlan;
exports.checkDistrictAvailability = profileHandler.checkDistrictAvailability;
exports.registerWithDistrictCheck = profileHandler.registerWithDistrictCheck;

// Bio 관련 함수들 (새로 추가)
exports.getUserBio = bioHandler.getUserBio;
exports.updateUserBio = bioHandler.updateUserBio;
exports.updateBioEntry = bioHandler.updateBioEntry;
exports.deleteBioEntry = bioHandler.deleteBioEntry;

// 사용자 계정 관리 함수들
const userManagementHandler = require('./handlers/user-management');
exports.deleteUserAccount = userManagementHandler.deleteUserAccount;
exports.sendPasswordResetEmail = userManagementHandler.sendPasswordResetEmail;
exports.deleteUserBio = bioHandler.deleteUserBio;
exports.reanalyzeBioMetadata = bioHandler.reanalyzeBioMetadata;
exports.onBioUpdate = bioHandler.onBioUpdate;

// 대시보드 관련 함수들 (이미 wrap으로 onCall이 적용됨)
exports.getDashboardData = dashboardHandler.getDashboardData;

// 공지사항 관련 함수들 (이미 wrap으로 onCall이 적용됨)
exports.getActiveNotices = noticesHandler.getActiveNotices;

// 관리자 관련 함수들 (이미 wrap으로 onCall이 적용됨)
exports.syncDistrictKey = adminHandler.syncDistrictKey;

// 스크래핑 테스트 함수들 (개발/테스트용)
exports.testElectionScraping = testElectionScraping;
exports.checkCacheStatus = checkCacheStatus;
exports.refreshCache = refreshCache;
exports.debugElection = debugElection;

// 성능 모니터링 관련 함수들
exports.getPerformanceMetrics = performanceHandler.getPerformanceMetrics;

// 발행 및 게이미피케이션 관련 함수들
exports.publishPost = publishingHandler.publishPost;
exports.getPublishingStats = publishingHandler.getPublishingStats;
exports.checkBonusEligibility = publishingHandler.checkBonusEligibility;
exports.useBonusGeneration = publishingHandler.useBonusGeneration;

// 관리자 사용자 관리 함수들
exports.getAllUsers = adminUsersHandler.getAllUsers;
exports.deactivateUser = adminUsersHandler.deactivateUser;
exports.reactivateUser = adminUsersHandler.reactivateUser;
exports.deleteUser = adminUsersHandler.deleteUser;

// SNS 애드온 관련 함수들
exports.testSNS = snsAddonHandler.testSNS;
exports.convertToSNS = snsAddonHandler.convertToSNS;
exports.getSNSUsage = snsAddonHandler.getSNSUsage;
exports.purchaseSNSAddon = snsAddonHandler.purchaseSNSAddon;

// 토스페이먼츠 결제 관련 함수들
exports.confirmTossPayment = tossPaymentsHandler.confirmTossPayment;
exports.getUserPayments = tossPaymentsHandler.getUserPayments;

// 네이버 로그인 관련 함수들
exports.naverLogin = naverLoginHandler.naverLogin;

// 관리자 전용 함수들 (HTTP 함수로 변경하여 CORS 문제 해결)
const { onRequest } = require('firebase-functions/v2/https');
const { districtKey } = require('./services/district');

exports.getAdminStats = onRequest({
  region: 'asia-northeast3',
  cors: true
}, async (req, res) => {
  try {
    // CORS 헤더 명시적 설정
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    console.log('🔥 getAdminStats 시작');
    res.json({ success: true, message: '관리자 통계 기능은 현재 구현 중입니다.' });
  } catch (error) {
    console.error('❌ getAdminStats 오류:', error);
    res.status(500).json({ success: false, error: 'internal', message: '서버 내부 오류가 발생했습니다.' });
  }
});

exports.getErrorLogs = onRequest({
  region: 'asia-northeast3', 
  cors: true
}, async (req, res) => {
  try {
    // CORS 헤더 명시적 설정
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    console.log('🔥 getErrorLogs 시작');
    
    const { admin, db } = require('./utils/firebaseAdmin');
    
    // 요청 파라미터 파싱
    const reqData = req.body || {};
    const limit = Math.min(reqData.limit || 50, 200); // 최대 200개까지
    const severity = reqData.severity; // 'critical', 'error', 'warning' 필터
    const functionName = reqData.functionName; // 특정 함수 필터
    
    console.log('📊 에러 로그 조회 파라미터:', { limit, severity, functionName });
    
    // Firestore에서 에러 로그 조회
    let query = db.collection('error_logs')
      .orderBy('timestamp', 'desc')
      .limit(limit);
    
    // 필터 적용
    if (severity) {
      query = query.where('severity', '==', severity);
    }
    
    if (functionName) {
      query = query.where('functionName', '==', functionName);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      console.log('✅ 에러 로그 없음');
      return res.json({
        success: true,
        data: {
          errors: [],
          total: 0
        }
      });
    }
    
    const errors = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // 타임스탬프 변환
      let timestamp = null;
      if (data.timestamp) {
        try {
          // Firestore Timestamp 객체인 경우
          if (data.timestamp.toDate) {
            timestamp = data.timestamp.toDate().toISOString();
          } 
          // 이미 ISO 문자열인 경우
          else if (typeof data.timestamp === 'string') {
            timestamp = data.timestamp;
          }
          // 밀리초 숫자인 경우
          else if (typeof data.timestamp === 'number') {
            timestamp = new Date(data.timestamp).toISOString();
          }
        } catch (e) {
          console.warn('타임스탬프 변환 실패:', doc.id, e.message);
          timestamp = new Date().toISOString(); // 현재 시간으로 fallback
        }
      }
      
      errors.push({
        id: doc.id,
        message: data.message || '메시지 없음',
        stack: data.stack || '',
        code: data.code || 'UNKNOWN',
        severity: data.severity || 'error',
        functionName: data.functionName || '알 수 없음',
        userId: data.userId || null,
        userAgent: data.userAgent || null,
        ipAddress: data.ipAddress || null,
        environment: data.environment || 'production',
        buildVersion: data.buildVersion || null,
        timestamp: timestamp,
        requestData: data.requestData || null
      });
    });
    
    console.log('✅ 에러 로그 조회 성공:', { count: errors.length });
    
    res.json({
      success: true,
      data: {
        errors: errors,
        total: errors.length,
        limit: limit
      }
    });
    
  } catch (error) {
    console.error('❌ getErrorLogs 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: 'internal', 
      message: '에러 로그 조회에 실패했습니다: ' + error.message 
    });
  }
});

exports.getNotices = onRequest({
  region: 'asia-northeast3',
  cors: true  
}, async (req, res) => {
  try {
    // CORS 헤더 명시적 설정
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    console.log('🔥 getNotices 시작');
    res.json({ success: true, notices: [] });
  } catch (error) {
    console.error('❌ getNotices 오류:', error);
    res.status(500).json({ success: false, error: 'internal', message: '서버 내부 오류가 발생했습니다.' });
  }
});

exports.getUsers = onRequest({
  region: 'asia-northeast3',
  cors: true  
}, async (req, res) => {
  try {
    // CORS 헤더 명시적 설정
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    console.log('🔥 getUsers 시작');
    
    // 실제 Firestore에서 사용자 데이터 가져오기
    const { admin, db } = require('./utils/firebaseAdmin');
    
    const reqData = req.body || {};
    const limit = reqData.limit || 100;
    const orderBy = reqData.orderBy || 'createdAt';
    const orderDirection = reqData.orderDirection || 'desc';
    
    console.log('📊 사용자 목록 조회 파라미터:', { limit, orderBy, orderDirection });
    
    let query = db.collection('users')
      .orderBy(orderBy, orderDirection)
      .limit(Math.min(limit, 200)); // 최대 200명까지 제한
    
    const snapshot = await query.get();
    
    const users = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // 디버깅을 위해 첫 번째 사용자의 전체 데이터 구조 로깅
      if (users.length === 0) {
        console.log('🔍 첫 번째 사용자 데이터 구조:', JSON.stringify(data, null, 2));
        console.log('🔍 사용 가능한 필드들:', Object.keys(data));
      }
      
      // 이메일 필드에서 직접 가져오기 (없으면 'no email' 표시)
      const finalEmail = data.email || '이메일 없음';

      users.push({
        uid: doc.id,
        name: data.name || data.displayName || '이름 없음',
        email: finalEmail,
        electoralDistrict: data.electoralDistrict || data.district || '선거구 미설정',
        status: data.status || '상태 미설정',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        // 추가 정보
        phone: data.phone || data.phoneNumber || '',
        role: data.role || 'user',
        isActive: data.isActive !== false,
        lastLoginAt: data.lastLoginAt?.toDate?.()?.toISOString(),
        profileComplete: data.profileComplete || false,
        // 디버깅용 원본 데이터 일부 포함
        _debug: {
          docId: doc.id,
          allFields: Object.keys(data).sort(),
          emailFields: Object.keys(data).filter(key => key.toLowerCase().includes('email') || key.toLowerCase().includes('mail'))
        }
      });
    });
    
    console.log('✅ 사용자 목록 조회 성공:', { count: users.length });
    
    res.json({ 
      success: true, 
      users: users,
      total: users.length,
      limit: limit
    });
  } catch (error) {
    console.error('❌ getUsers 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: 'internal', 
      message: '사용자 목록 조회에 실패했습니다: ' + error.message 
    });
  }
});

// 중복 선거구 진단 및 수정 함수
exports.fixDuplicateDistricts = onRequest({
  region: 'asia-northeast3',
  cors: true
}, async (req, res) => {
  try {
    // CORS 헤더 명시적 설정
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    console.log('🔥 중복 선거구 진단 및 수정 시작');
    
    const { admin, db } = require('./utils/firebaseAdmin');
    
    // 모든 사용자 가져오기
    const usersSnapshot = await db.collection('users').get();
    const usersByDistrict = {};
    const duplicates = [];
    
    // 선거구별로 사용자 그룹핑
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.electoralDistrict && data.position && data.regionMetro && data.regionLocal) {
        try {
          const key = districtKey({
            position: data.position,
            regionMetro: data.regionMetro,
            regionLocal: data.regionLocal,
            electoralDistrict: data.electoralDistrict
          });
          
          if (!usersByDistrict[key]) {
            usersByDistrict[key] = [];
          }
          
          usersByDistrict[key].push({
            uid: doc.id,
            name: data.name,
            email: data.email || '이메일 없음',
            createdAt: data.createdAt?.toDate?.()?.getTime() || 0,
            districtKey: key,
            electoralDistrict: data.electoralDistrict
          });
        } catch (error) {
          console.warn('선거구 키 생성 실패:', doc.id, error.message);
        }
      }
    });
    
    // 중복 찾기
    for (const [key, users] of Object.entries(usersByDistrict)) {
      if (users.length > 1) {
        duplicates.push({
          districtKey: key,
          users: users,
          count: users.length
        });
      }
    }
    
    console.log('📊 중복 선거구 발견:', duplicates.length);
    
    // district_claims 상태 확인
    const claimsSnapshot = await db.collection('district_claims').get();
    const claims = {};
    claimsSnapshot.forEach(doc => {
      claims[doc.id] = doc.data();
    });
    
    console.log('📋 district_claims 현황:', Object.keys(claims).length + '개');
    
    // 수정 모드인 경우 실제 수정 수행
    const shouldFix = req.body?.fix === true;
    let fixResults = [];
    
    if (shouldFix && duplicates.length > 0) {
      console.log('🔧 선착순 원칙으로 중복 선거구 수정 시작');
      
      for (const duplicate of duplicates) {
        const { districtKey: key, users } = duplicate;
        
        // 선착순 정렬 (createdAt 기준 오름차순)
        const sortedUsers = users.sort((a, b) => a.createdAt - b.createdAt);
        const keeper = sortedUsers[0]; // 가장 먼저 가입한 사용자
        const toRemove = sortedUsers.slice(1); // 나머지 사용자들
        
        console.log(`📍 ${key}:`, {
          keeper: keeper.name,
          toRemove: toRemove.map(u => u.name)
        });
        
        try {
          // 1. district_claims에서 선착순 사용자로 업데이트
          await db.collection('district_claims').doc(key).set({
            userId: keeper.uid,
            claimedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            fixedAt: admin.firestore.FieldValue.serverTimestamp(),
            fixReason: '선착순 원칙 적용'
          });
          
          // 2. 제거될 사용자들의 선거구 정보 초기화
          const batch = db.batch();
          for (const user of toRemove) {
            const userRef = db.collection('users').doc(user.uid);
            batch.update(userRef, {
              electoralDistrict: '',
              districtKey: null,
              districtConflictAt: admin.firestore.FieldValue.serverTimestamp(),
              districtConflictReason: `선착순 원칙에 의해 ${keeper.name}에게 양보됨`
            });
          }
          await batch.commit();
          
          fixResults.push({
            districtKey: key,
            keeper: keeper,
            removed: toRemove,
            success: true
          });
          
        } catch (error) {
          console.error(`❌ ${key} 수정 실패:`, error);
          fixResults.push({
            districtKey: key,
            error: error.message,
            success: false
          });
        }
      }
      
      console.log('✅ 중복 선거구 수정 완료:', fixResults.length);
    }

    res.json({
      success: true,
      message: shouldFix ? '중복 선거구 수정 완료' : '중복 선거구 진단 완료',
      duplicates: duplicates,
      districtClaims: claims,
      totalUsers: usersSnapshot.size,
      duplicateCount: duplicates.length,
      fixed: shouldFix,
      fixResults: fixResults
    });
    
  } catch (error) {
    console.error('❌ fixDuplicateDistricts 오류:', error);
    res.status(500).json({
      success: false,
      error: 'internal',
      message: '중복 선거구 진단 실패: ' + error.message
    });
  }
});

// 시스템 상태 함수 (HTTP 함수로 변경)
exports.getSystemStatus = onRequest({
  region: 'asia-northeast3',
  cors: true
}, async (req, res) => {
  try {
    // CORS 헤더 명시적 설정
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    console.log('🔥 getSystemStatus 시작');
    
    const { admin, db } = require('./utils/firebaseAdmin');
    
    // Firestore에서 시스템 상태 조회
    const systemStatusDoc = await db.collection('system_status').doc('current').get();
    let status = 'operational'; // 기본값
    let maintenanceInfo = null;
    let reason = '';
    
    if (systemStatusDoc.exists) {
      const data = systemStatusDoc.data();
      status = data.status || 'operational';
      maintenanceInfo = data.maintenanceInfo || null;
      reason = data.reason || '';
      console.log('📋 Firestore에서 상태 조회:', { status, hasMaintenanceInfo: !!maintenanceInfo });
    } else {
      console.log('⚠️ 시스템 상태 문서가 존재하지 않음 - 기본값 사용');
    }
    
    res.json({
      success: true,
      status: status,
      reason: reason,
      maintenanceInfo: maintenanceInfo,
      timestamp: new Date().toISOString(),
      services: {
        functions: 'operational',
        firestore: 'operational',
        auth: 'operational'
      }
    });
    
  } catch (error) {
    console.error('❌ getSystemStatus 오류:', error);
    res.status(500).json({
      success: false,
      error: 'internal',
      message: '시스템 상태 확인에 실패했습니다: ' + error.message
    });
  }
});

// 시스템 상태 업데이트 함수 (HTTP 함수로 변경)
exports.updateSystemStatus = onRequest({
  region: 'asia-northeast3',
  cors: true
}, async (req, res) => {
  try {
    // CORS 헤더 명시적 설정
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    console.log('🔥 updateSystemStatus 시작');
    console.log('📊 요청 데이터:', JSON.stringify(req.body, null, 2));
    
    const { admin, db } = require('./utils/firebaseAdmin');
    const reqData = req.body || {};
    const { status, reason, maintenanceInfo } = reqData;
    
    console.log('🔍 파싱된 데이터:', { status, reason, hasStatus: !!status });
    
    if (!status) {
      console.log('❌ 상태 필드 누락');
      return res.status(400).json({
        success: false,
        error: 'invalid-argument',
        message: '상태가 필요합니다.'
      });
    }
    
    // 시스템 상태 업데이트 (system_status 컬렉션에 저장)
    const statusUpdate = {
      status: status,
      reason: reason || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      timestamp: new Date().toISOString()
    };

    // 점검 중인 경우 추가 정보 저장
    if (status === 'maintenance' && maintenanceInfo) {
      statusUpdate.maintenanceInfo = maintenanceInfo;
    }

    await db.collection('system_status').doc('current').set(statusUpdate, { merge: true });
    
    console.log('✅ 시스템 상태 업데이트 완료:', { status, reason });
    
    res.json({
      success: true,
      message: '시스템 상태가 업데이트되었습니다.',
      status: status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ updateSystemStatus 오류:', error);
    res.status(500).json({
      success: false,
      error: 'internal',
      message: '시스템 상태 업데이트에 실패했습니다: ' + error.message
    });
  }
});

// 기존 함수들의 호환성을 위한 간단한 구현
exports.generatePost = postsHandler.generatePosts;
exports.regeneratePost = postsHandler.generatePosts;
exports.saveSelectedPost = postsHandler.saveSelectedPost;
exports.savePost = postsHandler.saveSelectedPost; // 프론트엔드에서 savePost로 호출하므로 추가

exports.getUserMetadata = onCall(fastConfig, (req) => {
  throw new HttpsError('unimplemented', '가챠뽑기 시스템으로 재구현 예정입니다.');
});

// deletePost HTTP 함수 (CORS 문제 해결)
const { httpWrap } = require('./common/http-wrap');

exports.deletePost = httpWrap(async (request) => {
  const { admin, db } = require('./utils/firebaseAdmin');
  const { HttpsError } = require('firebase-functions/v2/https');
  
  console.log('🔥 deletePost HTTP 시작');
  console.log('📋 Request data:', JSON.stringify(request.data));
  console.log('📋 Raw request body:', JSON.stringify(request.rawRequest.body));
  
  // Authorization 헤더에서 토큰 추출
  const authHeader = request.rawRequest.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HttpsError('unauthenticated', '인증이 필요합니다.');
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  let decodedToken;
  
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (authError) {
    console.error('토큰 검증 실패:', authError);
    throw new HttpsError('unauthenticated', '유효하지 않은 토큰입니다.');
  }
  
  const uid = decodedToken.uid;
  // Firebase SDK 스타일 응답에서 data 필드를 추출
  const postId = request.data?.data?.postId || request.data?.postId;
  
  console.log('📋 Extracted postId:', postId);
  
  if (!postId) {
    throw new HttpsError('invalid-argument', 'postId가 필요합니다.');
  }
  
  // 게시물 조회 및 소유자 확인
  const postDoc = await db.collection('posts').doc(postId).get();
  
  if (!postDoc.exists) {
    throw new HttpsError('not-found', '게시물을 찾을 수 없습니다.');
  }
  
  const postData = postDoc.data();
  if (postData.userId !== uid) {
    throw new HttpsError('permission-denied', '삭제 권한이 없습니다.');
  }
  
  // 게시물 삭제
  await db.collection('posts').doc(postId).delete();
  
  console.log('✅ deletePost 성공:', postId);
  
  return { success: true, postId };
});

// 사용자 프로필 업데이트 트리거 (프로필 핸들러에서 이동)
exports.analyzeUserProfile = onDocumentUpdated({
  document: 'users/{userId}',
  memory: '1GiB',
  timeoutSeconds: 300
}, async (event) => {
  console.log('사용자 프로필 트리거 호출됨 (구현 예정)');
  return null;
});