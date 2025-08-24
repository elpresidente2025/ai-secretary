/**
 * functions/index.js
 * AI비서관의 메인 클라우드 함수 엔드포인트입니다.
 * HTTP 요청을 받아 각종 비즈니스 로직을 처리하고 응답합니다.
 * (Firebase Functions v2 SDK 문법 적용)
 */

'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { buildSmartPromptSafe } = require('./templates/prompts');
const { callGenerativeModel } = require('./services/gemini');
const { success } = require('./common/response');
const { verifyToken } = require('./common/auth');
const { logError } = require('./common/log');
const { checkUserRole, ROLES } = require('./common/rbac');

// Firebase 앱 초기화 (중복 호출 방지)
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = getFirestore();

/**
 * @function generatePost
 * @description AI 모델을 사용하여 게시물 초안을 생성하는 메인 함수
 */
exports.generatePost = onCall({ region: 'asia-northeast3' }, async (request) => {
  try {
    // 1. 사용자 인증 및 역할 검증
    // v2에서는 context가 request.auth에 포함됩니다.
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '인증되지 않은 사용자입니다.');
    }
    verifyToken({ auth: request.auth }); // verifyToken이 context 객체를 기대하므로 맞춰줌
    await checkUserRole(request.auth.uid, [ROLES.USER, ROLES.ADMIN]);

    const { options, authorBio } = request.data;
    if (!options || !authorBio) {
      throw new HttpsError('invalid-argument', 'options와 authorBio는 필수입니다.');
    }

    // 2. 사용자 정보와 생성 옵션을 결합
    const fullOptions = {
      ...options,
      authorName: authorBio.name || '정치인',
      authorPosition: authorBio.position || '의원',
      authorBio: JSON.stringify(authorBio, null, 2),
      applyEditorialRules: true, // editorial.js 규칙 기본 적용
    };

    // 3. 지능형 프롬프트 생성
    const prompt = await buildSmartPromptSafe(fullOptions);

    // 4. Gemini 모델 호출
    const rawResult = await callGenerativeModel(prompt);

    // 5. 결과 파싱 및 후처리
    const result = parseGeminiResult(rawResult);

    // 6. 생성된 게시물을 Firestore에 저장
    const postRef = await db.collection('users').doc(request.auth.uid).collection('posts').add({
      ...result,
      prompt,
      options: fullOptions,
      status: 'draft', // 'draft', 'published', 'archived'
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return success({ postId: postRef.id, ...result });

  } catch (err) {
    logError('generatePost', '게시물 생성 실패', err);
    // HttpsError가 아닌 경우, 일반 서버 오류로 변환하여 반환
    if (err instanceof HttpsError) {
      throw err;
    }
    throw new HttpsError('internal', '게시물 생성 중 오류가 발생했습니다.');
  }
});


/**
 * @function parseGeminiResult
 * @description Gemini 모델의 원시 응답을 파싱하고 정제하는 유틸리티 함수
 * @param {string} rawText - 모델이 생성한 원시 텍스트
 * @returns {object} - { title: string, content: string }
 */
function parseGeminiResult(rawText) {
  try {
    // 마크다운 코드 블록 제거 및 앞뒤 공백 제거
    const cleanText = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanText);

    if (typeof parsed.title !== 'string' || typeof parsed.content !== 'string') {
      throw new Error('파싱된 객체에 title 또는 content가 없습니다.');
    }

    return {
      title: parsed.title || '제목 없음',
      content: parsed.content || '<p>내용 없음</p>',
    };
  } catch (e) {
    logError('parseGeminiResult', 'Gemini 결과 파싱 실패', { rawText, error: e.message });
    // 파싱 실패 시, 원본 텍스트를 content로 사용하는 폴백 로직
    return {
      title: '제목 파싱 실패',
      content: `<p>AI 모델의 응답을 처리하는 중 오류가 발생했습니다. 원본 응답은 다음과 같습니다:</p><pre>${rawText}</pre>`,
    };
  }
}
