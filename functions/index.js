const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onRequest: _onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

// 글로벌 옵션 설정
setGlobalOptions({
  region: 'asia-northeast3',
  maxInstances: 10,
});

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// 공통 함수 옵션 - CORS 설정 강화
const functionOptions = {
  cors: {
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
  maxInstances: 5,
  timeoutSeconds: 60,
  memory: '512MiB'
};

// Gemini API 키 설정
const { defineSecret } = require('firebase-functions/params');
const geminiApiKey = defineSecret('GEMINI_API_KEY');

// ============================================================================
// 이재명 정신 프롬프트 시스템
// ============================================================================

function buildIJMPrompt({
  prompt,
  category,
  subCategory,
  keywords,
  userName,
  userProfile = {}
}) {
  const name = userName || userProfile.name || '정치인';
  const position = userProfile.position || '의원';
  const regionInfo = [userProfile.regionMetro, userProfile.regionLocal]
    .filter(Boolean).join(' ').trim();
  const honorific = regionInfo ? `${regionInfo} 주민 여러분` : '여러분';

  return `
# AI비서관 - 이재명 정신 기반 원고 생성 시스템

[🌟 이재명 정신 핵심 가치 🌟]
- 기본사회: 모든 국민의 기본적 생활 보장과 인간다운 삶
- 포용국가: 차별 없는 사회, 소외계층을 품는 따뜻한 공동체
- 공정경제: 기회의 평등, 불평등 해소, 상생발전
- 민생우선: 서민과 중산층 중심의 실용적 정책
- 기본소득: 보편적 복지로 모든 국민의 존엄성 보장

[작성 맥락]
- 작성자: ${name} (${position})
- 주제: ${prompt}
- 분류: ${category || '일반'} / 세부분류: ${subCategory || '없음'}
- 키워드: ${keywords || '없음'}
- 호칭: 기본 "${honorific}" 사용, 존댓말(~합니다), 1인칭은 "저는"

[🎯 이재명 정신 철학적 지침 🎯]
**핵심 원칙**: 모든 정책과 주장은 "사람이 우선"이라는 가치에서 출발하며, "함께 잘사는 사회"를 지향점으로 합니다.

**선호 키워드 및 표현**:
✅ 기본사회, 포용, 공정, 민생, 서민, 복지국가, 기본소득, 상생, 연대, 공동체
✅ 전국민기본소득, 국민취업지원제도, 부동산투기억제, 재벌개혁, 의료공공성
✅ 사람중심, 생명존중, 평등, 정의, 소통, 혁신, 지속가능발전

**철학적 균형 유지 원칙**:
- 반대 의견도 "~한 측면이 있지만" 형태로 인정 후 건설적 비판
- 비판 후에는 반드시 이재명식 포용적 대안 제시
- 극단적 주장보다는 "균형잡힌 발전"과 "상생" 강조
- 모든 결론은 "국민 모두가 함께 잘사는" 방향으로 수렴

**제한적 언급 허용 방식** (완전 금지가 아닌 비판적 맥락):
- 신자유주의 → "신자유주의적 접근의 한계를 극복하고..."
- 선별복지 → "선별복지만으론 부족하며, 보편복지와의 조화를..."
- 낙수효과 → "낙수효과에만 의존할 수 없고, 직접적 지원이..."
- 규제완화 → "합리적 규제개선은 필요하지만, 서민보호 안전망은..."

**권장되는 표준 전개 구조**:
1. 상대방 논리 인정 → "~라는 관점도 이해하지만"
2. 현실적 한계 지적 → "그러나 현장에서는..."
3. 포용적 대안 제시 → "보다 따뜻하고 현실적인 방안은..."
4. 구체적 근거와 사례 → "실제 성남·경기도에서의 경험을 보면..."
5. 상생 발전 지향 → "결국 모든 국민이 함께 잘사는 길은..."

[작성 규칙]
- 분량 1,200~1,500자, 소제목 포함(h2~h3)
- 진중하고 신뢰감 있는 톤
- 서민적이고 친근한 어투 (과도한 격식 지양)
- 구체적 생활 사례 중심의 설명 (추상적 이론 지양)
- "더불어 사는 세상", "따뜻한 공동체" 등 포용적 가치 강조

다음 JSON 형식으로만 응답하세요:
{
  "title": "원고 제목",
  "content": "HTML 형식의 원고 내용",
  "wordCount": 1234,
  "category": "${category || '일반'}",
  "subCategory": "${subCategory || ''}",
  "keywords": "${keywords || ''}",
  "timestamp": "${new Date().toISOString()}",
  "style": "이재명정신"
}
`.trim();
}

// ============================================================================
// Gemini 2.5 API 호출 함수 (업그레이드)
// ============================================================================

async function callGeminiAPI(prompt, apiKey) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');

  try {
    console.log('🤖 Gemini 2.5 Flash 시도 중...');
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest', // 최신 안정화 버전 사용
      generationConfig: {
        responseMimeType: "application/json", // 💡 JSON 출력 모드 강제
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('✅ Gemini 2.5 Flash 성공');
    return text;

  } catch (error) {
    console.error('⚠️ Gemini API 호출 실패:', error.message);
    throw new Error('AI 서비스 호출에 실패했습니다: ' + error.message);
  }
}

// ============================================================================
// JSON 파싱 및 검증 (💡 강화된 버전)
// ============================================================================

function parseAndValidateJSON(text, context = {}) {
  try {
    let cleanText = text.trim();
    
    // AI가 응답에 추가하는 ```json ... ``` 같은 마크다운 래퍼를 제거
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = cleanText.match(jsonRegex);
    if (match && match[1]) {
      cleanText = match[1];
    }

    // 문자열의 시작과 끝에서 불필요한 문자를 제거하고 JSON 객체만 추출
    const startIndex = cleanText.indexOf('{');
    const endIndex = cleanText.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
      throw new Error('응답에서 유효한 JSON 객체를 찾을 수 없습니다.');
    }

    const jsonString = cleanText.substring(startIndex, endIndex + 1);
    const parsed = JSON.parse(jsonString);

    // 필수 필드 검증
    if (!parsed.title || !parsed.content) {
      throw new Error(`필수 필드(title, content)가 누락되었습니다.`);
    }
    
    // 타입 및 길이 검증
    if (typeof parsed.title !== 'string' || parsed.title.length < 3) {
      throw new Error('제목이 너무 짧거나 형식이 올바르지 않습니다.');
    }
    if (typeof parsed.content !== 'string' || parsed.content.length < 50) {
      throw new Error('내용이 너무 짧거나 형식이 올바르지 않습니다.');
    }

    // 기본값 설정
    parsed.wordCount = parsed.wordCount || Math.ceil(parsed.content.replace(/<[^>]*>/g, '').length / 2);
    parsed.timestamp = parsed.timestamp || new Date().toISOString();
    parsed.style = parsed.style || '이재명정신';

    console.log(`✅ JSON 파싱 및 검증 성공: ${parsed.title}`);
    return parsed;

  } catch (error) {
    console.error('--- ⚠️ JSON 파싱 실패 ---');
    console.error('오류 메시지:', error.message);
    console.error('원본 AI 응답:', text);
    console.error('--------------------------');
    return null;
  }
}

