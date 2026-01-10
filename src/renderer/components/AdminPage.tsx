import { useState, useEffect, useRef } from 'react';
import { Plus, Trash, PencilSimple, Shield, X, Check, CaretDown, CaretRight, FolderSimple, Camera, User, ArrowsClockwise, DotsThree, ArrowCounterClockwise, ChartBar, Users, GenderFemale } from '@phosphor-icons/react';
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

type AdminTab = 'stats' | 'users' | 'models';

interface AdminPageProps {
  models: Model[];
  currentUserId: string;
  onCreateModel: (name: string, profilePicture?: string) => Promise<void>;
  onUpdateModel: (id: string, name: string, profilePicture?: string) => Promise<void>;
  onDeleteModel: (id: string) => Promise<void>;
  onCreateBrowser: () => void;
  onEditProfile: (profileId: string) => void;
  refreshTrigger?: number;
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

export default function AdminPage({
  models,
  currentUserId,
  onCreateModel,
  onUpdateModel,
  onDeleteModel,
  onCreateBrowser,
  onEditProfile,
  refreshTrigger
}: AdminPageProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('stats');

  // User management state
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userAssignments, setUserAssignments] = useState<Record<string, string[]>>({});

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'basic'>('basic');
  const [createError, setCreateError] = useState('');

  // Model management state
  const [showModelModal, setShowModelModal] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [newModelName, setNewModelName] = useState('');
  const [modelProfilePicture, setModelProfilePicture] = useState('');
  const [modelError, setModelError] = useState('');
  const modelFileInputRef = useRef<HTMLInputElement>(null);

  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'basic'>('basic');
  const [editError, setEditError] = useState('');

