import type { Task } from '../types/task';

export type TaskGroupKey = 'overdue' | 'today' | 'upcoming' | 'noDate' | 'completed';

export const GROUP_LABELS: Record<TaskGroupKey, string> = {
  overdue: 'En retard',
  today: "Aujourd'hui",
  upcoming: 'À venir',
  noDate: 'Sans échéance',
  completed: 'Terminées',
};

export function groupTasks(tasks: Task[]): Record<TaskGroupKey, Task[]> {
  const groups: Record<TaskGroupKey, Task[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    noDate: [],
    completed: [],
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  for (const task of tasks) {
    if (task.completed) {
      groups.completed.push(task);
      continue;
    }
    if (!task.dueDate) {
      groups.noDate.push(task);
      continue;
    }
    const due = new Date(task.dueDate);
    if (due < startOfToday) groups.overdue.push(task);
    else if (due < startOfTomorrow) groups.today.push(task);
    else groups.upcoming.push(task);
  }

  return groups;
}

export function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return '';
  const date = new Date(dueDate);
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toDatetimeLocalValue(dueDate: string | null): string {
  if (!dueDate) return '';
  const date = new Date(dueDate);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}
