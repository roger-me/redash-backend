import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Store from 'electron-store';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

// Load environment variables from .env file
function loadEnv() {
  // Try multiple possible locations for .env
  const possiblePaths = app.isPackaged
    ? [path.join(process.resourcesPath, '.env')]
    : [
        path.join(process.cwd(), '.env'),
        path.join(__dirname, '../../../.env'),
        path.join(__dirname, '../../../../.env'),
        path.join(__dirname, '../../../../../.env'),
      ];

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      });
      return;
    }
  }
}

loadEnv();

// Secure storage for auth tokens
const authStore = new Store({
  name: 'redash-auth',
  encryptionKey: 'redash-secure-storage-key-v1',
});

// Custom storage adapter for Supabase
const customStorage = {
  getItem: (key: string): string | null => {
    return authStore.get(key) as string | null;
  },
  setItem: (key: string, value: string): void => {
    authStore.set(key, value);
  },
  removeItem: (key: string): void => {
    authStore.delete(key);
  },
};

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase credentials not configured. Please add SUPABASE_URL and SUPABASE_ANON_KEY to .env file.');
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: customStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  return supabaseClient;
}

export function clearAuthStorage(): void {
  authStore.clear();
}

// Run database migrations
export async function runMigrations(): Promise<void> {
  const supabase = getSupabaseClient();

  try {
    // Try to add expires_at column if it doesn't exist
    const { error } = await supabase.rpc('run_migration', {
      sql_query: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;`
    });

    if (error) {
      console.log('Migration via RPC not available, column may need to be added manually');
    } else {
      console.log('Migration completed successfully');
    }
  } catch (err) {
    console.log('Migration skipped:', err);
  }
}

export { authStore };
