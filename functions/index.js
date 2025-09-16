/**
 * functions/index.js (媛꾩냼?붾맂 吏꾩엯??
 * 湲곗〈 ?몃뱾??援ъ“瑜??ъ슜?섏뿬 ?덉젙?곸씤 諛고룷瑜??꾪븳 吏꾩엯?먯엯?덈떎.
 */

'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');

// ?꾩뿭 ?ㅼ젙
setGlobalOptions({ region: 'asia-northeast3' });

// 媛??몃뱾??紐⑤뱢 ?꾪룷??
const postsHandler = require('./handlers/posts');
const profileHandler = require('./handlers/profile');
const bioHandler = require('./handlers/bio');
const dashboardHandler = require('./handlers/dashboard');
const noticesHandler = require('./handlers/notices');
const adminHandler = require('./handlers/admin');
const performanceHandler = require('./handlers/performance');
let systemHandler;
try {
  systemHandler = require('./handlers/system');
} catch (e) {
  // Fallback to clean implementation if legacy file has encoding issues
  systemHandler = require('./handlers/system.clean');
}
const publishingHandler = require('./handlers/publishing');
const adminUsersHandler = require('./handlers/admin-users');
const snsAddonHandler = require('./handlers/sns-addon');
const tossPaymentsHandler = require('./handlers/toss-payments');
const naverLoginHandler = require('./handlers/naver-login2');
const usernameHandler = require('./handlers/username');

// ?ㅽ겕?섑븨 ?뚯뒪???⑥닔??
const { testElectionScraping, checkCacheStatus, refreshCache } = require('./handlers/test-scraper');
const { debugElection } = require('./handlers/debug-election');

// 寃뚯떆臾?愿???⑥닔??(?대? wrap?쇰줈 onCall???곸슜??
exports.getUserPosts = postsHandler.getUserPosts;
exports.getPost = postsHandler.getPost;
exports.updatePost = postsHandler.updatePost;
// deletePost??HTTP ?⑥닔濡?蹂꾨룄 援ы쁽 (CORS 臾몄젣 ?닿껐)
exports.checkUsageLimit = postsHandler.checkUsageLimit;
// generatePosts??HTTP ?⑥닔濡?蹂꾨룄 援ы쁽??
exports.generatePosts = postsHandler.generatePosts;

// ?꾨줈??愿???⑥닔??(?대? wrap?쇰줈 onCall???곸슜??
exports.getUserProfile = profileHandler.getUserProfile;
exports.updateProfile = profileHandler.updateProfile;
exports.updateUserPlan = profileHandler.updateUserPlan;
exports.checkDistrictAvailability = profileHandler.checkDistrictAvailability;
exports.registerWithDistrictCheck = profileHandler.registerWithDistrictCheck;

// 愿由ъ옄???좉굅援?愿由??⑥닔??
const { forceReleaseDistrict, getDistrictStatus } = require('./services/district');
const { wrap } = require('./common/wrap');

exports.forceReleaseDistrict = wrap(async (req) => {
  const { districtKey } = req.data || {};
  const { uid } = await require('./common/auth').auth(req);
  return forceReleaseDistrict({ districtKey, requestedByUid: uid });
});

exports.getDistrictStatus = wrap(async (req) => {
  const { districtKey } = req.data || {};
  return getDistrictStatus(districtKey);
});

// 怨좎븘 ?좉굅援?湲곕줉 ?쇨큵 ?뺣━ (愿由ъ옄??
exports.cleanupOrphanedDistricts = wrap(async (req) => {
  const { uid } = await require('./common/auth').auth(req);
  

  try {
    const claimsSnapshot = await db.collection('district_claims').get();
    const usersSnapshot = await db.collection('users').get();

    // ?꾩옱 議댁옱?섎뒗 ?ъ슜??UID 紐⑸줉
    const existingUsers = new Set();
    usersSnapshot.forEach(doc => existingUsers.add(doc.id));

    // ??젣??怨좎븘 湲곕줉??
    const orphanedClaims = [];
    const batch = db.batch();

    claimsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.userId && !existingUsers.has(data.userId)) {
        orphanedClaims.push({
          districtKey: doc.id,
          userId: data.userId
        });
        batch.delete(doc.ref);
      }
    });

    if (orphanedClaims.length > 0) {
      await batch.commit();
      
    } else {
      
    }

    return {
      success: true,
      cleanedCount: orphanedClaims.length,
      orphanedClaims
    };

  } catch (error) {
    /* log removed */
    throw error;
  }
});

