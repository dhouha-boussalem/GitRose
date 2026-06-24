export interface Commit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  email: string;
  date: string;
  refs: string;
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
      getBranches: (repoPath: string) => Promise<Branch[]>;
      getStatus: (repoPath: string) => Promise<RepoStatus>;
      getDiff: (repoPath: string, filePath: string) => Promise<string>;
    };
  }
}
