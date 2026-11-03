import type { TaskCategory, TaskPriority } from '../types';

export type Intent =
  | { type: 'list-tasks' }
  | { type: 'next-task' }
  | { type: 'complete-task'; query: string }
  | { type: 'focus'; minutes: number }
  | { type: 'create-task'; title: string; dueAt: string | null; category: TaskCategory; priority: TaskPriority }
  | { type: 'unknown'; text: string };

function parseDueAt(text: string): string | null {
  const now = new Date();
  if (/tomorrow/i.test(text)) { now.setDate(now.getDate() + 1); now.setHours(9, 0, 0, 0); return now.toISOString(); }
  const match = text.match(/(?:at|by)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  now.setHours(hour, minute, 0, 0);
  if (now.getTime() < Date.now()) now.setDate(now.getDate() + 1);
  return now.toISOString();
}

export function parseCommand(raw: string): Intent {
  const text = raw.trim();
  const lower = text.toLowerCase();
  if (/what are my tasks|tasks today|show.*tasks|my agenda/.test(lower)) return { type: 'list-tasks' };
  if (/what should i do next|next task|suggest.*task/.test(lower)) return { type: 'next-task' };
  if (/start.*focus|focus session|pomodoro/.test(lower)) {
    const minutes = Number(lower.match(/(\d+)\s*(?:minute|min)/)?.[1] ?? 25);
    return { type: 'focus', minutes: Math.min(120, Math.max(1, minutes)) };
  }
  if (/completed|finished|done with|mark.*done/.test(lower)) {
    return { type: 'complete-task', query: text.replace(/^(i\s+)?(completed|finished|done with|mark)\s*/i, '').replace(/\s+as done$/i, '').trim() };
  }
  if (/remind me|add task|create task|remember to|todo/i.test(text)) {
    const title = text.replace(/^(hey\s+nexus[,.]?\s*)?(remind me to|remind me|add task|create task|remember to|todo)\s*/i, '').replace(/\s+(?:at|by)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i, '').replace(/\s+tomorrow/i, '').trim();
    const category: TaskCategory = /study|learn|assignment|exam|physics|project/i.test(title) ? 'study' : /work|meeting|report|email/i.test(title) ? 'work' : 'personal';
    const priority: TaskPriority = /urgent|important|deadline|asap/i.test(text) ? 'high' : 'medium';
    return { type: 'create-task', title: title || 'New task', dueAt: parseDueAt(text), category, priority };
  }
  return { type: 'unknown', text };
}
