import React, { useState, useEffect, useCallback } from 'react';
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  ContentCopy as ContentCopyIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import { usePostGenerator } from '../hooks/usePostGenerator';

// 날짜 포맷팅 함수
const formatDate = (dateString) => {
  if (!dateString) return '날짜 없음';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '날짜 오류';
  }
};

// 글자수 계산 함수
const calculateWordCount = (text) => {
  if (!text) return 0;
  const cleanText = text.replace(/<[^>]*>/g, '').replace(/\s/g, '');
  return cleanText.length;
};

function PostsListPage() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const { 
    loading, 
    getUserPosts, 
    updatePost, 
    setError 
  } = usePostGenerator();

  const [posts, setPosts] = useState([]);
  const [localError, setLocalError] = useState(null); // 로컬 에러 상태 추가
  const [selectedPost, setSelectedPost] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [editData, setEditData] = useState({ title: '', content: '' });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // 포스트 목록 로드 - useCallback으로 감싸서 의존성 문제 해결
  const loadPosts = useCallback(async () => {
    try {
      const result = await getUserPosts();
      if (result.success) {
        setPosts(result.posts);
        console.log('포스트 목록 로드 성공:', result.posts);
      }
    } catch (err) {
      console.error('포스트 목록 로드 실패:', err);
      setError('포스트 목록을 불러오는데 실패했습니다.');
    }
  }, [getUserPosts, setError]);

  // 포스트 목록 로드
  useEffect(() => {
    if (auth?.user?.id) {
      loadPosts();
    }
  }, [auth?.user?.id, loadPosts]);

  // 포스트 보기
  const handleView = (post) => {
    setSelectedPost(post);
    setViewDialog(true);
  };

  // 포스트 수정 시작
  const handleEditStart = (post) => {
    setSelectedPost(post);
    setEditData({
      title: post.title || '',
      content: post.content || ''
    });
    setEditDialog(true);
  };

  // 포스트 수정 저장
  const handleEditSave = async () => {
    if (!selectedPost || !editData.title.trim() || !editData.content.trim()) {
      setSnackbar({
        open: true,
        message: '제목과 내용을 모두 입력해주세요.',
        severity: 'error'
      });
      return;
    }

    try {
      const result = await updatePost(selectedPost.id, editData.title, editData.content);
      if (result.success) {
        setSnackbar({
          open: true,
          message: '포스트가 성공적으로 수정되었습니다.',
          severity: 'success'
        });
        setEditDialog(false);
        setSelectedPost(null);
        // 목록 새로고침
        await loadPosts();
      }
    } catch (err) {
      console.error('포스트 수정 실패:', err);
      setSnackbar({
        open: true,
        message: '포스트 수정에 실패했습니다: ' + (err.message || '알 수 없는 오류'),
        severity: 'error'
      });
    }
  };

  // 복사하기
  const handleCopy = (content) => {
    try {
      const cleanContent = content.replace(/<[^>]*>/g, '');
      navigator.clipboard.writeText(cleanContent);
      setSnackbar({
        open: true,
        message: '클립보드에 복사되었습니다!',
        severity: 'success'
      });
    } catch (error) {
      console.error('복사 실패:', error);
      setSnackbar({
        open: true,
        message: '복사에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 다이얼로그 닫기
  const handleCloseDialogs = () => {
    setEditDialog(false);
    setViewDialog(false);
    setSelectedPost(null);
    setEditData({ title: '', content: '' });
  };

  // 스낵바 닫기
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const renderPostList = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (localError) {
      return <Alert severity="error" onClose={() => setLocalError(null)}>{localError}</Alert>;
    }

    if (posts.length === 0) {
      return (
        <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="h6" gutterBottom>
            저장된 포스트가 없습니다
          </Typography>
          <Typography variant="body2" sx={{ mb: 3 }}>
            AI 원고 생성 페이지에서 초안을 저장해보세요.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/generate')}
          >
            원고 생성하러 가기
          </Button>
        </Paper>
      );
    }

    return (
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="posts table">
          <TableHead>
            <TableRow>
              <TableCell>제목</TableCell>
              <TableCell>카테고리</TableCell>
              <TableCell align="center">글자수</TableCell>
              <TableCell align="center">최종 수정일</TableCell>
              <TableCell align="center">상태</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {posts.map((post) => (
              <TableRow 
                key={post.id} 
                hover 
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell 
                  component="th" 
                  scope="row" 
                  onClick={() => handleView(post)} 
                  sx={{ cursor: 'pointer', fontWeight: 500 }}
                >
                  {post.title || '제목 없음'}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip 
                      label={post.category || '일반'} 
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                    />
                    {post.subCategory && (
                      <Chip 
                        label={post.subCategory} 
                        size="small" 
                        variant="outlined" 
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  {calculateWordCount(post.content)}자
                </TableCell>
                <TableCell align="center">
                  {formatDate(post.createdAt)}
                </TableCell>
                <TableCell align="center">
                  <Chip 
                    label={post.status || 'draft'} 
                    size="small" 
                    color={post.status === 'published' ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                    <IconButton 
                      onClick={() => handleView(post)} 
                      size="small" 
                      title="보기"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton 
                      onClick={() => handleEditStart(post)} 
                      size="small" 
                      title="수정"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      onClick={() => handleCopy(post.content)} 
                      size="small" 
                      title="복사"
                    >
                      <ContentCopyIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // 인증되지 않은 사용자 처리
  if (!auth?.user?.id) {
    return (
      <DashboardLayout title="포스트 목록">
        <Container maxWidth="lg">
          <Alert severity="error">
            사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.
          </Alert>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="포스트 목록">
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom component="div">
            내 포스트
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/generate')}
          >
            새 포스트 생성
          </Button>
        </Box>
        
        {renderPostList()}

        {/* 포스트 보기 다이얼로그 */}
        <Dialog 
          open={viewDialog} 
          onClose={handleCloseDialogs}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {selectedPost?.title || '제목 없음'}
            </Typography>
            <IconButton onClick={handleCloseDialogs}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ mb: 2 }}>
              <Chip label={selectedPost?.category || '일반'} size="small" sx={{ mr: 1 }} />
              {selectedPost?.subCategory && (
                <Chip label={selectedPost.subCategory} size="small" sx={{ mr: 1 }} />
              )}
              <Chip 
                label={`${calculateWordCount(selectedPost?.content)}자`} 
                size="small" 
              />
            </Box>
            <Box 
              sx={{ 
                fontSize: '1rem',
                lineHeight: 1.6,
                '& p': { margin: '0.5rem 0' }
              }}
              dangerouslySetInnerHTML={{ __html: selectedPost?.content || '' }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => handleCopy(selectedPost?.content)} startIcon={<ContentCopyIcon />}>
              복사
            </Button>
            <Button onClick={() => handleEditStart(selectedPost)} startIcon={<EditIcon />}>
              수정
            </Button>
            <Button onClick={handleCloseDialogs}>
              닫기
            </Button>
          </DialogActions>
        </Dialog>

        {/* 포스트 수정 다이얼로그 */}
        <Dialog 
          open={editDialog} 
          onClose={handleCloseDialogs}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>포스트 수정</DialogTitle>
          <DialogContent dividers>
            <TextField
              fullWidth
              label="제목"
              value={editData.title}
              onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={10}
              label="내용"
              value={editData.content.replace(/<[^>]*>/g, '')} // HTML 태그 제거하여 표시
              onChange={(e) => setEditData(prev => ({ ...prev, content: e.target.value }))}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialogs}>
              취소
            </Button>
            <Button 
              onClick={handleEditSave} 
              variant="contained" 
              startIcon={<SaveIcon />}
              disabled={loading}
            >
              저장
            </Button>
          </DialogActions>
        </Dialog>

        {/* 스낵바 */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
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
      </Container>
    </DashboardLayout>
  );
}

export default PostsListPage;