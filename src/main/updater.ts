import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain } from 'electron';

let mainWindow: BrowserWindow | null = null;

// Configure auto-updater
autoUpdater.autoDownload = true;  // Automatically download when update is available
autoUpdater.autoInstallOnAppQuit = true;

// Send status to renderer
function sendStatusToWindow(channel: string, data?: any) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// Set up event listeners
autoUpdater.on('checking-for-update', () => {
  sendStatusToWindow('updater:status', { status: 'checking' });
});

autoUpdater.on('update-available', (info) => {
  sendStatusToWindow('updater:status', {
    status: 'available',
    version: info.version,
    releaseNotes: info.releaseNotes,
    releaseDate: info.releaseDate,
  });
});

autoUpdater.on('update-not-available', (info) => {
  sendStatusToWindow('updater:status', {
    status: 'not-available',
    version: info.version,
  });
});

autoUpdater.on('error', (err) => {
  sendStatusToWindow('updater:status', {
    status: 'error',
    error: err.message,
  });
});

autoUpdater.on('download-progress', (progress) => {
  sendStatusToWindow('updater:progress', {
    percent: progress.percent,
    transferred: progress.transferred,
    total: progress.total,
    bytesPerSecond: progress.bytesPerSecond,
  });
});

autoUpdater.on('update-downloaded', (info) => {
  sendStatusToWindow('updater:status', {
    status: 'downloaded',
    version: info.version,
  });

  // Auto-install after a short delay to let user see the notification
  setTimeout(() => {
    autoUpdater.quitAndInstall(false, true);
  }, 2000);
});

// Initialize updater with main window reference
export function initUpdater(window: BrowserWindow) {
  mainWindow = window;

  // Auto-check for updates after a short delay (let app fully load first)
  setTimeout(async () => {
    try {
      console.log('Auto-checking for updates...');
      await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error('Auto-update check failed:', error);
    }
  }, 3000); // 3 second delay
}

// IPC Handlers
ipcMain.handle('updater:check', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('updater:download', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('updater:install', () => {
  // Quit and install the update
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle('updater:getVersion', () => {
  const { app } = require('electron');
  return app.getVersion();
});
