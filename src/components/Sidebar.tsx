import { useState } from 'react';
import type { Branch } from '../types/git';

interface SidebarProps {
  branches: Branch[];
  userName: string;
  focusedBranch: string | null;
  onCheckout: (name: string) => Promise<void>;
  onFocus: (branch: string | null) => void;
}

function GirlAvatar() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hair */}
      <ellipse cx="10" cy="7.5" rx="5" ry="5.5" fill="#ffadd2" />
      <path d="M5 8 Q4 14 5.5 16 Q7 13 10 13 Q13 13 14.5 16 Q16 14 15 8" fill="#ffadd2" />
      {/* Face */}
      <ellipse cx="10" cy="8.5" rx="3.5" ry="4" fill="#ffe4f0" />
      {/* Bangs */}
      <path d="M5.5 7 Q7 5 10 5 Q13 5 14.5 7 Q13 6.5 10 6.5 Q7 6.5 5.5 7Z" fill="#eb2f8a" />
      {/* Eyes */}
      <circle cx="8.3" cy="8.5" r="0.6" fill="#1a0a14" />
      <circle cx="11.7" cy="8.5" r="0.6" fill="#1a0a14" />
      {/* Smile */}
      <path d="M8.5 10.5 Q10 11.5 11.5 10.5" stroke="#c4177a" strokeWidth="0.6" strokeLinecap="round" fill="none" />
      {/* Shoulders */}
      <path d="M4 19 Q5 16 10 15.5 Q15 16 16 19" fill="#eb2f8a" />
    </svg>
  );
}

function getInitials(name: string): string {
  return name.split(/\s+/).map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export function Sidebar({ branches, userName, focusedBranch, onCheckout, onFocus }: SidebarProps) {
  const local = branches.filter((b) => !b.isRemote);
  const remote = branches.filter((b) => b.isRemote);
  const [switching, setSwitching] = useState<string | null>(null);

  async function handleCheckout(name: string, isCurrent: boolean) {
    if (isCurrent || switching) return;
    setSwitching(name);
    await onCheckout(name);
    setSwitching(null);
  }

  function handleFocus(name: string) {
    onFocus(focusedBranch === name ? null : name);
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
            className={`branch-item ${branch.current ? 'active' : ''} ${switching === branch.name ? 'switching' : ''} ${focusedBranch === branch.name ? 'focused' : ''}`}
            onClick={() => handleFocus(branch.name)}
            onDoubleClick={() => handleCheckout(branch.name, branch.current)}
            disabled={!!switching}
            title={`Click to view history · Double-click to switch`}
          >
            <span className="branch-icon">
              {switching === branch.name ? <span className="branch-spinner" /> : branch.current ? '◆' : '◇'}
            </span>
            <span className="branch-name">{branch.name}</span>
            {branch.current && (
              <span className="branch-you" title={userName || 'You'}>
                {userName ? getInitials(userName) : <GirlAvatar />}
              </span>
            )}
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
