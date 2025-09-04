import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { CheckCircleOutline, Person, Warning } from '@mui/icons-material';

const ProfileGuide = () => {
  const basicInfo = [
    '이름: 실명으로 정확히 입력',
    '직책: 현재 맡고 있는 정치적 직책',
    '지역: 활동하는 지역구나 선거구',
    '소속 정당: 현재 소속 정당명',
    '상태: 현역/예비후보/후보 중 선택'
  ];

  const profileSections = [
    {
      title: '경력 정보',
      items: [
        '정치 경력: 의정활동, 당내 활동 경험',
        '직업 경력: 이전 직업이나 전문 분야',
        '학력: 최종 학력 또는 주요 학력',
        '수상 경력: 정치/사회 활동 관련 수상'
      ]
    },
    {
      title: '정책 및 공약',
      items: [
        '핵심 공약: 주요 정책 방향 3-5개',
        '지역 현안: 우리 지역의 중요한 이슈들',
        '정책 비전: 장기적인 정치적 목표',
        '실현 방안: 구체적인 실행 계획'
      ]
    },
    {
      title: '개인 정보',
      items: [
        '취미/관심사: 개인적 관심 분야',
        '봉사활동: 사회봉사 경험',
        '가족 사항: 공개 가능한 가족 정보',
        '특기: 특별한 기술이나 능력'
      ]
    }
  ];

  const tips = [
    '구체적이고 정확한 정보일수록 더 개인화된 원고 생성',
    '정기적으로 업데이트하여 최신 상태 유지',
    '선거법에 위반되지 않는 범위에서 작성',
    '허위 정보 입력 금지 - 사실 확인 후 입력'
  ];

  const warnings = [
    { 
      title: '개인정보 보호', 
      content: '민감한 개인정보(주민번호, 개인 연락처 등)는 입력하지 마세요' 
    },
    { 
      title: '선거법 준수', 
      content: '과도한 자기 홍보나 허위 사실은 선거법 위반 소지가 있습니다' 
    },
    { 
      title: '정확성 확인', 
      content: '입력한 정보는 원고 생성에 직접 반영되므로 정확해야 합니다' 
    }
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Person sx={{ color: '#9c27b0', mr: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          프로필 설정 가이드
        </Typography>
      </Box>

      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#9c27b0' }}>
        기본 정보 입력
      </Typography>
      <List dense>
        {basicInfo.map((item, index) => (
          <ListItem key={index} sx={{ py: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 24 }}>
              <CheckCircleOutline sx={{ fontSize: 16, color: '#9c27b0' }} />
            </ListItemIcon>
            <ListItemText primary={item} primaryTypographyProps={{ variant: 'body2' }} />
          </ListItem>
        ))}
      </List>

      {profileSections.map((section, index) => (
        <Box key={index} sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#9c27b0' }}>
            {section.title}
          </Typography>
          <List dense>
            {section.items.map((item, itemIndex) => (
              <ListItem key={itemIndex} sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 24 }}>
                  <CheckCircleOutline sx={{ fontSize: 16, color: '#9c27b0' }} />
                </ListItemIcon>
                <ListItemText primary={item} primaryTypographyProps={{ variant: 'body2' }} />
              </ListItem>
            ))}
          </List>
        </Box>
      ))}

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#4caf50' }}>
          프로필 작성 팁
        </Typography>
        <List dense>
          {tips.map((tip, index) => (
            <ListItem key={index} sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 24 }}>
                <CheckCircleOutline sx={{ fontSize: 16, color: '#4caf50' }} />
              </ListItemIcon>
              <ListItemText primary={tip} primaryTypographyProps={{ variant: 'body2' }} />
            </ListItem>
          ))}
        </List>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#ff5722' }}>
          주의사항
        </Typography>
        {warnings.map((warning, index) => (
          <Alert key={index} severity="warning" sx={{ mb: 1 }}>
            <Typography variant="body2">
              <strong>{warning.title}:</strong> {warning.content}
            </Typography>
          </Alert>
        ))}
      </Box>

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>💡 활용 팁:</strong> 프로필 정보가 상세할수록 더 정확하고 개인화된 정치 콘텐츠가 생성됩니다. 
            정기적으로 업데이트하여 최신 활동과 정책을 반영해보세요.
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default ProfileGuide;