import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  CircularProgress, 
  Alert, 
  Container, 
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  Chip,
  IconButton,
  Divider
} from '@mui/material';
import { 
  ArrowBack, 
  Save, 
  ContentCopy, 
  Download,
  Edit as EditIcon
} from '@mui/icons-material';
import { httpsCallable } from 'firebase/functions';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { functions } from '../config/firebase';
import { useAuth } from '../hooks/useAuth'; // 🔥 경로 변경

function PostDetailPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { auth } = useAuth();
  
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [editedTitle, setEditedTitle] = useState('');

  useEffect(() => {
    const fetchPost = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        // Firebase Functions 호출
        const getPost = httpsCallable(functions, 'getPost');
        const result = await getPost({ postId });
        
        const postData = result.data.post;
        setPost(postData);
        setEditedTitle(postData.title || '');
        setEditedContent(postData.content || '');
      } catch (err) {
        console.error("포스트 로딩 중 오류 발생:", err);
        setError(err.message || '포스트를 불러오는 데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    if (postId && auth?.user) {
      fetchPost();
    }
  }, [postId, auth]);

  const handleSave = async () => {
    if (!post) return;
    
    setIsSaving(true);
    setError('');
    
    try {
      const updatePost = httpsCallable(functions, 'updatePost');
      await updatePost({
        postId: post.id,
        title: editedTitle,
        content: editedContent
      });
      
      // 로컬 상태 업데이트
      setPost(prev => ({
        ...prev,
        title: editedTitle,
        content: editedContent,
        updatedAt: new Date().toISOString()
      }));
      
      setIsEditing(false);
      alert('포스트가 성공적으로 저장되었습니다.');
    } catch (err) {
      console.error('포스트 저장 실패:', err);
      setError(err.message || '포스트 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    if (!post) return;
    
    const plainText = `${post.title}\n\n${post.content.replace(/<[^>]*>/g, '')}`;
    navigator.clipboard.writeText(plainText).then(() => {
      alert('클립보드에 복사되었습니다.');
    });
  };

  const handleDownload = () => {
    if (!post) return;
    
    const plainText = `${post.title}\n\n${post.content.replace(/<[^>]*>/g, '')}`;
    const blob = new Blob([plainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${post.title || '포스트'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleString('ko-KR');
    } catch {
      return '-';
    }
  };

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

    if (!post) {
      return <Alert severity="warning" sx={{ mt: 4 }}>포스트를 찾을 수 없습니다.</Alert>;
    }

    return (
      <Paper sx={{ p: 4 }}>
        {/* 헤더 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box sx={{ flex: 1 }}>
            {isEditing ? (
              <TextField
                fullWidth
                variant="outlined"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                sx={{ mb: 2 }}
              />
            ) : (
              <Typography variant="h4" gutterBottom>
                {post.title || '제목 없음'}
              </Typography>
            )}
            
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Chip label={post.category || '기타'} size="small" />
              <Chip 
                label={post.status === 'draft' ? '초안' : post.status || '상태 없음'} 
                size="small" 
                color={post.status === 'published' ? 'success' : 'default'} 
              />
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              생성일: {formatDate(post.createdAt)} | 수정일: {formatDate(post.updatedAt)}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {isEditing ? (
              <>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={isSaving}
                  startIcon={<Save />}
                >
                  {isSaving ? '저장 중...' : '저장'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedTitle(post.title || '');
                    setEditedContent(post.content || '');
                  }}
                >
                  취소
                </Button>
              </>
            ) : (
              <>
                <IconButton onClick={() => setIsEditing(true)} color="primary">
                  <EditIcon />
                </IconButton>
                <IconButton onClick={handleCopy} color="primary">
                  <ContentCopy />
                </IconButton>
                <IconButton onClick={handleDownload} color="primary">
                  <Download />
                </IconButton>
              </>
            )}
          </Box>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        {/* 내용 */}
        {isEditing ? (
          <TextField
            fullWidth
            multiline
            rows={20}
            variant="outlined"
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            placeholder="내용을 입력하세요"
          />
        ) : (
          <Box 
            sx={{ 
              minHeight: 400,
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              backgroundColor: 'grey.50'
            }}
            dangerouslySetInnerHTML={{ __html: post.content || '<p>내용이 없습니다.</p>' }}
          />
        )}
      </Paper>
    );
  };

  return (
    <DashboardLayout title={post ? `포스트: ${post.title}` : '포스트 불러오는 중...'}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/posts')}
            sx={{ mb: 2 }}
          >
            포스트 목록으로
          </Button>
        </Box>
        
        {renderContent()}
      </Container>
    </DashboardLayout>
  );
}

export default PostDetailPage;