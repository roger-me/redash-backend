import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash, PencilSimple, Shield, X, Check, CaretDown, CaretRight, CaretLeft, FolderSimple, Camera, User, ArrowsClockwise, DotsThree, ArrowCounterClockwise, ChartBar, Users, Smiley, EnvelopeSimple, Copy, UserList, Code, Table, Shuffle, Lock, Archive, UserSwitch } from '@phosphor-icons/react';
import { Model, AppUser, ProfileForStats, Profile, MainEmail, SubEmail, UserRole } from '../../shared/types';
import { useLanguage } from '../i18n';

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

type AdminTab = 'accounts' | 'users' | 'models' | 'emails';

interface AdminPageProps {
  models: Model[];
  currentUserId: string;
  currentUserRole: UserRole;
  onCreateModel: (name: string, profilePicture?: string, onlyfans?: string, contentFolder?: string) => Promise<void>;
  onUpdateModel: (id: string, name: string, profilePicture?: string, onlyfans?: string, contentFolder?: string) => Promise<void>;
  onDeleteModel: (id: string) => Promise<void>;
  onCreateBrowser: (userId?: string) => void;
  onEditProfile: (profileId: string) => void;
  onSyncKarma: () => Promise<void>;
  onProfilesChanged?: () => void;
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
  totalPosts: number;
  totalComments: number;
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
  currentUserRole,
  onCreateModel,
  onUpdateModel,
  onDeleteModel,
  onCreateBrowser,
  onEditProfile,
  onSyncKarma,
  onProfilesChanged,
  refreshTrigger
}: AdminPageProps) {
  const canDelete = currentUserRole === 'dev';
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<AdminTab>('accounts');

  // User management state
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userAssignments, setUserAssignments] = useState<Record<string, string[]>>({});

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('basic');
  const [newUserModels, setNewUserModels] = useState<string[]>([]);
  const [createError, setCreateError] = useState('');

  // Model management state
  const [showModelModal, setShowModelModal] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [newModelName, setNewModelName] = useState('');
  const [modelProfilePicture, setModelProfilePicture] = useState('');
  const [modelOnlyfans, setModelOnlyfans] = useState('');
  const [modelContentFolder, setModelContentFolder] = useState('');
  const [modelError, setModelError] = useState('');
  const modelFileInputRef = useRef<HTMLInputElement>(null);

  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('basic');
  const [editUserModels, setEditUserModels] = useState<string[]>([]);
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
  const [showArchived, setShowArchived] = useState(false);
  const [archivedProfiles, setArchivedProfiles] = useState<Profile[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [syncing, setSyncing] = useState(false);
  const [showMoveSubmenu, setShowMoveSubmenu] = useState<string | null>(null);

  // Email management state
  const [mainEmails, setMainEmails] = useState<MainEmail[]>([]);
  const [subEmails, setSubEmails] = useState<SubEmail[]>([]);
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  const [showMainEmailModal, setShowMainEmailModal] = useState(false);
  const [editingMainEmail, setEditingMainEmail] = useState<MainEmail | null>(null);
  const [showSubEmailModal, setShowSubEmailModal] = useState(false);
  const [editingSubEmail, setEditingSubEmail] = useState<SubEmail | null>(null);
  const [addingSubEmailTo, setAddingSubEmailTo] = useState<string | null>(null);
  const [selectedProfileForSubEmail, setSelectedProfileForSubEmail] = useState<string | null>(null);
  const [newMainEmail, setNewMainEmail] = useState('');
  const [newMainPassword, setNewMainPassword] = useState('');
  const [newSubEmail, setNewSubEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [emailMenuOpen, setEmailMenuOpen] = useState<string | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-menu="true"]')) return;
      if (openMenuId) setOpenMenuId(null);
      if (emailMenuOpen) setEmailMenuOpen(null);
      if (showMoveSubmenu) setShowMoveSubmenu(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId, emailMenuOpen, showMoveSubmenu]);

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

  const generatePassword = (): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
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

  // Auto-refresh every 2 minutes when on stats tab
  useEffect(() => {
    if (activeTab !== 'accounts') return;

    const autoRefreshInterval = setInterval(() => {
      if (!syncing && !refreshing) {
        handleRefresh();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(autoRefreshInterval);
  }, [activeTab, syncing, refreshing]);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      handleRefresh();
    }
  }, [refreshTrigger]);

  // Load user assignments for all users when users are loaded
  useEffect(() => {
    if (users.length > 0) {
      users.forEach(user => {
        if (!userAssignments[user.id]) {
          loadUserAssignments(user.id);
        }
      });
    }
  }, [users]);

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

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      // First sync Reddit karma
      await onSyncKarma();
      // Then sync to Google Sheet
      const result = await window.electronAPI?.sheetsSyncAll();
      if (result?.success) {
        // Refresh the data after syncing
        await handleRefresh();
      } else {
        alert('Sheet sync failed: ' + (result?.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to sync:', err);
      alert('Sync failed');
    } finally {
      setSyncing(false);
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

  const calculateStats = useCallback(() => {
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
        const totalPosts = groupProfiles.reduce((sum, p) => sum + ((p as any).totalPosts || 0), 0);
        const totalComments = groupProfiles.reduce((sum, p) => sum + ((p as any).totalComments || 0), 0);
        const karma = groupProfiles.reduce((sum, p) => sum + (p.commentKarma || 0) + (p.postKarma || 0), 0);

        totalPostsToday += postsToday;
        totalCommentsToday += commentsToday;
        totalKarma += karma;

        modelStats.push({
          modelId,
          modelName: model?.name || t('profile.noModel'),
          total: groupProfiles.length,
          working: groupProfiles.filter(p => p.status === 'working').length,
          banned: groupProfiles.filter(p => p.status === 'banned').length,
          error: groupProfiles.filter(p => p.status === 'error').length,
          enabled: groupProfiles.filter(p => p.isEnabled === true).length,
          disabled: groupProfiles.filter(p => p.isEnabled !== true).length,
          totalKarma: karma,
          postsToday,
          commentsToday,
          totalPosts,
          totalComments,
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
  }, [users, profiles, models, t]);

  // Recalculate stats when profiles change
  useEffect(() => {
    if (users.length > 0 && profiles.length >= 0) {
      calculateStats();
    }
  }, [users, profiles, models, calculateStats]);

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
    if (!confirm(t('admin.confirmArchive'))) return;
    try {
      await window.electronAPI?.deleteProfile(profileId);
      await handleRefresh();
    } catch (err) {
      console.error('Failed to archive profile:', err);
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
    if (!confirm(t('admin.confirmPermanentDelete'))) return;
    try {
      await window.electronAPI?.permanentDeleteProfile(profileId);
      await loadDeletedProfiles();
    } catch (err) {
      console.error('Failed to permanently delete profile:', err);
    }
  };

  // Archive handlers (hide banned accounts)
  const loadArchivedProfiles = async () => {
    try {
      const archived = await window.electronAPI?.listArchivedProfiles();
      setArchivedProfiles(archived || []);
    } catch (err) {
      console.error('Failed to load archived profiles:', err);
    }
  };

  const handleOpenArchived = async () => {
    await loadArchivedProfiles();
    setShowArchived(true);
  };

  const handleArchiveProfile = async (profileId: string) => {
    if (!confirm(t('admin.confirmArchiveHidden'))) return;
    try {
      await window.electronAPI?.archiveProfile(profileId);
      await handleRefresh();
    } catch (err) {
      console.error('Failed to archive profile:', err);
    }
  };

  const handleUnarchiveProfile = async (profileId: string) => {
    try {
      await window.electronAPI?.unarchiveProfile(profileId);
      await loadArchivedProfiles();
      await handleRefresh();
    } catch (err) {
      console.error('Failed to unarchive profile:', err);
    }
  };

  const handleMoveProfileToUser = async (profileId: string, targetUserId: string) => {
    try {
      await window.electronAPI?.updateProfile(profileId, { userId: targetUserId });

      // Optimistically update local state immediately
      setProfiles(prev => prev.map(p =>
        p.id === profileId ? { ...p, userId: targetUserId } : p
      ));

      setOpenMenuId(null);
      setShowMoveSubmenu(null);

      // Notify parent to refresh its profiles
      onProfilesChanged?.();
    } catch (err) {
      console.error('Failed to move profile:', err);
    }
  };

  const formatArchivedDate = (deletedAt: string): string => {
    const date = new Date(deletedAt);
    return date.toLocaleDateString();
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
      setCreateError(t('admin.usernameRequired'));
      return;
    }
    if (newPassword.length < 6) {
      setCreateError(t('admin.passwordMin6'));
      return;
    }

    try {
      const result = await window.electronAPI?.adminCreateUser(newUsername, newPassword, newRole);
      // Save model assignments if any
      if (result?.user?.id && newUserModels.length > 0) {
        await window.electronAPI?.adminSetUserModelAssignments(result.user.id, newUserModels);
      }
      await loadData();
      setShowCreateModal(false);
      setNewUsername('');
      setNewPassword('');
      setNewRole('basic');
      setNewUserModels([]);
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
        setEditError(t('admin.passwordMin6'));
        return;
      }
      updates.password = editPassword;
    }
    if (editRole !== editingUser.role) {
      updates.role = editRole;
    }

    try {
      // Update user info if there are changes
      if (Object.keys(updates).length > 0) {
        await window.electronAPI?.adminUpdateUser(editingUser.id, updates);
      }
      // Update model assignments
      await window.electronAPI?.adminSetUserModelAssignments(editingUser.id, editUserModels);
      setUserAssignments(prev => ({ ...prev, [editingUser.id]: editUserModels }));
      await loadData();
      setEditingUser(null);
      setEditError('');
    } catch (err: any) {
      setEditError(err.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUserId) {
      alert(t('admin.cannotDeleteSelf'));
      return;
    }
    if (!confirm(t('admin.confirmDeleteUser'))) return;

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

  const openEditModal = async (user: AppUser) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditPassword(user.password || '');
    setEditRole(user.role);
    setEditError('');
    // Load assignments
    if (userAssignments[user.id]) {
      setEditUserModels(userAssignments[user.id]);
    } else {
      const assignments = await window.electronAPI?.adminGetUserModelAssignments(user.id);
      setUserAssignments(prev => ({ ...prev, [user.id]: assignments || [] }));
      setEditUserModels(assignments || []);
    }
  };

  // Model handlers
  const handleModelImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const img = new window.Image();
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
      setModelError(t('admin.modelNameRequired'));
      return;
    }
    try {
      await onCreateModel(newModelName.trim(), modelProfilePicture || undefined, modelOnlyfans || undefined, modelContentFolder || undefined);
      setShowModelModal(false);
      setNewModelName('');
      setModelProfilePicture('');
      setModelOnlyfans('');
      setModelContentFolder('');
      setModelError('');
    } catch (err: any) {
      setModelError(err.message || 'Failed to create model');
    }
  };

  const handleUpdateModel = async () => {
    if (!editingModel) return;
    if (!newModelName.trim()) {
      setModelError(t('admin.modelNameRequired'));
      return;
    }
    try {
      await onUpdateModel(editingModel.id, newModelName.trim(), modelProfilePicture, modelOnlyfans, modelContentFolder);
      setEditingModel(null);
      setNewModelName('');
      setModelProfilePicture('');
      setModelOnlyfans('');
      setModelContentFolder('');
      setModelError('');
    } catch (err: any) {
      setModelError(err.message || 'Failed to update model');
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm(t('admin.confirmDeleteModel'))) return;
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
    setModelOnlyfans(model.onlyfans || '');
    setModelContentFolder(model.contentFolder || '');
    setModelError('');
  };

  // Email handlers
  const loadEmails = async () => {
    try {
      const [mainData, subData, profilesData, usersData] = await Promise.all([
        window.electronAPI?.listMainEmails(),
        window.electronAPI?.listSubEmails(),
        window.electronAPI?.adminGetAllProfiles(),
        window.electronAPI?.adminListUsers(),
      ]);
      setMainEmails(mainData || []);
      setSubEmails(subData || []);
      // Update profiles for email assignment display
      if (profilesData) setProfiles(profilesData);
      // Update users for showing usernames
      if (usersData) setUsers(usersData);
      // Start collapsed by default
      setExpandedEmails(new Set());
    } catch (err) {
      console.error('Failed to load emails:', err);
    }
  };

  // Get profiles assigned to a sub-email
  const getProfilesForSubEmail = (subEmailId: string) => {
    // Include archived and deleted profiles to show email is still assigned
    // Deduplicate by profile ID first, then by display key (userId + name) to avoid visual duplicates
    const allProfiles = [...profiles, ...archivedProfiles, ...deletedProfiles];
    const uniqueById = allProfiles.filter((p, index, self) =>
      self.findIndex(x => x.id === p.id) === index
    );
    const matchingProfiles = uniqueById.filter(p => p.subEmailId === subEmailId);
    // Deduplicate by display key (userId + name) to avoid showing same user/browser combo multiple times
    const uniqueByDisplay = matchingProfiles.filter((p, index, self) =>
      self.findIndex(x => x.userId === p.userId && x.name === p.name) === index
    );
    return uniqueByDisplay;
  };

  // Get user info for a profile
  const getUserForProfile = (userId: string) => {
    return users.find(u => u.id === userId);
  };

  useEffect(() => {
    if (activeTab === 'emails') {
      loadEmails();
      // Also load archived/deleted profiles to check email assignments
      loadArchivedProfiles();
      loadDeletedProfiles();
    }
  }, [activeTab]);

  const handleCreateMainEmail = async () => {
    if (savingEmail) return;
    if (!newMainEmail.trim()) {
      setEmailError('Email is required');
      return;
    }
    if (!newMainPassword.trim()) {
      setEmailError('Password is required');
      return;
    }
    setSavingEmail(true);
    try {
      await window.electronAPI?.createMainEmail(newMainEmail, newMainPassword);
      await loadEmails();
      setShowMainEmailModal(false);
      setNewMainEmail('');
      setNewMainPassword('');
      setEmailError('');
    } catch (err: any) {
      setEmailError(err.message || 'Failed to create email');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleUpdateMainEmail = async () => {
    if (!editingMainEmail || savingEmail) return;
    if (!newMainEmail.trim()) {
      setEmailError('Email is required');
      return;
    }
    if (!newMainPassword.trim()) {
      setEmailError('Password is required');
      return;
    }
    const updates: { email?: string; password?: string } = {};
    if (newMainEmail.trim() !== editingMainEmail.email) {
      updates.email = newMainEmail;
    }
    if (newMainPassword.trim() !== editingMainEmail.password) {
      updates.password = newMainPassword;
    }
    if (Object.keys(updates).length === 0) {
      setEditingMainEmail(null);
      return;
    }
    setSavingEmail(true);
    try {
      await window.electronAPI?.updateMainEmail(editingMainEmail.id, updates);
      await loadEmails();
      setEditingMainEmail(null);
      setNewMainEmail('');
      setNewMainPassword('');
      setEmailError('');
    } catch (err: any) {
      setEmailError(err.message || 'Failed to update email');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleDeleteMainEmail = async (id: string) => {
    if (!confirm('Delete this email and all its sub-emails?')) return;
    try {
      await window.electronAPI?.deleteMainEmail(id);
      await loadEmails();
    } catch (err) {
      console.error('Failed to delete email:', err);
    }
  };

  const handleCreateSubEmail = async () => {
    if (!addingSubEmailTo || savingEmail) return;
    if (!newSubEmail.trim()) {
      setEmailError('Sub-email is required');
      return;
    }
    setSavingEmail(true);
    try {
      // Parse multiple emails (separated by newlines, commas, or spaces)
      const emails = newSubEmail
        .split(/[\n,\s]+/)
        .map(e => e.trim())
        .filter(e => e.length > 0 && e.includes('@'));

      if (emails.length === 0) {
        setEmailError('No valid emails found');
        setSavingEmail(false);
        return;
      }

      let created = 0;
      let errors: string[] = [];

      for (const email of emails) {
        try {
          await window.electronAPI?.createSubEmail(addingSubEmailTo, email);
          created++;
        } catch (err: any) {
          errors.push(`${email}: ${err.message}`);
        }
      }

      await loadEmails();

      if (errors.length > 0 && created === 0) {
        setEmailError(errors.join('\n'));
      } else {
        setShowSubEmailModal(false);
        setAddingSubEmailTo(null);
        setNewSubEmail('');
        setEmailError('');
      }
    } catch (err: any) {
      setEmailError(err.message || 'Failed to create sub-email');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleUpdateSubEmail = async () => {
    if (!editingSubEmail || savingEmail) return;
    if (!newSubEmail.trim()) {
      setEmailError('Sub-email is required');
      return;
    }
    setSavingEmail(true);
    try {
      // Update the sub-email address
      await window.electronAPI?.updateSubEmail(editingSubEmail.id, newSubEmail);

      // Handle profile assignment changes (including archived/deleted profiles)
      const allProfilesForAssignment = [...profiles, ...archivedProfiles, ...deletedProfiles];
      const uniqueProfilesForAssignment = allProfilesForAssignment.filter((p, index, self) =>
        self.findIndex(x => x.id === p.id) === index
      );
      const previouslyAssigned = uniqueProfilesForAssignment.find(p => p.subEmailId === editingSubEmail.id);

      // If there was a previous assignment and it's different, remove it
      if (previouslyAssigned && previouslyAssigned.id !== selectedProfileForSubEmail) {
        await window.electronAPI?.updateProfile(previouslyAssigned.id, { subEmailId: null });
      }

      // If a new profile is selected, assign this sub-email to it
      if (selectedProfileForSubEmail && selectedProfileForSubEmail !== previouslyAssigned?.id) {
        await window.electronAPI?.updateProfile(selectedProfileForSubEmail, { subEmailId: editingSubEmail.id });
      }

      await loadEmails();
      setEditingSubEmail(null);
      setNewSubEmail('');
      setSelectedProfileForSubEmail(null);
      setEmailError('');
    } catch (err: any) {
      setEmailError(err.message || 'Failed to update sub-email');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleDeleteSubEmail = async (id: string) => {
    if (!confirm('Delete this sub-email?')) return;
    try {
      await window.electronAPI?.deleteSubEmail(id);
      await loadEmails();
    } catch (err) {
      console.error('Failed to delete sub-email:', err);
    }
  };

  const toggleEmailExpand = (emailId: string) => {
    setExpandedEmails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  };

  const openMainEmailEditModal = (email: MainEmail) => {
    setEditingMainEmail(email);
    setNewMainEmail(email.email);
    setNewMainPassword(email.password);
    setEmailError('');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const extractUsername = (url: string): string => {
    try {
      // Add protocol if missing
      let fullUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        fullUrl = 'https://' + url;
      }
      const urlObj = new URL(fullUrl);
      const path = urlObj.pathname.replace(/^\/+|\/+$/g, '');
      return path.split('/')[0] || url;
    } catch {
      // Fallback: try to extract after last /
      const parts = url.split('/');
      return parts[parts.length - 1] || url;
    }
  };

  const openSubEmailEditModal = (subEmail: SubEmail) => {
    setEditingSubEmail(subEmail);
    setNewSubEmail(subEmail.email);
    // Find profile currently assigned to this sub-email (including archived/deleted)
    const allProfiles = [...profiles, ...archivedProfiles, ...deletedProfiles];
    const uniqueProfiles = allProfiles.filter((p, index, self) =>
      self.findIndex(x => x.id === p.id) === index
    );
    const assignedProfile = uniqueProfiles.find(p => p.subEmailId === subEmail.id);
    setSelectedProfileForSubEmail(assignedProfile?.id || null);
    setEmailError('');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p style={{ color: 'var(--text-tertiary)' }}>{t('messages.loading')}</p>
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
            onClick={() => setActiveTab('accounts')}
            className="px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors"
            style={{
              borderRadius: '100px',
              background: activeTab === 'accounts' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'accounts' ? 'var(--accent-text)' : 'var(--text-tertiary)',
            }}
          >
            <Users size={16} weight="bold" />
            {t('admin.accounts')}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className="px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors"
            style={{
              borderRadius: '100px',
              background: activeTab === 'users' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'users' ? 'var(--accent-text)' : 'var(--text-tertiary)',
            }}
          >
            <UserList size={16} weight="bold" />
            {t('admin.users')}
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className="px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors"
            style={{
              borderRadius: '100px',
              background: activeTab === 'models' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'models' ? 'var(--accent-text)' : 'var(--text-tertiary)',
            }}
          >
            <Smiley size={16} weight="bold" />
            {t('admin.models')}
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className="px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors"
            style={{
              borderRadius: '100px',
              background: activeTab === 'emails' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'emails' ? 'var(--accent-text)' : 'var(--text-tertiary)',
            }}
          >
            <EnvelopeSimple size={16} weight="bold" />
            {t('admin.emails')}
          </button>
        </div>

        {/* Action buttons based on tab */}
        <div className="flex items-center gap-2">
          {activeTab === 'accounts' && (
            <>
              {canDelete && (
                <>
                  <button
                    onClick={() => window.electronAPI?.openExternal('https://docs.google.com/spreadsheets/d/1qfzEHUOmh-1WqDpQh0v75RDKPFwGpcRcxsn6HpFFCU8/edit?gid=2124940835#gid=2124940835')}
                    className="h-9 px-3 flex items-center gap-2 transition-colors"
                    style={{ background: 'var(--chip-bg)', borderRadius: '100px', color: 'var(--text-primary)' }}
                    title="Open Sheet"
                  >
                    <Table size={16} weight="bold" />
                  </button>
                  <button
                    onClick={handleOpenArchived}
                    className="h-9 px-3 flex items-center gap-2 transition-colors"
                    style={{ background: 'var(--chip-bg)', borderRadius: '100px', color: 'var(--text-primary)' }}
                    title={t('admin.viewArchived')}
                  >
                    <Archive size={16} weight="bold" />
                  </button>
                  <button
                    onClick={handleOpenTrash}
                    className="h-9 px-3 flex items-center gap-2 transition-colors"
                    style={{ background: 'var(--chip-bg)', borderRadius: '100px', color: 'var(--text-primary)' }}
                    title={t('admin.viewTrash')}
                  >
                    <Trash size={16} weight="bold" />
                  </button>
                </>
              )}
              <button
                onClick={handleSyncAll}
                disabled={syncing || refreshing}
                className="h-9 px-3 flex items-center gap-2 transition-colors"
                style={{ background: 'var(--chip-bg)', borderRadius: '100px', color: 'var(--text-primary)', opacity: (syncing || refreshing) ? 0.5 : 1 }}
                title="Sync karma and Google Sheet"
              >
                <ArrowsClockwise size={16} weight="bold" style={{ animation: (syncing || refreshing) ? 'spin 1s linear infinite' : 'none' }} />
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
              {t('admin.newUser')}
            </button>
          )}
          {activeTab === 'models' && (
            <button
              onClick={() => { setShowModelModal(true); setNewModelName(''); setModelError(''); }}
              className="h-9 px-4 flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ background: 'var(--btn-primary-bg)', borderRadius: '100px', color: 'var(--btn-primary-color)' }}
            >
              <Plus size={14} weight="bold" />
              {t('admin.newModel')}
            </button>
          )}
          {activeTab === 'emails' && (
            <button
              onClick={() => { setShowMainEmailModal(true); setNewMainEmail(''); setNewMainPassword(''); setEmailError(''); }}
              className="h-9 px-4 flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ background: 'var(--btn-primary-bg)', borderRadius: '100px', color: 'var(--btn-primary-color)' }}
            >
              <Plus size={14} weight="bold" />
              {t('admin.newEmail')}
            </button>
          )}
        </div>
      </div>

      {/* Accounts Tab */}
      {activeTab === 'accounts' && (
        <div className="space-y-3">
          {userStats.length === 0 ? (
            <div className="p-12 text-center" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
              <User size={32} weight="light" color="var(--text-tertiary)" className="mx-auto mb-3" />
              <p style={{ color: 'var(--text-tertiary)' }}>{t('admin.noDataYet')}</p>
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
                          background: user.role === 'dev' ? 'rgba(239, 68, 68, 0.2)' : user.role === 'admin' ? 'rgba(147, 112, 219, 0.2)' : 'var(--chip-bg)',
                          color: user.role === 'dev' ? '#F87171' : user.role === 'admin' ? '#A78BFA' : 'var(--text-secondary)'
                        }}
                      >
                        {user.role}
                      </span>
                    </div>
                    <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                      {totalProfiles} {totalProfiles !== 1 ? t('admin.browsersPlural') : t('admin.browsers')} {t('admin.across')} {modelStats.length} {modelStats.length !== 1 ? t('admin.models').toLowerCase() : t('admin.model').toLowerCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => onCreateBrowser(user.id)}
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
                        style={{ gridTemplateColumns: '1fr repeat(7, 80px) 50px', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}
                      >
                        <div>{t('admin.model')}</div>
                        <div className="text-center">{t('admin.posts')}</div>
                        <div className="text-center">{t('admin.comments')}</div>
                        <div className="text-center">{t('admin.karma')}</div>
                        <div className="text-center">{t('admin.lastPost')}</div>
                        <div className="text-center">{t('admin.lastComment')}</div>
                        <div className="text-center">{t('admin.status')}</div>
                        <div className="text-center">{t('admin.renew')}</div>
                        <div></div>
                      </div>

                      {modelStats.map((stat, index) => {
                        const modelKey = `${user.id}-${stat.modelId || 'no-model'}`;
                        const isExpanded = expandedModels.has(modelKey);
                        const modelProfiles = getProfilesForModel(user.id, stat.modelId);
                        const modelData = models.find(m => m.id === stat.modelId);

                        // Find most recent last post and last comment for the model
                        const modelLastPost = modelProfiles
                          .map(p => (p as any).lastPostDate)
                          .filter(Boolean)
                          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
                        const modelLastComment = modelProfiles
                          .map(p => (p as any).lastCommentDate)
                          .filter(Boolean)
                          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
                        const formatDateTimeModel = (dateStr: string | undefined) => {
                          if (!dateStr) return '-';
                          const date = new Date(dateStr);
                          const dd = String(date.getDate()).padStart(2, '0');
                          const mm = String(date.getMonth() + 1).padStart(2, '0');
                          const hh = String(date.getHours()).padStart(2, '0');
                          const min = String(date.getMinutes()).padStart(2, '0');
                          return `${dd}/${mm} ${hh}:${min}`;
                        };

                        return (
                          <div key={stat.modelId || 'no-model'}>
                            <div
                              className="grid py-4 px-5 items-center cursor-pointer hover:bg-white/5 transition-colors"
                              style={{ gridTemplateColumns: '1fr repeat(7, 80px) 50px', borderBottom: !isExpanded && index < modelStats.length - 1 ? '1px solid var(--border)' : 'none' }}
                              onClick={() => toggleModelExpand(modelKey)}
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? <CaretDown size={14} weight="bold" style={{ color: 'var(--text-tertiary)' }} /> : <CaretRight size={14} weight="bold" style={{ color: 'var(--text-tertiary)' }} />}
                                <FolderSimple size={16} weight="bold" style={{ color: 'var(--text-tertiary)' }} />
                                <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{stat.modelName}</span>
                              </div>
                              <div className="text-center text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                                {stat.totalPosts}
                                {stat.postsToday > 0 && <span style={{ color: 'var(--accent-green)', marginLeft: '4px' }}>+{stat.postsToday}</span>}
                              </div>
                              <div className="text-center text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                                {stat.totalComments}
                                {stat.commentsToday > 0 && <span style={{ color: 'var(--accent-green)', marginLeft: '4px' }}>+{stat.commentsToday}</span>}
                              </div>
                              <div className="text-center text-sm font-medium" style={{ color: stat.totalKarma > 0 ? 'var(--accent-blue)' : 'var(--text-tertiary)' }}>{stat.totalKarma > 0 ? stat.totalKarma.toLocaleString() : '-'}</div>
                              <div className="text-center text-xs font-medium" style={{ color: modelLastPost ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>{formatDateTimeModel(modelLastPost)}</div>
                              <div className="text-center text-xs font-medium" style={{ color: modelLastComment ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>{formatDateTimeModel(modelLastComment)}</div>
                              <div className="text-center text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>{stat.working}/{stat.total}</div>
                              <div className="text-center text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>{stat.enabled}/{stat.total}</div>
                              <div></div>
                            </div>

                            {isExpanded && (
                              <div style={{ borderBottom: index < modelStats.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                {modelProfiles.map((profile, pIndex) => {
                                  const karma = (profile.commentKarma || 0) + (profile.postKarma || 0);
                                  const formatDateTime = (dateStr: string | undefined) => {
                                    if (!dateStr) return '-';
                                    const date = new Date(dateStr);
                                    const dd = String(date.getDate()).padStart(2, '0');
                                    const mm = String(date.getMonth() + 1).padStart(2, '0');
                                    const hh = String(date.getHours()).padStart(2, '0');
                                    const min = String(date.getMinutes()).padStart(2, '0');
                                    return `${dd}/${mm} ${hh}:${min}`;
                                  };
                                  return (
                                    <div
                                      key={profile.id}
                                      className="grid py-3 px-5 pl-12 items-center"
                                      style={{ gridTemplateColumns: '1fr repeat(7, 80px) 50px', borderBottom: pIndex < modelProfiles.length - 1 ? '1px solid rgba(128, 128, 128, 0.1)' : 'none' }}
                                    >
                                      <div className="flex items-center gap-2">
                                        {profile.country && countryFlagImages[profile.country] && (
                                          <img src={countryFlagImages[profile.country]} alt={profile.country} className="w-4 h-4 object-contain rounded-sm" />
                                        )}
                                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{profile.name}</span>
                                      </div>
                                      <div className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        {(profile as any).totalPosts || 0}
                                        {(profile.postsToday || 0) > 0 && <span style={{ color: 'var(--accent-green)', marginLeft: '4px' }}>+{profile.postsToday}</span>}
                                      </div>
                                      <div className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        {(profile as any).totalComments || 0}
                                        {(profile.commentsToday || 0) > 0 && <span style={{ color: 'var(--accent-green)', marginLeft: '4px' }}>+{profile.commentsToday}</span>}
                                      </div>
                                      <div className="text-center text-sm" style={{ color: karma > 0 ? 'var(--accent-blue)' : 'var(--text-tertiary)' }}>{karma > 0 ? karma.toLocaleString() : '-'}</div>
                                      <div className="text-center text-xs" style={{ color: (profile as any).lastPostDate ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>{formatDateTime((profile as any).lastPostDate)}</div>
                                      <div className="text-center text-xs" style={{ color: (profile as any).lastCommentDate ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>{formatDateTime((profile as any).lastCommentDate)}</div>
                                      <div className="flex justify-center">
                                        {profile.status === 'working' && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(76, 175, 80, 0.15)', color: '#4CAF50' }}>{t('profile.working')}</span>}
                                        {profile.status === 'banned' && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(244, 67, 54, 0.15)', color: '#F44336' }}>{t('profile.banned')}</span>}
                                        {profile.status === 'error' && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255, 152, 0, 0.15)', color: '#FF9800' }}>{t('profile.error')}</span>}
                                        {(!profile.status || profile.status === 'unknown') && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--chip-bg)', color: 'var(--text-tertiary)' }}>{t('admin.unknown')}</span>}
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
                                              if (days <= 0) return t('admin.expired');
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
                                              {t('admin.edit')}
                                            </button>
                                            <div className="relative">
                                              <button
                                                onClick={(e) => { e.stopPropagation(); setShowMoveSubmenu(showMoveSubmenu === profile.id ? null : profile.id); }}
                                                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10 transition-colors"
                                                style={{ color: 'var(--text-primary)' }}
                                              >
                                                <UserSwitch size={14} />
                                                {t('admin.moveToUser')}
                                                <CaretLeft size={12} className="ml-auto" />
                                              </button>
                                              {showMoveSubmenu === profile.id && (
                                                <div
                                                  data-menu="true"
                                                  className="absolute right-full top-0 mr-1 py-1 z-[10000]"
                                                  style={{ background: 'var(--bg-secondary)', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', minWidth: '140px' }}
                                                >
                                                  {users.filter(u => u.id !== profile.userId).map(targetUser => (
                                                    <button
                                                      key={targetUser.id}
                                                      onClick={(e) => { e.stopPropagation(); handleMoveProfileToUser(profile.id, targetUser.id); }}
                                                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10 transition-colors"
                                                      style={{ color: 'var(--text-primary)' }}
                                                    >
                                                      <div
                                                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                                                        style={{ background: getAvatarColor(targetUser.username), color: '#000' }}
                                                      >
                                                        {targetUser.username.charAt(0).toUpperCase()}
                                                      </div>
                                                      {targetUser.username}
                                                    </button>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleArchiveProfile(profile.id); }}
                                              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10 transition-colors"
                                              style={{ color: 'var(--text-tertiary)' }}
                                            >
                                              <Archive size={14} />
                                              {t('admin.archive')}
                                            </button>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleDeleteProfile(profile.id); }}
                                              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10 transition-colors"
                                              style={{ color: '#F44336' }}
                                            >
                                              <Trash size={14} />
                                              {t('admin.delete')}
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
                          style={{ gridTemplateColumns: '1fr repeat(6, 80px) 50px', background: 'rgba(128, 128, 128, 0.04)', borderTop: '1px solid var(--border)' }}
                        >
                          <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t('admin.total')}</div>
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
              <p style={{ color: 'var(--text-tertiary)' }}>{t('admin.noUsersYet')}</p>
            </div>
          ) : (
            users.map(user => (
              <div key={user.id} className="p-4" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: getAvatarColor(user.username) }}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{user.username}</span>
                      {user.id === currentUserId && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-green)', color: '#000' }}>{t('admin.you')}</span>}
                    </div>
                    <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{user.role === 'dev' ? t('settings.developer') : user.role === 'admin' ? t('settings.administrator') : t('settings.basicUser')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEditModal(user)} className="p-2 rounded-full hover:bg-black/10" style={{ color: 'var(--text-tertiary)' }}><PencilSimple size={18} /></button>
                    {canDelete && user.id !== currentUserId && <button onClick={() => handleDeleteUser(user.id)} className="p-2 rounded-full hover:bg-black/10" style={{ color: 'var(--accent-red)' }}><Trash size={18} /></button>}
                  </div>
                </div>

                {(userAssignments[user.id] || []).length > 0 && (
                  <div className="mt-3 ml-13">
                    <p className="text-xs mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Assigned models</p>
                    <div className="flex flex-wrap gap-1.5">
                      {models.filter(model => (userAssignments[user.id] || []).includes(model.id)).map(model => (
                        <div
                          key={model.id}
                          className="h-7 px-3 text-xs font-medium flex items-center"
                          style={{ background: 'var(--chip-bg)', color: 'var(--text-secondary)', borderRadius: '100px' }}
                        >
                          {model.name}
                        </div>
                      ))}
                    </div>
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
              <p style={{ color: 'var(--text-tertiary)' }}>{t('admin.noModelsYet')}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('admin.createModelsFirst')}</p>
            </div>
          ) : (
            models.map(model => (
              <div key={model.id} className="flex items-center gap-3 p-4" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden" style={{ background: 'var(--chip-bg)' }}>
                  {model.profilePicture ? <img src={model.profilePicture} alt={model.name} className="w-full h-full object-cover" /> : <FolderSimple size={20} weight="bold" style={{ color: 'var(--text-secondary)' }} />}
                </div>
                <div className="flex-1">
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{model.name}</span>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('admin.created')} {new Date(model.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openModelEditModal(model)} className="p-2 rounded-full hover:bg-black/10" style={{ color: 'var(--text-tertiary)' }}><PencilSimple size={18} /></button>
                  {canDelete && <button onClick={() => handleDeleteModel(model.id)} className="p-2 rounded-full hover:bg-black/10" style={{ color: 'var(--accent-red)' }}><Trash size={18} /></button>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Emails Tab */}
      {activeTab === 'emails' && (
        <div className="space-y-2">
          {mainEmails.length === 0 ? (
            <div className="p-8 text-center" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
              <EnvelopeSimple size={32} weight="light" color="var(--text-tertiary)" className="mx-auto mb-3" />
              <p style={{ color: 'var(--text-tertiary)' }}>No emails yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Add main emails to organize your sub-emails</p>
            </div>
          ) : (
            mainEmails.map(mainEmail => {
              const emailSubEmails = subEmails.filter(s => s.mainEmailId === mainEmail.id);
              const isExpanded = expandedEmails.has(mainEmail.id);
              const allProfiles = [...profiles, ...archivedProfiles, ...deletedProfiles];
              const uniqueProfiles = allProfiles.filter((p, index, self) => self.findIndex(x => x.id === p.id) === index);
              const usedCount = emailSubEmails.filter(s => uniqueProfiles.some(p => p.subEmailId === s.id)).length;
              return (
                <div key={mainEmail.id} style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer"
                    onClick={() => toggleEmailExpand(mainEmail.id)}
                  >
                    {isExpanded ? <CaretDown size={14} weight="bold" style={{ color: 'var(--text-tertiary)' }} /> : <CaretRight size={14} weight="bold" style={{ color: 'var(--text-tertiary)' }} />}
                    <div className="flex-1 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => copyToClipboard(mainEmail.email, `email-${mainEmail.id}`)} className="h-8 px-3 flex items-center gap-2 text-sm hover:opacity-70" style={{ background: 'var(--chip-bg)', borderRadius: '100px', color: 'var(--text-primary)' }} title="Click to copy">
                        <EnvelopeSimple size={14} weight="bold" style={{ color: 'var(--text-tertiary)' }} />
                        {copiedId === `email-${mainEmail.id}` ? <span style={{ color: 'var(--accent-green)' }}>Copied!</span> : mainEmail.email}
                      </button>
                      <button onClick={() => copyToClipboard(mainEmail.password, `pass-${mainEmail.id}`)} className="h-8 px-3 flex items-center gap-2 text-sm hover:opacity-70" style={{ background: 'var(--chip-bg)', borderRadius: '100px', color: 'var(--text-tertiary)' }} title="Click to copy password">
                        <Lock size={14} weight="bold" />
                        {copiedId === `pass-${mainEmail.id}` ? <span style={{ color: 'var(--accent-green)' }}>Copied!</span> : mainEmail.password}
                      </button>
                    </div>
                    <span className="text-sm" style={{ color: usedCount === emailSubEmails.length && emailSubEmails.length > 0 ? 'var(--accent-green)' : 'var(--text-tertiary)' }}>
                      {t('admin.used')} {usedCount}/{emailSubEmails.length}
                    </span>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setAddingSubEmailTo(mainEmail.id); setShowSubEmailModal(true); setNewSubEmail(''); setEmailError(''); }}
                        className="h-8 px-3 flex items-center gap-2 text-sm"
                        style={{ background: 'var(--chip-bg)', borderRadius: '100px', color: 'var(--text-tertiary)' }}
                      >
                        <Plus size={14} weight="bold" />
                        {t('admin.newSubEmail')}
                      </button>
                      <div className="relative" data-menu="true">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEmailMenuOpen(emailMenuOpen === `main-${mainEmail.id}` ? null : `main-${mainEmail.id}`); }}
                          className="p-2 rounded-full hover:bg-black/10"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <DotsThree size={18} weight="bold" />
                        </button>
                        {emailMenuOpen === `main-${mainEmail.id}` && (
                          <div className="absolute right-0 top-full mt-1 py-1 min-w-[120px] rounded-lg shadow-lg z-50" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                            <button
                              onClick={() => { openMainEmailEditModal(mainEmail); setEmailMenuOpen(null); }}
                              className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              <PencilSimple size={14} />
                              Edit
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => { handleDeleteMainEmail(mainEmail.id); setEmailMenuOpen(null); }}
                                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5"
                                style={{ color: 'var(--accent-red)' }}
                              >
                                <Trash size={14} />
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {isExpanded && emailSubEmails.length > 0 && (
                    <div className="px-4 pb-4">
                      <div className="space-y-1 ml-10">
                        {emailSubEmails.map(subEmail => {
                          const assignedProfiles = getProfilesForSubEmail(subEmail.id);
                          return (
                            <div key={subEmail.id} className="flex items-center gap-3 py-2 px-1 border-b border-white/5 last:border-b-0">
                              <button onClick={() => copyToClipboard(subEmail.email, `sub-${subEmail.id}`)} className="text-sm text-left hover:opacity-70 flex items-center gap-1" style={{ color: 'var(--text-secondary)', minWidth: '180px' }} title="Click to copy">
                                {copiedId === `sub-${subEmail.id}` ? <span style={{ color: 'var(--accent-green)' }}>Copied!</span> : subEmail.email}
                                {copiedId !== `sub-${subEmail.id}` && <Copy size={12} weight="bold" style={{ color: 'var(--text-tertiary)' }} />}
                              </button>
                              <div className="flex-1 flex items-center gap-2 flex-wrap">
                                {assignedProfiles.map((profile) => {
                                  const user = profile.userId ? getUserForProfile(profile.userId) : undefined;
                                  const userColor = getAvatarColor(user?.username || 'Unknown');
                                  return (
                                    <div key={profile.id} className="flex items-center gap-1">
                                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${userColor}25`, color: userColor }}>
                                        {user?.username || 'Unknown'}
                                      </span>
                                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(33, 150, 243, 0.15)', color: '#2196F3' }}>
                                        {profile.name}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="relative" data-menu="true">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEmailMenuOpen(emailMenuOpen === `sub-${subEmail.id}` ? null : `sub-${subEmail.id}`); }}
                                  className="p-1.5 rounded-full hover:bg-black/10"
                                  style={{ color: 'var(--text-tertiary)' }}
                                >
                                  <DotsThree size={16} weight="bold" />
                                </button>
                                {emailMenuOpen === `sub-${subEmail.id}` && (
                                  <div className="absolute right-0 top-full mt-1 py-1 min-w-[120px] rounded-lg shadow-lg z-50" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                                    <button
                                      onClick={() => { openSubEmailEditModal(subEmail); setEmailMenuOpen(null); }}
                                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5"
                                      style={{ color: 'var(--text-primary)' }}
                                    >
                                      <PencilSimple size={14} />
                                      Edit
                                    </button>
                                    {canDelete && (
                                      <button
                                        onClick={() => { handleDeleteSubEmail(subEmail.id); setEmailMenuOpen(null); }}
                                        className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5"
                                        style={{ color: 'var(--accent-red)' }}
                                      >
                                        <Trash size={14} />
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {isExpanded && emailSubEmails.length === 0 && (
                    <div className="px-4 pb-4 ml-10">
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('admin.noSubEmailsYet')}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md p-6" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{t('admin.createUser')}</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ color: 'var(--text-tertiary)' }}><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('login.username')}</label>
                <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full h-10 px-3 text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: '100px' }} placeholder={t('admin.enterUsername')} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('login.password')}</label>
                <div className="flex gap-2">
                  <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="flex-1 h-10 px-3 text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: '100px' }} placeholder={t('admin.minChars')} />
                  <button
                    type="button"
                    onClick={() => setNewPassword(generatePassword())}
                    className="h-10 px-3 flex items-center gap-1.5 text-sm font-medium"
                    style={{ background: 'var(--chip-bg)', color: 'var(--text-secondary)', borderRadius: '100px' }}
                  >
                    <Shuffle size={16} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('admin.role')}</label>
                <div className="flex gap-2">
                  <button onClick={() => setNewRole('basic')} className="flex-1 h-10 text-sm font-medium flex items-center justify-center gap-2" style={{ background: newRole === 'basic' ? 'var(--accent-primary)' : 'var(--chip-bg)', color: newRole === 'basic' ? 'var(--accent-text)' : 'var(--text-secondary)', borderRadius: '100px' }}><User size={16} /> {t('admin.basic')}</button>
                  <button onClick={() => setNewRole('admin')} className="flex-1 h-10 text-sm font-medium flex items-center justify-center gap-2" style={{ background: newRole === 'admin' ? 'var(--accent-primary)' : 'var(--chip-bg)', color: newRole === 'admin' ? 'var(--accent-text)' : 'var(--text-secondary)', borderRadius: '100px' }}><Shield size={16} /> Admin</button>
                  <button onClick={() => setNewRole('dev')} className="flex-1 h-10 text-sm font-medium flex items-center justify-center gap-2" style={{ background: newRole === 'dev' ? 'var(--accent-primary)' : 'var(--chip-bg)', color: newRole === 'dev' ? 'var(--accent-text)' : 'var(--text-secondary)', borderRadius: '100px' }}><Code size={16} /> Dev</button>
                </div>
              </div>
              {models.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Models</label>
                  <div className="flex flex-wrap gap-2">
                    {models.map(model => {
                      const isSelected = newUserModels.includes(model.id);
                      return (
                        <button
                          key={model.id}
                          onClick={() => setNewUserModels(prev => prev.includes(model.id) ? prev.filter(id => id !== model.id) : [...prev, model.id])}
                          className="h-8 px-3 text-xs font-medium flex items-center gap-1.5"
                          style={{ background: isSelected ? 'var(--accent-primary)' : 'var(--chip-bg)', color: isSelected ? 'var(--accent-text)' : 'var(--text-secondary)', borderRadius: '100px' }}
                        >
                          {model.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {createError && <p className="text-sm" style={{ color: 'var(--accent-red)' }}>{createError}</p>}
              <button onClick={handleCreateUser} className="w-full h-10 text-sm font-medium" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-color)', borderRadius: '100px' }}>{t('admin.createUser')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md p-6" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{t('admin.editUser')}</h2>
              <button onClick={() => setEditingUser(null)} style={{ color: 'var(--text-tertiary)' }}><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('login.username')}</label>
                <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-full h-10 px-3 text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: '100px' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('admin.newPasswordHint')}</label>
                <div className="flex gap-2">
                  <input type="text" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="flex-1 h-10 px-3 text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: '100px' }} placeholder={t('admin.minChars')} />
                  <button
                    type="button"
                    onClick={() => setEditPassword(generatePassword())}
                    className="h-10 px-3 flex items-center gap-1.5 text-sm font-medium"
                    style={{ background: 'var(--chip-bg)', color: 'var(--text-secondary)', borderRadius: '100px' }}
                  >
                    <Shuffle size={16} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('admin.role')}</label>
                <div className="flex gap-2">
                  <button onClick={() => setEditRole('basic')} disabled={editingUser.id === currentUserId} className="flex-1 h-10 text-sm font-medium flex items-center justify-center gap-2" style={{ background: editRole === 'basic' ? 'var(--accent-primary)' : 'var(--chip-bg)', color: editRole === 'basic' ? 'var(--accent-text)' : 'var(--text-secondary)', opacity: editingUser.id === currentUserId ? 0.5 : 1, borderRadius: '100px' }}><User size={16} /> {t('admin.basic')}</button>
                  <button onClick={() => setEditRole('admin')} disabled={editingUser.id === currentUserId} className="flex-1 h-10 text-sm font-medium flex items-center justify-center gap-2" style={{ background: editRole === 'admin' ? 'var(--accent-primary)' : 'var(--chip-bg)', color: editRole === 'admin' ? 'var(--accent-text)' : 'var(--text-secondary)', opacity: editingUser.id === currentUserId ? 0.5 : 1, borderRadius: '100px' }}><Shield size={16} /> Admin</button>
                  <button onClick={() => setEditRole('dev')} disabled={editingUser.id === currentUserId} className="flex-1 h-10 text-sm font-medium flex items-center justify-center gap-2" style={{ background: editRole === 'dev' ? 'var(--accent-primary)' : 'var(--chip-bg)', color: editRole === 'dev' ? 'var(--accent-text)' : 'var(--text-secondary)', opacity: editingUser.id === currentUserId ? 0.5 : 1, borderRadius: '100px' }}><Code size={16} /> Dev</button>
                </div>
                {editingUser.id === currentUserId && <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{t('admin.cannotChangeOwnRole')}</p>}
              </div>
              {models.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Models</label>
                  <div className="flex flex-wrap gap-2">
                    {models.map(model => {
                      const isSelected = editUserModels.includes(model.id);
                      return (
                        <button
                          key={model.id}
                          onClick={() => setEditUserModels(prev => prev.includes(model.id) ? prev.filter(id => id !== model.id) : [...prev, model.id])}
                          className="h-8 px-3 text-xs font-medium flex items-center gap-1.5"
                          style={{ background: isSelected ? 'var(--accent-primary)' : 'var(--chip-bg)', color: isSelected ? 'var(--accent-text)' : 'var(--text-secondary)', borderRadius: '100px' }}
                        >
                          {model.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {editError && <p className="text-sm" style={{ color: 'var(--accent-red)' }}>{editError}</p>}
              <button onClick={handleUpdateUser} className="w-full h-10 text-sm font-medium" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-color)', borderRadius: '100px' }}>{t('admin.saveChanges')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Model Modal */}
      {(showModelModal || editingModel) && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md p-6" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{editingModel ? t('model.edit') : t('model.create')}</h2>
              <button onClick={() => { setShowModelModal(false); setEditingModel(null); setNewModelName(''); setModelProfilePicture(''); setModelOnlyfans(''); setModelContentFolder(''); setModelError(''); }} style={{ color: 'var(--text-tertiary)' }}><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 cursor-pointer" onClick={() => modelFileInputRef.current?.click()}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden relative group" style={{ background: 'var(--bg-tertiary)' }}>
                  {modelProfilePicture ? <img src={modelProfilePicture} alt="Model" className="w-full h-full object-cover" /> : <User size={28} weight="bold" color="var(--text-tertiary)" />}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full" style={{ background: 'rgba(0, 0, 0, 0.5)' }}><Camera size={20} weight="bold" color="white" /></div>
                </div>
                <input ref={modelFileInputRef} type="file" accept="image/*" onChange={handleModelImageUpload} className="hidden" />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('model.profilePicture')}</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('admin.clickToUpload')}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('model.name')}</label>
                <input type="text" value={newModelName} onChange={(e) => setNewModelName(e.target.value)} className="w-full h-10 px-3 text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: '100px' }} placeholder={t('admin.enterModelName')} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('model.onlyfans')}</label>
                <input type="url" value={modelOnlyfans} onChange={(e) => setModelOnlyfans(e.target.value)} className="w-full h-10 px-3 text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: '100px' }} placeholder="https://onlyfans.com/username" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('model.contentFolder')}</label>
                <input type="url" value={modelContentFolder} onChange={(e) => setModelContentFolder(e.target.value)} className="w-full h-10 px-3 text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: '100px' }} placeholder="https://drive.google.com/..." />
              </div>
              {modelError && <p className="text-sm" style={{ color: 'var(--accent-red)' }}>{modelError}</p>}
              <button onClick={editingModel ? handleUpdateModel : handleCreateModel} className="w-full h-10 text-sm font-medium" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-color)', borderRadius: '100px' }}>{editingModel ? t('admin.saveChanges') : t('model.create')}</button>
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
                  <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{t('admin.trash')}</h2>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('admin.trashDescription')}</p>
                </div>
              </div>
              <button onClick={() => setShowTrash(false)} style={{ color: 'var(--text-tertiary)' }}><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {deletedProfiles.length === 0 ? (
                <div className="text-center py-12">
                  <Trash size={48} weight="light" style={{ color: 'var(--text-tertiary)' }} className="mx-auto mb-3" />
                  <p style={{ color: 'var(--text-tertiary)' }}>{t('admin.trashEmpty')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {deletedProfiles.map(profile => {
                    return (
                      <div key={profile.id} className="flex items-center gap-3 p-4" style={{ background: 'var(--bg-tertiary)', borderRadius: '100px' }}>
                        {profile.country && countryFlagImages[profile.country] && <img src={countryFlagImages[profile.country]} alt={profile.country} className="w-5 h-5 object-contain rounded-sm" />}
                        <div className="flex-1">
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{profile.name}</span>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('admin.archivedOn')} {formatArchivedDate(profile.deletedAt || '')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleRestoreProfile(profile.id)} className="h-8 px-3 flex items-center gap-1 text-sm font-medium rounded-full transition-colors" style={{ background: 'rgba(76, 175, 80, 0.15)', color: '#4CAF50' }}><ArrowCounterClockwise size={14} weight="bold" /> {t('admin.restore')}</button>
                          <button onClick={() => handlePermanentDelete(profile.id)} className="h-8 px-3 flex items-center gap-1 text-sm font-medium rounded-full transition-colors" style={{ background: 'rgba(244, 67, 54, 0.15)', color: '#F44336' }}><Trash size={14} weight="bold" /> {t('admin.delete')}</button>
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

      {/* Archived Modal (Hidden/Banned Accounts) */}
      {showArchived && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-2xl max-h-[80vh] flex flex-col" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <Archive size={24} weight="bold" style={{ color: 'var(--text-primary)' }} />
                <div>
                  <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{t('admin.archived')}</h2>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('admin.archivedDescription')}</p>
                </div>
              </div>
              <button onClick={() => setShowArchived(false)} style={{ color: 'var(--text-tertiary)' }}><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {archivedProfiles.length === 0 ? (
                <div className="text-center py-12">
                  <Archive size={48} weight="light" style={{ color: 'var(--text-tertiary)' }} className="mx-auto mb-3" />
                  <p style={{ color: 'var(--text-tertiary)' }}>{t('admin.archivedEmpty')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {archivedProfiles.map(profile => {
                    return (
                      <div key={profile.id} className="flex items-center gap-3 p-4" style={{ background: 'var(--bg-tertiary)', borderRadius: '100px' }}>
                        {profile.country && countryFlagImages[profile.country] && <img src={countryFlagImages[profile.country]} alt={profile.country} className="w-5 h-5 object-contain rounded-sm" />}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{profile.name}</span>
                            {profile.status === 'banned' && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ background: 'rgba(244, 67, 54, 0.15)', color: '#F44336' }}>{t('profile.banned')}</span>
                            )}
                          </div>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('admin.archivedOn')} {formatArchivedDate(profile.archivedAt || '')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleUnarchiveProfile(profile.id)} className="h-8 px-3 flex items-center gap-1 text-sm font-medium rounded-full transition-colors" style={{ background: 'rgba(76, 175, 80, 0.15)', color: '#4CAF50' }}><ArrowCounterClockwise size={14} weight="bold" /> {t('admin.unarchive')}</button>
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

      {/* Create/Edit Main Email Modal */}
      {(showMainEmailModal || editingMainEmail) && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md p-6" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{editingMainEmail ? t('admin.editEmail') : t('admin.newEmail')}</h2>
              <button onClick={() => { setShowMainEmailModal(false); setEditingMainEmail(null); setNewMainEmail(''); setNewMainPassword(''); setEmailError(''); }} style={{ color: 'var(--text-tertiary)' }}><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
                <input type="email" value={newMainEmail} onChange={(e) => setNewMainEmail(e.target.value)} className="w-full h-10 px-3 text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: '100px' }} placeholder="email@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Password</label>
                <input type="text" value={newMainPassword} onChange={(e) => setNewMainPassword(e.target.value)} className="w-full h-10 px-3 text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: '100px' }} placeholder="••••••••" />
              </div>
              {emailError && <p className="text-sm" style={{ color: 'var(--accent-red)' }}>{emailError}</p>}
              <button onClick={editingMainEmail ? handleUpdateMainEmail : handleCreateMainEmail} disabled={savingEmail} className="w-full h-10 text-sm font-medium" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-color)', opacity: savingEmail ? 0.5 : 1, borderRadius: '100px' }}>{savingEmail ? 'Saving...' : (editingMainEmail ? 'Save Changes' : 'Create Email')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Sub Email Modal */}
      {(showSubEmailModal || editingSubEmail) && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md p-6" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{editingSubEmail ? t('admin.editSubEmail') : t('admin.addSubEmails')}</h2>
              <button onClick={() => { setShowSubEmailModal(false); setEditingSubEmail(null); setAddingSubEmailTo(null); setNewSubEmail(''); setSelectedProfileForSubEmail(null); setEmailError(''); }} style={{ color: 'var(--text-tertiary)' }}><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{editingSubEmail ? t('admin.subEmail') : t('admin.subEmailsLabel')}</label>
                {editingSubEmail ? (
                  <input type="email" value={newSubEmail} onChange={(e) => setNewSubEmail(e.target.value)} className="w-full h-10 px-3 text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: '100px' }} placeholder="sub-email@example.com" autoFocus />
                ) : (
                  <textarea
                    value={newSubEmail}
                    onChange={(e) => setNewSubEmail(e.target.value)}
                    className="w-full px-4 py-3 text-sm resize-none"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: '24px', minHeight: '120px' }}
                    placeholder="email1@example.com&#10;email2@example.com&#10;email3@example.com"
                    autoFocus
                  />
                )}
              </div>
              {editingSubEmail && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('admin.assignToBrowser')}</label>
                  <select
                    value={selectedProfileForSubEmail || ''}
                    onChange={(e) => setSelectedProfileForSubEmail(e.target.value || null)}
                    className="w-full h-10 px-3 text-sm"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: '100px' }}
                  >
                    <option value="">{t('admin.none')}</option>
                    {profiles.map(profile => {
                      const user = users.find(u => u.id === profile.userId);
                      const isAssignedElsewhere = profile.subEmailId && profile.subEmailId !== editingSubEmail?.id;
                      return (
                        <option key={profile.id} value={profile.id} disabled={isAssignedElsewhere}>
                          {user?.username || t('admin.unknown')} - {profile.name}{isAssignedElsewhere ? ` ${t('admin.alreadyAssigned')}` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
              {emailError && <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--accent-red)' }}>{emailError}</p>}
              <button onClick={editingSubEmail ? handleUpdateSubEmail : handleCreateSubEmail} disabled={savingEmail} className="w-full h-10 text-sm font-medium" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-color)', opacity: savingEmail ? 0.5 : 1, borderRadius: '100px' }}>{savingEmail ? t('admin.saving') : (editingSubEmail ? t('admin.saveChanges') : t('admin.addSubEmails'))}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
