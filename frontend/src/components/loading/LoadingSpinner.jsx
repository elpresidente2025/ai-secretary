// frontend/src/components/loading/LoadingSpinner.jsx
import React from 'react';
import { CircularProgress, Box, Typography } from '@mui/material';

const LoadingSpinner = ({ 
  size = 40, 
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
      <CircularProgress size={size} color={color} />
      {message && (
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ mt: 1 }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingSpinner;