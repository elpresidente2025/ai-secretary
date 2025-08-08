// src/pages/PostsListPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Stack,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { getFunctions, httpsCallable } from "firebase/functions";

// Functions 리전 고정
const functions = getFunctions(undefined, "asia-northeast3");

// 상태 → 칩 색상 매핑
const statusToChip = (status) => {
  switch ((status || "").toLowerCase()) {
    case "published":
      return <Chip label="published" color="success" size="small" />;
    case "scheduled":
      return <Chip label="scheduled" color="info" size="small" />;
    case "review":
      return <Chip label="review" color="warning" size="small" />;
    case "archived":
      return <Chip label="archived" color="default" size="small" />;
    case "draft":
    default:
      return <Chip label="draft" size="small" />;
  }
};

// HTML → 텍스트 변환 (복사용)
const htmlToText = (html) => {
  if (!html) return "";
  // 간단 파서: 태그 제거 + &nbsp; 등 디코딩
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const text = tmp.textContent || tmp.innerText || "";
  return text.replace(/\u00A0/g, " ").trim();
};

// 날짜 포맷
const fmt = (iso) => {
  try {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(
      2,
      "0"
    )}`;
  } catch {
    return "-";
  }
};

export default function PostsListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [snack, setSnack] = useState({ open: false, severity: "info", msg: "" });
  const [busyId, setBusyId] = useState(null);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const call = httpsCallable(functions, "getUserPosts");
      const { data } = await call();
      setRows(Array.isArray(data?.posts) ? data.posts : []);
    } catch (e) {
      console.error(e);
      setSnack({ open: true, severity: "error", msg: "목록을 불러오지 못했습니다." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleOpenViewer = (row) => {
    setCurrent(row);
    setViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setViewerOpen(false);
    setCurrent(null);
  };

  const handleCopy = async (row) => {
    try {
      const text = htmlToText(row?.content || "");
      await navigator.clipboard.writeText(text);
      setSnack({ open: true, severity: "success", msg: "본문을 클립보드에 복사했습니다." });
    } catch (e) {
      console.error(e);
      setSnack({ open: true, severity: "error", msg: "복사에 실패했습니다." });
    }
  };

  const handleDelete = async (row) => {
    if (!row?.id) return;
    const ok = window.confirm(`정말 삭제하시겠습니까?\n제목: ${row.title || "(제목 없음)"}`);
    if (!ok) return;

    setBusyId(row.id);
    try {
      const call = httpsCallable(functions, "deletePost");
      await call({ postId: row.id });
      setSnack({ open: true, severity: "success", msg: "삭제했습니다." });
      // 로컬 목록에서 제거
      setRows((prev) => prev.filter((p) => p.id !== row.id));
      if (current?.id === row.id) handleCloseViewer();
    } catch (e) {
      console.error(e);
      setSnack({ open: true, severity: "error", msg: "삭제에 실패했습니다." });
    } finally {
      setBusyId(null);
    }
  };

  const empty = useMemo(() => !loading && rows.length === 0, [loading, rows]);

  return (
    <Box sx={{ p: 0 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        포스트 목록
      </Typography>

      <Paper variant="outlined">
        {loading ? (
          <Box sx={{ p: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : empty ? (
          <Box sx={{ p: 6, textAlign: "center", color: "text.secondary" }}>
            등록된 원고가 없습니다.
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 56 }} />
                <TableCell>제목</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>작성</TableCell>
                <TableCell>수정</TableCell>
                <TableCell align="right" sx={{ width: 120 }}>
                  작업
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => handleOpenViewer(row)} // 👈 행 클릭으로 보기
                >
                  <TableCell>
                    {/* 썸네일 자리 비워둠 */}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 560 }}>
                    <Typography variant="body1" noWrap title={row.title || ""}>
                      {row.title || "제목 없음"}
                    </Typography>
                  </TableCell>
                  <TableCell>{statusToChip(row.status)}</TableCell>
                  <TableCell>{fmt(row.createdAt)}</TableCell>
                  <TableCell>{fmt(row.updatedAt)}</TableCell>
                  <TableCell
                    align="right"
                    onClick={(e) => e.stopPropagation()} // 행 클릭과 분리
                  >
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {/* 👇 보기(눈) 버튼 제거, 복사 + 삭제만 남김 */}
                      <Tooltip title="본문 복사">
                        <span>
                          <IconButton size="small" onClick={() => handleCopy(row)}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="삭제">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(row)}
                            disabled={busyId === row.id}
                          >
                            {busyId === row.id ? (
                              <CircularProgress size={18} />
                            ) : (
                              <DeleteOutlineIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* 읽기 전용 보기 다이얼로그 */}
      <Dialog open={viewerOpen} onClose={handleCloseViewer} fullWidth maxWidth="md">
        <DialogTitle>원고 보기</DialogTitle>
        <DialogContent dividers>
          {/* 안내 문구 */}
          <Alert severity="info" sx={{ mb: 2 }}>
            이 화면은 <strong>읽기 전용</strong>입니다. 내용을 수정하려면 아래 <b>복사</b> 버튼으로
            클립보드에 복사한 뒤, 메모장 등 외부 편집기에서 수정하세요.
          </Alert>

          <Typography variant="h6" sx={{ mb: 1 }}>
            {current?.title || "제목 없음"}
          </Typography>

          {/* 본문: HTML 그대로 표시 (읽기 전용) */}
          <Box
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              p: 2,
              minHeight: 200,
              "& img": { maxWidth: "100%" },
              "& p": { m: 0, mb: 1.2 },
            }}
            dangerouslySetInnerHTML={{ __html: current?.content || "<p>(내용 없음)</p>" }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewer}>닫기</Button>
          <Button
            variant="contained"
            onClick={() => current && handleCopy(current)}
            startIcon={<ContentCopyIcon />}
          >
            본문 복사
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={2200}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
