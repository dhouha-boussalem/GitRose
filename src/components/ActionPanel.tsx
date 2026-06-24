import { useState } from 'react';
import type { RepoStatus, FileStatus } from '../types/git';

interface ActionPanelProps {
  repoPath: string;
  status: RepoStatus | null;
  onRefresh: () => void;
}

type OpState = 'idle' | 'loading' | 'error';

export function ActionPanel({ repoPath, status, onRefresh }: ActionPanelProps) {
  const [commitMsg, setCommitMsg] = useState('');
  const [opState, setOpState] = useState<OpState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [pushPullOp, setPushPullOp] = useState<'push' | 'pull' | null>(null);

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    setOpState('loading');
    setErrorMsg('');
    try {
      const result = await fn();
      setOpState('idle');
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setOpState('error');
      setErrorMsg(msg);
      return null;
    }
  }

  async function handleStage(file: FileStatus) {
    await run(() => window.gitRose.stageFile(repoPath, file.path));
    onRefresh();
  }

  async function handleUnstage(file: FileStatus) {
    await run(() => window.gitRose.unstageFile(repoPath, file.path));
    onRefresh();
  }

  async function handleStageAll() {
    await run(() => window.gitRose.stageAll(repoPath));
    onRefresh();
  }

  async function handleCommit() {
    if (!commitMsg.trim()) return;
    const ok = await run(() => window.gitRose.commit(repoPath, commitMsg.trim()));
    if (ok !== null) {
      setCommitMsg('');
      onRefresh();
    }
  }

  async function handlePush() {
    setPushPullOp('push');
    await run(() => window.gitRose.push(repoPath));
    setPushPullOp(null);
    onRefresh();
  }

  async function handlePull() {
    setPushPullOp('pull');
    await run(() => window.gitRose.pull(repoPath));
    setPushPullOp(null);
    onRefresh();
  }

  const canCommit = (status?.staged?.length ?? 0) > 0 && commitMsg.trim().length > 0;
  const isLoading = opState === 'loading';

  return (
    <div className="action-panel">

      {/* Push / Pull */}
      <div className="action-sync-bar">
        <button
          className={`action-sync-btn pull ${pushPullOp === 'pull' ? 'loading' : ''}`}
          onClick={handlePull}
          disabled={isLoading}
        >
          {pushPullOp === 'pull' ? <span className="btn-spinner" /> : '↓'}
          Pull
        </button>
        <button
          className={`action-sync-btn push ${pushPullOp === 'push' ? 'loading' : ''}`}
          onClick={handlePush}
          disabled={isLoading}
        >
          {pushPullOp === 'push' ? <span className="btn-spinner" /> : '↑'}
          Push
        </button>
      </div>

      {opState === 'error' && (
        <div className="action-error">
          <span className="action-error-icon">⚠</span>
          <span>{errorMsg}</span>
          <button className="action-error-dismiss" onClick={() => setOpState('idle')}>✕</button>
        </div>
      )}

      {/* Fichiers non indexés */}
      <div className="action-section">
        <div className="action-section-header">
          <span className="action-section-title">
            Modifications ({(status?.unstaged?.length ?? 0) + (status?.untracked?.length ?? 0)})
          </span>
          {((status?.unstaged?.length ?? 0) + (status?.untracked?.length ?? 0)) > 0 && (
            <button className="action-link-btn" onClick={handleStageAll} disabled={isLoading}>
              Tout indexer
            </button>
          )}
        </div>

        {status?.unstaged?.map((f) => (
          <FileRow
            key={f.path}
            file={f}
            action="stage"
            onAction={() => handleStage(f)}
            disabled={isLoading}
          />
        ))}
        {status?.untracked?.map((path) => (
          <FileRow
            key={path}
            file={{ path, status: 'untracked', staged: false }}
            action="stage"
            onAction={() => handleStage({ path, status: 'untracked', staged: false })}
            disabled={isLoading}
          />
        ))}
        {(status?.unstaged?.length ?? 0) === 0 && (status?.untracked?.length ?? 0) === 0 && (
          <div className="action-empty">Aucune modification</div>
        )}
      </div>

      {/* Fichiers indexés */}
      <div className="action-section">
        <div className="action-section-header">
          <span className="action-section-title">
            Indexés ({status?.staged?.length ?? 0})
          </span>
        </div>

        {status?.staged?.map((f) => (
          <FileRow
            key={f.path}
            file={f}
            action="unstage"
            onAction={() => handleUnstage(f)}
            disabled={isLoading}
          />
        ))}
        {(status?.staged?.length ?? 0) === 0 && (
          <div className="action-empty">Aucun fichier indexé</div>
        )}
      </div>

      {/* Zone de commit */}
      <div className="action-commit-zone">
        <textarea
          className="action-commit-msg"
          placeholder="Message de commit…"
          value={commitMsg}
          onChange={(e) => setCommitMsg(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleCommit();
          }}
          rows={3}
        />
        <button
          className="action-commit-btn"
          onClick={handleCommit}
          disabled={!canCommit || isLoading}
        >
          {isLoading ? <span className="btn-spinner" /> : null}
          Commiter
        </button>
        <div className="action-commit-hint">Ctrl+Entrée pour commiter</div>
      </div>
    </div>
  );
}

const statusIcon: Record<string, string> = {
  modified: '~',
  created: '+',
  deleted: '-',
  untracked: '?',
};

const statusClass: Record<string, string> = {
  modified: 'modified',
  created: 'created',
  deleted: 'deleted',
  untracked: 'untracked',
};

function FileRow({
  file,
  action,
  onAction,
  disabled,
}: {
  file: FileStatus;
  action: 'stage' | 'unstage';
  onAction: () => void;
  disabled: boolean;
}) {
  return (
    <div className="action-file-row">
      <span className={`status-badge ${statusClass[file.status] ?? 'modified'}`}>
        {statusIcon[file.status] ?? '~'}
      </span>
      <span className="action-file-name">{file.path}</span>
      <button
        className={`action-file-btn ${action}`}
        onClick={onAction}
        disabled={disabled}
        title={action === 'stage' ? 'Indexer' : 'Désindexer'}
      >
        {action === 'stage' ? '+' : '−'}
      </button>
    </div>
  );
}
