import { useState, useEffect } from 'react';

interface StashFile {
  path: string;
  status: string;
}

interface StashViewerProps {
  repoPath: string;
  stashIndex: number;
  stashMessage: string;
  onClose: () => void;
}

const STATUS_ICON: Record<string, string> = { M: '~', A: '+', D: '-', R: '→', C: '©' };
const STATUS_CLASS: Record<string, string> = { M: 'modified', A: 'created', D: 'deleted', R: 'modified', C: 'created' };

function parseDiff(raw: string) {
  return raw.split('\n').map((line, i) => {
    const cls = line.startsWith('+') && !line.startsWith('+++')
      ? 'diff-add'
      : line.startsWith('-') && !line.startsWith('---')
      ? 'diff-del'
      : line.startsWith('@@')
      ? 'diff-hunk'
      : line.startsWith('diff ')
      ? 'diff-header'
      : '';
    return <span key={i} className={cls}>{line}{'\n'}</span>;
  });
}

export function StashViewer({ repoPath, stashIndex, stashMessage, onClose }: StashViewerProps) {
  const [files, setFiles] = useState<StashFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [diff, setDiff] = useState<string>('');
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingDiff, setLoadingDiff] = useState(false);

  useEffect(() => {
    setLoadingFiles(true);
    window.gitRose.stashShowFiles(repoPath, stashIndex)
      .then((list) => {
        setFiles(list);
        if (list.length > 0) setSelectedFile(list[0].path);
      })
      .finally(() => setLoadingFiles(false));
  }, [repoPath, stashIndex]);

  useEffect(() => {
    if (!selectedFile) return;
    setLoadingDiff(true);
    setDiff('');
    window.gitRose.stashShowFileDiff(repoPath, stashIndex, selectedFile)
      .then(setDiff)
      .finally(() => setLoadingDiff(false));
  }, [selectedFile, repoPath, stashIndex]);

  return (
    <div className="stash-viewer">
      <div className="stash-viewer-header">
        <span className="stash-viewer-title">
          <code className="cherry-pick-hash">stash@{'{' + stashIndex + '}'}</code>
          <span className="stash-viewer-msg">{stashMessage.replace(/^WIP on [^:]+: /, '')}</span>
        </span>
        <button className="cherry-pick-dismiss" onClick={onClose}>✕</button>
      </div>

      <div className="stash-viewer-body">
        {/* File list */}
        <div className="stash-viewer-files">
          {loadingFiles ? (
            <div className="action-empty"><span className="loading-spinner" /></div>
          ) : files.map((f) => (
            <div
              key={f.path}
              className={`stash-viewer-file-row ${selectedFile === f.path ? 'selected' : ''}`}
              onClick={() => setSelectedFile(f.path)}
            >
              <span className={`status-badge ${STATUS_CLASS[f.status] ?? 'modified'}`}>
                {STATUS_ICON[f.status] ?? '~'}
              </span>
              <span className="stash-viewer-file-name">{f.path}</span>
            </div>
          ))}
        </div>

        {/* Diff */}
        <div className="stash-viewer-diff">
          {loadingDiff ? (
            <div className="diff-empty"><span className="loading-spinner" /> Chargement…</div>
          ) : diff ? (
            <pre className="stash-diff-content">{parseDiff(diff)}</pre>
          ) : (
            <div className="diff-empty">Sélectionne un fichier</div>
          )}
        </div>
      </div>
    </div>
  );
}
