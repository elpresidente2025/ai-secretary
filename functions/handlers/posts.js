'use strict';

const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { wrap } = require('../common/wrap');
const { httpWrap } = require('../common/http-wrap');
const { auth } = require('../common/auth');
const { admin, db } = require('../utils/firebaseAdmin');
const { callGenerativeModel } = require('../services/gemini');

/**
 * Bio 메타데이터를 기반으로 개인화된 원고 작성 힌트를 생성합니다
 * @param {Object} bioMetadata - 추출된 자기소개 메타데이터
 * @returns {string} 개인화 힌트 문자열
 */
function generatePersonalizedHints(bioMetadata) {
  if (!bioMetadata) return '';

  const hints = [];
  
  // 정치적 성향 기반 힌트
  if (bioMetadata.politicalStance?.progressive > 0.7) {
    hints.push('변화와 혁신을 강조하는 진보적 관점으로 작성');
  } else if (bioMetadata.politicalStance?.conservative > 0.7) {
    hints.push('안정성과 전통 가치를 중시하는 보수적 관점으로 작성');
  } else if (bioMetadata.politicalStance?.moderate > 0.8) {
    hints.push('균형잡힌 중도적 관점에서 다양한 의견을 포용하여 작성');
  }

  // 소통 스타일 기반 힌트
  const commStyle = bioMetadata.communicationStyle;
  if (commStyle?.tone === 'warm') {
    hints.push('따뜻하고 친근한 어조 사용');
  } else if (commStyle?.tone === 'formal') {
    hints.push('격식있고 전문적인 어조 사용');
  }
  
  if (commStyle?.approach === 'inclusive') {
    hints.push('모든 계층을 아우르는 포용적 접근');
  } else if (commStyle?.approach === 'collaborative') {
    hints.push('협력과 소통을 강조하는 협업적 접근');
  }

  // 정책 관심분야 기반 힌트
  const topPolicy = Object.entries(bioMetadata.policyFocus || {})
    .sort(([,a], [,b]) => b.weight - a.weight)[0];
    
  if (topPolicy && topPolicy[1].weight > 0.6) {
    const policyNames = {
      economy: '경제정책',
      education: '교육정책', 
      welfare: '복지정책',
      environment: '환경정책',
      security: '안보정책',
      culture: '문화정책'
    };
    hints.push(`${policyNames[topPolicy[0]] || topPolicy[0]} 관점에서 접근`);
  }

  // 지역 연관성 기반 힌트
  if (bioMetadata.localConnection?.strength > 0.8) {
    hints.push('지역 현안과 주민들의 실제 경험을 적극 반영');
    if (bioMetadata.localConnection.keywords?.length > 0) {
      hints.push(`지역 키워드 활용: ${bioMetadata.localConnection.keywords.slice(0, 3).join(', ')}`);
    }
  }

  // 생성 선호도 기반 힌트
  const prefs = bioMetadata.generationProfile?.likelyPreferences;
  if (prefs?.includePersonalExperience > 0.8) {
    hints.push('개인적 경험과 사례를 풍부하게 포함');
  }
  if (prefs?.useStatistics > 0.7) {
    hints.push('구체적 수치와 통계 데이터를 적절히 활용');
  }
  if (prefs?.focusOnFuture > 0.7) {
    hints.push('미래 비전과 발전 방향을 제시');
  }

  return hints.join(' | ');
}
const { buildDailyCommunicationPrompt } = require('../templates/prompts/daily-communication');

// 간단한 응답 헬퍼
const ok = (data) => ({ success: true, ...data });
const okMessage = (message) => ({ success: true, message });

// 사용자 포스트 목록 조회
exports.getUserPosts = wrap(async (req) => {
  const { uid } = auth(req);
  console.log('POST getUserPosts 호출:', { userId: uid });

  try {
    const postsSnapshot = await db.collection('posts')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const posts = [];
    postsSnapshot.forEach(doc => {
      const data = doc.data();
      // draft 상태가 아닌 포스트만 포함 (클라이언트 필터링)
      if (data.status !== 'draft') {
        posts.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null
        });
      }
    });

    console.log('POST getUserPosts 성공:', { count: posts.length });
    return ok({ posts });
  } catch (error) {
    console.error('POST getUserPosts 오류:', error.message);
    throw new HttpsError('internal', '포스트 목록을 불러오는데 실패했습니다.');
  }
});

