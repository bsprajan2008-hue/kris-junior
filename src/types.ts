export type TaskCategory = 'work' | 'study' | 'personal' | 'health';
export type TaskPriority = 'low' | 'medium' | 'high';
export type Recurrence = 'none' | 'daily' | 'weekly';

export type Task = {
  id: string;
  title: string;
  notes: string;
  category: TaskCategory;
  priority: TaskPriority;
  dueAt: string | null;
  reminderAt: string | null;
  recurrence: Recurrence;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
};

export type Personality = 'warm' | 'focused' | 'playful';

export type Settings = {
  quietHours: boolean;
  launchAtStartup: boolean;
  alwaysOnTop: boolean;
  personality: Personality;
  accent: string;
};

export type PersistedState = { tasks: Task[]; settings: Settings };

export type CharacterMood = 'idle' | 'thinking' | 'wave' | 'celebrate' | 'sleep' | 'focus';