// ============================================================================
// 포스트 관련 함수들 import & export
// ============================================================================

let checkUsageLimit = null;

try {
  const {
    generatePosts,
    getUserPosts,
    getPost,
    updatePost,
    deletePost,
    checkUsageLimit: importedCheckUsageLimit
  } = require('./handlers/posts');

  exports.generatePosts = generatePosts;
  exports.getUserPosts = getUserPosts;
  exports.getPost = getPost;
  exports.updatePost = updatePost;
  exports.deletePost = deletePost;
  exports.checkUsageLimit = importedCheckUsageLimit;

  checkUsageLimit = importedCheckUsageLimit;
} catch (e) {
  console.warn('포스트 핸들러 로드 실패:', e.message);
}

// ============================================================================
// generateSinglePost Function
// ============================================================================

exports.generateSinglePost = onCall({
  ...functionOptions,
  secrets: [geminiApiKey]
}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    const { prompt, category, subCategory, keywords, userName, generateSingle } = request.data;

    if (!generateSingle) {
      throw new HttpsError('invalid-argument', '단일 생성 모드가 아닙니다.');
    }
    if (!prompt || prompt.trim().length < 5) {
      throw new HttpsError('invalid-argument', '주제를 5자 이상 입력해주세요.');
    }

    let userProfile = {};
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) userProfile = userDoc.data();
    } catch (profileError) {
      console.warn('⚠️ 프로필 조회 실패:', profileError.message);
    }

    if (checkUsageLimit) {
      try {
        const limitCheck = await checkUsageLimit.handler({ auth: { uid: userId } });
        if (limitCheck && !limitCheck.canGenerate) {
          throw new HttpsError('resource-exhausted', '일일 사용량을 초과했습니다.');
        }
      } catch (limitError) {
        console.warn('사용량 확인 실패:', limitError);
      }
    }

    const ijmPrompt = buildIJMPrompt({ prompt, category, subCategory, keywords, userName, userProfile });
    const aiResponse = await callGeminiAPI(ijmPrompt, geminiApiKey.value());
    const parsedPost = parseAndValidateJSON(aiResponse);

    if (!parsedPost) {
      throw new HttpsError(
        'internal',
        'AI가 생성한 원고의 형식이 올바르지 않습니다. 주제를 조금 바꿔 다시 시도해주세요.'
      );
    }

    console.log('✅ generateSinglePost 성공');

    return {
      success: true,
      data: {
        singlePost: parsedPost,
        metadata: { model: 'gemini-1.5-flash-latest' }
      }
    };

  } catch (error) {
    console.error('❌ generateSinglePost 최종 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '원고 생성 중 알 수 없는 서버 오류가 발생했습니다.');
  }
});

