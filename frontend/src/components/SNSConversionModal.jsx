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
  Facebook,
  Instagram,
  Twitter,
  ContentCopy,
  Share,
  Close
} from '@mui/icons-material';
import { SvgIcon } from '@mui/material';
import { convertToSNS, getSNSUsage } from '../services/firebaseService';

// X (Twitter) 아이콘 컴포넌트
const XIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </SvgIcon>
);

// Threads 아이콘 컴포넌트  
const ThreadsIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M12.9 8.148c-.271-.083-.573-.129-.9-.129-1.326 0-2.4 1.074-2.4 2.4v3.162c0 1.326 1.074 2.4 2.4 2.4.327 0 .629-.046.9-.129a2.4 2.4 0 0 0-.9-4.633v-1.071c0-.663.537-1.2 1.2-1.2s1.2.537 1.2 1.2v3.162c0 2.649-2.151 4.8-4.8 4.8s-4.8-2.151-4.8-4.8v-3.162c0-2.649 2.151-4.8 4.8-4.8 1.326 0 2.523.538 3.394 1.409"/>
    <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/>
  </SvgIcon>
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

const PLATFORMS = {
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: '#1877f2',
    maxLength: 63206,
    recommendedLength: 63206  // 최대 한도 활용
  },
  instagram: {
    name: 'Instagram', 
    icon: Instagram,
    color: '#E4405F',
    maxLength: 2200,
    recommendedLength: 2200  // 최대 한도 활용
  },
  x: {
    name: 'X',
    icon: XIcon,
    color: '#000000',
    maxLength: 280,
    recommendedLength: 280  // 최대 한도 활용
  },
  threads: {
    name: 'Threads',
    icon: ThreadsIcon,
    color: '#000000',
    maxLength: 500,
    recommendedLength: 500  // 최대 한도 활용
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
            {/* 2x2 그리드로 플랫폼별 결과 표시 */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2,
              mb: 2
            }}>
              {Object.entries(results).map(([platform, result]) => {
                const platformConfig = PLATFORMS[platform];
                const PlatformIcon = platformConfig.icon;
                
                // 디버깅을 위한 로그
                console.log(`🔍 ${platform} result:`, result);
                
                const { content = '', hashtags = [] } = result || {};
                
                // hashtags가 배열인지 확인하고 아니면 빈 배열로 설정
                const validHashtags = Array.isArray(hashtags) ? hashtags : [];
                
                console.log(`✅ ${platform} parsed:`, { content: content?.substring(0, 50), hashtags: validHashtags });
                
                return (
                  <Paper key={platform} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                    {/* 플랫폼 헤더 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PlatformIcon sx={{ color: platformConfig.color, fontSize: 20 }} />
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

                    {/* 변환된 내용 */}
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        whiteSpace: 'pre-wrap', 
                        lineHeight: 1.5, 
                        mb: 1,
                        minHeight: '60px'
                      }}
                    >
                      {content}
                    </Typography>

                    {/* 글자수 표시 */}
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      {content.length}자 / {platformConfig.recommendedLength}자 한도
                    </Typography>

                    {/* 해시태그 */}
                    {validHashtags && validHashtags.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                        {validHashtags.map((hashtag, index) => (
                          <Chip 
                            key={index} 
                            label={hashtag} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        ))}
                      </Box>
                    )}
                  </Paper>
                );
              })}
            </Box>

            {copySuccess && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {copySuccess}
              </Alert>
            )}
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