// 특정 포스트 조회
exports.getPost = wrap(async (req) => {
  const { uid } = auth(req);
  const { postId } = req.data || {};
  console.log('POST getPost 호출:', { userId: uid, postId });

  if (!postId) {
    throw new HttpsError('invalid-argument', '포스트 ID를 입력해주세요.');
  }

  try {
    const postDoc = await db.collection('posts').doc(postId).get();
    if (!postDoc.exists) {
      throw new HttpsError('not-found', '포스트를 찾을 수 없습니다.');
    }

    const data = postDoc.data();
    if (data.userId !== uid) {
      throw new HttpsError('permission-denied', '포스트를 조회할 권한이 없습니다.');
    }

    const post = {
      id: postDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null
    };

    console.log('POST getPost 성공:', postId);
    return ok({ post });
  } catch (error) {
    if (error.code) throw error;
    console.error('POST getPost 오류:', error.message);
    throw new HttpsError('internal', '포스트를 불러오는데 실패했습니다.');
  }
});

// 포스트 업데이트
exports.updatePost = wrap(async (req) => {
  const { uid } = auth(req);
  const { postId, updates } = req.data || {};
  console.log('POST updatePost 호출:', { userId: uid, postId });

  if (!postId || !updates) {
    throw new HttpsError('invalid-argument', '포스트 ID와 수정 데이터를 입력해주세요.');
  }

  try {
    const postDoc = await db.collection('posts').doc(postId).get();
    if (!postDoc.exists) {
      throw new HttpsError('not-found', '포스트를 찾을 수 없습니다.');
    }

    const current = postDoc.data() || {};
    if (current.userId !== uid) {
      throw new HttpsError('permission-denied', '포스트를 수정할 권한이 없습니다.');
    }

    const allowed = ['title', 'content', 'category', 'subCategory', 'keywords', 'status'];
    const sanitized = {};
    for (const k of allowed) {
      if (updates[k] !== undefined) sanitized[k] = updates[k];
    }
    
    if (sanitized.content) {
      sanitized.wordCount = String(sanitized.content).replace(/<[^>]*>/g, '').replace(/\s/g, '').length;
    }
    sanitized.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await db.collection('posts').doc(postId).update(sanitized);
    console.log('POST updatePost 성공:', postId);
    return okMessage('포스트가 성공적으로 수정되었습니다.');
  } catch (error) {
    if (error.code) throw error;
    console.error('POST updatePost 오류:', error.message);
    throw new HttpsError('internal', '포스트 수정에 실패했습니다.');
  }
});

// 포스트 삭제
exports.deletePost = wrap(async (req) => {
  const { uid } = auth(req);
  const { postId } = req.data || {};
  console.log('POST deletePost 호출:', { userId: uid, postId });

  if (!postId) {
    throw new HttpsError('invalid-argument', '포스트 ID를 입력해주세요.');
  }

  try {
    const postDoc = await db.collection('posts').doc(postId).get();
    if (!postDoc.exists) {
      throw new HttpsError('not-found', '포스트를 찾을 수 없습니다.');
    }
    
    const data = postDoc.data() || {};
    if (data.userId !== uid) {
      throw new HttpsError('permission-denied', '포스트를 삭제할 권한이 없습니다.');
    }

    await db.collection('posts').doc(postId).delete();
    console.log('POST deletePost 성공:', postId);
    return okMessage('포스트가 성공적으로 삭제되었습니다.');
  } catch (error) {
    if (error.code) throw error;
    console.error('POST deletePost 오류:', error.message);
    throw new HttpsError('internal', '포스트 삭제에 실패했습니다.');
  }
});

