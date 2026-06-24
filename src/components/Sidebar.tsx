import type { Branch } from '../types/git';

interface SidebarProps {
  branches: Branch[];
  activeBranch: string | null;
  onBranchSelect: (name: string) => void;
}

export function Sidebar({ branches, activeBranch, onBranchSelect }: SidebarProps) {
  const local = branches.filter((b) => !b.isRemote);
  const remote = branches.filter((b) => b.isRemote);

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-logo">
          <span className="logo-icon">🌹</span>
          <span className="logo-text">GitRose</span>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">LOCAL</div>
        {local.map((branch) => (
          <button
            key={branch.name}
            className={`branch-item ${branch.current || activeBranch === branch.name ? 'active' : ''}`}
            onClick={() => onBranchSelect(branch.name)}
          >
            <span className="branch-icon">{branch.current ? '◆' : '◇'}</span>
            <span className="branch-name">{branch.name}</span>
          </button>
        ))}
      </div>

      {remote.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-label">REMOTE</div>
          {remote.map((branch) => (
            <button
              key={branch.name}
              className={`branch-item remote ${activeBranch === branch.name ? 'active' : ''}`}
              onClick={() => onBranchSelect(branch.name)}
            >
              <span className="branch-icon">↗</span>
              <span className="branch-name">{branch.name}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
