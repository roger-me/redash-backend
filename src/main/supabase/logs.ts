import { getSupabaseClient, authStore } from './client';

export interface ActivityLog {
  id: string;
  userId: string | null;
  username: string;
  action: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  details?: Record<string, any>;
  createdAt: string;
}

// Log an activity
export async function logActivity(
  action: string,
  entityType?: string,
  entityId?: string,
  entityName?: string,
  details?: Record<string, any>
): Promise<void> {
  const supabase = getSupabaseClient();
  const userId = authStore.get('userId') as string | null;
  const username = authStore.get('username') as string || 'Unknown';

  const { error } = await supabase
    .from('activity_logs')
    .insert({
      user_id: userId,
      username,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      details,
    });

  if (error) {
    console.error('Failed to log activity:', error);
  }
}

// Get activity logs (most recent first)
export async function getActivityLogs(limit: number = 100): Promise<ActivityLog[]> {
  const supabase = getSupabaseClient();
  console.log('getActivityLogs - fetching with limit:', limit);

  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  console.log('getActivityLogs - result:', { dataCount: data?.length, error });
  if (error) throw new Error(error.message);

  return (data || []).map((log: any) => ({
    id: log.id,
    userId: log.user_id,
    username: log.username,
    action: log.action,
    entityType: log.entity_type,
    entityId: log.entity_id,
    entityName: log.entity_name,
    details: log.details,
    createdAt: log.created_at,
  }));
}

// Clear old logs (optional, for maintenance)
export async function clearOldLogs(daysOld: number = 90): Promise<number> {
  const supabase = getSupabaseClient();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const { data, error } = await supabase
    .from('activity_logs')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .select('id');

  if (error) throw new Error(error.message);
  return data?.length || 0;
}
