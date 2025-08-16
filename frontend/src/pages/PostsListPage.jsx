// frontend/src/pages/PostsListPage.jsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  CardActionArea,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
} from '@mui/material';
import { ContentCopy, DeleteOutline, Assignment } from '@mui/icons-material';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';

function formatDate(iso) {
  try {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  } catch {
    return '-';
  }
}

function stripHtml(html = '') {
  try {
    return html.replace(/<[^>]*>/g, '');
  } catch {
    return html || '';
  }
}

export default function PostsListPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const [error, setError] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPost, setViewerPost] = useState(null);

  // 디버깅 로그
  console.log('🔍 user:', user);
  console.log('🔍 user?.uid:', user?.uid);
  console.log('🔍 authLoading:', authLoading);

  const callGetUserPosts = httpsCallable(functions, 'getUserPosts');
  const callDeletePost = httpsCallable(functions, 'deletePost');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        if (!user?.uid) {
          setError('사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.');
          return;
        }
        const res = await callGetUserPosts();
        const list = res?.data?.posts || [];
        if (!mounted) return;
        setPosts(list);
      } catch (e) {
        console.error(e);
        setError('목록을 불러오지 못했습니다.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.uid]);

  const handleCopy = (content, e) => {
    if (e) e.stopPropagation();
    try {
      const text = stripHtml(content);
      navigator.clipboard.writeText(text);
      setSnack({ open: true, message: '클립보드에 복사되었습니다!', severity: 'success' });
    } catch (err) {
      console.error(err);
      setSnack({ open: true, message: '복사에 실패했습니다.', severity: 'error' });
    }
  };

  const handleDelete = async (postId, e) => {
    if (e) e.stopPropagation();
    if (!postId) return;
    const ok = window.confirm('정말 이 원고를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.');
    if (!ok) return;
    try {
      await callDeletePost({ postId });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setSnack({ open: true, message: '삭제되었습니다.', severity: 'info' });
      if (viewerPost?.id === postId) {
        setViewerOpen(false);
        setViewerPost(null);
      }
    } catch (err) {
      console.error(err);
      setSnack({ open: true, message: '삭제에 실패했습니다.', severity: 'error' });
    }
  };

  const openViewer = (post) => {
    setViewerPost(post);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerPost(null);
  };

  if (authLoading) {
    return (
      <DashboardLayout title="포스트 목록">
        <Container maxWidth="xl" sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        </Container>
      </DashboardLayout>
    );
  }

  if (!user?.uid) {
    return (
      <DashboardLayout title="포스트 목록">
        <Container maxWidth="xl" sx={{ mt: 2 }}>
          <Alert severity="error">사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.</Alert>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="포스트 목록">
      <Container maxWidth="xl" sx={{ mt: 2, px: { xs: 1, sm: 2 } }}>
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assignment sx={{ color: 'primary.main' }} />
              내 원고 목록
            </Typography>
            <Chip label={`총 ${posts.length}개`} color="primary" variant="outlined" />
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            이 화면은 <strong>읽기 전용</strong>입니다. 카드를 <b>터치/클릭</b>하면 원고가 열립니다. <b>복사</b> 후 메모장 등 외부 편집기에서 직접 수정하세요.
          </Alert>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : posts.length === 0 ? (
            <Alert severity="warning">저장된 원고가 없습니다.</Alert>
          ) : (
            <Grid container spacing={2}>
              {posts.map((p) => {
                const preview = stripHtml(p.content || '');
                const wordCount = p.wordCount ?? preview.length;
                const status = p.status || 'draft';
                const statusColor =
                  status === 'published' ? 'success' : status === 'scheduled' ? 'warning' : 'default';

                return (
                  <Grid item xs={12} sm={6} md={4} key={p.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 2,
                      }}
                    >
                      <CardActionArea onClick={() => openViewer(p)} sx={{ flexGrow: 1 }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Chip size="small" label={status} color={statusColor} variant="outlined" />
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(p.updatedAt) || formatDate(p.createdAt)}
                            </Typography>
                          </Box>

                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 700,
                              mb: 1,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              wordBreak: 'break-word',
                            }}
                            title={p.title || '제목 없음'}
                          >
                            {p.title || '제목 없음'}
                          </Typography>

                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 4,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              wordBreak: 'break-word',
                              minHeight: 84,
                            }}
                          >
                            {preview || '내용 미리보기가 없습니다.'}
                          </Typography>

                          <Divider sx={{ my: 1.5 }} />

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                              글자수: {wordCount}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              생성일 {formatDate(p.createdAt)}
                            </Typography>
                          </Box>
                        </CardContent>
                      </CardActionArea>

                      <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                        <Tooltip title="복사">
                          <IconButton size="small" onClick={(e) => handleCopy(p.content, e)}>
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton size="small" color="error" onClick={(e) => handleDelete(p.id, e)}>
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Paper>

        <Dialog open={viewerOpen} onClose={closeViewer} fullWidth maxWidth="md">
          <DialogTitle sx={{ pr: 2 }}>
            {viewerPost?.title || '제목 없음'}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              생성일 {formatDate(viewerPost?.createdAt)} · 수정일 {formatDate(viewerPost?.updatedAt)}
            </Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Box
              sx={{
                '& p': { my: 1 },
                '& h1, & h2, & h3': { mt: 2, mb: 1 },
                fontSize: '0.95rem',
                lineHeight: 1.7,
                maxHeight: '70vh',
                overflow: 'auto',
                bgcolor: 'grey.50',
                p: 2,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.200',
              }}
              dangerouslySetInnerHTML={{ __html: viewerPost?.content || '<p>내용이 없습니다.</p>' }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={(e) => handleCopy(viewerPost?.content || '', e)} startIcon={<ContentCopy />}>
              복사
            </Button>
            <Button onClick={(e) => handleDelete(viewerPost?.id, e)} color="error" startIcon={<DeleteOutline />}>
              삭제
            </Button>
            <Button onClick={closeViewer} variant="contained">닫기</Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snack.open}
          autoHideDuration={4000}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnack((s) => ({ ...s, open: false }))}
            severity={snack.severity}
            sx={{ width: '100%' }}
          >
            {snack.message}
          </Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  );
}