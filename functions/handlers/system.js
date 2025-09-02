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
  return ok({ message: '전자두뇌비서관 서비스가 정상 작동 중입니다.', timestamp: new Date().toISOString() });
});

// 🔥 getDashboardData 함수 완전 제거 - index.js에서만 처리

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

// Gemini 상태 확인
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
    return ok({ 
      status: 'healthy', 
      message: 'Gemini API가 정상적으로 작동합니다.', 
      testResponse: String(responseText).substring(0, 100) 
    });
  } catch (error) {
    await db.collection('system').doc('status').set({
      gemini: {
        state: 'error',
        lastChecked: admin.firestore.FieldValue.serverTimestamp(),
        error: error.message,
      },
    }, { merge: true });

    log('SYSTEM', '오류', error.message);
    return ok({ 
      status: 'error', 
      message: 'Gemini API에 문제가 있습니다.', 
      error: error.message 
    });
  }
});

// 정책 템플릿 조회
exports.getPolicyTemplate = wrap(async (req) => {
  const { category, subCategory } = req.data || {};
  log('POLICY', 'getPolicyTemplate 호출', { category, subCategory });

  const template = getPolicySafe(category, subCategory);
  log('POLICY', '성공');
  return ok({ template, category, subCategory });
});

// 정책 테스트
exports.testPolicy = wrap(async (req) => {
  const { uid } = auth(req);
  const { policyId, testInput } = req.data || {};
  log('DEBUG', 'testPolicy 호출', { userId: uid, policyId });

  if (!policyId || !testInput) {
    throw new (require('firebase-functions/v2/https').HttpsError)('invalid-argument', '정책 ID와 테스트 입력이 필요합니다.');
  }

  const policyPrompt = getPolicySafe(policyId);
  if (!policyPrompt) {
    throw new (require('firebase-functions/v2/https').HttpsError)('not-found', '해당 정책을 찾을 수 없습니다.');
  }

  const fullPrompt = `${policyPrompt}\n\n테스트 입력: ${testInput}`;
  const apiResponse = await callGeminiWithBackup(fullPrompt);
  const responseText = apiResponse?.response?.text?.() || apiResponse?.text || '응답을 받을 수 없습니다.';

  log('DEBUG', '정책 테스트 완료', { policyId });
  return ok({ 
    policy: policyId, 
    response: responseText, 
    usage: apiResponse?.usage || null 
  });
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

    await db.collection('users').doc(uid).set({ 
      lastActivity: admin.firestore.FieldValue.serverTimestamp() 
    }, { merge: true });

    log('ACTIVITY', '저장', { userId: uid, action });
    return ok({ message: '활동이 기록되었습니다.' });
  } catch (e) {
    log('ACTIVITY', '실패(무시)', e.message);
    return ok({ message: '완료되었습니다.' });
  }
});

// 시스템 상태 전체 조회
exports.getSystemStatus = wrap(async () => {
  log('SYSTEM', 'getSystemStatus 호출');

  try {
    const statusDoc = await db.collection('system').doc('status').get();
    const statusData = statusDoc.exists ? statusDoc.data() : {};

    const systemStatus = {
      timestamp: new Date().toISOString(),
      gemini: statusData.gemini || { state: 'unknown' },
      database: { state: 'healthy' }, // Firestore가 작동하므로 healthy
      version: process.env.FUNCTIONS_EMULATOR ? 'local' : 'production'
    };

    log('SYSTEM', '상태 조회 성공');
    return ok({ status: systemStatus });
  } catch (error) {
    log('SYSTEM', '상태 조회 실패', error.message);
    return ok({ 
      status: { 
        timestamp: new Date().toISOString(),
        gemini: { state: 'unknown' },
        database: { state: 'error', error: error.message },
        version: 'unknown'
      } 
    });
  }
});