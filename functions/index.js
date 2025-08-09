// functions/index.js
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 🎯 프롬프트/정책 유틸 (호칭 규칙 포함)
const {
  generatePostPrompt,   // async
  testPrompt,
  createFallbackDraft,
  getPolicySafe,        // 정책 강제 로드
} = require('./templates/prompts');

// 🔐 Gemini API 키 (Firebase Secrets)
const geminiApiKey = defineSecret('GEMINI_API_KEY');

// 🔧 리전/리소스 공통 설정
setGlobalOptions({
  region: 'asia-northeast3',
  memory: '2GiB',
  timeoutSeconds: 540,
});

// ✅ 중복 초기화 가드
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

const functionOptions = {
  region: 'asia-northeast3',
  memory: '2GiB',
  timeoutSeconds: 540,
  cors: true,
  secrets: [geminiApiKey],
};

// ------------------------ 공통 헬퍼 ------------------------
const auth = (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  return { uid: req.auth.uid, token: req.auth.token };
};

const ok = (data = {}) => ({ success: true, ...data });

const safe = (fn) => async (req) => {
  try {
    return await fn(req);
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    console.error('[INTERNAL ERROR]', e);
    throw new HttpsError('internal', '처리 실패');
  }
};

const wrap = (handler) => onCall(functionOptions, safe(handler));

const log = (tag, msg, data) => console.log(`[${tag}] ${msg}`, data);

// ------------------------ AI 백업 전략 ------------------------
const AI_MODELS = [
  { name: 'gemini-1.5-flash', priority: 1 },
  { name: 'gemini-1.5-pro', priority: 2 },
  { name: 'gemini-pro', priority: 3 },
];

// 표시용 직함(프론트 userUtils와 동일 컨셉)
function getDisplayTitleFromProfile(p = {}) {
  const { position, regionMetro, regionLocal, status } = p || {};
  let base = '';
  if (position === '국회의원') base = '국회의원';
  else if (position === '광역의원') {
    if (!regionMetro) base = '광역의원';
    else if (String(regionMetro).endsWith('시')) base = '시의원';
    else if (String(regionMetro).endsWith('도')) base = '도의원';
    else base = '광역의원';
  } else if (position === '기초의원') {
    if (!regionLocal) base = '기초의원';
    else if (String(regionLocal).endsWith('시')) base = '시의원';
    else if (String(regionLocal).endsWith('구')) base = '구의원';
    else if (String(regionLocal).endsWith('군')) base = '군의원';
    else base = '기초의원';
  } else {
    base = position || '';
  }
  return status === '예비' && base ? `${base} 후보` : base;
}

