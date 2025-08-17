// frontend/src/components/generate/GenerateActions.jsx
import React from 'react';
import {
  Box,
  Button,
  Typography,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { AutoAwesome, Refresh } from '@mui/icons-material';

export default function GenerateActions({
  onGenerate,
  onReset,
  loading = false,
  canGenerate = true,
  attempts = 0,
  maxAttempts = 3,
  drafts = [],
  isMobile = false
}) {
  const attemptsRemaining = maxAttempts - attempts;

  return (
    <Box sx={{ mb: 3 }}>
      {/* 액션 버튼들 */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: isMobile ? 'stretch' : 'space-between', 
        flexDirection: isMobile ? 'column' : 'row',
        gap: 2 
      }}>
        {/* 왼쪽: 생성 버튼 */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          width: isMobile ? '100%' : 'auto'
        }}>
          <Button
            variant="contained"
            size={isMobile ? "medium" : "large"}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AutoAwesome />}
            onClick={onGenerate}
            disabled={!canGenerate || loading}
            sx={{ 
              minWidth: isMobile ? 'auto' : 160,
              flex: isMobile ? 1 : 'none'
            }}
          >
            {loading ? '생성 중...' : attempts === 0 ? '새 원고 생성' : '다른 버전 생성'}
          </Button>

          {drafts.length > 0 && (
            <Button
              variant="outlined"
              size={isMobile ? "medium" : "large"}
              startIcon={<Refresh />}
              onClick={onReset}
              disabled={loading}
              color="secondary"
              sx={{ flexShrink: 0 }}
            >
              {isMobile ? '초기화' : '새로 시작'}
            </Button>
          )}
        </Box>

        {/* 오른쪽: 재생성 카운터 */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          justifyContent: isMobile ? 'center' : 'flex-end'
        }}>
          <Typography variant="body2" color="text.secondary">
            재생성 가능:
          </Typography>
          <Chip 
            label={`${attemptsRemaining}/${maxAttempts}`}
            size="small"
            color={
              attemptsRemaining > 1 ? "primary" : 
              attemptsRemaining === 1 ? "warning" : 
              "error"
            }
            variant="outlined"
          />
        </Box>
      </Box>

      {/* 모바일에서 추가 안내 */}
      {isMobile && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
          한 번에 1개만 생성
        </Typography>
      )}

      {/* 주의사항 */}
      <Alert severity="warning" sx={{ mt: 2 }}>
        <Typography variant="body2" fontWeight="bold">⚠️ 주의사항</Typography>
        <Typography variant="body2">
          AI비서관은 원고 초안을 제공하며, 반드시 사용자가 최종 검수 및 수정해야 합니다.
        </Typography>
      </Alert>
    </Box>
  );
}