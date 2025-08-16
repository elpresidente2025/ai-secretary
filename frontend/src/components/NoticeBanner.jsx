// frontend/src/components/NoticeBanner.jsx
import React, { useState, useEffect } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  IconButton,
  Collapse,
  Typography,
  Chip,
  Divider
} from '@mui/material';
import {
  Close,
  ExpandMore,
  ExpandLess,
  Campaign,
  Schedule,
  PriorityHigh
} from '@mui/icons-material';
import { callFunctionWithRetry } from '../services/firebaseService';
import { useAuth } from '../hooks/useAuth';

function NoticeBanner() {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [dismissedNotices, setDismissedNotices] = useState(new Set());
  const [expandedNotices, setExpandedNotices] = useState(new Set());

  // 활성 공지 조회
  const fetchActiveNotices = async () => {
    try {
      const result = await callFunctionWithRetry('getActiveNotices');
      const activeNotices = result?.notices || [];
      
      // 우선순위별 정렬 (high > medium > low)
      const sortedNotices = activeNotices.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
      });
      
      setNotices(sortedNotices);
    } catch (error) {
      console.error('공지 조회 실패:', error);
      setNotices([]);
    }
  };

  useEffect(() => {
    if (user) {
      fetchActiveNotices();
      
      // 10분마다 공지 새로고침
      const interval = setInterval(fetchActiveNotices, 10 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // 공지 닫기
  const handleDismiss = (noticeId) => {
    setDismissedNotices(prev => new Set([...prev, noticeId]));
    
    // 로컬 스토리지에 저장 (세션 동안 유지)
    const dismissed = JSON.parse(sessionStorage.getItem('dismissedNotices') || '[]');
    dismissed.push(noticeId);
    sessionStorage.setItem('dismissedNotices', JSON.stringify(dismissed));
  };

  // 공지 확장/축소
  const handleToggleExpand = (noticeId) => {
    setExpandedNotices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noticeId)) {
        newSet.delete(noticeId);
      } else {
        newSet.add(noticeId);
      }
      return newSet;
    });
  };

  // 초기 로드 시 닫힌 공지 복원
  useEffect(() => {
    const dismissed = JSON.parse(sessionStorage.getItem('dismissedNotices') || '[]');
    setDismissedNotices(new Set(dismissed));
  }, []);

  // 표시할 공지 필터링
  const visibleNotices = notices.filter(notice => 
    !dismissedNotices.has(notice.id) &&
    (!notice.expiresAt || new Date(notice.expiresAt) > new Date())
  );

  if (visibleNotices.length === 0) {
    return null;
  }

  // 타입별 아이콘
  const getTypeIcon = (type) => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'error': return '🚨';
      case 'success': return '✅';
      case 'info':
      default: return '📢';
    }
  };

  // 우선순위별 표시
  const getPriorityIcon = (priority) => {
    if (priority === 'high') {
      return <PriorityHigh color="error" fontSize="small" />;
    }
    return null;
  };

  return (
    <Box sx={{ mb: 2 }}>
      {visibleNotices.map((notice) => {
        const isExpanded = expandedNotices.has(notice.id);
        const isLongContent = notice.content.length > 100;
        
        return (
          <Alert
            key={notice.id}
            severity={notice.type || 'info'}
            sx={{ 
              mb: 1,
              '& .MuiAlert-message': { width: '100%' }
            }}
            action={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {isLongContent && (
                  <IconButton
                    size="small"
                    onClick={() => handleToggleExpand(notice.id)}
                    sx={{ color: 'inherit' }}
                  >
                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  onClick={() => handleDismiss(notice.id)}
                  sx={{ color: 'inherit' }}
                >
                  <Close />
                </IconButton>
              </Box>
            }
          >
            <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>{getTypeIcon(notice.type)}</span>
                {getPriorityIcon(notice.priority)}
                <Typography variant="subtitle2" component="span" sx={{ fontWeight: 600 }}>
                  {notice.title}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
                {notice.priority === 'high' && (
                  <Chip label="중요" color="error" size="small" />
                )}
                {notice.expiresAt && (
                  <Chip 
                    icon={<Schedule />}
                    label={`~${new Date(notice.expiresAt).toLocaleDateString()}`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </AlertTitle>

            <Box>
              {isLongContent ? (
                <Collapse in={isExpanded} timeout="auto">
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                    {notice.content}
                  </Typography>
                </Collapse>
              ) : (
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {notice.content}
                </Typography>
              )}
              
              {isLongContent && !isExpanded && (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    whiteSpace: 'pre-line',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}
                >
                  {notice.content}
                </Typography>
              )}
            </Box>

            {notice.createdAt && (
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ display: 'block', mt: 1 }}
              >
                {new Date(notice.createdAt).toLocaleString()}
              </Typography>
            )}
          </Alert>
        );
      })}
    </Box>
  );
}

export default NoticeBanner;