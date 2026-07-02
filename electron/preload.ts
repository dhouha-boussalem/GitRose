import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('gitRose', {
  openRepo: () => ipcRenderer.invoke('git:open-repo'),
  getCommits: (repoPath: string) => ipcRenderer.invoke('git:get-commits', repoPath),
  getBranches: (repoPath: string) => ipcRenderer.invoke('git:get-branches', repoPath),
  getStatus: (repoPath: string) => ipcRenderer.invoke('git:get-status', repoPath),
  getDiff: (repoPath: string, filePath: string, staged: boolean) => ipcRenderer.invoke('git:get-diff', repoPath, filePath, staged),
  stageFile: (repoPath: string, filePath: string) => ipcRenderer.invoke('git:stage-file', repoPath, filePath),
  unstageFile: (repoPath: string, filePath: string) => ipcRenderer.invoke('git:unstage-file', repoPath, filePath),
  stageAll: (repoPath: string) => ipcRenderer.invoke('git:stage-all', repoPath),
  commit: (repoPath: string, message: string) => ipcRenderer.invoke('git:commit', repoPath, message),
  push: (repoPath: string) => ipcRenderer.invoke('git:push', repoPath),
  pull: (repoPath: string) => ipcRenderer.invoke('git:pull', repoPath),
  checkout: (repoPath: string, branch: string) => ipcRenderer.invoke('git:checkout', repoPath, branch),
  getUser: (repoPath: string) => ipcRenderer.invoke('git:get-user', repoPath),
});
