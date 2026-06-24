import type { RepoStatus } from '../types/git';

interface ToolbarProps {
  repoPath: string | null;
  status: RepoStatus | null;
  onOpenRepo: () => void;
  activeView: 'commits' | 'status';
  onViewChange: (v: 'commits' | 'status') => void;
}

export function Toolbar({ repoPath, status, onOpenRepo, activeView, onViewChange }: ToolbarProps) {
  const repoName = repoPath ? repoPath.split('/').pop() : null;
  const changes = status ? status.staged.length + status.unstaged.length + status.untracked.length : 0;

  return (
    <header className="toolbar">
      <div className="toolbar-left">
        <button className="toolbar-repo-btn" onClick={onOpenRepo}>
          {repoName ? (
            <>
              <span className="toolbar-repo-icon">📁</span>
              <span className="toolbar-repo-name">{repoName}</span>
            </>
          ) : (
            <>
              <span className="toolbar-repo-icon">+</span>
              <span>Ouvrir un dépôt</span>
            </>
          )}
        </button>
      </div>

      {repoPath && (
        <nav className="toolbar-nav">
          <button
            className={`toolbar-nav-btn ${activeView === 'commits' ? 'active' : ''}`}
            onClick={() => onViewChange('commits')}
          >
            Historique
          </button>
          <button
            className={`toolbar-nav-btn ${activeView === 'status' ? 'active' : ''}`}
            onClick={() => onViewChange('status')}
          >
            Modifications
            {changes > 0 && <span className="toolbar-badge">{changes}</span>}
          </button>
        </nav>
      )}

      <div className="toolbar-right">
        {status && (
          <div className="toolbar-sync">
            {status.ahead > 0 && <span className="sync-pill ahead">↑ {status.ahead}</span>}
            {status.behind > 0 && <span className="sync-pill behind">↓ {status.behind}</span>}
          </div>
        )}
      </div>
    </header>
  );
}
