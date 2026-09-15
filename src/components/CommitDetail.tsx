import { useState, useEffect } from 'react';
import type { GraphCommit } from '../types/git';

interface CommitDetailProps {
  commit: GraphCommit;
  repoPath: string;
  onClose: () => void;
  onRefresh: () => void;
}

type Mode = 'detail' | 'cherry-new-branch' | 'squash';

const STATUS_ICON: Record<string, string> = {
  M: '✎',
  A: '+',
  D: '−',
  R: '→',
  C: '©',
};

const STATUS_CLASS: Record<string, string> = {
  M: 'modified',
  A: 'added',
  D: 'deleted',
  R: 'renamed',
};

function parseDiff(raw: string): { header: string; hunks: { header: string; lines: { type: string; text: string }[] }[] } {
  const lines = raw.split('\n');
  let headerLines: string[] = [];
  let hunks: { header: string; lines: { type: string; text: string }[] }[] = [];
  let current: { header: string; lines: { type: string; text: string }[] } | null = null;
  let inHeader = true;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      inHeader = false;
      if (current) hunks.push(current);
      current = { header: line, lines: [] };
    } else if (inHeader) {
      headerLines.push(line);
    } else if (current) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        current.lines.push({ type: 'add', text: line.slice(1) });
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        current.lines.push({ type: 'del', text: line.slice(1) });
      } else if (!line.startsWith('\\')) {
        current.lines.push({ type: 'ctx', text: line.startsWith(' ') ? line.slice(1) : line });
      }
    }
  }
  if (current) hunks.push(current);
  return { header: headerLines.join('\n'), hunks };
}

export function CommitDetail({ commit, repoPath, onClose, onRefresh }: CommitDetailProps) {
  const [files, setFiles] = useState<{ path: string; status: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [diff, setDiff] = useState<string>('');
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
    setDiff('');
    setMode('detail');
    window.gitRose.getCommitFiles(repoPath, commit.hash)
      .then((f) => { setFiles(f); setLoadingFiles(false); })
      .catch(() => setLoadingFiles(false));
  }, [commit.hash, repoPath]);

  useEffect(() => {
    if (!selectedFile) return;
    setLoadingDiff(true);
    window.gitRose.getCommitFileDiff(repoPath, commit.hash, selectedFile)
      .then((d) => { setDiff(d); setLoadingDiff(false); })
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

  const parsed = diff ? parseDiff(diff) : null;

  return (
    <div className="commit-detail-overlay" onClick={onClose}>
      <div className="commit-detail-panel" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="cd-header">
          <div className="cd-header-top">
            <code className="cd-hash">{commit.hash.slice(0, 12)}</code>
            <button className="cd-close" onClick={onClose}>✕</button>
          </div>
          <div className="cd-message">{commit.message}</div>
          <div className="cd-meta">
            <span className="cd-author">{commit.author}</span>
            <span className="cd-sep">·</span>
            <span className="cd-email">{commit.email}</span>
            <span className="cd-sep">·</span>
            <span className="cd-date">{new Date(commit.date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</span>
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

        {/* Actions */}
        {error && (
          <div className="cd-error">⚠ {error} <button onClick={() => setError('')}>✕</button></div>
        )}

        {mode === 'detail' && (
          <div className="cd-actions">
            <button className="cd-action-btn" disabled={busy} onClick={() => run(() => window.gitRose.cherryPick(repoPath, commit.hash))}>
              🍒 Cherry-pick
            </button>
            <button className="cd-action-btn" disabled={busy} onClick={() => setMode('cherry-new-branch')}>
              ⎇ → nouvelle branche
            </button>
            <button className="cd-action-btn" disabled={busy} onClick={() => setMode('squash')}>
              ⊙ Squash jusqu'ici
            </button>
          </div>
        )}

        {mode === 'cherry-new-branch' && (
          <div className="cd-actions">
            <input className="cd-input" autoFocus placeholder="Nom de la nouvelle branche…"
              value={branchName} onChange={(e) => setBranchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && branchName.trim()) run(() => window.gitRose.cherryPickToBranch(repoPath, commit.hash, branchName.trim()));
                if (e.key === 'Escape') setMode('detail');
              }}
            />
            <button className="cd-action-btn primary" disabled={busy || !branchName.trim()}
              onClick={() => run(() => window.gitRose.cherryPickToBranch(repoPath, commit.hash, branchName.trim()))}>
              {busy ? '…' : '⎇ Créer et cherry-pick'}
            </button>
            <button className="cd-action-btn ghost" onClick={() => setMode('detail')}>Retour</button>
          </div>
        )}

        {mode === 'squash' && (
          <div className="cd-actions">
            <input className="cd-input" autoFocus placeholder="Message du commit fusionné…"
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
            <button className="cd-action-btn ghost" onClick={() => setMode('detail')}>Retour</button>
          </div>
        )}

        {/* Body: file list + diff */}
        <div className="cd-body">
          <div className="cd-files">
            <div className="cd-files-title">Fichiers modifiés <span className="cd-files-count">{files.length}</span></div>
            {loadingFiles ? (
              <div className="cd-loading">Chargement…</div>
            ) : files.length === 0 ? (
              <div className="cd-empty">Aucun fichier</div>
            ) : (
              files.map((f) => (
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
                  <span className="cd-file-path">{f.path}</span>
                </button>
              ))
            )}
          </div>

          {selectedFile && (
            <div className="cd-diff">
              <div className="cd-diff-filename">{selectedFile}</div>
              {loadingDiff ? (
                <div className="cd-loading">Chargement du diff…</div>
              ) : !parsed || parsed.hunks.length === 0 ? (
                <div className="cd-empty">Aucun diff disponible</div>
              ) : (
                <div className="cd-diff-content">
                  {parsed.hunks.map((hunk, hi) => (
                    <div key={hi} className="cd-hunk">
                      <div className="cd-hunk-header">{hunk.header}</div>
                      {hunk.lines.map((line, li) => (
                        <div key={li} className={`cd-diff-line cd-diff-${line.type}`}>
                          <span className="cd-diff-gutter">{line.type === 'add' ? '+' : line.type === 'del' ? '−' : ' '}</span>
                          <span className="cd-diff-text">{line.text || ' '}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
