const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 🔥 Gemini API 키를 Secret으로 정의
const geminiApiKey = defineSecret('GEMINI_API_KEY');

// 🔥 타임아웃과 메모리 설정 (asia-northeast3 리전 유지)
setGlobalOptions({
  region: 'asia-northeast3',
  memory: '2GiB',
  timeoutSeconds: 540,
});

admin.initializeApp();
const db = admin.firestore();

const functionOptions = {
  region: 'asia-northeast3',
  memory: '2GiB',
  timeoutSeconds: 540,
  cors: true,
  secrets: [geminiApiKey],
};

// 🔥 다중 모델 백업 전략
const AI_MODELS = [
  { name: "gemini-1.5-flash", priority: 1 },
  { name: "gemini-1.5-pro", priority: 2 },
  { name: "gemini-pro", priority: 3 }
];

// 🔥 Gemini API 호출 with 모델 백업
async function callGeminiWithBackup(prompt) {
  const genAI = new GoogleGenerativeAI(geminiApiKey.value());
  
  for (const modelConfig of AI_MODELS) {
    try {
      console.log(`🤖 ${modelConfig.name} 모델 시도 중...`);
      
      const model = genAI.getGenerativeModel({ 
        model: modelConfig.name,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      });
      
      // 90초 타임아웃
      const response = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`${modelConfig.name} 90초 타임아웃`)), 90000)
        )
      ]);
      
      console.log(`✅ ${modelConfig.name} 성공`);
      return response;
      
    } catch (error) {
      console.warn(`⚠️ ${modelConfig.name} 실패:`, error.message);
      
      // 503 과부하 에러가 아니면 즉시 에러 throw
      if (!error.message.includes('overloaded') && 
          !error.message.includes('503') && 
          !error.message.includes('타임아웃')) {
        throw error;
      }
      
      // 마지막 모델까지 실패하면 에러 throw
      if (modelConfig === AI_MODELS[AI_MODELS.length - 1]) {
        throw new HttpsError('unavailable', 'All AI models are currently overloaded. Please try again in a few minutes.');
      }
      
      // 다음 모델 시도 전 1초 대기
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Gemini로 포스트 생성하는 함수
async function generateWithGemini(model, prompt, retryCount = 0) {
  const maxRetries = 3;
  const models = ['gemini-1.5-flash', 'gemini-1.5-pro'];
  
  for (let i = 0; i < models.length; i++) {
    try {
      console.log(`🤖 ${models[i]} 모델로 생성 시도 (재시도: ${retryCount})`);
      
      const genAI = new GoogleGenerativeAI(geminiApiKey.value());
      const currentModel = genAI.getGenerativeModel({ model: models[i] });
      const result = await currentModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      if (!text || text.length < 50) {
        throw new Error('생성된 텍스트가 너무 짧습니다.');
      }
      
      console.log(`✅ ${models[i]} 생성 성공 (길이: ${text.length})`);
      return text;
      
    } catch (error) {
      console.error(`❌ ${models[i]} 생성 실패:`, error.message);
      
      if (error.message.includes('SAFETY') || error.message.includes('안전')) {
        throw new HttpsError('invalid-argument', 
          'AI 안전 정책에 위배되는 내용입니다. 다른 주제로 시도해주세요.');
      }
      
      if (error.message.includes('QUOTA_EXCEEDED') || error.message.includes('quota')) {
        if (retryCount < maxRetries && i === models.length - 1) {
          console.log(`🔄 할당량 초과, 5초 후 재시도 (${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          return generateWithGemini(model, prompt, retryCount + 1);
        }
        throw new HttpsError('resource-exhausted', 
          'AI 서비스 사용량을 초과했습니다. 5-10분 후 다시 시도해주세요.');
      }
      
      if (error.message.includes('timeout') || error.message.includes('타임아웃')) {
        throw new HttpsError('deadline-exceeded', 'AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
      }
      
      // 다음 모델 시도 전 1초 대기
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new HttpsError('unavailable', 
    'AI 서비스에 일시적 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
}

// 🔥 generatePosts Function
exports.generatePosts = onCall(functionOptions, async (request) => {
  const startTime = Date.now();
  console.log('🔥 generatePosts 시작 (1개 생성 버전)');
  
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const { category, content, userProfile } = request.data;
    
    if (!category || !content) {
      throw new HttpsError('invalid-argument', '카테고리와 내용을 입력해주세요.');
    }

    console.log('📝 원고 생성 요청:', { 
      category: category.substring(0, 50), 
      contentLength: content.length,
      userProfile: userProfile?.name || 'Unknown'
    });

    // 프롬프트 구성
    const prompt = `
당신은 정치인을 위한 전문 원고 작성자입니다.

사용자 정보:
- 이름: ${userProfile?.name || '정치인'}
- 직책: ${userProfile?.position || '의원'}
- 지역: ${userProfile?.regionMetro || ''} ${userProfile?.regionLocal || ''}
- 선거구: ${userProfile?.electoralDistrict || ''}

요청사항:
- 카테고리: ${category}
- 내용: ${content}

다음 지침에 따라 블로그 원고를 작성해주세요:

1. 1000-1500자 분량의 완성된 블로그 포스트 작성
2. 친근하고 진정성 있는 어조 사용
3. 지역 주민들의 관심사와 연결
4. 구체적인 정책이나 활동 내용 포함
5. 제목, 본문, 마무리 인사까지 완전한 형태

원고를 작성해주세요:
`;

    const result = await generateWithGemini('gemini-1.5-flash', prompt);

    console.log('✅ generatePosts 성공:', Date.now() - startTime, 'ms');
    
    return {
      success: true,
      posts: [result],
      processingTime: Date.now() - startTime
    };

  } catch (error) {
    console.error('❌ generatePosts 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'AI 원고 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }
});

// getDashboardData Function
exports.getDashboardData = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    console.log('🔥 getDashboardData 호출:', userId);
    
    const usage = {
      current: 5,
      total: 30
    };

    try {
      const postsSnapshot = await db.collection('posts')
        .where('authorId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

      const recentPosts = postsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '제목 없음',
          status: data.status || 'draft',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        };
      });

      console.log('✅ Dashboard 데이터 성공:', { usage, postsCount: recentPosts.length });

      return {
        success: true,
        data: {
          usage,
          recentPosts
        }
      };

    } catch (firestoreError) {
      console.error('Firestore 조회 오류:', firestoreError);
      return {
        success: true,
        data: {
          usage,
          recentPosts: []
        }
      };
    }

  } catch (error) {
    console.error('❌ getDashboardData 오류:', error);
    throw new HttpsError('internal', '데이터를 불러오는데 실패했습니다.');
  }
});

// getUserProfile Function
exports.getUserProfile = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    console.log('🔥 getUserProfile 호출:', userId);

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
        role: 'user'
      };

      if (userDoc.exists) {
        profile = { ...profile, ...userDoc.data() };
      }

      console.log('✅ getUserProfile 성공');
      return {
        success: true,
        profile
      };

    } catch (firestoreError) {
      console.error('Firestore 조회 오류:', firestoreError);
      return {
        success: true,
        profile: {
          name: request.auth.token.name || '',
          email: request.auth.token.email || '',
          position: '',
          regionMetro: '',
          regionLocal: '',
          electoralDistrict: '',
          status: '현역',
          role: 'user'
        }
      };
    }

  } catch (error) {
    console.error('❌ getUserProfile 오류:', error);
    throw new HttpsError('internal', '프로필을 불러오는데 실패했습니다.');
  }
});

// 🔥 회원가입 및 선거구 중복 체크
exports.registerWithDistrictCheck = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const { profileData } = request.data;
    const userId = request.auth.uid;

    console.log('🔥 registerWithDistrictCheck 호출:', { userId, profileData });

    // 필수 필드 검증
    if (!profileData || !profileData.regionMetro || !profileData.regionLocal || !profileData.electoralDistrict || !profileData.position) {
      throw new HttpsError('invalid-argument', '지역구 정보를 모두 입력해주세요.');
    }

    const { regionMetro, regionLocal, electoralDistrict, position } = profileData;

    // 선거구 중복 검사
    const existingUserQuery = await db.collection('users')
      .where('regionMetro', '==', regionMetro)
      .where('regionLocal', '==', regionLocal)
      .where('electoralDistrict', '==', electoralDistrict)
      .where('position', '==', position)
      .get();

    if (!existingUserQuery.empty) {
      // 기존 사용자가 있는 경우, 현재 사용자가 아닌지 확인
      const existingUser = existingUserQuery.docs[0];
      if (existingUser.id !== userId) {
        const existingUserData = existingUser.data();
        throw new HttpsError('already-exists', 
          `해당 선거구(${electoralDistrict})에는 이미 등록된 ${position}이 있습니다. (${existingUserData.name || '이름 없음'})`
        );
      }
    }

    // 중복이 없으면 프로필 저장
    const userProfileData = {
      ...profileData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      role: 'user'
    };

    await db.collection('users').doc(userId).set(userProfileData, { merge: true });

    console.log('✅ registerWithDistrictCheck 성공');
    return {
      success: true,
      message: '회원가입이 완료되었습니다.'
    };

  } catch (error) {
    console.error('❌ registerWithDistrictCheck 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '회원가입 처리 중 오류가 발생했습니다.');
  }
});

// 🔥 선거구 사용 가능 여부 확인 함수
exports.checkDistrictAvailability = onCall(functionOptions, async (request) => {
  try {
    const { regionMetro, regionLocal, electoralDistrict, position } = request.data;

    if (!regionMetro || !regionLocal || !electoralDistrict || !position) {
      throw new HttpsError('invalid-argument', '모든 지역구 정보를 입력해주세요.');
    }

    const existingUserQuery = await db.collection('users')
      .where('regionMetro', '==', regionMetro)
      .where('regionLocal', '==', regionLocal)
      .where('electoralDistrict', '==', electoralDistrict)
      .where('position', '==', position)
      .get();

    const isAvailable = existingUserQuery.empty;
    let occupiedBy = null;

    if (!isAvailable) {
      const existingUserData = existingUserQuery.docs[0].data();
      occupiedBy = existingUserData.name || '이름 없음';
    }

    return {
      success: true,
      available: isAvailable,
      occupiedBy
    };

  } catch (error) {
    console.error('❌ checkDistrictAvailability 오류:', error);
    throw new HttpsError('internal', '선거구 확인 중 오류가 발생했습니다.');
  }
});

// updateProfile Function
exports.updateProfile = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    const profileData = request.data;

    console.log('🔥 updateProfile 호출:', { userId, profileData });

    if (!profileData || typeof profileData !== 'object') {
      throw new HttpsError('invalid-argument', '올바른 프로필 데이터를 입력해주세요.');
    }

    const allowedFields = ['name', 'position', 'regionMetro', 'regionLocal', 'electoralDistrict', 'status'];
    const sanitizedData = {};
    
    allowedFields.forEach(field => {
      if (profileData[field] !== undefined) {
        sanitizedData[field] = profileData[field];
      }
    });

    await db.collection('users').doc(userId).set({
      ...sanitizedData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log('✅ updateProfile 성공');
    return {
      success: true,
      message: '프로필이 성공적으로 업데이트되었습니다.'
    };

  } catch (error) {
    console.error('❌ updateProfile 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '프로필 업데이트에 실패했습니다.');
  }
});

// 🔥 savePost Function
exports.savePost = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const { title, content, category, subCategory, metadata } = request.data;
    const userId = request.auth.uid;

    console.log('🔥 savePost 호출:', { userId, title: title?.substring(0, 50) });

    if (!title || !content) {
      throw new HttpsError('invalid-argument', '제목과 내용을 입력해주세요.');
    }

    const postData = {
      title: title.trim(),
      content: content.trim(),
      category: category || '일반',
      subCategory: subCategory || '',
      authorId: userId,
      status: 'draft',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: metadata || {}
    };

    const docRef = await db.collection('posts').add(postData);

    console.log('✅ savePost 성공:', docRef.id);
    return {
      success: true,
      postId: docRef.id,
      message: '포스트가 성공적으로 저장되었습니다.'
    };

  } catch (error) {
    console.error('❌ savePost 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '포스트 저장에 실패했습니다.');
  }
});

// 🔥 사용자 포스트 목록 조회
exports.getUserPosts = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userId = request.auth.uid;
    console.log('🔥 getUserPosts 호출:', userId);

    const postsSnapshot = await db.collection('posts')
      .where('authorId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const posts = postsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null
    }));

    console.log('✅ getUserPosts 성공:', posts.length);

    return {
      success: true,
      posts: posts
    };

  } catch (error) {
    console.error('❌ getUserPosts 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '포스트 목록을 불러오는데 실패했습니다.');
  }
});

// 🔥 특정 포스트 조회
exports.getPost = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const { postId } = request.data;
    if (!postId) {
      throw new HttpsError('invalid-argument', '포스트 ID가 필요합니다.');
    }

    console.log('🔥 getPost 호출:', postId);

    const postDoc = await db.collection('posts').doc(postId).get();
    
    if (!postDoc.exists) {
      throw new HttpsError('not-found', '포스트를 찾을 수 없습니다.');
    }

    const postData = postDoc.data();
    
    // 작성자 확인
    if (postData.authorId !== request.auth.uid) {
      throw new HttpsError('permission-denied', '이 포스트에 접근할 권한이 없습니다.');
    }

    const post = {
      id: postDoc.id,
      ...postData,
      createdAt: postData.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: postData.updatedAt?.toDate?.()?.toISOString() || null
    };

    console.log('✅ getPost 성공');

    return {
      success: true,
      post: post
    };

  } catch (error) {
    console.error('❌ getPost 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '포스트를 불러오는데 실패했습니다.');
  }
});

// 🔥 포스트 업데이트
exports.updatePost = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const { postId, title, content } = request.data;
    
    if (!postId) {
      throw new HttpsError('invalid-argument', '포스트 ID가 필요합니다.');
    }

    console.log('🔥 updatePost 호출:', postId);

    const postDoc = await db.collection('posts').doc(postId).get();
    
    if (!postDoc.exists) {
      throw new HttpsError('not-found', '포스트를 찾을 수 없습니다.');
    }

    const postData = postDoc.data();
    
    // 작성자 확인
    if (postData.authorId !== request.auth.uid) {
      throw new HttpsError('permission-denied', '이 포스트를 수정할 권한이 없습니다.');
    }

    // 업데이트 데이터 구성
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (title !== undefined) {
      updateData.title = title.trim();
    }
    
    if (content !== undefined) {
      updateData.content = content.trim();
    }

    await db.collection('posts').doc(postId).update(updateData);

    console.log('✅ updatePost 성공');

    return {
      success: true,
      message: '포스트가 성공적으로 업데이트되었습니다.'
    };

  } catch (error) {
    console.error('❌ updatePost 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '포스트 업데이트에 실패했습니다.');
  }
});

// 🔥 관리자용 사용자 목록 조회 - ✅ 수정 완료
exports.getUserList = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    console.log('🔥 getUserList 호출 - 사용자 UID:', request.auth.uid);

    // ✅ 관리자 권한 확인 - 주석 해제하고 활성화
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    
    if (!userDoc.exists) {
      console.log('❌ 사용자 문서를 찾을 수 없음:', request.auth.uid);
      throw new HttpsError('not-found', '사용자 정보를 찾을 수 없습니다.');
    }

    const userData = userDoc.data();
    console.log('🔍 사용자 데이터:', { uid: request.auth.uid, role: userData.role, email: userData.email });

    if (!userData.role || userData.role !== 'admin') {
      console.log('❌ 관리자 권한이 없음:', userData.role);
      throw new HttpsError('permission-denied', '관리자 권한이 필요합니다.');
    }

    console.log('✅ 관리자 권한 확인 완료');

    const usersSnapshot = await db.collection('users').limit(100).get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
    }));

    console.log('✅ getUserList 성공:', users.length);

    return {
      success: true,
      users: users
    };

  } catch (error) {
    console.error('❌ getUserList 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '사용자 목록을 불러오는데 실패했습니다.');
  }
});

// 🔥 관리자 권한 설정 함수 - 추가
exports.setAdminRole = onCall(functionOptions, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    // 특정 이메일만 관리자로 설정 가능
    const adminEmails = ['kjk6206@gmail.com']; // 실제 관리자 이메일
    
    if (!adminEmails.includes(request.auth.token.email)) {
      throw new HttpsError('permission-denied', '관리자 설정 권한이 없습니다.');
    }

    const userId = request.auth.uid;
    console.log('🔥 관리자 역할 설정:', userId, request.auth.token.email);

    await db.collection('users').doc(userId).set({
      role: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log('✅ 관리자 역할 설정 완료');

    return {
      success: true,
      message: '관리자 권한이 설정되었습니다.'
    };

  } catch (error) {
    console.error('❌ setAdminRole 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '관리자 권한 설정에 실패했습니다.');
  }
});

// 🔥 테스트 함수
exports.testGenerate = onCall(functionOptions, async (request) => {
  const startTime = Date.now();
  console.log('🔥 testGenerate 시작');
  
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const testPrompt = "간단한 인사말 생성 테스트";
    const result = await generateWithGemini('gemini-1.5-flash', testPrompt);

    console.log('✅ testGenerate 성공:', Date.now() - startTime, 'ms');
    
    return {
      success: true,
      result: result.substring(0, 200),
      processingTime: Date.now() - startTime
    };

  } catch (error) {
    console.error('❌ testGenerate 오류:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'AI 테스트 실패');
  }
});