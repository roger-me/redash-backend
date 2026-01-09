import { useState, useEffect } from 'react';
import { CaretDown, CaretRight, FolderSimple, CheckCircle, XCircle, Warning, CircleNotch } from '@phosphor-icons/react';
import { Model, AppUser, ProfileForStats } from '../../shared/types';

// Generate a consistent color based on string
const avatarColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#FF8C00', '#00CED1', '#9370DB', '#3CB371',
];

const getAvatarColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

interface StatsPageProps {
  models: Model[];
}

interface ModelStats {
  modelId: string | null;
  modelName: string;
  total: number;
  working: number;
  banned: number;
  error: number;
  enabled: number;
  disabled: number;
  totalKarma: number;
}

interface UserStats {
  user: AppUser;
  modelStats: ModelStats[];
  totalProfiles: number;
}

export default function StatsPage({ models }: StatsPageProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [profiles, setProfiles] = useState<ProfileForStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<UserStats[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (users.length > 0 && profiles.length >= 0) {
      calculateStats();
    }
  }, [users, profiles, models]);

  const loadData = async () => {
    try {
      const [usersData, profilesData] = await Promise.all([
        window.electronAPI?.adminListUsers(),
        window.electronAPI?.adminGetAllProfilesForStats(),
      ]);
      setUsers(usersData || []);
      setProfiles(profilesData || []);
    } catch (err) {
      console.error('Failed to load stats data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const stats: UserStats[] = users.map(user => {
      // Get profiles for this user
      const userProfiles = profiles.filter(p => p.userId === user.id);

      // Group by model
      const modelGroups = new Map<string | null, ProfileForStats[]>();
      
      userProfiles.forEach(profile => {
        const key = profile.modelId || null;
        if (!modelGroups.has(key)) {
          modelGroups.set(key, []);
        }
        modelGroups.get(key)!.push(profile);
      });

      // Calculate stats per model
      const modelStats: ModelStats[] = [];
      
      modelGroups.forEach((groupProfiles, modelId) => {
        const model = models.find(m => m.id === modelId);
        modelStats.push({
          modelId,
          modelName: model?.name || 'No Model',
          total: groupProfiles.length,
          working: groupProfiles.filter(p => p.status === 'working').length,
          banned: groupProfiles.filter(p => p.status === 'banned').length,
          error: groupProfiles.filter(p => p.status === 'error').length,
          enabled: groupProfiles.filter(p => p.isEnabled !== false).length,
          disabled: groupProfiles.filter(p => p.isEnabled === false).length,
          totalKarma: groupProfiles.reduce((sum, p) => sum + (p.commentKarma || 0) + (p.postKarma || 0), 0),
        });
      });

      // Sort by model name
      modelStats.sort((a, b) => a.modelName.localeCompare(b.modelName));

      return {
        user,
        modelStats,
        totalProfiles: userProfiles.length,
      };
    });

    // Sort by total profiles desc
    stats.sort((a, b) => b.totalProfiles - a.totalProfiles);
    setUserStats(stats);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CircleNotch size={32} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
      </div>
    );
  }

  return (
    <main className="flex-1 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Statistics
        </h1>
        <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          {profiles.length} total browsers
        </div>
      </div>

      <div className="space-y-2">
        {userStats.length === 0 ? (
          <div className="rounded-xl p-12 text-center" style={{ background: 'var(--bg-secondary)' }}>
            <User size={32} weight="light" color="var(--text-tertiary)" className="mx-auto mb-3" />
            <p style={{ color: 'var(--text-tertiary)' }}>No data yet</p>
          </div>
        ) : (
          userStats.map(({ user, modelStats, totalProfiles }) => (
            <div key={user.id} className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
              {/* User Row */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-black/5"
                onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
              >
                <div style={{ color: 'var(--text-tertiary)' }}>
                  {expandedUser === user.id ? <CaretDown size={16} /> : <CaretRight size={16} />}
                </div>

                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ background: getAvatarColor(user.username) }}
                >
                  {user.username.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {user.username}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--chip-bg)', color: 'var(--text-secondary)' }}>
                      {user.role}
                    </span>
                  </div>
                  <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    {totalProfiles} browser{totalProfiles !== 1 ? 's' : ''} across {modelStats.length} model{modelStats.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Summary chips */}
                <div className="flex items-center gap-2">
                  {totalProfiles > 0 && (
                    <>
                      <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(76, 175, 80, 0.2)', color: '#4CAF50' }}>
                        {modelStats.reduce((sum, m) => sum + m.working, 0)} working
                      </span>
                      {modelStats.reduce((sum, m) => sum + m.banned, 0) > 0 && (
                        <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(244, 67, 54, 0.2)', color: '#F44336' }}>
                          {modelStats.reduce((sum, m) => sum + m.banned, 0)} banned
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Expanded Model Stats */}
              {expandedUser === user.id && (
                <div className="px-4 pb-4 space-y-2">
                  {modelStats.length === 0 ? (
                    <p className="text-sm py-2" style={{ color: 'var(--text-tertiary)' }}>
                      No browsers created yet
                    </p>
                  ) : (
                    modelStats.map(stat => (
                      <div
                        key={stat.modelId || 'no-model'}
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{ background: 'var(--bg-tertiary)' }}
                      >
                        <FolderSimple size={18} style={{ color: 'var(--text-tertiary)' }} />
                        <span className="font-medium text-sm min-w-[120px]" style={{ color: 'var(--text-primary)' }}>
                          {stat.modelName}
                        </span>

                        <div className="flex items-center gap-2 flex-wrap flex-1">
                          {/* Total */}
                          <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--chip-bg)', color: 'var(--text-secondary)' }}>
                            {stat.total} total
                          </span>

                          {/* Working */}
                          {stat.working > 0 && (
                            <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ background: 'rgba(76, 175, 80, 0.2)', color: '#4CAF50' }}>
                              <CheckCircle size={12} weight="bold" />
                              {stat.working}
                            </span>
                          )}

                          {/* Banned */}
                          {stat.banned > 0 && (
                            <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ background: 'rgba(244, 67, 54, 0.2)', color: '#F44336' }}>
                              <XCircle size={12} weight="bold" />
                              {stat.banned}
                            </span>
                          )}

                          {/* Error */}
                          {stat.error > 0 && (
                            <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ background: 'rgba(255, 152, 0, 0.2)', color: '#FF9800' }}>
                              <Warning size={12} weight="bold" />
                              {stat.error}
                            </span>
                          )}

                          {/* Enabled/Disabled */}
                          <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(33, 150, 243, 0.2)', color: '#2196F3' }}>
                            {stat.enabled} enabled
                          </span>
                          {stat.disabled > 0 && (
                            <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--chip-bg)', color: 'var(--text-tertiary)' }}>
                              {stat.disabled} disabled
                            </span>
                          )}

                          {/* Karma */}
                          {stat.totalKarma > 0 && (
                            <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(156, 39, 176, 0.2)', color: '#9C27B0' }}>
                              {stat.totalKarma.toLocaleString()} karma
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  );
}
