import { useState, useEffect, useMemo, useRef } from 'react';
import { CaretLeft, CaretRight, ArrowsClockwise, ArrowUp, ChatCircle, X, Link as LinkIcon, Check, PencilSimple, CaretDown, Users, FolderSimple, Globe } from '@phosphor-icons/react';
import { useLanguage } from '../i18n';
import { Model, Profile, RedditPost, AppUser } from '../../shared/types';

// Helper to extract Google Drive file ID and convert to preview URL
function getDrivePreviewUrl(driveLink: string | undefined): string | null {
  if (!driveLink) return null;

  // Match various Google Drive URL formats
  // https://drive.google.com/file/d/FILE_ID/view
  // https://drive.google.com/open?id=FILE_ID
  // https://drive.google.com/uc?id=FILE_ID
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = driveLink.match(pattern);
    if (match && match[1]) {
      // Use lh3.googleusercontent.com for direct image access
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }

  return null;
}

interface PostsPageProps {
  models: Model[];
  profiles: Profile[];
  user: AppUser | null;
  onLaunchBrowser?: (profileId: string, navigateUrl?: string) => Promise<void>;
}

function PostsPage({ models, profiles, user, onLaunchBrowser }: PostsPageProps) {
  const { t } = useLanguage();
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>(() => {
    // Load from localStorage or default to all models
    const saved = localStorage.getItem('posts_selectedModelIds');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(id => models.some(m => m.id === id));
        }
      } catch {}
    }
    return [];
  });
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<RedditPost | null>(null);
  const [expandedDay, setExpandedDay] = useState<Date | null>(null);
  const [editingDriveLink, setEditingDriveLink] = useState(false);
  const [driveLinkInput, setDriveLinkInput] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [lastSyncLabel, setLastSyncLabel] = useState<string>('');
  const [archivedProfiles, setArchivedProfiles] = useState<Profile[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedBrowserIds, setSelectedBrowserIds] = useState<string[]>([]);
  const [showUserFilter, setShowUserFilter] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showBrowserFilter, setShowBrowserFilter] = useState(false);
  const userFilterRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const browserFilterRef = useRef<HTMLDivElement>(null);

  // Helper to get relative time
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

  // Update sync label periodically
  useEffect(() => {
    if (!lastSyncTime) return;
    const updateLabel = () => setLastSyncLabel(getRelativeTime(lastSyncTime));
    updateLabel();
    const interval = setInterval(updateLabel, 10000);
    return () => clearInterval(interval);
  }, [lastSyncTime]);

  // Get first and last day of current month
  const monthStart = useMemo(() => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    return d;
  }, [currentDate]);

  const monthEnd = useMemo(() => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return d;
  }, [currentDate]);

  // Generate calendar days (including padding from prev/next months)
  const calendarDays = useMemo(() => {
    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Start from Monday of the week containing the 1st
    // getDay() returns 0=Sun, 1=Mon... we need Mon=0, so: (day + 6) % 7
    const startDay = new Date(monthStart);
    const startDayOfWeek = (startDay.getDay() + 6) % 7; // Monday = 0
    startDay.setDate(startDay.getDate() - startDayOfWeek);

    // End on Sunday of the week containing the last day
    const endDay = new Date(monthEnd);
    const endDayOfWeek = (endDay.getDay() + 6) % 7; // Monday = 0
    endDay.setDate(endDay.getDate() + (6 - endDayOfWeek));

    const current = new Date(startDay);
    while (current <= endDay) {
      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === currentDate.getMonth(),
      });
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [monthStart, monthEnd, currentDate]);

  const monthLabel = useMemo(() => {
    return currentDate.toLocaleDateString('en', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  // Save selected models to localStorage
  useEffect(() => {
    localStorage.setItem('posts_selectedModelIds', JSON.stringify(selectedModelIds));
  }, [selectedModelIds]);

  // Toggle model selection
  const toggleModelSelection = (modelId: string) => {
    setSelectedModelIds(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  // Load archived profiles for status lookup
  useEffect(() => {
    const loadArchivedProfiles = async () => {
      try {
        const archived = await window.electronAPI?.listArchivedProfiles();
        setArchivedProfiles(archived || []);
      } catch (err) {
        console.error('Failed to load archived profiles:', err);
      }
    };
    loadArchivedProfiles();
  }, []);

  // Load users for dev user filter
  useEffect(() => {
    if (user?.role !== 'dev') return;
    const loadUsers = async () => {
      try {
        const usersList = await window.electronAPI?.adminListUsers();
        setUsers(usersList || []);
        // Default: select all users for dev accounts
        if (usersList && usersList.length > 0) {
          setSelectedUserIds(usersList.map((u: AppUser) => u.id));
        }
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    };
    loadUsers();
  }, [user]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userFilterRef.current && !userFilterRef.current.contains(e.target as Node)) {
        setShowUserFilter(false);
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false);
      }
      if (browserFilterRef.current && !browserFilterRef.current.contains(e.target as Node)) {
        setShowBrowserFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get available browsers for filter (based on user role)
  const availableBrowsers = useMemo(() => {
    if (user?.role === 'dev') {
      return profiles;
    }
    // For admin/basic users, only show their own browsers
    return profiles.filter(p => p.userId === user?.id);
  }, [profiles, user]);

  // Toggle browser selection
  const toggleBrowserSelection = (browserId: string) => {
    setSelectedBrowserIds(prev =>
      prev.includes(browserId)
        ? prev.filter(id => id !== browserId)
        : [...prev, browserId]
    );
  };

  // Get profiles for selected models
  const modelProfiles = useMemo(() => {
    if (selectedModelIds.length === 0) return profiles;
    return profiles.filter(p => p.modelId && selectedModelIds.includes(p.modelId));
  }, [profiles, selectedModelIds]);

  // Load posts when date changes (always load all, filter in frontend)
  useEffect(() => {
    loadPosts();
  }, [currentDate]);

  const loadPosts = async () => {
    try {
      // Load posts for the entire month with some buffer
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);

      // Load all posts, filter by model in frontend
      const data = await window.electronAPI?.listRedditPosts(
        undefined,
        startDate.toISOString(),
        endDate.toISOString()
      );
      setPosts(data || []);
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Failed to load posts:', err);
    }
  };

  const handleSync = async () => {
    if (isSyncing || modelProfiles.length === 0) return;
    setIsSyncing(true);

    console.log('Syncing posts for models:', selectedModelIds);
    console.log('Model profiles:', modelProfiles);

    try {
      // Sync posts for all profiles in the model
      for (const profile of modelProfiles) {
        console.log('Syncing profile:', profile.id, profile.name);
        const result = await window.electronAPI?.syncRedditPosts(profile.id, profile.name);
        console.log('Sync result:', result);
      }
      await loadPosts();
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Failed to sync posts:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePrevMonth = async () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    await loadPosts();
  };

  const handleNextMonth = async () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    await loadPosts();
  };

  // Get profile for a post (including archived profiles)
  const getProfile = (profileId: string): Profile | undefined => {
    return profiles.find(p => p.id === profileId) || archivedProfiles.find(p => p.id === profileId);
  };

  // Get user for a profile
  const getUserForProfile = (profileId: string): AppUser | undefined => {
    const profile = getProfile(profileId);
    if (!profile?.userId) return undefined;
    return users.find(u => u.id === profile.userId);
  };

  // Get posts for a specific day (with model, user, and browser filters)
  const getPostsForDay = (date: Date): RedditPost[] => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return posts.filter(post => {
      const postDate = new Date(post.createdUtc);
      if (postDate < dayStart || postDate > dayEnd) return false;

      const profile = getProfile(post.profileId);

      // Apply model filter
      if (selectedModelIds.length > 0) {
        if (!profile?.modelId || !selectedModelIds.includes(profile.modelId)) return false;
      }

      // Apply browser filter
      if (selectedBrowserIds.length > 0) {
        if (!selectedBrowserIds.includes(post.profileId)) return false;
      }

      // For admin/basic users: only show their own posts
      if (user?.role !== 'dev') {
        if (!profile?.userId || profile.userId !== user?.id) return false;
      }

      // Apply user filter for dev users
      if (user?.role === 'dev' && selectedUserIds.length > 0) {
        if (!profile?.userId) return false;
        return selectedUserIds.includes(profile.userId);
      }

      return true;
    });
  };

  // Toggle user selection
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Get profile name for a post (with fallback to stored account name)
  const getProfileName = (profileId: string, accountName?: string): string => {
    const profile = getProfile(profileId);
    return profile?.name || accountName || 'Unknown';
  };

  // Check if profile is banned (with fallback to stored status)
  const isProfileBanned = (profileId: string, isBannedFallback?: boolean): boolean => {
    const profile = getProfile(profileId);
    if (profile) return profile.status === 'banned';
    return isBannedFallback ?? false;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const formatScore = (score: number): string => {
    if (score >= 1000) {
      return `${(score / 1000).toFixed(1)}k`;
    }
    return score.toString();
  };

  // Pastel colors with distinct hues (no similar colors next to each other)
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

  // Create color map for users - each user gets a unique color based on their order (same as AdminPage)
  const userColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((user, index) => {
      map[user.id] = avatarColors[index % avatarColors.length];
      map[user.username] = avatarColors[index % avatarColors.length];
    });
    return map;
  }, [users]);

  // Get user avatar color (same as AdminPage - index-based, no duplicates)
  const getUserColor = (userIdOrName: string | undefined): string => {
    if (!userIdOrName) return '#808080';
    return userColorMap[userIdOrName] || avatarColors[0];
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Handle saving drive link
  const handleSaveDriveLink = async () => {
    if (!selectedPost) return;

    try {
      const updated = await window.electronAPI?.updateRedditPost(selectedPost.id, { driveLink: driveLinkInput || undefined });
      if (updated) {
        // Update local state
        setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, driveLink: driveLinkInput || undefined } : p));
        setSelectedPost({ ...selectedPost, driveLink: driveLinkInput || undefined });
      }
      setEditingDriveLink(false);
    } catch (err) {
      console.error('Failed to save drive link:', err);
    }
  };

  // When opening post detail modal, initialize drive link input
  const handleOpenPost = (post: RedditPost) => {
    setSelectedPost(post);
    setDriveLinkInput(post.driveLink || '');
    setEditingDriveLink(false);
  };

  return (
    <main className="pl-4 pb-6 flex-1 pr-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 mt-2 px-1">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {t('posts.title')}
        </h1>

        {/* Model Selector */}
        <div className="relative" ref={modelMenuRef}>
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
            <span>{selectedModelIds.length === 0 ? 'All' : selectedModelIds.length === 1 ? models.find(m => m.id === selectedModelIds[0])?.name : `${selectedModelIds.length}`}</span>
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

        {/* Browser Filter (All users) */}
        {availableBrowsers.length > 0 && (
          <div className="relative" ref={browserFilterRef}>
            <button
              onClick={() => setShowBrowserFilter(!showBrowserFilter)}
              className="h-8 px-3 flex items-center gap-1.5 text-sm font-medium"
              style={{
                background: 'var(--chip-bg)',
                color: 'var(--text-primary)',
                borderRadius: '100px',
              }}
            >
              <Globe size={14} weight="bold" />
              <span>{selectedBrowserIds.length === 0 ? t('posts.allBrowsers') : selectedBrowserIds.length === 1 ? availableBrowsers.find(b => b.id === selectedBrowserIds[0])?.name : `${selectedBrowserIds.length}`}</span>
              <CaretDown size={10} weight="bold" />
            </button>

            {showBrowserFilter && (
              <div
                className="absolute z-50 mt-1 py-1 min-w-[200px] max-h-[300px] overflow-y-auto"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                }}
              >
                {availableBrowsers.map(browser => (
                  <button
                    key={browser.id}
                    onClick={() => toggleBrowserSelection(browser.id)}
                    className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-white/5"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center text-xs"
                      style={{
                        background: selectedBrowserIds.includes(browser.id) ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        color: selectedBrowserIds.includes(browser.id) ? 'var(--accent-text)' : 'var(--text-tertiary)',
                      }}
                    >
                      {selectedBrowserIds.includes(browser.id) && <Check size={10} weight="bold" />}
                    </div>
                    <Globe size={14} weight="bold" />
                    <span className="truncate">{browser.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={isSyncing || modelProfiles.length === 0}
            className="h-9 px-3 flex items-center gap-2 transition-colors"
            style={{
              background: 'var(--chip-bg)',
              color: 'var(--text-primary)',
              borderRadius: '100px',
              opacity: (isSyncing || modelProfiles.length === 0) ? 0.5 : 1,
            }}
            title="Sync Reddit posts"
          >
            <ArrowsClockwise
              size={16}
              weight="bold"
              style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }}
            />
            {lastSyncLabel && <span className="text-sm font-medium">{lastSyncLabel}</span>}
          </button>

          {/* Month Navigation */}
          <button
            onClick={handlePrevMonth}
            className="w-9 h-9 flex items-center justify-center transition-colors"
            style={{ background: 'var(--chip-bg)', borderRadius: '100px', color: 'var(--text-primary)' }}
          >
            <CaretLeft size={18} weight="bold" />
          </button>

          <span className="px-3 text-sm font-medium min-w-[140px] text-center" style={{ color: 'var(--text-primary)' }}>
            {monthLabel}
          </span>

          <button
            onClick={handleNextMonth}
            className="w-9 h-9 flex items-center justify-center transition-colors"
            style={{ background: 'var(--chip-bg)', borderRadius: '100px', color: 'var(--text-primary)' }}
          >
            <CaretRight size={18} weight="bold" />
          </button>
        </div>
      </div>

      {/* User Filter Chips (Dev only) */}
      {user?.role === 'dev' && users.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-3 px-1">
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

      {/* Active browser filters chips */}
      {selectedBrowserIds.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {selectedBrowserIds.map(browserId => {
            const browser = profiles.find(p => p.id === browserId);
            if (!browser) return null;
            return (
              <button
                key={browserId}
                onClick={() => setSelectedBrowserIds(prev => prev.filter(id => id !== browserId))}
                className="h-8 px-3 text-sm font-medium flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                style={{ background: 'var(--chip-bg)', borderRadius: '100px' }}
              >
                <Globe size={14} weight="bold" style={{ color: 'var(--text-tertiary)' }} />
                <span style={{ color: 'var(--text-primary)' }}>{browser.name}</span>
                <X size={14} weight="bold" style={{ color: 'var(--text-tertiary)' }} />
              </button>
            );
          })}
        </div>
      )}

      {/* Spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Content */}
      <div className="rounded-xl overflow-hidden flex-1 flex flex-col" style={{ background: 'var(--bg-secondary)' }}>
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b flex-shrink-0" style={{ borderColor: 'var(--border-light)' }}>
            {weekDays.map(day => (
              <div
                key={day}
                className="py-3 text-center text-xs font-semibold"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: '1fr' }}>
            {calendarDays.map((day, i) => {
              const dayPosts = getPostsForDay(day.date);
              const hasMultiple = dayPosts.length > 5;

              return (
                <div
                  key={i}
                  className="p-2 border-b border-r overflow-hidden"
                  style={{
                    borderColor: 'var(--border-light)',
                    background: isToday(day.date)
                      ? 'rgba(var(--accent-primary-rgb), 0.1)'
                      : day.isCurrentMonth
                      ? 'transparent'
                      : 'var(--bg-primary)',
                  }}
                >
                  {/* Date Number */}
                  <div
                    className={`text-sm font-medium mb-1 ${isToday(day.date) ? 'w-7 h-7 flex items-center justify-center rounded-full' : ''}`}
                    style={{
                      color: day.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-tertiary)',
                      background: isToday(day.date) ? 'var(--accent-primary)' : 'transparent',
                      ...(isToday(day.date) && { color: 'var(--accent-text)' }),
                    }}
                  >
                    {day.date.getDate()}
                  </div>

                  {/* Posts */}
                  <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                    {dayPosts.slice(0, hasMultiple ? 4 : 5).map(post => {
                      const isBanned = isProfileBanned(post.profileId, post.isBanned);
                      const profileName = getProfileName(post.profileId, post.accountName);
                      // For dev users, get the post owner; for others, use current user (they only see their own posts)
                      const postUser = user?.role === 'dev' ? getUserForProfile(post.profileId) : user;
                      const userColor = getUserColor(postUser?.username);
                      return (
                        <button
                          key={post.id}
                          onClick={() => {
                            if (isBanned) return;
                            handleOpenPost(post);
                          }}
                          className="w-full py-1 px-2.5 text-left truncate transition-opacity"
                          style={{
                            background: isBanned ? 'var(--accent-red)' : userColor,
                            color: isBanned ? '#fff' : '#000',
                            borderRadius: '100px',
                            opacity: isBanned ? 0.5 : 1,
                            cursor: isBanned ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold truncate">r/{post.subreddit}</span>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                              <ArrowUp size={10} weight="bold" />
                              <span className="font-semibold">{formatScore(post.score)}</span>
                              <ChatCircle size={10} weight="bold" />
                              <span className="font-semibold">{post.numComments}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {hasMultiple && (
                      <button
                        onClick={() => setExpandedDay(day.date)}
                        className="w-full p-1 text-xs font-medium transition-opacity hover:opacity-80"
                        style={{
                          background: 'var(--chip-bg)',
                          color: 'var(--text-primary)',
                          borderRadius: '100px',
                        }}
                      >
                        +{dayPosts.length - 4} {t('posts.more')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
      </div>

      {/* Expanded Day Modal */}
      {expandedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setExpandedDay(null)}
        >
          <div
            className="w-[400px] max-h-[80vh] overflow-y-auto p-6 rounded-2xl"
            style={{ background: 'var(--bg-secondary)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {expandedDay.toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
              <button
                onClick={() => setExpandedDay(null)}
                className="p-2 rounded-full transition-colors hover:opacity-80"
                style={{ background: 'var(--chip-bg)', color: 'var(--text-tertiary)' }}
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            {/* Posts List */}
            <div className="flex flex-col gap-2">
              {getPostsForDay(expandedDay).map(post => {
                const isBanned = isProfileBanned(post.profileId, post.isBanned);
                const profileName = getProfileName(post.profileId, post.accountName);
                // For dev users, get the post owner; for others, use current user (they only see their own posts)
                const postUser = user?.role === 'dev' ? getUserForProfile(post.profileId) : user;
                const userColor = getUserColor(postUser?.username);
                return (
                  <button
                    key={post.id}
                    onClick={() => {
                      if (isBanned) return;
                      setExpandedDay(null);
                      handleOpenPost(post);
                    }}
                    className="w-full py-1 px-2.5 text-left truncate transition-opacity"
                    style={{
                      background: isBanned ? 'var(--accent-red)' : userColor,
                      color: isBanned ? '#fff' : '#000',
                      borderRadius: '100px',
                      opacity: isBanned ? 0.5 : 1,
                      cursor: isBanned ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold truncate">r/{post.subreddit}</span>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <ArrowUp size={10} weight="bold" />
                        <span className="font-semibold">{formatScore(post.score)}</span>
                        <ChatCircle size={10} weight="bold" />
                        <span className="font-semibold">{post.numComments}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="w-[500px] max-h-[80vh] overflow-y-auto p-6 rounded-2xl"
            style={{ background: 'var(--bg-secondary)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
                  r/{selectedPost.subreddit}
                </div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {selectedPost.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-2 rounded-full transition-colors hover:opacity-80"
                style={{ background: 'var(--chip-bg)', color: 'var(--text-tertiary)' }}
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 mb-4 p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
              <div className="flex items-center gap-2">
                <ArrowUp size={18} weight="bold" style={{ color: 'var(--accent-green)' }} />
                <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {selectedPost.score.toLocaleString()}
                </span>
                {selectedPost.upvoteRatio && (
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    ({Math.round(selectedPost.upvoteRatio * 100)}%)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <ChatCircle size={18} weight="bold" style={{ color: 'var(--accent-primary)' }} />
                <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {selectedPost.numComments.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Google Drive Link */}
            <div className="mb-4 p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <LinkIcon size={14} weight="bold" style={{ color: 'var(--text-tertiary)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                    {t('posts.driveLink')}
                  </span>
                </div>
                {!editingDriveLink && selectedPost.driveLink && (
                  <button
                    onClick={() => setEditingDriveLink(true)}
                    className="p-1 rounded-full transition-opacity hover:opacity-80"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <PencilSimple size={14} weight="bold" />
                  </button>
                )}
              </div>
              {editingDriveLink || !selectedPost.driveLink ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={driveLinkInput}
                    onChange={(e) => setDriveLinkInput(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="flex-1 h-9 px-4 text-sm"
                    style={{
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: 'none',
                      borderRadius: '100px',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleSaveDriveLink}
                    className="w-9 h-9 flex items-center justify-center transition-opacity hover:opacity-80"
                    style={{ background: 'var(--accent-primary)', color: 'var(--accent-text)', borderRadius: '100px' }}
                  >
                    <Check size={16} weight="bold" />
                  </button>
                </div>
              ) : (
                <a
                  href={selectedPost.driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm truncate block transition-opacity hover:opacity-80"
                  style={{ color: 'var(--accent-primary)' }}
                  onClick={(e) => {
                    e.preventDefault();
                    window.electronAPI?.openExternal(selectedPost.driveLink!);
                  }}
                >
                  {selectedPost.driveLink}
                </a>
              )}
            </div>

            {/* Thumbnail/Image - prioritize Google Drive preview */}
            {(() => {
              // First try Google Drive preview, then Reddit sources
              const drivePreview = getDrivePreviewUrl(selectedPost.driveLink);
              const imageUrl = drivePreview ||
                selectedPost.previewUrl ||
                selectedPost.thumbnail ||
                (selectedPost.url && (
                  selectedPost.url.includes('i.redd.it') ||
                  selectedPost.url.includes('i.imgur.com') ||
                  /\.(jpg|jpeg|png|gif|webp)$/i.test(selectedPost.url)
                ) ? selectedPost.url : null);

              if (!imageUrl) return null;

              return (
                <div className="mb-4">
                  <img
                    src={imageUrl}
                    alt=""
                    className="w-full rounded-xl object-cover"
                    style={{ maxHeight: '300px' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              );
            })()}

            {/* Caption/Selftext */}
            {selectedPost.selftext && (
              <div className="mb-4 p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
                <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
                  {t('posts.caption')}
                </div>
                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                  {selectedPost.selftext}
                </p>
              </div>
            )}

            {/* Details */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-tertiary)' }}>{t('posts.browser')}</span>
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--text-primary)' }}>{getProfileName(selectedPost.profileId, selectedPost.accountName)}</span>
                  {isProfileBanned(selectedPost.profileId, selectedPost.isBanned) && (
                    <span
                      className="px-2 py-0.5 text-xs font-medium rounded-full"
                      style={{ background: 'var(--accent-red)', color: '#fff' }}
                    >
                      {t('profile.banned')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-tertiary)' }}>{t('posts.postedOn')}</span>
                <span style={{ color: 'var(--text-primary)' }}>
                  {new Date(selectedPost.createdUtc).toLocaleDateString('en', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            {/* Open on Reddit */}
            <button
              onClick={() => window.electronAPI?.openExternal(`https://reddit.com${selectedPost.permalink}`)}
              className="w-full mt-4 h-10 text-sm font-medium transition-colors"
              style={{
                background: 'var(--accent-primary)',
                color: 'var(--accent-text)',
                borderRadius: '100px',
              }}
            >
              {t('posts.openOnReddit')}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default PostsPage;
