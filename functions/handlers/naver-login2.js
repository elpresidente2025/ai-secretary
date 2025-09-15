'use strict';

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { admin, db } = require('../utils/firebaseAdmin');
const fetch = require('node-fetch');

const NAVER_CLIENT_ID = defineSecret('NAVER_CLIENT_ID');
const NAVER_CLIENT_SECRET = defineSecret('NAVER_CLIENT_SECRET');

// Normalize gender to app standard labels
function mapGender(g) {
  if (!g) return '';
  const s = String(g).trim().toUpperCase();
  if (s === 'M' || s === 'MALE' || s === '남' || s === '남자') return '남성';
  if (s === 'F' || s === 'FEMALE' || s === '여' || s === '여자') return '여성';
  return String(g).trim();
}
function getSecretValue(secretObj, envName) {
  try {
    if (secretObj && typeof secretObj.value === 'function') {
      const v = secretObj.value();
      if (v) return v;
    }
  } catch (_err) {}
  return process.env[envName];
}

async function getNaverUserInfo(accessToken) {
  const resp = await fetch('https://openapi.naver.com/v1/nid/me', {
    method: 'GET', headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Naver userinfo failed: ${resp.status} ${text}`);
  }
  const data = await resp.json();
  if (data.resultcode !== '00' || !data.response) throw new Error(`Naver userinfo error: ${data.message || 'unknown'}`);
  return data.response;
}

async function claimUsernameForUid(uid, username) {
  const unameRef = db.collection('usernames').doc(String(username));
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(unameRef);
    if (!snap.exists) {
      tx.set(unameRef, { uid, username: String(username), createdAt: admin.firestore.FieldValue.serverTimestamp() });
    } else if (snap.get('uid') !== uid) {
      // If already taken by another uid, just log (should not happen for naver.id)
      console.warn('username already taken by another uid', { username, owner: snap.get('uid') });
    }
    tx.set(db.collection('users').doc(uid), { username: String(username), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  });
}

const naverLogin = onCall({ region: 'asia-northeast3' }, async () => {
  return { success: false, message: 'Use naverLoginHTTP instead' };
});

const naverLoginHTTP = onRequest({ region: 'asia-northeast3', cors: true, timeoutSeconds: 60, secrets: [NAVER_CLIENT_ID, NAVER_CLIENT_SECRET] }, async (req, res) => {
  const allowedOrigins = [
    'https://cyberbrain.kr',
    'https://www.cyberbrain.kr',
    'https://ai-secretary-6e9c8.web.app',
    'https://ai-secretary-6e9c8.firebaseapp.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  let stage = 'init';
  try {
    const body = req.body?.data || req.body || {};
    const { accessToken, naverUserInfo, code, state } = body;
    let naver;

    if (naverUserInfo) {
      stage = 'use_client_userinfo';
      naver = naverUserInfo;
    } else if (accessToken) {
      stage = 'fetch_userinfo_with_token';
      naver = await getNaverUserInfo(accessToken);
    } else if (code) {
      stage = 'exchange_code_for_token';
      const clientId = getSecretValue(NAVER_CLIENT_ID, 'NAVER_CLIENT_ID');
      const clientSecret = getSecretValue(NAVER_CLIENT_SECRET, 'NAVER_CLIENT_SECRET');
      if (!clientId || !clientSecret) throw new Error('NAVER env missing: NAVER_CLIENT_ID/SECRET');
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('code', code);
      if (state) params.append('state', state);
      const tokenResp = await fetch('https://nid.naver.com/oauth2.0/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
      if (!tokenResp.ok) throw new Error(`Token exchange failed: ${tokenResp.status} ${await tokenResp.text().catch(()=> '')}`);
      const tokenJson = await tokenResp.json();
      if (!tokenJson.access_token) throw new Error('No access_token');
      stage = 'fetch_userinfo_after_exchange';
      naver = await getNaverUserInfo(tokenJson.access_token);
    } else {
      throw new HttpsError('invalid-argument', 'accessToken or code required');
    }

    if (!naver?.id) return res.status(400).json({ error: { code: 'invalid-argument', message: 'Missing naver id', details: { stage } } });

    stage = 'query_user';
    const snap = await db.collection('users').where('naverUserId', '==', naver.id).limit(1).get();

    if (snap.empty) {
      // 미가입 회원 - 회원가입 필요
      stage = 'registration_required';
      return res.status(200).json({
        result: {
          success: true, 
          registrationRequired: true,
          user: null,
          naver: { 
            id: naver.id, 
            name: naver.name || naver.nickname || null, 
            gender: naver.gender || null, 
            age: naver.age || null, 
            profile_image: naver.profile_image || null 
          },
          message: 'registration required'
        }
      });
    }

    // 기존 회원 - 로그인 성공
    const docSnap = snap.docs[0];
    const userData = docSnap.data();
    
    // 관리자 권한 확인 및 업데이트
    const adminNaverIds = (process.env.ADMIN_NAVER_IDS || 'kjk6206').split(',').map(id => id.trim());
    const shouldBeAdmin = adminNaverIds.includes(naver.id);
    const isCurrentlyAdmin = userData.isAdmin === true;
    
    const updateData = { 
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(), 
      naverUserId: naver.id 
    };
    // Backfill gender if missing
    if (!userData.gender && naver.gender) {
      updateData.gender = mapGender(naver.gender);
    }
    // (removed duplicate raw gender assignment)
    
    if (shouldBeAdmin && !isCurrentlyAdmin) {
      console.log(`🔑 기존 사용자를 관리자로 승격: ${naver.id}`);
      updateData.isAdmin = true;
      updateData.role = 'admin';
      updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    }
    
    await docSnap.ref.update(updateData);
    
    // backfill username if missing
    try { if (!userData.username) await claimUsernameForUid(docSnap.id, naver.id); } catch (e) { console.warn('username backfill failed:', e.message); }

    return res.status(200).json({
      result: {
        success: true, 
        registrationRequired: false,
        user: { 
          uid: docSnap.id, 
          naverUserId: userData.naverUserId, 
          displayName: userData.name || userData.displayName, 
          photoURL: userData.profileImage || naver.profile_image, 
          provider: 'naver', 
          profileComplete: userData.profileComplete || false,
          isAdmin: shouldBeAdmin || isCurrentlyAdmin
        },
        naver: { 
          id: naver.id, 
          name: naver.name || naver.nickname || null, 
          gender: naver.gender || null, 
          age: naver.age || null, 
          profile_image: naver.profile_image || null 
        },
        message: 'login successful'
      }
    });
  } catch (err) {
    console.error('naverLoginHTTP error', { stage, error: err.message });
    return res.status(500).json({ error: { code: 'internal', message: err.message, details: { stage } } });
  }
});

const naverCompleteRegistration = onRequest({ region: 'asia-northeast3', cors: true, timeoutSeconds: 60 }, async (req, res) => {
  const allowedOrigins = ['https://cyberbrain.kr', 'https://www.cyberbrain.kr', 'https://ai-secretary-6e9c8.web.app', 'https://ai-secretary-6e9c8.firebaseapp.com'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  
  try {
    const { naverUserData, profileData } = req.body || {};
    
    if (!naverUserData?.id || typeof profileData !== 'object') {
      return res.status(400).json({ error: { code: 'invalid-argument', message: 'naverUserData와 profileData가 필요합니다.' } });
    }
    
    const required = ['name', 'position', 'regionMetro', 'regionLocal', 'electoralDistrict'];
    for (const k of required) { 
      if (!profileData[k] || String(profileData[k]).trim() === '') {
        return res.status(400).json({ error: { code: 'invalid-argument', message: `${k} 필드가 필요합니다.` } });
      }
    }
    
    // 새 사용자 문서 생성
    const ref = db.collection('users').doc();
    const adminNaverIds = (process.env.ADMIN_NAVER_IDS || 'kjk6206').split(',').map(id => id.trim());
    const isAdmin = adminNaverIds.includes(naverUserData.id);
    
    const doc = {
      naverUserId: naverUserData.id,
      name: String(profileData.name).trim(),
      profileImage: naverUserData.profile_image || null,
      gender: mapGender(profileData.gender) || mapGender(naverUserData.gender) || null,
      age: naverUserData.age || null,
      position: profileData.position,
      regionMetro: profileData.regionMetro,
      regionLocal: profileData.regionLocal,
      electoralDistrict: profileData.electoralDistrict,
      status: profileData.status || '현역',
      bio: profileData.bio || '',
      provider: 'naver',
      isNaverUser: true,
      isAdmin: isAdmin,
      role: isAdmin ? 'admin' : null,
      profileComplete: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // 선택 필드들
    const optionalFields = ['ageDecade', 'ageDetail', 'familyStatus', 'backgroundCareer', 'localConnection', 'politicalExperience', 'committees', 'customCommittees', 'constituencyType', 'twitterPremium'];
    for (const field of optionalFields) {
      if (profileData[field] !== undefined) {
        doc[field] = profileData[field];
      }
    }
    
    await ref.set(doc);
    
    // username 자동 할당
    try { 
      await claimUsernameForUid(ref.id, naverUserData.id); 
    } catch (e) { 
      console.warn('username auto-claim failed:', e.message); 
    }
    
    if (isAdmin) {
      console.log(`🔑 관리자 네이버 사용자 등록: ${naverUserData.id}`);
    }
    
    return res.status(200).json({ 
      result: { 
        success: true, 
        message: '회원가입이 완료되었습니다. 로그인 페이지에서 네이버로 로그인해주세요.',
        user: { 
          uid: ref.id, 
          naverUserId: naverUserData.id, 
          // displayName은 저장하지 않지만, 호환성을 위해 응답에는 name을 내려줍니다.
          displayName: doc.name,
          isAdmin: isAdmin
        }
      } 
    });
  } catch (err) {
    console.error('naverCompleteRegistration error', err);
    return res.status(500).json({ error: { code: 'internal', message: err.message } });
  }
});

module.exports = { naverLogin, naverLoginHTTP, naverCompleteRegistration };
