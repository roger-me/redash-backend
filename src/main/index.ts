import { app, BrowserWindow, BrowserView, ipcMain, session, WebContents, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { processFiles, isValidFlipperFile } from './flipper';

// Supabase imports
import { getSession, signInWithEmail, signUp, signOut, resetPassword, signInWithGoogle, onAuthStateChange } from './supabase/auth';
import * as db from './supabase/database';
import * as admin from './supabase/admin';
import * as emails from './supabase/emails';
import * as logs from './supabase/logs';

// Updater
import { initUpdater } from './updater';

// Google Sheets
import * as googleSheets from './googleSheets';

// Types
interface Proxy {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

interface Profile {
  id: string;
  name: string;
  modelId?: string;
  type: 'desktop' | 'mobile';
  browser: 'chromium' | 'firefox' | 'webkit';
  proxy?: Proxy;
  device?: string;
  createdAt: string;
}

interface ActiveSession {
  profileId: string;
  window: BrowserWindow;
}

// Mobile device configurations
const mobileDevices: Record<string, { userAgent: string; width: number; height: number }> = {
  'iPhone 14': {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    width: 390,
    height: 844,
  },
  'iPhone 14 Pro Max': {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    width: 430,
    height: 932,
  },
  'iPhone 13': {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    width: 390,
    height: 844,
  },
  'iPhone 12': {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    width: 390,
    height: 844,
  },
  'Pixel 7': {
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
    width: 412,
    height: 915,
  },
  'Pixel 6': {
    userAgent: 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
    width: 412,
    height: 915,
  },
  'Galaxy S23': {
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
    width: 360,
    height: 780,
  },
  'Galaxy S22': {
    userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
    width: 360,
    height: 780,
  },
  'iPad Pro 11': {
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    width: 834,
    height: 1194,
  },
  'iPad Mini': {
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    width: 768,
    height: 1024,
  },
};

// State
const activeSessions: Map<string, ActiveSession> = new Map();
const proxyCredentials: Map<string, { username: string; password: string }> = new Map();
let mainWindow: BrowserWindow | null = null;

// Paths
const getDataPath = () => {
  const dataPath = path.join(app.getPath('userData'), 'redash-data');
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  return dataPath;
};

const getProfilesPath = () => path.join(getDataPath(), 'profiles.json');
const getModelsPath = () => path.join(getDataPath(), 'models.json');
const getProfileDataPath = (profileId: string) => {
  const profilePath = path.join(getDataPath(), 'profiles', profileId);
  if (!fs.existsSync(profilePath)) {
    fs.mkdirSync(profilePath, { recursive: true });
  }
  return profilePath;
};

// Profile Management
function loadProfiles(): Profile[] {
  try {
    const data = fs.readFileSync(getProfilesPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveProfiles(profiles: Profile[]): void {
  fs.writeFileSync(getProfilesPath(), JSON.stringify(profiles, null, 2));
}

// Model Management
interface Model {
  id: string;
  name: string;
  isExpanded?: boolean;
  profilePicture?: string;
  createdAt: string;
}

function loadModels(): Model[] {
  try {
    const data = fs.readFileSync(getModelsPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveModels(models: Model[]): void {
  fs.writeFileSync(getModelsPath(), JSON.stringify(models, null, 2));
}

// Auth IPC Handlers
ipcMain.handle('auth:getSession', async () => {
  return getSession();
});

ipcMain.handle('auth:signInWithEmail', async (_, email: string, password: string) => {
  const result = await signInWithEmail(email, password);
  if (result?.user) {
    logs.logActivity('logged in', 'user', result.user.id, result.user.username).catch(console.error);
  }
  return result;
});

ipcMain.handle('auth:signUp', async (_, email: string, password: string) => {
  return signUp(email, password);
});

ipcMain.handle('auth:signOut', async () => {
  return signOut();
});

ipcMain.handle('auth:resetPassword', async (_, email: string) => {
  return resetPassword(email);
});

ipcMain.handle('auth:signInWithGoogle', async () => {
  return signInWithGoogle();
});

// Profile IPC Handlers (Supabase)
ipcMain.handle('profiles:list', async () => {
  try {
    return await db.listProfiles();
  } catch (error) {
    console.error('Failed to list profiles:', error);
    return [];
  }
});

ipcMain.handle('profiles:getById', async (_, profileId: string) => {
  try {
    return await db.getProfileById(profileId);
  } catch (error) {
    console.error('Failed to get profile:', error);
    return null;
  }
});

ipcMain.handle('profiles:create', async (_, profile: Omit<Profile, 'id' | 'createdAt'>) => {
  const result = await db.createProfile(profile);

  // Log activity
  if (result) {
    logs.logActivity('created browser', 'profile', result.id, result.name).catch(console.error);
  }

  // Sync to Google Sheets
  if (result) {
    // Get model name if modelId is set
    let modelName = '';
    if ((result as any).modelId) {
      const models = await db.listModels();
      modelName = models.find(m => m.id === (result as any).modelId)?.name || '';
    }

    // Build proxy string from proxy object
    const proxy = (result as any).proxy;
    let proxyString = '';
    if (proxy?.host && proxy?.port) {
      proxyString = proxy.username && proxy.password
        ? `${proxy.host}:${proxy.port}:${proxy.username}:${proxy.password}`
        : `${proxy.host}:${proxy.port}`;
    }

    googleSheets.addProfileToSheet({
      id: result.id,
      name: result.name,
      email: (result as any).credentials?.email || '',
      password: (result as any).credentials?.password || '',
      country: (result as any).country,
      modelName,
      status: (result as any).status,
      purchaseDate: (result as any).purchaseDate,
      expiresAt: (result as any).expiresAt,
      orderNumber: (result as any).orderNumber,
      proxyString,
      commentKarma: (result as any).commentKarma,
      postKarma: (result as any).postKarma,
      createdAt: result.createdAt,
    }).catch(err => console.error('Failed to sync profile to sheet:', err));
  }

  return result;
});

ipcMain.handle('profiles:update', async (_, profileId: string, updates: any) => {
  const result = await db.updateProfile(profileId, updates);

  // Sync to Google Sheets
  if (result) {
    // Transform updates for sheet format
    const sheetUpdates: Record<string, any> = { ...updates };

    // Extract email/password from credentials if updated
    if (updates.credentials) {
      sheetUpdates.email = updates.credentials.email || '';
      sheetUpdates.password = updates.credentials.password || '';
      delete sheetUpdates.credentials;
    }

    // Build proxy string if proxy is updated
    if (updates.proxy) {
      const proxy = updates.proxy;
      if (proxy.host && proxy.port) {
        sheetUpdates.proxyString = proxy.username && proxy.password
          ? `${proxy.host}:${proxy.port}:${proxy.username}:${proxy.password}`
          : `${proxy.host}:${proxy.port}`;
      } else {
        sheetUpdates.proxyString = '';
      }
      delete sheetUpdates.proxy;
    }

    // Get model name if modelId is updated
    if (updates.modelId !== undefined) {
      const models = await db.listModels();
      sheetUpdates.modelName = models.find(m => m.id === updates.modelId)?.name || '';
      delete sheetUpdates.modelId;
    }

    googleSheets.updateProfileInSheet(profileId, sheetUpdates)
      .catch(err => console.error('Failed to sync profile update to sheet:', err));
  }

  return result;
});

ipcMain.handle('profiles:delete', async (_, profileId: string) => {
  // Soft delete (archive) - don't remove local files or from sheet
  console.log('profiles:delete - archiving profile:', profileId);
  try {
    // Get profile name before archiving
    const profile = await db.getProfileById(profileId);
    const profileName = profile?.name || '';

    const result = await db.deleteProfile(profileId);
    console.log('profiles:delete - archive result:', result);
    logs.logActivity('archived browser', 'profile', profileId, profileName).catch(console.error);
    return result;
  } catch (err) {
    console.error('profiles:delete - error:', err);
    throw err;
  }
});

ipcMain.handle('profiles:listDeleted', async () => {
  console.log('profiles:listDeleted - fetching deleted profiles');
  try {
    const deleted = await db.listDeletedProfiles();
    console.log('profiles:listDeleted - found:', deleted.length, 'profiles');
    return deleted;
  } catch (err) {
    console.error('profiles:listDeleted - error:', err);
    throw err;
  }
});

ipcMain.handle('profiles:restore', async (_, profileId: string) => {
  // Get profile name before restoring
  const allProfiles = await db.listDeletedProfiles();
  const profile = allProfiles.find((p: any) => p.id === profileId);
  const profileName = profile?.name || '';

  const result = await db.restoreProfile(profileId);
  if (result) {
    logs.logActivity('restored browser', 'profile', profileId, profileName).catch(console.error);
  }
  return result;
});

ipcMain.handle('profiles:permanentDelete', async (_, profileId: string) => {
  // Get profile name before deleting
  const allProfiles = await db.listDeletedProfiles();
  const profile = allProfiles.find((p: any) => p.id === profileId);
  const profileName = profile?.name || '';

  // Clean up local browser data on permanent delete
  const profileDataPath = path.join(getDataPath(), 'profiles', profileId);
  if (fs.existsSync(profileDataPath)) {
    fs.rmSync(profileDataPath, { recursive: true });
  }

  const result = await db.permanentDeleteProfile(profileId);

  // Log activity and remove from Google Sheets only on permanent delete
  if (result) {
    logs.logActivity('permanently deleted browser', 'profile', profileId, profileName).catch(console.error);
    googleSheets.deleteProfileFromSheet(profileId)
      .catch(err => console.error('Failed to sync profile deletion to sheet:', err));
  }

  return result;
});

ipcMain.handle('profiles:archive', async (_, profileId: string) => {
  console.log('profiles:archive - archiving profile:', profileId);
  try {
    const profile = await db.getProfileById(profileId);
    const profileName = profile?.name || '';
    const result = await db.archiveProfile(profileId);
    console.log('profiles:archive - result:', result);
    logs.logActivity('archived browser (hidden)', 'profile', profileId, profileName).catch(console.error);
    return result;
  } catch (err) {
    console.error('profiles:archive - error:', err);
    throw err;
  }
});

ipcMain.handle('profiles:listArchived', async () => {
  console.log('profiles:listArchived - fetching archived profiles');
  try {
    const archived = await db.listArchivedProfiles();
    console.log('profiles:listArchived - found:', archived.length, 'profiles');
    return archived;
  } catch (err) {
    console.error('profiles:listArchived - error:', err);
    throw err;
  }
});

ipcMain.handle('profiles:unarchive', async (_, profileId: string) => {
  const allProfiles = await db.listArchivedProfiles();
  const profile = allProfiles.find((p: any) => p.id === profileId);
  const profileName = profile?.name || '';

  const result = await db.unarchiveProfile(profileId);
  if (result) {
    logs.logActivity('unarchived browser', 'profile', profileId, profileName).catch(console.error);
  }
  return result;
});

// Embedded browser state
interface EmbeddedTab {
  id: string;
  view: BrowserView;
  title: string;
  url: string;
}

interface EmbeddedBrowserState {
  profileId: string;
  profile: Profile;
  tabs: EmbeddedTab[];
  activeTabId: string | null;
  tabCounter: number;
  session: Electron.Session;
  proxyCheckDone: boolean;
}

// Map of profileId -> browser state (supports multiple browsers)
const embeddedBrowsers: Map<string, EmbeddedBrowserState> = new Map();
let currentEmbeddedProfileId: string | null = null;

// Helper to get current browser state
const getCurrentBrowserState = (): EmbeddedBrowserState | null => {
  if (!currentEmbeddedProfileId) return null;
  return embeddedBrowsers.get(currentEmbeddedProfileId) || null;
};

// Update embedded browser view bounds for current browser
const updateEmbeddedBrowserBounds = () => {
  const state = getCurrentBrowserState();
  if (!mainWindow || !state || !state.activeTabId) return;
  const activeTab = state.tabs.find(t => t.id === state.activeTabId);
  if (!activeTab) return;

  const contentBounds = mainWindow.getContentBounds();

  // Browser panel layout:
  // - Sidebar: 208px (w-52) + 24px margin (ml-6) = 232px
  // - Content takes ~50% when browser is open
  // - Browser panel: remaining ~50%, extends to all edges
  const sidebarWidth = 232;
  const navHeight = 116; // status bar (32px) + tab bar (36px) + nav bar (48px)

  // Calculate browser panel position (right half of remaining space, extends to edges)
  const availableWidth = contentBounds.width - sidebarWidth;
  const browserPanelWidth = Math.floor(availableWidth / 2);
  const browserPanelX = contentBounds.width - browserPanelWidth;

  activeTab.view.setBounds({
    x: browserPanelX,
    y: navHeight,
    width: browserPanelWidth,
    height: contentBounds.height - navHeight,
  });
};

// Update embedded tabs UI for current browser
const updateEmbeddedTabsUI = () => {
  const state = getCurrentBrowserState();
  if (!mainWindow || !state) return;
  const tabsData = state.tabs.map(t => ({
    id: t.id,
    title: t.title,
    active: t.id === state.activeTabId,
  }));
  mainWindow.webContents.send('browser:tabsUpdated', tabsData);
};

// Create embedded tab for a specific browser
const createEmbeddedTab = (profileId: string, url: string = 'about:blank'): EmbeddedTab | null => {
  const state = embeddedBrowsers.get(profileId);
  if (!mainWindow || !state) return null;

  const id = `tab-${++state.tabCounter}`;
  const view = new BrowserView({
    webPreferences: {
      session: state.session,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const tab: EmbeddedTab = { id, view, title: 'New Tab', url };
  state.tabs.push(tab);

  view.webContents.on('page-title-updated', (_, title) => {
    tab.title = title || 'New Tab';
    if (currentEmbeddedProfileId === profileId) {
      updateEmbeddedTabsUI();
    }
  });

  view.webContents.on('did-navigate', (_, newUrl) => {
    tab.url = newUrl;
    if (tab.id === state.activeTabId && mainWindow && currentEmbeddedProfileId === profileId) {
      mainWindow.webContents.send('browser:urlChanged', newUrl);
    }
  });

  view.webContents.on('did-navigate-in-page', (_, newUrl) => {
    tab.url = newUrl;
    if (tab.id === state.activeTabId && mainWindow && currentEmbeddedProfileId === profileId) {
      mainWindow.webContents.send('browser:urlChanged', newUrl);
    }
  });

  view.webContents.on('did-finish-load', () => {
    if (tab.id === state.activeTabId && !state.proxyCheckDone && !tab.url.startsWith('data:') && !tab.url.startsWith('about:')) {
      state.proxyCheckDone = true;
      checkEmbeddedProxyStatus(profileId);
    }
  });

  view.webContents.loadURL(url);
  return tab;
};

// Switch embedded tab for a specific browser
const switchEmbeddedTab = (profileId: string, tabId: string) => {
  const state = embeddedBrowsers.get(profileId);
  if (!mainWindow || !state) return;
  const tab = state.tabs.find(t => t.id === tabId);
  if (!tab) return;

  state.activeTabId = tabId;
  // Only attach BrowserView if this is the current browser and not on about:blank (start page)
  if (currentEmbeddedProfileId === profileId && tab.url !== 'about:blank') {
    mainWindow.setBrowserView(tab.view);
    updateEmbeddedBrowserBounds();
  }
  if (currentEmbeddedProfileId === profileId) {
    mainWindow.webContents.send('browser:urlChanged', tab.url);
    updateEmbeddedTabsUI();
  }
};

// Close embedded tab for a specific browser
const closeEmbeddedTab = (profileId: string, tabId: string) => {
  const state = embeddedBrowsers.get(profileId);
  if (!state) return;

  const index = state.tabs.findIndex(t => t.id === tabId);
  if (index === -1) return;

  const tab = state.tabs[index];
  state.tabs.splice(index, 1);
  (tab.view.webContents as any).destroy();

  if (state.tabs.length === 0) {
    const newTab = createEmbeddedTab(profileId, 'about:blank');
    if (newTab) switchEmbeddedTab(profileId, newTab.id);
  } else if (state.activeTabId === tabId) {
    const newIndex = Math.max(0, index - 1);
    switchEmbeddedTab(profileId, state.tabs[newIndex].id);
  } else if (currentEmbeddedProfileId === profileId) {
    updateEmbeddedTabsUI();
  }
};

// Check proxy status for a specific embedded browser
const checkEmbeddedProxyStatus = async (profileId: string) => {
  const state = embeddedBrowsers.get(profileId);
  if (!mainWindow || !state) return;

  if (state.profile.proxy) {
    if (currentEmbeddedProfileId === profileId) {
      mainWindow.webContents.send('browser:proxyStatus', 'checking', '');
    }

    const checkOnce = (): Promise<string | null> => {
      return new Promise((resolve) => {
        const proxyReq = http.request({
          host: state.profile.proxy!.host,
          port: state.profile.proxy!.port,
          method: 'CONNECT',
          path: 'api.ipify.org:443',
          headers: state.profile.proxy!.username && state.profile.proxy!.password ? {
            'Proxy-Authorization': 'Basic ' + Buffer.from(`${state.profile.proxy!.username}:${state.profile.proxy!.password}`).toString('base64')
          } : {},
        });

        proxyReq.on('connect', (res, socket) => {
          if (res.statusCode !== 200) {
            socket.destroy();
            resolve(null);
            return;
          }

          const tlsSocket = require('tls').connect({
            socket: socket,
            servername: 'api.ipify.org',
          }, () => {
            tlsSocket.write('GET /?format=json HTTP/1.1\r\nHost: api.ipify.org\r\nConnection: close\r\n\r\n');
          });

          let data = '';
          tlsSocket.on('data', (chunk: Buffer) => { data += chunk.toString(); });
          tlsSocket.on('end', () => {
            try {
              const bodyStart = data.indexOf('\r\n\r\n');
              if (bodyStart !== -1) {
                const body = data.slice(bodyStart + 4);
                const json = JSON.parse(body);
                resolve(json.ip || null);
              } else {
                resolve(null);
              }
            } catch {
              resolve(null);
            }
          });
          tlsSocket.on('error', () => resolve(null));
        });

        proxyReq.on('error', () => resolve(null));
        proxyReq.setTimeout(5000, () => {
          proxyReq.destroy();
          resolve(null);
        });

        proxyReq.end();
      });
    };

    let attempts = 0;
    while (attempts < 10) {
      const ip = await checkOnce();
      if (ip) {
        if (currentEmbeddedProfileId === profileId && mainWindow) {
          mainWindow.webContents.send('browser:proxyStatus', 'connected', ip);
        }
        return;
      }
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (currentEmbeddedProfileId === profileId && mainWindow) {
      mainWindow.webContents.send('browser:proxyStatus', 'error', '');
    }
  }
};

// Clean up a specific embedded browser
const cleanupEmbeddedBrowser = (profileId: string) => {
  const state = embeddedBrowsers.get(profileId);
  if (!state) return;

  state.tabs.forEach(tab => {
    try { (tab.view.webContents as any).destroy(); } catch (e) {}
  });

  embeddedBrowsers.delete(profileId);

  // If this was the current browser, clear the view
  if (currentEmbeddedProfileId === profileId && mainWindow) {
    mainWindow.setBrowserView(null as any);
    currentEmbeddedProfileId = null;
  }
};

// Switch to showing a specific browser (hide others)
const showBrowser = (profileId: string) => {
  const state = embeddedBrowsers.get(profileId);
  if (!mainWindow || !state) return;

  currentEmbeddedProfileId = profileId;

  // Attach the active tab's view
  const activeTab = state.tabs.find(t => t.id === state.activeTabId);
  if (activeTab && activeTab.url !== 'about:blank') {
    mainWindow.setBrowserView(activeTab.view);
    updateEmbeddedBrowserBounds();
  } else {
    mainWindow.setBrowserView(null as any);
  }

  // Update UI
  mainWindow.webContents.send('browser:urlChanged', activeTab?.url || 'about:blank');
  updateEmbeddedTabsUI();

  // Send proxy status if already checked
  if (state.proxyCheckDone && state.profile.proxy) {
    // Re-check to get current IP
    checkEmbeddedProxyStatus(profileId);
  }
};

ipcMain.handle('browser:launch', async (_, profileId: string) => {
  const profile = await db.getProfileById(profileId) as Profile | null;
  if (!profile) throw new Error('Profile not found');

  // Check if this profile already has a browser open
  if (embeddedBrowsers.has(profileId)) {
    // Just switch to it
    showBrowser(profileId);
    return { success: true };
  }

  // Get user agent
  let userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  if (profile.type === 'mobile' && profile.device && mobileDevices[profile.device]) {
    userAgent = mobileDevices[profile.device].userAgent;
  }

  // Create session
  const partitionName = `persist:profile-${profileId}`;
  const profileSession = session.fromPartition(partitionName);

  // Proxy configuration
  if (profile.proxy) {
    await profileSession.setProxy({
      proxyRules: `http://${profile.proxy.host}:${profile.proxy.port}`,
    });

    if (profile.proxy.username && profile.proxy.password) {
      proxyCredentials.set(profileId, {
        username: profile.proxy.username,
        password: profile.proxy.password,
      });
    }
  }

  profileSession.setUserAgent(userAgent);

  // Create browser state
  const browserState: EmbeddedBrowserState = {
    profileId,
    profile,
    tabs: [],
    activeTabId: null,
    tabCounter: 0,
    session: profileSession,
    proxyCheckDone: false,
  };
  embeddedBrowsers.set(profileId, browserState);

  // Set as current browser
  currentEmbeddedProfileId = profileId;

  // Create initial tab
  const initialTab = createEmbeddedTab(profileId, 'about:blank');
  if (initialTab) {
    switchEmbeddedTab(profileId, initialTab.id);
  }

  // Listen for window resize to update BrowserView bounds
  mainWindow?.on('resize', updateEmbeddedBrowserBounds);

  // Start proxy check in background
  if (profile.proxy) {
    checkEmbeddedProxyStatus(profileId);
  }

  // Track session
  activeSessions.set(profileId, { profileId, window: mainWindow! });

  return { success: true };
});

// IPC handlers for embedded browser controls
ipcMain.on('browser:navigate', (_, url: string) => {
  const state = getCurrentBrowserState();
  if (!state || !mainWindow) return;
  const activeTab = state.tabs.find(t => t.id === state.activeTabId);
  if (activeTab) {
    // Attach BrowserView if not already attached
    mainWindow.setBrowserView(activeTab.view);
    updateEmbeddedBrowserBounds();
    activeTab.view.webContents.loadURL(url);
  }
});

ipcMain.on('browser:back', () => {
  const state = getCurrentBrowserState();
  if (!state) return;
  const activeTab = state.tabs.find(t => t.id === state.activeTabId);
  if (activeTab && activeTab.view.webContents.canGoBack()) {
    activeTab.view.webContents.goBack();
  }
});

ipcMain.on('browser:forward', () => {
  const state = getCurrentBrowserState();
  if (!state) return;
  const activeTab = state.tabs.find(t => t.id === state.activeTabId);
  if (activeTab && activeTab.view.webContents.canGoForward()) {
    activeTab.view.webContents.goForward();
  }
});

ipcMain.on('browser:refresh', () => {
  const state = getCurrentBrowserState();
  if (!state) return;
  const activeTab = state.tabs.find(t => t.id === state.activeTabId);
  if (activeTab) activeTab.view.webContents.reload();
});

ipcMain.on('browser:newTab', () => {
  if (!currentEmbeddedProfileId) return;
  const newTab = createEmbeddedTab(currentEmbeddedProfileId, 'about:blank');
  if (newTab) switchEmbeddedTab(currentEmbeddedProfileId, newTab.id);
});

ipcMain.on('browser:switchTab', (_, tabId: string) => {
  if (!currentEmbeddedProfileId) return;
  switchEmbeddedTab(currentEmbeddedProfileId, tabId);
});

ipcMain.on('browser:closeTab', (_, tabId: string) => {
  if (!currentEmbeddedProfileId) return;
  closeEmbeddedTab(currentEmbeddedProfileId, tabId);
});

ipcMain.handle('browser:close', async (_, profileId: string) => {
  cleanupEmbeddedBrowser(profileId);
  activeSessions.delete(profileId);
  proxyCredentials.delete(profileId);
  mainWindow?.webContents.send('browser:closed', profileId);
  return { success: true };
});

ipcMain.handle('browser:active', () => {
  // Clean up any destroyed windows
  for (const [id, session] of activeSessions.entries()) {
    if (!session.window || session.window.isDestroyed()) {
      activeSessions.delete(id);
    }
  }
  return Array.from(activeSessions.keys());
});

ipcMain.handle('devices:list', () => {
  return Object.keys(mobileDevices);
});

// Model IPC Handlers (Supabase)
ipcMain.handle('models:list', async () => {
  try {
    return await db.listModels();
  } catch (error) {
    console.error('Failed to list models:', error);
    return [];
  }
});

ipcMain.handle('models:create', async (_, model: Omit<Model, 'id' | 'createdAt'>) => {
  const result = await db.createModel(model);
  if (result) {
    logs.logActivity('created model', 'model', result.id, result.name).catch(console.error);
  }
  return result;
});

ipcMain.handle('models:update', async (_, modelId: string, updates: Partial<Model>) => {
  console.log('IPC models:update received:', { modelId, updates });
  const result = await db.updateModel(modelId, updates);
  console.log('IPC models:update result:', result);
  if (result) {
    logs.logActivity('updated model', 'model', modelId, result.name).catch(console.error);
  }
  return result;
});

ipcMain.handle('models:delete', async (_, modelId: string) => {
  const result = await db.deleteModel(modelId);
  if (result) {
    logs.logActivity('deleted model', 'model', modelId).catch(console.error);
  }
  return result;
});

// Admin IPC Handlers
ipcMain.handle('admin:listUsers', async () => {
  try {
    return await admin.listUsers();
  } catch (error) {
    console.error('Failed to list users:', error);
    return [];
  }
});

ipcMain.handle('admin:createUser', async (_, username: string, password: string, role: 'dev' | 'admin' | 'basic') => {
  const result = await admin.createAppUser(username, password, role);
  if (result) {
    logs.logActivity('created user', 'user', result.id, username).catch(console.error);
  }
  return result;
});

ipcMain.handle('admin:updateUser', async (_, userId: string, updates: { username?: string; password?: string; role?: 'dev' | 'admin' | 'basic' }) => {
  const result = await admin.updateAppUser(userId, updates);
  if (result) {
    logs.logActivity('updated user', 'user', userId, result.username).catch(console.error);
  }
  return result;
});

ipcMain.handle('admin:deleteUser', async (_, userId: string) => {
  const result = await admin.deleteAppUser(userId);
  if (result) {
    logs.logActivity('deleted user', 'user', userId).catch(console.error);
  }
  return result;
});

ipcMain.handle('admin:getUserModelAssignments', async (_, userId: string) => {
  return admin.getUserModelAssignments(userId);
});

ipcMain.handle('admin:setUserModelAssignments', async (_, userId: string, modelIds: string[]) => {
  return admin.setUserModelAssignments(userId, modelIds);
});

ipcMain.handle('admin:getAllProfilesForStats', async () => {
  try {
    return await admin.getAllProfilesForStats();
  } catch (error) {
    console.error('Failed to get profiles for stats:', error);
    return [];
  }
});

ipcMain.handle('admin:getAllModels', async () => {
  try {
    return await admin.getAllModels();
  } catch (error) {
    console.error('Failed to get all models:', error);
    return [];
  }
});

ipcMain.handle('admin:getAllProfiles', async () => {
  try {
    return await admin.getAllProfiles();
  } catch (error) {
    console.error('Failed to get all profiles:', error);
    return [];
  }
});

// Email management
ipcMain.handle('emails:listMain', async () => {
  return emails.listMainEmails();
});

ipcMain.handle('emails:createMain', async (_, email: string, password: string) => {
  return emails.createMainEmail(email, password);
});

ipcMain.handle('emails:updateMain', async (_, id: string, updates: { email?: string; password?: string }) => {
  return emails.updateMainEmail(id, updates);
});

ipcMain.handle('emails:deleteMain', async (_, id: string) => {
  return emails.deleteMainEmail(id);
});

ipcMain.handle('emails:listSub', async (_, mainEmailId?: string) => {
  return emails.listSubEmails(mainEmailId);
});

ipcMain.handle('emails:createSub', async (_, mainEmailId: string, email: string) => {
  return emails.createSubEmail(mainEmailId, email);
});

ipcMain.handle('emails:updateSub', async (_, id: string, email: string) => {
  return emails.updateSubEmail(id, email);
});

ipcMain.handle('emails:deleteSub', async (_, id: string) => {
  return emails.deleteSubEmail(id);
});

ipcMain.handle('emails:getForSelection', async () => {
  return emails.getEmailsForSelection();
});

// Activity Logs
ipcMain.handle('logs:getAll', async (_, limit?: number) => {
  console.log('logs:getAll called with limit:', limit);
  try {
    const result = await logs.getActivityLogs(limit || 100);
    console.log('logs:getAll result:', result?.length, 'logs');
    return result;
  } catch (err) {
    console.error('logs:getAll error:', err);
    throw err;
  }
});

ipcMain.handle('logs:add', async (_, action: string, entityType?: string, entityId?: string, entityName?: string, details?: any) => {
  console.log('logs:add called:', { action, entityType, entityId, entityName });
  return logs.logActivity(action, entityType, entityId, entityName, details);
});

// Helper to fetch JSON from Reddit
const fetchRedditJson = (url: string): Promise<any> => {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 10000,
    }, (res) => {
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
};

// Fetch Reddit karma and last activity for a username
ipcMain.handle('reddit:fetchKarma', async (_, username: string) => {
  // Clean username (remove u/ prefix if present)
  const cleanUsername = username.replace(/^u\//, '').trim();
  if (!cleanUsername) {
    return null;
  }

  // Fetch user info, posts (for count + last date), and comments (for count + last date) in parallel
  console.log('Fetching Reddit data for:', cleanUsername);
  const [userInfo, postsData, commentsData] = await Promise.all([
    fetchRedditJson(`https://www.reddit.com/user/${cleanUsername}/about.json`),
    fetchRedditJson(`https://www.reddit.com/user/${cleanUsername}/submitted.json?limit=100&sort=new`),
    fetchRedditJson(`https://www.reddit.com/user/${cleanUsername}/comments.json?limit=100&sort=new`),
  ]);
  console.log('Posts count:', postsData?.data?.children?.length || 0);
  console.log('Comments count:', commentsData?.data?.children?.length || 0);

  // Check if account exists and is not suspended
  if (!userInfo?.data || userInfo.data.is_suspended) {
    return null;
  }

  // Extract last post date
  let lastPostDate: string | null = null;
  if (postsData?.data?.children?.length > 0) {
    const lastPost = postsData.data.children[0].data;
    lastPostDate = new Date(lastPost.created_utc * 1000).toISOString();
  }

  // Extract last comment date
  let lastCommentDate: string | null = null;
  if (commentsData?.data?.children?.length > 0) {
    const lastComment = commentsData.data.children[0].data;
    lastCommentDate = new Date(lastComment.created_utc * 1000).toISOString();
  }

  return {
    commentKarma: userInfo.data.comment_karma || 0,
    postKarma: userInfo.data.link_karma || 0,
    lastPostDate,
    lastCommentDate,
    totalPosts: postsData?.data?.children?.length || 0,
    totalComments: commentsData?.data?.children?.length || 0,
  };
});

// Window creation
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }
}

// Global login handler for proxy authentication (fallback)
app.on('login', (event, webContents, request, authInfo, callback) => {
  if (authInfo.isProxy) {
    // Find which profile this webContents belongs to
    for (const [profileId, session] of activeSessions.entries()) {
      // Check if it's the main window or a webview in it
      if (session.window && !session.window.isDestroyed()) {
        const creds = proxyCredentials.get(profileId);
        if (creds) {
          event.preventDefault();
          callback(creds.username, creds.password);
          return;
        }
      }
    }
  }
});

app.whenReady().then(() => {
  createWindow();
  // Initialize auto-updater after window is created
  if (mainWindow) {
    initUpdater(mainWindow);
  }
});

app.on('window-all-closed', async () => {
  // Close all browser sessions
  for (const session of activeSessions.values()) {
    if (session.window && !session.window.isDestroyed()) {
      session.window.close();
    }
  }
  activeSessions.clear();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Google Sheets sync all
ipcMain.handle('sheets:syncAll', async () => {
  try {
    const profiles = await admin.getAllProfilesForSync();
    const models = await db.listModels();
    const users = await admin.listUsers();

    // Create userId -> username map
    const userMap = new Map<string, string>();
    console.log('Users found:', users.length);
    for (const user of users) {
      console.log('User:', user.id, '->', user.username);
      userMap.set(user.id, user.username);
    }

    // Helper to build proxy string from proxy object
    const buildProxyString = (proxy: any): string => {
      if (!proxy) return '';
      const { host, port, username, password } = proxy;
      if (!host || !port) return '';
      if (username && password) {
        return `${host}:${port}:${username}:${password}`;
      }
      return `${host}:${port}`;
    };

    // Helper to format date (date only, no time)
    const formatDate = (dateStr: string | undefined): string => {
      if (!dateStr) return '';
      return dateStr.split('T')[0]; // Extract YYYY-MM-DD
    };

    // Helper to format date with time (DD/MM HH:mm)
    const formatDateTime = (dateStr: string | undefined): string => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${dd}/${mm} ${hh}:${min}`;
    };

    // Map profiles with model names and extracted fields
    const profilesWithModels = profiles.map((p: any) => {
      const mapped = {
        id: p.id,
        name: p.name,
        email: p.credentials?.email || '',
        password: p.credentials?.password || '',
        country: p.country,
        modelName: models.find(m => m.id === p.modelId)?.name || '',
        status: p.status,
        purchaseDate: p.purchaseDate,
        expiresAt: formatDate(p.expiresAt),
        orderNumber: p.orderNumber,
        proxyString: buildProxyString(p.proxy),
        commentKarma: p.commentKarma,
        postKarma: p.postKarma,
        createdAt: formatDate(p.createdAt),
        lastPostDate: formatDateTime(p.lastPostDate),
        lastCommentDate: formatDateTime(p.lastCommentDate),
        assignedTo: userMap.get(p.userId) || '',
      };
      console.log('Profile mapped:', p.name, '| assignedTo:', mapped.assignedTo, '| createdAt:', mapped.createdAt);
      return mapped;
    });

    // Sync profiles first
    const profileResult = await googleSheets.syncAllProfilesToSheet(profilesWithModels);

    // Now sync emails to a separate sheet
    const mainEmails = await emails.listMainEmails();
    const subEmails = await emails.listSubEmails();

    // Build email entries with assignments
    const emailEntries: Array<{
      mainEmail: string;
      mainEmailPassword: string;
      subEmail: string;
      subEmailId: string;
      assignedUser?: string;
      assignedBrowser?: string;
      assignedBrowserId?: string;
    }> = [];

    for (const mainEmail of mainEmails) {
      const mainSubEmails = subEmails.filter(s => s.mainEmailId === mainEmail.id);

      for (const subEmail of mainSubEmails) {
        // Find profile assigned to this sub-email
        const assignedProfile = profiles.find((p: any) => p.subEmailId === subEmail.id);

        emailEntries.push({
          mainEmail: mainEmail.email,
          mainEmailPassword: mainEmail.password,
          subEmail: subEmail.email,
          subEmailId: subEmail.id,
          assignedUser: assignedProfile ? userMap.get(assignedProfile.userId) || '' : '',
          assignedBrowser: assignedProfile?.name || '',
          assignedBrowserId: assignedProfile?.id || '',
        });
      }
    }

    if (emailEntries.length > 0) {
      await googleSheets.syncEmailsToSheet(emailEntries);
    }

    // Sync models to a separate sheet
    console.log('Models found for sync:', models.length);
    if (models.length > 0) {
      const modelsData = models.map((m: any) => ({
        id: m.id,
        name: m.name,
        instagram: m.instagram || '',
        onlyfans: m.onlyfans || '',
        contentFolder: m.contentFolder || '',
      }));
      console.log('Models data to sync:', modelsData);
      await googleSheets.syncModelsToSheet(modelsData);
    }

    return profileResult;
  } catch (error) {
    console.error('Failed to sync all profiles:', error);
    return { success: false, error: (error as Error).message };
  }
});

// Shell
ipcMain.handle('shell:openExternal', async (_, url: string) => {
  await shell.openExternal(url);
});

// Flipper IPC Handlers
ipcMain.handle('flipper:selectFiles', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Media Files', extensions: ['mp4', 'mov', 'mkv', 'avi', 'webm', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }
    ]
  });

  if (result.canceled) return [];
  return result.filePaths.filter(f => isValidFlipperFile(f));
});

ipcMain.handle('flipper:selectOutputFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('flipper:getDroppedFiles', (_, filePaths: string[]) => {
  return filePaths.filter(f => isValidFlipperFile(f));
});

ipcMain.handle('flipper:processFiles', async (_, files: string[], outputFolder: string) => {
  const onProgress = (progress: { file: string; status: string; percent: number; error?: string }) => {
    mainWindow?.webContents.send('flipper:progress', progress);
  };

  return await processFiles(files, outputFolder, onProgress);
});

// Ollama AI IPC Handlers
const OLLAMA_BASE_URL = 'http://localhost:11434';

ipcMain.handle('ollama:isRunning', async () => {
  return new Promise<boolean>((resolve) => {
    const req = http.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 3000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
});

ipcMain.handle('ollama:listModels', async () => {
  return new Promise<Array<{ name: string; size: number; modified_at: string }>>((resolve) => {
    const req = http.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.models || []);
        } catch {
          resolve([]);
        }
      });
    });
    req.on('error', () => resolve([]));
    req.on('timeout', () => {
      req.destroy();
      resolve([]);
    });
  });
});

ipcMain.handle('ollama:generate', async (_, model: string, prompt: string, system: string) => {
  return new Promise<string>((resolve, reject) => {
    const postData = JSON.stringify({
      model,
      prompt,
      system,
      stream: false,
      options: {
        num_predict: 80, // Force short replies (~1-2 sentences)
        temperature: 0.8,
      },
    });

    const req = http.request(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 120000, // 2 minutes timeout
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          let response = json.response || '';
          // Post-process: remove quotes, periods, make more casual
          response = response.trim();
          if (response.startsWith('"') && response.endsWith('"')) {
            response = response.slice(1, -1);
          }
          response = response.replace(/\. /g, ', ').replace(/\.$/g, '');
          resolve(response);
        } catch {
          reject(new Error('Failed to parse response'));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.write(postData);
    req.end();
  });
});

ipcMain.handle('ollama:pullModel', async (event, name: string) => {
  return new Promise<void>((resolve, reject) => {
    const postData = JSON.stringify({ name });

    const req = http.request(`${OLLAMA_BASE_URL}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 600000, // 10 minutes for large models
    }, (res) => {
      res.on('data', chunk => {
        try {
          const lines = chunk.toString().split('\n').filter((l: string) => l.trim());
          for (const line of lines) {
            const json = JSON.parse(line);
            if (json.status) {
              let progress = json.status;
              if (json.completed && json.total) {
                const percent = Math.round((json.completed / json.total) * 100);
                progress = `${json.status} ${percent}%`;
              }
              mainWindow?.webContents.send('ollama:pullProgress', progress);
            }
          }
        } catch {}
      });
      res.on('end', () => resolve());
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Download timed out'));
    });

    req.write(postData);
    req.end();
  });
});

ipcMain.handle('ollama:deleteModel', async (_, name: string) => {
  return new Promise<void>((resolve, reject) => {
    const postData = JSON.stringify({ name });

    const req = http.request(`${OLLAMA_BASE_URL}/api/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 10000,
    }, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve());
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.write(postData);
    req.end();
  });
});

ipcMain.handle('ollama:install', async () => {
  const { exec, spawn } = require('child_process');

  const sendProgress = (msg: string) => {
    mainWindow?.webContents.send('ollama:installProgress', msg);
  };

  const execPromise = (cmd: string, timeout = 300000): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      exec(cmd, { timeout }, (err: any) => {
        if (err) {
          resolve({ success: false, error: err.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  };

  const waitForOllama = async (maxAttempts = 30): Promise<boolean> => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const running = await new Promise<boolean>((resolve) => {
          const req = http.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 2000 }, (res) => {
            resolve(res.statusCode === 200);
          });
          req.on('error', () => resolve(false));
          req.on('timeout', () => { req.destroy(); resolve(false); });
        });
        if (running) return true;
      } catch {}
      await new Promise(r => setTimeout(r, 1000));
    }
    return false;
  };

  const pullDefaultModel = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      const postData = JSON.stringify({ name: 'llama3.2:3b' });
      const req = http.request(`${OLLAMA_BASE_URL}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
        timeout: 600000,
      }, (res) => {
        res.on('data', chunk => {
          try {
            const lines = chunk.toString().split('\n').filter((l: string) => l.trim());
            for (const line of lines) {
              const json = JSON.parse(line);
              if (json.status) {
                let progress = json.status;
                if (json.completed && json.total) {
                  const percent = Math.round((json.completed / json.total) * 100);
                  progress = `Downloading model... ${percent}%`;
                } else if (json.status === 'success') {
                  progress = 'Model ready!';
                } else {
                  progress = `${json.status}...`;
                }
                sendProgress(progress);
              }
            }
          } catch {}
        });
        res.on('end', () => resolve(true));
        res.on('error', () => resolve(false));
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.write(postData);
      req.end();
    });
  };

  // Step 1: Check if Ollama is already running
  sendProgress('Checking Ollama...');
  const alreadyRunning = await waitForOllama(2);

  if (!alreadyRunning) {
    // Step 2: Try to install/start Ollama
    sendProgress('Installing Ollama...');

    const hasBrew = await execPromise('which brew', 5000);

    if (hasBrew.success) {
      // Check if already installed
      const hasOllama = await execPromise('which ollama', 5000);

      if (!hasOllama.success) {
        sendProgress('Installing via Homebrew...');
        const install = await execPromise('brew install ollama', 300000);
        if (!install.success) {
          return { success: false, error: 'Homebrew install failed' };
        }
      }

      sendProgress('Starting Ollama...');
      await execPromise('brew services start ollama', 10000);
    } else {
      // Try curl installer
      sendProgress('Downloading Ollama...');
      const install = await execPromise('curl -fsSL https://ollama.com/install.sh | sh', 300000);
      if (!install.success) {
        return { success: false, error: 'Download from ollama.com' };
      }

      sendProgress('Starting Ollama...');
      exec('ollama serve &');
    }

    // Wait for Ollama to be ready
    sendProgress('Starting Ollama...');
    const ready = await waitForOllama(30);
    if (!ready) {
      return { success: false, error: 'Ollama not responding' };
    }
  }

  // Step 3: Pull default model
  sendProgress('Downloading AI model...');
  const modelPulled = await pullDefaultModel();

  if (!modelPulled) {
    return { success: false, error: 'Failed to download model' };
  }

  sendProgress('Ready!');
  return { success: true };
});
