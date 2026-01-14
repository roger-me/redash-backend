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
  totalPosts?: number;
  totalComments?: number;
  lastCompletedDate?: string;
  lastPostDate?: string;
  lastCommentDate?: string;
  profilePicture?: string;
  createdAt: string;
  deletedAt?: string;
  expiresAt?: string;
  subEmailId?: string;
}

export interface AuthUser {
  id: string;
  username?: string;
  email?: string;
  role: 'admin' | 'basic';
}

export interface AuthResult {
  user: AuthUser | null;
  error?: string;
}

export interface AppUser {
  id: string;
  username: string;
  role: 'admin' | 'basic';
  created_at: string;
}

export interface ProfileForStats {
  id: string;
  name: string;
  modelId?: string;
  status?: string;
  isEnabled?: boolean;
  commentKarma: number;
  postKarma: number;
  userId?: string;
  createdAt: string;
  country?: string;
  postsToday?: number;
  commentsToday?: number;
  expiresAt?: string;
  subEmailId?: string;
}

export interface MainEmail {
  id: string;
  email: string;
  password: string;
  createdAt: string;
}

export interface SubEmail {
  id: string;
  mainEmailId: string;
  email: string;
  createdAt: string;
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
  getProfileById: (id: string) => Promise<Profile | null>;
  createProfile: (profile: Omit<Profile, 'id' | 'createdAt'>) => Promise<Profile>;
  updateProfile: (id: string, updates: Partial<Profile>) => Promise<Profile>;
  deleteProfile: (id: string) => Promise<boolean>;
  listDeletedProfiles: () => Promise<Profile[]>;
  restoreProfile: (id: string) => Promise<boolean>;
  permanentDeleteProfile: (id: string) => Promise<boolean>;

  // Browser
  launchBrowser: (profileId: string) => Promise<{ success: boolean }>;
  closeBrowser: (profileId: string) => Promise<{ success: boolean }>;
  getActiveBrowsers: () => Promise<string[]>;
  listDevices: () => Promise<string[]>;
  onBrowserClosed: (callback: (profileId: string) => void) => void;

  // Reddit
  fetchRedditKarma: (username: string) => Promise<{ commentKarma: number; postKarma: number; lastPostDate: string | null; lastCommentDate: string | null; totalPosts: number; totalComments: number } | null>;

  // Models
  listModels: () => Promise<Model[]>;
  createModel: (model: Omit<Model, 'id' | 'createdAt'>) => Promise<Model>;
  updateModel: (id: string, updates: Partial<Model>) => Promise<Model>;
  deleteModel: (id: string) => Promise<boolean>;

  // Admin
  adminListUsers: () => Promise<AppUser[]>;
  adminCreateUser: (username: string, password: string, role: 'admin' | 'basic') => Promise<AppUser>;
  adminUpdateUser: (userId: string, updates: { username?: string; password?: string; role?: 'admin' | 'basic' }) => Promise<AppUser>;
  adminDeleteUser: (userId: string) => Promise<boolean>;
  adminGetUserModelAssignments: (userId: string) => Promise<string[]>;
  adminSetUserModelAssignments: (userId: string, modelIds: string[]) => Promise<boolean>;
  adminGetAllProfilesForStats: () => Promise<ProfileForStats[]>;
  adminGetAllModels: () => Promise<Model[]>;
  adminGetAllProfiles: () => Promise<Profile[]>;

  // Emails
  listMainEmails: () => Promise<MainEmail[]>;
  createMainEmail: (email: string, password: string) => Promise<MainEmail>;
  updateMainEmail: (id: string, updates: { email?: string; password?: string }) => Promise<MainEmail>;
  deleteMainEmail: (id: string) => Promise<boolean>;
  listSubEmails: (mainEmailId?: string) => Promise<SubEmail[]>;
  createSubEmail: (mainEmailId: string, email: string) => Promise<SubEmail>;
  updateSubEmail: (id: string, email: string) => Promise<SubEmail>;
  deleteSubEmail: (id: string) => Promise<boolean>;
  getEmailsForSelection: () => Promise<{ mainEmails: MainEmail[]; subEmails: SubEmail[] }>;

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