async function callGeminiWithBackup(prompt) {
  const genAI = new GoogleGenerativeAI(geminiApiKey.value());
  let lastError = null;

  for (const modelConfig of AI_MODELS) {
    try {
      log('AI', `${modelConfig.name} 모델 시도 중...`);
      const model = genAI.getGenerativeModel({
        model: modelConfig.name,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      });

      const response = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`${modelConfig.name} 90초 타임아웃`)), 90000)
        ),
      ]);

      log('AI', `${modelConfig.name} 성공`);
      return response;
    } catch (error) {
      log('AI', `${modelConfig.name} 실패`, error.message);
      lastError = error;

      const isQuotaError =
        error.message.includes('429') ||
        error.message.toLowerCase().includes('quota') ||
        error.message.includes('QUOTA_EXCEEDED') ||
        error.message.includes('RESOURCE_EXHAUSTED');

      const isOverloadError =
        error.message.toLowerCase().includes('overloaded') ||
        error.message.includes('503');

      const isTimeoutError =
        error.message.toLowerCase().includes('timeout') ||
        error.message.includes('타임아웃');

      if (error.message.toUpperCase().includes('SAFETY')) {
        throw new HttpsError(
          'invalid-argument',
          'AI 안전 정책에 위배되는 내용입니다. 다른 주제로 시도해주세요.'
        );
      }

      if ((isQuotaError || isOverloadError || isTimeoutError) && modelConfig !== AI_MODELS[AI_MODELS.length - 1]) {
        log('AI', `${modelConfig.name} -> 다음 모델로 백업 시도`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      if (modelConfig === AI_MODELS[AI_MODELS.length - 1]) break;
    }
  }

  if (lastError?.message.includes('429') || lastError?.message.toLowerCase().includes('quota')) {
    throw new HttpsError(
      'resource-exhausted',
      'AI 서비스 사용량을 모두 초과했습니다. 5-10분 후 다시 시도하거나 유료 플랜으로 업그레이드해주세요.'
    );
  }

  if (lastError?.message.toLowerCase().includes('overloaded') || lastError?.message.includes('503')) {
    throw new HttpsError('unavailable', 'AI 서비스에 일시적 과부하가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }

  throw new HttpsError('unavailable', 'AI 서비스에 일시적 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
}

// ------------------------ 관리자: 사용자 목록 ------------------------
exports.getUserList = wrap(async (req) => {
  const { uid, token } = auth(req);
  const { page = 1, pageSize = 50, query = '' } = req.data || {};

  // 관리자 권한 확인
  let isAdmin = !!token?.admin;
  if (!isAdmin) {
    const meDoc = await db.collection('users').doc(uid).get();
    const me = meDoc.exists ? meDoc.data() : {};
    isAdmin = me?.isAdmin === true || me?.role === 'admin';
  }
  if (!isAdmin) throw new HttpsError('permission-denied', '관리자만 접근 가능합니다.');

  const snap = await db
    .collection('users')
    .orderBy('updatedAt', 'desc')
    .limit(pageSize)
    .offset(Math.max(0, (page - 1) * pageSize))
    .get();

  let users = snap.docs.map((d) => {
    const data = d.data() || {};
    return {
      id: d.id,
      email: data.email || '',
      name: data.name || '',
      position: data.position || '',
      regionMetro: data.regionMetro || '',
      regionLocal: data.regionLocal || '',
      electoralDistrict: data.electoralDistrict || '',
      status: data.status || '현역',
      isActive: !!data.isActive,
      isAdmin: !!data.isAdmin || data.role === 'admin',
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    };
  });

  if (query && typeof query === 'string') {
    const qLower = query.toLowerCase();
    users = users.filter(
      (u) =>
        u.email.toLowerCase().includes(qLower) ||
        (u.name || '').toLowerCase().includes(qLower)
    );
  }

  return ok({ users, page, pageSize, count: users.length });
});

// ------------------------ 기존 함수들 ------------------------

// 대시보드
exports.getDashboardData = wrap(async (req) => {
  const { uid } = auth(req);
  log('DASH', 'getDashboardData 호출', uid);

  const usage = { current: 5, total: 30 };

  try {
    const postsSnapshot = await db
      .collection('posts')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const recentPosts = postsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '제목 없음',
        status: data.status || 'draft',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });

    log('DASH', 'Dashboard 데이터 성공', { usage, postsCount: recentPosts.length });
    return ok({ data: { usage, recentPosts } });
  } catch (firestoreError) {
    log('DASH', 'Firestore 조회 오류', firestoreError.message);
    return ok({ data: { usage, recentPosts: [] } });
  }
});

// 프로필 조회
exports.getUserProfile = wrap(async (req) => {
  const { uid, token } = auth(req);
  log('PROFILE', 'getUserProfile 호출', uid);

  const doc = await db.collection('users').doc(uid).get();
  const fromDb = doc.exists ? doc.data() : {};

  const profile = {
    name: token.name || '',
    email: token.email || '',
    position: '',
    regionMetro: '',
    regionLocal: '',
    electoralDistrict: '',
    status: '현역',
    bio: '',
    isActive: false,
    ...fromDb,
  };

  if (profile.isActive === undefined || profile.isActive === null) {
    profile.isActive = !!(profile.bio && String(profile.bio).trim());
  }

  log('PROFILE', 'getUserProfile 성공');
  return ok({ profile });
});

// 사용자 포스트 목록
exports.getUserPosts = wrap(async (req) => {
  const { uid } = auth(req);
  log('POST', 'getUserPosts 호출', uid);

  try {
    const postsSnapshot = await db
      .collection('posts')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const posts = postsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '제목 없음',
        content: data.content || '',
        status: data.status || 'draft',
        category: data.category || '일반',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });

    log('POST', `getUserPosts 성공: ${posts.length}개 포스트 조회`);
    return ok({ posts });
  } catch (firestoreError) {
    log('POST', 'Firestore 조회 오류', firestoreError.message);
    if (firestoreError.code === 'failed-precondition' || firestoreError.code === 'not-found') {
      log('POST', 'posts 컬렉션 또는 인덱스 없음, 빈 결과 반환');
      return ok({ posts: [] });
    }
    throw firestoreError;
  }
});

// 포스트 저장 (초안)
exports.savePost = wrap(async (req) => {
  const { uid } = auth(req);
  const { post, metadata = {} } = req.data;

  if (!post?.title?.trim() || !post?.content?.trim()) {
    throw new HttpsError('invalid-argument', '제목과 내용을 입력해주세요.');
  }

  log('POST', 'savePost 호출', { userId: uid, postTitle: post.title });

  const docRef = await db.collection('posts').add({
    userId: uid,
    title: post.title.trim(),
    content: post.content,
    category: post.category || '일반',
    status: 'draft',
    wordCount: post.content.replace(/<[^>]*>/g, '').replace(/\s/g, '').length,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    metadata,
  });

  log('POST', 'savePost 성공', docRef.id);
  return ok({ postId: docRef.id, message: '원고가 성공적으로 저장되었습니다.' });
});

