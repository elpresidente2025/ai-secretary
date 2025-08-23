// frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';
import {
  PlusCircle,
  FileText,
  TrendingUp,
  Bell,
  CreditCard,
  ChevronRight,
  Calendar,
  AlertCircle
} from 'lucide-react';
// LoadingSpinner import 제거
// import LoadingSpinner from '../components/LoadingSpinner';
import ElectionDDay from '../components/ElectionDDay';

function Dashboard() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usage, setUsage] = useState({ postsGenerated: 0, monthlyLimit: 50 });
  const [recentPosts, setRecentPosts] = useState([]);
  const [notices, setNotices] = useState([]);

  // 관리자 여부 확인
  const isAdmin = userProfile?.isAdmin === true;

  // 플랜명 설정
  const planName = isAdmin ? 
    '관리자' : getPlanName(usage.monthlyLimit);

  // 플랜명 결정 함수
  function getPlanName(limit) {
    if (limit >= 90) return '오피니언 리더';
    if (limit >= 30) return '리전 인플루언서';
    return '로컬 블로거';
  }

  // 플랜별 색상 가져오기
  function getPlanColor(planName) {
    switch(planName) {
      case '로컬 블로거': return '#003a87';
      case '리전 인플루언서': return '#55207d';
      case '오피니언 리더': return '#006261';
      default: return '#003a87';
    }
  }

  const planColor = getPlanColor(planName);

  // 실제 데이터 로딩
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.uid) return;
      
      setIsLoading(true);
      setError(null);

      try {
        console.log('🔥 Dashboard 데이터 로딩 시작');
        
        // Firebase Functions 호출
        const getDashboardDataFn = httpsCallable(functions, 'getDashboardData');
        const response = await getDashboardDataFn();
        
        console.log('✅ Dashboard 응답:', response.data);
        
        const dashboardData = response.data.data;
        
        // 사용량 정보 설정
        setUsage(dashboardData.usage || { postsGenerated: 0, monthlyLimit: 50 });
        
        // 최근 포스트 설정
        setRecentPosts(dashboardData.recentPosts || []);
        
      } catch (err) {
        console.error('❌ Dashboard: 데이터 요청 실패:', err);
        
        // 에러 처리
        let errorMessage = '데이터를 불러오는 데 실패했습니다.';
        if (err.code === 'functions/unauthenticated') {
          errorMessage = '로그인이 필요합니다.';
        } else if (err.code === 'functions/internal') {
          errorMessage = '서버에서 오류가 발생했습니다.';
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // 공지사항 별도 로딩 (대시보드 데이터와 독립적으로)
  useEffect(() => {
    const fetchNotices = async () => {
      if (!user?.uid) return;

      try {
        console.log('🔥 공지사항 로딩 시작');
        
        const getActiveNoticesFn = httpsCallable(functions, 'getActiveNotices');
        const noticesResponse = await getActiveNoticesFn();
        
        console.log('✅ 공지사항 응답:', noticesResponse.data);
        
        // 올바른 경로로 공지사항 데이터 추출
        const noticesData = noticesResponse.data?.data?.notices || [];
        setNotices(noticesData);
        
      } catch (noticeError) {
        console.error('❌ 공지사항 로딩 실패:', noticeError);
        setNotices([]);
      }
    };

    fetchNotices();
  }, [user]);

  // 이벤트 핸들러들
  const handleGeneratePost = () => {
    navigate('/generate');
  };

  const handleChangePlan = () => {
    navigate('/profile');
  };

  const handleViewAllPosts = () => {
    navigate('/posts');
  };

  const handlePostClick = (postId) => {
    navigate(`/post/${postId}`);
  };

  const handleViewBilling = () => {
    navigate('/billing');
  };

  // 사용량 퍼센트 계산
  const usagePercentage = isAdmin ? 100 : 
    usage.monthlyLimit > 0 ? 
    Math.min((usage.postsGenerated / usage.monthlyLimit) * 100, 100) : 0;

  // 사용량 색상 결정
  const getUsageColor = (percentage) => {
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 70) return '#f97316';
    return '#10b981';
  };

  const usageColor = getUsageColor(usagePercentage);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6 max-w-md w-full mx-4">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="text-red-500" size={24} />
            <h2 className="text-lg font-semibold text-gray-900">오류 발생</h2>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            안녕하세요, {userProfile?.name}님!
          </h1>
          <p className="text-gray-600">
            오늘도 효과적인 정치 콘텐츠를 만들어보세요.
          </p>
        </div>

        {/* 메인 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 왼쪽 컬럼 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 빠른 액션 카드 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">빠른 작업</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={handleGeneratePost}
                  className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <PlusCircle className="text-blue-600" size={24} />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">새 원고 작성</div>
                    <div className="text-sm text-gray-600">AI로 원고 생성하기</div>
                  </div>
                </button>

                <button
                  onClick={handleViewAllPosts}
                  className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                >
                  <FileText className="text-green-600" size={24} />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">원고 관리</div>
                    <div className="text-sm text-gray-600">기존 원고 보기</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 최근 작성한 원고 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">최근 작성한 원고</h2>
                {recentPosts.length > 0 && (
                  <button
                    onClick={handleViewAllPosts}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                  >
                    전체 보기 <ChevronRight size={16} />
                  </button>
                )}
              </div>

              {recentPosts.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto text-gray-400 mb-3" size={48} />
                  <p className="text-gray-600 mb-4">아직 작성한 원고가 없습니다.</p>
                  <button
                    onClick={handleGeneratePost}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    첫 원고 작성하기
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentPosts.slice(0, 3).map((post) => (
                    <div
                      key={post.id}
                      onClick={() => handlePostClick(post.id)}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900 line-clamp-1">
                          {post.title || '제목 없음'}
                        </h3>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '날짜 없음'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {post.content ? post.content.substring(0, 100) + '...' : '내용 없음'}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {post.category || '기타'}
                        </span>
                        {post.subCategory && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {post.subCategory}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 공지사항 */}
            {notices.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="text-blue-600" size={20} />
                  <h2 className="text-lg font-semibold text-gray-900">공지사항</h2>
                </div>
                <div className="space-y-3">
                  {notices.slice(0, 3).map((notice) => (
                    <div
                      key={notice.id}
                      className="p-4 border border-blue-200 bg-blue-50 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900">
                          {notice.title}
                        </h3>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {new Date(notice.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {notice.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 오른쪽 사이드바 */}
          <div className="space-y-6">
            {/* 선거일 디데이 카드 */}
            {userProfile?.position && (
              <ElectionDDay 
                position={userProfile.position} 
                status={userProfile.status}
              />
            )}

            {/* 사용량 카드 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">이번 달 사용량</h3>
                <TrendingUp className="text-gray-400" size={20} />
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>원고 생성</span>
                  <span>
                    {isAdmin ? '무제한' : `${usage.postsGenerated} / ${usage.monthlyLimit}`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${usagePercentage}%`,
                      backgroundColor: usageColor
                    }}
                  />
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">
                  현재 플랜: <span className="font-semibold" style={{ color: planColor }}>
                    {planName}
                  </span>
                </p>
                {!isAdmin && (
                  <button
                    onClick={handleChangePlan}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    플랜 변경하기
                  </button>
                )}
              </div>
            </div>

            {/* 결제 정보 카드 (관리자가 아닌 경우만) */}
            {!isAdmin && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="text-gray-600" size={20} />
                  <h3 className="text-lg font-semibold text-gray-900">결제 정보</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">다음 결제일</span>
                    <span className="text-gray-900">
                      {new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">월 요금</span>
                    <span className="text-gray-900 font-semibold">
                      {planName === '로컬 블로거' ? '99,000원' :
                       planName === '리전 인플루언서' ? '199,000원' :
                       '299,000원'}
                    </span>
                  </div>
                  <button
                    onClick={handleViewBilling}
                    className="w-full text-center text-blue-600 hover:text-blue-700 text-sm font-medium py-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    결제 내역 보기
                  </button>
                </div>
              </div>
            )}

            {/* 도움말 카드 */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">도움이 필요하신가요?</h3>
              <p className="text-sm text-gray-600 mb-4">
                AI비서관 사용법이나 문의사항이 있으시면 언제든지 연락해 주세요.
              </p>
              <button className="w-full bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                고객지원 문의
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;