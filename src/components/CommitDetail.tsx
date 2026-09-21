import { useState, useEffect } from 'react';
import type { GraphCommit } from '../types/git';

interface CommitDetailProps {
  commit: GraphCommit;
  repoPath: string;
  onClose: () => void;
  onRefresh: () => void;
}

type Mode = 'detail' | 'cherry-new-branch' | 'squash' | 'reset';

const STATUS_ICON: Record<string, string> = { M: '✎', A: '+', D: '−', R: '→', C: '©' };
const STATUS_CLASS: Record<string, string> = { M: 'modified', A: 'added', D: 'deleted', R: 'renamed' };

function parseDiff(raw: string) {
  const lines = raw.split('\n');
  const hunks: { header: string; lines: { type: string; text: string }[] }[] = [];
  let current: { header: string; lines: { type: string; text: string }[] } | null = null;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      if (current) hunks.push(current);
      current = { header: line, lines: [] };
    } else if (current) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        current.lines.push({ type: 'add', text: line.slice(1) });
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        current.lines.push({ type: 'del', text: line.slice(1) });
      } else if (!line.startsWith('\\') && !line.startsWith('diff') && !line.startsWith('index') && !line.startsWith('+++') && !line.startsWith('---')) {
        current.lines.push({ type: 'ctx', text: line.startsWith(' ') ? line.slice(1) : line });
      }
    }
  }
  if (current) hunks.push(current);
  return hunks;
}

