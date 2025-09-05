// frontend/src/components/loading/LoadingOverlay.jsx
import React from 'react';
import { Box, CircularProgress, Typography, Backdrop } from '@mui/material';

const LoadingOverlay = ({ 
  open = false,
  message = '로딩 중...',
  size = 60,
  color = 'primary',
  backdrop = true,
  zIndex = 1300 
}) => {
  if (backdrop) {
    return (
      <Backdrop 
        open={open} 
        sx={{ 
          zIndex,
          color: '#fff',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}
      >
        <CircularProgress size={size} color="inherit" />
        {message && (
          <Typography variant="h6" color="inherit">
            {message}
          </Typography>
        )}
      </Backdrop>
    );
  }

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        zIndex,
        gap: 2
      }}
    >
      <CircularProgress size={size} color={color} />
      {message && (
        <Typography variant="body1" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingOverlay;