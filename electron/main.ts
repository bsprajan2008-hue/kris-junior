import { app, BrowserWindow, ipcMain, Notification, screen, shell } from 'electron';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

type Task = {
  id: string;
  title: string;
  notes: string;
  category: 'work' | 'study' | 'personal' | 'health';
  priority: 'low' | 'medium' | 'high';
  dueAt: string | null;
  reminderAt: string | null;
  recurrence: 'none' | 'daily' | 'weekly';
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
};

type PersistedState = {
  tasks: Task[];
  settings: {
    quietHours: boolean;
    launchAtStartup: boolean;
    alwaysOnTop: boolean;
    personality: 'warm' | 'focused' | 'playful';
    accent: string;
  };
};

const isDev = process.argv.includes('--dev');
let mainWindow: BrowserWindow | null = null;
// NEXUS is a desktop companion first. The productivity dashboard is an on-demand view.
let companionMode = true;
let ignoreMouse = false;
let savedState: PersistedState | null = null;
let nativeRecognizer: ChildProcessWithoutNullStreams | null = null;
let nativeSpeaker: ChildProcessWithoutNullStreams | null = null;

function encodePowerShell(script: string) {
  return Buffer.from(script, 'utf16le').toString('base64');
}

const nativeRecognitionScript = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Speech
$recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
$recognizer.SetInputToDefaultAudioDevice()
$recognizer.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))
$recognizer.add_SpeechRecognized({ param($sender, $event) [Console]::WriteLine($event.Result.Text) })
$recognizer.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)
while ($true) { Start-Sleep -Milliseconds 200 }
`;

function startNativeRecognition() {
  if (nativeRecognizer) return true;
  const child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', encodePowerShell(nativeRecognitionScript)], { windowsHide: true });
  nativeRecognizer = child;
  let buffer = '';
  child.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString('utf8');
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines.map((value) => value.trim()).filter(Boolean)) mainWindow?.webContents.send('voice:nativeEvent', { type: 'transcript', text: line });
  });
  child.stderr.on('data', (chunk: Buffer) => mainWindow?.webContents.send('voice:nativeEvent', { type: 'error', text: chunk.toString('utf8') }));
  child.on('close', () => { nativeRecognizer = null; mainWindow?.webContents.send('voice:nativeEvent', { type: 'ended' }); });
  return true;
}

function stopNativeRecognition() {
  nativeRecognizer?.kill();
  nativeRecognizer = null;
}

function speakWithWindows(text: string) {
  nativeSpeaker?.kill();
  const script = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$text = [Console]::In.ReadToEnd()
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speaker.Speak($text)
$speaker.Dispose()
`;
  const child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', encodePowerShell(script)], { windowsHide: true });
  nativeSpeaker = child;
  child.stdin.write(text.slice(0, 2000));
  child.stdin.end();
  child.on('close', () => { nativeSpeaker = null; });
  return true;
}

const defaultState: PersistedState = {
  tasks: [
    { id: 'welcome', title: 'Make NEXUS yours', notes: 'Try the voice button or add your first task.', category: 'personal', priority: 'medium', dueAt: new Date().toISOString(), reminderAt: null, recurrence: 'none', completed: false, createdAt: new Date().toISOString(), completedAt: null },
    { id: 'focus', title: 'Plan one focused block', notes: 'A small win is still a win.', category: 'work', priority: 'high', dueAt: new Date(Date.now() + 86400000).toISOString(), reminderAt: null, recurrence: 'none', completed: false, createdAt: new Date().toISOString(), completedAt: null },
  ],
  settings: { quietHours: false, launchAtStartup: false, alwaysOnTop: true, personality: 'warm', accent: '#bf815d' },
};

function dataPath() {
  return path.join(app.getPath('userData'), 'nexus-data.json');
}

async function loadState(): Promise<PersistedState> {
  if (savedState) return savedState;
  try {
    const raw = await fs.readFile(dataPath(), 'utf8');
    savedState = { ...defaultState, ...JSON.parse(raw) };
  } catch {
    savedState = defaultState;
    await saveState(savedState);
  }
  return savedState ?? defaultState;
}

async function saveState(next: PersistedState) {
  savedState = next;
  const target = dataPath();
  const temp = `${target}.tmp`;
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(temp, JSON.stringify(next, null, 2), 'utf8');
  await fs.rename(temp, target);
}

function createWindow() {
  const workArea = screen.getPrimaryDisplay().workArea;
  const initialBounds = companionMode
    ? { width: 300, height: 390, x: workArea.x + workArea.width - 330, y: workArea.y + workArea.height - 430 }
    : { width: 1280, height: 840 };
  mainWindow = new BrowserWindow({
    ...initialBounds,
    minWidth: companionMode ? 240 : 1020,
    minHeight: companionMode ? 300 : 700,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: companionMode,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) mainWindow.loadURL('http://127.0.0.1:5173');
  else mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.webContents.send('window:modeChanged', companionMode ? 'companion' : 'dashboard');
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function applyCompanionMode() {
  if (!mainWindow) return;
  if (companionMode) {
    const display = screen.getPrimaryDisplay();
    const area = display.workArea;
    mainWindow.setMinimumSize(240, 300);
    mainWindow.setSize(300, 390);
    mainWindow.setPosition(area.x + area.width - 330, area.y + area.height - 430);
    mainWindow.setAlwaysOnTop(true, 'floating');
    mainWindow.setSkipTaskbar(true);
  } else {
    mainWindow.setMinimumSize(1020, 700);
    mainWindow.setSize(1280, 840);
    mainWindow.center();
    mainWindow.setSkipTaskbar(false);
  }
  mainWindow.webContents.send('window:modeChanged', companionMode ? 'companion' : 'dashboard');
}

function registerIpc() {
  ipcMain.handle('data:load', () => loadState());
  ipcMain.handle('data:save', async (_event, next: PersistedState) => { await saveState(next); return next; });
  ipcMain.handle('window:setMode', (_event, mode: 'dashboard' | 'companion') => { companionMode = mode === 'companion'; applyCompanionMode(); return companionMode; });
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:close', () => mainWindow?.close());
  ipcMain.handle('window:setAlwaysOnTop', (_event, enabled: boolean) => { mainWindow?.setAlwaysOnTop(enabled); return enabled; });
  ipcMain.handle('window:setIgnoreMouseEvents', (_event, enabled: boolean) => { ignoreMouse = enabled; mainWindow?.setIgnoreMouseEvents(enabled, { forward: true }); return ignoreMouse; });
  ipcMain.handle('window:setLaunchAtStartup', (_event, enabled: boolean) => { app.setLoginItemSettings({ openAtLogin: enabled, path: process.execPath }); return enabled; });
  ipcMain.handle('notification:show', (_event, title: string, body: string) => { if (Notification.isSupported()) new Notification({ title, body }).show(); });
  ipcMain.handle('voice:startNative', () => startNativeRecognition());
  ipcMain.handle('voice:stopNative', () => { stopNativeRecognition(); return true; });
  ipcMain.handle('voice:speakNative', (_event, text: string) => speakWithWindows(text));
  ipcMain.handle('voice:stopNativeSpeech', () => { nativeSpeaker?.kill(); nativeSpeaker = null; return true; });
  ipcMain.handle('shell:openExternal', (_event, url: string) => { if (/^https?:\/\//.test(url)) return shell.openExternal(url); });
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
