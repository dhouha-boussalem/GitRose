import { useState, useRef, useEffect } from 'react';
import type { Branch } from '../types/git';
import { StashPanel } from './StashPanel';

interface SidebarProps {
  branches: Branch[];
  userName: string;
  focusedBranch: string | null;
  repoPath: string;
  onCheckout: (name: string) => Promise<void>;
  onCheckoutRemote: (remoteBranch: string) => Promise<string>;
  onCreateBranch: (name: string) => Promise<void>;
  onFocus: (branch: string | null) => void;
  onRefresh: () => void;
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

export function Sidebar({ branches, userName, focusedBranch, repoPath, onCheckout, onCheckoutRemote, onCreateBranch, onFocus, onRefresh }: SidebarProps) {
  const [switching, setSwitching] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const q = search.trim().toLowerCase();
  const local = branches.filter((b) => !b.isRemote && (!q || b.name.toLowerCase().includes(q)));
  const remote = branches.filter((b) => b.isRemote && (!q || b.name.toLowerCase().includes(q)));

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleCheckoutRemote(name: string) {
    if (switching) return;
    setSwitching(name);
    try {
      const localName = await onCheckoutRemote(name);
      showToast(`Checked out → ${localName}`);
    } catch (e: any) {
      showToast(`Error: ${e?.message ?? 'checkout failed'}`);
    } finally {
      setSwitching(null);
    }
  }

  async function handleCheckout(name: string, isCurrent: boolean) {
    if (isCurrent || switching) return;
    setSwitching(name);
    await onCheckout(name);
    setSwitching(null);
  }

  function handleFocus(name: string) {
    onFocus(focusedBranch === name ? null : name);
  }

  function startCreating() {
    setCreating(true);
    setNewBranchName('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function confirmCreate() {
    const name = newBranchName.trim();
    if (!name) { setCreating(false); return; }
    setCreating(false);
    setNewBranchName('');
    try {
      await onCreateBranch(name);
      showToast(`Created → ${name}`);
    } catch (e: any) {
      showToast(`Error: ${e?.message ?? 'failed'}`);
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-logo">
          <span className="logo-icon">🌹</span>
          <span className="logo-text">GitRose</span>
        </div>
      </div>

      <div className="sidebar-search-row">
        <span className="sidebar-search-icon">⌕</span>
        <input
          className="sidebar-search-input"
          placeholder="Rechercher une branche…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="sidebar-search-clear" onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">
          LOCAL BRANCHES
          <button className="sidebar-new-branch-btn" onClick={startCreating} title="New branch">+</button>
        </div>
        {creating && (
          <div className="sidebar-new-branch-row">
            <input
              ref={inputRef}
              className="sidebar-new-branch-input"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmCreate();
                if (e.key === 'Escape') setCreating(false);
              }}
              placeholder="branch-name"
            />
          </div>
        )}
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
              className={`branch-item remote ${switching === branch.name ? 'switching' : ''}`}
              onClick={() => onFocus(focusedBranch === branch.name ? null : branch.name)}
              onDoubleClick={() => handleCheckoutRemote(branch.name)}
              disabled={!!switching}
              title="Double-click to checkout locally"
            >
              <span className="branch-icon">
                {switching === branch.name ? <span className="branch-spinner" /> : '↗'}
              </span>
              <span className="branch-name">{branch.name}</span>
            </button>
          ))}
        </div>
      )}

      <StashPanel repoPath={repoPath} onRefresh={onRefresh} />

      {toast && (
        <div className="sidebar-toast">{toast}</div>
      )}
    </aside>
  );
}
