// frontend/src/pages/GuidelinesPage.jsx
import React, { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Edit,
  Dashboard,
  List as ListIcon,
  LightbulbOutlined,
  CheckCircleOutline,
  Warning,
  TrendingUp,
  ExpandMore,
  Search,
  Person
} from '@mui/icons-material';
import DashboardLayout from '../components/DashboardLayout';
import GenerateGuide from '../components/guides/GenerateGuide';
import DashboardGuide from '../components/guides/DashboardGuide';
import ManagementGuide from '../components/guides/ManagementGuide';
import TipsGuide from '../components/guides/TipsGuide';
import ChecklistGuide from '../components/guides/ChecklistGuide';
import UsageGuide from '../components/guides/UsageGuide';
import ProfileGuide from '../components/guides/ProfileGuide';

const GuidelinesPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAccordion, setExpandedAccordion] = useState('generate');

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  const guideData = [
    {
      id: 'generate',
      title: '원고 생성하기',
      icon: <Edit sx={{ color: '#003A87' }} />,
      component: <GenerateGuide />
    },
    {
      id: 'dashboard',
      title: '대시보드 활용',
      icon: <Dashboard sx={{ color: '#006261' }} />,
      component: <DashboardGuide />
    },
    {
      id: 'management',
      title: '원고 관리',
      icon: <ListIcon sx={{ color: '#55207D' }} />,
      component: <ManagementGuide />
    },
    {
      id: 'tips',
      title: '더 좋은 글을 위한 팁',
      icon: <LightbulbOutlined sx={{ color: '#f57c00' }} />,
      component: <TipsGuide />
    },
    {
      id: 'checklist',
      title: '사용 전 체크포인트',
      icon: <CheckCircleOutline sx={{ color: '#4caf50' }} />,
      component: <ChecklistGuide />
    },
    {
      id: 'usage',
      title: '월간 사용량 관리',
      icon: <TrendingUp sx={{ color: '#2196f3' }} />,
      component: <UsageGuide />
    },
    {
      id: 'profile',
      title: '프로필 설정',
      icon: <Person sx={{ color: '#9c27b0' }} />,
      component: <ProfileGuide />
    }
  ];

  const filteredGuides = searchQuery 
    ? guideData.filter(guide => 
        guide.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : guideData;

  
  return (
    <DashboardLayout title="전자두뇌비서관 사용 가이드">
      <Box sx={{ height: 20 }} />
      <Container maxWidth="xl">
        {/* 페이지 헤더 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, color: 'white' }}>
            전자두뇌비서관 사용 가이드
          </Typography>
          <Typography variant="body1" color="text.secondary">
            AI로 정치 콘텐츠를 효과적으로 생성하고 관리하는 방법을 안내합니다
          </Typography>
        </Box>
        
        {/* 검색 기능 */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="궁금한 내용을 검색해보세요 (예: 원고 생성, 대시보드, 관리)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: '#666' }} />
                </InputAdornment>
              ),
            }}
            sx={{ 
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#ddd' },
                '&:hover fieldset': { borderColor: '#003A87' },
                '&.Mui-focused fieldset': { borderColor: '#003A87' }
              }
            }}
          />
        </Paper>
        
        {/* 가이드 아코디언 */}
        <Box>
          {filteredGuides.map((guide) => (
            <Accordion
              key={guide.id}
              expanded={expandedAccordion === guide.id}
              onChange={handleAccordionChange(guide.id)}
              sx={{ mb: 2, border: '1px solid #ddd', borderRadius: '8px !important' }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{ 
                  bgcolor: '#f8f9fa',
                  borderRadius: expandedAccordion === guide.id ? '8px 8px 0 0' : '8px'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {guide.icon}
                  <Typography variant="h6" sx={{ ml: 2, fontWeight: 600 }}>
                    {guide.title}
                  </Typography>
                </Box>
              </AccordionSummary>
              
              <AccordionDetails sx={{ p: 3 }}>
                {guide.component}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
        
        {/* 검색 결과 없음 */}
        {filteredGuides.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              검색 결과가 없습니다
            </Typography>
            <Typography variant="body2" color="text.secondary">
              다른 키워드로 검색해보세요
            </Typography>
          </Paper>
        )}
        
        {/* 추가 도움말 */}
        <Paper sx={{ p: 3, mt: 4, bgcolor: '#f8f9fa' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center' }}>
            <Warning sx={{ mr: 1, color: '#ff9800' }} />
            사용 시 유의사항
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>선거법 준수:</strong> 생성된 원고는 반드시 선거법에 맞게 검토 후 사용하세요. 
              과도한 자기홍보, 허위사실, 비방 표현은 금지됩니다.
            </Typography>
          </Alert>
          <Alert severity="success">
            <Typography variant="body2">
              <strong>사이트 주소:</strong> 언제든지 <strong>cyberbrain.kr</strong>에서 접속하실 수 있습니다.
            </Typography>
          </Alert>
        </Paper>
        
        <Box sx={{ height: 20 }} />
      </Container>
    </DashboardLayout>
  );
};

export default GuidelinesPage;