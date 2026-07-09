import { useState } from 'react';
import type { GraphCommit } from '../types/git';

interface CherryPickPanelProps {
  commit: GraphCommit;
  repoPath: string;
  onDone: () => void;
  onDismiss: () => void;
}

type Mode = 'choose' | 'new-branch';

export function CherryPickPanel({ commit, repoPath, onDone, onDismiss }: CherryPickPanelProps) {
  const [mode, setMode] = useState<Mode>('choose');
  const [branchName, setBranchName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleCherryPickHere() {
    setBusy(true);
    setError('');
    try {
      await window.gitRose.cherryPick(repoPath, commit.hash);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleCherryPickToBranch() {
    const name = branchName.trim();
    if (!name) return;
    setBusy(true);
    setError('');
    try {
      await window.gitRose.cherryPickToBranch(repoPath, commit.hash, name);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cherry-pick-panel">
      <div className="cherry-pick-header">
        <span className="cherry-pick-icon">🍒</span>
        <div className="cherry-pick-commit-info">
          <span className="cherry-pick-title">Cherry-pick</span>
          <code className="cherry-pick-hash">{commit.shortHash}</code>
          <span className="cherry-pick-msg">{commit.message.slice(0, 60)}{commit.message.length > 60 ? '…' : ''}</span>
        </div>
        <button className="cherry-pick-dismiss" onClick={onDismiss} title="Fermer">✕</button>
      </div>

      {error && (
        <div className="cherry-pick-error">
          <span>⚠ {error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {mode === 'choose' && (
        <div className="cherry-pick-actions">
          <button
            className="cherry-pick-btn primary"
            onClick={handleCherryPickHere}
            disabled={busy}
          >
            {busy ? <span className="btn-spinner" /> : '↙'}
            Appliquer sur la branche actuelle
          </button>
          <button
            className="cherry-pick-btn secondary"
            onClick={() => setMode('new-branch')}
            disabled={busy}
          >
            ⎇ Créer une nouvelle branche
          </button>
        </div>
      )}

      {mode === 'new-branch' && (
        <div className="cherry-pick-new-branch">
          <input
            className="cherry-pick-input"
            placeholder="Nom de la nouvelle branche…"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCherryPickToBranch();
              if (e.key === 'Escape') setMode('choose');
            }}
            autoFocus
          />
          <button
            className="cherry-pick-btn primary"
            onClick={handleCherryPickToBranch}
            disabled={busy || !branchName.trim()}
          >
            {busy ? <span className="btn-spinner" /> : '⎇'}
            Créer et cherry-pick
          </button>
          <button
            className="cherry-pick-btn ghost"
            onClick={() => setMode('choose')}
            disabled={busy}
          >
            Retour
          </button>
        </div>
      )}
    </div>
  );
}
