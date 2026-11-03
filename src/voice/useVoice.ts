import { useCallback, useEffect, useRef, useState } from 'react';

type RecognitionResult = { transcript: string; isFinal: boolean };
type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionConstructor = new () => RecognitionLike;

declare global { interface Window { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor; } }

export function useVoice(onResult: (result: RecognitionResult) => void) {
  const recognition = useRef<RecognitionLike | null>(null);
  const [isListening, setListening] = useState(false);
  const supported = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => window.nexus.onNativeVoiceEvent((event) => {
    if (event.type === 'transcript' && event.text) onResult({ transcript: event.text, isFinal: true });
    if (event.type === 'error' || event.type === 'ended') setListening(false);
  }), [onResult]);

  const startListening = useCallback(() => {
    const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Constructor) { void window.nexus.startNativeVoice(); setListening(true); return; }
    const next = new Constructor();
    next.lang = 'en-IN'; next.interimResults = true; next.continuous = false;
    next.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result?.[0]?.transcript ?? '';
      onResult({ transcript, isFinal: Boolean((result as unknown as { isFinal?: boolean })?.isFinal) });
    };
    next.onerror = () => setListening(false);
    next.onend = () => setListening(false);
    recognition.current = next; next.start(); setListening(true);
  }, [onResult]);

  const stopListening = useCallback(() => { recognition.current?.stop(); void window.nexus.stopNativeVoice(); setListening(false); }, []);
  const speak = useCallback((text: string, onStart?: () => void, onEnd?: () => void) => {
    if (typeof window.speechSynthesis === 'undefined') { onStart?.(); void window.nexus.speakNative(text).finally(() => onEnd?.()); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN'; utterance.rate = 0.98; utterance.pitch = 1.04;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => /en-IN/i.test(voice.lang)) ?? voices.find((voice) => /India/i.test(voice.name)) ?? null;
    utterance.onstart = onStart ?? null; utterance.onend = onEnd ?? null;
    window.speechSynthesis.speak(utterance);
  }, []);
  const stopSpeaking = useCallback(() => { window.speechSynthesis?.cancel(); void window.nexus.stopNativeSpeech(); }, []);
  return { supported: supported || true, isListening, startListening, stopListening, speak, stopSpeaking };
}
