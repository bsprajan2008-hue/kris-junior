import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('nexus', {
  loadState: () => ipcRenderer.invoke('data:load'),
  saveState: (state: unknown) => ipcRenderer.invoke('data:save', state),
  setWindowMode: (mode: 'dashboard' | 'companion') => ipcRenderer.invoke('window:setMode', mode),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
  setAlwaysOnTop: (enabled: boolean) => ipcRenderer.invoke('window:setAlwaysOnTop', enabled),
  setIgnoreMouseEvents: (enabled: boolean) => ipcRenderer.invoke('window:setIgnoreMouseEvents', enabled),
  setLaunchAtStartup: (enabled: boolean) => ipcRenderer.invoke('window:setLaunchAtStartup', enabled),
  showNotification: (title: string, body: string) => ipcRenderer.invoke('notification:show', title, body),
  startNativeVoice: () => ipcRenderer.invoke('voice:startNative'),
  stopNativeVoice: () => ipcRenderer.invoke('voice:stopNative'),
  speakNative: (text: string) => ipcRenderer.invoke('voice:speakNative', text),
  stopNativeSpeech: () => ipcRenderer.invoke('voice:stopNativeSpeech'),
  onNativeVoiceEvent: (callback: (event: { type: 'transcript' | 'error' | 'ended'; text?: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: { type: 'transcript' | 'error' | 'ended'; text?: string }) => callback(payload);
    ipcRenderer.on('voice:nativeEvent', listener);
    return () => ipcRenderer.removeListener('voice:nativeEvent', listener);
  },
  onWindowModeChanged: (callback: (mode: 'dashboard' | 'companion') => void) => {
    const listener = (_event: Electron.IpcRendererEvent, mode: 'dashboard' | 'companion') => callback(mode);
    ipcRenderer.on('window:modeChanged', listener);
    return () => ipcRenderer.removeListener('window:modeChanged', listener);
  },
});
