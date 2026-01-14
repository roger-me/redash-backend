import { getSupabaseClient } from './client';
import { hashPassword } from './auth';

export interface AppUser {
  id: string;
  username: string;
  role: 'admin' | 'basic';
  created_at: string;
}

export interface UserModelAssignment {
  id: string;
  user_id: string;
  model_id: string;
  created_at: string;
}

// List all users (admin only)
export async function listUsers(): Promise<AppUser[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('app_users')
    .select('id, username, role, created_at')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

// Create a new user (admin only)
export async function createAppUser(
  username: string,
  password: string,
  role: 'admin' | 'basic' = 'basic'
): Promise<AppUser> {
  const supabase = getSupabaseClient();
  const hashedPassword = hashPassword(password);

  const { data, error } = await supabase
    .from('app_users')
    .insert({
      username: username.toLowerCase().trim(),
      password: hashedPassword,
      role,
    })
    .select('id, username, role, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Username already exists');
    }
    throw new Error(error.message);
  }
  return data;
}

// Update a user (admin only)
export async function updateAppUser(
  userId: string,
  updates: { username?: string; password?: string; role?: 'admin' | 'basic' }
): Promise<AppUser> {
  const supabase = getSupabaseClient();

  const dbUpdates: any = {};
  if (updates.username) dbUpdates.username = updates.username.toLowerCase().trim();
  if (updates.password) dbUpdates.password = hashPassword(updates.password);
  if (updates.role) dbUpdates.role = updates.role;

  const { data, error } = await supabase
    .from('app_users')
    .update(dbUpdates)
    .eq('id', userId)
    .select('id, username, role, created_at')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Delete a user (admin only)
export async function deleteAppUser(userId: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('app_users')
    .delete()
    .eq('id', userId);

  if (error) throw new Error(error.message);
  return true;
}

// Get model assignments for a user
export async function getUserModelAssignments(userId: string): Promise<string[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('user_model_assignments')
    .select('model_id')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return (data || []).map((d: any) => d.model_id);
}

// Set model assignments for a user (replaces existing)
export async function setUserModelAssignments(
  userId: string,
  modelIds: string[]
): Promise<boolean> {
  const supabase = getSupabaseClient();

  // Delete existing assignments
  await supabase
    .from('user_model_assignments')
    .delete()
    .eq('user_id', userId);

  // Insert new assignments
  if (modelIds.length > 0) {
    const assignments = modelIds.map(modelId => ({
      user_id: userId,
      model_id: modelId,
    }));

    const { error } = await supabase
      .from('user_model_assignments')
      .insert(assignments);

    if (error) throw new Error(error.message);
  }

  return true;
}

// Add a single model assignment
export async function addUserModelAssignment(
  userId: string,
  modelId: string
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('user_model_assignments')
    .insert({ user_id: userId, model_id: modelId });

  if (error && error.code !== '23505') { // Ignore duplicate
    throw new Error(error.message);
  }
  return true;
}

// Remove a single model assignment
export async function removeUserModelAssignment(
  userId: string,
  modelId: string
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('user_model_assignments')
    .delete()
    .eq('user_id', userId)
    .eq('model_id', modelId);

  if (error) throw new Error(error.message);
  return true;
}

// Get users assigned to a model
export async function getModelUsers(modelId: string): Promise<string[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('user_model_assignments')
    .select('user_id')
    .eq('model_id', modelId);

  if (error) throw new Error(error.message);
  return (data || []).map((d: any) => d.user_id);
}

// Get all profiles for stats (admin only)
export async function getAllProfilesForStats(): Promise<any[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  // Convert snake_case to camelCase
  return (data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    modelId: p.model_id,
    status: p.status,
    isEnabled: p.is_enabled,
    commentKarma: p.comment_karma || 0,
    postKarma: p.post_karma || 0,
    userId: p.user_id,
    createdAt: p.created_at,
    country: p.country,
    postsToday: p.posts_today || 0,
    commentsToday: p.comments_today || 0,
    expiresAt: p.expires_at,
  }));
}

export async function getAllModels(): Promise<any[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('models')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((m: any) => ({
    id: m.id,
    name: m.name,
    isExpanded: m.is_expanded !== false,
    profilePicture: m.profile_picture,
    createdAt: m.created_at,
    userId: m.user_id,
  }));
}

export async function getAllProfiles(): Promise<any[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    type: p.type || 'desktop',
    modelId: p.model_id,
    status: p.status,
    isEnabled: p.is_enabled,
    commentKarma: p.comment_karma || 0,
    postKarma: p.post_karma || 0,
    userId: p.user_id,
    createdAt: p.created_at,
    country: p.country,
    proxy: p.proxy,
    credentials: p.credentials,
    accountName: p.account_name,
    purchaseDate: p.purchase_date,
    orderNumber: p.order_number,
    lastCompletedDate: p.last_completed_date,
    postsToday: p.posts_today || 0,
    commentsToday: p.comments_today || 0,
    expiresAt: p.expires_at,
  }));
}
