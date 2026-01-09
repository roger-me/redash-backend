import { useState, useEffect, useRef } from 'react';
import { Profile, Model } from '../shared/types';
import ProfileList from './components/ProfileList';
import CreateProfileModal from './components/CreateProfileModal';
import EditProfileModal from './components/EditProfileModal';
import ModelModal from './components/ModelModal';
import FlipperPage from './components/FlipperPage';
import appIcon from './assets/icon.png';
import { ArrowsClockwise, Plus, User, FolderSimple, Desktop, Users, Swap } from '@phosphor-icons/react';

type Page = 'accounts' | 'flipper';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('accounts');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [activeBrowsers, setActiveBrowsers] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const fabMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

    // Close FAB menu when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (fabMenuRef.current && !fabMenuRef.current.contains(e.target as Node)) {
        setShowFabMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


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
      const data = await window.electronAPI?.listModels();
      setModels(data || []);
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
            await window.electronAPI?.updateProfile(profile.id, {
              commentKarma: karma.commentKarma,
              postKarma: karma.postKarma,
            });
            syncedCount++;
          }
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
      await window.electronAPI?.launchBrowser(profileId);
      setActiveBrowsers(prev => [...prev, profileId]);
    } catch (err) {
      console.error('Failed to launch browser:', err);
      alert('Failed to launch browser: ' + (err as Error).message);
    }
  };

  const handleCloseBrowser = async (profileId: string) => {
    try {
      await window.electronAPI?.closeBrowser(profileId);
      setActiveBrowsers(prev => prev.filter(id => id !== profileId));
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

  const handleCreateModel = async (name: string) => {
    try {
      await window.electronAPI?.createModel({ name, isExpanded: true });
      await loadModels();
      setShowModelModal(false);
    } catch (err) {
      console.error('Failed to create model:', err);
    }
  };

  const handleRenameModel = async (name: string) => {
    if (!editingModel) return;
    try {
      await window.electronAPI?.updateModel(editingModel.id, { name });
      await loadModels();
      setEditingModel(null);
    } catch (err) {
      console.error('Failed to rename model:', err);
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
      <div
        className="w-16 flex-shrink-0 flex flex-col items-center py-4 gap-2 m-3 mr-0"
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '34px',
        }}
      >
        {/* Titlebar drag region */}
        <div className="h-6 w-full" style={{ WebkitAppRegion: 'drag' } as any} />

        {/* App Icon */}
        <img
          src={appIcon}
          alt="Redash"
          className="w-8 h-8 rounded-full mb-4"
        />

        {/* Navigation */}
        <button
          onClick={() => setCurrentPage('accounts')}
          className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors"
          style={{
            background: currentPage === 'accounts' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            color: currentPage === 'accounts' ? 'var(--text-primary)' : 'var(--text-tertiary)',
          }}
          title="Accounts"
        >
          <Users size={22} weight={currentPage === 'accounts' ? 'fill' : 'regular'} />
        </button>

        <button
          onClick={() => setCurrentPage('flipper')}
          className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors"
          style={{
            background: currentPage === 'flipper' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            color: currentPage === 'flipper' ? 'var(--text-primary)' : 'var(--text-tertiary)',
          }}
          title="Flipper"
        >
          <Swap size={22} weight={currentPage === 'flipper' ? 'fill' : 'regular'} />
        </button>

        {/* Version at bottom */}
        <div className="mt-auto">
          <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
            v1.2
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
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
        {currentPage === 'accounts' ? (
          <main className="px-6 pb-6 flex-1">
            {/* Toolbar */}
            <div
              className="flex items-center gap-3 mb-5 mt-2 px-4 py-3"
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: '100px',
              }}
            >
              <h1 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Accounts
              </h1>
              {/* Toolbar buttons */}
              <div className="ml-auto flex items-center gap-2" ref={fabMenuRef}>
                {/* Refresh button */}
                <button
                  onClick={() => syncRedditKarma(true)}
                  disabled={isSyncing}
                  className="p-2 transition-colors hover:bg-white/10"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '100px',
                    color: 'var(--text-tertiary)',
                    opacity: isSyncing ? 0.5 : 1,
                  }}
                  title="Refresh karma from Reddit"
                >
                  <ArrowsClockwise
                    size={18}
                    weight="bold"
                    style={{
                      animation: isSyncing ? 'spin 1s linear infinite' : 'none',
                    }}
                  />
                </button>

                {/* New button */}
                <div className="relative">
                  <button
                    onClick={() => setShowFabMenu(!showFabMenu)}
                    className="h-9 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                    style={{
                      background: '#fff',
                      borderRadius: '100px',
                      color: '#000',
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
                      className="absolute top-full right-0 mt-2 py-1 min-w-[160px] z-50"
                      style={{
                        background: 'var(--bg-tertiary)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                        borderRadius: '12px',
                      }}
                    >
                      <button
                        onClick={() => {
                          setShowFabMenu(false);
                          setShowCreateModal(true);
                        }}
                        className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-white/5 transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <User size={16} weight="bold" />
                        New Account
                      </button>
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
                models={models}
                activeBrowsers={activeBrowsers}
                onLaunch={handleLaunchBrowser}
                onClose={handleCloseBrowser}
                onDelete={handleDeleteProfile}
                onEdit={setEditingProfile}
                onToggleComplete={handleToggleComplete}
                onRenameModel={setEditingModel}
                onDeleteModel={handleDeleteModel}
                onToggleModelExpand={handleToggleModelExpand}
              />
            )}
          </main>
        ) : (
          <FlipperPage />
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateProfileModal
          models={models}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProfile}
        />
      )}

      {/* Edit Modal */}
      {editingProfile && (
        <EditProfileModal
          profile={editingProfile}
          models={models}
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
          onClose={() => setEditingModel(null)}
          onSave={handleRenameModel}
        />
      )}
    </div>
  );
}

export default App;