// 사용량 제한 체크
exports.checkUsageLimit = wrap(async (req) => {
  const { uid } = auth(req);
  console.log('USAGE checkUsageLimit 호출:', { userId: uid });

  try {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const snap = await db.collection('posts')
      .where('userId', '==', uid)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thisMonth))
      .get();

    const used = snap.size;
    const limit = 50;
    
    console.log('USAGE checkUsageLimit 성공:', { used, limit });
    return ok({
      postsGenerated: used,
      monthlyLimit: limit,
      canGenerate: used < limit,
      remainingPosts: Math.max(0, limit - used),
    });
  } catch (error) {
    console.error('USAGE 오류:', error.message);
    if (error.code === 'failed-precondition') {
      return ok({ 
        postsGenerated: 0, 
        monthlyLimit: 50, 
        canGenerate: true, 
        remainingPosts: 50 
      });
    }
    throw new HttpsError('internal', '사용량을 확인하는데 실패했습니다.');
  }
});

// 진짜 AI 원고 생성 함수 (백업에서 복구) - HTTP 버전
exports.generatePosts = httpWrap(async (req) => {
  // HTTP 요청에서는 인증을 간단하게 처리 (테스트용)
  const uid = 'test-user';
  const useBonus = req.data?.useBonus || false;
  
  console.log('🔍 전체 요청 구조:', JSON.stringify({
    data: req.data,
    body: req.rawRequest?.body,
    method: req.rawRequest?.method,
    headers: req.rawRequest?.headers
  }, null, 2));
  
  // 데이터 추출 - Firebase SDK와 HTTP 요청 모두 처리
  let data = req.data || req.rawRequest?.body || {};
  
  // 중첩된 data 구조 처리 (Firebase SDK에서 {data: {실제데이터}} 형태로 올 수 있음)
  if (data.data && typeof data.data === 'object') {
    data = data.data;
  }
  
  console.log('🔥 generatePosts 시작 (실제 AI 생성) - 받은 데이터:', JSON.stringify(data, null, 2));
  
  // prompt 필드 우선 처리
  const topic = data.prompt || data.topic || '';
  const category = data.category || '';
  
  console.log('🔍 검증 중:', { 
    topic: topic ? topic.substring(0, 50) : topic, 
    category,
    rawPrompt: data.prompt,
    rawTopic: data.topic,
    fullTopic: topic
  });
  if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
    console.error('❌ 주제 검증 실패:', { topic, type: typeof topic });
    throw new HttpsError('invalid-argument', '주제를 입력해주세요.');
  }
  
  if (!category || typeof category !== 'string' || category.trim().length === 0) {
    console.error('❌ 카테고리 검증 실패:', { category, type: typeof category });
    throw new HttpsError('invalid-argument', '카테고리를 선택해주세요.');
  }
  
  console.log(`✅ 데이터 검증 통과: 주제="${topic.substring(0, 50)}..." 카테고리="${category}"`);
  
  try {
    // 사용자 프로필 및 Bio 메타데이터 가져오기
    let userProfile = {};
    let bioMetadata = null;
    let personalizedHints = '';

    try {
      // 사용자 기본 정보 조회
      const userDoc = await Promise.race([
        db.collection('users').doc(uid).get(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('프로필 조회 타임아웃')), 5000))
      ]);
      
      if (userDoc.exists) {
        userProfile = userDoc.data();
        console.log('✅ 사용자 프로필 조회 성공:', userProfile.name || 'Unknown');
        
        // 보너스 사용 여부에 따른 사용 가능량 확인
        if (useBonus) {
          const usage = userProfile.usage || { bonusGenerated: 0, bonusUsed: 0 };
          const availableBonus = Math.max(0, usage.bonusGenerated - (usage.bonusUsed || 0));
          
          if (availableBonus <= 0) {
            throw new HttpsError('failed-precondition', '사용 가능한 보너스 원고가 없습니다.');
          }
          
          console.log('✅ 보너스 원고 사용 가능:', { availableBonus });
        } else {
          // 일반 사용량 확인 (기존 로직 유지)
          const usage = userProfile.usage || { postsGenerated: 0, monthlyLimit: 50 };
          
          if (usage.postsGenerated >= usage.monthlyLimit) {
            throw new HttpsError('resource-exhausted', '월간 생성 한도를 초과했습니다.');
          }
          
          console.log('✅ 일반 원고 생성 가능:', { 
            current: usage.postsGenerated, 
            limit: usage.monthlyLimit 
          });
        }
      }

      // Bio 메타데이터 조회 (선택적)
      const bioDoc = await db.collection('bios').doc(uid).get();
      if (bioDoc.exists && bioDoc.data().extractedMetadata) {
        bioMetadata = bioDoc.data().extractedMetadata;
        
        // 메타데이터 기반 개인화 힌트 생성
        personalizedHints = generatePersonalizedHints(bioMetadata);
        console.log('✅ Bio 메타데이터 활용:', Object.keys(bioMetadata));
        
        // Bio 사용 통계 업데이트
        await db.collection('bios').doc(uid).update({
          'usage.generatedPostsCount': admin.firestore.FieldValue.increment(1),
          'usage.lastUsedAt': admin.firestore.FieldValue.serverTimestamp()
        });
      }

    } catch (profileError) {
      console.warn('⚠️ 프로필/Bio 조회 실패, 기본값 사용:', profileError.message);
      userProfile = {
        name: '정치인',
        position: '의원',
        regionMetro: '지역',
        regionLocal: '지역구',
        status: '현역'
      };
    }

    // 프롬프트 생성
    const prompt = `정치인 블로그용 원고 1개를 작성해주세요.

작성자: ${userProfile.name || '정치인'} (${userProfile.position || '의원'})
주제: ${topic}
카테고리: ${category}
세부카테고리: ${data.subCategory || '없음'}
키워드: ${data.keywords || '없음'}

참고자료 및 배경정보: ${Array.isArray(data.instructions) ? data.instructions.filter(item => item.trim()).map((item, index) => `${index + 1}. ${item}`).join('\n') : data.instructions || '없음'}

${personalizedHints ? `개인화 가이드라인: ${personalizedHints}` : ''}

**절대 준수 규칙:**
1. 완전한 원고 1개만 작성 - 중간에 끊지 말고 끝까지 완성하세요
2. 글자 수 1500-2000자 정확히 준수 (꼼수 금지)
3. 템플릿이나 플레이스홀더 사용 금지 - 모든 내용을 실제로 작성하세요
4. 메타 정보나 설명문을 본문에 포함하지 마세요
5. 문장을 중간에 끊거나 불완전하게 끝내지 마세요

다음 JSON 형식으로 응답해주세요:
{
  "title": "원고 제목",
  "content": "<p>HTML 형식의 원고 내용</p>",
  "wordCount": 1750
}

요구사항:
- **필수: 1500-2000자 분량 (정확히 준수)**
- HTML 형식으로 작성 (<p>, <strong> 등 사용)
- 진중하고 신뢰감 있는 톤
- 지역 주민과의 소통을 중시하는 내용
- 구체적인 정책이나 활동 내용 포함
- **참고자료 및 배경정보가 제공된 경우 해당 내용을 적극적으로 활용하여 구체적이고 현실적인 원고를 작성하세요**
- **제공된 실제 데이터, 뉴스, 정책 내용 등을 바탕으로 플레이스홀더나 예시 대신 구체적인 내용을 작성하세요**

**절대 금지사항:**
- "(구체적인 내용)" 같은 플레이스홀더 사용 금지
- "※ 본 원고는..." 같은 메타 정보 포함 금지
- 문장 중간에 끊기거나 불완전한 내용 금지
- 분량 채우기 위한 의미 없는 반복 금지`;

    console.log('🤖 AI 호출 시작 (1개 원고 생성)...');
    
    const apiResponse = await callGenerativeModel(prompt);
    console.log('✅ AI 응답 수신, 길이:', apiResponse.length);
    
    // JSON 파싱
    let parsedResponse;
    try {
      // JSON 블록 추출
      const jsonMatch = apiResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                       apiResponse.match(/\{[\s\S]*?\}/);
      
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        console.log('🔍 추출된 JSON 일부:', jsonText.substring(0, 200));
        parsedResponse = JSON.parse(jsonText);
        console.log('✅ JSON 파싱 성공, 제목:', parsedResponse.title);
      } else {
        throw new Error('JSON 형식 찾기 실패');
      }
    } catch (parseError) {
      console.error('❌ JSON 파싱 실패:', parseError.message);
      console.error('응답 내용:', apiResponse.substring(0, 500));
      
      // 파싱 실패 시 기본 구조 생성
      parsedResponse = {
        title: `${topic} 관련 원고`,
        content: `<p>${topic}에 대한 의견을 나누고자 합니다.</p><p>구체적인 내용은 AI 응답 파싱에 실패했습니다.</p>`,
        wordCount: 100
      };
    }

    // drafts 형식으로 반환 (프론트엔드 호환성)
    const draftData = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: parsedResponse.title || `${topic} 관련 원고`,
      content: parsedResponse.content || `<p>${topic}에 대한 내용입니다.</p>`,
      wordCount: parsedResponse.wordCount || parsedResponse.content?.replace(/<[^>]*>/g, '').length || 0,
      category,
      subCategory: data.subCategory || '',
      keywords: data.keywords || '',
      generatedAt: new Date().toISOString()
    };

    // 사용량 업데이트
    if (userProfile && Object.keys(userProfile).length > 0) {
      try {
        if (useBonus) {
          // 보너스 사용량 증가
          await db.collection('users').doc(uid).update({
            'usage.bonusUsed': admin.firestore.FieldValue.increment(1),
            lastBonusUsed: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log('✅ 보너스 원고 사용량 업데이트');
        } else {
          // 일반 사용량 증가 (기존 로직)
          await db.collection('users').doc(uid).update({
            'usage.postsGenerated': admin.firestore.FieldValue.increment(1),
            lastGenerated: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log('✅ 일반 원고 사용량 업데이트');
        }
      } catch (updateError) {
        console.warn('⚠️ 사용량 업데이트 실패:', updateError.message);
      }
    }

    console.log('✅ generatePosts 성공:', { 
      title: draftData.title, 
      wordCount: draftData.wordCount,
      useBonus
    });

    return ok({ 
      success: true,
      message: useBonus ? '보너스 원고가 성공적으로 생성되었습니다.' : '원고가 성공적으로 생성되었습니다.',
      drafts: draftData,
      metadata: {
        generatedAt: new Date().toISOString(),
        userId: uid,
        processingTime: Date.now(),
        usedBonus: useBonus
      }
    });

  } catch (error) {
    console.error('❌ generatePosts 오류:', error.message);
    throw new HttpsError('internal', '원고 생성에 실패했습니다: ' + error.message);
  }
});


// saveSelectedPost - 선택된 원고 저장
exports.saveSelectedPost = wrap(async (req) => {
  const { uid } = auth(req);
  const data = req.data || {};
  
  console.log('POST saveSelectedPost 호출:', { userId: uid, data });

  if (!data.title || !data.content) {
    throw new HttpsError('invalid-argument', '제목과 내용이 필요합니다.');
  }

  try {
    const wordCount = data.content.replace(/<[^>]*>/g, '').length;

    const postData = {
      userId: uid,
      title: data.title,
      content: data.content,
      category: data.category || '일반',
      subCategory: data.subCategory || '',
      keywords: data.keywords || '',
      wordCount,
      status: 'published',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('posts').add(postData);

    console.log('POST saveSelectedPost 성공:', { postId: docRef.id, wordCount });

    return ok({
      success: true,
      message: '원고가 성공적으로 저장되었습니다.',
      postId: docRef.id
    });

  } catch (error) {
    console.error('POST saveSelectedPost 오류:', error.message);
    throw new HttpsError('internal', '원고 저장에 실패했습니다.');
  }
});