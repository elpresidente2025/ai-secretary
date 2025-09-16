'use strict';

const { setGlobalOptions } = require('firebase-functions/v2');
const { onRequest } = require('firebase-functions/v2/https');

// Set region for all functions
setGlobalOptions({ region: 'asia-northeast3' });

// Delete post (HTTP onRequest, Naver-only via __naverAuth)
exports.deletePost = onRequest({ region: 'asia-northeast3', cors: true }, async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    const { admin, db } = require('./utils/firebaseAdmin');

    // Support both Firebase SDK and raw requests
    let body = req.body || {};
    if (body && typeof body === 'object' && body.data && typeof body.data === 'object') {
      body = body.data;
    }

    // Naver-only auth
    const naverAuth = body && body.__naverAuth;
    if (!naverAuth || naverAuth.provider !== 'naver' || !naverAuth.uid) {
      res.status(401).json({ error: 'unauthenticated', message: 'Naver auth required' });
      return;
    }
    const uid = naverAuth.uid;
    delete body.__naverAuth;

    const postId = body && body.postId;
    if (!postId) {
      res.status(400).json({ error: 'invalid-argument', message: 'postId is required' });
      return;
    }

    const doc = await db.collection('posts').doc(postId).get();
    if (!doc.exists) {
      res.status(404).json({ error: 'not-found', message: 'Post not found' });
      return;
    }

    const data = doc.data() || {};
    if (data.userId !== uid) {
      res.status(403).json({ error: 'permission-denied', message: 'Not allowed' });
      return;
    }

    await db.collection('posts').doc(postId).delete();
    res.json({ success: true, postId });
  } catch (err) {
    res.status(500).json({ error: 'internal', message: err.message });
  }
});
