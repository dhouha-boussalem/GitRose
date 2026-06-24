import type { RepoStatus } from '../types/git';

interface StatusPanelProps {
  status: RepoStatus | null;
}

const statusIcons: Record<string, string> = {
  created: '+',
  modified: '~',
  deleted: '-',
};

const statusLabels: Record<string, string> = {
  created: 'Ajouté',
  modified: 'Modifié',
  deleted: 'Supprimé',
};

export function StatusPanel({ status }: StatusPanelProps) {
  if (!status) return null;

  const totalChanges = status.staged.length + status.unstaged.length + status.untracked.length;

  if (totalChanges === 0) {
    return (
      <div className="status-panel clean">
        <span className="status-clean-icon">✓</span>
        <span>Répertoire de travail propre</span>
      </div>
    );
  }

  return (
    <div className="status-panel">
      {status.staged.length > 0 && (
        <div className="status-group">
          <div className="status-group-title">Indexés ({status.staged.length})</div>
          {status.staged.map((f) => (
            <div key={f.path} className="status-file staged">
              <span className="status-badge created">{statusIcons[f.status] ?? '~'}</span>
              <span className="status-file-name">{f.path}</span>
              <span className="status-file-label">{statusLabels[f.status]}</span>
            </div>
          ))}
        </div>
      )}

      {status.unstaged.length > 0 && (
        <div className="status-group">
          <div className="status-group-title">Modifiés ({status.unstaged.length})</div>
          {status.unstaged.map((f) => (
            <div key={f.path} className="status-file unstaged">
              <span className="status-badge modified">{statusIcons[f.status] ?? '~'}</span>
              <span className="status-file-name">{f.path}</span>
            </div>
          ))}
        </div>
      )}

      {status.untracked.length > 0 && (
        <div className="status-group">
          <div className="status-group-title">Non suivis ({status.untracked.length})</div>
          {status.untracked.map((f) => (
            <div key={f} className="status-file untracked">
              <span className="status-badge untracked">?</span>
              <span className="status-file-name">{f}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