// Bio 愿???⑥닔??(?덈줈 異붽?)
exports.getUserBio = bioHandler.getUserBio;
exports.updateUserBio = bioHandler.updateUserBio;
exports.updateBioEntry = bioHandler.updateBioEntry;
exports.deleteBioEntry = bioHandler.deleteBioEntry;

// ?ъ슜??怨꾩젙 愿由??⑥닔??
const userManagementHandler = require('./handlers/user-management');
exports.deleteUserAccount = userManagementHandler.deleteUserAccount;
exports.sendPasswordResetEmail = userManagementHandler.sendPasswordResetEmail;
exports.deleteUserBio = bioHandler.deleteUserBio;
exports.reanalyzeBioMetadata = bioHandler.reanalyzeBioMetadata;
exports.onBioUpdate = bioHandler.onBioUpdate;

// ??쒕낫??愿???⑥닔??(?대? wrap?쇰줈 onCall???곸슜??
exports.getDashboardData = dashboardHandler.getDashboardData;

// 怨듭??ы빆 愿???⑥닔??(?대? wrap?쇰줈 onCall???곸슜??
exports.getActiveNotices = noticesHandler.getActiveNotices;

// 愿由ъ옄 愿???⑥닔??(?대? wrap?쇰줈 onCall???곸슜??
exports.syncDistrictKey = adminHandler.syncDistrictKey;

// ?ㅽ겕?섑븨 ?뚯뒪???⑥닔??(媛쒕컻/?뚯뒪?몄슜)
exports.testElectionScraping = testElectionScraping;
exports.checkCacheStatus = checkCacheStatus;
exports.refreshCache = refreshCache;
exports.debugElection = debugElection;

// ?깅뒫 紐⑤땲?곕쭅 愿???⑥닔??
exports.getPerformanceMetrics = performanceHandler.getPerformanceMetrics;

// 諛쒗뻾 諛?寃뚯씠誘명뵾耳?댁뀡 愿???⑥닔??
exports.publishPost = publishingHandler.publishPost;
exports.getPublishingStats = publishingHandler.getPublishingStats;
exports.checkBonusEligibility = publishingHandler.checkBonusEligibility;
exports.useBonusGeneration = publishingHandler.useBonusGeneration;

// 愿由ъ옄 ?ъ슜??愿由??⑥닔??
exports.getAllUsers = adminUsersHandler.getAllUsers;
exports.deactivateUser = adminUsersHandler.deactivateUser;
exports.reactivateUser = adminUsersHandler.reactivateUser;
exports.deleteUser = adminUsersHandler.deleteUser;

// SNS ?좊뱶??愿???⑥닔??
exports.testSNS = snsAddonHandler.testSNS;
exports.convertToSNS = snsAddonHandler.convertToSNS;
exports.getSNSUsage = snsAddonHandler.getSNSUsage;
exports.purchaseSNSAddon = snsAddonHandler.purchaseSNSAddon;

// ?좎뒪?섏씠癒쇱툩 寃곗젣 愿???⑥닔??
exports.confirmTossPayment = tossPaymentsHandler.confirmTossPayment;
exports.getUserPayments = tossPaymentsHandler.getUserPayments;

// ?ㅼ씠踰?濡쒓렇??愿???⑥닔??(HTTP ?⑥닔)
exports.naverLogin = naverLoginHandler.naverLogin;
exports.naverLoginHTTP = naverLoginHandler.naverLoginHTTP;
exports.naverCompleteRegistration = naverLoginHandler.naverCompleteRegistration;
exports.checkUsername = usernameHandler.checkUsername;
exports.claimUsername = usernameHandler.claimUsername;

