// frontend/src/components/SNSConversionModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ContentCopy,
  Share,
  Close
} from '@mui/icons-material';
import { convertToSNS, getSNSUsage, testSNS } from '../services/firebaseService';

// SNS 아이콘 컴포넌트 (이미지 사용)
const SNSIcon = ({ src, alt, size = 20 }) => (
  <img 
    src={src} 
    alt={alt}
    style={{ 
      width: size, 
      height: size, 
      objectFit: 'contain'
    }}
  />
);

// HTML을 평범한 텍스트로 변환하는 유틸리티 함수
function convertHtmlToFormattedText(html = '') {
  try {
    if (!html) return '';
    
    // 임시 div 엘리먼트 생성
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // HTML 태그를 텍스트로 변환하면서 formatting 보존
    let text = tempDiv.innerHTML;
    
    // 블록 요소들을 줄바꿈으로 변환
    text = text.replace(/<\/?(h[1-6]|p|div|br|li)[^>]*>/gi, '\n');
    text = text.replace(/<\/?(ul|ol)[^>]*>/gi, '\n\n');
    
    // 나머지 HTML 태그 제거
    text = text.replace(/<[^>]*>/g, '');
    
    // HTML 엔티티 변환
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    
    // 연속된 줄바꿈을 정리 (3개 이상을 2개로)
    text = text.replace(/\n{3,}/g, '\n\n');
    
    // 앞뒤 공백 제거
    return text.trim();
  } catch {
    return html || '';
  }
}

// 공백 제외 글자수 계산 (Java 코드와 동일한 로직)
function countWithoutSpace(str) {
  if (!str) return 0;
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (!/\s/.test(str.charAt(i))) { // 공백 문자가 아닌 경우
      count++;
    }
  }
  return count;
}

const PLATFORMS = {
  'facebook-instagram': {
    name: 'Facebook + Instagram',
    iconSrc: '/icons/icon-facebook.png', // Facebook 아이콘 (대표)
    instagramIconSrc: '/icons/icon-instagram.png',
    color: '#1877f2',
    maxLength: 1800,
    recommendedLength: 1800
  },
  x: {
    name: 'X',
    iconSrc: '/icons/icon-X.png',
    color: '#000000',
    maxLength: 230,
    recommendedLength: 230
  },
  threads: {
    name: 'Threads',
    iconSrc: '/icons/icon-threads.png',
    color: '#000000',
    maxLength: 400,
    recommendedLength: 400
  }
};


