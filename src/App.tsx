import { useState, useEffect, useCallback } from 'react';
import type { Commit, Branch, RepoStatus } from './types/git';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { CommitList } from './components/CommitList';
import { ActionPanel } from './components/ActionPanel';
import { WelcomeScreen } from './components/WelcomeScreen';
import './styles/theme.css';
import './App.css';

export default function App() {
  const [repoPath, setRepoPath] = useState<string | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [status, setStatus] = useState<RepoStatus | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [activeView, setActiveView] = useState<'commits' | 'status'>('commits');
  const [loading, setLoading] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!repoPath) return;
    const [c, b, s] = await Promise.all([
      window.gitRose.getCommits(repoPath),
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
        window.gitRose.getCommits(path),
        window.gitRose.getBranches(path),
        window.gitRose.getStatus(path),
      ]);
      setCommits(c);
      setBranches(b);
      setStatus(s);
      setRepoPath(path);
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
          onCheckout={async (branch) => {
            await window.gitRose.checkout(repoPath, branch);
            await refreshStatus();
          }}
        />
        <main className="main-content">
          {loading ? (
            <div className="loading">
              <span className="loading-spinner" />
              Loading…
            </div>
          ) : activeView === 'commits' ? (
            <CommitList
              commits={commits}
              selectedHash={selectedCommit?.hash ?? null}
              onSelect={setSelectedCommit}
            />
          ) : (
            <ActionPanel
              repoPath={repoPath}
              status={status}
              onRefresh={refreshStatus}
            />
          )}
        </main>
      </div>
    </div>
  );
}
