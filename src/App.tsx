import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CalendarDays, Check, ChevronDown, CircleHelp, Command, Headphones, Home, Keyboard, MessageCircle, Mic, Minimize2, MoreHorizontal, Moon, Play, Plus, Send, Settings, Sparkles, SquareArrowOutUpRight, TimerReset, Volume2, X } from 'lucide-react';
import { CharacterScene } from './components/CharacterScene';
import { FocusTimer } from './components/FocusTimer';
import { TaskRow } from './components/TaskRow';
import { parseCommand, type Intent } from './ai/commandParser';
import { useVoice } from './voice/useVoice';
import { taskDefaults, useNexusStore } from './store/useNexusStore';
import type { Task } from './types';
import './styles.css';

const dateLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });
type ChatMessage = { from: 'user' | 'nexus'; text: string };

function App() {
  const { tasks, settings, mode, mood, speaking, transcript, hydrated, hydrate, addTask, toggleTask, deleteTask, updateSettings, setMode, setMood, setSpeaking, setTranscript } = useNexusStore();
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'work' | 'study' | 'personal' | 'health'>('personal');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newDueAt, setNewDueAt] = useState('');
  const [newReminderAt, setNewReminderAt] = useState('');
  const [newRecurrence, setNewRecurrence] = useState<'none' | 'daily' | 'weekly'>('none');
  const [activeNav, setActiveNav] = useState('today');
  const [toast, setToast] = useState('');
  const [lastReminder, setLastReminder] = useState<string | null>(null);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{ from: 'nexus', text: 'Hi — I’m here. Ask me about your tasks or tell me what you need.' }]);

  useEffect(() => { void hydrate(); }, [hydrate]);
  useEffect(() => window.nexus.onWindowModeChanged(setMode), [setMode]);
  useEffect(() => { void window.nexus.setAlwaysOnTop(settings.alwaysOnTop); }, [settings.alwaysOnTop]);
  useEffect(() => { void window.nexus.setLaunchAtStartup(settings.launchAtStartup); }, [settings.launchAtStartup]);

  const today = new Date();
  const todayKey = today.toDateString();
  const todaysTasks = useMemo(() => tasks.filter((task) => !task.dueAt || new Date(task.dueAt).toDateString() === todayKey), [tasks, todayKey]);
  const pending = todaysTasks.filter((task) => !task.completed);
  const completed = todaysTasks.filter((task) => task.completed);
  const progress = todaysTasks.length ? Math.round((completed.length / todaysTasks.length) * 100) : 0;
  const nextTask = [...pending].sort((a, b) => Number(b.priority === 'high') - Number(a.priority === 'high'))[0];

  const say = useCallback((message: string) => {
    setToast(message); setChatMessages((messages) => [...messages, { from: 'nexus' as const, text: message }].slice(-8)); setSpeaking(true); setMood('wave');
    window.setTimeout(() => { setToast(''); setMood('idle'); }, 3200);
    voice.speak(message, undefined, () => { setSpeaking(false); setMood('idle'); });
  // voice is intentionally referenced through the stable object below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleIntent = useCallback(async (intent: Intent) => {
    if (intent.type === 'list-tasks') { say(pending.length ? `You have ${pending.length} task${pending.length === 1 ? '' : 's'} today. ${pending[0].title} is up next.` : 'You are all clear for today. Lovely work.'); return; }
    if (intent.type === 'next-task') { say(nextTask ? `I suggest ${nextTask.title}. It is the best next step from here.` : 'You have no pending tasks today. Take the win.'); return; }
    if (intent.type === 'focus') { setFocusMinutes(intent.minutes); setMood('focus'); say(`Starting a ${intent.minutes}-minute focus session. I will keep the room calm.`); return; }
    if (intent.type === 'complete-task') {
      const match = tasks.find((task) => task.title.toLowerCase().includes(intent.query.toLowerCase()));
      if (match) { await toggleTask(match.id); setMood('celebrate'); say(`Nice. I marked ${match.title} complete.`); window.setTimeout(() => setMood('idle'), 3200); }
      else say(`I could not find a task matching ${intent.query || 'that'}.`);
      return;
    }
    if (intent.type === 'create-task') { const task = await addTask({ ...taskDefaults, title: intent.title, dueAt: intent.dueAt, category: intent.category, priority: intent.priority }); say(`Got it. I added ${task.title}${task.dueAt ? ` for ${new Date(task.dueAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}.`); return; }
    if (intent.type === 'unknown') {
      const lower = intent.text.toLowerCase();
      if (/^(hi|hello|hey|good morning|good evening)\b/.test(lower)) say('Hello. I am right here with you. What should we take care of?');
      else if (/how are you|how do you feel/.test(lower)) say('Charged, curious, and ready to help. How is your day feeling?');
      else say('I can remember tasks, find your next step, or start a focus session. Try asking what you need to do today.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, nextTask, tasks, toggleTask, addTask, say]);

  const onTranscript = useCallback(({ transcript: next, isFinal }: { transcript: string; isFinal: boolean }) => { setTranscript(next); if (isFinal) { void handleIntent(parseCommand(next)); setTranscript(''); } }, [handleIntent, setTranscript]);
  const voice = useVoice(onTranscript);

  useEffect(() => {
    if (!hydrated) return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      const reminder = tasks.find((task) => !task.completed && task.reminderAt && Math.abs(new Date(task.reminderAt).getTime() - now) < 30000 && task.id !== lastReminder);
      if (reminder && !settings.quietHours) { setLastReminder(reminder.id); setMood('wave'); void window.nexus.showNotification('NEXUS reminder', reminder.title); say(`A quick reminder: ${reminder.title}.`); }
    }, 30000);
    return () => window.clearInterval(interval);
  }, [hydrated, tasks, settings.quietHours, lastReminder, say, setMood]);

  const addQuickTask = async () => { if (!newTitle.trim()) return; await addTask({ ...taskDefaults, title: newTitle.trim(), category: newCategory, priority: newPriority, dueAt: newDueAt || null, reminderAt: newReminderAt || null, recurrence: newRecurrence }); setNewTitle(''); setNewDueAt(''); setNewReminderAt(''); setNewRecurrence('none'); setNewPriority('medium'); setNewCategory('personal'); setShowAdd(false); say('Added. One less thing to hold in your head.'); };
  const sendChat = async () => { const text = chatInput.trim(); if (!text) return; setChatMessages((messages) => [...messages, { from: 'user' as const, text }].slice(-8)); setChatInput(''); await handleIntent(parseCommand(text)); };
  if (!hydrated) return <div className="loading-screen"><div className="nexus-mark">N</div><span>Waking NEXUS…</span></div>;
  if (mode === 'companion') return <div className="companion-shell"><div className="companion-toolbar"><span className="drag-title">NEXUS</span><button className="icon-button" onClick={() => void window.nexus.setWindowMode('dashboard')}><SquareArrowOutUpRight size={15} /></button><button className="icon-button" onClick={() => void window.nexus.minimize()}><Minimize2 size={15} /></button><button className="icon-button" onClick={() => void window.nexus.close()}><X size={15} /></button></div><div className="companion-character"><CharacterScene mood={mood} speaking={speaking} accent={settings.accent} onClick={() => say('At your service.')} /></div>{toast && <div className="companion-toast">{toast}</div>}{chatOpen && <div className="companion-chat-panel"><div className="companion-chat-header"><span><MessageCircle size={14} /> Chat with NEXUS</span><button className="chat-close" onClick={() => setChatOpen(false)}><X size={14} /></button></div><div className="companion-chat-log">{chatMessages.slice(-5).map((message, index) => <div className={`chat-message ${message.from}`} key={`${message.from}-${index}`}>{message.text}</div>)}</div><form className="companion-chat-form" onSubmit={(event) => { event.preventDefault(); void sendChat(); }}><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask me anything…" autoFocus /><button type="submit" aria-label="Send message"><Send size={15} /></button></form></div>}<button className="companion-chat-toggle" onClick={() => setChatOpen((open) => !open)}><MessageCircle size={19} /></button><button className={`companion-mic ${voice.isListening ? 'active' : ''}`} onClick={() => voice.isListening ? voice.stopListening() : voice.startListening()}><Mic size={20} /></button></div>;
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-symbol">N</div><div><div className="brand-name">NEXUS</div><div className="brand-subtitle">your little advantage</div></div></div>
      <div className="nav-label">Workspace</div>
      <nav className="main-nav">
        <button className={activeNav === 'today' ? 'active' : ''} onClick={() => setActiveNav('today')}><Home size={18} />Today</button>
        <button className={activeNav === 'calendar' ? 'active' : ''} onClick={() => setActiveNav('calendar')}><CalendarDays size={18} />Calendar<span className="nav-count">{pending.length}</span></button>
        <button className={activeNav === 'focus' ? 'active' : ''} onClick={() => setActiveNav('focus')}><TimerReset size={18} />Focus mode</button>
      </nav>
      <div className="sidebar-bottom"><div className="sync-card"><div className="sync-icon"><Check size={15} /></div><div><strong>All synced</strong><span>Saved on this device</span></div></div><button className="sidebar-setting" onClick={() => setShowSettings(true)}><Settings size={17} />Settings</button><button className="sidebar-setting"><CircleHelp size={17} />Help center</button><div className="profile-row"><div className="avatar">R</div><div><strong>RBSMANIAN</strong><span>Personal space</span></div><ChevronDown size={15} /></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{activeNav === 'today' ? 'Today' : activeNav === 'focus' ? 'Focus mode' : 'Calendar'}</strong></div><div className="top-actions"><button className="voice-pill" onClick={() => voice.isListening ? voice.stopListening() : voice.startListening()}><span className={`voice-orb ${voice.isListening ? 'listening' : ''}`}><Mic size={15} /></span>{voice.isListening ? 'Listening…' : voice.supported ? 'Talk to NEXUS' : 'Voice unavailable'}<span className="shortcut">⌘ K</span></button><button className="icon-button" onClick={() => setShowSettings(true)}><Settings size={18} /></button><button className="icon-button" onClick={() => void window.nexus.minimize()}><Minimize2 size={17} /></button><button className="icon-button" onClick={() => void window.nexus.close()}><X size={17} /></button></div></header>
      <div className="content-grid">
        <section className="left-column">
          <div className="greeting"><div><div className="eyebrow">{dateLabel.format(today).toUpperCase()}</div><h1>Good morning, <em>RBSMANIAN</em></h1><p>{pending.length ? <>You have <strong>{pending.length} things</strong> worth your attention today. Let’s make them feel lighter.</> : <>Your day is clear. That is a beautiful place to begin.</>}</p></div><button className="primary-button" onClick={() => setShowAdd(true)}><Plus size={18} />New task</button></div>
          {transcript && <div className="transcript-strip"><div className="live-dot" />{transcript}<span>Listening</span></div>}
          <div className="progress-card"><div className="progress-top"><div><span className="eyebrow">TODAY'S RHYTHM</span><div className="progress-number">{progress}<span>%</span></div></div><div className="progress-copy"><strong>{progress === 100 ? 'A complete little day.' : progress > 50 ? 'You are in the flow.' : 'A gentle start is enough.'}</strong><span>{completed.length} of {todaysTasks.length} tasks complete</span></div><div className="progress-ring" style={{ '--ring': `${progress * 3.6}deg` } as React.CSSProperties}><span>{completed.length}<small>/{todaysTasks.length}</small></span></div></div><div className="progress-track"><div style={{ width: `${progress}%` }} /></div></div>
          <div className="section-heading"><div><span className="eyebrow">YOUR AGENDA</span><h2>{activeNav === 'focus' ? 'The next best thing' : 'Today'}</h2></div><button className="filter-button">All tasks <ChevronDown size={15} /></button></div>
          <div className="task-list">{todaysTasks.length ? todaysTasks.map((task) => <TaskRow key={task.id} task={task} onToggle={() => { void toggleTask(task.id); if (!task.completed) { setMood('celebrate'); say('That is done. Nicely handled.'); } }} onDelete={() => void deleteTask(task.id)} />) : <div className="empty-state"><Sparkles size={22} /><strong>No tasks yet</strong><span>Add one small thing and let NEXUS keep it safe.</span></div>}</div>
          <div className="below-grid"><FocusTimer initialMinutes={focusMinutes} onComplete={() => { setMood('celebrate'); say('Focus block complete. You did the thing.'); }} /><div className="voice-card"><div className="voice-card-top"><div className="voice-icon"><Volume2 size={19} /></div><span className="eyebrow">VOICE BRIEFING</span></div><h3>{settings.personality === 'playful' ? 'Your tiny co-pilot is ready.' : 'Say it. I’ll remember.'}</h3><p>Ask for your agenda, add a reminder, or start a focus block.</p><button className="text-button" onClick={() => voice.isListening ? voice.stopListening() : voice.startListening()}><Keyboard size={15} />Press to talk <span>→</span></button></div></div>
        </section>
        <aside className="right-column"><div className="character-card"><div className="character-card-header"><div><span className="eyebrow">YOUR COMPANION</span><h2>NEXUS <span className="online-dot" /></h2></div><button className="icon-button glass" onClick={() => void window.nexus.setWindowMode('companion')}><SquareArrowOutUpRight size={17} /></button></div><div className="character-stage"><CharacterScene mood={mood} speaking={speaking} accent={settings.accent} onClick={() => say('I am listening.')} /><div className="character-bubble">{toast || (mood === 'celebrate' ? 'That deserves a little dance.' : mood === 'focus' ? 'Quiet focus, coming right up.' : 'What would make today feel lighter?')}</div></div><div className="character-footer"><div className="mood-chip"><span className="mood-dot" />{mood === 'idle' ? 'Feeling ready' : mood === 'wave' ? 'Checking in' : mood === 'sleep' ? 'Do not disturb' : mood}</div><button className="mic-button" onClick={() => voice.isListening ? voice.stopListening() : voice.startListening()}><Mic size={17} /></button></div></div><div className="next-card"><div className="next-card-top"><span className="eyebrow">UP NEXT</span><MoreHorizontal size={17} /></div>{nextTask ? <><h3>{nextTask.title}</h3><div className="next-meta"><span className={`category-dot ${nextTask.category}`} />{nextTask.category}<span>·</span>{nextTask.dueAt ? new Date(nextTask.dueAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'no deadline'}</div></> : <h3>Nothing pressing. Breathe.</h3>}<div className="next-divider" /><div className="reminder-line"><Bell size={15} /><span>{tasks.filter((task) => task.reminderAt && !task.completed).length} upcoming reminders</span><button className="arrow-button">→</button></div></div></aside>
      </div>
    </main>
    {showAdd && <div className="modal-backdrop" onClick={() => setShowAdd(false)}><div className="modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">NEW MEMORY</span><h2>What needs your attention?</h2></div><button className="icon-button" onClick={() => setShowAdd(false)}><X size={18} /></button></div><input autoFocus value={newTitle} onChange={(event) => setNewTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void addQuickTask(); }} placeholder="e.g. Review physics notes" /><div className="form-grid"><label><span>Category</span><select value={newCategory} onChange={(event) => setNewCategory(event.target.value as typeof newCategory)}><option value="personal">Personal</option><option value="work">Work</option><option value="study">Study</option><option value="health">Health</option></select></label><label><span>Priority</span><select value={newPriority} onChange={(event) => setNewPriority(event.target.value as typeof newPriority)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label><span>Due date</span><input type="datetime-local" value={newDueAt} onChange={(event) => setNewDueAt(event.target.value)} /></label><label><span>Reminder</span><input type="datetime-local" value={newReminderAt} onChange={(event) => setNewReminderAt(event.target.value)} /></label><label><span>Repeat</span><select value={newRecurrence} onChange={(event) => setNewRecurrence(event.target.value as typeof newRecurrence)}><option value="none">Does not repeat</option><option value="daily">Every day</option><option value="weekly">Every week</option></select></label></div><div className="modal-actions"><button className="ghost-button" onClick={() => setShowAdd(false)}>Cancel</button><button className="primary-button" onClick={() => void addQuickTask()}><Plus size={17} />Add task</button></div></div></div>}
    {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><div className="modal settings-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">NEXUS CONTROL</span><h2>Settings</h2></div><button className="icon-button" onClick={() => setShowSettings(false)}><X size={18} /></button></div><label className="setting-row"><span><strong>Launch with Windows</strong><small>Let NEXUS greet you when your day begins.</small></span><input type="checkbox" checked={settings.launchAtStartup} onChange={(event) => void updateSettings({ launchAtStartup: event.target.checked })} /></label><label className="setting-row"><span><strong>Always on top</strong><small>Keep your companion visible above other windows.</small></span><input type="checkbox" checked={settings.alwaysOnTop} onChange={(event) => void updateSettings({ alwaysOnTop: event.target.checked })} /></label><label className="setting-row"><span><strong>Quiet hours</strong><small>Pause proactive reminders and let NEXUS sleep.</small></span><input type="checkbox" checked={settings.quietHours} onChange={(event) => { void updateSettings({ quietHours: event.target.checked }); setMood(event.target.checked ? 'sleep' : 'idle'); }} /></label><div className="setting-select"><span><strong>Personality</strong><small>Choose the tone you want in your corner.</small></span><select value={settings.personality} onChange={(event) => void updateSettings({ personality: event.target.value as typeof settings.personality })}><option value="warm">Warm & steady</option><option value="focused">Focused & concise</option><option value="playful">Playful & bright</option></select></div><div className="modal-actions"><button className="primary-button" onClick={() => setShowSettings(false)}>Done</button></div></div></div>}
  </div>;
}

export default App;
