import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress, Alert, Container } from '@mui/material';
import DashboardLayout from '../components/DashboardLayout.jsx';
import Editor from '../components/Editor.jsx';
import apiClient from '../services/api.js';

function PostDetailPage() {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPost = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await apiClient.get(`/posts/${postId}`);
        setPost(response.data.post);
      } catch (err) {
        console.error("포스트 로딩 중 오류 발생:", err);
        setError(err.response?.data?.error || '포스트를 불러오는 데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>;
    }

    if (post) {
      return <Editor key={post.id} initialContent={post.content} postId={post.id} />;
    }

    return null;
  };

  return (
    <DashboardLayout title={post ? `포스트: ${post.title}` : '포스트 불러오는 중...'}>
      <Container maxWidth="lg">
        {renderContent()}
      </Container>
    </DashboardLayout>
  );
}

export default PostDetailPage;