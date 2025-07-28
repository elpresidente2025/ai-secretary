// controllers/dashboardController.js - DB 없는 임시 버전
// 🔥 DB import 주석처리 (서버 크래시 방지)
// import pool from '../config/db.js';
// import { getUserQuota } from '../services/quota.service.js';

export const getDashboardData = async (req, res, next) => {
  try {
    console.log('📊 대시보드 데이터 요청:', req.user);
    
    // 🔥 임시 대시보드 데이터 (DB 없이)
    const dashboardData = {
      user: {
        name: req.user?.name || '테스트 사용자',
        email: req.user?.email || 'test@test.com',
        role: req.user?.role || 'user',
        position: req.user?.position || '시의원',
        region: `${req.user?.regionMetro || '서울시'} ${req.user?.regionLocal || '강남구'}`.trim()
      },
      stats: {
        totalPosts: 45,
        thisMonthPosts: 12,
        totalViews: 1523,
        thisMonthViews: 234
      },
      recentPosts: [
        {
          id: 1,
          title: '지역구 주민간담회 개최 안내',
          category: '지역활동',
          createdAt: '2025-01-20T10:30:00Z',
          status: 'published',
          views: 89
        },
        {
          id: 2,
          title: '교육예산 확대 방안 제안',
          category: '정책/비전',
          createdAt: '2025-01-18T14:15:00Z',
          status: 'published',
          views: 156
        },
        {
          id: 3,
          title: '신년 인사말',
          category: '일반',
          createdAt: '2025-01-01T09:00:00Z',
          status: 'published',
          views: 234
        },
        {
          id: 4,
          title: '청년정책 간담회 후기',
          category: '지역활동',
          createdAt: '2024-12-28T16:45:00Z',
          status: 'draft',
          views: 67
        },
        {
          id: 5,
          title: '연말 감사 인사',
          category: '일반',
          createdAt: '2024-12-31T11:20:00Z',
          status: 'published',
          views: 145
        }
      ],
      usage: {
        current: 12,      // 이번 달 사용량
        total: 30,        // 월 한도
        monthlyLimit: 30,
        monthlyUsed: 12,
        remaining: 18,
        lastGenerated: '2025-01-20T14:30:00Z',
        resetDate: '2025-02-01T00:00:00Z'
      },
      notifications: [
        {
          id: 1,
          type: 'info',
          message: '이번 달 AI 원고 생성 12회 사용했습니다.',
          timestamp: '2025-01-20T14:30:00Z'
        },
        {
          id: 2,
          type: 'success',
          message: '지난 주 게시물 조회수가 20% 증가했습니다.',
          timestamp: '2025-01-18T09:15:00Z'
        }
      ]
    };

    // 🔥 프론트엔드가 기대하는 형식으로 응답
    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString(),
      message: '대시보드 데이터 조회 성공 (임시 DB 없음)'
    });

  } catch (error) {
    console.error('대시보드 데이터 조회 실패:', error);
    next({
      statusCode: 500,
      message: '대시보드 데이터를 불러오는 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};