/**
 * VoiceController.jsx — Mei Arivu Hands-Free Voice Interface
 * ============================================================
 * A floating, always-on voice assistant that listens for the wake word
 * "Mei Arivu" and guides field workers through operational queries
 * using browser-native APIs (with a clean bridge to Bhashini when ready).
 *
 * ── CONFIGURATION ──────────────────────────────────────────────────────────
 * Flip this flag to `true` once BHASHINI_API_KEY is approved and the
 * backend /api/voice/* endpoints are live with real credentials.
 */
const USE_BHASHINI_BACKEND = false;

/**
 * ── VOICE STATES (FSM) ──────────────────────────────────────────────────────
 *  idle       → Silently listening for wake word in the background
 *  active     → Wake word detected, now capturing the user's operational query
 *  processing → Query sent to backend /api/chat/stream, awaiting response
 *  speaking   → TTS is reading the AI response aloud to the worker
 *  error      → Mic denied / API unavailable / browser unsupported
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import toast from 'react-hot-toast';

// ── Language configuration ────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'en-US', label: 'EN', name: 'English', voiceHints: ['en-US', 'en-GB', 'en'] },
  { code: 'ta-IN', label: 'தமிழ்', name: 'Tamil', voiceHints: ['ta-IN', 'ta'] },
  { code: 'hi-IN', label: 'हिंदी', name: 'Hindi', voiceHints: ['hi-IN', 'hi'] },
];

// ── Wake word detection (case/diacritic insensitive) ─────────────────────────
const WAKE_WORDS = ['mei arivu', 'may arivu', 'me arivu', 'mey arivu'];
const containsWakeWord = (text) => {
  const lower = text.toLowerCase().trim();
  return WAKE_WORDS.some((w) => lower.includes(w));
};

// ── Pick best available TTS voice for a language ─────────────────────────────
const pickVoice = (langCode) => {
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  const hints = LANGUAGES.find((l) => l.code === langCode)?.voiceHints ?? [langCode];
  for (const hint of hints) {
    const match = voices.find(
      (v) => v.lang === hint || v.lang.startsWith(hint.split('-')[0])
    );
    if (match) return match;
  }
  return null;
};

// ── Helper: speak text via browser TTS ───────────────────────────────────────
const speakText = (text, langCode, onStart, onEnd) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = langCode;
  utter.rate = 0.95;
  utter.pitch = 1.0;
  const voice = pickVoice(langCode);
  if (voice) utter.voice = voice;
  utter.onstart = onStart;
  utter.onend = onEnd;
  utter.onerror = onEnd;
  // Voices may not be loaded yet — retry once
  const doSpeak = () => {
    const v2 = pickVoice(langCode);
    if (v2) utter.voice = v2;
    window.speechSynthesis.speak(utter);
  };
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = doSpeak;
  } else {
    doSpeak();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function VoiceController() {
  // ── State ─────────────────────────────────────────────────────────────────
  const [voiceState, setVoiceState] = useState('idle'); // idle|active|processing|speaking|error
  const [selectedLang, setSelectedLang] = useState('en-US');
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [waveAmplitudes, setWaveAmplitudes] = useState([0.3, 0.5, 0.7, 0.5, 0.3]);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const waveIntervalRef = useRef(null);
  const isActiveRef = useRef(false);      // tracks if we're in active (query) capture mode
  const mountedRef = useRef(true);

  // ── Wave animation driver ─────────────────────────────────────────────────
  const startWaveAnimation = useCallback(() => {
    if (waveIntervalRef.current) clearInterval(waveIntervalRef.current);
    waveIntervalRef.current = setInterval(() => {
      setWaveAmplitudes([
        0.2 + Math.random() * 0.8,
        0.3 + Math.random() * 0.7,
        0.4 + Math.random() * 0.6,
        0.3 + Math.random() * 0.7,
        0.2 + Math.random() * 0.8,
      ]);
    }, 150);
  }, []);

  const stopWaveAnimation = useCallback(() => {
    if (waveIntervalRef.current) {
      clearInterval(waveIntervalRef.current);
      waveIntervalRef.current = null;
    }
    setWaveAmplitudes([0.3, 0.5, 0.7, 0.5, 0.3]);
  }, []);

  // ── Send transcript to /api/chat/stream and stream response ──────────────
  const sendToChat = useCallback(async (text) => {
    if (!mountedRef.current) return;
    setVoiceState('processing');
    stopWaveAnimation();

    try {
      const resp = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, language: selectedLang }),
      });

      if (!resp.ok) throw new Error(`Chat API returned ${resp.status}`);

      // ── Stream the text response ──────────────────────────────────────────
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Strip SSE "data: " prefix if present
        const lines = chunk.split('\n').filter(Boolean);
        for (const line of lines) {
          const data = line.startsWith('data: ') ? line.slice(6) : line;
          if (data && data !== '[DONE]') {
            fullResponse += data;
            if (mountedRef.current) setAiResponse(fullResponse);
          }
        }
      }

      if (!mountedRef.current) return;

      // ── Speak the response ────────────────────────────────────────────────
      if (fullResponse.trim()) {
        setVoiceState('speaking');
        speakText(
          fullResponse,
          selectedLang,
          () => { if (mountedRef.current) setVoiceState('speaking'); },
          () => { if (mountedRef.current) { setVoiceState('idle'); restartWakeWordListening(); } }
        );
      } else {
        setVoiceState('idle');
        restartWakeWordListening();
      }
    } catch (err) {
      console.error('[VoiceController] chat error:', err);
      if (mountedRef.current) {
        setVoiceState('error');
        toast.error('Voice query failed — check backend connection.');
        setTimeout(() => {
          if (mountedRef.current) { setVoiceState('idle'); restartWakeWordListening(); }
        }, 3000);
      }
    }
  }, [selectedLang, stopWaveAnimation]);

  // ── Bhashini path: send audio blob to /api/voice/process-speech ──────────
  const sendAudioToBackend = useCallback(async (blob) => {
    setVoiceState('processing');
    stopWaveAnimation();
    try {
      const formData = new FormData();
      formData.append('audio_file', blob, 'recording.webm');
      formData.append('language_code', selectedLang);

      const resp = await fetch('/api/voice/process-speech', {
        method: 'POST',
        body: formData,
      });
      if (!resp.ok) throw new Error(`process-speech returned ${resp.status}`);
      const data = await resp.json();
      const text = data.transcript || '';
      setTranscript(text);
      if (text) await sendToChat(text);
      else { setVoiceState('idle'); restartWakeWordListening(); }
    } catch (err) {
      console.error('[VoiceController] Bhashini path error:', err);
      if (mountedRef.current) {
        setVoiceState('error');
        toast.error('Bhashini speech processing failed.');
        setTimeout(() => { if (mountedRef.current) setVoiceState('idle'); }, 3000);
      }
    }
  }, [selectedLang, sendToChat, stopWaveAnimation]);

  // ── Start MediaRecorder (Bhashini path) ──────────────────────────────────
  const startMediaRecorder = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        sendAudioToBackend(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 10000);
    } catch (err) {
      console.error('[VoiceController] MediaRecorder error:', err);
      setVoiceState('error');
      toast.error('Microphone access denied.');
    }
  }, [sendAudioToBackend]);

  // ── Build and configure SpeechRecognition instance ────────────────────────
  const buildRecognition = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = selectedLang;

    rec.onresult = (event) => {
      const results = Array.from(event.results);
      const latestResult = results[results.length - 1];
      const spoken = latestResult[0].transcript;

      if (!isActiveRef.current) {
        // ── IDLE: watch for wake word ───────────────────────────────────────
        if (containsWakeWord(spoken)) {
          isActiveRef.current = true;
          setVoiceState('active');
          startWaveAnimation();
          setTranscript('');
          setAiResponse('');
          // Restart recognition to get a clean slate for the query
          try { rec.stop(); } catch (_) {}
        }
      } else {
        // ── ACTIVE: capture the actual query ───────────────────────────────
        if (latestResult.isFinal) {
          const query = spoken.trim();
          isActiveRef.current = false;
          setTranscript(query);
          stopWaveAnimation();
          try { rec.stop(); } catch (_) {}
          if (USE_BHASHINI_BACKEND) {
            // Switch to MediaRecorder for raw audio — recognition already has the text,
            // but Bhashini may produce better results from the audio binary
            sendToChat(query); // Use transcript for now; swap to MediaRecorder if needed
          } else {
            sendToChat(query);
          }
        } else {
          // Show interim transcript in real-time
          setTranscript(spoken);
        }
      }
    };

    rec.onerror = (event) => {
      // 'no-speech' and 'aborted' are benign — just restart
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      console.warn('[VoiceController] recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setIsSupported(false);
        setVoiceState('error');
        toast.error('Microphone permission denied. Enable mic to use voice assistant.');
      }
    };

    rec.onend = () => {
      // Auto-restart when idle (continuous listening)
      if (mountedRef.current && !isActiveRef.current && voiceState !== 'processing' && voiceState !== 'speaking') {
        try { rec.start(); } catch (_) {}
      }
    };

    return rec;
  }, [selectedLang, startWaveAnimation, stopWaveAnimation, sendToChat, voiceState]);

  // ── Restart wake-word listener ─────────────────────────────────────────────
  const restartWakeWordListening = useCallback(() => {
    isActiveRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }
    const rec = buildRecognition();
    if (rec) {
      recognitionRef.current = rec;
      try { rec.start(); } catch (_) {}
    }
  }, [buildRecognition]);

  // ── Initial setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setVoiceState('error');
      return;
    }

    const rec = buildRecognition();
    if (rec) {
      recognitionRef.current = rec;
      try { rec.start(); } catch (_) {}
    }

    return () => {
      mountedRef.current = false;
      try { recognitionRef.current?.stop(); } catch (_) {}
      stopWaveAnimation();
      window.speechSynthesis?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-init recognition on language change ─────────────────────────────────
  useEffect(() => {
    if (!isSupported) return;
    restartWakeWordListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLang]);

  // ── Manual dismiss / stop ─────────────────────────────────────────────────
  const handleDismiss = useCallback(() => {
    window.speechSynthesis?.cancel();
    isActiveRef.current = false;
    stopWaveAnimation();
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setVoiceState('idle');
    setTranscript('');
    setAiResponse('');
    setIsExpanded(false);
    restartWakeWordListening();
  }, [stopWaveAnimation, restartWakeWordListening]);

  // ── Manually trigger active state (tap-to-talk) ───────────────────────────
  const handleManualActivate = useCallback(() => {
    if (voiceState === 'processing' || voiceState === 'speaking') return;
    if (!isSupported) { toast.error('Voice not supported in this browser.'); return; }

    isActiveRef.current = true;
    setVoiceState('active');
    setTranscript('');
    setAiResponse('');
    startWaveAnimation();
    setIsExpanded(true);

    if (USE_BHASHINI_BACKEND) {
      startMediaRecorder();
    } else {
      restartWakeWordListening();
    }
  }, [voiceState, isSupported, startWaveAnimation, startMediaRecorder, restartWakeWordListening]);

  // ── Derived visual properties ──────────────────────────────────────────────
  const stateConfig = useMemo(() => ({
    idle: {
      orbColor: 'rgba(142,182,155,0.15)',
      ringColor: 'rgba(142,182,155,0.3)',
      glowColor: 'rgba(142,182,155,0.2)',
      label: 'Listening for "Mei Arivu"',
      pulseClass: 'voice-orb-idle',
    },
    active: {
      orbColor: 'rgba(142,182,155,0.9)',
      ringColor: 'rgba(218,241,222,0.8)',
      glowColor: 'rgba(142,182,155,0.6)',
      label: 'Speak your query...',
      pulseClass: 'voice-orb-active',
    },
    processing: {
      orbColor: 'rgba(251,146,60,0.7)',
      ringColor: 'rgba(251,146,60,0.4)',
      glowColor: 'rgba(251,146,60,0.3)',
      label: 'Processing query...',
      pulseClass: 'voice-orb-processing',
    },
    speaking: {
      orbColor: 'rgba(96,165,250,0.7)',
      ringColor: 'rgba(96,165,250,0.4)',
      glowColor: 'rgba(96,165,250,0.3)',
      label: 'Speaking response...',
      pulseClass: 'voice-orb-speaking',
    },
    error: {
      orbColor: 'rgba(244,63,94,0.5)',
      ringColor: 'rgba(244,63,94,0.3)',
      glowColor: 'rgba(244,63,94,0.2)',
      label: isSupported ? 'Voice error — tap to retry' : 'Voice not supported',
      pulseClass: 'voice-orb-error',
    },
  }), [isSupported]);

  const cfg = stateConfig[voiceState] ?? stateConfig.idle;
  const langObj = LANGUAGES.find((l) => l.code === selectedLang) ?? LANGUAGES[0];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: '16rem', // Offset for sidebar (ml-64 = 16rem) - assuming sidebar is visible. In print it's hidden but voice is hidden too.
        right: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
      aria-label="Mei Arivu Voice Assistant"
      role="region"
    >
      {/* ── Terminal Panel ── */}
      {isExpanded && (
        <div
          className="voice-panel"
          style={{
            pointerEvents: 'all',
            width: '100%',
            height: '240px',
            background: 'rgba(3, 15, 16, 0.95)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(142,182,155,0.3)',
            padding: '24px 48px',
            boxShadow: `0 -10px 40px rgba(0,0,0,0.8), 0 0 32px ${cfg.glowColor}`,
            animation: 'voiceTerminalUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
            display: 'flex',
            gap: '32px'
          }}
          role="status"
          aria-live="polite"
        >
          {/* Left Column: State & Mic Info */}
          <div style={{ flex: '0 0 250px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: cfg.orbColor,
                    boxShadow: `0 0 12px ${cfg.glowColor}`,
                    animation: voiceState === 'active' ? 'voiceDotPulse 0.8s ease-in-out infinite' : 'none',
                  }}
                />
                <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                  MEI ARIVU TERMINAL
                </span>
              </div>
            </div>

            {/* State label */}
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '14px', color: cfg.orbColor, marginBottom: '16px', fontWeight: 500, transition: 'color 0.4s ease' }}>
              {cfg.label}
            </p>

            {/* Waveform bars */}
            {(voiceState === 'active' || voiceState === 'speaking') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '48px', marginBottom: '16px' }}>
                {waveAmplitudes.map((amp, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      borderRadius: '4px',
                      background: cfg.orbColor,
                      height: `${Math.round(amp * 48)}px`,
                      transition: 'height 0.12s ease, background 0.4s ease',
                      boxShadow: `0 0 10px ${cfg.glowColor}`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Processing spinner */}
            {voiceState === 'processing' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{
                  width: '24px', height: '24px',
                  border: `3px solid rgba(251,146,60,0.3)`,
                  borderTop: `3px solid rgba(251,146,60,0.9)`,
                  borderRadius: '50%',
                  animation: 'voiceSpin 0.8s linear infinite',
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: '13px', color: 'rgba(251,146,60,0.9)', fontFamily: "'Outfit', sans-serif" }}>
                  Querying AI engine...
                </span>
              </div>
            )}
            
            <div style={{ marginTop: 'auto', display: 'flex', gap: '6px' }}>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLang(lang.code)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: selectedLang === lang.code ? '1px solid rgba(142,182,155,0.6)' : '1px solid rgba(142,182,155,0.15)',
                    background: selectedLang === lang.code ? 'rgba(142,182,155,0.18)' : 'transparent',
                    color: selectedLang === lang.code ? 'var(--accent)' : 'var(--text-faint)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Console Output */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleDismiss}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '16px' }}>
              {/* Live transcript */}
              {transcript && (
                <div style={{ background: 'rgba(142,182,155,0.06)', borderLeft: '3px solid rgba(142,182,155,0.5)', padding: '12px 16px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>User Request</p>
                  <p style={{ fontSize: '16px', color: 'var(--text-primary)', fontFamily: "monospace" }}>{transcript}</p>
                </div>
              )}

              {/* AI response */}
              {aiResponse && (
                <div style={{ background: 'rgba(96,165,250,0.06)', borderLeft: '3px solid rgba(96,165,250,0.5)', padding: '12px 16px' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(96,165,250,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Groq AI Output</p>
                  <p style={{ fontSize: '16px', color: 'var(--text-primary)', fontFamily: "monospace", whiteSpace: 'pre-wrap' }}>{aiResponse}</p>
                </div>
              )}
              
              {!transcript && !aiResponse && (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontFamily: 'monospace' }}>
                  $ waiting for vocal input...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Orb Button ── */}
      <div
        style={{ pointerEvents: 'all', position: 'absolute', bottom: isExpanded ? '212px' : '28px', right: '28px', transition: 'bottom 0.4s cubic-bezier(0.16,1,0.3,1)' }}
        title={cfg.label}
      >
        {/* Bioluminescent outer ring — only in active state */}
        {voiceState === 'active' && (
          <>
            <div className="voice-bio-ring voice-bio-ring-1" style={{ '--ring-color': cfg.ringColor }} />
            <div className="voice-bio-ring voice-bio-ring-2" style={{ '--ring-color': cfg.ringColor }} />
            <div className="voice-bio-ring voice-bio-ring-3" style={{ '--ring-color': cfg.ringColor }} />
          </>
        )}

        {/* Speaking ripple */}
        {voiceState === 'speaking' && (
          <div className="voice-speaking-ripple" style={{ '--ring-color': 'rgba(96,165,250,0.4)' }} />
        )}

        {/* Core orb button */}
        <button
          id="voice-controller-orb"
          aria-label={`Voice assistant — ${cfg.label}`}
          aria-pressed={voiceState === 'active'}
          onClick={() => {
            if (voiceState === 'idle' || voiceState === 'error') {
              setIsExpanded((prev) => !prev);
              if (!isExpanded) handleManualActivate();
            } else if (voiceState === 'active') {
              // Tap again to cancel
              handleDismiss();
            } else {
              setIsExpanded((prev) => !prev);
            }
          }}
          className={cfg.pulseClass}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            border: `2px solid ${cfg.ringColor}`,
            background: `radial-gradient(circle at 35% 35%, ${cfg.orbColor} 0%, rgba(5,31,32,0.95) 70%)`,
            cursor: 'pointer',
            position: 'relative',
            zIndex: 2,
            boxShadow: `0 0 20px ${cfg.glowColor}, 0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)`,
            transition: 'background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Mic icon */}
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke={voiceState === 'active' ? '#051F20' : cfg.orbColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transition: 'stroke 0.4s ease', filter: voiceState === 'active' ? 'none' : `drop-shadow(0 0 4px ${cfg.glowColor})` }}
          >
            <rect x="9" y="2" width="6" height="12" rx="3"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
            <line x1="8" y1="22" x2="16" y2="22"/>
          </svg>

          {/* Processing spinner overlay */}
          {voiceState === 'processing' && (
            <div style={{
              position: 'absolute',
              inset: '-4px',
              borderRadius: '50%',
              border: '2px solid transparent',
              borderTop: '2px solid rgba(251,146,60,0.9)',
              animation: 'voiceSpin 0.8s linear infinite',
            }} />
          )}
        </button>

        {/* Language pill — always visible */}
        <div style={{
          position: 'absolute',
          bottom: '-2px',
          right: '-2px',
          background: 'rgba(5,31,32,0.95)',
          border: `1px solid ${cfg.ringColor}`,
          borderRadius: '10px',
          padding: '1px 6px',
          fontSize: '9px',
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 700,
          color: cfg.orbColor,
          letterSpacing: '0.05em',
          lineHeight: '16px',
          pointerEvents: 'none',
          transition: 'color 0.4s ease, border-color 0.4s ease',
        }}>
          {langObj.label}
        </div>
      </div>
    </div>
  );
}
