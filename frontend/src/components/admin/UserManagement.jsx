import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tooltip
} from '@mui/material';
import { LoadingSpinner } from '../loading';
import {
  Person,
  Block,
  Delete,
  Edit,
  Refresh,
  Search
} from '@mui/icons-material';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../services/firebase';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [deactivateDialog, setDeactivateDialog] = useState({ open: false, user: null });
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  const callGetAllUsers = httpsCallable(functions, 'getAllUsers');
  const callDeactivateUser = httpsCallable(functions, 'deactivateUser');
  const callDeleteUser = httpsCallable(functions, 'deleteUser');
  const callReactivateUser = httpsCallable(functions, 'reactivateUser');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await callGetAllUsers();
      if (response.data.success) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
      setNotification({
        open: true,
        message: '사용자 목록을 불러오는 중 오류가 발생했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateUser = async () => {
    if (!deactivateDialog.user) return;
    
    try {
      const response = await callDeactivateUser({ 
        userId: deactivateDialog.user.uid 
      });
      
      if (response.data.success) {
        setNotification({
          open: true,
          message: `${deactivateDialog.user.name || deactivateDialog.user.email} 계정이 비활성화되었습니다.`,
          severity: 'success'
        });
        loadUsers(); // 목록 새로고침
      }
    } catch (error) {
      console.error('계정 비활성화 실패:', error);
      setNotification({
        open: true,
        message: '계정 비활성화 중 오류가 발생했습니다.',
        severity: 'error'
      });
    } finally {
      setDeactivateDialog({ open: false, user: null });
    }
  };

  const handleReactivateUser = async (user) => {
    try {
      const response = await callReactivateUser({ 
        userId: user.uid 
      });
      
      if (response.data.success) {
        setNotification({
          open: true,
          message: `${user.name || user.email} 계정이 재활성화되었습니다.`,
          severity: 'success'
        });
        loadUsers(); // 목록 새로고침
      }
    } catch (error) {
      console.error('계정 재활성화 실패:', error);
      setNotification({
        open: true,
        message: '계정 재활성화 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteDialog.user) return;
    
    try {
      const response = await callDeleteUser({ 
        userId: deleteDialog.user.uid 
      });
      
      if (response.data.success) {
        setNotification({
          open: true,
          message: `${deleteDialog.user.name || deleteDialog.user.email} 계정이 완전히 삭제되었습니다.`,
          severity: 'success'
        });
        loadUsers(); // 목록 새로고침
      }
    } catch (error) {
      console.error('계정 삭제 실패:', error);
      setNotification({
        open: true,
        message: '계정 삭제 중 오류가 발생했습니다.',
        severity: 'error'
      });
    } finally {
      setDeleteDialog({ open: false, user: null });
    }
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.electoralDistrict?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'black' }}>
          <Person />
          사용자 관리
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadUsers}
          disabled={loading}
        >
          새로고침
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="이름, 이메일, 선거구로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />
      </Box>

      {loading ? (
        <LoadingSpinner message="사용자 목록 로딩 중..." fullHeight={true} />
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'black' }}>이름</TableCell>
                <TableCell sx={{ color: 'black' }}>이메일</TableCell>
                <TableCell sx={{ color: 'black' }}>직책</TableCell>
                <TableCell sx={{ color: 'black' }}>선거구</TableCell>
                <TableCell sx={{ color: 'black' }}>상태</TableCell>
                <TableCell sx={{ color: 'black' }}>가입일</TableCell>
                <TableCell align="center" sx={{ color: 'black' }}>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell sx={{ color: 'black' }}>{user.name || '-'}</TableCell>
                  <TableCell sx={{ color: 'black' }}>{user.email}</TableCell>
                  <TableCell sx={{ color: 'black' }}>{user.position || '-'}</TableCell>
                  <TableCell sx={{ color: 'black' }}>{user.electoralDistrict || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.isActive ? '활성' : '비활성'}
                      color={user.isActive ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'black' }}>{formatDate(user.createdAt)}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {user.isActive ? (
                        <Tooltip title="계정 비활성화">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => setDeactivateDialog({ open: true, user })}
                          >
                            <Block />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="계정 재활성화">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleReactivateUser(user)}
                          >
                            <Person />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="계정 삭제">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteDialog({ open: true, user })}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {filteredUsers.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography sx={{ color: 'black' }}>
            {searchTerm ? '검색 결과가 없습니다.' : '등록된 사용자가 없습니다.'}
          </Typography>
        </Box>
      )}

      {/* 계정 비활성화 확인 다이얼로그 */}
      <Dialog
        open={deactivateDialog.open}
        onClose={() => setDeactivateDialog({ open: false, user: null })}
      >
        <DialogTitle>계정 비활성화 확인</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            계정을 비활성화하면 해당 사용자는 로그인할 수 없게 됩니다.
          </Alert>
          <Typography>
            <strong>{deactivateDialog.user?.name || deactivateDialog.user?.email}</strong> 계정을 비활성화하시겠습니까?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateDialog({ open: false, user: null })}>
            취소
          </Button>
          <Button onClick={handleDeactivateUser} color="warning" variant="contained">
            비활성화
          </Button>
        </DialogActions>
      </Dialog>

      {/* 계정 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, user: null })}
      >
        <DialogTitle>계정 삭제 확인</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            이 작업은 되돌릴 수 없습니다. 계정과 관련된 모든 데이터가 영구적으로 삭제됩니다.
          </Alert>
          <Typography sx={{ mb: 2 }}>
            <strong>{deleteDialog.user?.name || deleteDialog.user?.email}</strong> 계정을 완전히 삭제하시겠습니까?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            삭제될 데이터: 프로필 정보, 생성된 게시물, 결제 정보, 활동 기록 등
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, user: null })}>
            취소
          </Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">
            영구 삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default UserManagement;