import { getSupabaseClient, authStore } from './client';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// Helper to convert camelCase to snake_case
function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

// Helper to convert snake_case to camelCase
function toCamelCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

// Get current user ID from custom auth
function getCurrentUserId(): string | null {
  return authStore.get('userId') as string | null;
}

// ============ INTERFACES ============

export interface RestoreOptions {
  profiles: boolean;
  models: boolean;
  users: boolean;
  emails: boolean;
  posts: boolean;
  overwriteExisting: boolean;
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
  subredditUsage: any[];
}

export interface Backup {
  id: string;
  name: string;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  fileSize: number | null;
  tablesIncluded: string[];
  recordCounts: Record<string, number>;
  backupType: string;
  metadata: Record<string, any> | null;
}

export interface BackupWithData extends Backup {
  data: BackupData;
}

export interface DeletedItem {
  id: string;
  type: 'profile';
  name: string;
  deletedAt: string;
  data: Record<string, any>;
}

// ============ HELPER FUNCTIONS ============

function getBackupsDir(): string {
  const dataDir = path.join(app.getPath('userData'), 'redash-data', 'backups');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

// ============ BACKUP OPERATIONS ============

/**
 * Aggregate all tables' data for backup
 */
export async function getAllDataForBackup(): Promise<BackupData> {
  const supabase = getSupabaseClient();

  // Fetch all tables in parallel
  const [
    appUsersResult,
    userModelAssignmentsResult,
    profilesResult,
    modelsResult,
    mainEmailsResult,
    subEmailsResult,
    scheduledPostsResult,
    redditPostsResult,
    subredditsResult,
    subredditUsageResult,
  ] = await Promise.all([
    supabase.from('app_users').select('*'),
    supabase.from('user_model_assignments').select('*'),
    supabase.from('profiles').select('*'),
    supabase.from('models').select('*'),
    supabase.from('main_emails').select('*'),
    supabase.from('sub_emails').select('*'),
    supabase.from('scheduled_posts').select('*'),
    supabase.from('reddit_posts').select('*'),
    supabase.from('subreddits').select('*'),
    supabase.from('subreddit_usage').select('*'),
  ]);

  // Check for errors
  if (appUsersResult.error) throw new Error(`Failed to fetch app_users: ${appUsersResult.error.message}`);
  if (userModelAssignmentsResult.error) throw new Error(`Failed to fetch user_model_assignments: ${userModelAssignmentsResult.error.message}`);
  if (profilesResult.error) throw new Error(`Failed to fetch profiles: ${profilesResult.error.message}`);
  if (modelsResult.error) throw new Error(`Failed to fetch models: ${modelsResult.error.message}`);
  if (mainEmailsResult.error) throw new Error(`Failed to fetch main_emails: ${mainEmailsResult.error.message}`);
  if (subEmailsResult.error) throw new Error(`Failed to fetch sub_emails: ${subEmailsResult.error.message}`);
  if (scheduledPostsResult.error) throw new Error(`Failed to fetch scheduled_posts: ${scheduledPostsResult.error.message}`);
  if (redditPostsResult.error) throw new Error(`Failed to fetch reddit_posts: ${redditPostsResult.error.message}`);
  if (subredditsResult.error) throw new Error(`Failed to fetch subreddits: ${subredditsResult.error.message}`);
  if (subredditUsageResult.error) throw new Error(`Failed to fetch subreddit_usage: ${subredditUsageResult.error.message}`);

  return {
    appUsers: (appUsersResult.data || []).map(toCamelCase),
    userModelAssignments: (userModelAssignmentsResult.data || []).map(toCamelCase),
    profiles: (profilesResult.data || []).map(toCamelCase),
    models: (modelsResult.data || []).map(toCamelCase),
    mainEmails: (mainEmailsResult.data || []).map(toCamelCase),
    subEmails: (subEmailsResult.data || []).map(toCamelCase),
    scheduledPosts: (scheduledPostsResult.data || []).map(toCamelCase),
    redditPosts: (redditPostsResult.data || []).map(toCamelCase),
    subreddits: (subredditsResult.data || []).map(toCamelCase),
    subredditUsage: (subredditUsageResult.data || []).map(toCamelCase),
  };
}

/**
 * Create a new backup
 */
export async function createBackup(
  name: string,
  description?: string,
  userId?: string,
  saveLocalFile: boolean = true
): Promise<Backup> {
  const supabase = getSupabaseClient();
  const createdBy = userId || getCurrentUserId();

  // Get all data
  const data = await getAllDataForBackup();

  // Calculate record counts
  const recordCounts: Record<string, number> = {
    appUsers: data.appUsers.length,
    userModelAssignments: data.userModelAssignments.length,
    profiles: data.profiles.length,
    models: data.models.length,
    mainEmails: data.mainEmails.length,
    subEmails: data.subEmails.length,
    scheduledPosts: data.scheduledPosts.length,
    redditPosts: data.redditPosts.length,
    subreddits: data.subreddits.length,
    subredditUsage: data.subredditUsage.length,
  };

  // Tables included
  const tablesIncluded = [
    'app_users',
    'user_model_assignments',
    'profiles',
    'models',
    'main_emails',
    'sub_emails',
    'scheduled_posts',
    'reddit_posts',
    'subreddits',
    'subreddit_usage',
  ];

  // Calculate file size (approximate)
  const dataString = JSON.stringify(data);
  const fileSize = Buffer.byteLength(dataString, 'utf8');

  // Metadata
  const metadata = {
    appVersion: app.getVersion(),
    platform: process.platform,
    createdAt: new Date().toISOString(),
  };

  // Insert backup record into database
  const { data: backupRecord, error } = await supabase
    .from('backups')
    .insert({
      name,
      description: description || null,
      created_by: createdBy,
      data,
      file_size: fileSize,
      tables_included: tablesIncluded,
      record_counts: recordCounts,
      backup_type: 'manual',
      metadata,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create backup: ${error.message}`);

  // Optionally save local JSON file
  if (saveLocalFile) {
    try {
      const backupsDir = getBackupsDir();
      const fileName = `backup_${backupRecord.id}_${Date.now()}.json`;
      const filePath = path.join(backupsDir, fileName);
      fs.writeFileSync(filePath, dataString, 'utf8');
      console.log(`Local backup saved to: ${filePath}`);
    } catch (err) {
      console.error('Failed to save local backup file:', err);
      // Don't throw - backup is already in database
    }
  }

  return {
    id: backupRecord.id,
    name: backupRecord.name,
    description: backupRecord.description,
    createdBy: backupRecord.created_by,
    createdAt: backupRecord.created_at,
    fileSize: backupRecord.file_size,
    tablesIncluded: backupRecord.tables_included,
    recordCounts: backupRecord.record_counts,
    backupType: backupRecord.backup_type,
    metadata: backupRecord.metadata,
  };
}

/**
 * List all backups (metadata only, not full data)
 */
export async function listBackups(): Promise<Backup[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('backups')
    .select('id, name, description, created_by, created_at, file_size, tables_included, record_counts, backup_type, metadata')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to list backups: ${error.message}`);

  return (data || []).map(b => ({
    id: b.id,
    name: b.name,
    description: b.description,
    createdBy: b.created_by,
    createdAt: b.created_at,
    fileSize: b.file_size,
    tablesIncluded: b.tables_included,
    recordCounts: b.record_counts,
    backupType: b.backup_type,
    metadata: b.metadata,
  }));
}

/**
 * Get a single backup with full data
 */
export async function getBackup(id: string): Promise<BackupWithData> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('backups')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(`Failed to get backup: ${error.message}`);

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    createdBy: data.created_by,
    createdAt: data.created_at,
    fileSize: data.file_size,
    tablesIncluded: data.tables_included,
    recordCounts: data.record_counts,
    backupType: data.backup_type,
    metadata: data.metadata,
    data: data.data,
  };
}

