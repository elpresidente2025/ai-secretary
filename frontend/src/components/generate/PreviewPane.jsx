// frontend/src/components/generate/PreviewPane.jsx
import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  IconButton, 
  Tooltip, 
  Paper,
  Snackbar,
  Alert 
} from '@mui/material';
import { ContentCopy } from '@mui/icons-material';

export default function PreviewPane({ draft }) {
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  if (!draft) {
    return null;
  }

  const handleCopy = async () => {
    try {
      const textToCopy = draft.plainText || draft.content || '';
      await navigator.clipboard.writeText(textToCopy);
      setSnackbar({
        open: true,
        message: '클립보드에 복사되었습니다!',
        severity: 'success'
      });
    } catch (err) {
      console.error('복사 실패:', err);
      setSnackbar({
        open: true,
        message: '복사에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <>
      <Paper 
        elevation={0}
        sx={{ 
          p: { xs: 1, sm: 2 },
          backgroundColor: 'background.paper',
          '.article-content h1': {
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'primary.main',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '2px solid',
            borderColor: 'primary.main'
          },
          '.article-content h2': {
            fontSize: '1.3rem',
            fontWeight: 600,
            marginTop: '2rem',
            marginBottom: '1rem',
          },
          '.article-content p': {
            fontSize: '1rem',
            lineHeight: 1.8,
            marginBottom: '1rem',
          },
          // 🔥 'strong' 태그 스타일 개선 (가이드 역할 강화)
          '.article-content strong': {
            fontWeight: 700,
            color: '#1a237e', // 남색 계열로 텍스트 색상 강조
            backgroundColor: 'rgba(33, 150, 243, 0.1)', // 아주 연한 하늘색 배경 추가
            padding: '2px 5px',
            borderRadius: '4px',
            boxDecorationBreak: 'clone', // 줄바꿈 시에도 스타일 유지
            WebkitBoxDecorationBreak: 'clone',
          }
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          mb: 2 
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {draft.title || '제목 없음'}
          </Typography>
          <Box>
            <Tooltip title="클립보드에 복사 (텍스트만)">
              <IconButton 
                size="small" 
                onClick={handleCopy}
                sx={{ 
                  '&:hover': { 
                    backgroundColor: 'action.hover' 
                  } 
                }}
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        <Box 
          className="article-content"
          dangerouslySetInnerHTML={{ __html: draft.htmlContent || '내용이 없습니다.' }}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            backgroundColor: 'grey.50',
            minHeight: 200,
            maxHeight: '60vh',
            overflow: 'auto',
            '& p:last-child': {
              mb: 0,
            },
          }}
        />

        {/* 메타 정보 */}
        {(draft.category || draft.keywords || draft.generatedAt) && (
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {draft.category && (
                <Typography variant="caption" color="text.secondary">
                  카테고리: {draft.category}
                </Typography>
              )}
              {draft.keywords && (
                <Typography variant="caption" color="text.secondary">
                  키워드: {draft.keywords}
                </Typography>
              )}
              {draft.generatedAt && (
                <Typography variant="caption" color="text.secondary">
                  생성 시간: {new Date(draft.generatedAt).toLocaleString()}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Paper>

      {/* 복사 알림 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}