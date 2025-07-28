import React from 'react';
import { useRouteError, Link as RouterLink } from 'react-router-dom';
import { Box, Button, Container, Typography, Paper } from '@mui/material';

export default function ErrorPage() {
  // useRouteError provides the error that was thrown.
  const error = useRouteError();
  console.error("ErrorPage caught an error:", error);

  let status = '오류';
  let statusText = '죄송합니다. 예상치 못한 오류가 발생했습니다.';

  if (error) {
    if (typeof error === 'object' && error !== null) {
      status = error.status || status;
      // Prefer statusText from the error object if it exists (common for fetch responses)
      statusText = error.statusText || error.message || statusText;
    } else if (typeof error === 'string') {
      statusText = error;
    }
  }

  return (
    <Container component="main" maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          width: '100%', 
          textAlign: 'center',
          borderRadius: 4,
        }}
      >
        <Typography variant="h1" component="h1" color="primary" gutterBottom>
          {status}
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom>
          이런! 페이지를 찾을 수 없거나 오류가 발생했습니다.
        </Typography>
        <Typography color="text.secondary" paragraph>
          {statusText}
        </Typography>
        <Box sx={{ mt: 4 }}>
          <Button component={RouterLink} to="/" variant="contained" size="large">
            홈으로 돌아가기
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

