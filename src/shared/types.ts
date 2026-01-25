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
  instagram?: string;
  onlyfans?: string;
  contentFolder?: string;
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
  archivedAt?: string;
  expiresAt?: string;
  subEmailId?: string;
  fingerprint?: Record<string, any>;
  redgifsUsername?: string;
  redgifsPassword?: string;
}

export type UserRole = 'dev' | 'admin' | 'basic';

export interface AuthUser {
  id: string;
  username?: string;
  email?: string;
  role: UserRole;
}

export interface AuthResult {
  user: AuthUser | null;
  error?: string;
}

export interface AppUser {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
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
  credentials?: Credentials;
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

export interface Subreddit {
  id: string;
  modelId: string;
  name: string;
  notes?: string;
  displayOrder: number;
  createdAt: string;
}

export interface ScheduledPost {
  id: string;
  subredditId: string;
  profileId: string;
  scheduledDate: string;
  contentLink?: string;
  caption?: string;
  isPosted: boolean;
  createdAt: string;
}

export interface RedditPost {
  id: string;
  profileId: string;
  redditId: string;
  subreddit: string;
  title: string;
  url?: string;
  permalink: string;
  thumbnail?: string;
  previewUrl?: string;
  selftext?: string;
  score: number;
  upvoteRatio?: number;
  numComments: number;
  createdUtc: string;
  fetchedAt: string;
  driveLink?: string;
  accountName?: string;
  isBanned?: boolean;
}

export interface Backup {
  id: string;
  name: string;
  description?: string;
  createdBy?: string;
  createdAt: string;
  backupType: 'manual' | 'auto' | 'pre-delete' | 'imported';
  fileSize?: number;
  tablesIncluded: string[];
  recordCounts: Record<string, number>;
  metadata?: Record<string, any>;
}

export interface BackupWithData extends Backup {
  data: BackupData;
}

export interface BackupData {
  appUsers: any[];
  userModelAssignments: any[];
  profiles: any[];
  models: any[];
  mainEmails: any[];
  subEmails: any[];
  scheduledPosts: any[];
  redditPosts: any[];
  subreddits: any[];
}

export interface DeletedItem {
  id: string;
  type: 'profile';
  name: string;
  deletedAt: string;
  data: Record<string, any>;
}

export interface SubredditStats {
  subreddit: string;
  postCount: number;
  hasGoogleDrive: boolean;
  driveLinks: string[];
  users: { id: string; username: string }[];
  profiles: { id: string; name: string; status: string }[];
}

export interface RestoreOptions {
  profiles: boolean;
  models: boolean;
  users: boolean;
  emails: boolean;
  posts: boolean;
  overwriteExisting: boolean;
}

export interface SelectiveRestoreOptions {
  profileIds: string[];
  modelIds: string[];
  userIds: string[];
  mainEmailIds: string[];
  subEmailIds: string[];
  redditPostIds: string[];
  subredditIds: string[];
  subredditUsageIds: string[];
  overwriteExisting: boolean;
}

export interface RestoreResult {
  restored: Record<string, number>;
  errors: string[];
}

export interface BackupStats {
  totalBackups: number;
  latestBackup: Backup | null;
  totalSize: number;
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
  archiveProfile: (id: string) => Promise<boolean>;
  listArchivedProfiles: () => Promise<Profile[]>;
  unarchiveProfile: (id: string) => Promise<boolean>;

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
  adminCreateUser: (username: string, password: string, role: UserRole) => Promise<AppUser>;
  adminUpdateUser: (userId: string, updates: { username?: string; password?: string; role?: UserRole }) => Promise<AppUser>;
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

  // Shell
  openExternal: (url: string) => Promise<void>;

  // Subreddits
  listSubreddits: (modelId: string) => Promise<Subreddit[]>;
  createSubreddit: (modelId: string, name: string, notes?: string) => Promise<Subreddit>;
  updateSubreddit: (id: string, updates: { name?: string; notes?: string; displayOrder?: number }) => Promise<Subreddit>;
  deleteSubreddit: (id: string) => Promise<boolean>;

  // Scheduled Posts
  listScheduledPosts: (modelId: string, profileId: string, startDate: string, endDate: string) => Promise<ScheduledPost[]>;
  createScheduledPost: (subredditId: string, profileId: string, scheduledDate: string, contentLink?: string, caption?: string) => Promise<ScheduledPost>;
  updateScheduledPost: (id: string, updates: { contentLink?: string; caption?: string; isPosted?: boolean }) => Promise<ScheduledPost>;
  deleteScheduledPost: (id: string) => Promise<boolean>;

  // Reddit Posts (actual)
  syncRedditPosts: (profileId: string, username: string) => Promise<{ synced: number; total?: number; error?: string }>;
  listRedditPosts: (modelId: string, startDate?: string, endDate?: string) => Promise<RedditPost[]>;
  getRedditPost: (id: string) => Promise<RedditPost>;
  updateRedditPost: (id: string, updates: { driveLink?: string }) => Promise<RedditPost>;
  getSubredditStats: () => Promise<SubredditStats[]>;
  createSubredditUsage: (subreddit: string, userId?: string, profileId?: string) => Promise<any>;

  // Backups
  createBackup: (name: string, description?: string) => Promise<Backup>;
  listBackups: () => Promise<Backup[]>;
  getBackup: (id: string) => Promise<BackupWithData>;
  deleteBackup: (id: string) => Promise<boolean>;
  restoreBackup: (id: string, options: RestoreOptions) => Promise<RestoreResult>;
  restoreSelectedItems: (id: string, options: SelectiveRestoreOptions) => Promise<RestoreResult>;
  exportBackup: (id: string) => Promise<string | null>;
  importBackup: () => Promise<Backup | null>;
  getDeletedItems: () => Promise<DeletedItem[]>;
  restoreDeletedItem: (type: 'profile', id: string) => Promise<boolean>;
  permanentDeleteItem: (type: 'profile', id: string) => Promise<boolean>;
  getBackupStats: () => Promise<BackupStats>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
