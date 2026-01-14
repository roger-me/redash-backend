import { getSupabaseClient, authStore } from './client';

export type UserRole = 'dev' | 'admin' | 'basic';

export interface AuthResult {
  user: { id: string; username: string; role: UserRole } | null;
  error?: string;
}

// Simple hash function for passwords (for demo - use bcrypt in production)
function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(16) + '_' + password.length;
}

// Get current session from local storage
export async function getSession(): Promise<AuthResult> {
  try {
    const userId = authStore.get('userId') as string | undefined;
    const username = authStore.get('username') as string | undefined;
    const role = (authStore.get('role') as UserRole) || 'basic';

    if (userId && username) {
      return { user: { id: userId, username, role } };
    }

    return { user: null };
  } catch (err) {
    return { user: null, error: (err as Error).message };
  }
}

// Sign in with username and password
export async function signInWithEmail(username: string, password: string): Promise<AuthResult> {
  try {
    const supabase = getSupabaseClient();
    const hashedPassword = hashPassword(password);

    const { data, error } = await supabase
      .from('app_users')
      .select('id, username, password, role')
      .eq('username', username.toLowerCase().trim())
      .single();

    if (error || !data) {
      return { user: null, error: 'Invalid username or password' };
    }

    if (data.password !== hashedPassword) {
      return { user: null, error: 'Invalid username or password' };
    }

    const role = (data.role as UserRole) || 'basic';

    // Store session locally
    authStore.set('userId', data.id);
    authStore.set('username', data.username);
    authStore.set('role', role);

    return {
      user: { id: data.id, username: data.username, role },
    };
  } catch (err) {
    return { user: null, error: (err as Error).message };
  }
}

// Sign up - not used, users created by admin
export async function signUp(username: string, password: string, role: UserRole = 'basic'): Promise<AuthResult> {
  try {
    const supabase = getSupabaseClient();
    const hashedPassword = hashPassword(password);

    const { data, error } = await supabase
      .from('app_users')
      .insert({
        username: username.toLowerCase().trim(),
        password: hashedPassword,
        role,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { user: null, error: 'Username already exists' };
      }
      return { user: null, error: error.message };
    }

    return {
      user: { id: data.id, username: data.username, role: data.role || 'basic' },
    };
  } catch (err) {
    return { user: null, error: (err as Error).message };
  }
}

// Sign out
export async function signOut(): Promise<{ error?: string }> {
  try {
    authStore.delete('userId');
    authStore.delete('username');
    authStore.delete('role');
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// Reset password - not applicable for username auth
export async function resetPassword(_username: string): Promise<{ error?: string }> {
  return { error: 'Password reset not available. Contact administrator.' };
}

// Not used - Google sign in removed
export async function signInWithGoogle(): Promise<AuthResult> {
  return { user: null, error: 'Google sign-in not available' };
}

// Auth state change - not used with custom auth
export function onAuthStateChange(_callback: (event: string, session: any) => void) {
  return { unsubscribe: () => {} };
}

// Helper to create a user (for admin use)
export async function createUser(username: string, password: string, role: UserRole = 'basic'): Promise<AuthResult> {
  return signUp(username, password, role);
}

// Helper to hash password (export for creating users)
export { hashPassword };