  // Stats state
  const [profiles, setProfiles] = useState<ProfileForStats[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [lastRefreshLabel, setLastRefreshLabel] = useState<string>('');
  const [showTrash, setShowTrash] = useState(false);
  const [deletedProfiles, setDeletedProfiles] = useState<Profile[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-menu="true"]')) return;
      if (openMenuId) setOpenMenuId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

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

  useEffect(() => {
    if (!lastRefreshTime) return;
    const updateLabel = () => setLastRefreshLabel(getRelativeTime(lastRefreshTime));
    updateLabel();
    const interval = setInterval(updateLabel, 10000);
    return () => clearInterval(interval);
  }, [lastRefreshTime]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      handleRefresh();
    }
  }, [refreshTrigger]);

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
      console.error('Failed to load data:', err);
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
      console.error('Failed to refresh data:', err);
    } finally {
      setRefreshing(false);
    }
  };

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
    return filtered.sort((a, b) => {
      const order = { working: 0, error: 1, banned: 2, unknown: 1 };
      const aOrder = order[a.status as keyof typeof order] ?? 1;
      const bOrder = order[b.status as keyof typeof order] ?? 1;
      return aOrder - bOrder;
    });
  };

  const calculateStats = () => {
    const stats: UserStats[] = users.map(user => {
      const userProfiles = profiles.filter(p => p.userId === user.id);
      const modelGroups = new Map<string | null, ProfileForStats[]>();

      userProfiles.forEach(profile => {
        const key = profile.modelId || null;
        if (!modelGroups.has(key)) {
          modelGroups.set(key, []);
        }
        modelGroups.get(key)!.push(profile);
      });

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

    stats.sort((a, b) => b.totalProfiles - a.totalProfiles);
    setUserStats(stats);

    const allModelKeys = new Set<string>();
    stats.forEach(({ user, modelStats }) => {
      modelStats.forEach(stat => {
        allModelKeys.add(`${user.id}-${stat.modelId || 'no-model'}`);
      });
    });
    setExpandedModels(allModelKeys);
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

  // User management handlers
  const loadUserAssignments = async (userId: string) => {
    try {
      const assignments = await window.electronAPI?.adminGetUserModelAssignments(userId);
      setUserAssignments(prev => ({ ...prev, [userId]: assignments || [] }));
    } catch (err) {
      console.error('Failed to load user assignments:', err);
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername.trim()) {
      setCreateError('Username is required');
      return;
    }
    if (newPassword.length < 6) {
      setCreateError('Password must be at least 6 characters');
      return;
    }

    try {
      await window.electronAPI?.adminCreateUser(newUsername, newPassword, newRole);
      await loadData();
      setShowCreateModal(false);
      setNewUsername('');
      setNewPassword('');
      setNewRole('basic');
      setCreateError('');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    const updates: any = {};
    if (editUsername.trim() && editUsername !== editingUser.username) {
      updates.username = editUsername;
    }
    if (editPassword.length > 0) {
      if (editPassword.length < 6) {
        setEditError('Password must be at least 6 characters');
        return;
      }
      updates.password = editPassword;
    }
    if (editRole !== editingUser.role) {
      updates.role = editRole;
    }

    if (Object.keys(updates).length === 0) {
      setEditingUser(null);
      return;
    }

    try {
      await window.electronAPI?.adminUpdateUser(editingUser.id, updates);
      await loadData();
      setEditingUser(null);
      setEditError('');
    } catch (err: any) {
      setEditError(err.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUserId) {
      alert('You cannot delete yourself!');
      return;
    }
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await window.electronAPI?.adminDeleteUser(userId);
      await loadData();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const handleToggleUserExpand = async (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
      if (!userAssignments[userId]) {
        await loadUserAssignments(userId);
      }
    }
  };

  const handleToggleModelAssignment = async (userId: string, modelId: string) => {
    const current = userAssignments[userId] || [];
    const newAssignments = current.includes(modelId)
      ? current.filter(id => id !== modelId)
      : [...current, modelId];

    try {
      await window.electronAPI?.adminSetUserModelAssignments(userId, newAssignments);
      setUserAssignments(prev => ({ ...prev, [userId]: newAssignments }));
    } catch (err) {
      console.error('Failed to update assignments:', err);
    }
  };

  const openEditModal = (user: AppUser) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditPassword('');
    setEditRole(user.role);
    setEditError('');
  };

  // Model handlers
  const handleModelImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 150;
        let { width, height } = img;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height / width) * maxSize);
            width = maxSize;
          } else {
            width = Math.round((width / height) * maxSize);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setModelProfilePicture(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          setModelProfilePicture(result);
        }
      };
      img.onerror = () => setModelProfilePicture(result);
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleCreateModel = async () => {
    if (!newModelName.trim()) {
      setModelError('Model name is required');
      return;
    }
    try {
      await onCreateModel(newModelName.trim(), modelProfilePicture || undefined);
      setShowModelModal(false);
      setNewModelName('');
      setModelProfilePicture('');
      setModelError('');
    } catch (err: any) {
      setModelError(err.message || 'Failed to create model');
    }
  };

  const handleUpdateModel = async () => {
    if (!editingModel) return;
    if (!newModelName.trim()) {
      setModelError('Model name is required');
      return;
    }
    try {
      await onUpdateModel(editingModel.id, newModelName.trim(), modelProfilePicture || undefined);
      setEditingModel(null);
      setNewModelName('');
      setModelProfilePicture('');
      setModelError('');
    } catch (err: any) {
      setModelError(err.message || 'Failed to update model');
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model? All browsers in this model will become unassigned.')) return;
    try {
      await onDeleteModel(modelId);
    } catch (err) {
      console.error('Failed to delete model:', err);
    }
  };

  const openModelEditModal = (model: Model) => {
    setEditingModel(model);
    setNewModelName(model.name);
    setModelProfilePicture(model.profilePicture || '');
    setModelError('');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
      </div>
    );
  }

  return (
    <main className="flex-1 p-6">
      {/* Header with Segmented Control */}
      <div className="flex items-center justify-between mb-6">
        <div
          className="inline-flex p-1 gap-1"
          style={{ background: 'var(--chip-bg)', borderRadius: '100px' }}
        >
          <button
            onClick={() => setActiveTab('stats')}
            className="px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors"
            style={{
              borderRadius: '100px',
              background: activeTab === 'stats' ? 'var(--bg-secondary)' : 'transparent',
              color: activeTab === 'stats' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: activeTab === 'stats' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <ChartBar size={16} weight="bold" />
            Stats
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className="px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors"
            style={{
              borderRadius: '100px',
              background: activeTab === 'users' ? 'var(--bg-secondary)' : 'transparent',
              color: activeTab === 'users' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: activeTab === 'users' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <Users size={16} weight="bold" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className="px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors"
            style={{
              borderRadius: '100px',
              background: activeTab === 'models' ? 'var(--bg-secondary)' : 'transparent',
              color: activeTab === 'models' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: activeTab === 'models' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <GenderFemale size={16} weight="bold" />
            Models
          </button>
        </div>

        {/* Action buttons based on tab */}
        <div className="flex items-center gap-2">
          {activeTab === 'stats' && (
            <>
              <button
                onClick={handleOpenTrash}
                className="h-9 px-3 flex items-center gap-2 transition-colors"
                style={{ background: 'var(--chip-bg)', borderRadius: '100px', color: 'var(--text-primary)' }}
              >
                <Trash size={16} weight="bold" />
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="h-9 px-3 flex items-center gap-2 transition-colors"
                style={{ background: 'var(--chip-bg)', borderRadius: '100px', color: 'var(--text-primary)', opacity: refreshing ? 0.5 : 1 }}
              >
                <ArrowsClockwise size={16} weight="bold" style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                {lastRefreshLabel && <span className="text-sm font-medium">{lastRefreshLabel}</span>}
              </button>
            </>
          )}
          {activeTab === 'users' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="h-9 px-4 flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ background: 'var(--btn-primary-bg)', borderRadius: '100px', color: 'var(--btn-primary-color)' }}
            >
              <Plus size={14} weight="bold" />
              New User
            </button>
          )}
          {activeTab === 'models' && (
            <button
              onClick={() => { setShowModelModal(true); setNewModelName(''); setModelError(''); }}
              className="h-9 px-4 flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ background: 'var(--btn-primary-bg)', borderRadius: '100px', color: 'var(--btn-primary-color)' }}
            >
              <Plus size={14} weight="bold" />
              New Model
            </button>
          )}
        </div>
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-3">
          {userStats.length === 0 ? (
            <div className="p-12 text-center" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
              <User size={32} weight="light" color="var(--text-tertiary)" className="mx-auto mb-3" />
              <p style={{ color: 'var(--text-tertiary)' }}>No data yet</p>
            </div>
          ) : (
            userStats.map(({ user, modelStats, totalProfiles }) => (
              <div key={user.id} style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
                <div className="flex items-center gap-3 p-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: getAvatarColor(user.username) }}
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{user.username}</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: user.role === 'admin' ? 'rgba(147, 112, 219, 0.2)' : 'var(--chip-bg)',
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
                  <button
                    onClick={onCreateBrowser}
                    className="h-9 px-3 flex items-center gap-2 transition-colors"
                    style={{ background: 'var(--chip-bg)', borderRadius: '100px', color: 'var(--text-primary)' }}
                  >
                    <Plus size={16} weight="bold" />
                  </button>
                </div>

                {modelStats.length > 0 && (
                  <div className="px-4 pb-4">
                    <div style={{ background: 'rgba(128, 128, 128, 0.06)', borderRadius: '20px', overflow: 'hidden' }}>
                      <div
                        className="grid text-xs font-medium py-4 px-5"
                        style={{ gridTemplateColumns: '1fr repeat(5, 90px) 50px', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}
                      >
                        <div>Model</div>
                        <div className="text-center">Posts</div>
                        <div className="text-center">Comments</div>
                        <div className="text-center">Karma</div>
                        <div className="text-center">Status</div>
                        <div className="text-center">Renew</div>
                        <div></div>
                      </div>

                      {modelStats.map((stat, index) => {
                        const modelKey = `${user.id}-${stat.modelId || 'no-model'}`;
                        const isExpanded = expandedModels.has(modelKey);
                        const modelProfiles = getProfilesForModel(user.id, stat.modelId);

                        return (
                          <div key={stat.modelId || 'no-model'}>
                            <div
                              className="grid py-4 px-5 items-center cursor-pointer hover:bg-white/5 transition-colors"
                              style={{ gridTemplateColumns: '1fr repeat(5, 90px) 50px', borderBottom: !isExpanded && index < modelStats.length - 1 ? '1px solid var(--border)' : 'none' }}
                              onClick={() => toggleModelExpand(modelKey)}
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? <CaretDown size={14} weight="bold" style={{ color: 'var(--text-tertiary)' }} /> : <CaretRight size={14} weight="bold" style={{ color: 'var(--text-tertiary)' }} />}
                                <FolderSimple size={16} weight="bold" style={{ color: 'var(--text-tertiary)' }} />
                                <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{stat.modelName}</span>
                              </div>
                              <div className="text-center text-sm font-medium" style={{ color: stat.postsToday > 0 ? 'var(--accent-green)' : 'var(--text-tertiary)' }}>{stat.postsToday}</div>
                              <div className="text-center text-sm font-medium" style={{ color: stat.commentsToday > 0 ? 'var(--accent-green)' : 'var(--text-tertiary)' }}>{stat.commentsToday}</div>
                              <div className="text-center text-sm font-medium" style={{ color: stat.totalKarma > 0 ? 'var(--accent-blue)' : 'var(--text-tertiary)' }}>{stat.totalKarma > 0 ? stat.totalKarma.toLocaleString() : '-'}</div>
                              <div className="text-center text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>{stat.working}/{stat.total}</div>
                              <div className="text-center text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>{stat.enabled}/{stat.total}</div>
                              <div></div>
                            </div>

                            {isExpanded && (
                              <div style={{ borderBottom: index < modelStats.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                {modelProfiles.map((profile, pIndex) => {
                                  const karma = (profile.commentKarma || 0) + (profile.postKarma || 0);
                                  return (
                                    <div
                                      key={profile.id}
                                      className="grid py-3 px-5 pl-12 items-center"
                                      style={{ gridTemplateColumns: '1fr repeat(5, 90px) 50px', borderBottom: pIndex < modelProfiles.length - 1 ? '1px solid rgba(128, 128, 128, 0.1)' : 'none' }}
                                    >
                                      <div className="flex items-center gap-2">
                                        {profile.country && countryFlagImages[profile.country] && (
                                          <img src={countryFlagImages[profile.country]} alt={profile.country} className="w-4 h-4 object-contain rounded-sm" />
                                        )}
                                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{profile.name}</span>
                                      </div>
                                      <div className="text-center text-sm" style={{ color: (profile.postsToday || 0) > 0 ? 'var(--accent-green)' : 'var(--text-tertiary)' }}>{profile.postsToday || 0}</div>
                                      <div className="text-center text-sm" style={{ color: (profile.commentsToday || 0) > 0 ? 'var(--accent-green)' : 'var(--text-tertiary)' }}>{profile.commentsToday || 0}</div>
                                      <div className="text-center text-sm" style={{ color: karma > 0 ? 'var(--accent-blue)' : 'var(--text-tertiary)' }}>{karma > 0 ? karma.toLocaleString() : '-'}</div>
                                      <div className="flex justify-center">
                                        {profile.status === 'working' && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(76, 175, 80, 0.15)', color: '#4CAF50' }}>Working</span>}
                                        {profile.status === 'banned' && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(244, 67, 54, 0.15)', color: '#F44336' }}>Banned</span>}
                                        {profile.status === 'error' && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255, 152, 0, 0.15)', color: '#FF9800' }}>Error</span>}
                                        {(!profile.status || profile.status === 'unknown') && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--chip-bg)', color: 'var(--text-tertiary)' }}>Unknown</span>}
                                      </div>
                                      <div className="flex justify-center items-center">
                                        {profile.expiresAt ? (
                                          <span
                                            className="text-xs px-2 py-0.5 rounded-full"
                                            style={{
                                              background: (() => {
                                                const days = Math.ceil((new Date(profile.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                                if (days <= 0) return 'rgba(244, 67, 54, 0.15)';
                                                if (days <= 7) return 'rgba(255, 152, 0, 0.15)';
                                                return 'rgba(59, 130, 246, 0.15)';
                                              })(),
                                              color: (() => {
                                                const days = Math.ceil((new Date(profile.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                                if (days <= 0) return '#F44336';
                                                if (days <= 7) return '#FF9800';
                                                return '#3B82F6';
                                              })()
                                            }}
                                          >
                                            {(() => {
                                              const days = Math.ceil((new Date(profile.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                              if (days <= 0) return 'Expired';
                                              return `${days}d`;
                                            })()}
                                          </span>
                                        ) : (
                                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>-</span>
                                        )}
                                      </div>
                                      <div className="flex justify-center">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setMenuPosition({ x: rect.right - 120, y: rect.bottom + 4 });
                                            setOpenMenuId(openMenuId === profile.id ? null : profile.id);
                                          }}
                                          className="p-1 rounded hover:bg-white/10 transition-colors"
                                          style={{ color: 'var(--text-tertiary)' }}
                                        >
                                          <DotsThree size={18} weight="bold" />
                                        </button>
                                        {openMenuId === profile.id && (
                                          <div
                                            data-menu="true"
                                            className="fixed py-1 z-[9999]"
                                            style={{ left: menuPosition.x, top: menuPosition.y, background: 'var(--bg-secondary)', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', minWidth: '120px' }}
                                          >
                                            <button
                                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); onEditProfile(profile.id); }}
                                              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10 transition-colors"
                                              style={{ color: 'var(--text-primary)' }}
                                            >
                                              <PencilSimple size={14} />
                                              Edit
                                            </button>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleDeleteProfile(profile.id); }}
                                              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10 transition-colors"
                                              style={{ color: '#F44336' }}
                                            >
                                              <Trash size={14} />
                                              Delete
                                            </button>
                                          </div>
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

                      {modelStats.length > 1 && (
                        <div
                          className="grid py-4 px-5 items-center"
                          style={{ gridTemplateColumns: '1fr repeat(6, 90px) 50px', background: 'rgba(128, 128, 128, 0.04)', borderTop: '1px solid var(--border)' }}
                        >
                          <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Total</div>
                          <div className="text-center text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{modelStats.reduce((sum, m) => sum + m.total, 0)}</div>
                          <div className="text-center text-sm font-bold" style={{ color: 'var(--accent-green)' }}>{modelStats.reduce((sum, m) => sum + m.postsToday, 0)}</div>
                          <div className="text-center text-sm font-bold" style={{ color: 'var(--accent-green)' }}>{modelStats.reduce((sum, m) => sum + m.commentsToday, 0)}</div>
                          <div className="text-center text-sm font-bold" style={{ color: 'var(--accent-blue)' }}>{modelStats.reduce((sum, m) => sum + m.totalKarma, 0).toLocaleString()}</div>
                          <div className="text-center text-sm font-bold" style={{ color: 'var(--text-tertiary)' }}>{modelStats.reduce((sum, m) => sum + m.working, 0)}/{modelStats.reduce((sum, m) => sum + m.total, 0)}</div>
                          <div className="text-center text-sm font-bold" style={{ color: 'var(--text-tertiary)' }}>{modelStats.reduce((sum, m) => sum + m.enabled, 0)}/{modelStats.reduce((sum, m) => sum + m.total, 0)}</div>
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
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-2">
          {users.length === 0 ? (
            <div className="p-12 text-center" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
              <User size={32} weight="light" color="var(--text-tertiary)" className="mx-auto mb-3" />
              <p style={{ color: 'var(--text-tertiary)' }}>No users yet</p>
            </div>
          ) : (
            users.map(user => (
              <div key={user.id} className="overflow-hidden" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
                <div className="flex items-center gap-3 p-4">
                  <button onClick={() => handleToggleUserExpand(user.id)} className="p-1 hover:opacity-70" style={{ color: 'var(--text-tertiary)' }}>
                    {expandedUser === user.id ? <CaretDown size={16} /> : <CaretRight size={16} />}
                  </button>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: getAvatarColor(user.username) }}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{user.username}</span>
                      {user.id === currentUserId && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-green)', color: 'white' }}>You</span>}
                    </div>
                    <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{user.role === 'admin' ? 'Administrator' : 'Basic User'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEditModal(user)} className="p-2 rounded-lg hover:bg-black/10" style={{ color: 'var(--text-tertiary)' }}><PencilSimple size={18} /></button>
                    {user.id !== currentUserId && <button onClick={() => handleDeleteUser(user.id)} className="p-2 rounded-lg hover:bg-black/10" style={{ color: 'var(--accent-red)' }}><Trash size={18} /></button>}
                  </div>
                </div>

                {expandedUser === user.id && user.role === 'basic' && (
                  <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Assigned Models</p>
                    {models.length === 0 ? (
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No models available. Create models first.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {models.map(model => {
                          const isAssigned = (userAssignments[user.id] || []).includes(model.id);
                          return (
                            <button
                              key={model.id}
                              onClick={() => handleToggleModelAssignment(user.id, model.id)}
                              className="h-9 px-4 rounded-full text-sm font-medium transition-colors flex items-center gap-2"
                              style={{ background: isAssigned ? 'var(--accent-blue)' : 'var(--chip-bg)', color: isAssigned ? 'white' : 'var(--text-secondary)' }}
                            >
                              {model.name}
                              {isAssigned && <Check size={14} weight="bold" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {expandedUser === user.id && user.role === 'admin' && (
                  <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Full Access to All Models</p>
                    {models.length === 0 ? (
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No models created yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {models.map(model => (
                          <div
                            key={model.id}
                            className="h-9 px-4 rounded-full text-sm font-medium flex items-center gap-2"
                            style={{ background: 'var(--accent-blue)', color: 'white' }}
                          >
                            {model.name}
                            <Check size={14} weight="bold" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Models Tab */}
      {activeTab === 'models' && (
        <div className="space-y-2">
          {models.length === 0 ? (
            <div className="p-8 text-center" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
              <FolderSimple size={32} weight="light" color="var(--text-tertiary)" className="mx-auto mb-3" />
              <p style={{ color: 'var(--text-tertiary)' }}>No models yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Create models to organize browsers and assign to users</p>
            </div>
          ) : (
            models.map(model => (
              <div key={model.id} className="flex items-center gap-3 p-4" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden" style={{ background: 'var(--chip-bg)' }}>
                  {model.profilePicture ? <img src={model.profilePicture} alt={model.name} className="w-full h-full object-cover" /> : <FolderSimple size={20} weight="bold" style={{ color: 'var(--text-secondary)' }} />}
                </div>
                <div className="flex-1">
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{model.name}</span>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Created {new Date(model.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openModelEditModal(model)} className="p-2 rounded-lg hover:bg-black/10" style={{ color: 'var(--text-tertiary)' }}><PencilSimple size={18} /></button>
                  <button onClick={() => handleDeleteModel(model.id)} className="p-2 rounded-lg hover:bg-black/10" style={{ color: 'var(--accent-red)' }}><Trash size={18} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md p-6" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Create User</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ color: 'var(--text-tertiary)' }}><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Username</label>
                <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full h-10 px-3 rounded-lg text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} placeholder="Enter username" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Password</label>
                <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full h-10 px-3 rounded-lg text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} placeholder="Min 6 characters" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Role</label>
                <div className="flex gap-2">
                  <button onClick={() => setNewRole('basic')} className="flex-1 h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-2" style={{ background: newRole === 'basic' ? 'var(--accent-blue)' : 'var(--chip-bg)', color: newRole === 'basic' ? 'white' : 'var(--text-secondary)' }}><User size={16} /> Basic</button>
                  <button onClick={() => setNewRole('admin')} className="flex-1 h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-2" style={{ background: newRole === 'admin' ? 'var(--accent-blue)' : 'var(--chip-bg)', color: newRole === 'admin' ? 'white' : 'var(--text-secondary)' }}><Shield size={16} /> Admin</button>
                </div>
              </div>
              {createError && <p className="text-sm" style={{ color: 'var(--accent-red)' }}>{createError}</p>}
              <button onClick={handleCreateUser} className="w-full h-10 rounded-lg text-sm font-medium" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-color)' }}>Create User</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md p-6" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Edit User</h2>
              <button onClick={() => setEditingUser(null)} style={{ color: 'var(--text-tertiary)' }}><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Username</label>
                <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-full h-10 px-3 rounded-lg text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>New Password (leave blank to keep current)</label>
                <input type="text" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="w-full h-10 px-3 rounded-lg text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} placeholder="Min 6 characters" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Role</label>
                <div className="flex gap-2">
                  <button onClick={() => setEditRole('basic')} className="flex-1 h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-2" style={{ background: editRole === 'basic' ? 'var(--accent-blue)' : 'var(--chip-bg)', color: editRole === 'basic' ? 'white' : 'var(--text-secondary)' }}><User size={16} /> Basic</button>
                  <button onClick={() => setEditRole('admin')} disabled={editingUser.id === currentUserId} className="flex-1 h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-2" style={{ background: editRole === 'admin' ? 'var(--accent-blue)' : 'var(--chip-bg)', color: editRole === 'admin' ? 'white' : 'var(--text-secondary)', opacity: editingUser.id === currentUserId ? 0.5 : 1 }}><Shield size={16} /> Admin</button>
                </div>
                {editingUser.id === currentUserId && <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>You cannot change your own role</p>}
              </div>
              {editError && <p className="text-sm" style={{ color: 'var(--accent-red)' }}>{editError}</p>}
              <button onClick={handleUpdateUser} className="w-full h-10 rounded-lg text-sm font-medium" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-color)' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Model Modal */}
      {(showModelModal || editingModel) && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md p-6" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{editingModel ? 'Edit Model' : 'Create Model'}</h2>
              <button onClick={() => { setShowModelModal(false); setEditingModel(null); setNewModelName(''); setModelProfilePicture(''); setModelError(''); }} style={{ color: 'var(--text-tertiary)' }}><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 cursor-pointer" onClick={() => modelFileInputRef.current?.click()}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden relative group" style={{ background: 'var(--bg-tertiary)' }}>
                  {modelProfilePicture ? <img src={modelProfilePicture} alt="Model" className="w-full h-full object-cover" /> : <User size={28} weight="bold" color="var(--text-tertiary)" />}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full" style={{ background: 'rgba(0, 0, 0, 0.5)' }}><Camera size={20} weight="bold" color="white" /></div>
                </div>
                <input ref={modelFileInputRef} type="file" accept="image/*" onChange={handleModelImageUpload} className="hidden" />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Profile Picture</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Click to upload</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Model Name</label>
                <input type="text" value={newModelName} onChange={(e) => setNewModelName(e.target.value)} className="w-full h-10 px-3 rounded-lg text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} placeholder="Enter model name" autoFocus />
              </div>
              {modelError && <p className="text-sm" style={{ color: 'var(--accent-red)' }}>{modelError}</p>}
              <button onClick={editingModel ? handleUpdateModel : handleCreateModel} className="w-full h-10 rounded-lg text-sm font-medium" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-color)' }}>{editingModel ? 'Save Changes' : 'Create Model'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Trash Modal */}
      {showTrash && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-2xl max-h-[80vh] flex flex-col" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <Trash size={24} weight="bold" style={{ color: 'var(--text-primary)' }} />
                <div>
                  <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Trash</h2>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Items are permanently deleted after 30 days</p>
                </div>
              </div>
              <button onClick={() => setShowTrash(false)} style={{ color: 'var(--text-tertiary)' }}><X size={24} /></button>
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
                      <div key={profile.id} className="flex items-center gap-3 p-4" style={{ background: 'var(--bg-tertiary)', borderRadius: '16px' }}>
                        {profile.country && countryFlagImages[profile.country] && <img src={countryFlagImages[profile.country]} alt={profile.country} className="w-5 h-5 object-contain rounded-sm" />}
                        <div className="flex-1">
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{profile.name}</span>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{daysLeft} days remaining</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleRestoreProfile(profile.id)} className="h-8 px-3 flex items-center gap-1 text-sm font-medium rounded-full transition-colors" style={{ background: 'rgba(76, 175, 80, 0.15)', color: '#4CAF50' }}><ArrowCounterClockwise size={14} weight="bold" /> Restore</button>
                          <button onClick={() => handlePermanentDelete(profile.id)} className="h-8 px-3 flex items-center gap-1 text-sm font-medium rounded-full transition-colors" style={{ background: 'rgba(244, 67, 54, 0.15)', color: '#F44336' }}><Trash size={14} weight="bold" /> Delete</button>
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