// 포스트 업데이트
exports.updatePost = wrap(async (req) => {
  const { uid } = auth(req);
  const { postId, updates } = req.data;

  if (!postId || !updates) {
    throw new HttpsError('invalid-argument', '포스트 ID와 수정 데이터를 입력해주세요.');
  }

  log('POST', 'updatePost 호출', { userId: uid, postId });

  const postDoc = await db.collection('posts').doc(postId).get();
  if (!postDoc.exists) {
    throw new HttpsError('not-found', '포스트를 찾을 수 없습니다.');
  }

  const postData = postDoc.data();
  if (postData.userId !== uid) {
    throw new HttpsError('permission-denied', '포스트를 수정할 권한이 없습니다.');
  }

  const allowedFields = ['title', 'content', 'category', 'status'];
  const sanitizedUpdates = {};
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      sanitizedUpdates[field] = updates[field];
    }
  });

  if (sanitizedUpdates.content) {
    sanitizedUpdates.wordCount = sanitizedUpdates.content.replace(/<[^>]*>/g, '').replace(/\s/g, '').length;
  }

  sanitizedUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  await db.collection('posts').doc(postId).update(sanitizedUpdates);

  log('POST', 'updatePost 성공', postId);
  return ok({ message: '포스트가 성공적으로 수정되었습니다.' });
});

// 포스트 삭제
exports.deletePost = wrap(async (req) => {
  const { uid } = auth(req);
  const { postId } = req.data;

  if (!postId) {
    throw new HttpsError('invalid-argument', '포스트 ID를 입력해주세요.');
  }

  log('POST', 'deletePost 호출', { userId: uid, postId });

  const postDoc = await db.collection('posts').doc(postId).get();
  if (!postDoc.exists) {
    throw new HttpsError('not-found', '포스트를 찾을 수 없습니다.');
  }

  const postData = postDoc.data();
  if (postData.userId !== uid) {
    throw new HttpsError('permission-denied', '포스트를 삭제할 권한이 없습니다.');
  }

  await db.collection('posts').doc(postId).delete();

  log('POST', 'deletePost 성공', postId);
  return ok({ message: '포스트가 성공적으로 삭제되었습니다.' });
});

