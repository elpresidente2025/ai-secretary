import React, { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  Container,
  Grid,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import { httpsCallable } from 'firebase/functions';
import DashboardLayout from '../components/DashboardLayout';
import { functions } from '../config/firebase';

// 역할(role)에 대한 정의
const ROLE_DEFINITIONS = {
  admin: { label: '👑 관리자', color: 'error' },
  opinion_leader: { label: '👑 오피니언 리더', color: 'warning' },
  region_influencer: { label: '🌆 리전 인플루언서', color: 'info' },
  local_blogger: { label: '📝 로컬 블로거', color: 'success' },
  user: { label: '👤 일반 사용자', color: 'default' }
};

function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Firebase Functions 호출
        const getUserList = httpsCallable(functions, 'getUserList');
        const result = await getUserList();
        
        setUsers(result.data.users || []);
      } catch (err) {
        console.error('사용자 목록 조회 실패:', err);
        setError(err.message || '사용자 목록을 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const getRoleChipProps = (role) => {
    return ROLE_DEFINITIONS[role] || { label: role || '미정', color: 'default' };
  };

  const renderUserList = () => {
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

    if (users.length === 0) {
      return <Alert severity="info">등록된 사용자가 없습니다.</Alert>;
    }

    return (
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="사용자 목록">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>이름</TableCell>
              <TableCell>이메일</TableCell>
              <TableCell>직책</TableCell>
              <TableCell>지역</TableCell>
              <TableCell>역할</TableCell>
              <TableCell>가입일</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell>{user.id}</TableCell>
                <TableCell component="th" scope="row">{user.name || '-'}</TableCell>
                <TableCell>{user.email || '-'}</TableCell>
                <TableCell>{user.position || '-'}</TableCell>
                <TableCell>
                  {[user.regionMetro, user.regionLocal, user.electoralDistrict]
                    .filter(Boolean)
                    .join(' > ') || '-'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={getRoleChipProps(user.role).label}
                    color={getRoleChipProps(user.role).color}
                    size="small" 
                  />
                </TableCell>
                <TableCell>
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <DashboardLayout title="관리자 페이지">
      <Container maxWidth="lg">
        <Typography variant="h4" gutterBottom>
          시스템 관리
        </Typography>
        <Typography paragraph color="text.secondary">
          등록된 사용자 목록을 확인할 수 있습니다.
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                사용자 목록
              </Typography>
              {renderUserList()}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </DashboardLayout>
  );
}

export default AdminPage;