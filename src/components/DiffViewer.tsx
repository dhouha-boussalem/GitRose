import { useEffect, useState } from 'react';

interface DiffViewerProps {
  repoPath: string;
  filePath: string | null;
  staged: boolean;
}

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'hunk';
  content: string;
  lineOld: number | null;
  lineNew: number | null;
}

function parseDiff(raw: string): DiffLine[] {
  const lines = raw.split('\n');
  const result: DiffLine[] = [];
  let lineOld = 0;
  let lineNew = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (m) {
        lineOld = parseInt(m[1], 10);
        lineNew = parseInt(m[2], 10);
      }
      result.push({ type: 'hunk', content: line, lineOld: null, lineNew: null });
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      result.push({ type: 'add', content: line.slice(1), lineOld: null, lineNew: lineNew++ });
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      result.push({ type: 'remove', content: line.slice(1), lineOld: lineOld++, lineNew: null });
    } else if (!line.startsWith('diff ') && !line.startsWith('index ') && !line.startsWith('---') && !line.startsWith('+++')) {
      result.push({ type: 'context', content: line.slice(1), lineOld: lineOld++, lineNew: lineNew++ });
    }
  }
  return result;
}

export function DiffViewer({ repoPath, filePath, staged }: DiffViewerProps) {
  const [diff, setDiff] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!filePath) { setDiff(null); return; }
    setLoading(true);
    window.gitRose.getDiff(repoPath, filePath, staged)
      .then(setDiff)
      .catch(() => setDiff(''))
      .finally(() => setLoading(false));
  }, [repoPath, filePath, staged]);

  if (!filePath) {
    return (
      <div className="diff-empty">
        <span className="diff-empty-icon">⟨/⟩</span>
        <span>Select a file to see changes</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="diff-empty">
        <span className="loading-spinner" />
      </div>
    );
  }

  if (!diff) {
    return (
      <div className="diff-empty">
        <span>No diff available</span>
      </div>
    );
  }

  const lines = parseDiff(diff);

  if (lines.length === 0) {
    return (
      <div className="diff-empty">
        <span>No changes detected</span>
      </div>
    );
  }

  return (
    <div className="diff-viewer">
      <div className="diff-header">
        <span className="diff-filename">{filePath}</span>
        <span className="diff-mode">{staged ? 'Staged' : 'Unstaged'}</span>
      </div>
      <div className="diff-body">
        <table className="diff-table">
          <tbody>
            {lines.map((line, i) => (
              line.type === 'hunk' ? (
                <tr key={i} className="diff-hunk">
                  <td className="diff-ln" colSpan={2} />
                  <td className="diff-code">{line.content}</td>
                </tr>
              ) : (
                <tr key={i} className={`diff-line diff-${line.type}`}>
                  <td className="diff-ln">{line.lineOld ?? ''}</td>
                  <td className="diff-ln">{line.lineNew ?? ''}</td>
                  <td className="diff-code">
                    <span className="diff-sign">
                      {line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ' '}
                    </span>
                    <span>{line.content}</span>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
