import { useState, useEffect } from 'react';
import { FolderSimple, CircleNotch, User, CaretDown, CaretRight, ArrowsClockwise, Plus, Trash, ArrowCounterClockwise, X } from '@phosphor-icons/react';
import { Model, AppUser, ProfileForStats, Profile } from '../../shared/types';

// Flag PNG imports
import flagUS from '../assets/flags/US.png';
import flagGB from '../assets/flags/GB.png';
import flagDE from '../assets/flags/DE.png';
import flagFR from '../assets/flags/FR.png';
import flagES from '../assets/flags/ES.png';
import flagBE from '../assets/flags/BE.png';
import flagPT from '../assets/flags/PT.png';
import flagPL from '../assets/flags/PL.png';
import flagRU from '../assets/flags/RU.png';
import flagUA from '../assets/flags/UA.png';
import flagCA from '../assets/flags/CA.png';
import flagAU from '../assets/flags/AU.png';
import flagJP from '../assets/flags/JP.png';
import flagKR from '../assets/flags/KR.png';
import flagCN from '../assets/flags/CN.png';
import flagIN from '../assets/flags/IN.png';
import flagBR from '../assets/flags/BR.png';
import flagMX from '../assets/flags/MX.png';
import flagAR from '../assets/flags/AR.png';
import flagCL from '../assets/flags/CL.png';
import flagCO from '../assets/flags/CO.png';
import flagSE from '../assets/flags/SE.png';
import flagNO from '../assets/flags/NO.png';
import flagDK from '../assets/flags/DK.png';
import flagFI from '../assets/flags/FI.png';
import flagAT from '../assets/flags/AT.png';
import flagSG from '../assets/flags/SG.png';
import flagHK from '../assets/flags/HK.png';
import flagTW from '../assets/flags/TW.png';
import flagTH from '../assets/flags/TH.png';
import flagVN from '../assets/flags/VN.png';
import flagID from '../assets/flags/ID.png';
import flagMY from '../assets/flags/MY.png';
import flagPH from '../assets/flags/PH.png';
import flagTR from '../assets/flags/TR.png';
import flagAE from '../assets/flags/AE.png';
import flagIL from '../assets/flags/IL.png';
import flagZA from '../assets/flags/ZA.png';
import flagEG from '../assets/flags/EG.png';

// PNG flag images
const countryFlagImages: Record<string, string> = {
  'US': flagUS, 'GB': flagGB, 'DE': flagDE, 'FR': flagFR, 'ES': flagES,
  'BE': flagBE, 'PT': flagPT, 'PL': flagPL, 'RU': flagRU, 'UA': flagUA,
  'CA': flagCA, 'AU': flagAU, 'JP': flagJP, 'KR': flagKR, 'CN': flagCN,
  'IN': flagIN, 'BR': flagBR, 'MX': flagMX, 'AR': flagAR, 'CL': flagCL,
  'CO': flagCO, 'SE': flagSE, 'NO': flagNO, 'DK': flagDK, 'FI': flagFI,
  'AT': flagAT, 'SG': flagSG, 'HK': flagHK, 'TW': flagTW, 'TH': flagTH,
  'VN': flagVN, 'ID': flagID, 'MY': flagMY, 'PH': flagPH, 'TR': flagTR,
  'AE': flagAE, 'IL': flagIL, 'ZA': flagZA, 'EG': flagEG,
};

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

const getTodayDate = () => new Date().toISOString().split('T')[0];

interface StatsPageProps {
  models: Model[];
  onCreateBrowser: () => void;
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
  postsToday: number;
  commentsToday: number;
}

interface UserStats {
  user: AppUser;
  modelStats: ModelStats[];
  totalProfiles: number;
  totalPostsToday: number;
  totalCommentsToday: number;
  totalKarma: number;
}

