// frontend/src/pages/GuidelinesPage.jsx
import React from 'react';
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
  Alert
} from '@mui/material';
import {
  Search,
  TrendingUp,
  Psychology,
  Groups,
  Campaign,
  ArticleOutlined,
  LightbulbOutlined,
  CheckCircleOutline
} from '@mui/icons-material';
import DashboardLayout from '../components/DashboardLayout';

const GuidelinesPage = () => {
  const seoTips = [
    {
      title: 'SEO 키워드 리서치',
      icon: <Search />,
      color: '#003A87',
      tips: [
        '지역명 + 정책분야 조합 (예: 강남구 교통정책)',
        '현안 이슈 + 해결방안 키워드',
        '경쟁 후보 분석을 통한 차별화 키워드',
        '시사성 있는 트렌드 키워드 활용',
        'Google Trends, 네이버 데이터랩 활용'
      ]
    },
    {
      title: '콘텐츠 최적화',
      icon: <TrendingUp />,
      color: '#006261',
      tips: [
        '제목에 핵심 키워드 포함 (50자 이내)',
        '메타 설명 최적화 (150자 내외)',
        '소제목(H2, H3) 구조화된 작성',
        '관련 키워드를 자연스럽게 본문에 배치',
        '이미지 alt 텍스트 최적화'
      ]
    },
    {
      title: '독자 참여도 향상',
      icon: <Psychology />,
      color: '#55207D',
      tips: [
        '질문형 제목으로 호기심 유발',
        '구체적인 수치와 데이터 활용',
        '개인 경험담과 사례 포함',
        '행동 유도 문구(CTA) 삽입',
        '댓글 유도 질문으로 마무리'
      ]
    },
    {
      title: '소셜미디어 연계',
      icon: <Groups />,
      color: '#003A87',
      tips: [
        '플랫폼별 최적 길이 고려',
        '해시태그 전략적 활용 (#지역명 #정책)',
        '시각적 요소(이미지, 인포그래픽) 추가',
        '포스팅 최적 시간대 활용',
        '크로스 포스팅으로 도달률 확대'
      ]
    }
  ];

  const contentTypes = [
    {
      type: '정책 제안서',
      description: '구체적인 정책 아이디어와 실행 방안을 제시',
      keywords: ['정책', '제안', '개선방안', '해결책'],
      example: '청년 주택 정책의 새로운 접근법'
    },
    {
      type: '현안 분석',
      description: '지역 이슈에 대한 깊이 있는 분석과 견해',
      keywords: ['분석', '현황', '문제점', '개선'],
      example: '지역 교통 체증 해결을 위한 종합 분석'
    },
    {
      type: '활동 보고',
      description: '의정활동이나 지역활동 결과 공유',
      keywords: ['보고', '성과', '활동', '결과'],
      example: '지역 복지센터 방문 및 주민 간담회 결과'
    },
    {
      type: '비전 제시',
      description: '미래 지역 발전 방향과 목표 제시',
      keywords: ['비전', '미래', '발전', '목표'],
      example: '2030 스마트 도시 구현을 위한 로드맵'
    }
  ];

  return (
    <DashboardLayout title="콘텐츠 작성 가이드라인">
      <Container maxWidth="xl">
        {/* 페이지 헤더 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            콘텐츠 작성 가이드라인
          </Typography>
          <Typography variant="body1" color="text.secondary">
            효과적인 정치 콘텐츠 작성을 위한 실용적인 팁과 전략을 제공합니다
          </Typography>
        </Box>

        {/* SEO 및 최적화 팁 */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
            <Campaign sx={{ mr: 1, color: 'primary.main' }} />
            SEO 및 콘텐츠 최적화 전략
          </Typography>
          
          <Grid container spacing={3}>
            {seoTips.map((section, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card sx={{ height: '100%', border: `2px solid ${section.color}20` }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ 
                        p: 1, 
                        borderRadius: 1, 
                        bgcolor: section.color, 
                        color: 'white', 
                        mr: 2 
                      }}>
                        {section.icon}
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {section.title}
                      </Typography>
                    </Box>
                    
                    <List dense>
                      {section.tips.map((tip, tipIndex) => (
                        <ListItem key={tipIndex} sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 24 }}>
                            <CheckCircleOutline sx={{ fontSize: 16, color: section.color }} />
                          </ListItemIcon>
                          <ListItemText 
                            primary={tip}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* 콘텐츠 유형별 가이드 */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
            <ArticleOutlined sx={{ mr: 1, color: 'primary.main' }} />
            콘텐츠 유형별 작성 가이드
          </Typography>
          
          <Grid container spacing={3}>
            {contentTypes.map((content, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
                      {content.type}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {content.description}
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        추천 키워드:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {content.keywords.map((keyword, kIndex) => (
                          <Chip 
                            key={kIndex}
                            label={keyword}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        ))}
                      </Box>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      예시 제목:
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      fontStyle: 'italic',
                      bgcolor: 'grey.50',
                      p: 1,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'grey.200'
                    }}>
                      "{content.example}"
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* 주의사항 및 팁 */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
            <LightbulbOutlined sx={{ mr: 1, color: 'primary.main' }} />
            작성 시 주의사항
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  선거법 준수 사항
                </Typography>
                <List dense>
                  <ListItem sx={{ py: 0 }}>
                    <ListItemText primary="과도한 자기 홍보 표현 지양" />
                  </ListItem>
                  <ListItem sx={{ py: 0 }}>
                    <ListItemText primary="직접적인 투표 요청 금지" />
                  </ListItem>
                  <ListItem sx={{ py: 0 }}>
                    <ListItemText primary="허위사실 유포 금지" />
                  </ListItem>
                  <ListItem sx={{ py: 0 }}>
                    <ListItemText primary="상대방 비방 금지" />
                  </ListItem>
                </List>
              </Alert>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Alert severity="success">
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  효과적인 콘텐츠 작성법
                </Typography>
                <List dense>
                  <ListItem sx={{ py: 0 }}>
                    <ListItemText primary="구체적인 데이터와 사례 활용" />
                  </ListItem>
                  <ListItem sx={{ py: 0 }}>
                    <ListItemText primary="주민의 실제 목소리 반영" />
                  </ListItem>
                  <ListItem sx={{ py: 0 }}>
                    <ListItemText primary="해결책 중심의 건설적 접근" />
                  </ListItem>
                  <ListItem sx={{ py: 0 }}>
                    <ListItemText primary="지역 특성을 고려한 맞춤 내용" />
                  </ListItem>
                </List>
              </Alert>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.50', borderRadius: 2, border: '1px solid', borderColor: 'primary.200' }}>
            <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
              💡 <strong>Pro Tip:</strong> AI 원고 생성 시 이러한 가이드라인을 참고자료로 활용하면 더욱 효과적인 콘텐츠를 생성할 수 있습니다.
              참고자료 입력란에 원하는 키워드나 방향성을 구체적으로 명시해보세요.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </DashboardLayout>
  );
};

export default GuidelinesPage;