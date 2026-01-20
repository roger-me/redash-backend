import { getSupabaseClient, authStore } from './client';

// Get current user ID from custom auth
function getCurrentUserId(): string | null {
  const userId = authStore.get('userId') as string | null;
  console.log('getCurrentUserId - authStore contents:', {
    userId: authStore.get('userId'),
    username: authStore.get('username'),
    role: authStore.get('role'),
  });
  return userId;
}

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

// Profile operations
export async function getProfileById(id: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return toCamelCase(data);
}

export async function listProfiles() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .is('deleted_at', null)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(toCamelCase);
}

export async function createProfile(profile: Record<string, any>) {
  const supabase = getSupabaseClient();
  const userId = getCurrentUserId();

  if (!userId) throw new Error('Not authenticated');

  const dbProfile = {
    ...toSnakeCase(profile),
    user_id: userId,
  };

  const { data, error } = await supabase
    .from('profiles')
    .insert(dbProfile)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toCamelCase(data);
}

export async function updateProfile(id: string, updates: Record<string, any>) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('profiles')
    .update(toSnakeCase(updates))
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toCamelCase(data);
}

// Soft delete profile (archive to trash)
export async function deleteProfile(id: string) {
  const supabase = getSupabaseClient();
  console.log('DB deleteProfile (soft) - id:', id);

  const { data, error } = await supabase
    .from('profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select();

  console.log('DB deleteProfile (soft) - result:', { data, error });
  if (error) throw new Error(error.message);
  return true;
}

// List deleted profiles (trash)
export async function listDeletedProfiles() {
  const supabase = getSupabaseClient();
  console.log('DB listDeletedProfiles - fetching...');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  console.log('DB listDeletedProfiles - result:', { count: data?.length, error });
  if (error) throw new Error(error.message);
  return (data || []).map(toCamelCase);
}

// Restore a deleted profile
export async function restoreProfile(id: string) {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('profiles')
    .update({ deleted_at: null })
    .eq('id', id);

  if (error) throw new Error(error.message);
  return true;
}

// Permanently delete a profile
export async function permanentDeleteProfile(id: string) {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return true;
}

// Archive a profile (hide banned accounts but keep in Google Sheet)
export async function archiveProfile(id: string) {
  const supabase = getSupabaseClient();
  console.log('DB archiveProfile - id:', id);

  const { data, error } = await supabase
    .from('profiles')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .select();

  console.log('DB archiveProfile - result:', { data, error });
  if (error) throw new Error(error.message);
  return true;
}

// List archived profiles
export async function listArchivedProfiles() {
  const supabase = getSupabaseClient();
  console.log('DB listArchivedProfiles - fetching...');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .is('deleted_at', null)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false });

  console.log('DB listArchivedProfiles - result:', { count: data?.length, error });
  if (error) throw new Error(error.message);
  return (data || []).map(toCamelCase);
}

// Unarchive a profile
export async function unarchiveProfile(id: string) {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('profiles')
    .update({ archived_at: null })
    .eq('id', id);

  if (error) throw new Error(error.message);
  return true;
}

// Model operations
export async function listModels() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('models')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(toCamelCase);
}

export async function createModel(model: Record<string, any>) {
  const supabase = getSupabaseClient();
  const userId = getCurrentUserId();

  if (!userId) throw new Error('Not authenticated');

  const dbModel = {
    ...toSnakeCase(model),
    user_id: userId,
  };

  const { data, error } = await supabase
    .from('models')
    .insert(dbModel)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toCamelCase(data);
}

export async function updateModel(id: string, updates: Record<string, any>) {
  const supabase = getSupabaseClient();
  const snakeCaseUpdates = toSnakeCase(updates);
  console.log('DB updateModel - id:', id);
  console.log('DB updateModel - updates:', updates);
  console.log('DB updateModel - snakeCaseUpdates:', snakeCaseUpdates);

  const { data, error } = await supabase
    .from('models')
    .update(snakeCaseUpdates)
    .eq('id', id)
    .select()
    .single();

  console.log('DB updateModel - result data:', data);
  console.log('DB updateModel - result error:', error);
  if (error) throw new Error(error.message);
  return toCamelCase(data);
}

export async function deleteModel(id: string) {
  const supabase = getSupabaseClient();

  // First, remove modelId from profiles that were in this model
  await supabase
    .from('profiles')
    .update({ model_id: null })
    .eq('model_id', id);

  const { error } = await supabase
    .from('models')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return true;
}
