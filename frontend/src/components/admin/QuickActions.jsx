// frontend/src/components/admin/QuickActions.jsx
import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Grid,
  Button,
  Box
} from '@mui/material';
import {
  Settings,
  Download,
  People,
  Api
} from '@mui/icons-material';
import UserListModal from './UserListModal';
import StatusUpdateModal from './StatusUpdateModal';
import { getAdminStats } from '../../services/firebaseService';

function QuickActions() {
  const [userListOpen, setUserListOpen] = useState(false);
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false);

  const exportAllData = async () => {
    try {
      console.log('📊 전체 데이터 CSV 내보내기 시작...');
      
      // 모든 데이터를 가져와서 CSV로 변환
      const [usersResult, errorsResult, statsResult] = await Promise.all([
        callFunctionWithRetry('getUsers'),
        callFunctionWithRetry('getErrors', { limit: 1000 }),
        getAdminStats()
      ]);

      // CSV 생성 함수
      const createCsv = (data, filename) => {
        if (!data || data.length === 0) return;
        
        const headers = Object.keys(data[0]);
        const csvContent = [
          headers.join(','),
          ...data.map(row => 
            headers.map(header => {
              const value = row[header];
              if (value === null || value === undefined) return '';
              if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
              return String(value).replace(/"/g, '""');
            }).map(v => `"${v}"`).join(',')
          )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      // 각각 CSV로 내보내기
      if (usersResult?.users) {
        createCsv(usersResult.users, 'users');
      }
      
      if (errorsResult?.errors) {
        createCsv(errorsResult.errors, 'errors');
      }

      // 통계 데이터도 CSV로
      if (statsResult?.stats) {
        createCsv([{
          date: new Date().toISOString(),
          ...statsResult.stats
        }], 'stats');
      }

      alert('✅ CSV 파일들이 다운로드되었습니다.');
      
    } catch (error) {
      console.error('❌ CSV 내보내기 실패:', error);
      alert('❌ CSV 내보내기 실패: ' + error.message);
    }
  };

  const clearCache = async () => {
    if (!confirm('정말로 캐시를 비우시겠습니까?')) return;
    
    try {
      await callFunctionWithRetry('clearSystemCache');
      alert('✅ 캐시가 성공적으로 비워졌습니다.');
      window.location.reload();
    } catch (error) {
      console.error('❌ 캐시 비우기 실패:', error);
      alert('❌ 캐시 비우기 실패: ' + error.message);
    }
  };

  return (
    <>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#152484', fontWeight: 600 }}>
          빠른 작업 (Quick Actions)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          자주 사용하는 관리 기능들을 빠르게 실행할 수 있습니다.
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<People />}
              onClick={() => setUserListOpen(true)}
              sx={{ 
                py: 2,
                borderColor: '#152484',
                color: '#152484',
                '&:hover': {
                  borderColor: '#152484',
                  backgroundColor: 'rgba(21, 36, 132, 0.04)'
                }
              }}
            >
              사용자 목록
            </Button>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Api />}
              onClick={() => setStatusUpdateOpen(true)}
              sx={{ 
                py: 2,
                borderColor: '#006261',
                color: '#006261',
                '&:hover': {
                  borderColor: '#006261',
                  backgroundColor: 'rgba(0, 98, 97, 0.04)'
                }
              }}
            >
              상태 수정
            </Button>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Download />}
              onClick={exportAllData}
              sx={{ 
                py: 2,
                borderColor: '#55207D',
                color: '#55207D',
                '&:hover': {
                  borderColor: '#55207D',
                  backgroundColor: 'rgba(85, 32, 125, 0.04)'
                }
              }}
            >
              CSV 다운로드
            </Button>
          </Grid>
        </Grid>

        {/* 추가 관리 도구 */}
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #e0e0e0' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            시스템 관리
          </Typography>
          <Grid container spacing={1}>
            <Grid item>
              <Button
                size="small"
                variant="text"
                onClick={clearCache}
                sx={{ color: '#ff6b6b' }}
              >
                캐시 비우기
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* 모달들 */}
      <UserListModal 
        open={userListOpen} 
        onClose={() => setUserListOpen(false)} 
      />
      <StatusUpdateModal 
        open={statusUpdateOpen} 
        onClose={() => setStatusUpdateOpen(false)} 
      />
    </>
  );
}

export default QuickActions;