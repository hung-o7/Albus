import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Chip,
  Tooltip,
  Snackbar,
  Alert,
  Skeleton,
  Button,
  Divider,
  Tab,
  Tabs,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Stack,
  CircularProgress,
  TextField,
} from "@mui/material";
import {
  ContentCopy as CopyIcon,
  ArrowBack as BackIcon,
  PersonRemove as RemoveIcon,
  People as PeopleIcon,
  CloudUpload as UploadIcon,
  AutoAwesome as AIIcon,
  Chat as ChatIcon,
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/context/AuthContext";
import { classroomService } from "@/services/classroomService";
import { materialService, Material } from "@/services/materialService";
import { chatService, ChatMessage } from "@/services/chatService";
import { readingService } from "@/services/readingService";
import { ClassroomDetail, ReadingAssignment, ReadingAttempt } from "@/types";
import { getInitials } from "@/utils/helpers";
import ChatInterface from "@/components/chat/ChatInterface";
import ReadingAssessment from "@/components/reading/ReadingAssessment";

const USE_MOCK = import.meta.env.VITE_MOCK === "true";

// ── Tab panel helper ──────────────────────────────────────────
function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return (
    <Box hidden={value !== index} sx={{ pt: 3 }}>
      {value === index && children}
    </Box>
  );
}

// ── File type chip colours ────────────────────────────────────
function FileTypeChip({ type }: { type: string }) {
  const colors: Record<string, string> = { pdf: '#e53935', docx: '#1565c0', pptx: '#e65100' };
  return (
    <Chip
      label={type.toUpperCase()}
      size="small"
      sx={{ bgcolor: colors[type] || '#555', color: 'white', fontWeight: 700, fontSize: '0.65rem', height: 20 }}
    />
  );
}

