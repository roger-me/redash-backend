export interface Proxy {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export interface Credentials {
  username?: string;
  email?: string;
  password?: string;
}

export interface Model {
  id: string;
  name: string;
  isExpanded?: boolean;
  profilePicture?: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  name: string;
  modelId?: string;
  description?: string;
  type: 'desktop' | 'mobile';
  browser: 'chromium' | 'firefox' | 'webkit';
  proxy?: Proxy;
  device?: string;
  status?: 'working' | 'banned' | 'error' | 'unknown';
  credentials?: Credentials;
  country?: string;
  accountName?: string;
  purchaseDate?: string;
  orderNumber?: string;
  isEnabled?: boolean;
  commentKarma?: number;
  postKarma?: number;
  lastCompletedDate?: string;
  profilePicture?: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email?: string;
}

export interface AuthResult {
  user: AuthUser | null;
  session: any;
  error?: string;
}

export interface ElectronAPI {
  // Auth
  getSession: () => Promise<AuthResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<AuthResult>;
  onAuthStateChange: (callback: (event: string, user: AuthUser | null) => void) => void;

  // Profiles
  listProfiles: () => Promise<Profile[]>;
  createProfile: (profile: Omit<Profile, 'id' | 'createdAt'>) => Promise<Profile>;
  updateProfile: (id: string, updates: Partial<Profile>) => Promise<Profile>;
  deleteProfile: (id: string) => Promise<boolean>;

  // Browser
  launchBrowser: (profileId: string) => Promise<{ success: boolean }>;
  closeBrowser: (profileId: string) => Promise<{ success: boolean }>;
  getActiveBrowsers: () => Promise<string[]>;
  listDevices: () => Promise<string[]>;
  onBrowserClosed: (callback: (profileId: string) => void) => void;

  // Reddit
  fetchRedditKarma: (username: string) => Promise<{ commentKarma: number; postKarma: number } | null>;

  // Models
  listModels: () => Promise<Model[]>;
  createModel: (model: Omit<Model, 'id' | 'createdAt'>) => Promise<Model>;
  updateModel: (id: string, updates: Partial<Model>) => Promise<Model>;
  deleteModel: (id: string) => Promise<boolean>;

  // Updater
  checkForUpdates: () => Promise<{ success: boolean; updateInfo?: any; error?: string }>;
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
  installUpdate: () => void;
  getAppVersion: () => Promise<string>;
  onUpdaterStatus: (callback: (data: { status: string; version?: string; error?: string; releaseNotes?: string }) => void) => () => void;
  onUpdaterProgress: (callback: (data: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
