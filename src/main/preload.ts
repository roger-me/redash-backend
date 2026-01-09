import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Auth
  getSession: () => ipcRenderer.invoke('auth:getSession'),
  signInWithEmail: (email: string, password: string) => ipcRenderer.invoke('auth:signInWithEmail', email, password),
  signUp: (email: string, password: string) => ipcRenderer.invoke('auth:signUp', email, password),
  signOut: () => ipcRenderer.invoke('auth:signOut'),
  resetPassword: (email: string) => ipcRenderer.invoke('auth:resetPassword', email),
  signInWithGoogle: () => ipcRenderer.invoke('auth:signInWithGoogle'),
  onAuthStateChange: (callback: (event: string, user: any) => void) => {
    ipcRenderer.on('auth:stateChange', (_, event, user) => callback(event, user));
  },

  // Profiles
  listProfiles: () => ipcRenderer.invoke('profiles:list'),
  createProfile: (profile: any) => ipcRenderer.invoke('profiles:create', profile),
  updateProfile: (id: string, updates: any) => ipcRenderer.invoke('profiles:update', id, updates),
  deleteProfile: (id: string) => ipcRenderer.invoke('profiles:delete', id),

  // Browser
  launchBrowser: (profileId: string) => ipcRenderer.invoke('browser:launch', profileId),
  closeBrowser: (profileId: string) => ipcRenderer.invoke('browser:close', profileId),
  getActiveBrowsers: () => ipcRenderer.invoke('browser:active'),

  // Devices
  listDevices: () => ipcRenderer.invoke('devices:list'),

  // Reddit
  fetchRedditKarma: (username: string) => ipcRenderer.invoke('reddit:fetchKarma', username),

  // Models
  listModels: () => ipcRenderer.invoke('models:list'),
  createModel: (model: any) => ipcRenderer.invoke('models:create', model),
  updateModel: (id: string, updates: any) => ipcRenderer.invoke('models:update', id, updates),
  deleteModel: (id: string) => ipcRenderer.invoke('models:delete', id),

  // Admin
  adminListUsers: () => ipcRenderer.invoke('admin:listUsers'),
  adminCreateUser: (username: string, password: string, role: 'admin' | 'basic') =>
    ipcRenderer.invoke('admin:createUser', username, password, role),
  adminUpdateUser: (userId: string, updates: { username?: string; password?: string; role?: 'admin' | 'basic' }) =>
    ipcRenderer.invoke('admin:updateUser', userId, updates),
  adminDeleteUser: (userId: string) => ipcRenderer.invoke('admin:deleteUser', userId),
  adminGetUserModelAssignments: (userId: string) => ipcRenderer.invoke('admin:getUserModelAssignments', userId),
  adminSetUserModelAssignments: (userId: string, modelIds: string[]) =>
    ipcRenderer.invoke('admin:setUserModelAssignments', userId, modelIds),

  // Events
  onBrowserClosed: (callback: (profileId: string) => void) => {
    ipcRenderer.on('browser:closed', (_, profileId) => callback(profileId));
  },

  // Embedded Browser Controls
  browserNavigate: (url: string) => ipcRenderer.send('browser:navigate', url),
  browserBack: () => ipcRenderer.send('browser:back'),
  browserForward: () => ipcRenderer.send('browser:forward'),
  browserRefresh: () => ipcRenderer.send('browser:refresh'),
  browserNewTab: () => ipcRenderer.send('browser:newTab'),
  browserSwitchTab: (tabId: string) => ipcRenderer.send('browser:switchTab', tabId),
  browserCloseTab: (tabId: string) => ipcRenderer.send('browser:closeTab', tabId),

  // Browser Events
  onBrowserUrlChanged: (callback: (url: string) => void) => {
    ipcRenderer.on('browser:urlChanged', (_, url) => callback(url));
  },
  onBrowserTabsUpdated: (callback: (tabs: any[]) => void) => {
    ipcRenderer.on('browser:tabsUpdated', (_, tabs) => callback(tabs));
  },
  onBrowserProxyStatus: (callback: (status: string, ip: string) => void) => {
    ipcRenderer.on('browser:proxyStatus', (_, status, ip) => callback(status, ip));
  },
  removeBrowserListeners: () => {
    ipcRenderer.removeAllListeners('browser:urlChanged');
    ipcRenderer.removeAllListeners('browser:tabsUpdated');
    ipcRenderer.removeAllListeners('browser:proxyStatus');
  },

  // Flipper
  selectFlipperFiles: () => ipcRenderer.invoke('flipper:selectFiles'),
  selectOutputFolder: () => ipcRenderer.invoke('flipper:selectOutputFolder'),
  getDroppedFiles: (filePaths: string[]) => ipcRenderer.invoke('flipper:getDroppedFiles', filePaths),
  processFlipperFiles: (files: string[], outputFolder: string) => ipcRenderer.invoke('flipper:processFiles', files, outputFolder),
  onFlipperProgress: (callback: (progress: { file: string; status: string; percent: number; error?: string }) => void) => {
    const handler = (_: any, progress: { file: string; status: string; percent: number; error?: string }) => callback(progress);
    ipcRenderer.on('flipper:progress', handler);
    return () => ipcRenderer.removeListener('flipper:progress', handler);
  },

  // Ollama AI
  ollamaIsRunning: () => ipcRenderer.invoke('ollama:isRunning'),
  ollamaListModels: () => ipcRenderer.invoke('ollama:listModels'),
  ollamaGenerate: (model: string, prompt: string, system: string) => ipcRenderer.invoke('ollama:generate', model, prompt, system),
  ollamaPullModel: (name: string, onProgress?: (progress: string) => void) => {
    if (onProgress) {
      const handler = (_: any, progress: string) => onProgress(progress);
      ipcRenderer.on('ollama:pullProgress', handler);
      return ipcRenderer.invoke('ollama:pullModel', name).finally(() => {
        ipcRenderer.removeListener('ollama:pullProgress', handler);
      });
    }
    return ipcRenderer.invoke('ollama:pullModel', name);
  },
  ollamaDeleteModel: (name: string) => ipcRenderer.invoke('ollama:deleteModel', name),
  installOllama: () => ipcRenderer.invoke('ollama:install'),
  onOllamaInstallProgress: (callback: (progress: string) => void) => {
    const handler = (_: any, progress: string) => callback(progress);
    ipcRenderer.on('ollama:installProgress', handler);
    return () => ipcRenderer.removeListener('ollama:installProgress', handler);
  },

  // Updater
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  getAppVersion: () => ipcRenderer.invoke('updater:getVersion'),
  onUpdaterStatus: (callback: (data: { status: string; version?: string; error?: string; releaseNotes?: string }) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('updater:status', handler);
    return () => ipcRenderer.removeListener('updater:status', handler);
  },
  onUpdaterProgress: (callback: (data: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('updater:progress', handler);
    return () => ipcRenderer.removeListener('updater:progress', handler);
  },
});
