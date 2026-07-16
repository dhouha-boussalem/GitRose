import type { Task } from '../types/task';

interface ReminderToastProps {
  tasks: Task[];
  onDismiss: () => void;
}

export function ReminderToast({ tasks, onDismiss }: ReminderToastProps) {
  if (tasks.length === 0) return null;

  return (
    <div className="toast-stack">
      <div className="toast">
        <strong>Rappel{tasks.length > 1 ? 's' : ''}</strong>
        <ul>
          {tasks.map((task) => (
            <li key={task.id}>{task.title}</li>
          ))}
        </ul>
        <button type="button" className="btn-icon" onClick={onDismiss} aria-label="Fermer">
          ✕
        </button>
      </div>
    </div>
  );
}
