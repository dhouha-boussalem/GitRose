import { useState } from 'react';
import type { Branch } from '../types/git';

interface SidebarProps {
  branches: Branch[];
  onCheckout: (name: string) => Promise<void>;
}

export function Sidebar({ branches, onCheckout }: SidebarProps) {
  const local = branches.filter((b) => !b.isRemote);
  const remote = branches.filter((b) => b.isRemote);
  const [switching, setSwitching] = useState<string | null>(null);

  async function handleCheckout(name: string, isCurrent: boolean) {
    if (isCurrent || switching) return;
    setSwitching(name);
    await onCheckout(name);
    setSwitching(null);
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-logo">
          <span className="logo-icon">🌹</span>
          <span className="logo-text">GitRose</span>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">LOCAL BRANCHES</div>
        {local.map((branch) => (
          <button
            key={branch.name}
            className={`branch-item ${branch.current ? 'active' : ''} ${switching === branch.name ? 'switching' : ''}`}
            onDoubleClick={() => handleCheckout(branch.name, branch.current)}
            onClick={() => {}}
            disabled={!!switching}
            title={branch.current ? 'Current branch' : `Switch to ${branch.name}`}
          >
            <span className="branch-icon">
              {switching === branch.name ? <span className="branch-spinner" /> : branch.current ? '◆' : '◇'}
            </span>
            <span className="branch-name">{branch.name}</span>
          </button>
        ))}
      </div>

      {remote.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-label">REMOTE BRANCHES</div>
          {remote.map((branch) => (
            <button
              key={branch.name}
              className="branch-item remote"
              disabled
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
