'use strict';

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { admin, db } = require('../utils/firebaseAdmin');
const fetch = require('node-fetch');

const NAVER_CLIENT_ID = defineSecret('NAVER_CLIENT_ID');
const NAVER_CLIENT_SECRET = defineSecret('NAVER_CLIENT_SECRET');

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
  const allowedOrigins = ['https://cyberbrain.kr', 'https://ai-secretary-6e9c8.web.app', 'https://ai-secretary-6e9c8.firebaseapp.com'];
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
      if (!NAVER_CLIENT_ID.value() || !NAVER_CLIENT_SECRET.value()) throw new Error('NAVER env missing: NAVER_CLIENT_ID/SECRET');
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('client_id', NAVER_CLIENT_ID.value());
      params.append('client_secret', NAVER_CLIENT_SECRET.value());
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
      stage = 'auto_registration';
      const ref = db.collection('users').doc();
      // 관리자 네이버 ID 목록 (환경에 따라 수정)
      const adminNaverIds = ['kjk6206']; // 실제 관리자의 네이버 ID로 수정
      const isAdmin = adminNaverIds.includes(naver.id);
      
      const doc = {
        naverUserId: naver.id,
        name: naver.name || naver.nickname || 'Naver User',
        displayName: naver.name || naver.nickname || 'Naver User',
        profileImage: naver.profile_image || null,
        gender: naver.gender || null,
        age: naver.age || null,
        status: 'pending',
        position: '', regionMetro: '', regionLocal: '', electoralDistrict: '',
        provider: 'naver', isNaverUser: true,
        isAdmin: isAdmin,
        role: isAdmin ? 'admin' : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(), lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        profileComplete: false
      };
      
      if (isAdmin) {
        console.log(`🔑 관리자 네이버 사용자 감지: ${naver.id}`);
      }
      await ref.set(doc);
      // auto-claim username as naver.id
      try { await claimUsernameForUid(ref.id, naver.id); } catch (e) { console.warn('username auto-claim failed:', e.message); }
      
      // TODO: Firebase Auth 커스텀 토큰 생성 (IAM 권한 필요)
      // const customToken = await admin.auth().createCustomToken(ref.id, {
      //   provider: 'naver',
      //   name: doc.name,
      //   profileComplete: false
      // });
      
      return res.status(200).json({
        result: {
          success: true, registrationRequired: false, autoRegistered: true,
          user: { uid: ref.id, naverUserId: naver.id, displayName: doc.name, photoURL: doc.profileImage, provider: 'naver', profileComplete: false },
          naver: { id: naver.id, name: naver.name || naver.nickname || null, gender: naver.gender || null, age: naver.age || null, profile_image: naver.profile_image || null },
          message: 'auto-registered with naver'
          // customToken: customToken
        }
      });
    }

    const docSnap = snap.docs[0];
    const userData = docSnap.data();
    
    // 관리자 권한 확인 및 업데이트
    const adminNaverIds = ['kjk6206']; // 실제 관리자의 네이버 ID로 수정
    const shouldBeAdmin = adminNaverIds.includes(naver.id);
    const isCurrentlyAdmin = userData.isAdmin === true;
    
    const updateData = { 
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(), 
      naverUserId: naver.id 
    };
    
    if (shouldBeAdmin && !isCurrentlyAdmin) {
      console.log(`🔑 기존 사용자를 관리자로 승격: ${naver.id}`);
      updateData.isAdmin = true;
      updateData.role = 'admin';
      updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    }
    
    await docSnap.ref.update(updateData);
    
    // backfill username if missing
    try { if (!userData.username) await claimUsernameForUid(docSnap.id, naver.id); } catch (e) { console.warn('username backfill failed:', e.message); }

    // TODO: Firebase Auth 커스텀 토큰 생성 (IAM 권한 필요)
    // const customToken = await admin.auth().createCustomToken(docSnap.id, {
    //   provider: 'naver',
    //   name: userData.name || userData.displayName,
    //   profileComplete: userData.profileComplete || false
    // });

    return res.status(200).json({
      result: {
        success: true, registrationRequired: false,
        user: { uid: docSnap.id, naverUserId: userData.naverUserId, displayName: userData.name || userData.displayName, photoURL: userData.profileImage || naver.profile_image, provider: 'naver', profileComplete: userData.profileComplete || false },
        naver: { id: naver.id, name: naver.name || naver.nickname || null, gender: naver.gender || null, age: naver.age || null, profile_image: naver.profile_image || null }
        // customToken: customToken
      }
    });
  } catch (err) {
    console.error('naverLoginHTTP error', { stage, error: err.message });
    return res.status(500).json({ error: { code: 'internal', message: err.message, details: { stage } } });
  }
});

const naverCompleteRegistration = onRequest({ region: 'asia-northeast3', cors: true, timeoutSeconds: 60 }, async (req, res) => {
  const allowedOrigins = ['https://cyberbrain.kr', 'https://ai-secretary-6e9c8.web.app', 'https://ai-secretary-6e9c8.firebaseapp.com'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  try {
    const { uid, profileData } = req.body || {};
    if (!uid || typeof profileData !== 'object') return res.status(400).json({ error: { code: 'invalid-argument', message: 'uid와 profileData가 필요합니다.' } });
    const required = ['name', 'position', 'regionMetro', 'regionLocal', 'electoralDistrict'];
    for (const k of required) { if (!profileData[k] || String(profileData[k]).trim() === '') return res.status(400).json({ error: { code: 'invalid-argument', message: `${k} 필드가 필요합니다.` } }); }
    const update = {
      name: String(profileData.name).trim(), displayName: String(profileData.name).trim(),
      position: profileData.position, regionMetro: profileData.regionMetro, regionLocal: profileData.regionLocal, electoralDistrict: profileData.electoralDistrict,
      profileComplete: true, updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    if (profileData.gender !== undefined) update.gender = profileData.gender;
    if (profileData.age !== undefined) update.age = profileData.age;
    await db.collection('users').doc(uid).set(update, { merge: true });
    
    // TODO: Firebase Auth 커스텀 토큰 생성 (IAM 권한 필요)
    // const customToken = await admin.auth().createCustomToken(uid, {
    //   provider: 'naver',
    //   name: update.name,
    //   profileComplete: true
    // });
    
    return res.status(200).json({ 
      result: { 
        success: true, 
        message: '등록 완료'
        // customToken: customToken
      } 
    });
  } catch (err) {
    console.error('naverCompleteRegistration error', err);
    return res.status(500).json({ error: { code: 'internal', message: err.message } });
  }
});

module.exports = { naverLogin, naverLoginHTTP, naverCompleteRegistration };

