import { create } from 'zustand';
import type { PersistedState, Settings, Task, TaskCategory, TaskPriority, Recurrence, CharacterMood } from '../types';

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

type NexusStore = PersistedState & {
  hydrated: boolean;
  mode: 'dashboard' | 'companion';
  mood: CharacterMood;
  speaking: boolean;
  transcript: string;
  hydrate: () => Promise<void>;
  setMode: (mode: 'dashboard' | 'companion') => void;
  setMood: (mood: CharacterMood) => void;
  setSpeaking: (speaking: boolean) => void;
  setTranscript: (transcript: string) => void;
  addTask: (input: Pick<Task, 'title'> & Partial<Omit<Task, 'id' | 'title' | 'createdAt' | 'completed' | 'completedAt'>>) => Promise<Task>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
};

const persist = (state: NexusStore): Promise<void> => window.nexus.saveState({ tasks: state.tasks, settings: state.settings }).then(() => undefined);

export const useNexusStore = create<NexusStore>((set, get) => ({
  tasks: [],
  settings: { quietHours: false, launchAtStartup: false, alwaysOnTop: true, personality: 'warm', accent: '#bf815d' },
  hydrated: false,
  mode: 'companion',
  mood: 'idle',
  speaking: false,
  transcript: '',
  hydrate: async () => {
    const state = await window.nexus.loadState();
    set({ ...state, hydrated: true });
  },
  setMode: (mode) => set({ mode }),
  setMood: (mood) => set({ mood }),
  setSpeaking: (speaking) => set({ speaking }),
  setTranscript: (transcript) => set({ transcript }),
  addTask: async (input) => {
    const task: Task = {
      id: newId(), title: input.title, notes: input.notes ?? '', category: input.category ?? 'personal', priority: input.priority ?? 'medium',
      dueAt: input.dueAt ?? null, reminderAt: input.reminderAt ?? null, recurrence: input.recurrence ?? 'none', completed: false,
      createdAt: new Date().toISOString(), completedAt: null,
    };
    set((state) => ({ tasks: [task, ...state.tasks] }));
    await persist(get());
    return task;
  },
  updateTask: async (id, patch) => { set((state) => ({ tasks: state.tasks.map((task) => task.id === id ? { ...task, ...patch } : task) })); await persist(get()); },
  deleteTask: async (id) => { set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) })); await persist(get()); },
  toggleTask: async (id) => {
    set((state) => ({ tasks: state.tasks.map((task) => task.id === id ? { ...task, completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : null } : task) }));
    await persist(get());
  },
  updateSettings: async (patch) => { set((state) => ({ settings: { ...state.settings, ...patch } })); await persist(get()); },
}));

export const taskDefaults: Pick<Task, 'notes' | 'category' | 'priority' | 'dueAt' | 'reminderAt' | 'recurrence'> = {
  notes: '', category: 'personal' as TaskCategory, priority: 'medium' as TaskPriority, dueAt: null, reminderAt: null, recurrence: 'none' as Recurrence,
};
