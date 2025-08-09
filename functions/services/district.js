'use strict';

const { admin, db } = require('../utils/firebaseAdmin');
const { HttpsError } = require('firebase-functions/v2/https');

const norm = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{Letter}\p{Number}]/gu, '');

const districtKey = ({ position, regionMetro, regionLocal, electoralDistrict }) =>
  [position, regionMetro, regionLocal, electoralDistrict].map(norm).join('__');

async function claimDistrict({ uid, newKey, oldKey }) {
  if (!newKey) throw new HttpsError('invalid-argument', '선거구 정보를 모두 입력해주세요.');

  const refNew = db.collection('district_claims').doc(newKey);
  const refOld = oldKey ? db.collection('district_claims').doc(oldKey) : null;

  await db.runTransaction(async (tx) => {
    const sNew = await tx.get(refNew);
    if (sNew.exists && sNew.data()?.userId !== uid) {
      throw new HttpsError('already-exists', '해당 선거구는 이미 다른 사용자가 사용 중입니다.');
    }

    tx.set(
      refNew,
      {
        userId: uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt:
          sNew.exists
            ? sNew.data().createdAt || admin.firestore.FieldValue.serverTimestamp()
            : admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    if (refOld && oldKey !== newKey) {
      const sOld = await tx.get(refOld);
      if (sOld.exists && sOld.data()?.userId === uid) {
        tx.delete(refOld);
      }
    }
  });
}

module.exports = { districtKey, claimDistrict };
