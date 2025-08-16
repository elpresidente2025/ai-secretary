// frontend/src/components/admin/StatusUpdateModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Chip,
  Grid,
  IconButton,
  CircularProgress,
  Divider
} from '@mui/material';
import { 
  Close, 
  Api, 
  CheckCircle, 
  Warning, 
  Error as ErrorIcon,
  Refresh
} from '@mui/icons-material';
import { callFunctionWithRetry } from '../../services/firebaseService';

function StatusUpdateModal({ open, onClose }) {
  const [currentStatus, setCurrentStatus] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // 현재 상태 조회
  const fetchCurrentStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await callFunctionWithRetry('getSystemStatus');
      setCurrentStatus(result?.status || null);
    } catch (err) {
      console.error('상태 조회 실패:', err);
      setError('현재 상태를 조회하는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCurrentStatus();
      setNewStatus('');
      setReason('');
      setSuccess(false);
    }
  }, [open]);

  const handleStatusUpdate = async () => {
    if (!newStatus) {
      setError('새로운 상태를 선택해주세요.');
      return;
    }

    if (!reason.trim()) {
      setError('변경 사유를 입력해주세요.');
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      await callFunctionWithRetry('updateSystemStatus', {
        status: newStatus,
        reason: reason.trim(),
        timestamp: new Date().toISOString()
      });

      setSuccess(true);
      setCurrentStatus(prev => ({
        ...prev,
        geminiStatus: { state: newStatus },
        lastUpdated: new Date().toISOString()
      }));

      // 성공 후 잠시 대기한 뒤 모달 닫기
      setTimeout(() => {
        handleClose();
        window.location.reload(); // 전체 페이지 새로고침으로 상태 반영
      }, 1500);

    } catch (err) {
      console.error('상태 업데이트 실패:', err);
      setError('상태 업데이트에 실패했습니다: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleClose = () => {
    setNewStatus('');
    setReason('');
    setError(null);
    setSuccess(false);
    setCurrentStatus(null);
    onClose();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'maintenance': return 'warning';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return '정상 운영';
      case 'inactive': return '서비스 중단';
      case 'maintenance': return '점검 중';
      default: return '알 수 없음';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle />;
      case 'inactive': return <ErrorIcon />;
      case 'maintenance': return <Warning />;
      default: return <Api />;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Api sx={{ color: '#152484' }} />
            <Typography variant="h6" sx={{ color: '#152484', fontWeight: 600 }}>
              시스템 상태 관리
            </Typography>
          </Box>
          <IconButton onClick={handleClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* 현재 상태 표시 */}
            <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                현재 시스템 상태
              </Typography>
              
              {currentStatus?.geminiStatus ? (
                <Grid container spacing={2} alignItems="center">
                  <Grid item>
                    <Chip
                      icon={getStatusIcon(currentStatus.geminiStatus.state)}
                      label={getStatusText(currentStatus.geminiStatus.state)}
                      color={getStatusColor(currentStatus.geminiStatus.state)}
                    />
                  </Grid>
                  <Grid item>
                    <Button
                      size="small"
                      startIcon={<Refresh />}
                      onClick={fetchCurrentStatus}
                      sx={{ color: '#152484' }}
                    >
                      새로고침
                    </Button>
                  </Grid>
                </Grid>
              ) : (
                <Alert severity="warning">
                  현재 상태를 확인할 수 없습니다.
                </Alert>
              )}

              {currentStatus?.lastUpdated && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  마지막 업데이트: {new Date(currentStatus.lastUpdated).toLocaleString()}
                </Typography>
              )}
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* 상태 변경 폼 */}
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
              상태 변경
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>새로운 상태</InputLabel>
              <Select
                value={newStatus}
                label="새로운 상태"
                onChange={(e) => setNewStatus(e.target.value)}
              >
                <MenuItem value="active">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle color="success" />
                    정상 운영
                  </Box>
                </MenuItem>
                <MenuItem value="maintenance">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Warning color="warning" />
                    점검 중
                  </Box>
                </MenuItem>
                <MenuItem value="inactive">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ErrorIcon color="error" />
                    서비스 중단
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="변경 사유"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="상태 변경 이유를 입력해주세요..."
              sx={{ mb: 2 }}
            />

            {/* 예시 사유 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                예시:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {[
                  '정기 점검 완료',
                  'API 서버 재시작',
                  '긴급 패치 적용',
                  '시스템 장애 발생',
                  '점검 작업 시작'
                ].map((example) => (
                  <Chip
                    key={example}
                    label={example}
                    size="small"
                    variant="outlined"
                    onClick={() => setReason(example)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>

            {/* 성공 메시지 */}
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                상태가 성공적으로 업데이트되었습니다! 잠시 후 페이지가 새로고침됩니다.
              </Alert>
            )}

            {/* 에러 메시지 */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={updating}>
          취소
        </Button>
        <Button
          variant="contained"
          onClick={handleStatusUpdate}
          disabled={updating || !newStatus || !reason.trim() || success}
          sx={{ 
            backgroundColor: '#152484',
            '&:hover': { backgroundColor: '#1a2a9e' }
          }}
        >
          {updating ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              업데이트 중...
            </>
          ) : (
            '상태 업데이트'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default StatusUpdateModal;