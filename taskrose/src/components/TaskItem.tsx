import type { Task } from '../types/task';
import { formatDueDate } from '../utils/dates';

interface TaskItemProps {
  task: Task;
  isOverdue: boolean;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const PRIORITY_LABELS: Record<Task['priority'], string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
};

export function TaskItem({ task, isOverdue, onToggle, onEdit, onDelete }: TaskItemProps) {
  return (
    <li className={`task-item priority-${task.priority}${task.completed ? ' completed' : ''}`}>
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        aria-label={`Marquer "${task.title}" comme ${task.completed ? 'à faire' : 'terminée'}`}
      />
      <div className="task-body" onClick={() => onEdit(task)}>
        <div className="task-title-row">
          <span className="task-title">{task.title}</span>
          <span className={`priority-badge priority-${task.priority}`}>
            {PRIORITY_LABELS[task.priority]}
          </span>
        </div>
        {task.description && <p className="task-description">{task.description}</p>}
        {task.dueDate && (
          <span className={`task-due${isOverdue && !task.completed ? ' overdue' : ''}`}>
            {formatDueDate(task.dueDate)}
          </span>
        )}
      </div>
      <button
        type="button"
        className="btn-icon"
        onClick={() => onDelete(task.id)}
        aria-label={`Supprimer "${task.title}"`}
      >
        ✕
      </button>
    </li>
  );
}
