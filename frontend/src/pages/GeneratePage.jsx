// frontend/src/pages/GeneratePage.jsx
import React, { Suspense, useEffect } from 'react';
import {
  Container,
  Alert,
  Snackbar,
  useTheme,
  useMediaQuery,
  Skeleton,
  Box
} from '@mui/material';
import DashboardLayout from '../components/DashboardLayout';
import PromptForm from '../components/generate/PromptForm';
import GenerateActions from '../components/generate/GenerateActions';
import { useAuth } from '../hooks/useAuth';
import { useGenerateForm } from '../hooks/useGenerateForm';
import { useGenerateAPI } from '../hooks/useGenerateAPI';
import { CATEGORIES } from '../constants/formConstants';

// 🚀 조건부 lazy loading
const DraftGrid = React.lazy(() => import('../components/generate/DraftGrid'));
const PreviewPane = React.lazy(() => import('../components/generate/PreviewPane'));

const GeneratePage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  
  // 커스텀 훅들
  const { formData, updateForm, resetForm, validateForm, canGenerate } = useGenerateForm();
  const { 
    loading, 
    error, 
    drafts, 
    attempts, 
    maxAttempts, 
    generate, 
    reset, 
    save,
    preloadFirebase 
  } = useGenerateAPI();

  const [snackbar, setSnackbar] = React.useState({
    open: false,
    message: '',
    severity: 'info'
  });

  const [selectedDraft, setSelectedDraft] = React.useState(null);

  // 🔥 Firebase 예열
  useEffect(() => {
    preloadFirebase(formData);
  }, [formData, preloadFirebase]);

  // 카테고리 변경 시 세부 카테고리 초기화
  useEffect(() => {
    if (formData.category) {
      updateForm({ subCategory: '' });
    }
  }, [formData.category, updateForm]);

  // 사용자 인증 확인
  if (!user?.uid) {
    return (
      <DashboardLayout title="원고 생성">
        <Container maxWidth="xl">
          <Alert severity="error">
            사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.
          </Alert>
        </Container>
      </DashboardLayout>
    );
  }

  // 원고 생성 핸들러
  const handleGenerate = async () => {
    const validation = validateForm();
    if (!validation.isValid) {
      setSnackbar({
        open: true,
        message: validation.error,
        severity: 'error'
      });
      return;
    }

    const result = await generate(formData);
    if (result.success) {
      setSnackbar({
        open: true,
        message: result.message,
        severity: 'success'
      });
    } else {
      setSnackbar({
        open: true,
        message: result.error,
        severity: 'error'
      });
    }
  };

  // 초기화 핸들러
  const handleReset = () => {
    resetForm();
    reset();
    setSelectedDraft(null);
  };

  // 저장 핸들러 수정
  const handleSave = async (draft) => {
    try {
      console.log('💾 저장 시작:', draft.title);
      
      const result = await save(draft);
      
      console.log('💾 저장 결과:', result);
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: result.message || '원고가 저장되었습니다.', // 기본값 보장
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: result.error || '저장에 실패했습니다.', // 기본값 보장
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('💾 저장 핸들러 오류:', error);
      setSnackbar({
        open: true,
        message: '저장 처리 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };

  // 스낵바 닫기
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const finalCanGenerate = canGenerate && attempts < maxAttempts && !loading;

  return (
    <DashboardLayout title={isMobile ? "새 원고 생성" : "AI 원고 생성"}>
      <Container maxWidth="xl">
        {/* 에러 표시 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* 폼 영역 - 정적 로드 */}
        <PromptForm
          formData={formData}
          onChange={updateForm}
          disabled={loading}
          categories={CATEGORIES}
          isMobile={isMobile}
        />

        {/* 액션 버튼들 - 정적 로드 */}
        <GenerateActions
          onGenerate={handleGenerate}
          onReset={handleReset}
          loading={loading}
          canGenerate={finalCanGenerate}
          attempts={attempts}
          maxAttempts={maxAttempts}
          drafts={drafts}
          isMobile={isMobile}
        />

        {/* 결과 그리드 - 조건부 lazy 로딩 */}
        <Suspense fallback={
          <Box sx={{ py: 2 }}>
            <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />
            <Box sx={{ 
              display: 'grid', 
              gap: 2, 
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' } 
            }}>
              <Skeleton variant="rectangular" height={300} />
              <Skeleton variant="rectangular" height={300} />
              <Skeleton variant="rectangular" height={300} />
            </Box>
          </Box>
        }>
          <DraftGrid
            items={drafts}
            onSelect={setSelectedDraft}
            onSave={handleSave}
            maxAttempts={maxAttempts}
            isMobile={isMobile}
          />
        </Suspense>

        {/* 미리보기 패널 - 조건부 lazy 로딩 */}
        {selectedDraft && (
          <Suspense fallback={
            <Box sx={{ mt: 3 }}>
              <Skeleton variant="text" width={150} height={32} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" height={300} />
            </Box>
          }>
            <PreviewPane draft={selectedDraft} />
          </Suspense>
        )}
      </Container>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
};

export default GeneratePage;