import { Check, Clock3, MoreHorizontal, Sparkles } from 'lucide-react';
import type { Task } from '../types';

type Props = { task: Task; onToggle: () => void; onDelete: () => void };

export function TaskRow({ task, onToggle, onDelete }: Props) {
  const due = task.dueAt ? new Date(task.dueAt) : null;
  return (
    <div className={`task-row ${task.completed ? 'is-complete' : ''}`}>
      <button className="check-button" onClick={onToggle} aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}>
        {task.completed ? <Check size={16} strokeWidth={3} /> : <span />}
      </button>
      <div className="task-copy">
        <div className="task-title-line"><span className="task-title">{task.title}</span>{task.priority === 'high' && <Sparkles size={14} className="priority-icon" />}</div>
        <div className="task-meta"><span className={`category-dot ${task.category}`} />{task.category}<span className="meta-separator">·</span>{due ? <><Clock3 size={12} />{due.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</> : 'no due time'}</div>
      </div>
      <button className="icon-button subtle" onClick={onDelete} aria-label="Delete task"><MoreHorizontal size={18} /></button>
    </div>
  );
}