export function CommitDetail({ commit, repoPath, onClose, onRefresh }: CommitDetailProps) {
  const [files, setFiles] = useState<{ path: string; status: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [hunks, setHunks] = useState<{ header: string; lines: { type: string; text: string }[] }[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [mode, setMode] = useState<Mode>('detail');
  const [branchName, setBranchName] = useState('');
  const [squashMsg, setSquashMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoadingFiles(true);
    setSelectedFile(null);
    setHunks([]);
    setMode('detail');
    setError('');
    window.gitRose.getCommitFiles(repoPath, commit.hash)
      .then((f) => { setFiles(f); setLoadingFiles(false); })
      .catch(() => setLoadingFiles(false));
  }, [commit.hash, repoPath]);

  useEffect(() => {
    if (!selectedFile) { setHunks([]); return; }
    setLoadingDiff(true);
    window.gitRose.getCommitFileDiff(repoPath, commit.hash, selectedFile)
      .then((d) => { setHunks(parseDiff(d)); setLoadingDiff(false); })
      .catch(() => setLoadingDiff(false));
  }, [selectedFile, commit.hash, repoPath]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      onRefresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  const dateStr = new Date(commit.date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="cd-panel">
      {/* Header */}
      <div className="cd-header">
        <div className="cd-header-top">
          <code className="cd-hash">{commit.hash.slice(0, 12)}</code>
          <button className="cd-close" onClick={onClose} title="Fermer">✕</button>
        </div>
        <div className="cd-message" title={commit.message}>{commit.message}</div>
        <div className="cd-meta">
          <span className="cd-author">{commit.author}</span>
          <span className="cd-dot">·</span>
          <span className="cd-date">{dateStr}</span>
        </div>
        {commit.refs && (
          <div className="cd-refs">
            {commit.refs.split(', ').filter(Boolean).map((ref) => (
              <span key={ref} className={`commit-ref ${ref.includes('HEAD') ? 'ref-head' : ref.includes('origin') ? 'ref-remote' : 'ref-local'}`}>
                {ref.replace('HEAD -> ', '')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="cd-error">
          <span>⚠ {error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Actions */}
      <div className="cd-actions">
        {mode === 'detail' && (
          <>
            <button className="cd-action-btn" disabled={busy}
              onClick={() => run(() => window.gitRose.cherryPick(repoPath, commit.hash))}>
              🍒 Cherry-pick
            </button>
            <button className="cd-action-btn" disabled={busy} onClick={() => { setMode('cherry-new-branch'); setBranchName(''); }}>
              ⎇ Nouvelle branche
            </button>
            <button className="cd-action-btn" disabled={busy} onClick={() => { setMode('squash'); setSquashMsg(''); }}>
              ⊙ Squash
            </button>
            <button className="cd-action-btn" disabled={busy} onClick={() => setMode('reset')}>
              ↺ Reset
            </button>
          </>
        )}
        {mode === 'reset' && (
          <div className="cd-reset-panel">
            <div className="cd-reset-title">Réinitialiser HEAD vers ce commit</div>
            <div className="cd-reset-options">
              <button className="cd-reset-btn" disabled={busy} onClick={() => run(() => window.gitRose.resetToCommit(repoPath, commit.hash, 'soft'))}>
                <span className="cd-reset-label">Soft</span>
                <span className="cd-reset-desc">Garde les fichiers stagés</span>
              </button>
              <button className="cd-reset-btn" disabled={busy} onClick={() => run(() => window.gitRose.resetToCommit(repoPath, commit.hash, 'mixed'))}>
                <span className="cd-reset-label">Mixed</span>
                <span className="cd-reset-desc">Désgage les fichiers, garde les modifications</span>
              </button>
              <button className="cd-reset-btn danger" disabled={busy} onClick={() => run(() => window.gitRose.resetToCommit(repoPath, commit.hash, 'hard'))}>
                <span className="cd-reset-label">Hard ⚠</span>
                <span className="cd-reset-desc">Supprime toutes les modifications locales</span>
              </button>
            </div>
            <button className="cd-action-btn ghost" onClick={() => setMode('detail')}>Annuler</button>
          </div>
        )}
        {mode === 'cherry-new-branch' && (
          <>
            <input className="cd-input" autoFocus placeholder="Nom de la branche…"
              value={branchName} onChange={(e) => setBranchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && branchName.trim()) run(() => window.gitRose.cherryPickToBranch(repoPath, commit.hash, branchName.trim()));
                if (e.key === 'Escape') setMode('detail');
              }}
            />
            <button className="cd-action-btn primary" disabled={busy || !branchName.trim()}
              onClick={() => run(() => window.gitRose.cherryPickToBranch(repoPath, commit.hash, branchName.trim()))}>
              {busy ? '…' : '⎇ Créer'}
            </button>
            <button className="cd-action-btn ghost" onClick={() => setMode('detail')}>✕</button>
          </>
        )}
        {mode === 'squash' && (
          <>
            <input className="cd-input" autoFocus placeholder="Message fusionné…"
              value={squashMsg} onChange={(e) => setSquashMsg(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && squashMsg.trim()) run(() => window.gitRose.squashToCommit(repoPath, commit.hash, squashMsg.trim()));
                if (e.key === 'Escape') setMode('detail');
              }}
            />
            <button className="cd-action-btn primary" disabled={busy || !squashMsg.trim()}
              onClick={() => run(() => window.gitRose.squashToCommit(repoPath, commit.hash, squashMsg.trim()))}>
              {busy ? '…' : '⊙ Squash'}
            </button>
            <button className="cd-action-btn ghost" onClick={() => setMode('detail')}>✕</button>
          </>
        )}
      </div>

      {/* Files */}
      <div className="cd-files-section">
        <div className="cd-section-title">
          Fichiers modifiés
          {!loadingFiles && <span className="cd-badge">{files.length}</span>}
        </div>
        <div className="cd-files-list">
          {loadingFiles ? (
            <div className="cd-hint">Chargement…</div>
          ) : files.length === 0 ? (
            <div className="cd-hint">Aucun fichier</div>
          ) : files.map((f) => (
            <button
              key={f.path}
              className={`cd-file-row ${selectedFile === f.path ? 'active' : ''}`}
              onClick={() => setSelectedFile(selectedFile === f.path ? null : f.path)}
              title={f.path}
            >
              <span className={`cd-file-status ${STATUS_CLASS[f.status] ?? ''}`}>
                {STATUS_ICON[f.status] ?? f.status}
              </span>
              <span className="cd-file-name">{f.path.split('/').pop()}</span>
              <span className="cd-file-dir">{f.path.includes('/') ? f.path.substring(0, f.path.lastIndexOf('/')) : ''}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Diff */}
      {selectedFile && (
        <div className="cd-diff-section">
          <div className="cd-diff-title" title={selectedFile}>{selectedFile}</div>
          <div className="cd-diff-scroll">
            {loadingDiff ? (
              <div className="cd-hint">Chargement du diff…</div>
            ) : hunks.length === 0 ? (
              <div className="cd-hint">Aucun diff disponible</div>
            ) : hunks.map((hunk, hi) => (
              <div key={hi} className="cd-hunk">
                <div className="cd-hunk-header">{hunk.header}</div>
                {hunk.lines.map((line, li) => (
                  <div key={li} className={`cd-diff-line cd-diff-${line.type}`}>
                    <span className="cd-diff-gutter">{line.type === 'add' ? '+' : line.type === 'del' ? '−' : ' '}</span>
                    <span className="cd-diff-text">{line.text || ' '}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
