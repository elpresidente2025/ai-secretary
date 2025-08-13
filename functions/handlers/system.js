'use strict';

const { wrap } = require('../common/wrap');
const { ok } = require('../common/response');
const { auth } = require('../common/auth');
const { log } = require('../common/log');
const { admin, db } = require('../utils/firebaseAdmin');
const { callGeminiWithBackup } = require('../services/ai');
const { testPrompt, getPolicySafe } = require('../templates/prompts');

// 헬스체크
exports.healthCheck = wrap(async () => {
  log('HEALTH', '상태 확인');
  return ok({ message: 'AI비서관 서비스가 정상 작동 중입니다.', timestamp: new Date().toISOString() });
});

// 대시보드 데이터 (인덱스 미생성 시 안전한 폴백)
exports.getDashboardData = wrap(async (req) => {
  const { uid } = auth(req);
  log('DASHBOARD', 'getDashboardData 호출', { userId: uid });

  try {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonthPostsSnapshot = await db.collection('posts')
      .where('userId', '==', uid)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thisMonth))
      .get();

    const usage = {
      postsGenerated: thisMonthPostsSnapshot.size,
      monthlyLimit: 50,
      lastGenerated: null,
    };

    const recentPostsSnapshot = await db.collection('posts')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const recentPosts = recentPostsSnapshot.docs.map((doc) => {
      const d = doc.data() || {};
      return {
        id: doc.id,
        title: d.title || '제목 없음',
        category: d.category || '일반',
        status: d.status || 'draft',
        createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
      };
    });

    if (recentPosts.length > 0) usage.lastGenerated = recentPosts[0].createdAt;

    log('DASHBOARD', '성공', { thisMonthPosts: usage.postsGenerated, totalRecent: recentPosts.length });
    return ok({ usage, recentPosts });
  } catch (error) {
    log('DASHBOARD', '오류', { code: error?.code, message: error?.message });

    const codeStr = String(error?.code || '').toLowerCase();
    const isIndexIssue =
      codeStr === 'failed-precondition' ||
      codeStr === 'failed_precondition' ||
      codeStr === '9' ||
      /index/i.test(error?.message || '');

    if (isIndexIssue) {
      log('DASHBOARD', '인덱스 없음 → 기본값 반환');
      return ok({
        usage: { postsGenerated: 0, monthlyLimit: 50, lastGenerated: null },
        recentPosts: [],
      });
    }

    throw error;
  }
});

// 프롬프트 테스트
exports.testPrompt = wrap(async (req) => {
  const { uid } = auth(req);
  const { prompt } = req.data || {};
  log('DEBUG', 'testPrompt 호출', { userId: uid });

  if (!prompt) throw new (require('firebase-functions/v2/https').HttpsError)('invalid-argument', '테스트할 프롬프트를 입력해주세요.');

  const apiResponse = await callGeminiWithBackup(prompt);
  const responseText = apiResponse?.response?.text ? apiResponse.response.text() : '';

  log('DEBUG', 'testPrompt 성공', { responseLength: responseText.length });
  return ok({ prompt, response: responseText, timestamp: new Date().toISOString() });
});

// Gemini 상태
exports.checkGeminiStatus = wrap(async () => {
  log('SYSTEM', 'checkGeminiStatus 호출');

  try {
    const t = testPrompt();
    const apiResponse = await callGeminiWithBackup(t);
    const responseText = apiResponse?.response?.text ? apiResponse.response.text() : '';

    await db.collection('system').doc('status').set({
      gemini: {
        state: 'healthy',
        lastChecked: admin.firestore.FieldValue.serverTimestamp(),
        testResponse: String(responseText).substring(0, 100),
      },
    }, { merge: true });

    log('SYSTEM', '정상');
    return ok({ status: 'healthy', message: 'Gemini API가 정상적으로 작동합니다.', testResponse: String(responseText).substring(0, 100) });
  } catch (error) {
    await db.collection('system').doc('status').set({
      gemini: {
        state: 'error',
        lastChecked: admin.firestore.FieldValue.serverTimestamp(),
        error: error.message,
      },
    }, { merge: true });

    log('SYSTEM', '오류', error.message);
    return ok({ status: 'error', message: 'Gemini API에 문제가 있습니다.', error: error.message });
  }
});

// 정책 템플릿
exports.getPolicyTemplate = wrap(async (req) => {
  const { category, subCategory } = req.data || {};
  log('POLICY', 'getPolicyTemplate 호출', { category, subCategory });

  const template = getPolicySafe(category, subCategory);
  log('POLICY', '성공');
  return ok({ template, category, subCategory });
});

// 사용자 활동 로그
exports.logUserActivity = wrap(async (req) => {
  const { uid } = auth(req);
  const { action, metadata } = req.data || {};
  if (!action) throw new (require('firebase-functions/v2/https').HttpsError)('invalid-argument', '활동 유형을 지정해주세요.');

  try {
    await db.collection('user_activities').add({
      userId: uid,
      action,
      metadata: metadata || {},
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userAgent: req.auth?.token?.ua || null,
      ip: req.auth?.token?.ip || null,
    });

    await db.collection('users').doc(uid).set({ lastActivity: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

    log('ACTIVITY', '저장', { userId: uid, action });
    return ok({ message: '활동이 기록되었습니다.' });
  } catch (e) {
    log('ACTIVITY', '실패(무시)', e.message);
    return ok({ message: '완료되었습니다.' });
  }
});
