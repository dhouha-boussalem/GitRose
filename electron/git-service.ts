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

  static async getCommits(repoPath: string, maxCount = 200, ref?: string): Promise<Commit[]> {
    const git = this.getGit(repoPath);
    const logArgs = ref ? [ref] : [];
    const log: LogResult = await git.log([...logArgs, `--max-count=${maxCount}`] as any);

    const parentMap = await this.getParentMap(repoPath, maxCount, ref);

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

  private static async getParentMap(repoPath: string, maxCount: number, ref?: string): Promise<Map<string, string[]>> {
    const git = this.getGit(repoPath);
    const args = ['log', `--max-count=${maxCount}`, '--format=%H %P'];
    if (ref) args.push(ref);
    const raw = await git.raw(args);
    const map = new Map<string, string[]>();
    for (const line of raw.trim().split('\n')) {
      const parts = line.trim().split(' ').filter(Boolean);
      if (parts.length > 0) {
        map.set(parts[0], parts.slice(1));
      }
    }
    return map;
  }

  static async getGraphCommits(repoPath: string, maxCount = 200, ref?: string): Promise<GraphCommit[]> {
    const commits = await this.getCommits(repoPath, maxCount, ref);
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

  static async discardFile(repoPath: string, filePath: string, isUntracked: boolean): Promise<void> {
    if (isUntracked) {
      const fs = await import('fs/promises');
      const path = await import('path');
      await fs.unlink(path.join(repoPath, filePath));
    } else {
      await this.getGit(repoPath).checkout(['--', filePath]);
    }
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

  static async createBranch(repoPath: string, branchName: string): Promise<void> {
    await this.getGit(repoPath).checkoutLocalBranch(branchName);
  }

  static async checkoutRemote(repoPath: string, remoteBranch: string): Promise<string> {
    // remoteBranch is e.g. "origin/feat/xxx" — strip the "origin/" prefix for local name
    const localName = remoteBranch.replace(/^[^/]+\//, '');
    await this.getGit(repoPath).checkout(['-b', localName, '--track', remoteBranch]);
    return localName;
  }

  static async stashList(repoPath: string): Promise<{ index: number; message: string; branch: string }[]> {
    const out = await this.getGit(repoPath).raw(['stash', 'list', '--format=%gd|%s|%D']).catch(() => '');
    return out.trim().split('\n').filter(Boolean).map((line, i) => {
      const [ref, message, branch] = line.split('|');
      return { index: i, message: message?.trim() ?? `stash@{${i}}`, branch: branch?.trim() ?? '' };
    });
  }

  static async stashShow(repoPath: string, index: number): Promise<string> {
    return this.getGit(repoPath).raw(['stash', 'show', '-p', '--stat', `stash@{${index}}`]);
  }

  static async stashShowFiles(repoPath: string, index: number): Promise<{ path: string; status: string }[]> {
    const out = await this.getGit(repoPath).raw(['stash', 'show', '--name-status', `stash@{${index}}`]);
    return out.trim().split('\n').filter(Boolean).map((line) => {
      const [status, ...rest] = line.split('\t');
      return { status: status.trim(), path: rest.join('\t').trim() };
    });
  }

  static async stashShowFileDiff(repoPath: string, index: number, filePath: string): Promise<string> {
    return this.getGit(repoPath).raw(['stash', 'show', '-p', `stash@{${index}}`, '--', filePath]);
  }

  static async stashSave(repoPath: string, message?: string): Promise<void> {
    const args = ['stash', 'push'];
    if (message) args.push('-m', message);
    await this.getGit(repoPath).raw(args);
  }

  static async stashApply(repoPath: string, index: number): Promise<void> {
    await this.getGit(repoPath).raw(['stash', 'apply', `stash@{${index}}`]);
  }

  static async stashPop(repoPath: string, index: number): Promise<void> {
    await this.getGit(repoPath).raw(['stash', 'pop', `stash@{${index}}`]);
  }

  static async stashDrop(repoPath: string, index: number): Promise<void> {
    await this.getGit(repoPath).raw(['stash', 'drop', `stash@{${index}}`]);
  }

  static async runCommand(repoPath: string, args: string[]): Promise<string> {
    // Only allow git subcommands — strip leading "git" if user typed it
    const filtered = args[0]?.toLowerCase() === 'git' ? args.slice(1) : args;
    if (filtered.length === 0) throw new Error('Empty command');
    return this.getGit(repoPath).raw(filtered);
  }

  static async squashToCommit(repoPath: string, hash: string, message: string): Promise<void> {
    const git = this.getGit(repoPath);
    // Reset soft to the parent of the target commit — keeps all changes staged
    await git.raw(['reset', '--soft', `${hash}~1`]);
    await git.raw(['commit', '-m', message]);
  }

  static async rebase(repoPath: string, branch: string): Promise<void> {
    await this.getGit(repoPath).raw(['rebase', branch]);
  }

  static async cherryPick(repoPath: string, hash: string): Promise<void> {
    await this.getGit(repoPath).raw(['cherry-pick', hash]);
  }

  static async cherryPickToNewBranch(repoPath: string, hash: string, branchName: string): Promise<void> {
    const git = this.getGit(repoPath);
    await git.checkoutLocalBranch(branchName);
    await git.raw(['cherry-pick', hash]);
  }

  static async getUser(repoPath: string): Promise<{ name: string; email: string }> {
    const git = this.getGit(repoPath);
    const name = await git.raw(['config', 'user.name']).then((s) => s.trim()).catch(() => '');
    const email = await git.raw(['config', 'user.email']).then((s) => s.trim()).catch(() => '');
    return { name, email };
  }
}

const GRAPH_COLORS = [
  '#7c4dff', // violet
  '#26c6da', // teal
  '#66bb6a', // green
  '#ffa726', // orange
  '#42a5f5', // blue
  '#ef5350', // red
  '#ab47bc', // purple
  '#d4e157', // lime
  '#26a69a', // teal dark
  '#ec407a', // pink (just one, not first)
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
        const pidx = commits.findIndex((c, j) => j > i && c.hash === parents[p]);
        const existingLane = findLane(parents[p]);
        if (pidx === -1 && existingLane === -1) {
          // Parent is outside the visible window — draw a short stub edge downward, don't hold a lane
          edges.push({ fromLane: lane, toLane: lane, toIndex: i + 1 });
          continue;
        }
        let targetLane: number;
        if (existingLane !== -1) {
          targetLane = existingLane;
        } else {
          targetLane = freeLane();
          lanes[targetLane] = parents[p];
        }
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
