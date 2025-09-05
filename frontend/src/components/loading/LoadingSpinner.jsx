// frontend/src/components/loading/LoadingSpinner.jsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import BaseSpinner, { SPINNER_SIZES } from './BaseSpinner';

const LoadingSpinner = ({ 
  size = SPINNER_SIZES.medium, 
  message = '', 
  color = 'primary',
  centered = true,
  fullHeight = false,
  sx = {} 
}) => {
  const containerSx = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...(centered && {
      width: '100%',
      textAlign: 'center'
    }),
    ...(fullHeight && {
      minHeight: '200px'
    }),
    ...sx
  };

  return (
    <Box sx={containerSx}>
      <BaseSpinner size={size} color={color} />
      {message && (
        <Typography 
          variant="body2" 
          sx={{ 
            mt: 1, 
            color: '#f8c023',
            // 카드 내부에서는 파란색으로 표시
            '.MuiCard-root &, .MuiPaper-root &': {
              color: '#152484'
            }
          }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingSpinner;