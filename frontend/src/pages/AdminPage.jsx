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
import DashboardLayout from '../components/DashboardLayout';
import apiClient from '../services/api';

// 역할(role)에 대한 정의를 상수로 분리하여 관리 용이성을 높입니다.
// API에서 오는 값과 별개로 내부적으로 사용할 키(e.g., 'admin', 'opinion_leader')를 정의합니다.
const ROLE_DEFINITIONS = {
  admin: { label: '👑 관리자', color: 'error' },
  opinion_leader: { label: '👑 오피니언 리더', color: 'warning' },
  region_influencer: { label: '🌆 리전 인플루언서', color: 'info' },
  local_blogger: { label: '📝 로컬 블로거', color: 'success' },
};

// API에서 오는 role 값과 내부 키를 매핑합니다.
// 이렇게 하면 API 응답이 변경되어도 이 맵만 수정하면 됩니다.
const getRoleKey = (roleValue) => {
  return Object.keys(ROLE_DEFINITIONS).find(key => ROLE_DEFINITIONS[key].label === roleValue) || roleValue;
};

function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/admin/users');
        setUsers(response.data);
      } catch (err) {
        setError(err.response?.data?.error || '사용자 목록을 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const getRoleChipProps = (role) => {
    const roleKey = getRoleKey(role);
    return ROLE_DEFINITIONS[roleKey] || { label: role, color: 'default' };
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

    return (
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>이름</TableCell>
              <TableCell>이메일</TableCell>
              <TableCell>직책</TableCell>
              <TableCell>지역</TableCell>
              <TableCell>역할</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell>{user.id}</TableCell>
                <TableCell component="th" scope="row">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
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
          이곳에서 시스템의 주요 지표를 확인하고 사용자를 관리할 수 있습니다.
        </Typography>
        
        {renderUserList()}
      </Container>
    </DashboardLayout>
  );
}

export default AdminPage;
