import type { GraphCommit } from '../types/git';

interface CommitGraphProps {
  commits: GraphCommit[];
  selectedHash: string | null;
  showGraph: boolean;
  onSelect: (commit: GraphCommit) => void;
}

const ROW_HEIGHT = 60;
const LANE_WIDTH = 10;
const DOT_RADIUS = 4;
const PADDING = 8;
const SVG_EXTRA = 12;

function laneX(lane: number): number {
  return PADDING + lane * LANE_WIDTH;
}

function rowY(index: number): number {
  return index * ROW_HEIGHT + ROW_HEIGHT / 2;
}

export function CommitGraph({ commits, selectedHash, showGraph, onSelect }: CommitGraphProps) {
  if (commits.length === 0) {
    return <div className="commit-empty"><span>No commits found</span></div>;
  }

  const maxLanes = Math.max(...commits.map((c) => c.lanes), 1);
  const svgWidth = PADDING * 2 + maxLanes * LANE_WIDTH + SVG_EXTRA;
  const svgHeight = commits.length * ROW_HEIGHT;

  const edgePaths: { d: string; color: string; key: string }[] = [];
  if (showGraph) {
    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i];
      for (const edge of commit.edges) {
        const x1 = laneX(edge.fromLane);
        const y1 = rowY(i);
        const x2 = laneX(edge.toLane);
        const y2 = rowY(edge.toIndex);
        const d = x1 === x2
          ? `M ${x1} ${y1} L ${x2} ${y2}`
          : `M ${x1} ${y1} Q ${x1} ${(y1 + y2) / 2}, ${x2} ${y2}`;
        edgePaths.push({ d, color: commit.color, key: `${i}-${edge.fromLane}-${edge.toLane}` });
      }
    }
  }

  return (
    <div className="commit-list">
      <div style={{ display: 'flex' }}>
        {showGraph && (
          <svg
            width={svgWidth}
            height={svgHeight}
            style={{ display: 'block', flexShrink: 0 }}
          >
            {edgePaths.map((ep) => (
              <path key={ep.key} d={ep.d} stroke={ep.color} strokeWidth={2} fill="none" opacity={0.85} />
            ))}
            {commits.map((commit, i) => (
              <g key={commit.hash}>
                <circle
                  cx={laneX(commit.lane)}
                  cy={rowY(i)}
                  r={DOT_RADIUS + 2}
                  fill={commit.color}
                  opacity={0.18}
                />
                <circle
                  cx={laneX(commit.lane)}
                  cy={rowY(i)}
                  r={DOT_RADIUS}
                  fill={commit.color}
                  stroke="#fff"
                  strokeWidth={1.5}
                />
              </g>
            ))}
          </svg>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {commits.map((commit) => {
            const refs = commit.refs ? commit.refs.split(', ').filter(Boolean) : [];
            return (
              <div
                key={commit.hash}
                className={`commit-row ${selectedHash === commit.hash ? 'selected' : ''}`}
                style={{ height: ROW_HEIGHT, boxSizing: 'border-box', overflow: 'hidden' }}
                onClick={() => onSelect(commit)}
              >
                <div className="commit-avatar" style={{ backgroundColor: hashToColor(commit.email) }}>
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
      </div>
    </div>
  );
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
  const colors = ['#5c6bc0', '#26a69a', '#43a047', '#f4511e', '#8e24aa', '#00897b', '#1e88e5', '#c8003b', '#e53935', '#6d4c41'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
