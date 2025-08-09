// Centralized Admin SDK init (중복 초기화 방지)
const admin = require('firebase-admin');
if (admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();

module.exports = { admin, db };
