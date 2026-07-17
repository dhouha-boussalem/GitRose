import type { Commit } from '../types/git';

interface CommitListProps {
  commits: Commit[];
  selectedHash: string | null;
  onSelect: (commit: Commit) => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function hashToColor(str: string): string {
  const gradients = [
    'linear-gradient(135deg,#5c6bc0,#9c4dcc)',
    'linear-gradient(135deg,#00897b,#26a69a)',
    'linear-gradient(135deg,#2e7d32,#66bb6a)',
    'linear-gradient(135deg,#e64a19,#ff8f00)',
    'linear-gradient(135deg,#6a1b9a,#e040fb)',
    'linear-gradient(135deg,#00695c,#26c6da)',
    'linear-gradient(135deg,#1565c0,#42a5f5)',
    'linear-gradient(135deg,#c62828,#ef5350)',
    'linear-gradient(135deg,#ad1457,#f06292)',
    'linear-gradient(135deg,#4e342e,#a1887f)',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

function parseRefs(refs: string) {
  if (!refs) return [];
  return refs.split(', ').filter(Boolean).map((r) => r.trim());
}

export function CommitList({ commits, selectedHash, onSelect }: CommitListProps) {
  if (commits.length === 0) {
    return (
      <div className="commit-empty">
        <span>No commits found</span>
      </div>
    );
  }

  return (
    <div className="commit-list">
      {commits.map((commit) => {
        const refs = parseRefs(commit.refs);
        return (
          <div
            key={commit.hash}
            className={`commit-row ${selectedHash === commit.hash ? 'selected' : ''}`}
            onClick={() => onSelect(commit)}
          >
            <div
              className="commit-avatar"
              style={{ background: hashToColor(commit.email) }}
            >
              {getInitials(commit.author)}
            </div>
            <div className="commit-body">
              <div className="commit-top">
                <span className="commit-message">{commit.message}</span>
                <span className="commit-date">{formatDate(commit.date)}</span>
              </div>
              <div className="commit-bottom">
                <span className="commit-author">{commit.author}</span>
                <code className="commit-hash">{commit.shortHash}</code>
                {refs.map((ref) => (
                  <span
                    key={ref}
                    className={`commit-ref ${ref.includes('HEAD') ? 'ref-head' : ref.includes('origin') ? 'ref-remote' : 'ref-local'}`}
                  >
                    {ref.replace('HEAD -> ', '').replace('origin/', '')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
