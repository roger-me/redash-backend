import { useState, useEffect, useMemo } from 'react';
import { CaretLeft, CaretRight, ArrowsClockwise, ArrowUp, ChatCircle, X } from '@phosphor-icons/react';
import { useLanguage } from '../i18n';
import { Model, Profile, RedditPost } from '../../shared/types';

interface PostsPageProps {
  models: Model[];
  profiles: Profile[];
}

function PostsPage({ models, profiles }: PostsPageProps) {
  const { t } = useLanguage();
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<RedditPost | null>(null);

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

    // Start from Sunday of the week containing the 1st
    const startDay = new Date(monthStart);
    startDay.setDate(startDay.getDate() - startDay.getDay());

    // End on Saturday of the week containing the last day
    const endDay = new Date(monthEnd);
    endDay.setDate(endDay.getDate() + (6 - endDay.getDay()));

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

  // Get profiles for selected model
  const modelProfiles = useMemo(() => {
    if (!selectedModelId) return [];
    return profiles.filter(p => p.modelId === selectedModelId);
  }, [profiles, selectedModelId]);

  // Load posts when model changes
  useEffect(() => {
    if (!selectedModelId) {
      setPosts([]);
      return;
    }
    loadPosts();
  }, [selectedModelId, currentDate]);

  const loadPosts = async () => {
    try {
      // Load posts for the entire month with some buffer
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);

      const data = await window.electronAPI?.listRedditPosts(
        selectedModelId,
        startDate.toISOString(),
        endDate.toISOString()
      );
      setPosts(data || []);
    } catch (err) {
      console.error('Failed to load posts:', err);
    }
  };

  const handleSync = async () => {
    if (isSyncing || !selectedModelId) return;
    setIsSyncing(true);

    console.log('Syncing posts for model:', selectedModelId);
    console.log('Model profiles:', modelProfiles);

    try {
      // Sync posts for all profiles in the model
      for (const profile of modelProfiles) {
        console.log('Syncing profile:', profile.id, profile.name);
        const result = await window.electronAPI?.syncRedditPosts(profile.id, profile.name);
        console.log('Sync result:', result);
      }
      await loadPosts();
    } catch (err) {
      console.error('Failed to sync posts:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Get posts for a specific day
  const getPostsForDay = (date: Date): RedditPost[] => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return posts.filter(post => {
      const postDate = new Date(post.createdUtc);
      return postDate >= dayStart && postDate <= dayEnd;
    });
  };

  // Get profile for a post
  const getProfile = (profileId: string): Profile | undefined => {
    return profiles.find(p => p.id === profileId);
  };

  // Get profile name for a post
  const getProfileName = (profileId: string): string => {
    const profile = getProfile(profileId);
    return profile?.name || 'Unknown';
  };

  // Check if profile is banned
  const isProfileBanned = (profileId: string): boolean => {
    const profile = getProfile(profileId);
    return profile?.status === 'banned';
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

  // Generate consistent pastel color for a profile
  const getProfileColor = (profileId: string): { bg: string; text: string } => {
    // Hash the profileId to get a consistent number
    let hash = 0;
    for (let i = 0; i < profileId.length; i++) {
      hash = profileId.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate pastel hue (0-360)
    const hue = Math.abs(hash) % 360;

    return {
      bg: `hsl(${hue}, 70%, 80%)`,
      text: `hsl(${hue}, 70%, 25%)`,
    };
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <main className="pl-4 pb-6 flex-1 pr-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 mt-2 px-1">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {t('posts.title')}
        </h1>

        {/* Model Selector */}
        <select
          value={selectedModelId}
          onChange={(e) => setSelectedModelId(e.target.value)}
          className="h-9 px-4 text-sm font-medium"
          style={{
            background: 'var(--chip-bg)',
            color: 'var(--text-primary)',
            border: 'none',
            borderRadius: '100px',
            outline: 'none',
          }}
        >
          <option value="">{t('posts.selectModel')}</option>
          {models.map(model => (
            <option key={model.id} value={model.id}>{model.name}</option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          {/* Sync Button */}
          {selectedModelId && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="h-9 px-4 flex items-center gap-2 transition-colors"
              style={{
                background: 'var(--chip-bg)',
                color: 'var(--text-primary)',
                borderRadius: '100px',
                opacity: isSyncing ? 0.5 : 1,
              }}
            >
              <ArrowsClockwise
                size={16}
                weight="bold"
                style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }}
              />
              <span className="text-sm font-medium">{t('posts.sync')}</span>
            </button>
          )}

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

      {/* Spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Content */}
      {!selectedModelId ? (
        <div className="rounded-xl p-12 text-center" style={{
          background: 'var(--bg-secondary)',
          border: '1px dashed var(--border-light)'
        }}>
          <p style={{ color: 'var(--text-tertiary)' }}>{t('posts.selectModelPrompt')}</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border-light)' }}>
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
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayPosts = getPostsForDay(day.date);
              const hasMultiple = dayPosts.length > 3;

              return (
                <div
                  key={i}
                  className="min-h-[100px] p-2 border-b border-r"
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
                  <div className="flex flex-col gap-1">
                    {dayPosts.slice(0, hasMultiple ? 2 : 3).map(post => {
                      const isBanned = isProfileBanned(post.profileId);
                      const profileName = getProfileName(post.profileId);
                      const profileColor = getProfileColor(post.profileId);
                      return (
                        <button
                          key={post.id}
                          onClick={() => setSelectedPost(post)}
                          className="w-full px-3 py-1 text-left truncate transition-opacity hover:opacity-80"
                          style={{
                            background: isBanned ? 'var(--accent-red)' : profileColor.bg,
                            color: isBanned ? '#fff' : profileColor.text,
                            borderRadius: '100px',
                          }}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold">{profileName}</span>
                            <div className="flex items-center gap-1">
                              <span
                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                                style={{
                                  background: isBanned ? 'rgba(255,255,255,0.2)' : `hsl(${Math.abs([...post.profileId].reduce((a, c) => c.charCodeAt(0) + ((a << 5) - a), 0)) % 360}, 70%, 70%)`,
                                }}
                              >
                                <ArrowUp size={10} weight="bold" className="flex-shrink-0" />
                                <span>{formatScore(post.score)}</span>
                              </span>
                              <span
                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                                style={{
                                  background: isBanned ? 'rgba(255,255,255,0.2)' : `hsl(${Math.abs([...post.profileId].reduce((a, c) => c.charCodeAt(0) + ((a << 5) - a), 0)) % 360}, 70%, 70%)`,
                                }}
                              >
                                <ChatCircle size={10} weight="bold" className="flex-shrink-0" />
                                <span>{post.numComments}</span>
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {hasMultiple && (
                      <div className="text-xs px-1" style={{ color: 'var(--text-tertiary)' }}>
                        +{dayPosts.length - 2} {t('posts.more')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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

            {/* Thumbnail */}
            {selectedPost.thumbnail && (
              <div className="mb-4">
                <img
                  src={selectedPost.thumbnail}
                  alt="Thumbnail"
                  className="w-full rounded-xl object-cover"
                  style={{ maxHeight: '200px' }}
                />
              </div>
            )}

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
                  <span style={{ color: 'var(--text-primary)' }}>{getProfileName(selectedPost.profileId)}</span>
                  {isProfileBanned(selectedPost.profileId) && (
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
