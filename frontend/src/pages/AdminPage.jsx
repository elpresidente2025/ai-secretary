// frontend/src/pages/AdminPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Container, Paper, Typography, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Alert, Snackbar, Stack
} from '@mui/material';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions(undefined, 'asia-northeast3');

export default function AdminPage() {
  const { auth } = useAuth();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [page] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const call = httpsCallable(functions, 'getUserList');
      const { data } = await call({ page, pageSize, query: search.trim() });
      setUsers(data.users || []);
    } catch (e) {
      console.error(e);
      setErr('사용자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    load();
  }, [load]);

  if (!auth?.user) {
    return (
      <DashboardLayout title="관리자">
        <Container maxWidth="lg">
          <Alert severity="error" sx={{ mt: 4 }}>로그인이 필요합니다.</Alert>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="관리자: 사용자 목록">
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6" sx={{ flexGrow: 1 }}>사용자 목록</Typography>
            <TextField
              size="small"
              placeholder="이름/이메일 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
            />
            <Button variant="contained" onClick={load} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : '검색/새로고침'}
            </Button>
          </Stack>
        </Paper>

        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>이름</TableCell>
                  <TableCell>이메일</TableCell>
                  <TableCell>직책</TableCell>
                  <TableCell>지역</TableCell>
                  <TableCell>선거구</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>활성화</TableCell>
                  <TableCell>관리자</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>{u.name || '-'}</TableCell>
                    <TableCell>{u.email || '-'}</TableCell>
                    <TableCell>{u.position || '-'}</TableCell>
                    <TableCell>{[u.regionMetro, u.regionLocal].filter(Boolean).join(' ') || '-'}</TableCell>
                    <TableCell>{u.electoralDistrict || '-'}</TableCell>
                    <TableCell>{u.status || '-'}</TableCell>
                    <TableCell>{u.isActive ? '✅' : '❌'}</TableCell>
                    <TableCell>{u.isAdmin ? '✅' : '—'}</TableCell>
                  </TableRow>
                ))}
                {!loading && users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress />
            </Box>
          )}
        </Paper>

        <Snackbar
          open={!!err}
          autoHideDuration={5000}
          onClose={() => setErr('')}
          message={err}
        />
      </Container>
    </DashboardLayout>
  );
}
