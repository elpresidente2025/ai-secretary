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
  LinkedIn,
  ContentCopy,
  Share,
  Close
} from '@mui/icons-material';
import { convertToSNS, getSNSUsage } from '../services/firebaseService';

const PLATFORMS = {
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: '#1877f2',
    maxLength: 63206,
    recommendedLength: 400
  },
  instagram: {
    name: 'Instagram', 
    icon: Instagram,
    color: '#E4405F',
    maxLength: 2200,
    recommendedLength: 150
  },
  twitter: {
    name: 'Twitter',
    icon: Twitter,
    color: '#1DA1F2',
    maxLength: 280,
    recommendedLength: 280
  },
  linkedin: {
    name: 'LinkedIn',
    icon: LinkedIn,
    color: '#0A66C2',
    maxLength: 3000,
    recommendedLength: 300
  }
};

const TONES = {
  friendly: {
    name: '친근한',
    description: '대화하는 듯한 친근한 톤'
  },
  professional: {
    name: '전문적인',
    description: '신뢰할 수 있는 전문적인 톤'
  },
  energetic: {
    name: '활기찬',
    description: '열정적이고 에너지 넘치는 톤'
  },
  informative: {
    name: '정보전달',
    description: '정보 전달에 집중한 중립적인 톤'
  }
};

function SNSConversionModal({ open, onClose, post }) {
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [selectedTone, setSelectedTone] = useState('friendly');
  const [convertedContent, setConvertedContent] = useState('');
  const [hashtags, setHashtags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
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
    setConvertedContent('');
    setHashtags([]);

    try {
      const result = await convertToSNS(post.id, selectedPlatform, selectedTone);
      
      setConvertedContent(result.convertedContent);
      setHashtags(result.hashtags || []);
      setTabValue(1); // 결과 탭으로 이동
      
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
    setConvertedContent('');
    setHashtags([]);
    setError('');
    setTabValue(0);
    setCopySuccess('');
    onClose();
  };

  const canConvert = usage?.isActive && usage?.usageLeft > 0;
  const platformConfig = PLATFORMS[selectedPlatform];
  const PlatformIcon = platformConfig.icon;

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
        {/* 사용량 정보 */}
        {usage && (
          <Alert 
            severity={canConvert ? "info" : "warning"} 
            sx={{ mb: 2 }}
          >
            <Typography variant="body2">
              <strong>이번 달 사용량:</strong> {usage.thisMonthUsage}/{usage.monthlyLimit}회 
              ({usage.usageLeft}회 남음)
            </Typography>
            {!usage.isActive && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                SNS 애드온을 구매해주세요. (월 22,000원)
              </Typography>
            )}
          </Alert>
        )}

        {/* 탭 네비게이션 */}
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
          <Tab label="변환 설정" />
          <Tab label="변환 결과" disabled={!convertedContent} />
        </Tabs>

        {/* 설정 탭 */}
        {tabValue === 0 && (
          <Box>
            {/* 원본 원고 미리보기 */}
            <Typography variant="h6" sx={{ mb: 1 }}>원본 원고</Typography>
            <Paper sx={{ p: 2, mb: 3, maxHeight: '150px', overflow: 'auto', bgcolor: 'grey.50' }}>
              <Typography variant="body2" color="text.secondary">
                {post?.title && <strong>{post.title}</strong>}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {post?.content?.substring(0, 300)}
                {post?.content?.length > 300 && '...'}
              </Typography>
            </Paper>

            {/* 플랫폼 선택 */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>플랫폼</InputLabel>
              <Select
                value={selectedPlatform}
                label="플랫폼"
                onChange={(e) => setSelectedPlatform(e.target.value)}
              >
                {Object.entries(PLATFORMS).map(([key, platform]) => {
                  const Icon = platform.icon;
                  return (
                    <MenuItem key={key} value={key}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Icon sx={{ color: platform.color, fontSize: 20 }} />
                        <span>{platform.name}</span>
                        <Typography variant="caption" color="text.secondary">
                          (권장: {platform.recommendedLength}자)
                        </Typography>
                      </Box>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {/* 톤 선택 */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>톤</InputLabel>
              <Select
                value={selectedTone}
                label="톤"
                onChange={(e) => setSelectedTone(e.target.value)}
              >
                {Object.entries(TONES).map(([key, tone]) => (
                  <MenuItem key={key} value={key}>
                    <Box>
                      <Typography variant="body2">{tone.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {tone.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        )}

        {/* 결과 탭 */}
        {tabValue === 1 && convertedContent && (
          <Box>
            {/* 플랫폼 정보 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PlatformIcon sx={{ color: platformConfig.color, fontSize: 24 }} />
              <Typography variant="h6">{platformConfig.name} 변환 결과</Typography>
            </Box>

            {/* 변환된 내용 */}
            <Paper sx={{ p: 2, mb: 2, position: 'relative' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography variant="subtitle2" color="primary">변환된 게시물</Typography>
                <Tooltip title="복사하기">
                  <IconButton 
                    size="small" 
                    onClick={() => handleCopy(convertedContent)}
                  >
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {convertedContent}
              </Typography>
              
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {convertedContent.length}자 / {platformConfig.recommendedLength}자 권장
              </Typography>
            </Paper>

            {/* 해시태그 */}
            {hashtags.length > 0 && (
              <Paper sx={{ p: 2, mb: 2, position: 'relative' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="subtitle2" color="primary">해시태그</Typography>
                  <Tooltip title="해시태그 복사하기">
                    <IconButton 
                      size="small" 
                      onClick={() => handleCopy(hashtags.join(' '))}
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {hashtags.map((hashtag, index) => (
                    <Chip 
                      key={index} 
                      label={hashtag} 
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                    />
                  ))}
                </Box>
              </Paper>
            )}

            {/* 전체 복사 */}
            <Paper sx={{ p: 2, bgcolor: 'action.hover' }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>전체 내용 (게시물 + 해시태그)</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {convertedContent}
                {hashtags.length > 0 && '\n\n' + hashtags.join(' ')}
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<ContentCopy />}
                onClick={() => handleCopy(convertedContent + (hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : ''))}
                size="small"
              >
                전체 복사하기
              </Button>
            </Paper>

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
        {tabValue === 0 && (
          <Button
            variant="contained"
            onClick={handleConvert}
            disabled={loading || !canConvert}
            startIcon={loading ? <CircularProgress size={20} /> : <PlatformIcon />}
          >
            {loading ? '변환 중...' : `${platformConfig.name}으로 변환`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default SNSConversionModal;