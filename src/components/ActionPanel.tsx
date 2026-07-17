import { useState, useRef, useCallback } from 'react';
import type { RepoStatus, FileStatus } from '../types/git';
import { StashPanel } from './StashPanel';

interface ActionPanelProps {
  repoPath: string;
  status: RepoStatus | null;
  onRefresh: () => void;
  onFileSelect: (path: string, staged: boolean) => void;
  selectedFile: string | null;
}

type OpState = 'idle' | 'loading' | 'error';

export function ActionPanel({ repoPath, status, onRefresh, onFileSelect, selectedFile }: ActionPanelProps) {
  const [commitMsg, setCommitMsg] = useState('');
  const [opState, setOpState] = useState<OpState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [pushPullOp, setPushPullOp] = useState<'push' | 'pull' | null>(null);
  const [splitPct, setSplitPct] = useState(50);
  const [changesCollapsed, setChangesCollapsed] = useState(false);
  const [stagedCollapsed, setStagedCollapsed] = useState(false);
  const splitRef = useRef<HTMLDivElement>(null);

  const onSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = splitRef.current;
    if (!container) return;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const pct = Math.min(80, Math.max(20, ((ev.clientY - rect.top) / rect.height) * 100));
      setSplitPct(pct);
    };

    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

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

  async function handleDiscard(file: FileStatus) {
    const isUntracked = file.status === 'untracked';
    const msg = isUntracked
      ? `Delete "${file.path}"?`
      : `Discard changes to "${file.path}"? This cannot be undone.`;
    if (!window.confirm(msg)) return;
    await run(() => window.gitRose.discardFile(repoPath, file.path, isUntracked));
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

      {/* Resizable split between unstaged and staged */}
      <div className="action-split" ref={splitRef}>
        {/* Unstaged files */}
        <div className="action-section" style={{ height: changesCollapsed ? 'auto' : `${splitPct}%` }}>
          <div className="action-section-header" onClick={() => setChangesCollapsed(v => !v)} style={{ cursor: 'pointer' }}>
            <span className="section-collapse-arrow">{changesCollapsed ? '▶' : '▼'}</span>
            <span className="action-section-title changes-title">
              Changes ({(status?.unstaged?.length ?? 0) + (status?.untracked?.length ?? 0)})
            </span>
            {!changesCollapsed && ((status?.unstaged?.length ?? 0) + (status?.untracked?.length ?? 0)) > 0 && (
              <button className="action-link-btn" onClick={(e) => { e.stopPropagation(); handleStageAll(); }} disabled={isLoading}>
                Stage all
              </button>
            )}
          </div>
          {!changesCollapsed && (
            <div className="action-section-scroll">
              {status?.unstaged?.map((f) => (
                <FileRow
                  key={f.path}
                  file={f}
                  action="stage"
                  onAction={() => handleStage(f)}
                  onDiscard={() => handleDiscard(f)}
                  onSelect={() => onFileSelect(f.path, false)}
                  selected={selectedFile === f.path}
                  disabled={isLoading}
                />
              ))}
              {status?.untracked?.map((path) => (
                <FileRow
                  key={path}
                  file={{ path, status: 'untracked', staged: false }}
                  action="stage"
                  onAction={() => handleStage({ path, status: 'untracked', staged: false })}
                  onDiscard={() => handleDiscard({ path, status: 'untracked', staged: false })}
                  onSelect={() => onFileSelect(path, false)}
                  selected={selectedFile === path}
                  disabled={isLoading}
                />
              ))}
              {(status?.unstaged?.length ?? 0) === 0 && (status?.untracked?.length ?? 0) === 0 && (
                <div className="action-empty">No changes</div>
              )}
            </div>
          )}
        </div>

        {/* Horizontal resize handle — masqué si une section est repliée */}
        {!changesCollapsed && !stagedCollapsed && (
          <div className="resize-handle-h" onMouseDown={onSplitMouseDown} title="Drag to resize" />
        )}

        {/* Staged files */}
        <div className="action-section" style={{ height: stagedCollapsed ? 'auto' : changesCollapsed ? `100%` : `${100 - splitPct}%` }}>
          <div className="action-section-header" onClick={() => setStagedCollapsed(v => !v)} style={{ cursor: 'pointer' }}>
            <span className="section-collapse-arrow">{stagedCollapsed ? '▶' : '▼'}</span>
            <span className="action-section-title staged-title">
              Staged ({status?.staged?.length ?? 0})
            </span>
          </div>
          {!stagedCollapsed && (
            <div className="action-section-scroll">
              {status?.staged?.map((f) => (
                <FileRow
                  key={f.path}
                  file={f}
                  action="unstage"
                  onAction={() => handleUnstage(f)}
                  onSelect={() => onFileSelect(f.path, true)}
                  selected={selectedFile === f.path}
                  disabled={isLoading}
                />
              ))}
              {(status?.staged?.length ?? 0) === 0 && (
                <div className="action-empty">No staged files</div>
              )}
            </div>
          )}
        </div>
      </div>

      <StashPanel repoPath={repoPath} onRefresh={onRefresh} />

      {/* Commit zone */}
      <div className="action-commit-zone">
        <textarea
          className="action-commit-msg"
          placeholder="Commit message…"
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
          Commit
        </button>
        <div className="action-commit-hint">Ctrl+Enter to commit</div>
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
  file, action, onAction, onDiscard, onSelect, selected, disabled,
}: {
  file: FileStatus;
  action: 'stage' | 'unstage';
  onAction: () => void;
  onDiscard?: () => void;
  onSelect: () => void;
  selected: boolean;
  disabled: boolean;
}) {
  return (
    <div
      className={`action-file-row ${selected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <span className={`status-badge ${statusClass[file.status] ?? 'modified'}`}>
        {statusIcon[file.status] ?? '~'}
      </span>
      <span className="action-file-name">{file.path}</span>
      {onDiscard && (
        <button
          className="action-file-btn discard"
          onClick={(e) => { e.stopPropagation(); onDiscard(); }}
          disabled={disabled}
          title="Discard changes"
        >
          ↺
        </button>
      )}
      <button
        className={`action-file-btn ${action}`}
        onClick={(e) => { e.stopPropagation(); onAction(); }}
        disabled={disabled}
        title={action === 'stage' ? 'Stage' : 'Unstage'}
      >
        {action === 'stage' ? '+' : '−'}
      </button>
    </div>
  );
}
