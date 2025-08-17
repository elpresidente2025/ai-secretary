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
import { ContentCopy, Edit } from '@mui/icons-material';

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
      const textToCopy = draft.content || '';
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
        sx={{ 
          p: 3, 
          mt: 3,
          border: '1px solid', 
          borderColor: 'divider', 
          borderRadius: 2,
          backgroundColor: 'background.paper'
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          mb: 2 
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            미리보기
          </Typography>
          <Box>
            <Tooltip title="클립보드에 복사">
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
        
        <Box sx={{ 
          border: '1px solid', 
          borderColor: 'divider', 
          borderRadius: 1, 
          p: 2,
          backgroundColor: 'grey.50'
        }}>
          <Typography 
            variant="body1" 
            sx={{ 
              whiteSpace: 'pre-wrap',
              lineHeight: 1.8,
              minHeight: 200,
              maxHeight: 600,
              overflow: 'auto',
              color: 'text.primary',
              fontSize: '0.95rem'
            }}
          >
            {draft.content || '내용이 없습니다.'}
          </Typography>
        </Box>

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