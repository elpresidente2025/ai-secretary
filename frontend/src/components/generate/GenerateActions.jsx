// frontend/src/components/generate/GenerateActions.jsx
import React from 'react';
import {
  Box,
  Button,
  Typography,
  Chip,
  Alert
} from '@mui/material';
import { AutoAwesome, Refresh, EmojiEvents } from '@mui/icons-material';
import { LoadingButton } from '../loading';

export default function GenerateActions({
  onGenerate,
  onReset,
  loading = false,
  canGenerate = true,
  attempts = 0,
  maxAttempts = 3,
  drafts = [],
  isMobile = false,
  bonusStats = { hasBonus: false, availableBonus: 0 },
  onBonusGenerate
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
          <LoadingButton
            variant="contained"
            size={isMobile ? "medium" : "large"}
            startIcon={<AutoAwesome />}
            onClick={() => onGenerate(false)}
            disabled={!canGenerate}
            loading={loading}
            loadingText="생성 중..."
            sx={{ 
              minWidth: isMobile ? 'auto' : 160,
              flex: isMobile ? 1 : 'none',
              bgcolor: '#152484 !important',
              color: 'white !important',
              '&.Mui-disabled': {
                bgcolor: '#152484 !important',
                color: 'white !important'
              },
              ...(canGenerate && !loading && {
                boxShadow: '0 0 10px rgba(0, 255, 255, 0.8)',
                '&:hover': {
                  bgcolor: '#152484 !important',
                  boxShadow: '0 0 15px rgba(0, 255, 255, 1.0)',
                }
              })
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>{attempts === 0 ? '새 원고 생성' : '다른 버전 생성'}</span>
              <Chip 
                label={`${attemptsRemaining}/${maxAttempts}`}
                size="small"
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontSize: '0.75rem',
                  height: '20px'
                }}
              />
            </Box>
          </LoadingButton>

          {/* 보너스 생성 버튼 */}
          {bonusStats.hasBonus && (
            <LoadingButton
              variant="contained"
              size={isMobile ? "medium" : "large"}
              startIcon={<EmojiEvents />}
              onClick={() => onGenerate(true)}
              disabled={!canGenerate}
              loading={loading}
              loadingText="보너스 생성 중..."
              sx={{ 
                minWidth: isMobile ? 'auto' : 140,
                bgcolor: '#006261',
                '&:hover': { bgcolor: '#003A87' },
                flex: isMobile ? 1 : 'none'
              }}
            >
              보너스 생성 ({bonusStats.availableBonus})
            </LoadingButton>
          )}

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

      </Box>

      {/* 모바일에서 추가 안내 */}
      {isMobile && (
        <Typography variant="caption" sx={{ display: 'block', mt: 1, textAlign: 'center', color: 'black' }}>
          한 번에 1개만 생성
        </Typography>
      )}

      {/* 주의사항 */}
      <Alert severity="warning" sx={{ mt: 2 }}>
        <Typography variant="body2" fontWeight="bold" sx={{ color: 'black' }}>⚠️ 주의사항</Typography>
        <Typography variant="body2" sx={{ color: 'black' }}>
          전자두뇌비서관은 원고 초안을 제공하며, 반드시 사용자가 최종 검수 및 수정해야 합니다.
        </Typography>
      </Alert>
    </Box>
  );
}