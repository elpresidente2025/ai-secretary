'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const { admin, db } = require('./utils/firebaseAdmin');

const { callGeminiWithBackup } = require('./services/ai');
const { districtKey, claimDistrict } = require('./services/district');
const { getDisplayTitleFromProfile } = require('./services/profile');

const {
  generatePostPrompt, // async
  testPrompt,
  createFallbackDraft,
  getPolicySafe, // 정책 강제 로드
} = require('./templates/prompts');

// ── 공통 설정
setGlobalOptions({ region: 'asia-northeast3', memory: '2GiB', timeoutSeconds: 540 });
const geminiApiKey = defineSecret('GEMINI_API_KEY');

const functionOptions = {
  region: 'asia-northeast3',
  memory: '2GiB',
  timeoutSeconds: 540,
  cors: true,
  secrets: [geminiApiKey],
};

// ── 헬퍼
const ok = (data = {}) => ({ success: true, ...data });

const wrap = (handler) =>
  onCall(functionOptions, async (req) => {
    try {
      return await handler(req);
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      console.error('[INTERNAL ERROR]', e);
      throw new HttpsError('internal', '처리 실패');
    }
  });

const auth = (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  return { uid: req.auth.uid, token: req.auth.token };
};

const log = (tag, msg, data) => console.log(`[${tag}] ${msg}`, data);

// ── 관리자: 사용자 목록
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

// ── 대시보드
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
  } catch (e) {
    log('DASH', 'Firestore 조회 오류', e.message);
    return ok({ data: { usage, recentPosts: [] } });
  }
});

// ── 프로필 조회
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

// ── 사용자 포스트 목록
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
  } catch (e) {
    log('POST', 'Firestore 조회 오류', e.message);
    if (e.code === 'failed-precondition' || e.code === 'not-found') {
      return ok({ posts: [] });
    }
    throw e;
  }
});

// ── 포스트 저장 (초안)
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

// ── 포스트 업데이트
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

  const allowed = ['title', 'content', 'category', 'status'];
  const sanitized = {};
  for (const k of allowed) if (updates[k] !== undefined) sanitized[k] = updates[k];

  if (sanitized.content) {
    sanitized.wordCount = sanitized.content.replace(/<[^>]*>/g, '').replace(/\s/g, '').length;
  }

  sanitized.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  await db.collection('posts').doc(postId).update(sanitized);

  log('POST', 'updatePost 성공', postId);
  return ok({ message: '포스트가 성공적으로 수정되었습니다.' });
});

// ── 포스트 삭제
exports.deletePost = wrap(async (req) => {
  const { uid } = auth(req);
  const { postId } = req.data;

  if (!postId) throw new HttpsError('invalid-argument', '포스트 ID를 입력해주세요.');

  log('POST', 'deletePost 호출', { userId: uid, postId });

  const postDoc = await db.collection('posts').doc(postId).get();
  if (!postDoc.exists) throw new HttpsError('not-found', '포스트를 찾을 수 없습니다.');

  const postData = postDoc.data();
  if (postData.userId !== uid) throw new HttpsError('permission-denied', '포스트를 삭제할 권한이 없습니다.');

  await db.collection('posts').doc(postId).delete();
  log('POST', 'deletePost 성공', postId);
  return ok({ message: '포스트가 성공적으로 삭제되었습니다.' });
});

