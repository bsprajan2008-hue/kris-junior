import { Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

type Props = { initialMinutes?: number; onComplete?: () => void };

export function FocusTimer({ initialMinutes = 25, onComplete }: Props) {
  const [seconds, setSeconds] = useState(initialMinutes * 60);
  const [running, setRunning] = useState(false);
  useEffect(() => { if (!running) return; const id = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000); return () => window.clearInterval(id); }, [running]);
  useEffect(() => { if (running && seconds === 0) { setRunning(false); onComplete?.(); } }, [seconds, running, onComplete]);
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  const progress = seconds / (initialMinutes * 60);
  return <div className="focus-card">
    <div className="focus-heading"><span className="eyebrow">FOCUS MODE</span><span className="timer-progress">{Math.round(progress * 100)}%</span></div>
    <div className="timer-face"><div className="timer-ring" style={{ '--progress': `${progress * 360}deg` } as React.CSSProperties}><span>{minutes}:{remainder}</span></div></div>
    <div className="timer-actions"><button className="primary-button compact" onClick={() => setRunning((value) => !value)}>{running ? <Pause size={15} /> : <Play size={15} />}{running ? 'Pause' : 'Start focus'}</button><button className="ghost-button compact" onClick={() => { setRunning(false); setSeconds(initialMinutes * 60); }}><RotateCcw size={15} /></button></div>
  </div>;
}