function SNSConversionModal({ open, onClose, post }) {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState(null);
  const [copySuccess, setCopySuccess] = useState('');

  // 사용량 정보 조회
  useEffect(() => {
    if (open) {
      fetchUsage();
    }
  }, [open]);

  const fetchUsage = async () => {
    try {
      const result = await getSNSUsage();
      setUsage(result);
    } catch (err) {
      console.error('SNS 사용량 조회 실패:', err);
    }
  };

  const handleConvert = async () => {
    if (!post?.id) {
      setError('원고 정보가 없습니다.');
      return;
    }

    setLoading(true);
    setError('');
    setResults({});

    try {
      console.log('🔍 post 객체 전체:', post);
      console.log('🔍 post.id:', post.id, 'typeof:', typeof post.id);
      
      if (!post || !post.id) {
        throw new Error(`post 또는 post.id가 없습니다: ${JSON.stringify(post)}`);
      }
      
      // testSNS 함수 먼저 테스트
      console.log('🧪 testSNS 함수 테스트 중...');
      try {
        const testResult = await testSNS();
        console.log('✅ testSNS 성공:', testResult);
      } catch (testError) {
        console.error('❌ testSNS 실패:', testError);
        throw new Error(`SNS 함수 테스트 실패: ${testError.message}`);
      }
      
      const result = await convertToSNS(post.id);
      
      console.log('🔍 SNS 변환 결과:', result);
      console.log('🔍 result.results:', result.results);
      console.log('🔍 결과 키들:', Object.keys(result.results || {}));
      
      // 각 플랫폼 결과 상세 확인
      Object.entries(result.results || {}).forEach(([platform, data]) => {
        console.log(`📱 ${platform}:`, {
          content: data?.content || 'EMPTY',
          contentLength: data?.content?.length || 0,
          hashtags: data?.hashtags || [],
          hashtagCount: data?.hashtags?.length || 0
        });
      });
      
      setResults(result.results);
      
      // 사용량 정보 갱신
      await fetchUsage();
      
    } catch (err) {
      console.error('SNS 변환 실패:', err);
      setError(err.message || 'SNS 변환에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess('복사되었습니다!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  const handleClose = () => {
    setResults({});
    setError('');
    setCopySuccess('');
    onClose();
  };

  const canConvert = usage?.isActive;
  const hasResults = Object.keys(results).length > 0;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Share color="primary" />
          <Typography variant="h6">SNS 변환</Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {/* 접근 권한 정보 */}
        {usage && (
          <Alert 
            severity={canConvert ? "success" : "warning"} 
            sx={{ mb: 2 }}
          >
            {canConvert ? (
              <Typography variant="body2">
                <strong>SNS 변환 사용 가능</strong>
                {usage.accessMethod === 'paid' && ' (애드온 구매)'}
                {usage.accessMethod === 'gamification' && ' (조건 달성)'}
                {usage.accessMethod === 'admin' && ' (관리자)'}
              </Typography>
            ) : (
              <Typography variant="body2" color="error">
                SNS 변환을 사용하려면 애드온을 구매하거나 게이미피케이션 조건을 달성해주세요.
              </Typography>
            )}
          </Alert>
        )}

        {/* 원본 원고 미리보기 */}
        <Typography variant="h6" sx={{ mb: 1 }}>원본 원고</Typography>
        <Paper sx={{ p: 2, mb: 3, maxHeight: '150px', overflow: 'auto', bgcolor: 'grey.50' }}>
          <Typography variant="body2" color="text.secondary">
            {post?.title && <><strong>제목: {post.title}</strong><br /><br /></>}
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              mt: 1, 
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6
            }}
          >
            {convertHtmlToFormattedText(post?.content)?.substring(0, 300)}
            {convertHtmlToFormattedText(post?.content)?.length > 300 && '...'}
          </Typography>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* SNS 변환 결과 */}
        {hasResults && (
          <Box>
            {/* 1x3 그리드로 플랫폼별 결과 표시 */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 2,
              mb: 2
            }}>
              {Object.entries(results).map(([platform, result]) => {
                const platformConfig = PLATFORMS[platform];
                
                // 디버깅을 위한 로그
                console.log(`🔍 ${platform} result:`, result);
                
                const { content = '', hashtags = [] } = result || {};
                
                // hashtags가 배열인지 확인하고 문자열이면 파싱
                let validHashtags = [];
                if (Array.isArray(hashtags)) {
                  validHashtags = hashtags;
                } else if (typeof hashtags === 'string' && hashtags.trim()) {
                  // 문자열을 콤마로 분리하여 배열로 변환
                  validHashtags = hashtags.split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag.length > 0)
                    .map(tag => tag.startsWith('#') ? tag : `#${tag}`);
                } else {
                  validHashtags = [];
                }
                
                console.log(`✅ ${platform} parsed:`, { content: content?.substring(0, 50), hashtags: validHashtags });
                
                return (
                  <Paper key={platform} sx={{ 
                    p: 2, 
                    border: '1px solid', 
                    borderColor: 'divider',
                    height: '320px', // 고정 높이 설정
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {/* 플랫폼 헤더 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexShrink: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {platform === 'facebook-instagram' ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <SNSIcon src={platformConfig.iconSrc} alt="Facebook" size={18} />
                            <SNSIcon src={platformConfig.instagramIconSrc} alt="Instagram" size={18} />
                          </Box>
                        ) : (
                          <SNSIcon src={platformConfig.iconSrc} alt={platformConfig.name} size={20} />
                        )}
                        <Typography variant="subtitle1" fontWeight="bold">
                          {platformConfig.name}
                        </Typography>
                      </Box>
                      <Tooltip title="전체 복사하기">
                        <IconButton 
                          size="small" 
                          onClick={() => handleCopy(content + (hashtags?.length > 0 ? '\n\n' + hashtags.join(' ') : ''))}
                        >
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    {/* 스크롤 가능한 변환된 내용 영역 */}
                    <Box sx={{ 
                      flexGrow: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden'
                    }}>
                      <Box
                        sx={{
                          flexGrow: 1,
                          overflowY: 'auto',
                          p: 1.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          backgroundColor: 'grey.50',
                          mb: 1,
                          '&::-webkit-scrollbar': {
                            width: '6px',
                          },
                          '&::-webkit-scrollbar-track': {
                            backgroundColor: 'transparent',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            backgroundColor: 'grey.400',
                            borderRadius: '3px',
                          },
                          '&::-webkit-scrollbar-thumb:hover': {
                            backgroundColor: 'grey.600',
                          }
                        }}
                      >
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            whiteSpace: 'pre-wrap', 
                            lineHeight: 1.6,
                            fontSize: '0.875rem',
                            color: 'text.primary'
                          }}
                        >
                          {content}
                        </Typography>
                      </Box>

                      {/* 글자수 표시 (고정 위치) */}
                      <Typography variant="caption" color="text.secondary" sx={{ 
                        display: 'block', 
                        mb: 1, 
                        flexShrink: 0,
                        textAlign: 'right'
                      }}>
                        {countWithoutSpace(content)}자 / {platformConfig.recommendedLength}자 한도 (공백 제외)
                      </Typography>
                    </Box>

                    {/* 해시태그 (하단 고정) */}
                    <Box sx={{ flexShrink: 0, minHeight: '32px', display: 'flex', alignItems: 'flex-start' }}>
                      {validHashtags && validHashtags.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, width: '100%' }}>
                          {validHashtags.map((hashtag, index) => (
                            <Chip 
                              key={index} 
                              label={hashtag} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 24 }}
                            />
                          ))}
                        </Box>
                      ) : (
                        <Box sx={{ height: '24px' }} /> // 해시태그 없을 때 공간 확보
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Box>

            {copySuccess && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {copySuccess}
              </Alert>
            )}

            {/* 아이콘 출처 표시 */}
            <Box sx={{ mt: 3, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                SNS 아이콘 ⓒ{' '}
                <a 
                  href="https://www.flaticon.com/kr/free-icons/" 
                  title="SNS 아이콘"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    color: '#666', 
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                >
                  Freepik - Flaticon
                </a>
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose}>닫기</Button>
        {!hasResults && (
          <Button
            variant="contained"
            onClick={handleConvert}
            disabled={loading || !canConvert}
            startIcon={loading ? <CircularProgress size={20} /> : <Share />}
          >
            {loading ? '모든 플랫폼 변환 중...' : '모든 SNS 플랫폼으로 변환'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default SNSConversionModal;