/**
 * Delete a backup
 */
export async function deleteBackup(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('backups')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete backup: ${error.message}`);

  // Also try to delete local file if it exists
  try {
    const backupsDir = getBackupsDir();
    const files = fs.readdirSync(backupsDir);
    const matchingFile = files.find(f => f.includes(id));
    if (matchingFile) {
      fs.unlinkSync(path.join(backupsDir, matchingFile));
    }
  } catch (err) {
    console.error('Failed to delete local backup file:', err);
  }

  return true;
}

/**
 * Restore selected categories from a backup
 */
export async function restoreFromBackup(
  id: string,
  options: RestoreOptions
): Promise<{ restored: Record<string, number>; errors: string[] }> {
  const supabase = getSupabaseClient();
  const backup = await getBackup(id);
  const { data } = backup;

  const restored: Record<string, number> = {};
  const errors: string[] = [];

  // Helper to upsert records
  async function upsertRecords(
    tableName: string,
    records: any[],
    category: string
  ): Promise<number> {
    if (records.length === 0) return 0;

    let successCount = 0;
    for (const record of records) {
      const snakeCaseRecord = toSnakeCase(record);

      if (options.overwriteExisting) {
        // Use upsert
        const { error } = await supabase
          .from(tableName)
          .upsert(snakeCaseRecord, { onConflict: 'id' });

        if (error) {
          errors.push(`${category}: Failed to restore ${tableName} record ${record.id}: ${error.message}`);
        } else {
          successCount++;
        }
      } else {
        // Only insert if not exists
        const { data: existing } = await supabase
          .from(tableName)
          .select('id')
          .eq('id', record.id)
          .single();

        if (!existing) {
          const { error } = await supabase
            .from(tableName)
            .insert(snakeCaseRecord);

          if (error) {
            errors.push(`${category}: Failed to restore ${tableName} record ${record.id}: ${error.message}`);
          } else {
            successCount++;
          }
        }
      }
    }
    return successCount;
  }

  // Restore Users (app_users and user_model_assignments)
  if (options.users) {
    const usersRestored = await upsertRecords('app_users', data.appUsers, 'users');
    const assignmentsRestored = await upsertRecords('user_model_assignments', data.userModelAssignments, 'users');
    restored.users = usersRestored;
    restored.userModelAssignments = assignmentsRestored;
  }

  // Restore Models
  if (options.models) {
    const modelsRestored = await upsertRecords('models', data.models, 'models');
    restored.models = modelsRestored;
  }

  // Restore Profiles
  if (options.profiles) {
    const profilesRestored = await upsertRecords('profiles', data.profiles, 'profiles');
    restored.profiles = profilesRestored;
  }

  // Restore Emails (main_emails and sub_emails)
  if (options.emails) {
    const mainEmailsRestored = await upsertRecords('main_emails', data.mainEmails, 'emails');
    const subEmailsRestored = await upsertRecords('sub_emails', data.subEmails, 'emails');
    restored.mainEmails = mainEmailsRestored;
    restored.subEmails = subEmailsRestored;
  }

  // Restore Posts (scheduled_posts, reddit_posts, subreddits, subreddit_usage)
  if (options.posts) {
    const subredditsRestored = await upsertRecords('subreddits', data.subreddits, 'posts');
    const scheduledPostsRestored = await upsertRecords('scheduled_posts', data.scheduledPosts, 'posts');
    const redditPostsRestored = await upsertRecords('reddit_posts', data.redditPosts, 'posts');
    const subredditUsageRestored = await upsertRecords('subreddit_usage', data.subredditUsage || [], 'posts');
    restored.subreddits = subredditsRestored;
    restored.scheduledPosts = scheduledPostsRestored;
    restored.redditPosts = redditPostsRestored;
    restored.subredditUsage = subredditUsageRestored;
  }

  return { restored, errors };
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

/**
 * Restore selected items from a backup
 */
export async function restoreSelectedItems(
  id: string,
  options: SelectiveRestoreOptions
): Promise<{ restored: Record<string, number>; errors: string[] }> {
  const supabase = getSupabaseClient();
  const backup = await getBackup(id);
  const { data } = backup;

  const restored: Record<string, number> = {};
  const errors: string[] = [];

  // Helper to upsert specific records
  async function upsertRecords(
    tableName: string,
    records: any[],
    selectedIds: string[],
    category: string
  ): Promise<number> {
    const filteredRecords = records.filter(r => selectedIds.includes(r.id));
    if (filteredRecords.length === 0) return 0;

    let successCount = 0;
    for (const record of filteredRecords) {
      const snakeCaseRecord = toSnakeCase(record);

      if (options.overwriteExisting) {
        const { error } = await supabase
          .from(tableName)
          .upsert(snakeCaseRecord, { onConflict: 'id' });

        if (error) {
          errors.push(`${category}: Failed to restore ${record.id}: ${error.message}`);
        } else {
          successCount++;
        }
      } else {
        const { data: existing } = await supabase
          .from(tableName)
          .select('id')
          .eq('id', record.id)
          .single();

        if (!existing) {
          const { error } = await supabase
            .from(tableName)
            .insert(snakeCaseRecord);

          if (error) {
            errors.push(`${category}: Failed to restore ${record.id}: ${error.message}`);
          } else {
            successCount++;
          }
        }
      }
    }
    return successCount;
  }

  // Restore selected profiles
  if (options.profileIds.length > 0) {
    restored.profiles = await upsertRecords('profiles', data.profiles, options.profileIds, 'profiles');
  }

  // Restore selected models
  if (options.modelIds.length > 0) {
    restored.models = await upsertRecords('models', data.models, options.modelIds, 'models');
  }

  // Restore selected users
  if (options.userIds.length > 0) {
    restored.users = await upsertRecords('app_users', data.appUsers, options.userIds, 'users');
    // Also restore user_model_assignments for selected users
    const userAssignments = data.userModelAssignments.filter((a: any) => options.userIds.includes(a.userId));
    if (userAssignments.length > 0) {
      restored.userModelAssignments = await upsertRecords(
        'user_model_assignments',
        userAssignments,
        userAssignments.map((a: any) => a.id),
        'user_assignments'
      );
    }
  }

  // Restore selected main emails
  if (options.mainEmailIds.length > 0) {
    restored.mainEmails = await upsertRecords('main_emails', data.mainEmails, options.mainEmailIds, 'main_emails');
  }

  // Restore selected sub emails
  if (options.subEmailIds.length > 0) {
    restored.subEmails = await upsertRecords('sub_emails', data.subEmails, options.subEmailIds, 'sub_emails');
  }

  // Restore selected reddit posts
  if (options.redditPostIds?.length > 0) {
    restored.redditPosts = await upsertRecords('reddit_posts', data.redditPosts, options.redditPostIds, 'reddit_posts');
  }

  // Restore selected subreddits
  if (options.subredditIds?.length > 0) {
    restored.subreddits = await upsertRecords('subreddits', data.subreddits, options.subredditIds, 'subreddits');
  }

  // Restore selected subreddit usage
  if (options.subredditUsageIds?.length > 0) {
    restored.subredditUsage = await upsertRecords('subreddit_usage', data.subredditUsage || [], options.subredditUsageIds, 'subreddit_usage');
  }

  return { restored, errors };
}

// ============ DELETED ITEMS (TRASH) OPERATIONS ============

/**
 * Get soft-deleted items from all tables that support soft delete
 * Currently only profiles support soft delete (deleted_at column)
 */
export async function getDeletedItems(): Promise<DeletedItem[]> {
  const supabase = getSupabaseClient();
  const deletedItems: DeletedItem[] = [];

  // Get deleted profiles
  const { data: deletedProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (profilesError) throw new Error(`Failed to get deleted profiles: ${profilesError.message}`);

  for (const profile of deletedProfiles || []) {
    deletedItems.push({
      id: profile.id,
      type: 'profile',
      name: profile.name || profile.account_name || 'Unnamed Profile',
      deletedAt: profile.deleted_at,
      data: toCamelCase(profile),
    });
  }

  return deletedItems;
}

/**
 * Restore a soft-deleted item
 */
export async function restoreDeletedItem(
  type: 'profile',
  id: string
): Promise<boolean> {
  const supabase = getSupabaseClient();

  switch (type) {
    case 'profile': {
      const { error } = await supabase
        .from('profiles')
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) throw new Error(`Failed to restore profile: ${error.message}`);
      return true;
    }
    default:
      throw new Error(`Unknown item type: ${type}`);
  }
}

/**
 * Permanently delete an item (hard delete)
 */
export async function permanentDeleteItem(
  type: 'profile',
  id: string
): Promise<boolean> {
  const supabase = getSupabaseClient();

  switch (type) {
    case 'profile': {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw new Error(`Failed to permanently delete profile: ${error.message}`);
      return true;
    }
    default:
      throw new Error(`Unknown item type: ${type}`);
  }
}

// ============ UTILITY FUNCTIONS ============

/**
 * Get backup statistics
 */
export async function getBackupStats(): Promise<{
  totalBackups: number;
  latestBackup: Backup | null;
  totalSize: number;
}> {
  const backups = await listBackups();

  const totalSize = backups.reduce((sum, b) => sum + (b.fileSize || 0), 0);

  return {
    totalBackups: backups.length,
    latestBackup: backups.length > 0 ? backups[0] : null,
    totalSize,
  };
}

/**
 * Export backup to local file (download)
 */
export async function exportBackupToFile(id: string, targetPath: string): Promise<string> {
  const backup = await getBackup(id);
  const content = JSON.stringify(backup, null, 2);

  fs.writeFileSync(targetPath, content, 'utf8');
  return targetPath;
}

/**
 * Import backup from local file
 */
export async function importBackupFromFile(
  filePath: string,
  name?: string
): Promise<Backup> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  let importedData: any;

  try {
    importedData = JSON.parse(content);
  } catch {
    throw new Error('Invalid JSON file');
  }

  // Validate the imported data has required structure
  const requiredFields = ['appUsers', 'profiles', 'models', 'mainEmails', 'subEmails'];
  const data = importedData.data || importedData;

  for (const field of requiredFields) {
    if (!Array.isArray(data[field])) {
      throw new Error(`Invalid backup file: missing ${field} array`);
    }
  }

  // Create a new backup with the imported data
  const supabase = getSupabaseClient();
  const createdBy = getCurrentUserId();
  const backupName = name || `Imported: ${path.basename(filePath)}`;

  // Calculate record counts
  const recordCounts: Record<string, number> = {
    appUsers: data.appUsers?.length || 0,
    userModelAssignments: data.userModelAssignments?.length || 0,
    profiles: data.profiles?.length || 0,
    models: data.models?.length || 0,
    mainEmails: data.mainEmails?.length || 0,
    subEmails: data.subEmails?.length || 0,
    scheduledPosts: data.scheduledPosts?.length || 0,
    redditPosts: data.redditPosts?.length || 0,
    subreddits: data.subreddits?.length || 0,
    subredditUsage: data.subredditUsage?.length || 0,
  };

  const tablesIncluded = Object.keys(recordCounts).filter(k => recordCounts[k] > 0);
  const fileSize = Buffer.byteLength(content, 'utf8');

  const metadata = {
    appVersion: app.getVersion(),
    platform: process.platform,
    createdAt: new Date().toISOString(),
    importedFrom: path.basename(filePath),
  };

  const { data: backupRecord, error } = await supabase
    .from('backups')
    .insert({
      name: backupName,
      description: `Imported from ${path.basename(filePath)}`,
      created_by: createdBy,
      data,
      file_size: fileSize,
      tables_included: tablesIncluded,
      record_counts: recordCounts,
      backup_type: 'imported',
      metadata,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to import backup: ${error.message}`);

  return {
    id: backupRecord.id,
    name: backupRecord.name,
    description: backupRecord.description,
    createdBy: backupRecord.created_by,
    createdAt: backupRecord.created_at,
    fileSize: backupRecord.file_size,
    tablesIncluded: backupRecord.tables_included,
    recordCounts: backupRecord.record_counts,
    backupType: backupRecord.backup_type,
    metadata: backupRecord.metadata,
  };
}
