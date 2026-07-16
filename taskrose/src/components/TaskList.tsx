import type { Task } from '../types/task';
import { GROUP_LABELS, groupTasks, type TaskGroupKey } from '../utils/dates';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const GROUP_ORDER: TaskGroupKey[] = ['overdue', 'today', 'upcoming', 'noDate', 'completed'];

export function TaskList({ tasks, onToggle, onEdit, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <p>Aucune tâche pour le moment.</p>
        <p className="empty-state-hint">Clique sur "+ Nouvelle tâche" pour commencer.</p>
      </div>
    );
  }

  const groups = groupTasks(tasks);

  return (
    <div className="task-groups">
      {GROUP_ORDER.filter((key) => groups[key].length > 0).map((key) => (
        <section key={key} className={`task-group group-${key}`}>
          <h3>
            {GROUP_LABELS[key]} <span className="group-count">{groups[key].length}</span>
          </h3>
          <ul className="task-list">
            {groups[key].map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                isOverdue={key === 'overdue'}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
