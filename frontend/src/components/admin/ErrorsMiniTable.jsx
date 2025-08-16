// frontend/src/components/admin/ErrorsMiniTable.jsx
import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Alert,
  Chip,
  Tooltip
} from '@mui/material';
import { Download, Warning, Error } from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { callFunctionWithRetry } from '../../services/firebaseService';

function ErrorsMiniTable() {
  const { user } = useAuth();
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecentErrors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 직접 getErrorLogs 함수 호출 (getErrors는 존재하지 않음)
      const result = await callFunctionWithRetry('getErrorLogs', { 
        limit: 50  // 최근 50건만
      });
      
      console.log('🔍 에러 로그 조회 결과:', result);
      
      // 응답 구조 확인 및 처리
      if (result.success && result.data && result.data.errors) {
        setErrors(result.data.errors);
      } else if (result.errors) {
        setErrors(result.errors);
      } else if (Array.isArray(result)) {
        setErrors(result);
      } else {
        console.warn('예상과 다른 응답 구조:', result);
        setErrors([]);
      }
    } catch (err) {
      console.error('에러 로그 조회 실패:', err);
      setError(err.message);
      setErrors([]); // 에러 시 빈 배열로 설정
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) {
      fetchRecentErrors();
    }
  }, [user]);

  const exportErrorsCsv = async () => {
    try {
      console.log('📊 에러 로그 CSV 내보내기...');
      
      // 전체 에러 데이터 가져오기 (1000건) - 직접 getErrorLogs 호출
      const result = await callFunctionWithRetry('getErrorLogs', { 
        limit: 1000
      });

      console.log('📊 CSV 내보내기용 데이터:', result);

      let errorData = [];
      
      // 응답 구조에 따라 데이터 추출
      if (result.success && result.data && result.data.errors) {
        errorData = result.data.errors;
      } else if (result.errors) {
        errorData = result.errors;
      } else if (Array.isArray(result)) {
        errorData = result;
      }
      
      if (errorData.length === 0) {
        alert('내보낼 에러 데이터가 없습니다.');
        return;
      }

      // CSV 헤더
      const headers = ['타임스탬프', '사용자', '함수명', '에러 메시지', '스택 트레이스'];
      
      // CSV 데이터 변환
      const csvRows = errorData.map(error => {
        const timestamp = error.timestamp || '';
        const user = error.userId || error.userEmail || '-';
        const functionName = error.functionName || '-';
        const message = (error.message || '').replace(/"/g, '""').replace(/\n/g, ' ');
        const stack = (error.stack || '').replace(/"/g, '""').replace(/\n/g, ' ');
        
        return [timestamp, user, functionName, message, stack]
          .map(field => `"${field}"`)
          .join(',');
      });

      // CSV 파일 생성
      const csvContent = [headers.join(','), ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `errors_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert(`✅ 에러 로그 ${errorData.length}건이 CSV로 다운로드되었습니다.`);
      
    } catch (error) {
      console.error('❌ CSV 내보내기 실패:', error);
      alert('❌ CSV 내보내기 실패: ' + error.message);
    }
  };

  const getErrorSeverity = (error) => {
    const message = (error.message || '').toLowerCase();
    if (message.includes('fatal') || message.includes('critical')) return 'error';
    if (message.includes('warning') || message.includes('warn')) return 'warning';
    return 'info';
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-';
    
    try {
      // 이미 ISO 문자열 형태로 변환되어 있음
      const date = new Date(timestamp);
      
      return date.toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning sx={{ color: '#ff9800' }} />
          <Typography variant="h6" sx={{ color: '#152484', fontWeight: 600 }}>
            최근 에러 로그
          </Typography>
          <Chip 
            label={`${errors.length}건`} 
            size="small" 
            color={errors.length > 0 ? 'warning' : 'success'}
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Download />}
            onClick={exportErrorsCsv}
            sx={{ 
              borderColor: '#55207D',
              color: '#55207D',
              '&:hover': { borderColor: '#55207D' }
            }}
          >
            CSV 다운로드
          </Button>
          <Button
            size="small"
            variant="text"
            onClick={fetchRecentErrors}
            sx={{ color: '#152484' }}
          >
            새로고침
          </Button>
        </Box>
      </Box>

      {loading ? (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>시간</TableCell>
                <TableCell>메시지</TableCell>
                <TableCell>사용자</TableCell>
                <TableCell>함수</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton variant="text" width={80} /></TableCell>
                  <TableCell><Skeleton variant="text" /></TableCell>
                  <TableCell><Skeleton variant="text" width={120} /></TableCell>
                  <TableCell><Skeleton variant="text" width={100} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : error ? (
        <Alert severity="error">
          에러 로그를 불러오는데 실패했습니다: {error}
        </Alert>
      ) : (
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 80 }}>시간</TableCell>
                <TableCell sx={{ minWidth: 300 }}>메시지</TableCell>
                <TableCell sx={{ minWidth: 120 }}>사용자</TableCell>
                <TableCell sx={{ minWidth: 100 }}>함수</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {errors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Box sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        🎉 최근 에러가 없습니다!
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                errors.map((error, index) => (
                  <TableRow key={error.id || index} hover>
                    <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                      {formatTimestamp(error.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Error 
                          fontSize="small" 
                          color={getErrorSeverity(error)} 
                        />
                        <Tooltip title={error.message || '-'} arrow>
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 350,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              cursor: 'help'
                            }}
                          >
                            {error.message || '-'}
                          </Typography>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {error.userId || error.userEmail || '-'}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>
                      {error.functionName || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {errors.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          💡 최근 50건만 표시됩니다. 전체 분석은 CSV 다운로드를 이용하세요.
        </Typography>
      )}
    </Paper>
  );
}

export default ErrorsMiniTable;