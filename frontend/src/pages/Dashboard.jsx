import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, List, ListItemButton, ListItemText, LinearProgress, Grid, CircularProgress, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { functions } from '../config/firebase.js';
import { httpsCallable } from 'firebase/functions';

const Dashboard = () => {
    const navigate = useNavigate();
    const { auth } = useAuth(); // AuthContext에서 사용자 정보를 가져옵니다.

    // 데이터를 위한 state들을 선언합니다.
    const [usage, setUsage] = useState({ current: 0, total: 0 });
    const [recentPosts, setRecentPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // 컴포넌트가 마운트될 때 데이터를 가져옵니다.
    useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                console.log('🔥 Firebase Functions로 Dashboard 데이터 요청');
                
                // Firebase Functions 호출
                const getDashboardDataFn = httpsCallable(functions, 'getDashboardData');
                const response = await getDashboardDataFn();
                
                console.log('✅ Dashboard 응답:', response.data);
                
                const dashboardData = response.data.data;
                
                setUsage(dashboardData.usage || { current: 0, total: 0 });
                setRecentPosts(dashboardData.recentPosts || []);
                
                console.log('설정된 usage:', dashboardData.usage);
                console.log('설정된 recentPosts:', dashboardData.recentPosts);
                
            } catch (err) {
                console.error('❌ Dashboard: 데이터 요청 실패:', err);
                
                // Firebase Functions 에러 처리
                let errorMessage = '데이터를 불러오는 데 실패했습니다.';
                if (err.code === 'functions/unauthenticated') {
                    errorMessage = '로그인이 필요합니다.';
                } else if (err.code === 'functions/internal') {
                    errorMessage = '서버에서 오류가 발생했습니다.';
                } else if (err.message) {
                    errorMessage = err.message;
                }
                
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };

        if (auth?.user) {
            fetchDashboardData();
        } else {
            setIsLoading(false);
        }
    }, [auth]); // auth가 변경될 때마다 실행

    const isAdmin = auth?.user?.role === 'admin';

    const usagePercentage = isAdmin ? 100 : usage.total > 0 ? (usage.current / usage.total) * 100 : 0;

    // 로딩 중일 때 로딩 스피너를 표시합니다.
    if (isLoading) {
        return (
            <DashboardLayout title="대시보드">
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress />
                </Box>
            </DashboardLayout>
        );
    }

    // 에러 발생 시 에러 메시지를 표시합니다.
    if (error) {
        return (
            <DashboardLayout title="대시보드">
                <Alert severity="error">{error}</Alert>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="대시보드">
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, mb: 3 }}>
                        <Typography variant="h6">이번 달 사용량</Typography>
                        {isAdmin ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                                <Typography variant="body1" color="text.secondary">
                                    관리자 계정은 생성 횟수에 제한이 없습니다.
                                </Typography>
                                <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>∞</Typography>
                            </Box>
                        ) : (
                            <>
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                    <Box sx={{ width: '100%', mr: 1 }}>
                                        <LinearProgress variant="determinate" value={usagePercentage} />
                                    </Box>
                                    <Box sx={{ minWidth: 35 }}>
                                        <Typography variant="body2" color="text.secondary">{`${usage.current}/${usage.total}`}</Typography>
                                    </Box>
                                </Box>
                                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                    할당량은 매월 1일에 초기화됩니다.
                                </Typography>
                            </>
                        )}
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Button variant="contained" size="large" onClick={() => navigate('/generate')} sx={{ mb: 3 }}>
                        새 포스트 생성
                    </Button>
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h5" gutterBottom>최근 포스트</Typography>
                    <List component={Paper}>
                        {recentPosts.length > 0 ? (
                            recentPosts.map((post) => (
                                <ListItemButton key={post.id} onClick={() => navigate(`/post/${post.id}`)}>
                                    <ListItemText primary={post.title} secondary={`상태: ${post.status} | 생성일: ${new Date(post.createdAt).toLocaleDateString('ko-KR')}`} />
                                </ListItemButton>
                            ))
                        ) : (
                            <ListItemText primary="최근 생성한 포스트가 없습니다." sx={{ textAlign: 'center', p: 2 }} />
                        )}
                    </List>
                </Grid>
            </Grid>
        </DashboardLayout>
    );
};

export default Dashboard;