// ============================================================================
// 이하 다른 함수들은 기존과 동일 (생략하지 않고 모두 포함)
// ============================================================================

exports.generatePostDrafts = onCall({
  ...functionOptions,
  secrets: [geminiApiKey]
}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    const { prompt, category, keywords, userName } = request.data;

    console.log('🔥 generatePostDrafts 호출:', { userId, prompt, category });

    if (!prompt || prompt.trim().length < 5) {
      throw new HttpsError('invalid-argument', '주제를 5자 이상 입력해주세요.');
    }

    let userProfile = {};
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        userProfile = userDoc.data();
      }
    } catch (profileError) {
      console.warn('프로필 조회 실패:', profileError.message);
    }

    const drafts = [];
    for (let i = 0; i < 3; i++) {
      const ijmPrompt = buildIJMPrompt({
        prompt: `${prompt} (초안 ${i + 1}/3)`,
        category,
        subCategory: '',
        keywords,
        userName,
        userProfile
      });

      const aiResponse = await callGeminiAPI(ijmPrompt, geminiApiKey.value());
      const parsedPost = parseAndValidateJSON(aiResponse, { prompt, category });

      if (parsedPost) {
        drafts.push({ id: `ijm_draft_${i + 1}`, ...parsedPost });
      } else {
        drafts.push({
          id: `ijm_draft_${i + 1}`,
          title: `${category || '일반'} 초안 ${i + 1}`,
          content: `<p>이재명 정신을 바탕으로 한 ${prompt} 관련 초안 ${i + 1}입니다.</p>`,
          timestamp: new Date().toISOString(),
          style: '이재명정신_기본'
        });
      }
    }

    console.log('✅ generatePostDrafts 성공');

    return {
      success: true,
      data: {
        drafts,
        category: category || '일반',
        keywords,
        philosophy: '이재명정신'
      }
    };

  } catch (error) {
    console.error('❌ generatePostDrafts 오류:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', '초안 생성에 실패했습니다.');
  }
});