// ?ㅼ씠踰?濡쒓렇???뚯뒪???⑥닔 (?붾쾭源낆슜)
exports.naverTest = require('firebase-functions/v2/https').onRequest({
  region: 'asia-northeast3',
  cors: true
}, async (req, res) => {
  try {
    res.set('Access-Control-Allow-Origin', 'https://cyberbrain.kr');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    
    

    const testData = {
      timestamp: new Date().toISOString(),
      environment: {
        naverClientId: !!process.env.NAVER_CLIENT_ID,
        naverClientSecret: !!process.env.NAVER_CLIENT_SECRET,
        nodeVersion: process.version
      },
      request: {
        method: req.method,
        body: req.body,
        headers: Object.keys(req.headers)
      }
    };
    
    
    
    res.json({ 
      success: true, 
      message: '?ㅼ씠踰??뚯뒪???⑥닔 ?뺤긽 ?숈옉',
      data: testData
    });
    
  } catch (error) {
    /* log removed */
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
});

// ?ㅼ씠踰??곌껐 ?딄린 肄쒕갚 ?⑥닔
const naverDisconnectHandler = require('./handlers/naver-disconnect');
exports.naverDisconnect = naverDisconnectHandler.naverDisconnect;

// 愿由ъ옄 ?꾩슜 ?⑥닔??(HTTP ?⑥닔濡?蹂寃쏀븯??CORS 臾몄젣 ?닿껐)
const { onRequest } = require('firebase-functions/v2/https');
const { districtKey } = require('./services/district');

exports.getAdminStats = onRequest({
  region: 'asia-northeast3',
  cors: true
}, async (req, res) => {
  try {
    // CORS ?ㅻ뜑 紐낆떆???ㅼ젙
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    

    const { admin, db } = require('./utils/firebaseAdmin');
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last30mStart = new Date(now.getTime() - 30 * 60 * 1000);
    const last7dStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 蹂묐젹濡?紐⑤뱺 ?듦퀎 ?곗씠???섏쭛
    const [todayPostsSnapshot, last30mErrorsSnapshot, last7dUsersSnapshot, geminiStatusDoc] = await Promise.all([
      // ?ㅻ뒛 ?앹꽦??臾몄꽌
      db.collection('posts')
        .where('createdAt', '>=', todayStart)
        .get(),

      // 理쒓렐 30遺??먮윭 濡쒓렇
      db.collection('error_logs')
        .where('timestamp', '>=', last30mStart)
        .get(),

      // 理쒓렐 7???쒖꽦 ?ъ슜??(濡쒓렇?명븳 ?ъ슜??
      db.collection('users')
        .where('lastLoginAt', '>=', last7dStart)
        .get(),

      // Gemini API ?곹깭
      db.collection('system_status').doc('gemini').get()
    ]);

    // ?ㅻ뒛 臾몄꽌 ?앹꽦 ?깃났/?ㅽ뙣 ?듦퀎
    let todaySuccess = 0;
    let todayFail = 0;

    todayPostsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.status === 'completed' || data.status === 'published') {
        todaySuccess++;
      } else if (data.status === 'failed' || data.status === 'error') {
        todayFail++;
      }
    });

    // Gemini ?곹깭 泥섎━
    let geminiStatus = { state: 'active' }; // 湲곕낯媛믪쓣 active濡?蹂寃?
    if (geminiStatusDoc.exists) {
      const statusData = geminiStatusDoc.data();
      geminiStatus = {
        state: statusData.state || 'active',
        lastUpdated: statusData.lastUpdated || null,
        message: statusData.message || null
      };
    } else {
      // 臾몄꽌媛 ?놁쑝硫??먮룞?쇰줈 active ?곹깭濡?珥덇린??
      await db.collection('system_status').doc('gemini').set({
        state: 'active',
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        message: 'System initialized'
      });
      geminiStatus = {
        state: 'active',
        lastUpdated: new Date(),
        message: 'System initialized'
      };
    }

    const stats = {
      todaySuccess,
      todayFail,
      last30mErrors: last30mErrorsSnapshot.size,
      activeUsers: last7dUsersSnapshot.size,
      geminiStatus,
      timestamp: now.toISOString()
    };

    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    /* log removed */
    res.status(500).json({
      success: false,
      error: 'internal',
      message: '?쒕쾭 ?대? ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.',
      // ?먮윭 ??湲곕낯媛?諛섑솚
      data: {
        todaySuccess: 0,
        todayFail: 0,
        last30mErrors: 0,
        activeUsers: 0,
        geminiStatus: { state: 'unknown' }
      }
    });
  }
});

