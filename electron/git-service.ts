import simpleGit, { SimpleGit, LogResult, BranchSummary, StatusResult } from 'simple-git';

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

export interface GraphCommit extends Commit {
  lane: number;
  lanes: number;
  edges: { fromLane: number; toLane: number; toIndex: number }[];
  color: string;
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
    const log: LogResult = await git.log({ maxCount });

    // Get parent hashes separately
    const parentMap = await this.getParentMap(repoPath, maxCount);

    return log.all.map((entry) => ({
      hash: entry.hash,
      shortHash: entry.hash.substring(0, 7),
      message: entry.message,
      author: entry.author_name,
      email: entry.author_email,
      date: entry.date,
      refs: entry.refs,
      parents: parentMap.get(entry.hash) ?? [],
    }));
  }

  private static async getParentMap(repoPath: string, maxCount: number): Promise<Map<string, string[]>> {
    const git = this.getGit(repoPath);
    const raw = await git.raw(['log', `--max-count=${maxCount}`, '--format=%H %P']);
    const map = new Map<string, string[]>();
    for (const line of raw.trim().split('\n')) {
      const parts = line.trim().split(' ').filter(Boolean);
      if (parts.length > 0) {
        map.set(parts[0], parts.slice(1));
      }
    }
    return map;
  }

  static async getGraphCommits(repoPath: string, maxCount = 200): Promise<GraphCommit[]> {
    const commits = await this.getCommits(repoPath, maxCount);
    return buildGraph(commits);
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

  static async getDiff(repoPath: string, filePath: string, staged = false): Promise<string> {
    const git = this.getGit(repoPath);
    const diff = staged
      ? await git.diff(['--cached', '--', filePath])
      : await git.diff(['--', filePath]);

    if (diff) return diff;

    // Untracked or new file — read raw content and fake a diff
    const fs = await import('fs/promises');
    const path = await import('path');
    const fullPath = path.join(repoPath, filePath);
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');
      const header = `--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${lines.length} @@\n`;
      return header + lines.map((l) => '+' + l).join('\n');
    } catch {
      return '';
    }
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

  static async checkout(repoPath: string, branch: string): Promise<void> {
    await this.getGit(repoPath).checkout(branch);
  }

  static async getUser(repoPath: string): Promise<{ name: string; email: string }> {
    const git = this.getGit(repoPath);
    const name = await git.raw(['config', 'user.name']).then((s) => s.trim()).catch(() => '');
    const email = await git.raw(['config', 'user.email']).then((s) => s.trim()).catch(() => '');
    return { name, email };
  }
}

const GRAPH_COLORS = [
  '#eb2f8a', '#9b8af7', '#52d9a0', '#f7c948',
  '#4da6ff', '#f76059', '#ff85bc', '#52c8d9',
];

function buildGraph(commits: Commit[]): GraphCommit[] {
  // lanes[i] = hash of the commit we're waiting for in lane i (null = free)
  const lanes: (string | null)[] = [];
  const result: GraphCommit[] = [];

  function getLaneColor(lane: number): string {
    return GRAPH_COLORS[lane % GRAPH_COLORS.length];
  }

  function findLane(hash: string): number {
    return lanes.indexOf(hash);
  }

  function freeLane(): number {
    const free = lanes.indexOf(null);
    if (free !== -1) return free;
    lanes.push(null);
    return lanes.length - 1;
  }

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];
    const { hash, parents } = commit;

    // Find which lane this commit belongs to
    let lane = findLane(hash);
    if (lane === -1) {
      lane = freeLane();
    }

    // Build edges: this commit connects to its parents
    const edges: GraphCommit['edges'] = [];

    if (parents.length === 0) {
      // Root commit — free the lane
      lanes[lane] = null;
    } else {
      // First parent continues in same lane
      lanes[lane] = parents[0];

      // Find where first parent will appear (for edge drawing)
      const p0idx = commits.findIndex((c, j) => j > i && c.hash === parents[0]);
      edges.push({ fromLane: lane, toLane: lane, toIndex: p0idx === -1 ? i + 1 : p0idx });

      // Additional parents (merge commits) get new or existing lanes
      for (let p = 1; p < parents.length; p++) {
        const existingLane = findLane(parents[p]);
        let targetLane: number;
        if (existingLane !== -1) {
          targetLane = existingLane;
        } else {
          targetLane = freeLane();
          lanes[targetLane] = parents[p];
        }
        const pidx = commits.findIndex((c, j) => j > i && c.hash === parents[p]);
        edges.push({ fromLane: lane, toLane: targetLane, toIndex: pidx === -1 ? i + 1 : pidx });
      }
    }

    // Compact lanes (remove trailing nulls)
    while (lanes.length > 0 && lanes[lanes.length - 1] === null) lanes.pop();

    result.push({
      ...commit,
      lane,
      lanes: Math.max(lanes.length, lane + 1),
      edges,
      color: getLaneColor(lane),
    });
  }

  return result;
}
