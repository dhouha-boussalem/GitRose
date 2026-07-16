import { useState, type FormEvent } from 'react';
import type { Priority, Task, TaskInput } from '../types/task';
import { toDatetimeLocalValue } from '../utils/dates';

interface TaskFormProps {
  initialTask: Task | null;
  onSubmit: (input: TaskInput) => void;
  onCancel: () => void;
}

export function TaskForm({ initialTask, onSubmit, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(initialTask?.title ?? '');
  const [description, setDescription] = useState(initialTask?.description ?? '');
  const [dueDate, setDueDate] = useState(toDatetimeLocalValue(initialTask?.dueDate ?? null));
  const [priority, setPriority] = useState<Priority>(initialTask?.priority ?? 'medium');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      priority,
    });
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>{initialTask ? 'Modifier la tâche' : 'Nouvelle tâche'}</h2>

        <label className="field">
          <span>Titre</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Appeler le plombier"
            required
          />
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Détails optionnels"
            rows={3}
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Échéance / rappel</span>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Priorité</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="low">Basse</option>
              <option value="medium">Moyenne</option>
              <option value="high">Haute</option>
            </select>
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary">
            {initialTask ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  );
}