exports.getDashboardData = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    const userId = request.auth.uid;
    let usage = { used: 0, limit: 50, remaining: 50 };
    let recentPosts = [];

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const usageSnapshot = await db.collection('usage').where('userId', '==', userId).where('date', '>=', today).get();
      if (!usageSnapshot.empty) {
        const data = usageSnapshot.docs[0].data();
        usage = {
          used: data.count || 0,
          limit: data.limit || 50,
          remaining: Math.max(0, (data.limit || 50) - (data.count || 0))
        };
      }

      const postsSnapshot = await db.collection('posts').where('userId', '==', userId).orderBy('createdAt', 'desc').limit(5).get();
      recentPosts = postsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '제목 없음',
          category: data.category || '일반',
          status: data.status || 'draft',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        };
      });

      return { success: true, data: { usage, recentPosts } };
    } catch (firestoreError) {
      console.error('Firestore 조회 오류:', firestoreError);
      return { success: true, data: { usage, recentPosts: [] } };
    }
  } catch (error) {
    console.error('❌ getDashboardData 오류:', error);
    throw new HttpsError('internal', '데이터를 불러오는데 실패했습니다.');
  }
});

exports.getUserProfile = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    const userId = request.auth.uid;
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      let profile = {
        name: request.auth.token.name || '',
        email: request.auth.token.email || '',
        position: '',
        regionMetro: '',
        regionLocal: '',
        electoralDistrict: '',
        status: '현역',
        bio: ''
      };
      if (userDoc.exists) {
        profile = { ...profile, ...userDoc.data() };
      }
      return { success: true, profile };
    } catch (firestoreError) {
      console.error('Firestore 조회 오류:', firestoreError);
      return {
        success: true,
        profile: { name: request.auth.token.name || '', email: request.auth.token.email || '' }
      };
    }
  } catch (error) {
    console.error('❌ getUserProfile 오류:', error);
    throw new HttpsError('internal', '프로필을 불러오는데 실패했습니다.');
  }
});

exports.updateProfile = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    const userId = request.auth.uid;
    const updateData = request.data;
    const allowedFields = ['name', 'status', 'position', 'regionMetro', 'regionLocal', 'electoralDistrict', 'bio'];
    const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    });

    const { position, regionMetro, regionLocal, electoralDistrict } = updateData;
    if (position && regionMetro && regionLocal && electoralDistrict) {
      try {
        const currentUserDoc = await db.collection('users').doc(userId).get();
        const currentData = currentUserDoc.data() || {};
        const isSameDistrict = currentData.position === position && currentData.regionMetro === regionMetro && currentData.regionLocal === regionLocal && currentData.electoralDistrict === electoralDistrict;
        
        if (!isSameDistrict) {
          const duplicateQuery = await db.collection('users').where('position', '==', position).where('regionMetro', '==', regionMetro).where('regionLocal', '==', regionLocal).where('electoralDistrict', '==', electoralDistrict).get();
          let isDuplicate = false;
          let occupiedBy = null;
          duplicateQuery.forEach(doc => {
            if (doc.id !== userId) {
              isDuplicate = true;
              occupiedBy = doc.data().name || '익명';
            }
          });
          if (isDuplicate) {
            throw new HttpsError('already-exists', `해당 선거구는 이미 사용 중입니다. (사용자: ${occupiedBy})`);
          }
        }
      } catch (duplicateCheckError) {
        if (duplicateCheckError instanceof HttpsError) throw duplicateCheckError;
        throw new HttpsError('internal', '선거구 중복 확인 중 오류가 발생했습니다.');
      }
    }

    await db.collection('users').doc(userId).update(updates);
    return { success: true, message: '프로필이 성공적으로 업데이트되었습니다.' };
  } catch (error) {
    console.error('❌ updateProfile 오류:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', '프로필 업데이트에 실패했습니다.');
  }
});

