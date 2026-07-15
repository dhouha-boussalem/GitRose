import { useState } from 'react';
import type { GraphCommit } from '../types/git';

interface CherryPickPanelProps {
  commit: GraphCommit;
  repoPath: string;
  onDone: () => void;
  onDismiss: () => void;
}

type Mode = 'choose' | 'new-branch' | 'squash';

export function CherryPickPanel({ commit, repoPath, onDone, onDismiss }: CherryPickPanelProps) {
  const [mode, setMode] = useState<Mode>('choose');
  const [branchName, setBranchName] = useState('');
  const [squashMsg, setSquashMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div className="cherry-pick-panel">
      <div className="cherry-pick-header">
        <div className="cherry-pick-commit-info">
          <code className="cherry-pick-hash">{commit.shortHash}</code>
          <span className="cherry-pick-msg">{commit.message.slice(0, 72)}{commit.message.length > 72 ? '…' : ''}</span>
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
          <button className="cherry-pick-btn secondary" onClick={() => setMode('squash')} disabled={busy}>
            ⊙ Squash jusqu'ici
          </button>
          <button className="cherry-pick-btn primary" onClick={() => run(() => window.gitRose.cherryPick(repoPath, commit.hash))} disabled={busy}>
            {busy ? <span className="btn-spinner" /> : '🍒'} Cherry-pick
          </button>
          <button className="cherry-pick-btn secondary" onClick={() => setMode('new-branch')} disabled={busy}>
            ⎇ Cherry-pick → nouvelle branche
          </button>
        </div>
      )}

      {mode === 'squash' && (
        <div className="cherry-pick-new-branch">
          <input
            className="cherry-pick-input"
            placeholder="Message du commit fusionné…"
            value={squashMsg}
            onChange={(e) => setSquashMsg(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && squashMsg.trim()) run(() => window.gitRose.squashToCommit(repoPath, commit.hash, squashMsg.trim()));
              if (e.key === 'Escape') setMode('choose');
            }}
            autoFocus
          />
          <button
            className="cherry-pick-btn primary"
            onClick={() => run(() => window.gitRose.squashToCommit(repoPath, commit.hash, squashMsg.trim()))}
            disabled={busy || !squashMsg.trim()}
          >
            {busy ? <span className="btn-spinner" /> : '⊙'} Squash
          </button>
          <button className="cherry-pick-btn ghost" onClick={() => setMode('choose')} disabled={busy}>Retour</button>
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
              if (e.key === 'Enter') run(() => window.gitRose.cherryPickToBranch(repoPath, commit.hash, branchName.trim()));
              if (e.key === 'Escape') setMode('choose');
            }}
            autoFocus
          />
          <button
            className="cherry-pick-btn primary"
            onClick={() => run(() => window.gitRose.cherryPickToBranch(repoPath, commit.hash, branchName.trim()))}
            disabled={busy || !branchName.trim()}
          >
            {busy ? <span className="btn-spinner" /> : '⎇'} Créer et cherry-pick
          </button>
          <button className="cherry-pick-btn ghost" onClick={() => setMode('choose')} disabled={busy}>Retour</button>
        </div>
      )}
    </div>
  );
}