export default function StatsPage({ models, onCreateBrowser }: StatsPageProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [profiles, setProfiles] = useState<ProfileForStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [lastRefreshLabel, setLastRefreshLabel] = useState<string>('');
  const [showTrash, setShowTrash] = useState(false);
  const [deletedProfiles, setDeletedProfiles] = useState<Profile[]>([]);

  // Helper to format relative time
  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 30) return 'now';
    if (diffSec < 60) return '30s ago';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return `${diffDay}d ago`;
  };

  // Update relative time label periodically
  useEffect(() => {
    if (!lastRefreshTime) return;

    const updateLabel = () => setLastRefreshLabel(getRelativeTime(lastRefreshTime));
    updateLabel();

    const interval = setInterval(updateLabel, 10000);
    return () => clearInterval(interval);
  }, [lastRefreshTime]);

  const toggleModelExpand = (modelKey: string) => {
    setExpandedModels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(modelKey)) {
        newSet.delete(modelKey);
      } else {
        newSet.add(modelKey);
      }
      return newSet;
    });
  };

  const getProfilesForModel = (userId: string, modelId: string | null) => {
    const filtered = profiles.filter(p => p.userId === userId && (modelId ? p.modelId === modelId : !p.modelId));
    // Sort: working first, then error, then banned at bottom
    return filtered.sort((a, b) => {
      const order = { working: 0, error: 1, banned: 2, unknown: 1 };
      const aOrder = order[a.status as keyof typeof order] ?? 1;
      const bOrder = order[b.status as keyof typeof order] ?? 1;
      return aOrder - bOrder;
    });
  };

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
      setLastRefreshTime(new Date());
    } catch (err) {
      console.error('Failed to load stats data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [usersData, profilesData] = await Promise.all([
        window.electronAPI?.adminListUsers(),
        window.electronAPI?.adminGetAllProfilesForStats(),
      ]);
      setUsers(usersData || []);
      setProfiles(profilesData || []);
      setLastRefreshTime(new Date());
    } catch (err) {
      console.error('Failed to refresh stats data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const loadDeletedProfiles = async () => {
    try {
      const deleted = await window.electronAPI?.listDeletedProfiles();
      setDeletedProfiles(deleted || []);
    } catch (err) {
      console.error('Failed to load deleted profiles:', err);
    }
  };

  const handleOpenTrash = async () => {
    await loadDeletedProfiles();
    setShowTrash(true);
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('Move this account to trash?')) return;
    try {
      await window.electronAPI?.deleteProfile(profileId);
      await handleRefresh();
    } catch (err) {
      console.error('Failed to delete profile:', err);
    }
  };

  const handleRestoreProfile = async (profileId: string) => {
    try {
      await window.electronAPI?.restoreProfile(profileId);
      await loadDeletedProfiles();
      await handleRefresh();
    } catch (err) {
      console.error('Failed to restore profile:', err);
    }
  };

  const handlePermanentDelete = async (profileId: string) => {
    if (!confirm('Permanently delete this account? This cannot be undone.')) return;
    try {
      await window.electronAPI?.permanentDeleteProfile(profileId);
      await loadDeletedProfiles();
    } catch (err) {
      console.error('Failed to permanently delete profile:', err);
    }
  };

  const getDaysRemaining = (deletedAt: string): number => {
    const deleted = new Date(deletedAt);
    const expiry = new Date(deleted);
    expiry.setDate(expiry.getDate() + 30);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };

  const handleToggleEnabled = async (profileId: string, currentlyEnabled: boolean) => {
    try {
      await window.electronAPI?.updateProfile(profileId, { isEnabled: !currentlyEnabled });
      await handleRefresh();
    } catch (err) {
      console.error('Failed to toggle enabled status:', err);
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
      let totalPostsToday = 0;
      let totalCommentsToday = 0;
      let totalKarma = 0;

      modelGroups.forEach((groupProfiles, modelId) => {
        const model = models.find(m => m.id === modelId);
        const postsToday = groupProfiles.reduce((sum, p) => sum + (p.postsToday || 0), 0);
        const commentsToday = groupProfiles.reduce((sum, p) => sum + (p.commentsToday || 0), 0);
        const karma = groupProfiles.reduce((sum, p) => sum + (p.commentKarma || 0) + (p.postKarma || 0), 0);

        totalPostsToday += postsToday;
        totalCommentsToday += commentsToday;
        totalKarma += karma;

        modelStats.push({
          modelId,
          modelName: model?.name || 'No Model',
          total: groupProfiles.length,
          working: groupProfiles.filter(p => p.status === 'working').length,
          banned: groupProfiles.filter(p => p.status === 'banned').length,
          error: groupProfiles.filter(p => p.status === 'error').length,
          enabled: groupProfiles.filter(p => p.isEnabled === true).length,
          disabled: groupProfiles.filter(p => p.isEnabled !== true).length,
          totalKarma: karma,
          postsToday,
          commentsToday,
        });
      });

      // Sort by model name
      modelStats.sort((a, b) => a.modelName.localeCompare(b.modelName));

      return {
        user,
        modelStats,
        totalProfiles: userProfiles.length,
        totalPostsToday,
        totalCommentsToday,
        totalKarma,
      };
    });

    // Sort by total profiles desc
    stats.sort((a, b) => b.totalProfiles - a.totalProfiles);
    setUserStats(stats);

    // Expand all models by default
    const allModelKeys = new Set<string>();
    stats.forEach(({ user, modelStats }) => {
      modelStats.forEach(stat => {
        allModelKeys.add(`${user.id}-${stat.modelId || 'no-model'}`);
      });
    });
    setExpandedModels(allModelKeys);
  };

  // Calculate global stats
  const globalStats = {
    totalBrowsers: profiles.length,
    totalFarmedToday: profiles.filter(p => p.lastCompletedDate === getTodayDate()).length,
    totalKarma: profiles.reduce((sum, p) => sum + (p.commentKarma || 0) + (p.postKarma || 0), 0),
    totalWorking: profiles.filter(p => p.status === 'working').length,
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
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenTrash}
            className="h-9 px-3 flex items-center gap-2 transition-colors"
            style={{
              background: 'var(--chip-bg)',
              borderRadius: '100px',
              color: 'var(--text-primary)',
            }}
            title="View trash"
          >
            <Trash size={16} weight="bold" />
            {deletedProfiles.length > 0 && (
              <span className="text-sm font-medium">{deletedProfiles.length}</span>
            )}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-9 px-3 flex items-center gap-2 transition-colors"
            style={{
              background: 'var(--chip-bg)',
              borderRadius: '100px',
              color: 'var(--text-primary)',
              opacity: refreshing ? 0.5 : 1,
            }}
            title="Refresh stats"
          >
            <ArrowsClockwise
              size={16}
              weight="bold"
              style={{
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
              }}
            />
            {lastRefreshLabel && (
              <span className="text-sm font-medium">{lastRefreshLabel}</span>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {userStats.length === 0 ? (
          <div className="p-12 text-center" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
            <User size={32} weight="light" color="var(--text-tertiary)" className="mx-auto mb-3" />
            <p style={{ color: 'var(--text-tertiary)' }}>No data yet</p>
          </div>
        ) : (
          userStats.map(({ user, modelStats, totalProfiles }) => (
            <div key={user.id} style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
              {/* User Header */}
              <div className="flex items-center gap-3 p-4">
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
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: user.role === 'admin'
                          ? 'rgba(147, 112, 219, 0.2)'
                          : 'var(--chip-bg)',
                        color: user.role === 'admin' ? '#A78BFA' : 'var(--text-secondary)'
                      }}
                    >
                      {user.role}
                    </span>
                  </div>
                  <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    {totalProfiles} browser{totalProfiles !== 1 ? 's' : ''} across {modelStats.length} model{modelStats.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Add Browser Button */}
                <button
                  onClick={onCreateBrowser}
                  className="h-9 px-3 flex items-center gap-2 transition-colors"
                  style={{
                    background: 'var(--chip-bg)',
                    borderRadius: '100px',
                    color: 'var(--text-primary)',
                  }}
                  title="New Browser"
                >
                  <Plus size={16} weight="bold" />
                </button>
              </div>

              {/* Model Stats Table */}
              {modelStats.length > 0 && (
                <div className="px-4 pb-4">
                  <div style={{ background: 'rgba(128, 128, 128, 0.06)', borderRadius: '20px', overflow: 'hidden' }}>
                      {/* Table Header */}
                      <div
                        className="grid text-xs font-medium py-4 px-5"
                        style={{
                          gridTemplateColumns: '1fr repeat(6, 90px) 50px',
                          color: 'var(--text-tertiary)',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <div>Model</div>
                        <div className="text-center">Browsers</div>
                        <div className="text-center">Posts Today</div>
                        <div className="text-center">Comments Today</div>
                        <div className="text-center">Total Karma</div>
                        <div className="text-center">Status</div>
                        <div className="text-center">Renew</div>
                        <div></div>
                      </div>

                      {/* Table Rows */}
                      {modelStats.map((stat, index) => {
                        const modelKey = `${user.id}-${stat.modelId || 'no-model'}`;
                        const isExpanded = expandedModels.has(modelKey);
                        const modelProfiles = getProfilesForModel(user.id, stat.modelId);

                        return (
                          <div key={stat.modelId || 'no-model'}>
                            <div
                              className="grid py-4 px-5 items-center cursor-pointer hover:bg-white/5 transition-colors"
                              style={{
                                gridTemplateColumns: '1fr repeat(6, 90px) 50px',
                                borderBottom: !isExpanded && index < modelStats.length - 1 ? '1px solid var(--border)' : 'none',
                              }}
                              onClick={() => toggleModelExpand(modelKey)}
                            >
                              {/* Model Name */}
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <CaretDown size={14} weight="bold" style={{ color: 'var(--text-tertiary)' }} />
                                ) : (
                                  <CaretRight size={14} weight="bold" style={{ color: 'var(--text-tertiary)' }} />
                                )}
                                <FolderSimple size={16} weight="bold" style={{ color: 'var(--text-tertiary)' }} />
                                <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                  {stat.modelName}
                                </span>
                              </div>

                              {/* Browsers */}
                              <div className="text-center text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                {stat.total}
                              </div>

                              {/* Posts Today */}
                              <div className="text-center text-sm font-medium" style={{ color: stat.postsToday > 0 ? 'var(--accent-green)' : 'var(--text-tertiary)' }}>
                                {stat.postsToday}
                              </div>

                              {/* Comments Today */}
                              <div className="text-center text-sm font-medium" style={{ color: stat.commentsToday > 0 ? 'var(--accent-green)' : 'var(--text-tertiary)' }}>
                                {stat.commentsToday}
                              </div>

                              {/* Total Karma */}
                              <div className="text-center text-sm font-medium" style={{ color: stat.totalKarma > 0 ? 'var(--accent-blue)' : 'var(--text-tertiary)' }}>
                                {stat.totalKarma > 0 ? stat.totalKarma.toLocaleString() : '-'}
                              </div>

                              {/* Status */}
                              <div className="text-center text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
                                {stat.working}/{stat.total}
                              </div>

                              {/* Renew */}
                              <div className="text-center text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
                                {stat.enabled}/{stat.total}
                              </div>

                              {/* Empty for action column */}
                              <div></div>
                            </div>

                            {/* Expanded Profiles List */}
                            {isExpanded && (
                              <div
                                style={{
                                  borderBottom: index < modelStats.length - 1 ? '1px solid var(--border)' : 'none',
                                }}
                              >
                                {modelProfiles.map((profile, pIndex) => {
                                  const karma = (profile.commentKarma || 0) + (profile.postKarma || 0);

                                  return (
                                    <div
                                      key={profile.id}
                                      className="grid py-3 px-5 pl-12 items-center"
                                      style={{
                                        gridTemplateColumns: '1fr repeat(6, 90px) 50px',
                                        borderBottom: pIndex < modelProfiles.length - 1 ? '1px solid rgba(128, 128, 128, 0.1)' : 'none',
                                      }}
                                    >
                                      {/* Profile Name with Flag */}
                                      <div className="flex items-center gap-2">
                                        {profile.country && countryFlagImages[profile.country] && (
                                          <img
                                            src={countryFlagImages[profile.country]}
                                            alt={profile.country}
                                            className="w-4 h-4 object-contain rounded-sm"
                                          />
                                        )}
                                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                          {profile.name}
                                        </span>
                                      </div>

                                      {/* Empty for Browsers column */}
                                      <div></div>

                                      {/* Posts Today */}
                                      <div className="text-center text-sm" style={{ color: (profile.postsToday || 0) > 0 ? 'var(--accent-green)' : 'var(--text-tertiary)' }}>
                                        {profile.postsToday || 0}
                                      </div>

                                      {/* Comments Today */}
                                      <div className="text-center text-sm" style={{ color: (profile.commentsToday || 0) > 0 ? 'var(--accent-green)' : 'var(--text-tertiary)' }}>
                                        {profile.commentsToday || 0}
                                      </div>

                                      {/* Total Karma */}
                                      <div className="text-center text-sm" style={{ color: karma > 0 ? 'var(--accent-blue)' : 'var(--text-tertiary)' }}>
                                        {karma > 0 ? karma.toLocaleString() : '-'}
                                      </div>

                                      {/* Status Badge */}
                                      <div className="flex justify-center">
                                        {profile.status === 'working' && (
                                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(76, 175, 80, 0.15)', color: '#4CAF50' }}>
                                            Working
                                          </span>
                                        )}
                                        {profile.status === 'banned' && (
                                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(244, 67, 54, 0.15)', color: '#F44336' }}>
                                            Banned
                                          </span>
                                        )}
                                        {profile.status === 'error' && (
                                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255, 152, 0, 0.15)', color: '#FF9800' }}>
                                            Error
                                          </span>
                                        )}
                                        {(!profile.status || profile.status === 'unknown') && (
                                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--chip-bg)', color: 'var(--text-tertiary)' }}>
                                            Unknown
                                          </span>
                                        )}
                                      </div>

                                      {/* Renew */}
                                      <div className="flex justify-center">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleEnabled(profile.id, profile.isEnabled === true);
                                          }}
                                          className="text-xs px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                                          style={{
                                            background: profile.isEnabled === true ? 'rgba(59, 130, 246, 0.15)' : 'rgba(128, 128, 128, 0.15)',
                                            color: profile.isEnabled === true ? '#3B82F6' : 'var(--text-tertiary)'
                                          }}
                                        >
                                          {profile.isEnabled === true ? 'On' : 'Off'}
                                        </button>
                                      </div>

                                      {/* Delete Button */}
                                      <div className="flex justify-center">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteProfile(profile.id);
                                          }}
                                          className="p-1 rounded hover:bg-white/10 transition-colors"
                                          style={{ color: 'var(--text-tertiary)' }}
                                          title="Delete"
                                        >
                                          <Trash size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Totals Row */}
                      {modelStats.length > 1 && (
                        <div
                          className="grid py-4 px-5 items-center"
                          style={{
                            gridTemplateColumns: '1fr repeat(6, 90px) 50px',
                            background: 'rgba(128, 128, 128, 0.04)',
                            borderTop: '1px solid var(--border)',
                          }}
                        >
                          <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                            Total
                          </div>
                          <div className="text-center text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            {modelStats.reduce((sum, m) => sum + m.total, 0)}
                          </div>
                          <div className="text-center text-sm font-bold" style={{ color: 'var(--accent-green)' }}>
                            {modelStats.reduce((sum, m) => sum + m.postsToday, 0)}
                          </div>
                          <div className="text-center text-sm font-bold" style={{ color: 'var(--accent-green)' }}>
                            {modelStats.reduce((sum, m) => sum + m.commentsToday, 0)}
                          </div>
                          <div className="text-center text-sm font-bold" style={{ color: 'var(--accent-blue)' }}>
                            {modelStats.reduce((sum, m) => sum + m.totalKarma, 0).toLocaleString()}
                          </div>
                          <div className="text-center text-sm font-bold" style={{ color: 'var(--text-tertiary)' }}>
                            {modelStats.reduce((sum, m) => sum + m.working, 0)}/{modelStats.reduce((sum, m) => sum + m.total, 0)}
                          </div>
                          <div className="text-center text-sm font-bold" style={{ color: 'var(--text-tertiary)' }}>
                            {modelStats.reduce((sum, m) => sum + m.enabled, 0)}/{modelStats.reduce((sum, m) => sum + m.total, 0)}
                          </div>
                          <div></div>
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Trash Modal */}
      {showTrash && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-2xl max-h-[80vh] flex flex-col" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <Trash size={24} weight="bold" style={{ color: 'var(--text-primary)' }} />
                <div>
                  <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Trash</h2>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    Items are permanently deleted after 30 days
                  </p>
                </div>
              </div>
              <button onClick={() => setShowTrash(false)} style={{ color: 'var(--text-tertiary)' }}>
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {deletedProfiles.length === 0 ? (
                <div className="text-center py-12">
                  <Trash size={48} weight="light" style={{ color: 'var(--text-tertiary)' }} className="mx-auto mb-3" />
                  <p style={{ color: 'var(--text-tertiary)' }}>Trash is empty</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {deletedProfiles.map(profile => {
                    const daysLeft = getDaysRemaining(profile.deletedAt || '');
                    return (
                      <div
                        key={profile.id}
                        className="flex items-center gap-3 p-4"
                        style={{ background: 'var(--bg-tertiary)', borderRadius: '16px' }}
                      >
                        {profile.country && countryFlagImages[profile.country] && (
                          <img
                            src={countryFlagImages[profile.country]}
                            alt={profile.country}
                            className="w-5 h-5 object-contain rounded-sm"
                          />
                        )}
                        <div className="flex-1">
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {profile.name}
                          </span>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {daysLeft} days remaining
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRestoreProfile(profile.id)}
                            className="h-8 px-3 flex items-center gap-1 text-sm font-medium rounded-full transition-colors"
                            style={{ background: 'rgba(76, 175, 80, 0.15)', color: '#4CAF50' }}
                            title="Restore"
                          >
                            <ArrowCounterClockwise size={14} weight="bold" />
                            Restore
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(profile.id)}
                            className="h-8 px-3 flex items-center gap-1 text-sm font-medium rounded-full transition-colors"
                            style={{ background: 'rgba(244, 67, 54, 0.15)', color: '#F44336' }}
                            title="Delete permanently"
                          >
                            <Trash size={14} weight="bold" />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