// ── Teacher upload panel ──────────────────────────────────────
function TeacherMaterialsPanel({ classroomId }: { classroomId: string }) {
  const [weekNumber, setWeekNumber] = useState(1);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [weeksWithAI, setWeeksWithAI] = useState<number[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMaterials = useCallback(async () => {
    if (USE_MOCK) return;
    try {
      const data = await materialService.getMaterials(classroomId);
      setMaterials(data.materials);
      setWeeksWithAI(data.weeksWithAI);
    } catch {
      // silently ignore — backend may not be running
    }
  }, [classroomId]);

  useEffect(() => { loadMaterials(); }, [loadMaterials]);

  const handleFiles = async (files: File[]) => {
    const allowed = files.filter(f => /\.(pdf|docx|pptx)$/i.test(f.name));
    if (allowed.length === 0) {
      setUploadError("Only PDF, DOCX, and PPTX files are accepted.");
      return;
    }
    setUploading(true);
    setUploadMsg("");
    setUploadError("");
    try {
      const result = await materialService.uploadMaterials(classroomId, weekNumber, allowed);
      setUploadMsg(result.message);
      await loadMaterials();
    } catch (err: any) {
      setUploadError(err?.response?.data?.message || "Upload failed. Make sure the backend is running.");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    e.target.value = "";
  };

  const handleDelete = async (materialId: string) => {
    setDeletingId(materialId);
    try {
      await materialService.deleteMaterial(classroomId, materialId);
      await loadMaterials();
    } catch {
      // silently ignore
    } finally {
      setDeletingId(null);
    }
  };

  // Group materials by week
  const byWeek: Record<number, Material[]> = {};
  materials.forEach(m => {
    if (!byWeek[m.weekNumber]) byWeek[m.weekNumber] = [];
    byWeek[m.weekNumber].push(m);
  });

  if (USE_MOCK) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <AIIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
        <Typography color="text.secondary">
          File upload requires the real backend. Set <code>VITE_MOCK=false</code> in <code>.env</code> and start the backend with <code>npm run dev</code> inside the <code>backend/</code> folder.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Info banner */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: '#f0faf4', border: '1px solid #a5d6b7' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <AIIcon sx={{ color: '#1a6b4a', mt: 0.2 }} />
          <Box>
            <Typography variant="subtitle2" sx={{ color: '#1a6b4a', fontWeight: 700 }}>
              How it works
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload this week's materials (slides, worksheets, notes) and Albus will study them to help your students learn — without giving away homework answers!
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Week selector + upload */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Week</InputLabel>
          <Select value={weekNumber} label="Week" onChange={e => setWeekNumber(Number(e.target.value))}>
            {Array.from({ length: 52 }, (_, i) => i + 1).map(w => (
              <MenuItem key={w} value={w}>
                Week {w} {weeksWithAI.includes(w) ? '✓' : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          sx={{
            flex: 1,
            minWidth: 240,
            border: `2px dashed ${dragOver ? '#1a6b4a' : '#c5d8cc'}`,
            borderRadius: 2,
            p: 3,
            textAlign: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            bgcolor: dragOver ? '#f0faf4' : 'transparent',
            transition: 'all 0.2s',
            '&:hover': { borderColor: '#1a6b4a', bgcolor: '#f0faf4' },
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            hidden
            multiple
            accept=".pdf,.docx,.pptx"
            onChange={onFileInputChange}
          />
          <UploadIcon sx={{ fontSize: 36, color: '#1a6b4a', mb: 0.5 }} />
          <Typography variant="body2" fontWeight={600}>
            {uploading ? 'Uploading…' : 'Drop files here or click to browse'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            PDF, DOCX, PPTX — up to 50 MB each
          </Typography>
          {uploading && <LinearProgress sx={{ mt: 1, borderRadius: 1 }} />}
        </Box>
      </Box>

      {uploadMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setUploadMsg("")}>{uploadMsg}</Alert>}
      {uploadError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUploadError("")}>{uploadError}</Alert>}

      {/* Uploaded files by week */}
      {Object.keys(byWeek).length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
          No materials uploaded yet. Upload your first file above!
        </Typography>
      ) : (
        Object.entries(byWeek)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([week, files]) => (
            <Box key={week} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>Week {week}</Typography>
                {weeksWithAI.includes(Number(week)) && (
                  <Chip icon={<AIIcon />} label="Albus ready" size="small" color="success" variant="outlined" />
                )}
              </Box>
              <Stack spacing={1}>
                {files.map(f => (
                  <Paper key={f.id} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <FileIcon sx={{ color: 'text.secondary' }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap fontWeight={500}>{f.originalName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(f.uploadedAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <FileTypeChip type={f.fileType} />
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        disabled={deletingId === f.id}
                        onClick={() => handleDelete(f.id)}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Paper>
                ))}
              </Stack>
            </Box>
          ))
      )}
    </Box>
  );
}

// ── Student chat panel ────────────────────────────────────────
function StudentChatPanel({ classroomId, classroomName }: { classroomId: string; classroomName: string }) {
  const [weekNumber, setWeekNumber] = useState(1);
  const [weeksWithAI, setWeeksWithAI] = useState<number[]>([]);

  useEffect(() => {
    if (USE_MOCK) return;
    materialService.getMaterials(classroomId)
      .then(data => setWeeksWithAI(data.weeksWithAI))
      .catch(() => {});
  }, [classroomId]);

  if (USE_MOCK) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <ChatIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
        <Typography color="text.secondary">
          AI chat requires the real backend. Set <code>VITE_MOCK=false</code> in <code>.env</code> and start the backend server.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Note */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: '#fdf6f0', border: '1px solid #f5c6a0' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <Typography sx={{ fontSize: '1.25rem', lineHeight: 1 }}>🦉</Typography>
          <Box>
            <Typography variant="subtitle2" sx={{ color: '#e8733a', fontWeight: 700 }}>
              Albus helps you learn, not cheat!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Albus will give you hints and walk you through similar problems — but will never just give you the answer. That's how you actually learn!
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Week selector */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Week</InputLabel>
          <Select value={weekNumber} label="Week" onChange={e => setWeekNumber(Number(e.target.value))}>
            {Array.from({ length: 52 }, (_, i) => i + 1).map(w => (
              <MenuItem key={w} value={w}>
                Week {w} {weeksWithAI.includes(w) ? '✓' : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {weeksWithAI.length > 0 && !weeksWithAI.includes(weekNumber) && (
          <Alert severity="info" sx={{ py: 0 }}>
            No materials for Week {weekNumber} yet. Try:{" "}
            {weeksWithAI.map(w => (
              <Button key={w} size="small" onClick={() => setWeekNumber(w)}>Week {w}</Button>
            ))}
          </Alert>
        )}
      </Box>

      {/* Chat interface */}
      <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <ChatInterface
          classroomId={classroomId}
          classroomName={classroomName}
          weekNumber={weekNumber}
        />
      </Paper>
    </Box>
  );
}

// ── Teacher student chats panel ───────────────────────────────
function TeacherChatsPanel({ classroomId }: { classroomId: string }) {
  const [weekNumber, setWeekNumber] = useState(1);
  const [chats, setChats] = useState<Array<{
    student: { id: string; firstName: string; lastName: string; email: string };
    messages: ChatMessage[];
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    chatService.getStudentChats(classroomId, weekNumber)
      .then(data => setChats(data.chats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [classroomId, weekNumber]);

  const activeStudents = chats.filter(c => c.messages.length > 0);
  const silentStudents = chats.filter(c => c.messages.length === 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Week</InputLabel>
          <Select value={weekNumber} label="Week" onChange={e => setWeekNumber(Number(e.target.value))}>
            {Array.from({ length: 52 }, (_, i) => i + 1).map(w => (
              <MenuItem key={w} value={w}>Week {w}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary">
          {activeStudents.length} student{activeStudents.length !== 1 ? 's' : ''} chatted this week
        </Typography>
      </Box>

      {loading ? (
        <Stack spacing={1}>{[1,2,3].map(i => <Skeleton key={i} variant="rounded" height={56} />)}</Stack>
      ) : chats.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No students enrolled yet.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {activeStudents.map(({ student, messages }) => (
            <Paper key={student.id} variant="outlined" sx={{ overflow: 'hidden' }}>
              {/* Student header row */}
              <Box
                onClick={() => setExpandedId(expandedId === student.id ? null : student.id)}
                sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' } }}
              >
                <Avatar sx={{ bgcolor: 'primary.light', width: 34, height: 34, fontSize: '0.8rem' }}>
                  {getInitials(student.firstName, student.lastName)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {student.firstName} {student.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{student.email}</Typography>
                </Box>
                <Chip label={`${messages.length} msg${messages.length !== 1 ? 's' : ''}`} size="small" />
              </Box>

              {/* Expanded conversation */}
              {expandedId === student.id && (
                <Box sx={{ maxHeight: 360, overflowY: 'auto', bgcolor: '#fafaf8',
                  borderTop: '1px solid', borderColor: 'divider', p: 1.5 }}>
                  <Stack spacing={1}>
                    {messages.map((msg, i) => (
                      <Box key={i} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <Paper elevation={0} sx={{
                          p: '8px 12px', maxWidth: '80%',
                          bgcolor: msg.role === 'user' ? '#1a6b4a' : 'white',
                          color: msg.role === 'user' ? 'white' : 'text.primary',
                          borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                          border: msg.role === 'assistant' ? '1px solid #e8e0d8' : 'none',
                        }}>
                          <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{msg.content}</Typography>
                        </Paper>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Paper>
          ))}

          {silentStudents.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                No activity this week: {silentStudents.map(c => `${c.student.firstName} ${c.student.lastName}`).join(', ')}
              </Typography>
            </Box>
          )}
        </Stack>
      )}
    </Box>
  );
}

// ── Teacher reading panel ─────────────────────────────────────
function TeacherReadingPanel({ classroomId }: { classroomId: string }) {
  const [assignments, setAssignments] = useState<ReadingAssignment[]>([]);
  const [selected, setSelected] = useState<ReadingAssignment | null>(null);
  const [studentAttempts, setStudentAttempts] = useState<Array<{
    student: { id: string; firstName: string; lastName: string };
    attempts: ReadingAttempt[];
  }>>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [passage, setPassage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await readingService.getAssignments(classroomId);
    setAssignments(data.assignments);
  }, [classroomId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!title.trim() || !passage.trim()) return;
    setSaving(true);
    try {
      await readingService.createAssignment(classroomId, title, passage);
      setTitle(''); setPassage(''); setCreating(false);
      await load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await readingService.deleteAssignment(classroomId, id);
    if (selected?.id === id) setSelected(null);
    await load();
  };

  const handleSelect = async (a: ReadingAssignment) => {
    setSelected(a);
    const data = await readingService.getStudentAttempts(classroomId, a.id);
    setStudentAttempts(data.studentAttempts);
  };

  const scoreColor = (s: number) => s >= 80 ? '#1a6b4a' : s >= 60 ? '#e8733a' : '#d32f2f';

  if (selected) return (
    <Box>
      <Button size="small" onClick={() => setSelected(null)} sx={{ mb: 2 }}>← Back to assignments</Button>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>{selected.title}</Typography>
      <Paper sx={{ p: 1.5, mb: 3, bgcolor: '#fffbf5', border: '1px solid #f5dfc0' }}>
        <Typography variant="body2" sx={{ fontFamily: 'Georgia, serif', lineHeight: 1.8 }}>{selected.passageText}</Typography>
      </Paper>
      {studentAttempts.length === 0 ? (
        <Typography color="text.secondary">No attempts yet.</Typography>
      ) : (
        <Stack spacing={2}>
          {studentAttempts.filter(s => s.attempts.length > 0).map(({ student, attempts }) => (
            <Paper key={student.id} variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32, fontSize: '0.8rem' }}>
                  {getInitials(student.firstName, student.lastName)}
                </Avatar>
                <Typography fontWeight={600}>{student.firstName} {student.lastName}</Typography>
                <Chip label={`${attempts.length} attempt${attempts.length !== 1 ? 's' : ''}`} size="small" />
              </Box>
              <Stack spacing={1}>
                {attempts.map((a, i) => (
                  <Box key={a.id} sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70 }}>
                      #{i + 1} {new Date(a.createdAt).toLocaleDateString()}
                    </Typography>
                    {(['pronunciationScore','accuracyScore','fluencyScore'] as const).map(k => (
                      <Chip key={k} size="small"
                        label={`${k.replace('Score','')}: ${Math.round(a[k])}`}
                        sx={{ bgcolor: scoreColor(a[k]) + '22', color: scoreColor(a[k]), fontWeight: 700, fontSize: '0.7rem' }}
                      />
                    ))}
                  </Box>
                ))}
              </Stack>
            </Paper>
          ))}
          {studentAttempts.filter(s => s.attempts.length === 0).length > 0 && (
            <Typography variant="caption" color="text.secondary">
              No attempts yet from: {studentAttempts.filter(s => s.attempts.length === 0).map(s => `${s.student.firstName} ${s.student.lastName}`).join(', ')}
            </Typography>
          )}
        </Stack>
      )}
    </Box>
  );

  return (
    <Box>
      {creating ? (
        <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>New Reading Assignment</Typography>
          <TextField fullWidth label="Title" value={title} onChange={e => setTitle(e.target.value)} sx={{ mb: 2 }} size="small" />
          <TextField fullWidth label="Passage" multiline rows={5} value={passage} onChange={e => setPassage(e.target.value)}
            placeholder="Type or paste the reading passage here…" sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" onClick={handleCreate} disabled={saving || !title.trim() || !passage.trim()}
              sx={{ bgcolor: '#1a6b4a', '&:hover': { bgcolor: '#155a3e' } }}>
              {saving ? 'Saving…' : 'Save Assignment'}
            </Button>
            <Button onClick={() => { setCreating(false); setTitle(''); setPassage(''); }}>Cancel</Button>
          </Box>
        </Paper>
      ) : (
        <Button variant="outlined" onClick={() => setCreating(true)} sx={{ mb: 3, borderColor: '#1a6b4a', color: '#1a6b4a' }}>
          + New Assignment
        </Button>
      )}

      {assignments.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No reading assignments yet. Create one above!
        </Typography>
      ) : (
        <Stack spacing={1}>
          {assignments.map(a => (
            <Paper key={a.id} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5,
              cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => handleSelect(a)}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>{a.title}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap>{a.passageText}</Typography>
              </Box>
              <Tooltip title="Delete">
                <IconButton size="small" sx={{ color: 'error.main' }} onClick={e => { e.stopPropagation(); handleDelete(a.id); }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}

// ── Student reading panel ──────────────────────────────────────
function StudentReadingPanel({ classroomId }: { classroomId: string }) {
  const [assignments, setAssignments] = useState<ReadingAssignment[]>([]);
  const [selected, setSelected] = useState<ReadingAssignment | null>(null);
  const [myAttempts, setMyAttempts] = useState<ReadingAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    readingService.getAssignments(classroomId)
      .then(d => setAssignments(d.assignments))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [classroomId]);

  const handleSelect = async (a: ReadingAssignment) => {
    setSelected(a);
    const data = await readingService.getMyAttempts(classroomId, a.id);
    setMyAttempts(data.attempts);
  };

  const refreshAttempts = async () => {
    if (!selected) return;
    const data = await readingService.getMyAttempts(classroomId, selected.id);
    setMyAttempts(data.attempts);
  };

  if (selected) return (
    <Box>
      <Button size="small" onClick={() => setSelected(null)} sx={{ mb: 2 }}>← Back</Button>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>{selected.title}</Typography>
      <ReadingAssessment classroomId={classroomId} assignment={selected} pastAttempts={myAttempts} onAttemptSaved={refreshAttempts} />
    </Box>
  );

  if (loading) return <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress sx={{ color: '#1a6b4a' }} /></Box>;

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Click an assignment to start your reading assessment.
      </Typography>
      {assignments.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No reading assignments yet. Check back soon!
        </Typography>
      ) : (
        <Stack spacing={1}>
          {assignments.map(a => (
            <Paper key={a.id} variant="outlined" onClick={() => handleSelect(a)}
              sx={{ p: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
              <Typography fontWeight={600}>{a.title}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>{a.passageText.slice(0, 80)}…</Typography>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function ClassroomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isTeacher } = useAuth();
  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState("");
  const [tabIndex, setTabIndex] = useState(0);

  const fetchClassroom = useCallback(async () => {
    if (!id) return;
    try {
      const data = await classroomService.getClassroom(id);
      setClassroom(data);
    } catch {
      setError("Failed to load classroom details.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClassroom();
  }, [fetchClassroom]);

  const handleCopyCode = () => {
    if (classroom) {
      navigator.clipboard.writeText(classroom.inviteCode);
      setSnackbar("Invite code copied to clipboard!");
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!id) return;
    try {
      await classroomService.removeStudent(id, studentId);
      await fetchClassroom();
      setSnackbar("Student removed.");
    } catch {
      setSnackbar("Failed to remove student.");
    }
  };

  const isOwner = classroom?.teacher.id === user?.id;

  if (isLoading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Skeleton variant="rounded" height={160} sx={{ mb: 3, borderRadius: 3 }} />
          <Skeleton variant="rounded" height={300} sx={{ borderRadius: 3 }} />
        </Container>
      </Box>
    );
  }

  if (error || !classroom) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="error">{error || "Classroom not found."}</Alert>
          <Button sx={{ mt: 2 }} onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />

      {/* Banner */}
      <Box sx={{ bgcolor: classroom.bannerColor, py: 5, px: 3, position: "relative" }}>
        <Container maxWidth="md">
          <Button
            startIcon={<BackIcon />}
            onClick={() => navigate("/dashboard")}
            sx={{ color: "rgba(255,255,255,0.85)", mb: 2 }}
          >
            Back
          </Button>
          <Typography variant="h2" sx={{ color: "white", fontSize: { xs: "1.75rem", md: "2.5rem" } }}>
            {classroom.name}
          </Typography>
          {classroom.section && (
            <Typography sx={{ color: "rgba(255,255,255,0.85)", mt: 0.5 }}>
              {classroom.section}
            </Typography>
          )}
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", mt: 1 }}>
            {classroom.teacher.firstName} {classroom.teacher.lastName}
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", gap: 3, flexDirection: { xs: "column", md: "row" } }}>
          {/* Left: Info panel */}
          <Box sx={{ width: { xs: "100%", md: 260 }, flexShrink: 0 }}>
            {/* Invite code card */}
            {isOwner && (
              <Paper sx={{ p: 2.5, mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Invite code
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography
                    variant="h5"
                    sx={{ fontFamily: "monospace", letterSpacing: "0.12em", color: "primary.main" }}
                  >
                    {classroom.inviteCode}
                  </Typography>
                  <Tooltip title="Copy code">
                    <IconButton size="small" onClick={handleCopyCode}>
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Share this code with students so they can join.
                </Typography>
              </Paper>
            )}

            {/* Description */}
            {classroom.description && (
              <Paper sx={{ p: 2.5, mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  About
                </Typography>
                <Typography variant="body2">{classroom.description}</Typography>
              </Paper>
            )}

            {classroom.subject && (
              <Paper sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Subject
                </Typography>
                <Chip label={classroom.subject} size="small" />
              </Paper>
            )}
          </Box>

          {/* Right: Tabbed content */}
          <Box sx={{ flexGrow: 1 }}>
            <Paper sx={{ overflow: "hidden" }}>
              {/* Tabs */}
              <Tabs
                value={tabIndex}
                onChange={(_, v) => setTabIndex(v)}
                sx={{
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  "& .MuiTab-root": { fontWeight: 600, textTransform: "none", minHeight: 52 },
                  "& .Mui-selected": { color: "#1a6b4a" },
                  "& .MuiTabs-indicator": { bgcolor: "#1a6b4a" },
                }}
              >
                <Tab
                  icon={<PeopleIcon />}
                  iconPosition="start"
                  label={`Students (${classroom.students.length})`}
                />
                <Tab
                  icon={isTeacher ? <UploadIcon /> : <ChatIcon />}
                  iconPosition="start"
                  label={isTeacher ? "Weekly AI Materials" : "Ask Albus"}
                />
                {isTeacher && (
                  <Tab icon={<ChatIcon />} iconPosition="start" label="Student Chats" />
                )}
                {classroom.readingEnabled && (
                  <Tab icon={<AIIcon />} iconPosition="start" label="Reading" />
                )}
              </Tabs>

              <Box sx={{ p: 2.5 }}>
                {/* Tab 0: Students */}
                <TabPanel value={tabIndex} index={0}>
                  {classroom.students.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 6, px: 2 }}>
                      <Typography color="text.secondary">
                        No students have joined yet.
                      </Typography>
                      {isOwner && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Share the invite code to get started.
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <List disablePadding>
                      {classroom.students.map((student, idx) => (
                        <Box key={student.id}>
                          {idx > 0 && <Divider component="li" />}
                          <ListItem sx={{ py: 1.5, px: 0 }}>
                            <ListItemAvatar>
                              <Avatar
                                sx={{
                                  bgcolor: "primary.light",
                                  width: 36,
                                  height: 36,
                                  fontSize: "0.85rem",
                                }}
                              >
                                {getInitials(student.firstName, student.lastName)}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={`${student.firstName} ${student.lastName}`}
                              secondary={student.email}
                            />
                            {isOwner && (
                              <ListItemSecondaryAction>
                                <Tooltip title="Remove student">
                                  <IconButton
                                    edge="end"
                                    size="small"
                                    onClick={() => handleRemoveStudent(student.id)}
                                  >
                                    <RemoveIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </ListItemSecondaryAction>
                            )}
                          </ListItem>
                        </Box>
                      ))}
                    </List>
                  )}
                </TabPanel>

                {/* Tab 1: Weekly AI (teacher) or Ask Albus (student) */}
                <TabPanel value={tabIndex} index={1}>
                  {isTeacher ? (
                    <TeacherMaterialsPanel classroomId={classroom.id} />
                  ) : (
                    <StudentChatPanel classroomId={classroom.id} classroomName={classroom.name} />
                  )}
                </TabPanel>

                {/* Tab 2: Student chats (teacher only) */}
                {isTeacher && (
                  <TabPanel value={tabIndex} index={2}>
                    <TeacherChatsPanel classroomId={classroom.id} />
                  </TabPanel>
                )}

                {/* Reading tab: index 3 for teacher, 2 for student */}
                {classroom.readingEnabled && (
                  <TabPanel value={tabIndex} index={isTeacher ? 3 : 2}>
                    {isTeacher
                      ? <TeacherReadingPanel classroomId={classroom.id} />
                      : <StudentReadingPanel classroomId={classroom.id} />
                    }
                  </TabPanel>
                )}
              </Box>
            </Paper>
          </Box>
        </Box>
      </Container>

      {/* Snackbar */}
      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setSnackbar("")} severity="success" variant="filled">
          {snackbar}
        </Alert>
      </Snackbar>
    </Box>
  );
}
