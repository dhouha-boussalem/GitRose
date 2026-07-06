import { useState, useEffect, useCallback, useRef } from 'react';
import type { Branch, RepoStatus, GraphCommit } from './types/git';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { CommitGraph } from './components/CommitGraph';
import { ActionPanel } from './components/ActionPanel';
import { DiffViewer } from './components/DiffViewer';
import { WelcomeScreen } from './components/WelcomeScreen';
import './styles/theme.css';
import './App.css';

const TAB_COLORS = [
  '#c0006e', '#1e88e5', '#26a69a', '#f4511e',
  '#8e24aa', '#43a047', '#6d4c41', '#00897b',
];

function tabColor(index: number): string {
  return TAB_COLORS[index % TAB_COLORS.length];
}

interface RepoTab {
  id: string;
  path: string;
  name: string;
  color: string;
  commits: GraphCommit[];
  branches: Branch[];
  status: RepoStatus | null;
  selectedCommit: GraphCommit | null;
  focusedBranch: string | null;
  userName: string;
  activeView: 'commits' | 'status';
  selectedFile: { path: string; staged: boolean } | null;
  showGraph: boolean;
  loading: boolean;
}

function repoName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

function newTab(path: string, index: number): RepoTab {
  return {
    id: `${path}-${Date.now()}`,
    path,
    name: repoName(path),
    color: tabColor(index),
    commits: [],
    branches: [],
    status: null,
    selectedCommit: null,
    focusedBranch: null,
    userName: '',
    activeView: 'status',
    selectedFile: null,
    showGraph: false,
    loading: true,
  };
}

export default function App() {
  const [tabs, setTabs] = useState<RepoTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tab = tabs.find((t) => t.id === activeId) ?? null;

  function updateTab(id: string, patch: Partial<RepoTab>) {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  const loadRepo = useCallback(async (path: string, tabId: string) => {
    try {
      const [c, b, s, u] = await Promise.all([
        window.gitRose.getGraph(path, undefined),
        window.gitRose.getBranches(path),
        window.gitRose.getStatus(path),
        window.gitRose.getUser(path).catch(() => ({ name: '', email: '' })),
      ]);
      updateTab(tabId, { commits: c, branches: b, status: s, userName: u.name, loading: false });
    } catch (err) {
      console.error('Load repo error:', err);
      updateTab(tabId, { loading: false });
    }
  }, []);

  const refreshTab = useCallback(async (t: RepoTab) => {
    const [c, b, s] = await Promise.all([
      window.gitRose.getGraph(t.path, t.focusedBranch ?? undefined),
      window.gitRose.getBranches(t.path),
      window.gitRose.getStatus(t.path),
    ]);
    updateTab(t.id, { commits: c, branches: b, status: s });
  }, []);

  const handleOpenRepo = useCallback(async () => {
    const path = await window.gitRose.openRepo();
    if (!path) return;
    // Switch to existing tab if already open
    const existing = tabs.find((t) => t.path === path);
    if (existing) { setActiveId(existing.id); return; }
    const t = newTab(path, tabs.length);
    setTabs((prev) => [...prev, t]);
    setActiveId(t.id);
    loadRepo(path, t.id);
  }, [tabs, loadRepo]);

  const handleCloseTab = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeId === id) setActiveId(next[next.length - 1]?.id ?? null);
      return next;
    });
  }, [activeId]);

  // Poll status for active tab
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!tab) return;
    pollRef.current = setInterval(() => {
      window.gitRose.getStatus(tab.path).then((s) => updateTab(tab.id, { status: s })).catch(() => {});
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeId]);

  if (tabs.length === 0 || !tab) {
    return <WelcomeScreen onOpenRepo={handleOpenRepo} />;
  }

  async function handleFocusBranch(branch: string | null) {
    if (!tab) return;
    const c = await window.gitRose.getGraph(tab.path, branch ?? undefined);
    updateTab(tab.id, { focusedBranch: branch, selectedCommit: null, commits: c });
  }

  return (
    <div className="app-layout">
      {/* Tab bar */}
      <div className="tab-bar">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab-item ${t.id === activeId ? 'active' : ''}`}
            onClick={() => setActiveId(t.id)}
            title={t.path}
            style={t.id === activeId ? {
              borderBottomColor: t.color,
              borderBottomWidth: 2,
              color: t.color,
            } : {}}
          >
            <span className="tab-dot" style={{ background: t.color }} />
            <span className="tab-name">{t.name}</span>
            <span className="tab-close" onClick={(e) => handleCloseTab(t.id, e)}>×</span>
          </button>
        ))}
        <button className="tab-add" onClick={handleOpenRepo} title="Open another repository">+</button>
      </div>

      <Toolbar
        repoPath={tab.path}
        status={tab.status}
        onOpenRepo={handleOpenRepo}
        activeView={tab.activeView}
        onViewChange={(v) => updateTab(tab.id, { activeView: v })}
      />

      <div className="app-body">
        <Sidebar
          branches={tab.branches}
          userName={tab.userName}
          focusedBranch={tab.focusedBranch}
          onCheckout={async (branch) => {
            await window.gitRose.checkout(tab.path, branch);
            await refreshTab(tab);
          }}
          onCreateBranch={async (name) => {
            await window.gitRose.createBranch(tab.path, name);
            await refreshTab(tab);
          }}
          onCheckoutRemote={async (remoteBranch) => {
            const localName = await window.gitRose.checkoutRemote(tab.path, remoteBranch);
            await refreshTab(tab);
            return localName;
          }}
          onFocus={handleFocusBranch}
        />

        <main className="main-content">
          {tab.loading ? (
            <div className="loading">
              <span className="loading-spinner" />
              Loading…
            </div>
          ) : tab.activeView === 'commits' ? (
            <>
              <div className="history-toolbar">
                {tab.focusedBranch ? (
                  <>
                    <span className="branch-focus-icon">◆</span>
                    <span className="branch-focus-name">{tab.focusedBranch}</span>
                    <button className="branch-focus-clear" onClick={() => handleFocusBranch(null)}>
                      ✕ All branches
                    </button>
                  </>
                ) : (
                  <span className="history-toolbar-hint">Click a branch to filter</span>
                )}
                <button
                  className={`graph-toggle-btn ${tab.showGraph ? 'active' : ''}`}
                  onClick={() => updateTab(tab.id, { showGraph: !tab.showGraph })}
                >
                  {tab.showGraph ? '⬡ Hide graph' : '⬡ Show graph'}
                </button>
              </div>
              <CommitGraph
                commits={tab.commits}
                selectedHash={tab.selectedCommit?.hash ?? null}
                showGraph={tab.showGraph}
                onSelect={(c) => updateTab(tab.id, { selectedCommit: c })}
              />
            </>
          ) : (
            <div className="changes-layout">
              <ActionPanel
                repoPath={tab.path}
                status={tab.status}
                onRefresh={() => { refreshTab(tab); updateTab(tab.id, { selectedFile: null }); }}
                onFileSelect={(path, staged) => updateTab(tab.id, { selectedFile: { path, staged } })}
                selectedFile={tab.selectedFile?.path ?? null}
              />
              <DiffViewer
                repoPath={tab.path}
                filePath={tab.selectedFile?.path ?? null}
                staged={tab.selectedFile?.staged ?? false}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
