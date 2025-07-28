import React, { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  Container,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Button,
  IconButton,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DashboardLayout from '../components/DashboardLayout';
import apiClient from '../services/api';

function PostsListPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/posts');
        setPosts(response.data.posts);
      } catch (err) {
        setError(err.response?.data?.error || '포스트 목록을 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handleRowClick = (postId) => {
    navigate(`/post/${postId}`);
  };

  const renderPostList = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return <Alert severity="error">{error}</Alert>;
    }

    if (posts.length === 0) {
        return <Typography sx={{ p: 2, textAlign: 'center' }}>생성된 포스트가 없습니다.</Typography>
    }

    return (
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="posts table">
          <TableHead>
            <TableRow>
              <TableCell>제목</TableCell>
              <TableCell align="right">최종 수정일</TableCell>
              <TableCell align="right">상태</TableCell>
              <TableCell align="center">편집</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {posts.map((post) => (
              <TableRow key={post.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell component="th" scope="row" onClick={() => handleRowClick(post.id)} sx={{ cursor: 'pointer' }}>
                  {post.title}
                </TableCell>
                <TableCell align="right">{new Date(post.createdAt).toLocaleString('ko-KR')}</TableCell>
                <TableCell align="right">{post.status || '생성됨'}</TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => handleRowClick(post.id)} size="small" aria-label="edit post">
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <DashboardLayout title="포스트 목록">
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" gutterBottom component="div">내 포스트</Typography>
            <Button variant="contained" onClick={() => navigate('/generate')}>새 포스트 생성</Button>
        </Box>
        {renderPostList()}
      </Container>
    </DashboardLayout>
  );
}

export default PostsListPage;
