import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';
import { ReminderToast } from './components/ReminderToast';
import type { Task, TaskInput } from './types/task';

type Filter = 'active' | 'all' | 'completed';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('active');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [firedReminders, setFiredReminders] = useState<Task[]>([]);

  const refresh = useCallback(async () => {
    const list = await window.taskRose.list();
    setTasks(list);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const unsubscribe = window.taskRose.onRemindersFired((reminded) => {
      setFiredReminders((prev) => [...prev, ...reminded]);
      refresh();
    });
    return unsubscribe;
  }, [refresh]);

  const visibleTasks = useMemo(() => {
    if (filter === 'active') return tasks.filter((t) => !t.completed);
    if (filter === 'completed') return tasks.filter((t) => t.completed);
    return tasks;
  }, [tasks, filter]);

  async function handleSubmit(input: TaskInput) {
    if (editingTask) {
      await window.taskRose.update(editingTask.id, input);
    } else {
      await window.taskRose.add(input);
    }
    setShowForm(false);
    setEditingTask(null);
    refresh();
  }

  async function handleToggle(id: string) {
    await window.taskRose.toggleComplete(id);
    refresh();
  }

  async function handleDelete(id: string) {
    await window.taskRose.remove(id);
    refresh();
  }

  function openEditForm(task: Task) {
    setEditingTask(task);
    setShowForm(true);
  }

  function openNewForm() {
    setEditingTask(null);
    setShowForm(true);
  }

  const activeCount = tasks.filter((t) => !t.completed).length;

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>TaskRose</h1>
          <p className="subtitle">
            {activeCount} tâche{activeCount !== 1 ? 's' : ''} en cours
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openNewForm}>
          + Nouvelle tâche
        </button>
      </header>

      <nav className="filter-tabs">
        <button
          className={filter === 'active' ? 'active' : ''}
          onClick={() => setFilter('active')}
        >
          En cours
        </button>
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
          Toutes
        </button>
        <button
          className={filter === 'completed' ? 'active' : ''}
          onClick={() => setFilter('completed')}
        >
          Terminées
        </button>
      </nav>

      <main className="app-main">
        {loading ? (
          <div className="empty-state">
            <p>Chargement…</p>
          </div>
        ) : (
          <TaskList
            tasks={visibleTasks}
            onToggle={handleToggle}
            onEdit={openEditForm}
            onDelete={handleDelete}
          />
        )}
      </main>

      {showForm && (
        <TaskForm
          initialTask={editingTask}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingTask(null);
          }}
        />
      )}

      <ReminderToast tasks={firedReminders} onDismiss={() => setFiredReminders([])} />
    </div>
  );
}

export default App;
