export interface Commit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  email: string;
  date: string;
  refs: string;
  parents: string[];
}

export interface Branch {
  name: string;
  current: boolean;
  commit: string;
  isRemote: boolean;
}

export interface FileStatus {
  path: string;
  status: string;
  staged: boolean;
}

export interface GraphCommit extends Commit {
  lane: number;
  lanes: number;
  edges: { fromLane: number; toLane: number; toIndex: number }[];
  color: string;
}

export interface RepoStatus {
  staged: FileStatus[];
  unstaged: FileStatus[];
  untracked: string[];
  conflicted: string[];
  ahead: number;
  behind: number;
  current: string | null;
}

declare global {
  interface Window {
    gitRose: {
      openRepo: () => Promise<string | null>;
      getRecentRepos: () => Promise<string[]>;
      addRecentRepo: (repoPath: string) => Promise<void>;
      getCommits: (repoPath: string) => Promise<Commit[]>;
      getGraph: (repoPath: string, ref?: string) => Promise<GraphCommit[]>;
      getBranches: (repoPath: string) => Promise<Branch[]>;
      getStatus: (repoPath: string) => Promise<RepoStatus>;
      getDiff: (repoPath: string, filePath: string, staged: boolean) => Promise<string>;
      stageFile: (repoPath: string, filePath: string) => Promise<void>;
      unstageFile: (repoPath: string, filePath: string) => Promise<void>;
      discardFile: (repoPath: string, filePath: string, isUntracked: boolean) => Promise<void>;
      discardAll: (repoPath: string) => Promise<void>;
      stageAll: (repoPath: string) => Promise<void>;
      commit: (repoPath: string, message: string) => Promise<void>;
      push: (repoPath: string) => Promise<void>;
      forcePush: (repoPath: string) => Promise<void>;
      pull: (repoPath: string) => Promise<void>;
      pullRebase: (repoPath: string) => Promise<void>;
      fetch: (repoPath: string) => Promise<void>;
      commitAmend: (repoPath: string, message: string) => Promise<void>;
      deleteBranch: (repoPath: string, name: string, force: boolean) => Promise<void>;
      renameBranch: (repoPath: string, oldName: string, newName: string) => Promise<void>;
      resetToCommit: (repoPath: string, hash: string, mode: 'soft' | 'mixed' | 'hard') => Promise<void>;
      revertCommit: (repoPath: string, hash: string) => Promise<void>;
      getTags: (repoPath: string) => Promise<{ name: string; hash: string; date: string; message: string }[]>;
      createTag: (repoPath: string, name: string, hash: string, message?: string) => Promise<void>;
      deleteTag: (repoPath: string, name: string) => Promise<void>;
      pushTag: (repoPath: string, name: string) => Promise<void>;
      deleteRemoteTag: (repoPath: string, name: string) => Promise<void>;
      merge: (repoPath: string, branch: string) => Promise<void>;
      getConflicts: (repoPath: string) => Promise<{ path: string; status: string }[]>;
      getConflictContent: (repoPath: string, filePath: string) => Promise<{ ours: string; base: string; theirs: string; raw: string }>;
      resolveConflict: (repoPath: string, filePath: string, content: string) => Promise<void>;
      createBranch: (repoPath: string, branchName: string) => Promise<void>;
      checkout: (repoPath: string, branch: string) => Promise<void>;
      checkoutRemote: (repoPath: string, remoteBranch: string) => Promise<string>;
      getUser: (repoPath: string) => Promise<{ name: string; email: string }>;
      stashShow: (repoPath: string, index: number) => Promise<string>;
      stashShowFiles: (repoPath: string, index: number) => Promise<{ path: string; status: string }[]>;
      stashShowFileDiff: (repoPath: string, index: number, filePath: string) => Promise<string>;
      stashList: (repoPath: string) => Promise<{ index: number; message: string; branch: string }[]>;
      stashSave: (repoPath: string, message?: string) => Promise<void>;
      stashApply: (repoPath: string, index: number) => Promise<void>;
      stashPop: (repoPath: string, index: number) => Promise<void>;
      stashDrop: (repoPath: string, index: number) => Promise<void>;
      runCommand: (repoPath: string, args: string[]) => Promise<string>;
      squashToCommit: (repoPath: string, hash: string, message: string) => Promise<void>;
      rebase: (repoPath: string, branch: string) => Promise<void>;
      cherryPick: (repoPath: string, hash: string) => Promise<void>;
      cherryPickToBranch: (repoPath: string, hash: string, branchName: string) => Promise<void>;
      getCommitFiles: (repoPath: string, hash: string) => Promise<{ path: string; status: string }[]>;
      getCommitFileDiff: (repoPath: string, hash: string, filePath: string) => Promise<string>;
      getRemotes: (repoPath: string) => Promise<{ name: string; fetchUrl: string; pushUrl: string }[]>;
      addRemote: (repoPath: string, name: string, url: string) => Promise<void>;
      removeRemote: (repoPath: string, name: string) => Promise<void>;
      renameRemote: (repoPath: string, oldName: string, newName: string) => Promise<void>;
      setRemoteUrl: (repoPath: string, name: string, url: string) => Promise<void>;
      getBranchDiffFiles: (repoPath: string, base: string, compare: string) => Promise<{ path: string; status: string }[]>;
      getBranchDiffFileDiff: (repoPath: string, base: string, compare: string, filePath: string) => Promise<string>;
      cloneRepo: (url: string, destPath: string) => Promise<string>;
      pickCloneDir: () => Promise<string | null>;
    };
  }
}
