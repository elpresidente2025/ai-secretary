// frontend/src/pages/GeneratePage.jsx

// React 및 UI 라이브러리에서 필요한 기능들을 가져옵니다.
import React, { Suspense, useEffect } from 'react';
import {
  Container,
  Alert,
  Snackbar,
  useTheme,
  useMediaQuery,
  Skeleton,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DashboardLayout from '../components/DashboardLayout';
import PromptForm from '../components/generate/PromptForm';
import GenerateActions from '../components/generate/GenerateActions';
// 기능별로 분리된 커스텀 훅(Hook)들을 가져옵니다.
import { useAuth } from '../hooks/useAuth';
import { useGenerateForm } from '../hooks/useGenerateForm';
import { useGenerateAPI } from '../hooks/useGenerateAPI';
// 폼에서 사용할 카테고리/세부 카테고리 목록 데이터를 가져옵니다.
import { CATEGORIES } from '../constants/formConstants';

// 🚀 성능 최적화를 위해 초안 그리드와 미리보기 패널은 필요할 때만 불러옵니다 (Lazy Loading).
const DraftGrid = React.lazy(() => import('../components/generate/DraftGrid'));
const PreviewPane = React.lazy(() => import('../components/generate/PreviewPane'));

const GeneratePage = () => {
  // --- 🎨 UI 및 사용자 상태 관리 ---
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // 화면 크기에 따라 모바일 여부 판단
  const { user } = useAuth(); // useAuth 훅을 통해 현재 로그인된 사용자 정보를 가져옴

  // --- 🧠 커스텀 훅을 통한 핵심 로직 분리 ---
  // 폼의 상태와 관련된 모든 로직을 useGenerateForm 훅이 전담합니다.
  const { formData, updateForm, resetForm, validateForm, canGenerate } = useGenerateForm();
  // API 통신과 관련된 모든 상태와 함수를 useGenerateAPI 훅이 전담합니다.
  const { 
    loading,      // 로딩 중인지 여부 (true/false)
    error,        // API 에러 메시지
    drafts,       // 생성된 원고 초안 목록
    attempts,     // 현재 생성 시도 횟수
    maxAttempts,  // 최대 생성 시도 횟수
    generate,     // 원고 생성 API 호출 함수
    reset,        // API 상태 초기화 함수
    save,         // 원고 저장 API 호출 함수
    preloadFirebase // Firebase 연결을 미리 준비하는 함수
  } = useGenerateAPI();

  // --- 📢 사용자 피드백(알림창) 상태 관리 ---
  const [snackbar, setSnackbar] = React.useState({
    open: false,      // 스낵바가 열려있는지 여부
    message: '',      // 보여줄 메시지 내용
    severity: 'info'  // 메시지 종류 (success, error, info, warning)
  });

  // --- 👁️ 미리보기 상태 관리 ---
  const [selectedDraft, setSelectedDraft] = React.useState(null); // 사용자가 선택한 초안

  // 🔥 성능 최적화: Firebase 연결을 미리 준비하여 API 호출 속도를 개선합니다.
  useEffect(() => {
    preloadFirebase(formData);
  }, [formData, preloadFirebase]);
  
  // 💧 UX 개선: 메인 카테고리가 변경되면 세부 카테고리 선택값을 자동으로 초기화합니다.
  useEffect(() => {
    if (formData.category) {
      updateForm({ subCategory: '' });
    }
  }, [formData.category, updateForm]);

  // --- 🔒 사용자 인증 확인 ---
  // 사용자 정보가 없으면 페이지 내용을 보여주지 않고 에러 메시지를 표시합니다.
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

  // --- 헨들러 함수 (사용자 이벤트 처리) ---

  /** 원고 생성 버튼 클릭 시 실행되는 함수 */
  const handleGenerate = async () => {
    // 1. 폼 데이터 유효성 검사 (예: 주제가 비어있는지)
    const validation = validateForm();
    if (!validation.isValid) {
      // 유효하지 않으면 에러 스낵바를 띄움
      setSnackbar({ open: true, message: validation.error, severity: 'error' });
      return;
    }

    // 2. 유효하면 API 호출
    const result = await generate(formData);

    // 3. API 결과에 따라 성공 또는 실패 스낵바를 띄움
    if (result.success) {
      setSnackbar({ open: true, message: result.message, severity: 'success' });
    } else {
      setSnackbar({ open: true, message: result.error, severity: 'error' });
    }
  };

  /** 초기화 버튼 클릭 시 실행되는 함수 */
  const handleReset = () => {
    resetForm();        // 폼 데이터 초기화
    reset();            // API 관련 상태(초안, 에러 등) 초기화
    setSelectedDraft(null); // 선택된 초안 초기화
  };

  /** 초안 저장 버튼 클릭 시 실행되는 함수 */
  const handleSave = async (draft) => {
    try {
      console.log('💾 저장 시작:', draft.title);
      const result = await save(draft);
      console.log('💾 저장 결과:', result);
      
      // 저장 API 결과에 따라 스낵바를 띄움
      if (result.success) {
        setSnackbar({ open: true, message: result.message || '원고가 저장되었습니다.', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: result.error || '저장에 실패했습니다.', severity: 'error' });
      }
    } catch (error) {
      console.error('💾 저장 핸들러 오류:', error);
      setSnackbar({ open: true, message: '저장 처리 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  /** 스낵바를 닫는 함수 */
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // '생성하기' 버튼을 활성화할지 최종적으로 결정하는 변수
  const finalCanGenerate = canGenerate && attempts < maxAttempts && !loading;

  // --- 🖥️ 화면 렌더링 ---
  return (
    <DashboardLayout title={isMobile ? "새 원고 생성" : "AI 원고 생성"}>
      <Container maxWidth="xl">
        {/* API 에러가 있을 경우, 화면 상단에 에러 메시지를 보여줌 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* 입력 폼 컴포넌트 */}
        <PromptForm
          formData={formData}
          onChange={updateForm} // 폼 데이터가 변경될 때 호출될 함수
          disabled={loading}     // 로딩 중일 때는 입력 비활성화
          categories={CATEGORIES}
          isMobile={isMobile}
        />

        {/* 생성/초기화 버튼 컴포넌트 */}
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

        {/* 초안 그리드 (Lazy Loading 적용) */}
        <Suspense fallback={
          // 로딩 중일 때 보여줄 UI (스켈레톤)
          <Box sx={{ py: 2 }}>
            <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' } }}>
              <Skeleton variant="rectangular" height={300} />
              <Skeleton variant="rectangular" height={300} />
              <Skeleton variant="rectangular" height={300} />
            </Box>
          </Box>
        }>
          <DraftGrid
            items={drafts}
            onSelect={setSelectedDraft} // 초안 선택 시 호출될 함수
            onSave={handleSave}         // 초안 저장 시 호출될 함수
            maxAttempts={maxAttempts}
            isMobile={isMobile}
          />
        </Suspense>

        {/* 미리보기 다이얼로그 (팝업) */}
        <Dialog
          open={!!selectedDraft}
          onClose={() => setSelectedDraft(null)}
          fullWidth
          maxWidth="md"
          aria-labelledby="preview-dialog-title"
        >
          <DialogTitle id="preview-dialog-title">
            원고 미리보기
            <IconButton
              aria-label="close"
              onClick={() => setSelectedDraft(null)}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {selectedDraft && (
              <Suspense fallback={
                <Box>
                  <Skeleton variant="text" width={150} height={32} sx={{ mb: 2 }} />
                  <Skeleton variant="rectangular" height={400} />
                </Box>
              }>
                <PreviewPane draft={selectedDraft} />
              </Suspense>
            )}
          </DialogContent>
        </Dialog>
      </Container>

      {/* 알림 메시지를 보여주는 스낵바 컴포넌트 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000} // 6초 후에 자동으로 닫힘
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