import { useState, useCallback } from 'react';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import {
  Box, Button, Typography, Paper, CircularProgress,
  Chip, LinearProgress, Alert, Stack,
} from '@mui/material';
import { Mic as MicIcon, Stop as StopIcon, Refresh as RetryIcon } from '@mui/icons-material';
import { ReadingAssignment, ReadingAttempt } from '@/types';
import { readingService } from '@/services/readingService';
import {
  LineChart, Line, XAxis, YAxis, Tooltip as ChartTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

interface Props {
  classroomId: string;
  assignment: ReadingAssignment;
  pastAttempts: ReadingAttempt[];
  onAttemptSaved: () => void;
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" fontWeight={600}>{label}</Typography>
        <Typography variant="caption" fontWeight={700} sx={{ color }}>{Math.round(value)}</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={value}
        sx={{ height: 8, borderRadius: 4, bgcolor: '#f0f0f0', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 } }}
      />
    </Box>
  );
}

export default function ReadingAssessment({ classroomId, assignment, pastAttempts, onAttemptSaved }: Props) {
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<ReadingAttempt | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const startAssessment = useCallback(async () => {
    setStatus('listening');
    setResult(null);
    setErrorMsg('');

    try {
      const { token, region } = await readingService.getSpeechToken();

      const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(token, region);
      speechConfig.speechRecognitionLanguage = 'en-US';

      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();

      const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
        assignment.passageText,
        sdk.PronunciationAssessmentGradingSystem.HundredMark,
        sdk.PronunciationAssessmentGranularity.Word,
        true
      );
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
      pronunciationConfig.applyTo(recognizer);

      recognizer.recognizeOnceAsync(async (sdkResult) => {
        setStatus('processing');
        const assessment = sdk.PronunciationAssessmentResult.fromResult(sdkResult);
        const jsonStr = sdkResult.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult);
        recognizer.close();

        let wordDetails: any[] = [];
        try {
          const json = JSON.parse(jsonStr);
          wordDetails = json?.NBest?.[0]?.Words?.map((w: any) => ({
            word: w.Word,
            accuracyScore: w.PronunciationAssessment?.AccuracyScore ?? 0,
            errorType: w.PronunciationAssessment?.ErrorType ?? 'None',
          })) ?? [];
        } catch { /* ignore parse errors */ }

        const scores = {
          accuracyScore: assessment.accuracyScore,
          fluencyScore: assessment.fluencyScore,
          prosodyScore: assessment.prosodyScore ?? 0,
          pronunciationScore: assessment.pronunciationScore,
          wordDetails,
        };

        await readingService.submitAttempt(classroomId, assignment.id, scores);
        setResult({ ...scores, id: '', createdAt: new Date().toISOString() });
        setStatus('done');
        onAttemptSaved();
      }, (err) => {
        console.error(err);
        setErrorMsg('Could not access microphone or speech service. Check your mic permissions.');
        setStatus('error');
      });
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to start assessment. Is Azure Speech configured?');
      setStatus('error');
    }
  }, [classroomId, assignment, onAttemptSaved]);

  const chartData = pastAttempts.map((a, i) => ({
    attempt: `#${i + 1}`,
    Accuracy: Math.round(a.accuracyScore),
    Fluency: Math.round(a.fluencyScore),
    Pronunciation: Math.round(a.pronunciationScore),
  }));

  const getScoreColor = (score: number) =>
    score >= 80 ? '#1a6b4a' : score >= 60 ? '#e8733a' : '#d32f2f';

  const getFeedback = (scores: ReadingAttempt) => {
    const msgs: string[] = [];
    if (scores.accuracyScore >= 85) msgs.push("Great accuracy! You read the words really well!");
    else if (scores.accuracyScore >= 65) msgs.push("Good effort! Practice sounding out tricky words slowly.");
    else msgs.push("Keep practicing! Try reading each word carefully before moving on.");

    if (scores.fluencyScore >= 85) msgs.push("Your reading flowed smoothly — nice work!");
    else if (scores.fluencyScore >= 65) msgs.push("Try to read a little more smoothly without long pauses.");
    else msgs.push("Practice reading the passage a few times to build your speed.");

    if (scores.prosodyScore >= 80) msgs.push("You sounded natural and expressive!");
    else msgs.push("Try reading with more expression, like you're telling a story!");
    return msgs;
  };

  return (
    <Box>
      {/* Passage */}
      <Paper sx={{ p: 2.5, mb: 3, bgcolor: '#fffbf5', border: '1px solid #f5dfc0' }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Read this passage aloud:</Typography>
        <Typography variant="body1" sx={{ lineHeight: 2, fontSize: '1.1rem', fontFamily: 'Georgia, serif' }}>
          {assignment.passageText}
        </Typography>
      </Paper>

      {/* Controls */}
      {status === 'idle' || status === 'error' ? (
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          {status === 'error' && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
          <Button
            variant="contained"
            size="large"
            startIcon={<MicIcon />}
            onClick={startAssessment}
            sx={{ bgcolor: '#1a6b4a', '&:hover': { bgcolor: '#155a3e' }, px: 4 }}
          >
            {pastAttempts.length > 0 ? 'Try Again' : 'Start Reading'}
          </Button>
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
            Press the button, then read the passage aloud clearly into your microphone.
          </Typography>
        </Box>
      ) : status === 'listening' ? (
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 1 }}>
            <StopIcon sx={{ color: '#e8733a', animation: 'pulse 1s infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />
            <Typography fontWeight={700} color="#e8733a">Listening… read aloud now!</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">Albus is listening. Read the whole passage, then wait a moment.</Typography>
        </Box>
      ) : status === 'processing' ? (
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <CircularProgress size={32} sx={{ color: '#1a6b4a', mb: 1 }} />
          <Typography color="text.secondary">Analyzing your reading…</Typography>
        </Box>
      ) : null}

      {/* Current result */}
      {status === 'done' && result && (
        <Paper sx={{ p: 2.5, mb: 3, border: '1px solid #a5d6b7', bgcolor: '#f0faf4' }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: '#1a6b4a' }}>
            Your results
          </Typography>
          <Stack spacing={1.5} sx={{ mb: 2.5 }}>
            <ScoreBar label="Pronunciation" value={result.pronunciationScore} color={getScoreColor(result.pronunciationScore)} />
            <ScoreBar label="Accuracy" value={result.accuracyScore} color={getScoreColor(result.accuracyScore)} />
            <ScoreBar label="Fluency" value={result.fluencyScore} color={getScoreColor(result.fluencyScore)} />
            <ScoreBar label="Expression" value={result.prosodyScore} color={getScoreColor(result.prosodyScore)} />
          </Stack>

          {/* Word-level breakdown */}
          {result.wordDetails.length > 0 && (
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Word by word:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {result.wordDetails.map((w, i) => (
                  <Chip
                    key={i}
                    label={w.word}
                    size="small"
                    sx={{
                      bgcolor: w.errorType === 'None'
                        ? w.accuracyScore >= 80 ? '#e8f5e9' : '#fff8e1'
                        : '#fdecea',
                      color: w.errorType === 'None'
                        ? w.accuracyScore >= 80 ? '#1a6b4a' : '#e65100'
                        : '#d32f2f',
                      fontWeight: 600,
                      border: '1px solid',
                      borderColor: w.errorType === 'None'
                        ? w.accuracyScore >= 80 ? '#a5d6b7' : '#ffcc80'
                        : '#ef9a9a',
                    }}
                  />
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Green = great · Yellow = needs practice · Red = missed or mispronounced
              </Typography>
            </Box>
          )}

          {/* Albus feedback */}
          <Paper sx={{ p: 1.5, bgcolor: 'white', border: '1px solid #e8e0d8' }}>
            <Typography variant="caption" fontWeight={700} sx={{ color: '#1a6b4a', display: 'block', mb: 0.5 }}>
              🦉 Albus says:
            </Typography>
            {getFeedback(result).map((msg, i) => (
              <Typography key={i} variant="body2" sx={{ mb: 0.25 }}>• {msg}</Typography>
            ))}
          </Paper>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button startIcon={<RetryIcon />} onClick={startAssessment} variant="outlined" size="small"
              sx={{ borderColor: '#1a6b4a', color: '#1a6b4a' }}>
              Try again
            </Button>
          </Box>
        </Paper>
      )}

      {/* Progress chart */}
      {pastAttempts.length > 1 && (
        <Paper sx={{ p: 2.5, border: '1px solid #e0e0e0' }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Your progress</Typography>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <XAxis dataKey="attempt" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <ChartTooltip />
              <Legend />
              <Line type="monotone" dataKey="Pronunciation" stroke="#1a6b4a" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Accuracy" stroke="#e8733a" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Fluency" stroke="#1565c0" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      )}
    </Box>
  );
}
