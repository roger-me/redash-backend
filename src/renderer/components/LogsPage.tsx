import { useState, useEffect } from 'react';
import { ArrowsClockwise, User, FolderSimple, Browser, EnvelopeSimple, Trash, PencilSimple, Plus, SignOut, ArrowCounterClockwise, X } from '@phosphor-icons/react';
import { useLanguage } from '../i18n';

interface ActivityLog {
  id: string;
  userId: string | null;
  username: string;
  action: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  details?: Record<string, any>;
  createdAt: string;
}

function LogsPage() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [redoModal, setRedoModal] = useState<ActivityLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    console.log('LogsPage - loadLogs called');
    setLoading(true);
    try {
      console.log('LogsPage - calling getActivityLogs...');
      const data = await window.electronAPI?.getActivityLogs(200);
      console.log('LogsPage - received data:', data);
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string, entityType?: string) => {
    if (action.includes('delete') || action.includes('archive')) return <Trash size={16} weight="bold" />;
    if (action.includes('create') || action.includes('add')) return <Plus size={16} weight="bold" />;
    if (action.includes('update') || action.includes('edit')) return <PencilSimple size={16} weight="bold" />;
    if (action.includes('restore')) return <ArrowCounterClockwise size={16} weight="bold" />;
    if (action.includes('login')) return <User size={16} weight="bold" />;
    if (action.includes('logout')) return <SignOut size={16} weight="bold" />;

    switch (entityType) {
      case 'profile': return <Browser size={16} weight="bold" />;
      case 'model': return <FolderSimple size={16} weight="bold" />;
      case 'user': return <User size={16} weight="bold" />;
      case 'email': return <EnvelopeSimple size={16} weight="bold" />;
      default: return <ArrowsClockwise size={16} weight="bold" />;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('delete') || action.includes('archive')) return 'var(--accent-red)';
    if (action.includes('create') || action.includes('add')) return 'var(--accent-green)';
    if (action.includes('update') || action.includes('edit')) return 'var(--accent-blue)';
    if (action.includes('restore')) return 'var(--accent-green)';
    if (action.includes('login')) return 'var(--accent-blue)';
    if (action.includes('logout')) return 'var(--text-tertiary)';
    return 'var(--text-secondary)';
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

  const formatAction = (log: ActivityLog) => {
    return (
      <span style={{ color: getActionColor(log.action) }}>{log.action}</span>
    );
  };

  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter(log => log.entityType === filter || log.action.includes(filter));

  const uniqueEntityTypes = [...new Set(logs.map(l => l.entityType).filter(Boolean))];

  return (
    <div className="h-full flex flex-col px-6 pb-6" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 mt-2 px-1">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {t('logs.title')}
        </h1>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-9 px-3 text-sm"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: 'none',
              borderRadius: '100px',
            }}
          >
            <option value="all">{t('logs.filterAll')}</option>
            <option value="profile">{t('logs.filterProfiles')}</option>
            <option value="model">{t('logs.filterModels')}</option>
            <option value="user">{t('logs.filterUsers')}</option>
            <option value="email">{t('logs.filterEmails')}</option>
          </select>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="h-9 px-4 flex items-center gap-2 text-sm font-medium"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              borderRadius: '100px',
            }}
          >
            <ArrowsClockwise size={16} weight="bold" className={loading ? 'animate-spin' : ''} />
            {t('logs.refresh')}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <ArrowsClockwise size={32} weight="bold" className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <ArrowsClockwise size={48} weight="light" style={{ color: 'var(--text-tertiary)' }} />
            <p style={{ color: 'var(--text-tertiary)' }}>{t('logs.empty')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log, index) => {
              const prevLog = filteredLogs[index - 1];
              const currentDate = new Date(log.createdAt).toDateString();
              const prevDate = prevLog ? new Date(prevLog.createdAt).toDateString() : null;
              const showDateHeader = currentDate !== prevDate;

              return (
                <div key={log.id}>
                  {showDateHeader && (
                    <div className="py-2 px-2 mt-4 first:mt-0">
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}>
                        {new Date(log.createdAt).toLocaleDateString(undefined, {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                  <div
                    className="flex items-center gap-4 px-5 py-3"
                    style={{ background: 'var(--bg-secondary)', borderRadius: '34px' }}
                  >
                    {/* Icon */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--bg-tertiary)', color: getActionColor(log.action) }}
                    >
                      {getActionIcon(log.action, log.entityType)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                          {log.username}
                        </span>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {formatAction(log)}
                        </span>
                        {log.entityName && (
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            "{log.entityName}"
                          </span>
                        )}
                        {log.entityType && (
                          <span
                            className="text-xs px-2 py-0.5"
                            style={{ background: 'var(--bg-tertiary)', borderRadius: '100px', color: 'var(--text-tertiary)' }}
                          >
                            {log.entityType}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Time */}
                    <div className="text-xs flex-shrink-0 mr-2" style={{ color: 'var(--text-tertiary)' }}>
                      {formatTime(log.createdAt)}
                    </div>

                    {/* Redo button */}
                    <button
                      onClick={() => setRedoModal(log)}
                      className="h-7 px-3 flex items-center gap-1.5 text-xs font-medium hover:bg-white/10 transition-colors"
                      style={{
                        background: 'var(--bg-tertiary)',
                        borderRadius: '100px',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      <ArrowCounterClockwise size={14} weight="bold" />
                      {t('logs.redo')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Redo Confirmation Modal */}
      {redoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setRedoModal(null)}
          />
          <div
            className="relative w-full max-w-md p-6"
            style={{ background: 'var(--bg-secondary)', borderRadius: '24px' }}
          >
            <button
              onClick={() => setRedoModal(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <X size={20} weight="bold" />
            </button>

            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              {t('logs.redoTitle')}
            </h2>

            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              {t('logs.redoConfirm', {
                action: redoModal.action,
                entity: redoModal.entityName || redoModal.entityType || ''
              })}
            </p>

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setRedoModal(null)}
                className="h-10 px-5 text-sm font-medium"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderRadius: '100px',
                  color: 'var(--text-primary)'
                }}
              >
                {t('logs.cancel')}
              </button>
              <button
                onClick={() => {
                  // TODO: Implement redo action
                  console.log('Redo action:', redoModal);
                  setRedoModal(null);
                }}
                className="h-10 px-5 text-sm font-medium"
                style={{
                  background: 'var(--accent-blue)',
                  borderRadius: '100px',
                  color: 'white'
                }}
              >
                {t('logs.redoAction')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogsPage;