// 프로필 업데이트
exports.updateProfile = wrap(async (req) => {
  const { uid } = auth(req);
  const profileData = req.data;

  if (!profileData || typeof profileData !== 'object') {
    throw new HttpsError('invalid-argument', '올바른 프로필 데이터를 입력해주세요.');
  }

  log('PROFILE', 'updateProfile 호출', { userId: uid });

  const allowedFields = ['name', 'position', 'regionMetro', 'regionLocal', 'electoralDistrict', 'status', 'bio'];
  const sanitizedData = {};

  allowedFields.forEach((field) => {
    if (profileData[field] !== undefined) {
      sanitizedData[field] = profileData[field];
    }
  });

  const bio = typeof sanitizedData.bio === 'string' ? sanitizedData.bio.trim() : (sanitizedData.bio || '');
  const isActive = !!bio;

  await db.collection('users').doc(uid).set(
    {
      ...sanitizedData,
      bio,
      isActive,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  log('PROFILE', 'updateProfile 성공', { isActive });
  return ok({ message: '프로필이 성공적으로 업데이트되었습니다.', isActive });
});

// AI 연결 테스트
exports.testGenerate = wrap(async (req) => {
  const startTime = Date.now();
  auth(req);
  log('TEST', 'testGenerate 시작');

  const apiKey = geminiApiKey.value();
  if (!apiKey) throw new HttpsError('internal', 'Gemini API 키가 설정되지 않았습니다.');

  log('TEST', '간단한 AI 호출 테스트 중...');
  const response = await callGeminiWithBackup(testPrompt());
  const responseText = response.response.text();
  log('TEST', 'AI 응답', responseText.substring(0, 100));

  const processingTime = Date.now() - startTime;
  log('TEST', `testGenerate 성공: ${processingTime}ms`);

  return ok({
    message: 'AI 연결 테스트 성공',
    processingTime,
    response: responseText,
    timestamp: new Date().toISOString(),
  });
});

// 원고 생성 (bio 없으면 차단)
exports.generatePosts = wrap(async (req) => {
  const startTime = Date.now();
  const { uid } = auth(req);

  const data = req.data || {};
  log('AI', 'generatePosts 시작 (1개 생성)', { topic: data.prompt, category: data.category });

  const topic = data.prompt || data.topic || '';
  const category = data.category || '';

  if (!topic?.trim()) throw new HttpsError('invalid-argument', '주제를 입력해주세요.');
  if (!category?.trim()) throw new HttpsError('invalid-argument', '카테고리를 선택해주세요.');

  log('AI', `데이터 검증 통과: 주제="${topic.substring(0, 50)}..." 카테고리="${category}"`);

  // 사용자 프로필
  let userProfile = {};
  try {
    const userDoc = await Promise.race([
      db.collection('users').doc(uid).get(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('프로필 조회 타임아웃')), 5000)),
    ]);
    if (userDoc.exists) {
      userProfile = userDoc.data();
      log('AI', '사용자 프로필 조회 성공', userProfile.name || 'Unknown');
    }
  } catch (profileError) {
    log('AI', '프로필 조회 실패, 기본값 사용', profileError.message);
    userProfile = {
      name: req.auth.token.name || '정치인',
      position: '의원',
      regionMetro: '지역',
      regionLocal: '지역구',
      status: '현역',
      bio: '',
    };
  }

  // 활성화 가드
  const isActive = !!(userProfile.bio && String(userProfile.bio).trim());
  if (!isActive) {
    throw new HttpsError('failed-precondition', '프로필의 자기소개(필수)를 작성해야 원고를 생성할 수 있습니다.');
  }

  // ✅ 법 정책 강제: 정책을 못 읽으면 생성 자체를 멈춤 (fail-closed)
  let policy;
  try {
    policy = await getPolicySafe(); // 10분 캐시 + fail_closed/fallback 처리
    log('POLICY', `로드 성공 v${policy.version} #${policy.hash}`);
  } catch (e) {
    log('POLICY', '로드 실패 - 생성 중단', e.message);
    throw new HttpsError('unavailable', '법 준수 정책을 불러오지 못해 생성이 중단되었습니다. 잠시 후 다시 시도해주세요.');
  }

  // 프롬프트 생성 (개인화 + 호칭 규칙 + 지역 전달)
  const displayTitle = getDisplayTitleFromProfile(userProfile);
  const prompt = await generatePostPrompt({
    authorName: userProfile.name || '정치인',
    authorPosition: displayTitle || userProfile.position || '의원',
    authorBio: userProfile.bio || '',
    topic,
    category,
    subCategory: data.subCategory || '없음',
    keywords: data.keywords || '없음',
    regionMetro: userProfile.regionMetro || '',
    regionLocal: userProfile.regionLocal || '',
  });

  log('AI', 'AI 호출 시작 (1개 원고 생성)...');

  const apiResponse = await callGeminiWithBackup(prompt);
  const responseText = apiResponse.response.text();

  log('AI', 'AI 응답 수신', { length: responseText.length });

  let parsedResponse;
  try {
    const jsonMatch =
      responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
      responseText.match(/\{[\s\S]*?\}/);

    if (jsonMatch) {
      const jsonText = jsonMatch[1] || jsonMatch[0];
      log('AI', '추출된 JSON 일부', jsonText.substring(0, 200));
      parsedResponse = JSON.parse(jsonText);
      log('AI', 'JSON 파싱 성공', { title: parsedResponse.title });
    } else {
      throw new Error('JSON 형식 찾기 실패');
    }
  } catch (parseError) {
    log('AI', 'JSON 파싱 실패, 기본 응답 생성', parseError.message);
    parsedResponse = createFallbackDraft(topic, category);
  }

  const singleDraft = {
    id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: parsedResponse.title || `${category}: ${topic}`,
    content: parsedResponse.content || '<p>원고 생성에 실패했습니다.</p>',
    wordCount: parsedResponse.wordCount || Math.ceil((parsedResponse.content || '').length / 2),
    tags: data.keywords?.split(',').map((k) => k.trim()).filter((k) => k) || [],
    category: category,
    subCategory: data.subCategory || '',
    style: parsedResponse.style || '일반',
    metadata: {
      aiModel: 'gemini-multi-fallback',
      prompt: topic,
      userProfile: userProfile.name || 'Unknown',
    },
  };

  const processingTime = Date.now() - startTime;

  log('AI', 'generatePosts 성공 (1개 생성)', {
    title: singleDraft.title.substring(0, 50),
    processingTime: `${processingTime}ms`,
  });

  return ok({
    drafts: [singleDraft],
    metadata: {
      generatedAt: new Date().toISOString(),
      model: 'gemini-multi-fallback',
      processingTime: processingTime,
      region: 'asia-northeast3',
      inputTopic: topic,
      inputCategory: category,
      userProfile: userProfile.name || 'Unknown',
      // 감사 추적(정책 버전)
      policyVersion: policy?.version ?? null,
      policyHash: policy?.hash ?? null,
    },
  });
});

// (옵션) 별칭 유지
exports.generatePostDrafts = wrap(async (request) => {
  return exports.generatePosts.run(request);
});
