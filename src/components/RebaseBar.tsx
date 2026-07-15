import { useState } from 'react';

interface RebaseBarProps {
  branches: string[];
  repoPath: string;
  onDone: () => void;
  onCancel: () => void;
}

export function RebaseBar({ branches, repoPath, onDone, onCancel }: RebaseBarProps) {
  const [target, setTarget] = useState(branches[0] ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleRebase() {
    if (!target) return;
    setBusy(true);
    setError('');
    try {
      await window.gitRose.rebase(repoPath, target);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div className="rebase-bar">
      <span className="rebase-bar-label">↥ Rebase sur</span>
      <select
        className="rebase-bar-select"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        disabled={busy}
      >
        {branches.map((b) => (
          <option key={b} value={b}>{b}</option>
        ))}
      </select>
      <button className="rebase-bar-btn primary" onClick={handleRebase} disabled={busy || !target}>
        {busy ? <span className="btn-spinner" /> : '↥'} Rebase
      </button>
      <button className="rebase-bar-btn ghost" onClick={onCancel} disabled={busy}>Annuler</button>
      {error && <span className="rebase-bar-error">⚠ {error}</span>}
    </div>
  );
}
