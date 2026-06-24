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

  ipcMain.handle('git:get-branches', async (_event, repoPath: string) => {
    return GitService.getBranches(repoPath);
  });

  ipcMain.handle('git:get-status', async (_event, repoPath: string) => {
    return GitService.getStatus(repoPath);
  });

  ipcMain.handle('git:get-diff', async (_event, repoPath: string, filePath: string) => {
    return GitService.getDiff(repoPath, filePath);
  });
}
