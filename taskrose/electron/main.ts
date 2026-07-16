import { app, BrowserWindow, ipcMain, Notification } from 'electron';
import path from 'path';
import { TasksService, TaskInput } from './tasks-service';

const isDev = process.env.NODE_ENV === 'development';
const REMINDER_CHECK_INTERVAL_MS = 20_000;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    minWidth: 720,
    minHeight: 520,
    backgroundColor: '#1a0a14',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../public/favicon.svg'),
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function checkReminders() {
  const due = TasksService.dueReminders();
  for (const task of due) {
    const notification = new Notification({
      title: 'Rappel de tâche',
      body: task.title,
      silent: false,
    });
    notification.show();
  }
  if (due.length > 0) {
    mainWindow?.webContents.send('tasks:reminders-fired', due);
  }
}

app.whenReady().then(() => {
  createWindow();
  registerTaskHandlers();

  checkReminders();
  setInterval(checkReminders, REMINDER_CHECK_INTERVAL_MS);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function registerTaskHandlers() {
  ipcMain.handle('tasks:list', async () => {
    return TasksService.list();
  });

  ipcMain.handle('tasks:add', async (_event, input: TaskInput) => {
    return TasksService.add(input);
  });

  ipcMain.handle('tasks:update', async (_event, id: string, input: TaskInput) => {
    return TasksService.update(id, input);
  });

  ipcMain.handle('tasks:toggle-complete', async (_event, id: string) => {
    return TasksService.toggleComplete(id);
  });

  ipcMain.handle('tasks:remove', async (_event, id: string) => {
    return TasksService.remove(id);
  });
}
