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
  ahead: number;
  behind: number;
  current: string | null;
}

declare global {
  interface Window {
    gitRose: {
      openRepo: () => Promise<string | null>;
      getCommits: (repoPath: string) => Promise<Commit[]>;
      getGraph: (repoPath: string, ref?: string) => Promise<GraphCommit[]>;
      getBranches: (repoPath: string) => Promise<Branch[]>;
      getStatus: (repoPath: string) => Promise<RepoStatus>;
      getDiff: (repoPath: string, filePath: string, staged: boolean) => Promise<string>;
      stageFile: (repoPath: string, filePath: string) => Promise<void>;
      unstageFile: (repoPath: string, filePath: string) => Promise<void>;
      discardFile: (repoPath: string, filePath: string, isUntracked: boolean) => Promise<void>;
      stageAll: (repoPath: string) => Promise<void>;
      commit: (repoPath: string, message: string) => Promise<void>;
      push: (repoPath: string) => Promise<void>;
      pull: (repoPath: string) => Promise<void>;
      createBranch: (repoPath: string, branchName: string) => Promise<void>;
      checkout: (repoPath: string, branch: string) => Promise<void>;
      checkoutRemote: (repoPath: string, remoteBranch: string) => Promise<string>;
      getUser: (repoPath: string) => Promise<{ name: string; email: string }>;
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
    };
  }
}
