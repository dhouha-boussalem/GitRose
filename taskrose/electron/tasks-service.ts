import { app } from 'electron';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  priority: Priority;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
  notifiedAt: string | null;
}

export type TaskInput = Pick<Task, 'title' | 'description' | 'dueDate' | 'priority'>;

function getTasksFilePath(): string {
  return path.join(app.getPath('userData'), 'tasks.json');
}

function readTasksFromDisk(): Task[] {
  const filePath = getTasksFilePath();
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTasksToDisk(tasks: Task[]): void {
  const filePath = getTasksFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2), 'utf-8');
}

export const TasksService = {
  list(): Task[] {
    return readTasksFromDisk().sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  },

  add(input: TaskInput): Task {
    const tasks = readTasksFromDisk();
    const task: Task = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
      priority: input.priority,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
      notifiedAt: null,
    };
    tasks.push(task);
    writeTasksToDisk(tasks);
    return task;
  },

  update(id: string, input: TaskInput): Task | null {
    const tasks = readTasksFromDisk();
    const task = tasks.find((t) => t.id === id);
    if (!task) return null;
    task.title = input.title;
    task.description = input.description;
    task.dueDate = input.dueDate;
    task.priority = input.priority;
    task.notifiedAt = null;
    writeTasksToDisk(tasks);
    return task;
  },

  toggleComplete(id: string): Task | null {
    const tasks = readTasksFromDisk();
    const task = tasks.find((t) => t.id === id);
    if (!task) return null;
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;
    writeTasksToDisk(tasks);
    return task;
  },

  remove(id: string): void {
    const tasks = readTasksFromDisk().filter((t) => t.id !== id);
    writeTasksToDisk(tasks);
  },

  dueReminders(): Task[] {
    const now = new Date().toISOString();
    const tasks = readTasksFromDisk();
    const due = tasks.filter(
      (t) => !t.completed && t.dueDate && t.dueDate <= now && !t.notifiedAt
    );
    if (due.length > 0) {
      for (const task of due) {
        task.notifiedAt = new Date().toISOString();
      }
      writeTasksToDisk(tasks);
    }
    return due;
  },
};
