import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  ChartLine,
  ChartBar,
  Warning,
  Crown,
  Skull,
  Users,
  CaretDown,
  Check,
  ArrowUp,
  CalendarBlank,
  Timer,
  FolderSimple,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { useLanguage } from '../i18n';
import { Model, Profile, RedditPost, AppUser, ProfileForStats, SubredditStats } from '../../shared/types';

interface AnalyticsPageProps {
  models: Model[];
  profiles: Profile[];
  user: AppUser | null;
}

type TimePeriod = '7d' | '30d' | '90d' | 'all';
type ChartMetric = 'posts' | 'karma' | 'upvotes' | 'comments';

// Pastel colors with distinct hues (same as PostsPage)
const avatarColors = [
  '#FFB347', // Pastel orange
  '#87CEEB', // Sky blue
  '#DDA0DD', // Plum
  '#98D8AA', // Pastel green
  '#F0E68C', // Khaki/yellow
  '#B19CD9', // Light purple
  '#FFB6C1', // Light pink
  '#20B2AA', // Light sea green
  '#F4A460', // Sandy brown
  '#87CEFA', // Light sky blue
];

function AnalyticsPage({ models, profiles, user }: AnalyticsPageProps) {
  const { t } = useLanguage();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('posts');
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [allProfiles, setAllProfiles] = useState<ProfileForStats[]>([]);
  const [subredditStats, setSubredditStats] = useState<SubredditStats[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [lastRefreshLabel, setLastRefreshLabel] = useState<string>('');

  // Helper to format relative time
  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 30) return t('time.now');
    if (diffSec < 60) return t('time.secondsAgo', { seconds: 30 });
    if (diffMin < 60) return t('time.minutesAgo', { minutes: diffMin });
    if (diffHour < 24) return t('time.hoursAgo', { hours: diffHour });
    return t('time.daysAgo', { days: diffDay });
  };

  // Update relative time label periodically
  useEffect(() => {
    if (!lastRefreshTime) return;

    const updateLabel = () => setLastRefreshLabel(getRelativeTime(lastRefreshTime));
    updateLabel();

    const interval = setInterval(updateLabel, 10000);
    return () => clearInterval(interval);
  }, [lastRefreshTime]);

  // Load data function
  const loadData = async (syncFromReddit = false) => {
    setIsLoading(true);
    try {
      // If syncing from Reddit, first fetch posts for all profiles
      if (syncFromReddit) {
        const profilesData = await window.electronAPI?.adminGetAllProfilesForStats();
        if (profilesData && profilesData.length > 0) {
          // Sync posts for each profile (with small delay to avoid rate limiting)
          for (const profile of profilesData) {
            if (profile.name && profile.status !== 'banned') {
              await window.electronAPI?.syncRedditPosts(profile.id, profile.name);
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
        }
      }

      // Now load all data from database
      const [profilesData, postsData, statsData, usersData] = await Promise.all([
        window.electronAPI?.adminGetAllProfilesForStats(),
        window.electronAPI?.listRedditPosts(undefined),
        window.electronAPI?.getSubredditStats(),
        user?.role === 'dev' ? window.electronAPI?.adminListUsers() : Promise.resolve([]),
      ]);
      setAllProfiles(profilesData || []);
      setPosts(postsData || []);
      setSubredditStats(statsData || []);
      setUsers(usersData || []);
      if (usersData && usersData.length > 0) {
        setSelectedUserIds(usersData.map((u: AppUser) => u.id));
      }
    } catch (err) {
      console.error('Failed to load analytics data:', err);
    } finally {
      setIsLoading(false);
      setLastRefreshTime(new Date());
    }
  };

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [user]);

  // Calculate date range based on time period
  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date();
    switch (timePeriod) {
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      case '90d':
        start.setDate(now.getDate() - 90);
        break;
      case 'all':
        start.setFullYear(2020);
        break;
    }
    return { start, end: now };
  }, [timePeriod]);

  // Filter posts by time period, models, and users
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const postDate = new Date(post.createdUtc);
      if (postDate < dateRange.start || postDate > dateRange.end) return false;

      // Filter by model
      if (selectedModelIds.length > 0) {
        const profile = allProfiles.find(p => p.id === post.profileId);
        if (!profile?.modelId || !selectedModelIds.includes(profile.modelId)) return false;
      }

      // Filter by user (dev only)
      if (user?.role === 'dev' && selectedUserIds.length > 0 && selectedUserIds.length < users.length) {
        const profile = allProfiles.find(p => p.id === post.profileId);
        if (!profile?.userId || !selectedUserIds.includes(profile.userId)) return false;
      }

      return true;
    });
  }, [posts, dateRange, selectedModelIds, selectedUserIds, allProfiles, user, users]);

  // Filter profiles by models and users
  const filteredProfiles = useMemo(() => {
    return allProfiles.filter(profile => {
      if (selectedModelIds.length > 0 && (!profile.modelId || !selectedModelIds.includes(profile.modelId))) {
        return false;
      }
      if (user?.role === 'dev' && selectedUserIds.length > 0 && selectedUserIds.length < users.length) {
        if (!profile.userId || !selectedUserIds.includes(profile.userId)) return false;
      }
      return true;
    });
  }, [allProfiles, selectedModelIds, selectedUserIds, user, users]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const totalPosts = filteredPosts.length;
    const totalKarma = filteredPosts.reduce((sum, post) => sum + post.score, 0);
    const activeCount = filteredProfiles.filter(p => p.status === 'working').length;
    const bannedCount = filteredProfiles.filter(p => p.status === 'banned').length;

    // Calculate previous period for comparison
    const periodMs = dateRange.end.getTime() - dateRange.start.getTime();
    const prevStart = new Date(dateRange.start.getTime() - periodMs);
    const prevEnd = dateRange.start;

    const prevPosts = posts.filter(post => {
      const postDate = new Date(post.createdUtc);
      return postDate >= prevStart && postDate < prevEnd;
    });

    const prevTotalPosts = prevPosts.length;
    const prevTotalKarma = prevPosts.reduce((sum, post) => sum + post.score, 0);

    const postsChange = prevTotalPosts > 0 ? ((totalPosts - prevTotalPosts) / prevTotalPosts * 100).toFixed(0) : 0;
    const karmaChange = prevTotalKarma > 0 ? ((totalKarma - prevTotalKarma) / prevTotalKarma * 100).toFixed(0) : 0;

    return {
      totalPosts,
      totalKarma,
      activeCount,
      bannedCount,
      postsChange: Number(postsChange),
      karmaChange: Number(karmaChange),
    };
  }, [filteredPosts, filteredProfiles, dateRange, posts]);

  // Create color map for users - each user gets a unique color based on their order
  const userColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((u, index) => {
      map[u.id] = avatarColors[index % avatarColors.length];
      map[u.username] = avatarColors[index % avatarColors.length];
    });
    return map;
  }, [users]);

  // Get user color helper
  const getUserColor = (userIdOrName: string | undefined): string => {
    if (!userIdOrName) return '#808080';
    return userColorMap[userIdOrName] || avatarColors[0];
  };

  // Post performance chart data (grouped by day/week, with per-user breakdown)
  const postPerformanceData = useMemo(() => {
    const groupByDay = timePeriod === '7d' || timePeriod === '30d';
    const data: Record<string, Record<string, number> & { date: string; dateSort: number }> = {};

    // Get selected users for the chart
    const activeUsers = users.filter(u => selectedUserIds.includes(u.id));

    filteredPosts.forEach(post => {
      const postDate = new Date(post.createdUtc);
      let key: string;
      let sortKey: number;
      if (groupByDay) {
        key = postDate.toLocaleDateString('en', { month: 'short', day: 'numeric' });
        sortKey = postDate.getTime();
      } else {
        // Group by week
        const weekStart = new Date(postDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        key = weekStart.toLocaleDateString('en', { month: 'short', day: 'numeric' });
        sortKey = weekStart.getTime();
      }

      if (!data[key]) {
        data[key] = { date: key, dateSort: sortKey };
        // Initialize all user columns
        activeUsers.forEach(u => {
          data[key][u.username] = 0;
        });
      }

      // Find which user this post belongs to
      const profile = allProfiles.find(p => p.id === post.profileId);
      if (profile?.userId) {
        const postUser = users.find(u => u.id === profile.userId);
        if (postUser && selectedUserIds.includes(postUser.id)) {
          // Add value based on selected metric
          let valueToAdd = 0;
          if (chartMetric === 'posts') {
            valueToAdd = 1;
          } else if (chartMetric === 'karma') {
            valueToAdd = post.score;
          } else if (chartMetric === 'upvotes') {
            // Calculate upvotes from score and upvote_ratio
            // Formula: upvotes = ratio * score / (2 * ratio - 1)
            const ratio = post.upvoteRatio || 0.5;
            if (ratio > 0.5 && post.score > 0) {
              valueToAdd = Math.round(ratio * post.score / (2 * ratio - 1));
            } else {
              valueToAdd = Math.max(0, post.score); // Fallback to score if ratio unavailable
            }
          } else {
            valueToAdd = post.numComments;
          }
          data[key][postUser.username] = (data[key][postUser.username] || 0) + valueToAdd;
        }
      }
    });

    return Object.values(data).sort((a, b) => a.dateSort - b.dateSort);
  }, [filteredPosts, timePeriod, users, selectedUserIds, allProfiles, chartMetric]);

  // Get active user names for chart lines
  const activeUsernames = useMemo(() => {
    return users.filter(u => selectedUserIds.includes(u.id)).map(u => u.username);
  }, [users, selectedUserIds]);

  // Best and worst posts
  const bestPosts = useMemo(() => {
    return [...filteredPosts].sort((a, b) => b.score - a.score).slice(0, 5);
  }, [filteredPosts]);

  const worstPosts = useMemo(() => {
    return [...filteredPosts].sort((a, b) => a.score - b.score).slice(0, 5);
  }, [filteredPosts]);

  // Subreddit analytics
  const subredditData = useMemo(() => {
    const subredditMap: Record<string, { subreddit: string; posts: number; avgScore: number; totalScore: number; users: Set<string> }> = {};

    filteredPosts.forEach(post => {
      if (!subredditMap[post.subreddit]) {
        subredditMap[post.subreddit] = { subreddit: post.subreddit, posts: 0, avgScore: 0, totalScore: 0, users: new Set() };
      }
      subredditMap[post.subreddit].posts++;
      subredditMap[post.subreddit].totalScore += post.score;

      const profile = allProfiles.find(p => p.id === post.profileId);
      if (profile?.userId) {
        subredditMap[post.subreddit].users.add(profile.userId);
      }
    });

    return Object.values(subredditMap).map(s => ({
      ...s,
      avgScore: Math.round(s.totalScore / s.posts),
      userCount: s.users.size,
      userIds: Array.from(s.users),
    })).sort((a, b) => b.posts - a.posts);
  }, [filteredPosts, allProfiles]);

  // Subreddit overlap warnings (subreddits used by multiple users)
  const overlapWarnings = useMemo(() => {
    return subredditData.filter(s => s.userCount > 1).map(s => ({
      subreddit: s.subreddit,
      users: s.userIds.map(id => users.find(u => u.id === id)?.username || 'Unknown'),
    }));
  }, [subredditData, users]);

  // Account health data
  const statusBreakdown = useMemo(() => {
    const working = filteredProfiles.filter(p => p.status === 'working').length;
    const banned = filteredProfiles.filter(p => p.status === 'banned').length;
    const error = filteredProfiles.filter(p => p.status === 'error').length;
    const unknown = filteredProfiles.filter(p => !p.status || p.status === 'unknown').length;

    return [
      { name: t('profile.working'), value: working, color: 'var(--accent-green)' },
      { name: t('profile.banned'), value: banned, color: 'var(--accent-red)' },
      { name: t('profile.error'), value: error, color: 'var(--accent-orange)' },
      { name: t('admin.unknown'), value: unknown, color: 'var(--text-tertiary)' },
    ].filter(item => item.value > 0);
  }, [filteredProfiles, t]);

  // Karma leaders
  const karmaLeaders = useMemo(() => {
    return [...filteredProfiles]
      .map(p => ({ name: p.name, karma: (p.commentKarma || 0) + (p.postKarma || 0) }))
      .sort((a, b) => b.karma - a.karma)
      .slice(0, 5);
  }, [filteredProfiles]);

  // Expiring soon (within 14 days)
  const expiringSoon = useMemo(() => {
    const now = new Date();
    const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    return filteredProfiles
      .filter(p => p.expiresAt && new Date(p.expiresAt) <= twoWeeks && new Date(p.expiresAt) > now)
      .map(p => {
        const daysLeft = Math.ceil((new Date(p.expiresAt!).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        return { name: p.name, daysLeft };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5);
  }, [filteredProfiles]);

  // Recent bans
  const recentBans = useMemo(() => {
    return filteredProfiles
      .filter(p => p.status === 'banned')
      .slice(0, 5)
      .map(p => ({ name: p.name, date: p.createdAt }));
  }, [filteredProfiles]);

  // User activity data
  const userActivity = useMemo(() => {
    if (user?.role !== 'dev') return [];

    const userPosts: Record<string, { username: string; posts: number; lastActive: Date | null }> = {};

    filteredPosts.forEach(post => {
      const profile = allProfiles.find(p => p.id === post.profileId);
      if (!profile?.userId) return;

      const userData = users.find(u => u.id === profile.userId);
      if (!userData) return;

      if (!userPosts[profile.userId]) {
        userPosts[profile.userId] = { username: userData.username, posts: 0, lastActive: null };
      }
      userPosts[profile.userId].posts++;

      const postDate = new Date(post.createdUtc);
      if (!userPosts[profile.userId].lastActive || postDate > userPosts[profile.userId].lastActive!) {
        userPosts[profile.userId].lastActive = postDate;
      }
    });

    return Object.values(userPosts).sort((a, b) => b.posts - a.posts);
  }, [filteredPosts, allProfiles, users, user]);

  // Toggle functions
  const toggleModelSelection = (modelId: string) => {
    setSelectedModelIds(prev =>
      prev.includes(modelId) ? prev.filter(id => id !== modelId) : [...prev, modelId]
    );
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Format helpers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const formatRelativeTime = (date: Date | null): string => {
    if (!date) return '-';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return t('time.now');
    if (diffHours < 24) return t('time.hoursAgo', { hours: diffHours });
    return t('time.daysAgo', { days: diffDays });
  };

  if (isLoading) {
    return (
      <main className="pl-4 pb-6 flex-1 pr-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse mb-2">
            <ChartLine size={48} weight="light" style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p style={{ color: 'var(--text-tertiary)' }}>{t('messages.loading')}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="pl-4 pb-6 flex-1 pr-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 mt-2 px-1">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {t('analytics.title')}
        </h1>
        <div className="ml-auto">
          <button
            onClick={() => loadData(true)}
            disabled={isLoading}
            className="h-9 px-3 flex items-center gap-2 transition-colors"
            style={{
              background: 'var(--chip-bg)',
              borderRadius: '100px',
              color: 'var(--text-primary)',
              opacity: isLoading ? 0.5 : 1,
            }}
            title={t('logs.refresh')}
          >
            <ArrowsClockwise
              size={16}
              weight="bold"
              style={{
                animation: isLoading ? 'spin 1s linear infinite' : 'none',
              }}
            />
            {lastRefreshLabel && (
              <span className="text-sm font-medium">{lastRefreshLabel}</span>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        className="p-4 rounded-2xl mb-4 flex items-center gap-3 flex-wrap"
        style={{ background: 'var(--bg-secondary)' }}
      >
        {/* Time Period Buttons */}
        <div className="flex gap-1">
          {(['7d', '30d', '90d', 'all'] as TimePeriod[]).map(period => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className="h-8 px-3 text-sm font-medium transition-colors"
              style={{
                background: timePeriod === period ? 'var(--accent-primary)' : 'var(--chip-bg)',
                color: timePeriod === period ? 'var(--accent-text)' : 'var(--text-primary)',
                borderRadius: '100px',
              }}
            >
              {period === 'all' ? t('analytics.allTime') : period}
            </button>
          ))}
        </div>

        {/* Model Filter */}
        <div className="relative">
          <button
            onClick={() => setShowModelMenu(!showModelMenu)}
            className="h-8 px-3 flex items-center gap-1.5 text-sm font-medium"
            style={{
              background: 'var(--chip-bg)',
              color: 'var(--text-primary)',
              borderRadius: '100px',
            }}
          >
            <FolderSimple size={14} weight="bold" />
            <span>
              {selectedModelIds.length === 0
                ? t('analytics.allModels')
                : selectedModelIds.length === 1
                ? models.find(m => m.id === selectedModelIds[0])?.name
                : `${selectedModelIds.length}`}
            </span>
            <CaretDown size={10} weight="bold" />
          </button>

          {showModelMenu && (
            <div
              className="absolute z-50 mt-1 py-1 min-w-[160px]"
              style={{
                background: 'var(--bg-tertiary)',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
              }}
            >
              {models.map(model => (
                <button
                  key={model.id}
                  onClick={() => toggleModelSelection(model.id)}
                  className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-white/5"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center text-xs"
                    style={{
                      background: selectedModelIds.includes(model.id) ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                      color: selectedModelIds.includes(model.id) ? 'var(--accent-text)' : 'var(--text-tertiary)',
                    }}
                  >
                    {selectedModelIds.includes(model.id) && <Check size={10} weight="bold" />}
                  </div>
                  <FolderSimple size={14} weight="bold" />
                  <span>{model.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        </div>

      {/* User Filter Chips (Dev only) */}
      {user?.role === 'dev' && users.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-4 px-1">
          {users.map(u => {
            const isSelected = selectedUserIds.includes(u.id);
            return (
              <button
                key={u.id}
                onClick={() => toggleUserSelection(u.id)}
                className="h-8 px-3 flex items-center gap-1.5 text-sm font-medium hover:opacity-80 transition-opacity"
                style={{
                  background: isSelected ? `${getUserColor(u.username)}25` : 'var(--chip-bg)',
                  color: 'var(--text-primary)',
                  borderRadius: '100px',
                }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: getUserColor(u.username) }}
                />
                <span>{u.username}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-secondary)' }}>
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
            {t('analytics.totalPosts')}
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatNumber(summaryStats.totalPosts)}
          </div>
          {summaryStats.postsChange !== 0 && (
            <div
              className="text-xs font-medium flex items-center gap-1 mt-1"
              style={{ color: summaryStats.postsChange > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
            >
              <ArrowUp size={10} weight="bold" style={{ transform: summaryStats.postsChange < 0 ? 'rotate(180deg)' : 'none' }} />
              {Math.abs(summaryStats.postsChange)}%
            </div>
          )}
        </div>

        <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-secondary)' }}>
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
            {t('analytics.totalKarma')}
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatNumber(summaryStats.totalKarma)}
          </div>
          {summaryStats.karmaChange !== 0 && (
            <div
              className="text-xs font-medium flex items-center gap-1 mt-1"
              style={{ color: summaryStats.karmaChange > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
            >
              <ArrowUp size={10} weight="bold" style={{ transform: summaryStats.karmaChange < 0 ? 'rotate(180deg)' : 'none' }} />
              {Math.abs(summaryStats.karmaChange)}%
            </div>
          )}
        </div>

        <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-secondary)' }}>
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
            {t('analytics.activeAccounts')}
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--accent-green)' }}>
            {summaryStats.activeCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-secondary)' }}>
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
            {t('analytics.bannedAccounts')}
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--accent-red)' }}>
            {summaryStats.bannedCount}
          </div>
        </div>
      </div>

      {/* Post Performance Section */}
      <div className="p-4 rounded-2xl mb-4" style={{ background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-2 mb-4">
          <ChartLine size={20} weight="bold" style={{ color: 'var(--text-primary)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('analytics.postPerformance')}
          </h2>
          <div className="ml-auto flex gap-1">
            {(['posts', 'karma', 'upvotes', 'comments'] as ChartMetric[]).map(metric => (
              <button
                key={metric}
                onClick={() => setChartMetric(metric)}
                className="h-7 px-3 text-xs font-medium transition-colors"
                style={{
                  background: chartMetric === metric ? 'var(--accent-primary)' : 'var(--chip-bg)',
                  color: chartMetric === metric ? 'var(--accent-text)' : 'var(--text-primary)',
                  borderRadius: '100px',
                }}
              >
                {t(`analytics.${metric}PerDay`)}
              </button>
            ))}
          </div>
        </div>

        {/* Line Chart - Posts per User */}
        <div className="h-64 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={postPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="date" stroke="var(--text-tertiary)" fontSize={12} />
              <YAxis stroke="var(--text-tertiary)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-tertiary)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                }}
              />
              <Legend />
              {activeUsernames.map((username) => (
                <Line
                  key={username}
                  type="monotone"
                  dataKey={username}
                  name={username}
                  stroke={getUserColor(username)}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Best & Worst Posts */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Crown size={16} weight="bold" style={{ color: 'var(--accent-green)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('analytics.bestPosts')}
              </h3>
            </div>
            <div className="space-y-2">
              {bestPosts.map(post => (
                <div
                  key={post.id}
                  className="p-2 rounded-xl flex items-center justify-between"
                  style={{ background: 'var(--bg-primary)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                      r/{post.subreddit}
                    </div>
                    <div className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {post.title}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2" style={{ color: 'var(--accent-green)' }}>
                    <ArrowUp size={12} weight="bold" />
                    <span className="text-sm font-semibold">{formatNumber(post.score)}</span>
                  </div>
                </div>
              ))}
              {bestPosts.length === 0 && (
                <div className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
                  {t('admin.noDataYet')}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Skull size={16} weight="bold" style={{ color: 'var(--accent-red)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('analytics.worstPosts')}
              </h3>
            </div>
            <div className="space-y-2">
              {worstPosts.map(post => (
                <div
                  key={post.id}
                  className="p-2 rounded-xl flex items-center justify-between"
                  style={{ background: 'var(--bg-primary)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                      r/{post.subreddit}
                    </div>
                    <div className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {post.title}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2" style={{ color: 'var(--text-tertiary)' }}>
                    <ArrowUp size={12} weight="bold" />
                    <span className="text-sm font-semibold">{formatNumber(post.score)}</span>
                  </div>
                </div>
              ))}
              {worstPosts.length === 0 && (
                <div className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
                  {t('admin.noDataYet')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subreddit Analytics Section */}
      <div className="p-4 rounded-2xl mb-4" style={{ background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-2 mb-4">
          <ChartBar size={20} weight="bold" style={{ color: 'var(--text-primary)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('analytics.subredditAnalytics')}
          </h2>
        </div>

        {/* Overlap Warnings */}
        {overlapWarnings.length > 0 && user?.role === 'dev' && (
          <div
            className="p-3 rounded-xl mb-4"
            style={{ background: 'rgba(var(--accent-red-rgb), 0.1)', border: '1px solid var(--accent-red)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Warning size={16} weight="bold" style={{ color: 'var(--accent-red)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--accent-red)' }}>
                {t('analytics.overlapWarning')}
              </span>
            </div>
            <div className="space-y-1">
              {overlapWarnings.slice(0, 5).map(warning => (
                <div key={warning.subreddit} className="text-sm flex items-center gap-2">
                  <span style={{ color: 'var(--accent-red)' }}>r/{warning.subreddit}</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                  <span style={{ color: 'var(--text-primary)' }}>{warning.users.join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subreddit List */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                <th className="text-left py-2 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  {t('analytics.subreddit')}
                </th>
                <th className="text-right py-2 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  {t('analytics.posts')}
                </th>
                <th className="text-right py-2 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  {t('analytics.avgScore')}
                </th>
                {user?.role === 'dev' && (
                  <th className="text-left py-2 pl-4 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                    {t('admin.users')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {subredditData.slice(0, 10).map(sub => (
                <tr key={sub.subreddit} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td className="py-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                    r/{sub.subreddit}
                  </td>
                  <td className="py-2 text-sm text-right" style={{ color: 'var(--text-primary)' }}>
                    {sub.posts}
                  </td>
                  <td className="py-2 text-sm text-right" style={{ color: 'var(--text-primary)' }}>
                    {formatNumber(sub.avgScore)}
                  </td>
                  {user?.role === 'dev' && (
                    <td className="py-2 pl-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                      {sub.userIds.map(id => users.find(u => u.id === id)?.username).filter(Boolean).join(', ')}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {subredditData.length === 0 && (
            <div className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
              {t('admin.noDataYet')}
            </div>
          )}
        </div>
      </div>

      {/* Account Health Section */}
      <div className="p-4 rounded-2xl mb-4" style={{ background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Users size={20} weight="bold" style={{ color: 'var(--text-primary)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('analytics.accountHealth')}
          </h2>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {/* Status Breakdown Pie Chart */}
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              {t('analytics.statusBreakdown')}
            </h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-tertiary)',
                      border: 'none',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {statusBreakdown.map(item => (
                <div key={item.name} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Karma Leaders */}
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              {t('analytics.karmaLeaders')}
            </h3>
            <div className="space-y-2">
              {karmaLeaders.map((leader, i) => (
                <div
                  key={leader.name}
                  className="p-2 rounded-xl flex items-center justify-between"
                  style={{ background: 'var(--bg-primary)' }}
                >
                  <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {leader.name}
                  </span>
                  <span className="text-sm font-semibold ml-2" style={{ color: 'var(--accent-green)' }}>
                    {formatNumber(leader.karma)}
                  </span>
                </div>
              ))}
              {karmaLeaders.length === 0 && (
                <div className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
                  {t('admin.noDataYet')}
                </div>
              )}
            </div>
          </div>

          {/* Expiring Soon */}
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              {t('analytics.expiringSoon')}
            </h3>
            <div className="space-y-2">
              {expiringSoon.map(item => (
                <div
                  key={item.name}
                  className="p-2 rounded-xl flex items-center justify-between"
                  style={{ background: 'var(--bg-primary)' }}
                >
                  <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {item.name}
                  </span>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full ml-2"
                    style={{
                      background: item.daysLeft <= 3 ? 'var(--accent-red)' : 'var(--accent-orange)',
                      color: '#fff',
                    }}
                  >
                    {item.daysLeft}d
                  </span>
                </div>
              ))}
              {expiringSoon.length === 0 && (
                <div className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
                  {t('analytics.noExpiring')}
                </div>
              )}
            </div>
          </div>

          {/* Recent Bans */}
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              {t('analytics.recentBans')}
            </h3>
            <div className="space-y-2">
              {recentBans.map(item => (
                <div
                  key={item.name}
                  className="p-2 rounded-xl flex items-center justify-between"
                  style={{ background: 'var(--bg-primary)' }}
                >
                  <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {item.name}
                  </span>
                  <span className="text-xs ml-2" style={{ color: 'var(--text-tertiary)' }}>
                    {formatRelativeTime(new Date(item.date))}
                  </span>
                </div>
              ))}
              {recentBans.length === 0 && (
                <div className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
                  {t('analytics.noBans')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Activity Section (dev/admin only) */}
      {user?.role === 'dev' && (
        <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Users size={20} weight="bold" style={{ color: 'var(--text-primary)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('analytics.userActivity')}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Posts by User Bar Chart */}
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                {t('analytics.postsByUser')}
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userActivity.slice(0, 5)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                    <XAxis type="number" stroke="var(--text-tertiary)" fontSize={12} />
                    <YAxis type="category" dataKey="username" stroke="var(--text-tertiary)" fontSize={12} width={80} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-tertiary)',
                        border: 'none',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <Bar dataKey="posts" radius={[0, 4, 4, 0]}>
                      {userActivity.slice(0, 5).map((entry) => (
                        <Cell key={`cell-${entry.username}`} fill={getUserColor(entry.username)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Active Users Table */}
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                {t('analytics.activeUsers')}
              </h3>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <th className="text-left py-2 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                      {t('messages.user')}
                    </th>
                    <th className="text-right py-2 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                      {t('analytics.posts')}
                    </th>
                    <th className="text-right py-2 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                      {t('analytics.lastActive')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {userActivity.slice(0, 5).map((activity) => (
                    <tr key={activity.username} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td className="py-2 text-sm flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: getUserColor(activity.username) }}
                        />
                        <span style={{ color: 'var(--text-primary)' }}>{activity.username}</span>
                      </td>
                      <td className="py-2 text-sm text-right" style={{ color: 'var(--text-primary)' }}>
                        {activity.posts}
                      </td>
                      <td className="py-2 text-sm text-right" style={{ color: 'var(--text-tertiary)' }}>
                        {formatRelativeTime(activity.lastActive)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {userActivity.length === 0 && (
                <div className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
                  {t('admin.noDataYet')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menus */}
      {showModelMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowModelMenu(false)}
        />
      )}
    </main>
  );
}

export default AnalyticsPage;
