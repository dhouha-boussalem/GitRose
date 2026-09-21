import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Branch } from '../types/git';

interface BranchDiffPanelProps {
  repoPath: string;
  branches: Branch[];
  currentBranch: string | null;
  onClose: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  A: 'Ajouté', M: 'Modifié', D: 'Supprimé', R: 'Renommé', C: 'Copié',
};

function statusColor(s: string) {
  if (s === 'A') return 'var(--color-added, #1a9060)';
  if (s === 'D') return 'var(--color-deleted, #c03040)';
  return 'var(--color-modified, #9a6f00)';
}

export function BranchDiffPanel({ repoPath, branches, currentBranch, onClose }: BranchDiffPanelProps) {
  const branchNames = branches.filter(b => !b.isRemote).map(b => b.name);
  const [base, setBase] = useState(currentBranch ?? branchNames[0] ?? '');
  const [compare, setCompare] = useState(branchNames.find(b => b !== base) ?? branchNames[0] ?? '');
  const [files, setFiles] = useState<{ path: string; status: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [diff, setDiff] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!base || !compare || base === compare) { setFiles([]); return; }
    setLoading(true);
    setSelectedFile(null);
    setDiff('');
    window.gitRose.getBranchDiffFiles(repoPath, base, compare)
      .then(setFiles)
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, [base, compare, repoPath]);

  useEffect(() => {
    if (!selectedFile) { setDiff(''); return; }
    window.gitRose.getBranchDiffFileDiff(repoPath, base, compare, selectedFile)
      .then(setDiff)
      .catch(() => setDiff(''));
  }, [selectedFile, base, compare, repoPath]);

  function renderDiff() {
    return diff.split('\n').map((line, i) => {
      let cls = 'bd-diff-line';
      if (line.startsWith('+') && !line.startsWith('+++')) cls += ' added';
      else if (line.startsWith('-') && !line.startsWith('---')) cls += ' removed';
      else if (line.startsWith('@@')) cls += ' hunk';
      return <div key={i} className={cls}>{line || ' '}</div>;
    });
  }

  return createPortal(
    <div className="tags-overlay" onClick={onClose}>
      <div className="bd-panel" onClick={e => e.stopPropagation()}>
        <div className="tags-header">
          <span className="tags-title">⇄ Diff entre branches</span>
          <button className="tags-close" onClick={onClose}>✕</button>
        </div>

        <div className="bd-selectors">
          <select className="bd-select" value={base} onChange={e => setBase(e.target.value)}>
            {branchNames.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <span className="bd-arrow">→</span>
          <select className="bd-select" value={compare} onChange={e => setCompare(e.target.value)}>
            {branchNames.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <span className="bd-count">{files.length} fichier{files.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="bd-body">
          <div className="bd-file-list">
            {loading && <div className="tags-hint">Chargement…</div>}
            {!loading && files.length === 0 && base !== compare && (
              <div className="tags-hint">Aucune différence</div>
            )}
            {!loading && base === compare && (
              <div className="tags-hint">Choisir deux branches différentes</div>
            )}
            {files.map(f => (
              <div
                key={f.path}
                className={`bd-file-row${selectedFile === f.path ? ' selected' : ''}`}
                onClick={() => setSelectedFile(f.path)}
              >
                <span className="bd-file-status" style={{ color: statusColor(f.status[0]) }}>
                  {STATUS_LABEL[f.status[0]] ?? f.status}
                </span>
                <span className="bd-file-path">{f.path}</span>
              </div>
            ))}
          </div>

          <div className="bd-diff-pane">
            {!selectedFile && <div className="tags-hint" style={{ margin: 'auto' }}>Sélectionner un fichier</div>}
            {selectedFile && (
              <pre className="bd-diff-content">{renderDiff()}</pre>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
