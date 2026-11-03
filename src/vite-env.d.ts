/// <reference types="vite/client" />

declare global {
  interface Window {
    nexus: {
      loadState: () => Promise<import('./types').PersistedState>;
      saveState: (state: import('./types').PersistedState) => Promise<import('./types').PersistedState>;
      setWindowMode: (mode: 'dashboard' | 'companion') => Promise<boolean>;
      minimize: () => Promise<void>;
      close: () => Promise<void>;
      setAlwaysOnTop: (enabled: boolean) => Promise<boolean>;
      setIgnoreMouseEvents: (enabled: boolean) => Promise<boolean>;
      setLaunchAtStartup: (enabled: boolean) => Promise<boolean>;
      showNotification: (title: string, body: string) => Promise<void>;
      startNativeVoice: () => Promise<boolean>;
      stopNativeVoice: () => Promise<boolean>;
      speakNative: (text: string) => Promise<boolean>;
      stopNativeSpeech: () => Promise<boolean>;
      onNativeVoiceEvent: (callback: (event: { type: 'transcript' | 'error' | 'ended'; text?: string }) => void) => () => void;
      onWindowModeChanged: (callback: (mode: 'dashboard' | 'companion') => void) => () => void;
    };
  }
}

export {};
