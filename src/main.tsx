import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import type { PersistedState } from './types';

// Vercel hosts the browser preview, while Electron supplies the real desktop API.
// This fallback keeps the web preview usable without pretending it is the Windows app.
if (typeof window !== 'undefined' && !window.nexus) {
  const listeners = new Set<(mode: 'dashboard' | 'companion') => void>();
  const fallbackState: PersistedState = { tasks: [], settings: { quietHours: false, launchAtStartup: false, alwaysOnTop: true, personality: 'warm', accent: '#bf815d' } };
  const loadLocalState = (): PersistedState => {
    try { return { ...fallbackState, ...JSON.parse(window.localStorage.getItem('nexus-web-state') ?? '{}') } as PersistedState; } catch { return fallbackState; }
  };
  window.nexus = {
    loadState: async () => loadLocalState(),
    saveState: async (state) => { window.localStorage.setItem('nexus-web-state', JSON.stringify(state)); return state; },
    setWindowMode: async (mode) => { listeners.forEach((listener) => listener(mode)); return mode === 'companion'; },
    minimize: async () => undefined,
    close: async () => undefined,
    setAlwaysOnTop: async (enabled) => enabled,
    setIgnoreMouseEvents: async (enabled) => enabled,
    setLaunchAtStartup: async (enabled) => enabled,
    showNotification: async (title, body) => { if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body }); },
    startNativeVoice: async () => false,
    stopNativeVoice: async () => true,
    speakNative: async () => false,
    stopNativeSpeech: async () => true,
    onNativeVoiceEvent: () => () => undefined,
    onWindowModeChanged: (callback) => { listeners.add(callback); return () => listeners.delete(callback); },
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
