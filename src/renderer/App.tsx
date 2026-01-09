import { useState, useEffect, useRef } from 'react';
import { Profile, Model } from '../shared/types';
import ProfileList from './components/ProfileList';
import CreateProfileModal from './components/CreateProfileModal';
import EditProfileModal from './components/EditProfileModal';
import ModelModal from './components/ModelModal';
import FlipperPage from './components/FlipperPage';
import BrowserPanel from './components/BrowserPanel';
import LoginPage from './components/auth/LoginPage';
import AdminPage from './components/AdminPage';
import StatsPage from './components/StatsPage';
import appIcon from './assets/icon.png';
import { ArrowsClockwise, Plus, User, FolderSimple, Desktop, Users, Swap, Brain, Sun, Moon, SignOut, Gear, ShieldCheck, ChartBar } from '@phosphor-icons/react';
import AIPage from './components/AIPage';
import SettingsPage from './components/SettingsPage';

type Page = 'accounts' | 'flipper' | 'ai' | 'settings' | 'admin' | 'stats';

interface AuthUser {
  id: string;
  username?: string;
  email?: string;
  role: 'admin' | 'basic';
}

function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null = loading
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const [currentPage, setCurrentPage] = useState<Page>('accounts');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [assignedModelIds, setAssignedModelIds] = useState<string[]>([]);
  const [activeBrowsers, setActiveBrowsers] = useState<string[]>([]);
  const [activeBrowserProfile, setActiveBrowserProfile] = useState<Profile | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [createInModelId, setCreateInModelId] = useState<string | undefined>(undefined);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [lastSyncLabel, setLastSyncLabel] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });
  const fabMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

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

  // Check auth session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const result = await window.electronAPI?.getSession();
        if (result?.user) {
          setUser(result.user);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Failed to check session:', error);
        setIsAuthenticated(false);
      }
    };
    checkSession();

    // Listen for auth state changes
    window.electronAPI?.onAuthStateChange((event, sessionUser) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        setProfiles([]);
        setModels([]);
      }
    });
  }, []);

  // Load assigned model IDs for basic users
  const loadAssignedModels = async () => {
    if (!user || user.role === 'admin') {
      setAssignedModelIds([]);
      return;
    }
    try {
      const assignments = await window.electronAPI?.adminGetUserModelAssignments(user.id);
      setAssignedModelIds(assignments || []);
    } catch (err) {
      console.error('Failed to load assigned models:', err);
      setAssignedModelIds([]);
    }
  };

  // Compute available models based on user role
  const availableModels = user?.role === 'admin'
    ? models
    : models.filter(m => assignedModelIds.includes(m.id));

  // Load assigned models when user changes
  useEffect(() => {
    if (user) {
      loadAssignedModels();
    }
  }, [user?.id, user?.role]);

  // Load data when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const init = async () => {
      await loadProfiles();
      await loadModels();
      await loadActiveBrowsers();
      await syncRedditKarma();
    };
    init();

    window.electronAPI?.onBrowserClosed((profileId) => {
      setActiveBrowsers(prev => prev.filter(id => id !== profileId));
    });

    // Close FAB menu and user menu when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (fabMenuRef.current && !fabMenuRef.current.contains(e.target as Node)) {
        setShowFabMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAuthenticated]);

  // Update relative time label periodically
  useEffect(() => {
    if (!lastSyncTime) return;

    const updateLabel = () => setLastSyncLabel(getRelativeTime(lastSyncTime));
    updateLabel();

    const interval = setInterval(updateLabel, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, [lastSyncTime]);

  // Auth handlers
  const handleLoginSuccess = async () => {
    const result = await window.electronAPI?.getSession();
    if (result?.user) {
      setUser(result.user);
      setIsAuthenticated(true);
    }
  };

  const handleSignOut = async () => {
    try {
      await window.electronAPI?.signOut();
      setUser(null);
      setIsAuthenticated(false);
      setProfiles([]);
      setModels([]);
      setShowUserMenu(false);
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const loadProfiles = async () => {
    try {
      const data = await window.electronAPI?.listProfiles();
      setProfiles(data || []);
    } catch (err) {
      console.error('Failed to load profiles:', err);
    }
  };

  const loadModels = async () => {
    try {
      const allModels = await window.electronAPI?.listModels();

      // For basic users, filter to only assigned models
      if (user?.role === 'basic' && user?.id) {
        const assignedModelIds = await window.electronAPI?.adminGetUserModelAssignments(user.id);
        const filteredModels = (allModels || []).filter((m: Model) =>
          (assignedModelIds || []).includes(m.id)
        );
        setModels(filteredModels);
      } else {
        setModels(allModels || []);
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    }
  };

  const loadActiveBrowsers = async () => {
    try {
      const data = await window.electronAPI?.getActiveBrowsers();
      setActiveBrowsers(data || []);
    } catch (err) {
      console.error('Failed to load active browsers:', err);
    }
  };

  const syncRedditKarma = async (showNotification = false) => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      const data = await window.electronAPI?.listProfiles();
      if (!data) return;

      let syncedCount = 0;
      let totalWithUsername = 0;

      for (const profile of data) {
        // Use profile name as Reddit username
        const redditUsername = profile.name;
        if (redditUsername) {
          totalWithUsername++;
          // Add delay between requests to avoid rate limiting
          if (totalWithUsername > 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          const karma = await window.electronAPI?.fetchRedditKarma(redditUsername);
          if (karma) {
            // Update karma and reset error status to working
            const updates: any = {
              commentKarma: karma.commentKarma,
              postKarma: karma.postKarma,
            };
            if (profile.status === 'error') {
              updates.status = 'working';
            }
            await window.electronAPI?.updateProfile(profile.id, updates);
            syncedCount++;
          }
          // Don't auto-set to error - could be rate limiting or temporary network issue
          // User can manually mark accounts as error/banned if needed
        }
      }
      // Reload profiles to show updated karma
      const updated = await window.electronAPI?.listProfiles();
      setProfiles(updated || []);

      if (showNotification) {
        if (totalWithUsername === 0) {
          setNotification('No Reddit usernames configured');
        } else if (syncedCount === totalWithUsername) {
          setNotification(`Synced ${syncedCount} profile${syncedCount > 1 ? 's' : ''}`);
        } else {
          setNotification(`Synced ${syncedCount}/${totalWithUsername} (some accounts not found)`);
        }
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err) {
      console.error('Failed to sync Reddit karma:', err);
      if (showNotification) {
        setNotification('Failed to sync karma');
        setTimeout(() => setNotification(null), 3000);
      }
    } finally {
      setIsSyncing(false);
      setLastSyncTime(new Date());
    }
  };

  const handleCreateProfile = async (profile: Omit<Profile, 'id' | 'createdAt'>) => {
    try {
      await window.electronAPI?.createProfile(profile);
      await loadProfiles();
      setShowCreateModal(false);
    } catch (err) {
      console.error('Failed to create profile:', err);
    }
  };

  const handleUpdateProfile = async (id: string, updates: { name: string; description?: string; proxy?: any; status?: string; modelId?: string; credentials?: any; country?: string; accountName?: string; purchaseDate?: string; isEnabled?: boolean }) => {
    try {
      await window.electronAPI?.updateProfile(id, updates);
      await loadProfiles();
      setEditingProfile(null);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    try {
      if (activeBrowsers.includes(id)) {
        await window.electronAPI?.closeBrowser(id);
      }
      await window.electronAPI?.deleteProfile(id);
      await loadProfiles();
      setActiveBrowsers(prev => prev.filter(bid => bid !== id));
    } catch (err) {
      console.error('Failed to delete profile:', err);
    }
  };

  const handleLaunchBrowser = async (profileId: string) => {
    try {
      const profile = profiles.find(p => p.id === profileId);
      if (!profile) return;

      await window.electronAPI?.launchBrowser(profileId);
      // Only add to activeBrowsers if not already there
      setActiveBrowsers(prev => prev.includes(profileId) ? prev : [...prev, profileId]);
      setActiveBrowserProfile(profile);
    } catch (err) {
      console.error('Failed to launch browser:', err);
      alert('Failed to launch browser: ' + (err as Error).message);
    }
  };

  const handleCloseBrowser = async (profileId: string) => {
    try {
      await window.electronAPI?.closeBrowser(profileId);
      const remainingBrowsers = activeBrowsers.filter(id => id !== profileId);
      setActiveBrowsers(remainingBrowsers);
      if (activeBrowserProfile?.id === profileId) {
        // If there are other active browsers, switch to the last one
        if (remainingBrowsers.length > 0) {
          const lastBrowserId = remainingBrowsers[remainingBrowsers.length - 1];
          const lastProfile = profiles.find(p => p.id === lastBrowserId);
          if (lastProfile) {
            // Switch to the last remaining browser
            await window.electronAPI?.launchBrowser(lastBrowserId);
            setActiveBrowserProfile(lastProfile);
          } else {
            setActiveBrowserProfile(null);
          }
        } else {
          setActiveBrowserProfile(null);
        }
      }
    } catch (err) {
      console.error('Failed to close browser:', err);
    }
  };

  const handleToggleComplete = async (profileId: string, completed: boolean) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await window.electronAPI?.updateProfile(profileId, {
        lastCompletedDate: completed ? today : undefined,
      });
      await loadProfiles();
    } catch (err) {
      console.error('Failed to toggle complete:', err);
    }
  };

  const handleToggleStatus = async (profileId: string, status: string) => {
    try {
      await window.electronAPI?.updateProfile(profileId, { status });
      await loadProfiles();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleToggleEnabled = async (profileId: string, enabled: boolean) => {
    try {
      await window.electronAPI?.updateProfile(profileId, { isEnabled: enabled });
      await loadProfiles();
    } catch (err) {
      console.error('Failed to toggle enabled:', err);
    }
  };

  const handleCreateModel = async (name: string, profilePicture?: string) => {
    try {
      await window.electronAPI?.createModel({ name, isExpanded: true, profilePicture });
      await loadModels();
      setShowModelModal(false);
    } catch (err) {
      console.error('Failed to create model:', err);
    }
  };

  const handleUpdateModel = async (name: string, profilePicture?: string) => {
    if (!editingModel) return;
    try {
      await window.electronAPI?.updateModel(editingModel.id, { name, profilePicture });
      await loadModels();
      setEditingModel(null);
    } catch (err) {
      console.error('Failed to update model:', err);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    try {
      // Move all profiles in this model to unassigned
      const modelProfiles = profiles.filter(p => p.modelId === modelId);
      for (const profile of modelProfiles) {
        await window.electronAPI?.updateProfile(profile.id, { modelId: undefined });
      }
      await window.electronAPI?.deleteModel(modelId);
      await loadModels();
      await loadProfiles();
    } catch (err) {
      console.error('Failed to delete model:', err);
    }
  };

  // Admin page model handlers (simpler interface)
  const handleAdminCreateModel = async (name: string, profilePicture?: string) => {
    await window.electronAPI?.createModel({ name, isExpanded: true, profilePicture });
    await loadModels();
  };

  const handleAdminUpdateModel = async (id: string, name: string, profilePicture?: string) => {
    await window.electronAPI?.updateModel(id, { name, profilePicture });
    await loadModels();
  };

  const handleToggleModelExpand = async (modelId: string) => {
    try {
      const model = models.find(m => m.id === modelId);
      if (model) {
        await window.electronAPI?.updateModel(modelId, { isExpanded: model.isExpanded === false });
        await loadModels();
      }
    } catch (err) {
      console.error('Failed to toggle model expand:', err);
    }
  };

  const desktopProfiles = profiles.filter(p => p.type === 'desktop');

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-4">
          <img src={appIcon} alt="Redash" className="w-16 h-16 rounded-2xl animate-pulse" />
          <p style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Login page
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      {/* Spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>

      {/* Sidebar */}
      <div className="flex-shrink-0 flex flex-col ml-6 pb-6">
        {/* Titlebar drag region - matches main content */}
        <div className="h-12" style={{ WebkitAppRegion: 'drag' } as any} />

        <div
          className="w-52 flex flex-col pt-5 px-3 pb-3 gap-1 mt-2 flex-1"
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: '34px',
          }}
        >
          {/* App Icon + Name */}
          <div className="flex items-center gap-3 px-2 mb-2">
            <img
              src={appIcon}
              alt="Redash"
              className="w-9 h-9 rounded-full"
            />
            <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Redash</span>
          </div>

          {/* Navigation */}
          <button
            onClick={() => setCurrentPage('accounts')}
            className="w-full h-10 flex items-center gap-3 px-3 rounded-xl transition-colors"
            style={{
              background: currentPage === 'accounts' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: currentPage === 'accounts' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            }}
          >
            <Users size={20} weight={currentPage === 'accounts' ? 'fill' : 'regular'} />
            <span className="text-sm font-medium">Accounts</span>
          </button>

          <button
            onClick={() => setCurrentPage('flipper')}
            className="w-full h-10 flex items-center gap-3 px-3 rounded-xl transition-colors"
            style={{
              background: currentPage === 'flipper' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: currentPage === 'flipper' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            }}
          >
            <Swap size={20} weight={currentPage === 'flipper' ? 'fill' : 'regular'} />
            <span className="text-sm font-medium">Flipper</span>
          </button>

          <button
            onClick={() => setCurrentPage('ai')}
            className="w-full h-10 flex items-center gap-3 px-3 rounded-xl transition-colors"
            style={{
              background: currentPage === 'ai' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: currentPage === 'ai' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            }}
          >
            <Brain size={20} weight={currentPage === 'ai' ? 'fill' : 'regular'} />
            <span className="text-sm font-medium">AI</span>
          </button>

          {user?.role === 'admin' && (
            <>
              <button
                onClick={() => setCurrentPage('admin')}
                className="w-full h-10 flex items-center gap-3 px-3 rounded-xl transition-colors"
                style={{
                  background: currentPage === 'admin' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: currentPage === 'admin' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
              >
                <ShieldCheck size={20} weight={currentPage === 'admin' ? 'fill' : 'regular'} />
                <span className="text-sm font-medium">Admin</span>
              </button>
              <button
                onClick={() => setCurrentPage('stats')}
                className="w-full h-10 flex items-center gap-3 px-3 rounded-xl transition-colors"
                style={{
                  background: currentPage === 'stats' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: currentPage === 'stats' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
              >
                <ChartBar size={20} weight={currentPage === 'stats' ? 'fill' : 'regular'} />
                <span className="text-sm font-medium">Stats</span>
              </button>
            </>
          )}

          <button
            onClick={() => setCurrentPage('settings')}
            className="w-full h-10 flex items-center gap-3 px-3 rounded-xl transition-colors"
            style={{
              background: currentPage === 'settings' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: currentPage === 'settings' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            }}
          >
            <Gear size={20} weight={currentPage === 'settings' ? 'fill' : 'regular'} />
            <span className="text-sm font-medium">Settings</span>
          </button>

          {/* Theme toggle, User & Version at bottom */}
          <div className="mt-auto pt-4 px-1">
            <div className="flex items-center justify-between">
              <button
                onClick={toggleTheme}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-black/10"
                style={{ color: 'var(--text-tertiary)' }}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun size={18} weight="bold" /> : <Moon size={18} weight="bold" />}
              </button>
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:opacity-80"
                  style={{ background: 'var(--accent-blue)' }}
                  title={user?.username || 'Account'}
                >
                  <User size={16} weight="bold" color="white" />
                </button>
                {showUserMenu && (
                  <div className="absolute bottom-10 right-0 w-48 py-2 rounded-xl shadow-lg z-50" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{user?.username || 'User'}</p>
                    </div>
                    <button onClick={handleSignOut} className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-black/5" style={{ color: 'var(--accent-red)' }}>
                      <SignOut size={16} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="text-center mt-2">
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>v1.2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen ${activeBrowserProfile ? 'max-w-[50%]' : ''}`}>
        {/* Titlebar drag region */}
        <div className="titlebar h-12" style={{ WebkitAppRegion: 'drag' } as any} />

        {/* Notification */}
        {notification && (
          <div
            className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 text-sm font-medium rounded-full"
            style={{
              background: 'var(--accent-green)',
              color: '#fff',
              animation: 'slideDown 0.3s ease-out',
            }}
          >
            {notification}
          </div>
        )}

        {/* Page Content */}
        {currentPage === 'accounts' && (
          <main className={`pl-4 pb-6 flex-1 ${activeBrowserProfile ? 'pr-4' : 'pr-6'}`}>
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-5 mt-2 px-1">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Accounts
              </h1>
              {/* Toolbar buttons */}
              <div className="ml-auto flex items-center gap-2" ref={fabMenuRef}>
                {/* Refresh button */}
                <button
                  onClick={() => syncRedditKarma(true)}
                  disabled={isSyncing}
                  className="h-9 px-3 flex items-center gap-2 transition-colors"
                  style={{
                    background: 'var(--chip-bg)',
                    borderRadius: '100px',
                    color: 'var(--text-primary)',
                    opacity: isSyncing ? 0.5 : 1,
                  }}
                  title="Refresh karma from Reddit"
                >
                  <ArrowsClockwise
                    size={16}
                    weight="bold"
                    style={{
                      animation: isSyncing ? 'spin 1s linear infinite' : 'none',
                    }}
                  />
                  {lastSyncLabel && (
                    <span className="text-sm font-medium">{lastSyncLabel}</span>
                  )}
                </button>

                {/* New button */}
                <div className="relative">
                  <button
                    onClick={() => setShowFabMenu(!showFabMenu)}
                    className="h-9 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                    style={{
                      background: 'var(--btn-primary-bg)',
                      borderRadius: '100px',
                      color: 'var(--btn-primary-color)',
                    }}
                  >
                    <Plus
                      size={14}
                      weight="bold"
                      style={{
                        transform: showFabMenu ? 'rotate(45deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    />
                    New
                  </button>

                  {/* New menu dropdown */}
                  {showFabMenu && (
                    <div
                      className="absolute top-full right-0 mt-2 min-w-[160px] z-50 overflow-hidden"
                      style={{
                        background: 'var(--bg-tertiary)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                        borderRadius: '12px',
                      }}
                    >
                      {/* Basic users need assigned models to create browsers */}
                      {user?.role === 'admin' || availableModels.length > 0 ? (
                        <button
                          onClick={() => {
                            setShowFabMenu(false);
                            setShowCreateModal(true);
                          }}
                          className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-white/5 transition-colors"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          <User size={16} weight="bold" />
                          New Browser
                        </button>
                      ) : (
                        <div
                          className="px-3 py-2.5 text-sm"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          No models assigned
                        </div>
                      )}
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => {
                            setShowFabMenu(false);
                            setShowModelModal(true);
                          }}
                          className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-white/5 transition-colors"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          <FolderSimple size={16} weight="bold" />
                          New Model
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Browsers Section */}
            {desktopProfiles.length === 0 && models.length === 0 ? (
              <div className="rounded-xl p-12 text-center" style={{
                background: 'var(--bg-secondary)',
                border: '1px dashed var(--border-light)'
              }}>
                <Desktop size={32} weight="light" color="var(--text-tertiary)" className="mx-auto mb-3" />
                <p style={{ color: 'var(--text-tertiary)' }}>No browsers yet</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-ghost mt-3"
                >
                  Create your first browser
                </button>
              </div>
            ) : (
              <ProfileList
                profiles={desktopProfiles}
                models={availableModels}
                activeBrowsers={activeBrowsers}
                onLaunch={handleLaunchBrowser}
                onClose={handleCloseBrowser}
                onDelete={handleDeleteProfile}
                onEdit={setEditingProfile}
                onToggleComplete={handleToggleComplete}
                onToggleStatus={handleToggleStatus}
                onToggleEnabled={handleToggleEnabled}
                onRenameModel={setEditingModel}
                onDeleteModel={handleDeleteModel}
                onToggleModelExpand={handleToggleModelExpand}
                onCreateAccountInModel={(modelId) => {
                  setCreateInModelId(modelId);
                  setShowCreateModal(true);
                }}
              />
            )}
          </main>
        )}
        {currentPage === 'flipper' && <FlipperPage />}
        {currentPage === 'ai' && <AIPage />}
        {currentPage === 'settings' && <SettingsPage />}
        {currentPage === 'admin' && user?.role === 'admin' && (
          <AdminPage
            models={models}
            currentUserId={user.id}
            onCreateModel={handleAdminCreateModel}
            onUpdateModel={handleAdminUpdateModel}
            onDeleteModel={handleDeleteModel}
          />
        )}
        {currentPage === 'stats' && user?.role === 'admin' && (
          <StatsPage models={models} />
        )}
      </div>

      {/* Browser Panel - Right side */}
      {activeBrowserProfile && (
        <div
          className="flex-1 min-h-screen"
          style={{
            boxShadow: '-8px 0 32px var(--shadow-color)',
          }}
        >
          <BrowserPanel
            profileId={activeBrowserProfile.id}
            profileName={activeBrowserProfile.name}
            onClose={() => handleCloseBrowser(activeBrowserProfile.id)}
          />
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateProfileModal
          models={availableModels}
          initialModelId={createInModelId}
          requireModel={user?.role !== 'admin'}
          onClose={() => {
            setShowCreateModal(false);
            setCreateInModelId(undefined);
          }}
          onCreate={handleCreateProfile}
        />
      )}

      {/* Edit Modal */}
      {editingProfile && (
        <EditProfileModal
          profile={editingProfile}
          models={availableModels}
          onClose={() => setEditingProfile(null)}
          onSave={handleUpdateProfile}
        />
      )}

      {/* Create Model Modal */}
      {showModelModal && (
        <ModelModal
          mode="create"
          onClose={() => setShowModelModal(false)}
          onSave={handleCreateModel}
        />
      )}

      {/* Edit Model Modal */}
      {editingModel && (
        <ModelModal
          mode="edit"
          initialName={editingModel.name}
          initialProfilePicture={editingModel.profilePicture}
          onClose={() => setEditingModel(null)}
          onSave={handleUpdateModel}
        />
      )}
    </div>
  );
}

export default App;