// ── 프로필 업데이트 (+ 선거구 유일성 락)
exports.updateProfile = wrap(async (req) => {
  const { uid } = auth(req);
  const profileData = req.data;
  if (!profileData || typeof profileData !== 'object') {
    throw new HttpsError('invalid-argument', '올바른 프로필 데이터를 입력해주세요.');
  }

  log('PROFILE', 'updateProfile 호출', { userId: uid });

  const allowedFields = ['name', 'position', 'regionMetro', 'regionLocal', 'electoralDistrict', 'status', 'bio'];
  const sanitized = {};
  for (const k of allowedFields) if (profileData[k] !== undefined) sanitized[k] = profileData[k];

  const userRef = db.collection('users').doc(uid);
  const current = (await userRef.get()).data() || {};

  const now = {
    position: current.position,
    regionMetro: current.regionMetro,
    regionLocal: current.regionLocal,
    electoralDistrict: current.electoralDistrict,
  };
  const next = {
    position: sanitized.position ?? current.position,
    regionMetro: sanitized.regionMetro ?? current.regionMetro,
    regionLocal: sanitized.regionLocal ?? current.regionLocal,
    electoralDistrict: sanitized.electoralDistrict ?? current.electoralDistrict,
  };

  const haveNext =
    next.position && next.regionMetro && next.regionLocal && next.electoralDistrict;

  const oldKey =
    now.position && now.regionMetro && now.regionLocal && now.electoralDistrict
      ? districtKey(now)
      : null;

  const newKey = haveNext ? districtKey(next) : null;

  if (oldKey !== newKey) {
    if (!haveNext) {
      throw new HttpsError('invalid-argument', '선거구 변경 시 직책/광역/기초/선거구를 모두 입력해야 합니다.');
    }
    await claimDistrict({ uid, newKey, oldKey });
  }

  const bio = typeof sanitized.bio === 'string' ? sanitized.bio.trim() : (sanitized.bio || '');
  const isActive = !!bio;

  await userRef.set(
    {
      ...sanitized,
      bio,
      isActive,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  log('PROFILE', 'updateProfile 성공', { isActive });
  return ok({ message: '프로필이 성공적으로 업데이트되었습니다.', isActive });
});

// ── AI 연결 테스트
exports.testGenerate = wrap(async (req) => {
  const startTime = Date.now();
  auth(req);

  const apiKey = geminiApiKey.value();
  if (!apiKey) throw new HttpsError('internal', 'Gemini API 키가 설정되지 않았습니다.');

  const res = await callGeminiWithBackup(apiKey, testPrompt());
  const text = res.response.text();

  return ok({
    message: 'AI 연결 테스트 성공',
    processingTime: Date.now() - startTime,
    response: text,
    timestamp: new Date().toISOString(),
  });
});

// ── 원고 생성 (법 정책 fail-closed + 호칭 규칙)
exports.generatePosts = wrap(async (req) => {
  const startTime = Date.now();
  const { uid } = auth(req);

  const data = req.data || {};
  const topic = data.prompt || data.topic || '';
  const category = data.category || '';

  if (!topic?.trim()) throw new HttpsError('invalid-argument', '주제를 입력해주세요.');
  if (!category?.trim()) throw new HttpsError('invalid-argument', '카테고리를 선택해주세요.');

  // 프로필
  let userProfile = {};
  try {
    const userDoc = await Promise.race([
      db.collection('users').doc(uid).get(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('프로필 조회 타임아웃')), 5000)),
    ]);
    if (userDoc.exists) userProfile = userDoc.data();
  } catch {
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
  if (!(userProfile.bio && String(userProfile.bio).trim())) {
    throw new HttpsError('failed-precondition', '프로필의 자기소개(필수)를 작성해야 원고를 생성할 수 있습니다.');
  }

  // 정책 강제 로드
  let policy;
  try {
    policy = await getPolicySafe();
  } catch (e) {
    throw new HttpsError('unavailable', '법 준수 정책을 불러오지 못해 생성이 중단되었습니다. 잠시 후 다시 시도해주세요.');
  }

  // 프롬프트(호칭/지역 포함)
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

  // 호출
  const apiKey = geminiApiKey.value();
  const apiResponse = await callGeminiWithBackup(apiKey, prompt);
  const responseText = apiResponse.response.text();

  // JSON 파싱
  let parsed;
  try {
    const m = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/\{[\s\S]*?\}/);
    if (!m) throw new Error('JSON 형식 찾기 실패');
    const jsonText = m[1] || m[0];
    parsed = JSON.parse(jsonText);
  } catch {
    parsed = createFallbackDraft(topic, category);
  }

  const draft = {
    id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: parsed.title || `${category}: ${topic}`,
    content: parsed.content || '<p>원고 생성에 실패했습니다.</p>',
    wordCount: parsed.wordCount || Math.ceil((parsed.content || '').length / 2),
    tags: data.keywords?.split(',').map((k) => k.trim()).filter(Boolean) || [],
    category,
    subCategory: data.subCategory || '',
    style: parsed.style || '일반',
    metadata: {
      aiModel: 'gemini-multi-fallback',
      prompt: topic,
      userProfile: userProfile.name || 'Unknown',
    },
  };

  return ok({
    drafts: [draft],
    metadata: {
      generatedAt: new Date().toISOString(),
      model: 'gemini-multi-fallback',
      processingTime: Date.now() - startTime,
      region: 'asia-northeast3',
      inputTopic: topic,
      inputCategory: category,
      userProfile: userProfile.name || 'Unknown',
      policyVersion: policy?.version ?? null,
      policyHash: policy?.hash ?? null,
    },
  });
});

// ── 별칭 유지
exports.generatePostDrafts = wrap(async (request) => exports.generatePosts.run(request));

// ── 가입 전 중복 확인(프런트에서 사용)
exports.checkDistrictAvailability = wrap(async (req) => {
  const { regionMetro, regionLocal, electoralDistrict, position } = req.data || {};
  if (!regionMetro || !regionLocal || !electoralDistrict || !position) {
    throw new HttpsError('invalid-argument', '지역/선거구/직책을 모두 입력해주세요.');
  }
  const key = districtKey({ regionMetro, regionLocal, electoralDistrict, position });

  // 락(우선)
  const claim = await db.collection('district_claims').doc(key).get();
  let available = !claim.exists;
  let occupiedBy = claim.exists ? claim.data()?.userId || 'unknown' : null;

  // 보조: 과거 데이터 호환
  if (available) {
    const q = await db
      .collection('users')
      .where('position', '==', position)
      .where('regionMetro', '==', regionMetro)
      .where('regionLocal', '==', regionLocal)
      .where('electoralDistrict', '==', electoralDistrict)
      .limit(1)
      .get();

    if (!q.empty) {
      available = false;
      occupiedBy = q.docs[0].id;
    }
  }

  return ok({ available, occupiedBy });
});
