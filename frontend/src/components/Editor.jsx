import React, { useState, useEffect } from 'react';
import { Box, Button, Paper, Typography, CircularProgress, Alert } from '@mui/material';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import apiClient from '../services/api';

const Editor = ({ initialContent, postId }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ message: '', severity: 'success' });

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    editable: true,
  });

  // initialContent가 변경될 때 에디터 내용을 업데이트합니다.
  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent);
    }
  }, [initialContent, editor]);

  const handleSave = async () => {
    if (!postId || !editor) return;

    setIsSaving(true);
    setSaveStatus({ message: '', severity: 'info' });
    try {
      await apiClient.put(`/posts/${postId}`, { content: editor.getHTML() });
      setSaveStatus({ message: '성공적으로 저장되었습니다.', severity: 'success' });
    } catch (error) {
      console.error('포스트 저장 중 오류 발생:', error);
      setSaveStatus({ message: error.response?.data?.error || '저장에 실패했습니다.', severity: 'error' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus({ message: '', severity: 'success' }), 3000);
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        원고 편집
      </Typography>
      <Box sx={{ border: '1px solid #ccc', borderRadius: 1, p: 1, minHeight: 400, mb: 2, '& .ProseMirror': { minHeight: '400px' } }}>
        <EditorContent editor={editor} />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
        {saveStatus.message && <Alert severity={saveStatus.severity} sx={{ py: 0.5 }}>{saveStatus.message}</Alert>}
        {postId && (
          <Button variant="contained" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <CircularProgress size={24} color="inherit" /> : '원고 저장'}
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default Editor;