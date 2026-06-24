import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('gitRose', {
  openRepo: () => ipcRenderer.invoke('git:open-repo'),
  getCommits: (repoPath: string) => ipcRenderer.invoke('git:get-commits', repoPath),
  getBranches: (repoPath: string) => ipcRenderer.invoke('git:get-branches', repoPath),
  getStatus: (repoPath: string) => ipcRenderer.invoke('git:get-status', repoPath),
  getDiff: (repoPath: string, filePath: string) => ipcRenderer.invoke('git:get-diff', repoPath, filePath),
});
