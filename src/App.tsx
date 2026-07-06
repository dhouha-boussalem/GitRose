import { useState, useEffect, useCallback } from 'react';
import type { Commit, Branch, RepoStatus, GraphCommit } from './types/git';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { CommitGraph } from './components/CommitGraph';
import { ActionPanel } from './components/ActionPanel';
import { DiffViewer } from './components/DiffViewer';
import { WelcomeScreen } from './components/WelcomeScreen';
import './styles/theme.css';
import './App.css';

export default function App() {
  const [repoPath, setRepoPath] = useState<string | null>(null);
  const [commits, setCommits] = useState<GraphCommit[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [status, setStatus] = useState<RepoStatus | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<GraphCommit | null>(null);
  const [activeView, setActiveView] = useState<'commits' | 'status'>('commits');
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ path: string; staged: boolean } | null>(null);
  const [focusedBranch, setFocusedBranch] = useState<string | null>(null);
  const [showGraph, setShowGraph] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!repoPath) return;
    const [c, b, s] = await Promise.all([
      window.gitRose.getGraph(repoPath, focusedBranch ?? undefined),
      window.gitRose.getBranches(repoPath),
      window.gitRose.getStatus(repoPath),
    ]);
    setCommits(c);
    setBranches(b);
    setStatus(s);
  }, [repoPath]);

  const loadRepo = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const [c, b, s] = await Promise.all([
        window.gitRose.getGraph(path, undefined),
        window.gitRose.getBranches(path),
        window.gitRose.getStatus(path),
      ]);
      setCommits(c);
      setBranches(b);
      setStatus(s);
      setRepoPath(path);
      window.gitRose.getUser(path).then((u) => setUserName(u.name)).catch(() => {});
    } catch (err) {
      console.error('Erreur chargement repo:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpenRepo = useCallback(async () => {
    const path = await window.gitRose.openRepo();
    if (path) loadRepo(path);
  }, [loadRepo]);

  const handleFocusBranch = useCallback(async (branch: string | null) => {
    if (!repoPath) return;
    setFocusedBranch(branch);
    setSelectedCommit(null);
    const c = await window.gitRose.getGraph(repoPath, branch ?? undefined);
    setCommits(c);
  }, [repoPath]);

  useEffect(() => {
    if (!repoPath) return;
    const interval = setInterval(() => {
      window.gitRose.getStatus(repoPath).then(setStatus).catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, [repoPath]);

  if (!repoPath) {
    return <WelcomeScreen onOpenRepo={handleOpenRepo} />;
  }

  return (
    <div className="app-layout">
      <Toolbar
        repoPath={repoPath}
        status={status}
        onOpenRepo={handleOpenRepo}
        activeView={activeView}
        onViewChange={setActiveView}
      />
      <div className="app-body">
        <Sidebar
          branches={branches}
          userName={userName}
          focusedBranch={focusedBranch}
          onCheckout={async (branch) => {
            await window.gitRose.checkout(repoPath, branch);
            await refreshStatus();
          }}
          onCheckoutRemote={async (remoteBranch) => {
            const localName = await window.gitRose.checkoutRemote(repoPath, remoteBranch);
            await refreshStatus();
            return localName;
          }}
          onFocus={handleFocusBranch}
        />
        <main className="main-content">
          {loading ? (
            <div className="loading">
              <span className="loading-spinner" />
              Loading…
            </div>
          ) : activeView === 'commits' ? (
            <>
              <div className="history-toolbar">
                {focusedBranch ? (
                  <>
                    <span className="branch-focus-icon">◆</span>
                    <span className="branch-focus-name">{focusedBranch}</span>
                    <button className="branch-focus-clear" onClick={() => handleFocusBranch(null)}>
                      ✕ All branches
                    </button>
                  </>
                ) : (
                  <span className="history-toolbar-hint">Click a branch to filter</span>
                )}
                <button
                  className={`graph-toggle-btn ${showGraph ? 'active' : ''}`}
                  onClick={() => setShowGraph((v) => !v)}
                  title={showGraph ? 'Hide graph' : 'Show graph'}
                >
                  {showGraph ? '⬡ Hide graph' : '⬡ Show graph'}
                </button>
              </div>
              <CommitGraph
                commits={commits}
                selectedHash={selectedCommit?.hash ?? null}
                showGraph={showGraph}
                onSelect={setSelectedCommit}
              />
            </>
          ) : (
            <div className="changes-layout">
              <ActionPanel
                repoPath={repoPath}
                status={status}
                onRefresh={() => { refreshStatus(); setSelectedFile(null); }}
                onFileSelect={(path, staged) => setSelectedFile({ path, staged })}
                selectedFile={selectedFile?.path ?? null}
              />
              <DiffViewer
                repoPath={repoPath}
                filePath={selectedFile?.path ?? null}
                staged={selectedFile?.staged ?? false}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
