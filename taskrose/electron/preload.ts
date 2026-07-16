import { contextBridge, ipcRenderer } from 'electron';
import type { Task, TaskInput } from './tasks-service';

contextBridge.exposeInMainWorld('taskRose', {
  list: (): Promise<Task[]> => ipcRenderer.invoke('tasks:list'),
  add: (input: TaskInput): Promise<Task> => ipcRenderer.invoke('tasks:add', input),
  update: (id: string, input: TaskInput): Promise<Task | null> =>
    ipcRenderer.invoke('tasks:update', id, input),
  toggleComplete: (id: string): Promise<Task | null> =>
    ipcRenderer.invoke('tasks:toggle-complete', id),
  remove: (id: string): Promise<void> => ipcRenderer.invoke('tasks:remove', id),
  onRemindersFired: (callback: (tasks: Task[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, tasks: Task[]) => callback(tasks);
    ipcRenderer.on('tasks:reminders-fired', listener);
    return () => ipcRenderer.removeListener('tasks:reminders-fired', listener);
  },
});
