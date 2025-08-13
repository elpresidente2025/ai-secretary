'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { HttpsError } = require('firebase-functions/v2/https');

const AI_MODELS = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];

async function callGeminiWithBackup(apiKey, prompt) {
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = null;

  for (const name of AI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: name,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      });

      const res = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, rej) => setTimeout(() => rej(new Error(`${name} 90초 타임아웃`)), 90000)), // ← 여기만 변경
      ]);
      return res;
    } catch (e) {
      lastError = e;

      const msg = String(e?.message || '').toLowerCase();
      const quota = msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted');
      const overload = msg.includes('overloaded') || msg.includes('503');
      const timeout = msg.includes('timeout') || msg.includes('타임아웃');

      if (msg.includes('safety')) {
        throw new HttpsError('invalid-argument', 'AI 안전 정책에 위배되는 내용입니다. 다른 주제로 시도해주세요.');
      }
      if ((quota || overload || timeout) && name !== AI_MODELS[AI_MODELS.length - 1]) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      break;
    }
  }

  const lm = String(lastError?.message || '').toLowerCase();
  if (lm.includes('429') || lm.includes('quota')) {
    throw new HttpsError('resource-exhausted', 'AI 사용량을 초과했습니다. 잠시 후 다시 시도해주세요.');
  }
  if (lm.includes('overloaded') || lm.includes('503')) {
    throw new HttpsError('unavailable', 'AI가 일시 과부하입니다. 잠시 후 다시 시도해주세요.');
  }
  throw new HttpsError('unavailable', 'AI 호출 중 문제가 발생했습니다.');
}

module.exports = { callGeminiWithBackup };
