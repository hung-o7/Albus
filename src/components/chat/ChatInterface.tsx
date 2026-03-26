import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Paper, Typography, TextField, IconButton, Avatar,
  CircularProgress, Chip, Tooltip, Fade,
} from '@mui/material';
import {
  Send as SendIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  VolumeUp as SpeakIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import { chatService, ChatMessage } from '../../services/chatService';
import { useAuth } from '../../context/AuthContext';

// Polyfill type for webkit-prefixed Speech Recognition
const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

interface Props {
  classroomId: string;
  classroomName: string;
  weekNumber: number;
}

export default function ChatInterface({ classroomId, classroomName, weekNumber }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [, setSpeaking] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    setLoadingHistory(true);
    chatService.getHistory(classroomId, weekNumber)
      .then(data => setMessages(data.messages))
      .catch(console.error)
      .finally(() => setLoadingHistory(false));
  }, [classroomId, weekNumber]);

  const speak = useCallback((text: string, index: number) => {
    window.speechSynthesis.cancel();
    setSpeakingMessageId(index);
    setSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.88;
    utterance.pitch = 1.1;
    // Prefer a friendly en-US voice when available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Samantha') || v.name.includes('Karen') ||
      (v.lang === 'en-US' && v.name.includes('Google'))
    ) || voices.find(v => v.lang === 'en-US');
    if (preferred) utterance.voice = preferred;
    utterance.onend = () => { setSpeaking(false); setSpeakingMessageId(null); };
    utterance.onerror = () => { setSpeaking(false); setSpeakingMessageId(null); };
    window.speechSynthesis.speak(utterance);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;
    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const { reply } = await chatService.sendMessage(classroomId, text.trim(), weekNumber);
      const assistantMsg: ChatMessage = { role: 'assistant', content: reply };
      setMessages(prev => {
        const updated = [...prev, assistantMsg];
        setTimeout(() => speak(reply, updated.length - 1), 200);
        return updated;
      });
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'Oops! Something went wrong. Try again!';
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
    } finally {
      setSending(false);
    }
  }, [classroomId, weekNumber, sending, speak]);

  const startRecording = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      alert('Voice input is not supported in this browser. Try Chrome or Edge!');
      return;
    }
    window.speechSynthesis.cancel(); // Stop any playback before recording
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      if (transcript.trim()) sendMessage(transcript.trim());
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
  }, [sendMessage]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setRecording(false);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setSpeakingMessageId(null);
  }, []);

  if (loadingHistory) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress sx={{ color: '#1a6b4a' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 500 }}>
      {/* Header */}
      <Box sx={{
        p: 2, background: 'linear-gradient(135deg, #1a6b4a 0%, #2d9b6e 100%)',
        borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', gap: 2,
      }}>
        <Avatar sx={{ bgcolor: '#e8733a', width: 48, height: 48, fontSize: '1.5rem' }}>🦉</Avatar>
        <Box>
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>Ask Albus!</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
            Week {weekNumber} — {classroomName}
          </Typography>
        </Box>
        <Chip
          label="I help with hints, not answers!"
          size="small"
          sx={{ ml: 'auto', bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '0.7rem' }}
        />
      </Box>

      {/* Messages */}
      <Box sx={{
        height: 460, overflowY: 'auto', p: 2, bgcolor: '#fafaf8',
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        {messages.length === 0 && (
          <Fade in>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography sx={{ fontSize: '3rem', mb: 1 }}>👋</Typography>
              <Typography variant="h6" sx={{ color: '#1a6b4a', fontWeight: 700, mb: 0.5 }}>
                Hi{user?.firstName ? `, ${user.firstName}` : ''}! I'm Albus!
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 320, mx: 'auto' }}>
                I'm here to help you learn! Ask me anything about this week's classwork.
                You can type or use the microphone button to talk to me! 🎤
              </Typography>
            </Box>
          </Fade>
        )}

        {messages.map((msg, i) => (
          <Fade in key={i}>
            <Box sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 1 }}>
              {msg.role === 'assistant' && (
                <Avatar sx={{ bgcolor: '#1a6b4a', width: 40, height: 40, flexShrink: 0 }}>🦉</Avatar>
              )}
              <Box sx={{ maxWidth: '75%' }}>
                <Paper elevation={0} sx={{
                  p: '12px 16px',
                  bgcolor: msg.role === 'user' ? '#1a6b4a' : 'white',
                  color: msg.role === 'user' ? 'white' : 'text.primary',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  border: msg.role === 'assistant' ? '1px solid #e8e0d8' : 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}>
                  <Typography sx={{ fontSize: '1rem', lineHeight: 1.6 }}>{msg.content}</Typography>
                </Paper>
                {msg.role === 'assistant' && (
                  <Tooltip title={speakingMessageId === i ? 'Stop talking' : 'Read this aloud'}>
                    <IconButton
                      size="small"
                      onClick={() => speakingMessageId === i ? stopSpeaking() : speak(msg.content, i)}
                      sx={{ mt: 0.5, color: speakingMessageId === i ? '#e8733a' : '#999' }}
                    >
                      {speakingMessageId === i ? <StopIcon fontSize="small" /> : <SpeakIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              {msg.role === 'user' && (
                <Avatar sx={{ bgcolor: '#e8733a', width: 40, height: 40, flexShrink: 0 }}>
                  {user?.firstName?.[0]?.toUpperCase() || '?'}
                </Avatar>
              )}
            </Box>
          </Fade>
        ))}

        {sending && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: '#1a6b4a', width: 40, height: 40 }}>🦉</Avatar>
            <Paper elevation={0} sx={{
              p: '12px 16px', bgcolor: 'white', borderRadius: '18px 18px 18px 4px',
              border: '1px solid #e8e0d8',
            }}>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                {[0, 1, 2].map(n => (
                  <Box key={n} sx={{
                    width: 8, height: 8, borderRadius: '50%', bgcolor: '#1a6b4a',
                    animation: 'bounce 1.2s infinite',
                    animationDelay: `${n * 0.2}s`,
                    '@keyframes bounce': {
                      '0%, 100%': { transform: 'translateY(0)' },
                      '50%': { transform: 'translateY(-6px)' },
                    },
                  }} />
                ))}
              </Box>
            </Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input area */}
      <Box sx={{
        p: 2, bgcolor: 'white', borderRadius: '0 0 12px 12px',
        borderTop: '1px solid #e8e0d8',
        display: 'flex', gap: 1, alignItems: 'flex-end',
      }}>
        {/* Big mic button */}
        <Tooltip title={recording ? 'Stop recording' : 'Talk to Albus!'}>
          <IconButton
            onClick={recording ? stopRecording : startRecording}
            disabled={sending}
            sx={{
              width: 56, height: 56, flexShrink: 0,
              bgcolor: recording ? '#e8733a' : '#1a6b4a',
              color: 'white',
              animation: recording ? 'pulse 1s infinite' : 'none',
              '@keyframes pulse': {
                '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(232,115,58,0.4)' },
                '50%': { transform: 'scale(1.05)', boxShadow: '0 0 0 8px rgba(232,115,58,0)' },
              },
              '&:hover': { bgcolor: recording ? '#d4652e' : '#155a3e' },
              '&:disabled': { bgcolor: '#ccc' },
            }}
          >
            {recording ? <MicOffIcon sx={{ fontSize: 28 }} /> : <MicIcon sx={{ fontSize: 28 }} />}
          </IconButton>
        </Tooltip>

        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          placeholder={recording ? '🎤 Listening...' : 'Type your question here...'}
          disabled={sending || recording}
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              fontSize: '1rem',
              '&.Mui-focused fieldset': { borderColor: '#1a6b4a', borderWidth: 2 },
            },
          }}
        />

        <IconButton
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || sending || recording}
          sx={{
            width: 56, height: 56, flexShrink: 0,
            bgcolor: input.trim() && !sending ? '#1a6b4a' : '#e0e0e0',
            color: 'white',
            transition: 'all 0.2s',
            '&:hover': { bgcolor: '#155a3e' },
            '&:disabled': { bgcolor: '#e0e0e0', color: '#aaa' },
          }}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
}
