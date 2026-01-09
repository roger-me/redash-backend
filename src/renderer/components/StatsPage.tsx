import { useState, useEffect } from 'react';
import { FolderSimple, CheckCircle, CircleNotch, User, CaretDown, CaretRight } from '@phosphor-icons/react';
import { Model, AppUser, ProfileForStats } from '../../shared/types';

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
  farmedToday: number;
}

interface UserStats {
  user: AppUser;
  modelStats: ModelStats[];
  totalProfiles: number;
  totalFarmedToday: number;
  totalKarma: number;
}

export default function StatsPage({ models }: StatsPageProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [profiles, setProfiles] = useState<ProfileForStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());

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
    return profiles.filter(p => p.userId === userId && (modelId ? p.modelId === modelId : !p.modelId));
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
    } catch (err) {
      console.error('Failed to load stats data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const today = getTodayDate();

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
      let totalFarmedToday = 0;
      let totalKarma = 0;

      modelGroups.forEach((groupProfiles, modelId) => {
        const model = models.find(m => m.id === modelId);
        const farmedToday = groupProfiles.filter(p => p.lastCompletedDate === today).length;
        const karma = groupProfiles.reduce((sum, p) => sum + (p.commentKarma || 0) + (p.postKarma || 0), 0);

        totalFarmedToday += farmedToday;
        totalKarma += karma;

        modelStats.push({
          modelId,
          modelName: model?.name || 'No Model',
          total: groupProfiles.length,
          working: groupProfiles.filter(p => p.status === 'working').length,
          banned: groupProfiles.filter(p => p.status === 'banned').length,
          error: groupProfiles.filter(p => p.status === 'error').length,
          enabled: groupProfiles.filter(p => p.isEnabled !== false).length,
          disabled: groupProfiles.filter(p => p.isEnabled === false).length,
          totalKarma: karma,
          farmedToday,
        });
      });

      // Sort by model name
      modelStats.sort((a, b) => a.modelName.localeCompare(b.modelName));

      return {
        user,
        modelStats,
        totalProfiles: userProfiles.length,
        totalFarmedToday,
        totalKarma,
      };
    });

    // Sort by total profiles desc
    stats.sort((a, b) => b.totalProfiles - a.totalProfiles);
    setUserStats(stats);
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
        <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          {profiles.length} total browsers
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
            <div key={user.id} className="overflow-hidden" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
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
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--chip-bg)', color: 'var(--text-secondary)' }}>
                      {user.role}
                    </span>
                  </div>
                  <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    {totalProfiles} browser{totalProfiles !== 1 ? 's' : ''} across {modelStats.length} model{modelStats.length !== 1 ? 's' : ''}
                  </span>
                </div>

              </div>

              {/* Model Stats Table */}
              {modelStats.length > 0 && (
                <div className="px-4 pb-4">
                  <div style={{ background: 'rgba(128, 128, 128, 0.06)', borderRadius: '20px', overflow: 'hidden' }}>
                      {/* Table Header */}
                      <div
                        className="grid text-xs font-medium py-4 px-5"
                        style={{
                          gridTemplateColumns: '1fr repeat(6, 90px)',
                          color: 'var(--text-tertiary)',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <div>Model</div>
                        <div className="text-center">Browsers</div>
                        <div className="text-center">Farmed Today</div>
                        <div className="text-center">Karma Today</div>
                        <div className="text-center">Total Karma</div>
                        <div className="text-center">Working</div>
                        <div className="text-center">Status</div>
                      </div>

                      {/* Table Rows */}
                      {modelStats.map((stat, index) => {
                        const modelKey = `${user.id}-${stat.modelId || 'no-model'}`;
                        const isExpanded = expandedModels.has(modelKey);
                        const modelProfiles = getProfilesForModel(user.id, stat.modelId);
                        const today = getTodayDate();

                        return (
                          <div key={stat.modelId || 'no-model'}>
                            <div
                              className="grid py-4 px-5 items-center cursor-pointer hover:bg-white/5 transition-colors"
                              style={{
                                gridTemplateColumns: '1fr repeat(6, 90px)',
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

                              {/* Farmed Today */}
                              <div className="text-center text-sm font-medium" style={{ color: stat.farmedToday > 0 ? 'var(--accent-green)' : 'var(--text-tertiary)' }}>
                                {stat.farmedToday}
                              </div>

                              {/* Karma Today - placeholder, needs DB tracking */}
                              <div className="text-center text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
                                -
                              </div>

                              {/* Total Karma */}
                              <div className="text-center text-sm font-medium" style={{ color: stat.totalKarma > 0 ? 'var(--accent-blue)' : 'var(--text-tertiary)' }}>
                                {stat.totalKarma > 0 ? stat.totalKarma.toLocaleString() : '-'}
                              </div>

                              {/* Working */}
                              <div className="text-center text-sm font-medium" style={{ color: stat.working > 0 ? 'var(--accent-green)' : 'var(--text-tertiary)' }}>
                                {stat.working}/{stat.enabled}
                              </div>

                              {/* Status */}
                              <div className="flex justify-center gap-1">
                                {stat.banned > 0 && (
                                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(244, 67, 54, 0.15)', color: '#F44336' }}>
                                    {stat.banned}
                                  </span>
                                )}
                                {stat.error > 0 && (
                                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255, 152, 0, 0.15)', color: '#FF9800' }}>
                                    {stat.error}
                                  </span>
                                )}
                                {stat.banned === 0 && stat.error === 0 && (
                                  <CheckCircle size={16} weight="fill" style={{ color: 'var(--accent-green)' }} />
                                )}
                              </div>
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
                                  const farmedToday = profile.lastCompletedDate === today;

                                  return (
                                    <div
                                      key={profile.id}
                                      className="grid py-3 px-5 pl-12 items-center"
                                      style={{
                                        gridTemplateColumns: '1fr repeat(6, 90px)',
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

                                      {/* Farmed Today */}
                                      <div className="text-center text-sm" style={{ color: farmedToday ? 'var(--accent-green)' : 'var(--text-tertiary)' }}>
                                        {farmedToday ? '✓' : '-'}
                                      </div>

                                      {/* Karma Today */}
                                      <div className="text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                                        -
                                      </div>

                                      {/* Total Karma */}
                                      <div className="text-center text-sm" style={{ color: karma > 0 ? 'var(--accent-blue)' : 'var(--text-tertiary)' }}>
                                        {karma > 0 ? karma.toLocaleString() : '-'}
                                      </div>

                                      {/* Status */}
                                      <div className="text-center text-sm" style={{ color: profile.status === 'working' ? 'var(--accent-green)' : 'var(--text-tertiary)' }}>
                                        {profile.isEnabled !== false ? (profile.status === 'working' ? 'Active' : '-') : 'Disabled'}
                                      </div>

                                      {/* Status Badge */}
                                      <div className="flex justify-center">
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
                                        {profile.status === 'working' && (
                                          <CheckCircle size={14} weight="fill" style={{ color: 'var(--accent-green)' }} />
                                        )}
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
                            gridTemplateColumns: '1fr repeat(6, 90px)',
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
                            {modelStats.reduce((sum, m) => sum + m.farmedToday, 0)}
                          </div>
                          <div className="text-center text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
                            -
                          </div>
                          <div className="text-center text-sm font-bold" style={{ color: 'var(--accent-blue)' }}>
                            {modelStats.reduce((sum, m) => sum + m.totalKarma, 0).toLocaleString()}
                          </div>
                          <div className="text-center text-sm font-bold" style={{ color: 'var(--accent-green)' }}>
                            {modelStats.reduce((sum, m) => sum + m.working, 0)}/{modelStats.reduce((sum, m) => sum + m.enabled, 0)}
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
    </main>
  );
}
