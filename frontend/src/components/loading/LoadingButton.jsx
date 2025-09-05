// frontend/src/components/loading/LoadingButton.jsx
import React from 'react';
import { Button, CircularProgress } from '@mui/material';

const LoadingButton = ({ 
  loading = false,
  children,
  disabled = false,
  loadingText = '',
  spinnerSize = 20,
  spinnerColor = 'inherit',
  variant = 'contained',
  color = 'primary',
  ...props 
}) => {
  return (
    <Button
      {...props}
      variant={variant}
      color={color}
      disabled={loading || disabled}
      startIcon={loading ? <CircularProgress size={spinnerSize} color={spinnerColor} /> : props.startIcon}
    >
      {loading && loadingText ? loadingText : children}
    </Button>
  );
};

export default LoadingButton;