// ?쒖뒪???곹깭 愿??(Gemini ?곹깭 ?섎룞 ?낅뜲?댄듃 - onCall)
exports.updateGeminiStatus = systemHandler.updateGeminiStatus;

exports.getErrorLogs = onRequest({
  region: 'asia-northeast3', 
  cors: true
}, async (req, res) => {
  try {
    // CORS ?ㅻ뜑 紐낆떆???ㅼ젙
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    
    
    const { db } = require('./utils/firebaseAdmin');
    
    // ?붿껌 ?뚮씪誘명꽣 ?뚯떛
    const reqData = req.body || {};
    const limit = Math.min(reqData.limit || 50, 200); // 理쒕? 200媛쒓퉴吏
    const severity = reqData.severity; // 'critical', 'error', 'warning' ?꾪꽣
    const functionName = reqData.functionName; // ?뱀젙 ?⑥닔 ?꾪꽣
    
    
    
    // Firestore?먯꽌 ?먮윭 濡쒓렇 議고쉶
    let query = db.collection('error_logs')
      .orderBy('timestamp', 'desc')
      .limit(limit);
    
    // ?꾪꽣 ?곸슜
    if (severity) {
      query = query.where('severity', '==', severity);
    }
    
    if (functionName) {
      query = query.where('functionName', '==', functionName);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      
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
      
      // ??꾩뒪?ы봽 蹂??
      let timestamp = null;
      if (data.timestamp) {
        try {
          // Firestore Timestamp 媛앹껜??寃쎌슦
          if (data.timestamp.toDate) {
            timestamp = data.timestamp.toDate().toISOString();
          } 
          // ?대? ISO 臾몄옄?댁씤 寃쎌슦
          else if (typeof data.timestamp === 'string') {
            timestamp = data.timestamp;
          }
          // 諛由ъ큹 ?レ옄??寃쎌슦
          else if (typeof data.timestamp === 'number') {
            timestamp = new Date(data.timestamp).toISOString();
          }
        } catch (e) {
          /* log removed */
          timestamp = new Date().toISOString(); // ?꾩옱 ?쒓컙?쇰줈 fallback
        }
      }
      
      errors.push({
        id: doc.id,
        message: data.message || '硫붿떆吏 ?놁쓬',
        stack: data.stack || '',
        code: data.code || 'UNKNOWN',
        severity: data.severity || 'error',
        functionName: data.functionName || '?????놁쓬',
        userId: data.userId || null,
        userAgent: data.userAgent || null,
        ipAddress: data.ipAddress || null,
        environment: data.environment || 'production',
        buildVersion: data.buildVersion || null,
        timestamp: timestamp,
        requestData: data.requestData || null
      });
    });
    
    
    
    res.json({
      success: true,
      data: {
        errors: errors,
        total: errors.length,
        limit: limit
      }
    });
    
  } catch (error) {
    /* log removed */
    res.status(500).json({ 
      success: false, 
      error: 'internal', 
      message: '?먮윭 濡쒓렇 議고쉶???ㅽ뙣?덉뒿?덈떎: ' + error.message 
    });
  }
});

exports.getNotices = onRequest({
  region: 'asia-northeast3',
  cors: true  
}, async (req, res) => {
  try {
    // CORS ?ㅻ뜑 紐낆떆???ㅼ젙
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    
    res.json({ success: true, notices: [] });
  } catch (error) {
    /* log removed */
    res.status(500).json({ success: false, error: 'internal', message: '?쒕쾭 ?대? ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.' });
  }
});

exports.getUsers = onRequest({
  region: 'asia-northeast3',
  cors: true  
}, async (req, res) => {
  try {
    // CORS ?ㅻ뜑 紐낆떆???ㅼ젙
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    
    
    // ?ㅼ젣 Firestore?먯꽌 ?ъ슜???곗씠??媛?몄삤湲?
    const { db } = require('./utils/firebaseAdmin');
    
    const reqData = req.body || {};
    const limit = reqData.limit || 100;
    const orderBy = reqData.orderBy || 'createdAt';
    const orderDirection = reqData.orderDirection || 'desc';
    
    
    
    const query = db.collection('users')
      .orderBy(orderBy, orderDirection)
      .limit(Math.min(limit, 200)); // 理쒕? 200紐낃퉴吏 ?쒗븳
    
    const snapshot = await query.get();
    
    const users = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // ?붾쾭源낆쓣 ?꾪빐 泥?踰덉㎏ ?ъ슜?먯쓽 ?꾩껜 ?곗씠??援ъ“ 濡쒓퉭
      if (users.length === 0) {
        /* log removed */
        /* log removed */
      }
      
      users.push({
        uid: doc.id,
        name: data.name || data.displayName || 'Unknown',
        electoralDistrict: data.electoralDistrict || data.district || 'Not set',
        status: data.status || 'Not set',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        // 異붽? ?뺣낫
        phone: data.phone || data.phoneNumber || '',
        role: data.role || 'user',
        isActive: data.isActive !== false,
        lastLoginAt: data.lastLoginAt?.toDate?.()?.toISOString(),
        profileComplete: data.profileComplete || false,
        // ?붾쾭源낆슜 ?먮낯 ?곗씠???쇰? ?ы븿
        _debug: {
          docId: doc.id,
          allFields: Object.keys(data).sort()
        }
      });
    });
    
    
    
    res.json({ 
      success: true, 
      users: users,
      total: users.length,
      limit: limit
    });
  } catch (error) {
    /* log removed */
    res.status(500).json({ 
      success: false, 
      error: 'internal', 
      message: '?ъ슜??紐⑸줉 議고쉶???ㅽ뙣?덉뒿?덈떎: ' + error.message 
    });
  }
});

// 以묐났 ?좉굅援?吏꾨떒 諛??섏젙 ?⑥닔
exports.fixDuplicateDistricts = onRequest({
  region: 'asia-northeast3',
  cors: true
}, async (req, res) => {
  try {
    // CORS ?ㅻ뜑 紐낆떆???ㅼ젙
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    
    
    const { admin, db } = require('./utils/firebaseAdmin');
    
    // 紐⑤뱺 ?ъ슜??媛?몄삤湲?
    const usersSnapshot = await db.collection('users').get();
    const usersByDistrict = {};
    const duplicates = [];
    
    // ?좉굅援щ퀎濡??ъ슜??洹몃９??
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.electoralDistrict && data.position && data.regionMetro && data.regionLocal) {
        try {
          const key = districtKey({
            position: data.position,
            regionMetro: data.regionMetro,
            regionLocal: data.regionLocal,
            electoralDistrict: data.electoralDistrict || data.district || 'Not set',
          });
          
          if (!usersByDistrict[key]) {
            usersByDistrict[key] = [];
          }
          
          usersByDistrict[key].push({
            uid: doc.id,
            name: data.name,
            email: data.email || '?대찓???놁쓬',
            createdAt: data.createdAt?.toDate?.()?.getTime() || 0,
            districtKey: key,
            electoralDistrict: data.electoralDistrict || data.district || 'Not set',
          });
        } catch (error) {
          /* log removed */
        }
      }
    });
    
    // 以묐났 李얘린
    for (const [key, users] of Object.entries(usersByDistrict)) {
      if (users.length > 1) {
        duplicates.push({
          districtKey: key,
          users: users,
          count: users.length
        });
      }
    }
    
    
    
    // district_claims ?곹깭 ?뺤씤
    const claimsSnapshot = await db.collection('district_claims').get();
    const claims = {};
    claimsSnapshot.forEach(doc => {
      claims[doc.id] = doc.data();
    });
    
    /* log removed */
    
    // ?섏젙 紐⑤뱶??寃쎌슦 ?ㅼ젣 ?섏젙 ?섑뻾
    const shouldFix = req.body?.fix === true;
    const fixResults = [];
    
    if (shouldFix && duplicates.length > 0) {
      
      
      for (const duplicate of duplicates) {
        const { districtKey: key, users } = duplicate;
        
        // ?좎갑???뺣젹 (createdAt 湲곗? ?ㅻ쫫李⑥닚)
        const sortedUsers = users.sort((a, b) => a.createdAt - b.createdAt);
        const keeper = sortedUsers[0]; // 媛??癒쇱? 媛?낇븳 ?ъ슜??
        const toRemove = sortedUsers.slice(1); // ?섎㉧吏 ?ъ슜?먮뱾
        
        console.log(`?뱧 ${key}:`, {
          keeper: keeper.name,
          toRemove: toRemove.map(u => u.name)
        });
        
        try {
          // 1. district_claims?먯꽌 ?좎갑???ъ슜?먮줈 ?낅뜲?댄듃
          await db.collection('district_claims').doc(key).set({
            userId: keeper.uid,
            claimedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            fixedAt: admin.firestore.FieldValue.serverTimestamp(),
            fixReason: '?좎갑???먯튃 ?곸슜'
          });
          
          // 2. ?쒓굅???ъ슜?먮뱾???좉굅援??뺣낫 珥덇린??
          const batch = db.batch();
          for (const user of toRemove) {
            const userRef = db.collection('users').doc(user.uid);
            batch.update(userRef, {
              electoralDistrict: data.electoralDistrict || data.district || 'Not set',
              districtKey: null,
              districtConflictAt: admin.firestore.FieldValue.serverTimestamp(),
              districtConflictReason: `?좎갑???먯튃???섑빐 ${keeper.name}?먭쾶 ?묐낫??
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
          /* log removed */
          fixResults.push({
            districtKey: key,
            error: error.message,
            success: false
          });
        }
      }
      
      
    }

    res.json({
      success: true,
      message: shouldFix ? '以묐났 ?좉굅援??섏젙 ?꾨즺' : '以묐났 ?좉굅援?吏꾨떒 ?꾨즺',
      duplicates: duplicates,
      districtClaims: claims,
      totalUsers: usersSnapshot.size,
      duplicateCount: duplicates.length,
      fixed: shouldFix,
      fixResults: fixResults
    });
    
  } catch (error) {
    /* log removed */
    res.status(500).json({
      success: false,
      error: 'internal',
      message: '以묐났 ?좉굅援?吏꾨떒 ?ㅽ뙣: ' + error.message
    });
  }
});

// ?쒖뒪???곹깭 ?⑥닔 (HTTP ?⑥닔濡?蹂寃?
exports.getSystemStatus = onRequest({
  region: 'asia-northeast3',
  cors: true,
  timeoutSeconds: 30
}, async (req, res) => {
  try {
    // CORS ?ㅻ뜑 紐낆떆???ㅼ젙
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    
    
    const { db } = require('./utils/firebaseAdmin');
    
    // Firestore?먯꽌 ?쒖뒪???곹깭 議고쉶
    const systemStatusDoc = await db.collection('system_status').doc('current').get();
    let status = 'operational'; // 湲곕낯媛?
    let maintenanceInfo = null;
    let reason = '';
    
    if (systemStatusDoc.exists) {
      const data = systemStatusDoc.data();
      status = data.status || 'operational';
      maintenanceInfo = data.maintenanceInfo || null;
      reason = data.reason || '';
      
    } else {
      
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
    /* log removed */
    res.status(500).json({
      success: false,
      error: 'internal',
      message: '?쒖뒪???곹깭 ?뺤씤???ㅽ뙣?덉뒿?덈떎: ' + error.message
    });
  }
});

// ?쒖뒪???곹깭 ?낅뜲?댄듃 ?⑥닔 (HTTP ?⑥닔濡?蹂寃?
exports.updateSystemStatus = onRequest({
  region: 'asia-northeast3',
  cors: true
}, async (req, res) => {
  try {
    // CORS ?ㅻ뜑 紐낆떆???ㅼ젙
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    
    /* log removed */
    
    const { admin, db } = require('./utils/firebaseAdmin');
    const reqData = req.body || {};
    const { status, reason, maintenanceInfo } = reqData;
    
    
    
    if (!status) {
      
      return res.status(400).json({
        success: false,
        error: 'invalid-argument',
        message: '?곹깭媛 ?꾩슂?⑸땲??'
      });
    }
    
    // ?쒖뒪???곹깭 ?낅뜲?댄듃 (system_status 而щ젆?섏뿉 ???
    const statusUpdate = {
      status: status,
      reason: reason || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      timestamp: new Date().toISOString()
    };

    // ?먭? 以묒씤 寃쎌슦 異붽? ?뺣낫 ???
    if (status === 'maintenance' && maintenanceInfo) {
      statusUpdate.maintenanceInfo = maintenanceInfo;
    }

    await db.collection('system_status').doc('current').set(statusUpdate, { merge: true });
    
    
    
    res.json({
      success: true,
      message: '?쒖뒪???곹깭媛 ?낅뜲?댄듃?섏뿀?듬땲??',
      status: status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    /* log removed */
    res.status(500).json({
      success: false,
      error: 'internal',
      message: '?쒖뒪???곹깭 ?낅뜲?댄듃???ㅽ뙣?덉뒿?덈떎: ' + error.message
    });
  }
});

// 湲곗〈 ?⑥닔?ㅼ쓽 ?명솚?깆쓣 ?꾪븳 媛꾨떒??援ы쁽
exports.generatePost = postsHandler.generatePosts;
exports.regeneratePost = postsHandler.generatePosts;
exports.saveSelectedPost = postsHandler.saveSelectedPost;
exports.savePost = postsHandler.saveSelectedPost; // ?꾨줎?몄뿏?쒖뿉??savePost濡??몄텧?섎?濡?異붽?

exports.getUserMetadata = onCall({
  cors: true,
  memory: '256MiB',
  timeoutSeconds: 60
},(req) => {
  throw new HttpsError('unimplemented', '媛梨좊퐨湲??쒖뒪?쒖쑝濡??ш뎄???덉젙?낅땲??');
});

// deletePost HTTP ?⑥닔 (CORS 臾몄젣 ?닿껐)
const { httpWrap } = require('./common/http-wrap');

exports.deletePost = httpWrap(async (request) => {
  const { admin, db } = require('./utils/firebaseAdmin');
  const { HttpsError } = require('firebase-functions/v2/https');
  
  
  /* log removed */
  /* log removed */
  
  // Naver-only 인증: __naverAuth에서 uid 추출
  let reqData = request.data || request.rawRequest?.body || {};
  if (reqData && typeof reqData === 'object' && reqData.data && typeof reqData.data === 'object') {
    reqData = reqData.data;
  }
  if (!reqData || !reqData.__naverAuth || reqData.__naverAuth.provider !== 'naver' || !reqData.__naverAuth.uid) {
    throw new HttpsError('unauthenticated', '인증이 필요합니다.');
  }
  const uid = reqData.__naverAuth.uid;
  delete reqData.__naverAuth;
  // postId 추출
  const postId = reqData?.postId || request.data?.data?.postId || request.data?.postId;
  
  
  
  if (!postId) {
    throw new HttpsError('invalid-argument', 'postId媛 ?꾩슂?⑸땲??');
  }
  
  // 寃뚯떆臾?議고쉶 諛??뚯쑀???뺤씤
  const postDoc = await db.collection('posts').doc(postId).get();
  
  if (!postDoc.exists) {
    throw new HttpsError('not-found', '寃뚯떆臾쇱쓣 李얠쓣 ???놁뒿?덈떎.');
  }
  
  const postData = postDoc.data();
  if (postData.userId !== uid) {
    throw new HttpsError('permission-denied', '??젣 沅뚰븳???놁뒿?덈떎.');
  }
  
  // 寃뚯떆臾???젣
  await db.collection('posts').doc(postId).delete();
  
  
  
  return { success: true, postId };
});

// Firestore ?몃━嫄곕뱾
exports.analyzeUserProfileOnUpdate = profileHandler.analyzeUserProfileOnUpdate;
exports.cleanupDistrictClaimsOnUserDelete = profileHandler.cleanupDistrictClaimsOnUserDelete;






