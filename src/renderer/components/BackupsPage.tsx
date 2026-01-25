import { useState, useEffect } from 'react';
import {
  Archive,
  Plus,
  Trash,
  ArrowCounterClockwise,
  DownloadSimple,
  UploadSimple,
  ArrowsClockwise,
  X,
  Warning,
  Browser,
  CheckSquare,
  Square,
  CaretDown,
  CaretRight,
  User,
  Envelope,
  Folders,
  Article,
} from '@phosphor-icons/react';
import { Backup, BackupWithData, BackupData, DeletedItem } from '../../shared/types';
import { useLanguage } from '../i18n';

type BackupsTab = 'backups' | 'deleted';
type DeletedFilter = 'all' | 'profile';

function BackupsPage() {
  const { t } = useLanguage();

  // State
  const [backups, setBackups] = useState<Backup[]>([]);
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BackupsTab>('backups');
  const [filter, setFilter] = useState<DeletedFilter>('all');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [permanentDeleteConfirm, setPermanentDeleteConfirm] = useState<DeletedItem | null>(null);

  // Create backup form
  const [backupName, setBackupName] = useState('');
  const [backupDescription, setBackupDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Generate default backup name with current date/time (DDMMYY HHMM)
  const generateDefaultBackupName = () => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${dd}${mm}${yy} ${hh}${min}`;
  };

  // Restore state
  const [backupData, setBackupData] = useState<BackupData | null>(null);
  const [loadingBackupData, setLoadingBackupData] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    profiles: true,
    models: false,
    users: false,
    emails: false,
    posts: false,
    subreddits: false,
    subredditUsage: false,
  });
  const [selectedItems, setSelectedItems] = useState<Record<string, Set<string>>>({
    profiles: new Set(),
    models: new Set(),
    users: new Set(),
    mainEmails: new Set(),
    subEmails: new Set(),
    redditPosts: new Set(),
    subreddits: new Set(),
    subredditUsage: new Set(),
  });
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [backupsData, deletedData] = await Promise.all([
        window.electronAPI?.listBackups(),
        window.electronAPI?.getDeletedItems(),
      ]);
      setBackups(backupsData || []);
      setDeletedItems(deletedData || []);
    } catch (err) {
      console.error('Failed to load backups:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('logs.justNow');
    if (diffMins < 60) return t('logs.minutesAgo', { minutes: diffMins });
    if (diffHours < 24) return t('logs.hoursAgo', { hours: diffHours });
    if (diffDays < 7) return t('logs.daysAgo', { days: diffDays });

    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatRecordCounts = (counts: Record<string, number>) => {
    const parts: string[] = [];
    if (counts.profiles) parts.push(`${counts.profiles} profiles`);
    if (counts.models) parts.push(`${counts.models} models`);
    if (counts.appUsers) parts.push(`${counts.appUsers} users`);
    if (counts.mainEmails || counts.subEmails) {
      const total = (counts.mainEmails || 0) + (counts.subEmails || 0);
      parts.push(`${total} emails`);
    }
    if (counts.redditPosts || counts.subreddits || counts.subredditUsage) {
      const total = (counts.redditPosts || 0);
      if (total > 0) parts.push(`${total} posts`);
    }
    return parts.join(', ') || 'No records';
  };

  const getBackupTypeLabel = (type: string) => {
    switch (type) {
      case 'manual':
        return t('backups.manual');
      case 'auto':
        return t('backups.auto');
      case 'imported':
        return t('backups.imported');
      default:
        return type;
    }
  };

  const getBackupTypeColor = (type: string) => {
    switch (type) {
      case 'manual':
        return 'var(--accent-blue)';
      case 'auto':
        return 'var(--accent-green)';
      case 'imported':
        return 'var(--accent-purple, #a78bfa)';
      default:
        return 'var(--text-tertiary)';
    }
  };

  const handleCreateBackup = async () => {
    if (!backupName.trim()) return;

    setCreating(true);
    try {
      console.log('Creating backup with name:', backupName.trim());
      const newBackup = await window.electronAPI?.createBackup(backupName.trim(), backupDescription.trim() || undefined);
      console.log('Backup created:', newBackup);
      if (newBackup) {
        setBackups(prev => [newBackup, ...prev]);
        setShowCreateModal(false);
        setBackupName('');
        setBackupDescription('');
      }
    } catch (err) {
      console.error('Failed to create backup:', err);
      alert('Failed to create backup: ' + (err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBackup = async (id: string) => {
    try {
      const success = await window.electronAPI?.deleteBackup(id);
      if (success) {
        setBackups(prev => prev.filter(b => b.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete backup:', err);
    }
    setDeleteConfirmId(null);
  };

  const handleExportBackup = async (id: string) => {
    try {
      const filepath = await window.electronAPI?.exportBackup(id);
      if (filepath) {
        console.log('Backup exported to:', filepath);
      }
    } catch (err) {
      console.error('Failed to export backup:', err);
    }
  };

  const handleImportBackup = async () => {
    try {
      const imported = await window.electronAPI?.importBackup();
      if (imported) {
        setBackups(prev => [imported, ...prev]);
      }
    } catch (err) {
      console.error('Failed to import backup:', err);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;

    setRestoring(true);
    try {
      const result = await window.electronAPI?.restoreSelectedItems(selectedBackup.id, {
        profileIds: Array.from(selectedItems.profiles),
        modelIds: Array.from(selectedItems.models),
        userIds: Array.from(selectedItems.users),
        mainEmailIds: Array.from(selectedItems.mainEmails),
        subEmailIds: Array.from(selectedItems.subEmails),
        redditPostIds: Array.from(selectedItems.redditPosts),
        subredditIds: Array.from(selectedItems.subreddits),
        subredditUsageIds: Array.from(selectedItems.subredditUsage),
        overwriteExisting,
      });
      if (result) {
        console.log('Restore result:', result);
        setShowRestoreModal(false);
        setSelectedBackup(null);
        setBackupData(null);
      }
    } catch (err) {
      console.error('Failed to restore backup:', err);
      alert('Failed to restore: ' + (err as Error).message);
    } finally {
      setRestoring(false);
    }
  };

  const handleRestoreDeletedItem = async (item: DeletedItem) => {
    try {
      const success = await window.electronAPI?.restoreDeletedItem(item.type, item.id);
      if (success) {
        setDeletedItems(prev => prev.filter(d => d.id !== item.id));
      }
    } catch (err) {
      console.error('Failed to restore item:', err);
    }
  };

  const handlePermanentDelete = async (item: DeletedItem) => {
    try {
      const success = await window.electronAPI?.permanentDeleteItem(item.type, item.id);
      if (success) {
        setDeletedItems(prev => prev.filter(d => d.id !== item.id));
      }
    } catch (err) {
      console.error('Failed to permanently delete item:', err);
    }
    setPermanentDeleteConfirm(null);
  };

  const openRestoreModal = async (backup: Backup) => {
    setSelectedBackup(backup);
    setShowRestoreModal(true);
    setLoadingBackupData(true);
    setBackupData(null);

    // Reset selections
    setSelectedItems({
      profiles: new Set(),
      models: new Set(),
      users: new Set(),
      mainEmails: new Set(),
      subEmails: new Set(),
      redditPosts: new Set(),
      subreddits: new Set(),
      subredditUsage: new Set(),
    });
    setExpandedSections({
      profiles: true,
      models: false,
      users: false,
      emails: false,
      posts: false,
      subreddits: false,
      subredditUsage: false,
    });
    setOverwriteExisting(false);

    try {
      const fullBackup = await window.electronAPI?.getBackup(backup.id);
      if (fullBackup?.data) {
        setBackupData(fullBackup.data);
        // Pre-select all items by default
        setSelectedItems({
          profiles: new Set(fullBackup.data.profiles?.map((p: any) => p.id) || []),
          models: new Set(fullBackup.data.models?.map((m: any) => m.id) || []),
          users: new Set(fullBackup.data.appUsers?.map((u: any) => u.id) || []),
          mainEmails: new Set(fullBackup.data.mainEmails?.map((e: any) => e.id) || []),
          subEmails: new Set(fullBackup.data.subEmails?.map((e: any) => e.id) || []),
          redditPosts: new Set(fullBackup.data.redditPosts?.map((p: any) => p.id) || []),
          subreddits: new Set(fullBackup.data.subreddits?.map((s: any) => s.id) || []),
          subredditUsage: new Set(fullBackup.data.subredditUsage?.map((s: any) => s.id) || []),
        });
      }
    } catch (err) {
      console.error('Failed to load backup data:', err);
    } finally {
      setLoadingBackupData(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleItem = (category: string, id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev[category]);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { ...prev, [category]: newSet };
    });
  };

  const toggleAllInCategory = (category: string, items: any[]) => {
    setSelectedItems(prev => {
      const allSelected = items.every(item => prev[category].has(item.id));
      if (allSelected) {
        return { ...prev, [category]: new Set() };
      } else {
        return { ...prev, [category]: new Set(items.map(item => item.id)) };
      }
    });
  };

  const filteredDeletedItems = filter === 'all'
    ? deletedItems
    : deletedItems.filter(item => item.type === filter);

  return (
    <div className="h-full flex flex-col px-6 pb-6" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 mt-2 px-1">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {t('backups.title')}
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleImportBackup}
            className="h-9 px-4 flex items-center gap-2 text-sm font-medium"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              borderRadius: '100px',
            }}
          >
            <UploadSimple size={16} weight="bold" />
            {t('backups.import')}
          </button>
          <button
            onClick={() => {
              setBackupName(generateDefaultBackupName());
              setShowCreateModal(true);
            }}
            className="h-9 px-4 flex items-center gap-2 text-sm font-medium"
            style={{
              background: 'var(--accent-blue)',
              color: 'white',
              borderRadius: '100px',
            }}
          >
            <Plus size={16} weight="bold" />
            {t('backups.createBackup')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5 px-1">
        <button
          onClick={() => setActiveTab('backups')}
          className="h-9 px-4 text-sm font-medium transition-colors"
          style={{
            background: activeTab === 'backups' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'backups' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderRadius: '100px',
          }}
        >
          {t('backups.tabBackups')}
        </button>
        <button
          onClick={() => setActiveTab('deleted')}
          className="h-9 px-4 text-sm font-medium transition-colors"
          style={{
            background: activeTab === 'deleted' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'deleted' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderRadius: '100px',
          }}
        >
          {t('backups.tabDeleted')}
          {deletedItems.length > 0 && (
            <span
              className="ml-2 px-2 py-0.5 text-xs"
              style={{
                background: 'var(--accent-red)',
                color: 'white',
                borderRadius: '100px',
              }}
            >
              {deletedItems.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <ArrowsClockwise size={32} weight="bold" className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        ) : activeTab === 'backups' ? (
          /* Backups Tab */
          backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Archive size={48} weight="light" style={{ color: 'var(--text-tertiary)' }} />
              <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>{t('backups.noBackups')}</p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('backups.noBackupsDesc')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="px-5 py-4"
                  style={{ background: 'var(--bg-secondary)', borderRadius: '20px' }}
                >
                  <div className="flex items-start justify-between">
                    {/* Left side: Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                          {backup.name}
                        </h3>
                        <span
                          className="text-xs px-2 py-0.5"
                          style={{
                            background: 'var(--bg-tertiary)',
                            borderRadius: '100px',
                            color: getBackupTypeColor(backup.backupType),
                          }}
                        >
                          {getBackupTypeLabel(backup.backupType)}
                        </span>
                      </div>
                      {backup.description && (
                        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                          {backup.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        <span>{formatTime(backup.createdAt)}</span>
                        <span>{formatFileSize(backup.fileSize)}</span>
                        <span>{formatRecordCounts(backup.recordCounts)}</span>
                      </div>
                    </div>

                    {/* Right side: Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => openRestoreModal(backup)}
                        className="h-8 px-3 flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
                        style={{
                          background: 'var(--accent-green)',
                          borderRadius: '100px',
                          color: 'white',
                        }}
                      >
                        <ArrowCounterClockwise size={14} weight="bold" />
                        {t('backups.restore')}
                      </button>
                      <button
                        onClick={() => handleExportBackup(backup.id)}
                        className="h-8 px-3 flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
                        style={{
                          background: 'var(--bg-tertiary)',
                          borderRadius: '100px',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <DownloadSimple size={14} weight="bold" />
                        {t('backups.export')}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(backup.id)}
                        className="h-8 w-8 flex items-center justify-center hover:opacity-80 transition-opacity"
                        style={{
                          background: 'var(--bg-tertiary)',
                          borderRadius: '100px',
                          color: 'var(--accent-red)',
                        }}
                      >
                        <Trash size={14} weight="bold" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Recently Deleted Tab */
          <>
            {/* Filter */}
            <div className="flex items-center gap-2 mb-4 px-1">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as DeletedFilter)}
                className="h-9 px-3 text-sm"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: 'none',
                  borderRadius: '100px',
                }}
              >
                <option value="all">{t('backups.filterAll')}</option>
                <option value="profile">{t('backups.filterProfiles')}</option>
              </select>
            </div>

            {filteredDeletedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[calc(100%-60px)] gap-3">
                <Trash size={48} weight="light" style={{ color: 'var(--text-tertiary)' }} />
                <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>{t('backups.noDeletedItems')}</p>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('backups.noDeletedItemsDesc')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDeletedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 px-5 py-3"
                    style={{ background: 'var(--bg-secondary)', borderRadius: '34px' }}
                  >
                    {/* Icon */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-red)' }}
                    >
                      <Browser size={16} weight="bold" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                          {item.name}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5"
                          style={{ background: 'var(--bg-tertiary)', borderRadius: '100px', color: 'var(--text-tertiary)' }}
                        >
                          {item.type}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        {t('backups.delete')}d {formatTime(item.deletedAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestoreDeletedItem(item)}
                        className="h-8 px-3 flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
                        style={{
                          background: 'var(--accent-green)',
                          borderRadius: '100px',
                          color: 'white',
                        }}
                      >
                        <ArrowCounterClockwise size={14} weight="bold" />
                        {t('backups.restore')}
                      </button>
                      <button
                        onClick={() => setPermanentDeleteConfirm(item)}
                        className="h-8 px-3 flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
                        style={{
                          background: 'var(--bg-tertiary)',
                          borderRadius: '100px',
                          color: 'var(--accent-red)',
                        }}
                      >
                        <Trash size={14} weight="bold" />
                        {t('backups.permanentDelete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Backup Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !creating && setShowCreateModal(false)}
          />
          <div
            className="relative w-full max-w-md p-6"
            style={{ background: 'var(--bg-secondary)', borderRadius: '24px' }}
          >
            <button
              onClick={() => !creating && setShowCreateModal(false)}
              disabled={creating}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <X size={20} weight="bold" />
            </button>

            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              {t('backups.createBackup')}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {t('backups.name')}
                </label>
                <input
                  type="text"
                  value={backupName}
                  onChange={(e) => setBackupName(e.target.value)}
                  placeholder={t('backups.namePlaceholder')}
                  className="w-full h-10 px-4 text-sm"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: 'none',
                    borderRadius: '100px',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {t('backups.descriptionLabel')}
                </label>
                <input
                  type="text"
                  value={backupDescription}
                  onChange={(e) => setBackupDescription(e.target.value)}
                  placeholder={t('backups.descriptionPlaceholder')}
                  className="w-full h-10 px-4 text-sm"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: 'none',
                    borderRadius: '100px',
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 justify-end mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                className="h-10 px-5 text-sm font-medium"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderRadius: '100px',
                  color: 'var(--text-primary)',
                }}
              >
                {t('logs.cancel')}
              </button>
              <button
                onClick={handleCreateBackup}
                disabled={creating || !backupName.trim()}
                className="h-10 px-5 text-sm font-medium flex items-center gap-2"
                style={{
                  background: creating || !backupName.trim() ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
                  borderRadius: '100px',
                  color: creating || !backupName.trim() ? 'var(--text-tertiary)' : 'white',
                }}
              >
                {creating && <ArrowsClockwise size={16} weight="bold" className="animate-spin" />}
                {creating ? t('backups.creating') : t('backups.createBackup')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Backup Modal */}
      {showRestoreModal && selectedBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !restoring && !loadingBackupData && setShowRestoreModal(false)}
          />
          <div
            className="relative w-full max-w-lg p-6 max-h-[80vh] flex flex-col"
            style={{ background: 'var(--bg-secondary)', borderRadius: '24px' }}
          >
            <button
              onClick={() => !restoring && !loadingBackupData && setShowRestoreModal(false)}
              disabled={restoring || loadingBackupData}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <X size={20} weight="bold" />
            </button>

            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              {t('backups.restoreBackup')}
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              {selectedBackup.name} - {formatTime(selectedBackup.createdAt)}
            </p>

            {loadingBackupData ? (
              <div className="flex-1 flex items-center justify-center py-8">
                <ArrowsClockwise size={32} weight="bold" className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
              </div>
            ) : backupData ? (
              <div className="flex-1 overflow-auto space-y-2 mb-4">
                {/* Profiles Section */}
                {backupData.profiles?.length > 0 && (
                  <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
                    <button
                      onClick={() => toggleSection('profiles')}
                      className="w-full flex items-center gap-3 px-4 py-3"
                    >
                      {expandedSections.profiles ? <CaretDown size={16} /> : <CaretRight size={16} />}
                      <Browser size={18} style={{ color: 'var(--accent-blue)' }} />
                      <span className="text-sm font-medium flex-1 text-left" style={{ color: 'var(--text-primary)' }}>
                        Profiles ({selectedItems.profiles.size}/{backupData.profiles.length})
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleAllInCategory('profiles', backupData.profiles); }}
                        className="text-xs px-2 py-1 hover:opacity-80"
                        style={{ background: 'var(--bg-secondary)', borderRadius: '100px', color: 'var(--text-secondary)' }}
                      >
                        {backupData.profiles.every((p: any) => selectedItems.profiles.has(p.id)) ? 'Deselect All' : 'Select All'}
                      </button>
                    </button>
                    {expandedSections.profiles && (
                      <div className="px-4 pb-3 space-y-1">
                        {backupData.profiles.map((profile: any) => (
                          <button
                            key={profile.id}
                            onClick={() => toggleItem('profiles', profile.id)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors"
                            style={{ borderRadius: '8px' }}
                          >
                            {selectedItems.profiles.has(profile.id) ? (
                              <CheckSquare size={18} weight="fill" style={{ color: 'var(--accent-blue)' }} />
                            ) : (
                              <Square size={18} weight="regular" style={{ color: 'var(--text-tertiary)' }} />
                            )}
                            <span className="text-sm text-left flex-1" style={{ color: 'var(--text-primary)' }}>
                              {profile.accountName || profile.name}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                              {profile.type}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Models Section */}
                {backupData.models?.length > 0 && (
                  <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
                    <button
                      onClick={() => toggleSection('models')}
                      className="w-full flex items-center gap-3 px-4 py-3"
                    >
                      {expandedSections.models ? <CaretDown size={16} /> : <CaretRight size={16} />}
                      <Folders size={18} style={{ color: 'var(--accent-purple, #a78bfa)' }} />
                      <span className="text-sm font-medium flex-1 text-left" style={{ color: 'var(--text-primary)' }}>
                        Models ({selectedItems.models.size}/{backupData.models.length})
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleAllInCategory('models', backupData.models); }}
                        className="text-xs px-2 py-1 hover:opacity-80"
                        style={{ background: 'var(--bg-secondary)', borderRadius: '100px', color: 'var(--text-secondary)' }}
                      >
                        {backupData.models.every((m: any) => selectedItems.models.has(m.id)) ? 'Deselect All' : 'Select All'}
                      </button>
                    </button>
                    {expandedSections.models && (
                      <div className="px-4 pb-3 space-y-1">
                        {backupData.models.map((model: any) => (
                          <button
                            key={model.id}
                            onClick={() => toggleItem('models', model.id)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors"
                            style={{ borderRadius: '8px' }}
                          >
                            {selectedItems.models.has(model.id) ? (
                              <CheckSquare size={18} weight="fill" style={{ color: 'var(--accent-blue)' }} />
                            ) : (
                              <Square size={18} weight="regular" style={{ color: 'var(--text-tertiary)' }} />
                            )}
                            <span className="text-sm text-left" style={{ color: 'var(--text-primary)' }}>
                              {model.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Users Section */}
                {backupData.appUsers?.length > 0 && (
                  <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
                    <button
                      onClick={() => toggleSection('users')}
                      className="w-full flex items-center gap-3 px-4 py-3"
                    >
                      {expandedSections.users ? <CaretDown size={16} /> : <CaretRight size={16} />}
                      <User size={18} style={{ color: 'var(--accent-green)' }} />
                      <span className="text-sm font-medium flex-1 text-left" style={{ color: 'var(--text-primary)' }}>
                        Users ({selectedItems.users.size}/{backupData.appUsers.length})
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleAllInCategory('users', backupData.appUsers); }}
                        className="text-xs px-2 py-1 hover:opacity-80"
                        style={{ background: 'var(--bg-secondary)', borderRadius: '100px', color: 'var(--text-secondary)' }}
                      >
                        {backupData.appUsers.every((u: any) => selectedItems.users.has(u.id)) ? 'Deselect All' : 'Select All'}
                      </button>
                    </button>
                    {expandedSections.users && (
                      <div className="px-4 pb-3 space-y-1">
                        {backupData.appUsers.map((user: any) => (
                          <button
                            key={user.id}
                            onClick={() => toggleItem('users', user.id)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors"
                            style={{ borderRadius: '8px' }}
                          >
                            {selectedItems.users.has(user.id) ? (
                              <CheckSquare size={18} weight="fill" style={{ color: 'var(--accent-blue)' }} />
                            ) : (
                              <Square size={18} weight="regular" style={{ color: 'var(--text-tertiary)' }} />
                            )}
                            <span className="text-sm text-left flex-1" style={{ color: 'var(--text-primary)' }}>
                              {user.username}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                              {user.role}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Emails Section */}
                {(backupData.mainEmails?.length > 0 || backupData.subEmails?.length > 0) && (
                  <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
                    <button
                      onClick={() => toggleSection('emails')}
                      className="w-full flex items-center gap-3 px-4 py-3"
                    >
                      {expandedSections.emails ? <CaretDown size={16} /> : <CaretRight size={16} />}
                      <Envelope size={18} style={{ color: 'var(--accent-orange, #f59e0b)' }} />
                      <span className="text-sm font-medium flex-1 text-left" style={{ color: 'var(--text-primary)' }}>
                        Emails ({selectedItems.mainEmails.size + selectedItems.subEmails.size}/{(backupData.mainEmails?.length || 0) + (backupData.subEmails?.length || 0)})
                      </span>
                    </button>
                    {expandedSections.emails && (
                      <div className="px-4 pb-3 space-y-1">
                        {backupData.mainEmails?.map((email: any) => (
                          <button
                            key={email.id}
                            onClick={() => toggleItem('mainEmails', email.id)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors"
                            style={{ borderRadius: '8px' }}
                          >
                            {selectedItems.mainEmails.has(email.id) ? (
                              <CheckSquare size={18} weight="fill" style={{ color: 'var(--accent-blue)' }} />
                            ) : (
                              <Square size={18} weight="regular" style={{ color: 'var(--text-tertiary)' }} />
                            )}
                            <span className="text-sm text-left flex-1" style={{ color: 'var(--text-primary)' }}>
                              {email.email}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--accent-orange, #f59e0b)' }}>
                              main
                            </span>
                          </button>
                        ))}
                        {backupData.subEmails?.map((email: any) => (
                          <button
                            key={email.id}
                            onClick={() => toggleItem('subEmails', email.id)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors"
                            style={{ borderRadius: '8px' }}
                          >
                            {selectedItems.subEmails.has(email.id) ? (
                              <CheckSquare size={18} weight="fill" style={{ color: 'var(--accent-blue)' }} />
                            ) : (
                              <Square size={18} weight="regular" style={{ color: 'var(--text-tertiary)' }} />
                            )}
                            <span className="text-sm text-left flex-1" style={{ color: 'var(--text-primary)' }}>
                              {email.email}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                              sub
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Reddit Posts Section */}
                {backupData.redditPosts?.length > 0 && (
                  <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
                    <button
                      onClick={() => toggleSection('posts')}
                      className="w-full flex items-center gap-3 px-4 py-3"
                    >
                      {expandedSections.posts ? <CaretDown size={16} /> : <CaretRight size={16} />}
                      <Article size={18} style={{ color: 'var(--accent-red)' }} />
                      <span className="text-sm font-medium flex-1 text-left" style={{ color: 'var(--text-primary)' }}>
                        Reddit Posts ({selectedItems.redditPosts.size}/{backupData.redditPosts.length})
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleAllInCategory('redditPosts', backupData.redditPosts); }}
                        className="text-xs px-2 py-1 hover:opacity-80"
                        style={{ background: 'var(--bg-secondary)', borderRadius: '100px', color: 'var(--text-secondary)' }}
                      >
                        {backupData.redditPosts.every((p: any) => selectedItems.redditPosts.has(p.id)) ? 'Deselect All' : 'Select All'}
                      </button>
                    </button>
                    {expandedSections.posts && (
                      <div className="px-4 pb-3 space-y-1 max-h-48 overflow-auto">
                        {backupData.redditPosts.map((post: any) => (
                          <button
                            key={post.id}
                            onClick={() => toggleItem('redditPosts', post.id)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors"
                            style={{ borderRadius: '8px' }}
                          >
                            {selectedItems.redditPosts.has(post.id) ? (
                              <CheckSquare size={18} weight="fill" style={{ color: 'var(--accent-blue)' }} />
                            ) : (
                              <Square size={18} weight="regular" style={{ color: 'var(--text-tertiary)' }} />
                            )}
                            <span className="text-sm text-left flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                              {post.title || post.subreddit || 'Untitled'}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                              r/{post.subreddit}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Subreddits Section */}
                {backupData.subreddits?.length > 0 && (
                  <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
                    <button
                      onClick={() => toggleSection('subreddits')}
                      className="w-full flex items-center gap-3 px-4 py-3"
                    >
                      {expandedSections.subreddits ? <CaretDown size={16} /> : <CaretRight size={16} />}
                      <Article size={18} style={{ color: 'var(--accent-purple, #a78bfa)' }} />
                      <span className="text-sm font-medium flex-1 text-left" style={{ color: 'var(--text-primary)' }}>
                        Subreddits ({selectedItems.subreddits.size}/{backupData.subreddits.length})
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleAllInCategory('subreddits', backupData.subreddits); }}
                        className="text-xs px-2 py-1 hover:opacity-80"
                        style={{ background: 'var(--bg-secondary)', borderRadius: '100px', color: 'var(--text-secondary)' }}
                      >
                        {backupData.subreddits.every((s: any) => selectedItems.subreddits.has(s.id)) ? 'Deselect All' : 'Select All'}
                      </button>
                    </button>
                    {expandedSections.subreddits && (
                      <div className="px-4 pb-3 space-y-1">
                        {backupData.subreddits.map((sub: any) => (
                          <button
                            key={sub.id}
                            onClick={() => toggleItem('subreddits', sub.id)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors"
                            style={{ borderRadius: '8px' }}
                          >
                            {selectedItems.subreddits.has(sub.id) ? (
                              <CheckSquare size={18} weight="fill" style={{ color: 'var(--accent-blue)' }} />
                            ) : (
                              <Square size={18} weight="regular" style={{ color: 'var(--text-tertiary)' }} />
                            )}
                            <span className="text-sm text-left flex-1" style={{ color: 'var(--text-primary)' }}>
                              r/{sub.name || sub.subreddit}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Subreddit Usage Section */}
                {backupData.subredditUsage?.length > 0 && (
                  <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
                    <button
                      onClick={() => toggleSection('subredditUsage')}
                      className="w-full flex items-center gap-3 px-4 py-3"
                    >
                      {expandedSections.subredditUsage ? <CaretDown size={16} /> : <CaretRight size={16} />}
                      <Article size={18} style={{ color: 'var(--accent-green)' }} />
                      <span className="text-sm font-medium flex-1 text-left" style={{ color: 'var(--text-primary)' }}>
                        Subreddit Usage ({selectedItems.subredditUsage.size}/{backupData.subredditUsage.length})
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleAllInCategory('subredditUsage', backupData.subredditUsage); }}
                        className="text-xs px-2 py-1 hover:opacity-80"
                        style={{ background: 'var(--bg-secondary)', borderRadius: '100px', color: 'var(--text-secondary)' }}
                      >
                        {backupData.subredditUsage.every((s: any) => selectedItems.subredditUsage.has(s.id)) ? 'Deselect All' : 'Select All'}
                      </button>
                    </button>
                    {expandedSections.subredditUsage && (
                      <div className="px-4 pb-3 space-y-1">
                        {backupData.subredditUsage.map((usage: any) => (
                          <button
                            key={usage.id}
                            onClick={() => toggleItem('subredditUsage', usage.id)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors"
                            style={{ borderRadius: '8px' }}
                          >
                            {selectedItems.subredditUsage.has(usage.id) ? (
                              <CheckSquare size={18} weight="fill" style={{ color: 'var(--accent-blue)' }} />
                            ) : (
                              <Square size={18} weight="regular" style={{ color: 'var(--text-tertiary)' }} />
                            )}
                            <span className="text-sm text-left flex-1" style={{ color: 'var(--text-primary)' }}>
                              r/{usage.subreddit}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center py-8">
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Failed to load backup data</p>
              </div>
            )}

            {/* Overwrite toggle */}
            <div
              className="p-3 mb-4"
              style={{ background: 'var(--bg-tertiary)', borderRadius: '12px' }}
            >
              <button
                onClick={() => setOverwriteExisting(!overwriteExisting)}
                className="w-full flex items-center gap-3"
              >
                {overwriteExisting ? (
                  <CheckSquare size={20} weight="fill" style={{ color: 'var(--accent-orange, #f59e0b)' }} />
                ) : (
                  <Square size={20} weight="regular" style={{ color: 'var(--text-tertiary)' }} />
                )}
                <div className="flex-1 text-left">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {t('backups.overwriteExisting')}
                  </span>
                </div>
                <Warning size={16} weight="bold" style={{ color: 'var(--accent-orange, #f59e0b)' }} />
              </button>
            </div>

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => { setShowRestoreModal(false); setBackupData(null); }}
                disabled={restoring}
                className="h-10 px-5 text-sm font-medium"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderRadius: '100px',
                  color: 'var(--text-primary)',
                }}
              >
                {t('logs.cancel')}
              </button>
              <button
                onClick={handleRestoreBackup}
                disabled={restoring || loadingBackupData || (
                  selectedItems.profiles.size === 0 &&
                  selectedItems.models.size === 0 &&
                  selectedItems.users.size === 0 &&
                  selectedItems.mainEmails.size === 0 &&
                  selectedItems.subEmails.size === 0 &&
                  selectedItems.redditPosts.size === 0 &&
                  selectedItems.subreddits.size === 0 &&
                  selectedItems.subredditUsage.size === 0
                )}
                className="h-10 px-5 text-sm font-medium flex items-center gap-2"
                style={{
                  background: restoring || loadingBackupData ? 'var(--bg-tertiary)' : 'var(--accent-green)',
                  borderRadius: '100px',
                  color: restoring || loadingBackupData ? 'var(--text-tertiary)' : 'white',
                }}
              >
                {restoring && <ArrowsClockwise size={16} weight="bold" className="animate-spin" />}
                {restoring ? t('backups.restoring') : t('backups.restore')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Backup Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeleteConfirmId(null)}
          />
          <div
            className="relative w-full max-w-sm p-6"
            style={{ background: 'var(--bg-secondary)', borderRadius: '24px' }}
          >
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              {t('backups.delete')}
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              {t('backups.confirmDelete')}
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="h-10 px-5 text-sm font-medium"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderRadius: '100px',
                  color: 'var(--text-primary)',
                }}
              >
                {t('logs.cancel')}
              </button>
              <button
                onClick={() => handleDeleteBackup(deleteConfirmId)}
                className="h-10 px-5 text-sm font-medium"
                style={{
                  background: 'var(--accent-red)',
                  borderRadius: '100px',
                  color: 'white',
                }}
              >
                {t('backups.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {permanentDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setPermanentDeleteConfirm(null)}
          />
          <div
            className="relative w-full max-w-sm p-6"
            style={{ background: 'var(--bg-secondary)', borderRadius: '24px' }}
          >
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              {t('backups.permanentDelete')}
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              {t('backups.confirmPermanentDelete')}
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setPermanentDeleteConfirm(null)}
                className="h-10 px-5 text-sm font-medium"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderRadius: '100px',
                  color: 'var(--text-primary)',
                }}
              >
                {t('logs.cancel')}
              </button>
              <button
                onClick={() => handlePermanentDelete(permanentDeleteConfirm)}
                className="h-10 px-5 text-sm font-medium"
                style={{
                  background: 'var(--accent-red)',
                  borderRadius: '100px',
                  color: 'white',
                }}
              >
                {t('backups.permanentDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BackupsPage;
