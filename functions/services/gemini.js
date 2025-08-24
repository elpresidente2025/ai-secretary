/**
 * functions/services/gemini.js
 * Google Gemini AI 모델과의 통신을 전담하는 서비스 모듈입니다.
 * API 호출, 재시도 로직, 에러 처리 등을 담당합니다.
 */

'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const functions = require('firebase-functions');
const { logError } = require('../common/log');

// Gemini API 키는 환경 변수 또는 Secret Manager를 통해 안전하게 관리됩니다.
const API_KEY = process.env.GEMINI_API_KEY;

/**
 * @function callGenerativeModel
 * @description 주어진 프롬프트로 Gemini 모델을 호출하고, 텍스트 응답을 반환합니다.
 * @param {string} prompt - AI 모델에게 전달할 프롬프트
 * @param {number} retries - 실패 시 재시도 횟수
 * @returns {Promise<string>} - AI가 생성한 텍스트
 */
async function callGenerativeModel(prompt, retries = 3) {
  if (!API_KEY) {
    logError('callGenerativeModel', 'Gemini API 키가 설정되지 않았습니다.');
    throw new functions.https.HttpsError('internal', 'AI 서비스 설정에 오류가 발생했습니다.');
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json', // JSON 출력을 명시적으로 요구
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🤖 Gemini API 호출 시도 (${attempt}/${retries})`);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text || text.trim().length === 0) {
        throw new Error('Gemini API가 빈 응답을 반환했습니다.');
      }

      console.log(`✅ Gemini API 응답 성공 (${text.length}자)`);
      return text;

    } catch (error) {
      logError('callGenerativeModel', `Gemini API 시도 ${attempt} 실패`, { error: error.message });
      if (attempt === retries) {
        // 마지막 시도에서도 실패하면 에러를 던짐
        throw new functions.https.HttpsError('unavailable', 'AI 모델 호출에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
      // 재시도 전 잠시 대기 (Exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

module.exports = {
  callGenerativeModel,
};
