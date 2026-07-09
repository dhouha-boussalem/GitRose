import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { GitService } from './git-service';

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1a0a14',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../public/icon.png'),
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  registerGitHandlers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function registerGitHandlers() {
  ipcMain.handle('git:open-repo', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Ouvrir un dépôt Git',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('git:get-commits', async (_event, repoPath: string) => {
    return GitService.getCommits(repoPath);
  });

  ipcMain.handle('git:get-graph', async (_event, repoPath: string, ref?: string) => {
    return GitService.getGraphCommits(repoPath, 200, ref);
  });

  ipcMain.handle('git:get-branches', async (_event, repoPath: string) => {
    return GitService.getBranches(repoPath);
  });

  ipcMain.handle('git:get-status', async (_event, repoPath: string) => {
    return GitService.getStatus(repoPath);
  });

  ipcMain.handle('git:get-diff', async (_event, repoPath: string, filePath: string, staged: boolean) => {
    return GitService.getDiff(repoPath, filePath, staged);
  });

  ipcMain.handle('git:stage-file', async (_event, repoPath: string, filePath: string) => {
    return GitService.stageFile(repoPath, filePath);
  });

  ipcMain.handle('git:unstage-file', async (_event, repoPath: string, filePath: string) => {
    return GitService.unstageFile(repoPath, filePath);
  });

  ipcMain.handle('git:discard-file', async (_event, repoPath: string, filePath: string, isUntracked: boolean) => {
    return GitService.discardFile(repoPath, filePath, isUntracked);
  });

  ipcMain.handle('git:stage-all', async (_event, repoPath: string) => {
    return GitService.stageAll(repoPath);
  });

  ipcMain.handle('git:commit', async (_event, repoPath: string, message: string) => {
    return GitService.commit(repoPath, message);
  });

  ipcMain.handle('git:push', async (_event, repoPath: string) => {
    return GitService.push(repoPath);
  });

  ipcMain.handle('git:pull', async (_event, repoPath: string) => {
    return GitService.pull(repoPath);
  });

  ipcMain.handle('git:checkout', async (_event, repoPath: string, branch: string) => {
    return GitService.checkout(repoPath, branch);
  });

  ipcMain.handle('git:create-branch', async (_event, repoPath: string, branchName: string) => {
    return GitService.createBranch(repoPath, branchName);
  });

  ipcMain.handle('git:checkout-remote', async (_event, repoPath: string, remoteBranch: string) => {
    return GitService.checkoutRemote(repoPath, remoteBranch);
  });

  ipcMain.handle('git:get-user', async (_event, repoPath: string) => {
    return GitService.getUser(repoPath);
  });

  ipcMain.handle('git:cherry-pick', async (_event, repoPath: string, hash: string) => {
    return GitService.cherryPick(repoPath, hash);
  });

  ipcMain.handle('git:cherry-pick-to-branch', async (_event, repoPath: string, hash: string, branchName: string) => {
    return GitService.cherryPickToNewBranch(repoPath, hash, branchName);
  });
}
