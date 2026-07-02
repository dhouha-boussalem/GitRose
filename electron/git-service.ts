import simpleGit, { SimpleGit, LogResult, BranchSummary, StatusResult } from 'simple-git';

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

export class GitService {
  private static getGit(repoPath: string): SimpleGit {
    return simpleGit(repoPath);
  }

  static async getCommits(repoPath: string, maxCount = 200): Promise<Commit[]> {
    const git = this.getGit(repoPath);
    const log: LogResult = await git.log({
      maxCount,
      '--format': '%H|%h|%s|%an|%ae|%ai|%D',
    });

    return log.all.map((entry) => ({
      hash: entry.hash,
      shortHash: entry.hash.substring(0, 7),
      message: entry.message,
      author: entry.author_name,
      email: entry.author_email,
      date: entry.date,
      refs: entry.refs,
    }));
  }

  static async getBranches(repoPath: string): Promise<Branch[]> {
    const git = this.getGit(repoPath);
    const summary: BranchSummary = await git.branch(['-a', '-v']);

    return Object.entries(summary.branches).map(([name, info]) => ({
      name: name.replace('remotes/', ''),
      current: info.current,
      commit: info.commit,
      isRemote: name.startsWith('remotes/'),
    }));
  }

  static async getStatus(repoPath: string): Promise<RepoStatus> {
    const git = this.getGit(repoPath);
    const status: StatusResult = await git.status();

    const createdSet = new Set(status.created);
    const deletedStagedSet = new Set(status.deleted.filter((f) => status.staged.includes(f)));

    const staged: FileStatus[] = [
      ...status.created.map((f) => ({ path: f, status: 'created', staged: true })),
      ...status.staged
        .filter((f) => !createdSet.has(f) && !deletedStagedSet.has(f))
        .map((f) => ({ path: f, status: 'modified', staged: true })),
      ...[...deletedStagedSet].map((f) => ({ path: f, status: 'deleted', staged: true })),
    ];

    const unstaged: FileStatus[] = [
      ...status.modified.filter((f) => !status.staged.includes(f)).map((f) => ({ path: f, status: 'modified', staged: false })),
      ...status.deleted.filter((f) => !status.staged.includes(f)).map((f) => ({ path: f, status: 'deleted', staged: false })),
    ];

    return {
      staged,
      unstaged,
      untracked: status.not_added,
      ahead: status.ahead,
      behind: status.behind,
      current: status.current,
    };
  }

  static async getDiff(repoPath: string, filePath: string): Promise<string> {
    const git = this.getGit(repoPath);
    return git.diff([filePath]);
  }

  static async stageFile(repoPath: string, filePath: string): Promise<void> {
    await this.getGit(repoPath).add(filePath);
  }

  static async unstageFile(repoPath: string, filePath: string): Promise<void> {
    await this.getGit(repoPath).reset(['HEAD', '--', filePath]);
  }

  static async stageAll(repoPath: string): Promise<void> {
    await this.getGit(repoPath).add('.');
  }

  static async commit(repoPath: string, message: string): Promise<void> {
    await this.getGit(repoPath).commit(message);
  }

  static async push(repoPath: string): Promise<void> {
    const git = this.getGit(repoPath);
    const status = await git.status();
    const branch = status.current;
    if (!branch) throw new Error('Not on a branch');

    const tracking = await git.revparse(['--abbrev-ref', '--symbolic-full-name', '@{u}'])
      .catch(() => null);

    if (tracking) {
      await git.push();
    } else {
      await git.push(['--set-upstream', 'origin', branch]);
    }
  }

  static async pull(repoPath: string): Promise<void> {
    await this.getGit(repoPath).pull();
  }
}
