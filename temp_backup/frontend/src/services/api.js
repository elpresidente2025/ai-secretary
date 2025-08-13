// frontend/src/services/api.js
// 🚨 임시 더미 API 클라이언트 (빌드 에러 해결용)

const apiClient = {
  get: async (url) => {
    console.log('🚨 더미 API GET 호출:', url);
    return { 
      data: { 
        posts: [], 
        error: '아직 구현되지 않은 API입니다.' 
      } 
    };
  },
  post: async (url, data) => {
    console.log('🚨 더미 API POST 호출:', url, data);
    return { 
      data: { 
        success: false, 
        error: '아직 구현되지 않은 API입니다.' 
      } 
    };
  },
  put: async (url, data) => {
    console.log('🚨 더미 API PUT 호출:', url, data);
    return { 
      data: { 
        success: false, 
        error: '아직 구현되지 않은 API입니다.' 
      } 
    };
  },
  delete: async (url) => {
    console.log('🚨 더미 API DELETE 호출:', url);
    return { 
      data: { 
        success: false, 
        error: '아직 구험되지 않은 API입니다.' 
      } 
    };
  }
};

export default apiClient;