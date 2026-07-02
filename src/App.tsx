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

  const refreshStatus = useCallback(async () => {
    if (!repoPath) return;
    const [c, b, s] = await Promise.all([
      window.gitRose.getGraph(repoPath),
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
        window.gitRose.getGraph(path),
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
            <CommitGraph
              commits={commits}
              selectedHash={selectedCommit?.hash ?? null}
              onSelect={setSelectedCommit}
            />
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