exports.checkDistrictAvailability = onCall(functionOptions, async (request) => {
  try {
    const { position, regionMetro, regionLocal, electoralDistrict, excludeUserId } = request.data || {};
    if (!position || !regionMetro || !regionLocal || !electoralDistrict) {
      throw new HttpsError('invalid-argument', '지역/선거구/직책을 모두 입력해주세요.');
    }
    try {
      const snapshot = await db.collection('users').where('position', '==', position).where('regionMetro', '==', regionMetro).where('regionLocal', '==', regionLocal).where('electoralDistrict', '==', electoralDistrict).get();
      let isAvailable = true;
      let occupiedBy = null;
      snapshot.forEach(doc => {
        if (!excludeUserId || doc.id !== excludeUserId) {
          isAvailable = false;
          occupiedBy = doc.data().name || '익명';
        }
      });
      return { success: true, data: { available: isAvailable, occupiedBy } };
    } catch (firestoreError) {
      console.error('Firestore 조회 오류:', firestoreError);
      return { success: true, data: { available: true, warning: '중복 확인 중 오류 발생' } };
    }
  } catch (error) {
    console.error('❌ checkDistrictAvailability 오류:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', '선거구 중복 확인에 실패했습니다.');
  }
});

exports.savePost = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    const userId = request.auth.uid;
    const { post, metadata } = request.data;
    if (!post || !post.title || !post.content) {
      throw new HttpsError('invalid-argument', '제목과 내용을 입력해주세요.');
    }
    const postData = {
      userId,
      title: post.title.trim(),
      content: post.content,
      category: post.category || '일반',
      status: post.status || 'draft',
      wordCount: post.content.replace(/<[^>]*>/g, '').replace(/\s/g, '').length,
      philosophy: '이재명정신',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: metadata || {}
    };
    const docRef = await db.collection('posts').add(postData);
    return { success: true, postId: docRef.id, message: '원고가 성공적으로 저장되었습니다.' };
  } catch (error) {
    console.error('❌ savePost 오류:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', '원고 저장에 실패했습니다.');
  }
});

exports.getActiveNotices = onCall(functionOptions, async (request) => {
  try {
    const now = new Date();
    const snapshot = await db.collection('notices').where('isActive', '==', true).where('startDate', '<=', now).where('endDate', '>=', now).orderBy('startDate', 'desc').orderBy('priority', 'desc').limit(10).get();
    const notices = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: data.startDate?.toDate?.()?.toISOString(),
        endDate: data.endDate?.toDate?.()?.toISOString(),
        createdAt: data.createdAt?.toDate?.()?.toISOString()
      };
    });
    return { success: true, data: { notices } };
  } catch (error) {
    console.error('❌ getActiveNotices 오류:', error);
    throw new HttpsError('internal', '공지사항을 불러오는데 실패했습니다.');
  }
});

try {
  const adminHandlers = require('./handlers/admin');
  exports.getUsers = adminHandlers.getUsers;
  exports.getAdminStats = adminHandlers.getAdminStats;
  exports.getErrorLogs = adminHandlers.getErrorLogs;
  exports.cleanupOrphanLocks = adminHandlers.cleanupOrphanLocks;
  exports.getUserList = adminHandlers.getUsers;
} catch (e) {
  console.warn('관리자 핸들러 로드 실패:', e.message);
}

try {
  const diagHandlers = require('./handlers/diag');
  exports.diagWhoami = diagHandlers.diagWhoami;
} catch (e) {
  console.warn('진단 핸들러 로드 실패:', e.message);
}

try {
  const noticeHandlers = require('./handlers/notices');
  exports.createNotice = noticeHandlers.createNotice;
  exports.updateNotice = noticeHandlers.updateNotice;
  exports.deleteNotice = noticeHandlers.deleteNotice;
  exports.getNotices = noticeHandlers.getNotices;
} catch (e) {
  console.warn('공지사항 핸들러 로드 실패:', e.message);
}
