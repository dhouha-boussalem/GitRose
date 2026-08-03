import { useState, useEffect } from 'react';

interface ConflictFile {
  path: string;
  status: string;
}

interface ConflictPanelProps {
  repoPath: string;
  onRefresh: () => void;
}

export function ConflictPanel({ repoPath, onRefresh }: ConflictPanelProps) {
  const [conflicts, setConflicts] = useState<ConflictFile[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState<{ ours: string; base: string; theirs: string; raw: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    window.gitRose.getConflicts(repoPath).then((list) => {
      setConflicts(list);
      if (list.length > 0 && !selected) setSelected(list[0].path);
    });
  }, [repoPath]);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    window.gitRose.getConflictContent(repoPath, selected)
      .then(setContent)
      .finally(() => setLoading(false));
  }, [selected, repoPath]);

  async function resolve(choice: 'ours' | 'theirs') {
    if (!selected || !content) return;
    setResolving(true);
    try {
      const resolved = choice === 'ours' ? content.ours : content.theirs;
      await window.gitRose.resolveConflict(repoPath, selected, resolved);
      const next = conflicts.filter((f) => f.path !== selected);
      setConflicts(next);
      setSelected(next.length > 0 ? next[0].path : null);
      setContent(null);
      onRefresh();
    } finally {
      setResolving(false);
    }
  }

  if (conflicts.length === 0) return null;

  return (
    <div className="conflict-panel">
      <div className="conflict-panel-header">
        <span className="conflict-panel-icon">⚡</span>
        <span className="conflict-panel-title">Merge conflicts ({conflicts.length} file{conflicts.length > 1 ? 's' : ''})</span>
      </div>

      <div className="conflict-panel-body">
        <div className="conflict-file-list">
          {conflicts.map((f) => (
            <div
              key={f.path}
              className={`conflict-file-row ${selected === f.path ? 'selected' : ''}`}
              onClick={() => setSelected(f.path)}
            >
              <span className="conflict-file-badge">!</span>
              <span className="conflict-file-name" title={f.path}>{f.path}</span>
            </div>
          ))}
        </div>

        <div className="conflict-diff">
          {loading ? (
            <div className="conflict-empty"><span className="loading-spinner" /></div>
          ) : content ? (
            <>
              <div className="conflict-panels">
                <div className="conflict-pane ours">
                  <div className="conflict-pane-header">
                    <span className="conflict-pane-label ours-label">Ours (current)</span>
                    <button
                      className="conflict-accept-btn ours"
                      onClick={() => resolve('ours')}
                      disabled={resolving}
                    >Accept ours</button>
                  </div>
                  <pre className="conflict-pane-content">{content.ours}</pre>
                </div>
                <div className="conflict-pane theirs">
                  <div className="conflict-pane-header">
                    <span className="conflict-pane-label theirs-label">Theirs (incoming)</span>
                    <button
                      className="conflict-accept-btn theirs"
                      onClick={() => resolve('theirs')}
                      disabled={resolving}
                    >Accept theirs</button>
                  </div>
                  <pre className="conflict-pane-content">{content.theirs}</pre>
                </div>
              </div>
              {content.base && (
                <div className="conflict-pane base">
                  <div className="conflict-pane-header">
                    <span className="conflict-pane-label base-label">Base (common ancestor)</span>
                  </div>
                  <pre className="conflict-pane-content">{content.base}</pre>
                </div>
              )}
            </>
          ) : (
            <div className="conflict-empty">Select a file</div>
          )}
        </div>
      </div>
    </div>
  );
}
