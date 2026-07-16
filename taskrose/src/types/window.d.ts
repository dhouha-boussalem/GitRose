import type { Task, TaskInput } from './task';

export {};

declare global {
  interface Window {
    taskRose: {
      list: () => Promise<Task[]>;
      add: (input: TaskInput) => Promise<Task>;
      update: (id: string, input: TaskInput) => Promise<Task | null>;
      toggleComplete: (id: string) => Promise<Task | null>;
      remove: (id: string) => Promise<void>;
      onRemindersFired: (callback: (tasks: Task[]) => void) => () => void;
    };
  }
}
