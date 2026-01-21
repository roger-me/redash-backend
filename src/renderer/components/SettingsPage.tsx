import { useState, useEffect } from 'react';
import { ArrowsClockwise, DownloadSimple, ArrowSquareOut, CheckCircle, XCircle, Info, SignOut } from '@phosphor-icons/react';
import { useLanguage } from '../i18n';
import usFlag from '../assets/flags/US.png';
import esFlag from '../assets/flags/ES.png';

interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  error?: string;
  releaseNotes?: string;
}

interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

interface SettingsPageProps {
  user?: { id: string; username?: string; role?: string } | null;
  onSignOut: () => void;
  theme: string;
  onChangeTheme: (theme: string) => void;
}

const THEMES = [
  { id: 'light', name: 'Light', accent: '#FFFFFF', border: 'rgba(0,0,0,0.2)' },
  { id: 'dark', name: 'Dark', accent: '#000000', border: 'rgba(255,255,255,0.2)' },
  { id: 'nord', name: 'Nord', accent: '#88C0D0' },
  { id: 'dracula', name: 'Dracula', accent: '#BD93F9' },
  { id: 'cyberpunk', name: 'Cyberpunk', accent: '#F5E946' },
];

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

const getAvatarColor = (name: string): string => {
  if (!name) return '#808080';
  // Better hash using prime multiplier for more spread
  let hash = 7;
  for (let i = 0; i < name.length; i++) {
    hash = hash * 31 + name.charCodeAt(i);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

export default function SettingsPage({ user, onSignOut, theme, onChangeTheme }: SettingsPageProps) {
  const { t, language, setLanguage } = useLanguage();
  const [appVersion, setAppVersion] = useState<string>('');
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ status: 'idle' });
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);

  useEffect(() => {
    // Get current app version
    window.electronAPI?.getAppVersion().then(version => {
      setAppVersion(version);
    });

    // Listen for update status changes
    const removeStatusListener = window.electronAPI?.onUpdaterStatus((data) => {
      setUpdateStatus({
        status: data.status as UpdateStatus['status'],
        version: data.version,
        error: data.error,
        releaseNotes: data.releaseNotes as string | undefined,
      });
      if (data.status === 'downloaded' || data.status === 'not-available' || data.status === 'error') {
        setDownloadProgress(null);
      }
    });

    // Listen for download progress
    const removeProgressListener = window.electronAPI?.onUpdaterProgress((data) => {
      setDownloadProgress(data);
    });

    return () => {
      removeStatusListener?.();
      removeProgressListener?.();
    };
  }, []);

  const handleCheckForUpdates = async () => {
    setUpdateStatus({ status: 'checking' });
    setDownloadProgress(null);
    try {
      const result = await window.electronAPI?.checkForUpdates();
      if (!result?.success && result?.error) {
        setUpdateStatus({ status: 'error', error: result.error });
      }
    } catch (error) {
      setUpdateStatus({ status: 'error', error: (error as Error).message });
    }
  };

  const handleDownloadUpdate = async () => {
    setUpdateStatus(prev => ({ ...prev, status: 'downloading' }));
    try {
      const result = await window.electronAPI?.downloadUpdate();
      if (!result?.success && result?.error) {
        setUpdateStatus({ status: 'error', error: result.error });
      }
    } catch (error) {
      setUpdateStatus({ status: 'error', error: (error as Error).message });
    }
  };

  const handleInstallUpdate = () => {
    window.electronAPI?.installUpdate();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusIcon = () => {
    switch (updateStatus.status) {
      case 'checking':
      case 'downloading':
        return <ArrowsClockwise size={20} weight="bold" className="animate-spin" style={{ color: 'var(--accent-blue)' }} />;
      case 'available':
        return <DownloadSimple size={20} weight="bold" style={{ color: 'var(--accent-blue)' }} />;
      case 'downloaded':
        return <CheckCircle size={20} weight="fill" style={{ color: 'var(--accent-green)' }} />;
      case 'not-available':
        return <CheckCircle size={20} weight="fill" style={{ color: 'var(--accent-green)' }} />;
      case 'error':
        return <XCircle size={20} weight="fill" style={{ color: 'var(--accent-red)' }} />;
      default:
        return <Info size={20} weight="bold" style={{ color: 'var(--text-tertiary)' }} />;
    }
  };

  const getStatusMessage = () => {
    switch (updateStatus.status) {
      case 'checking':
        return t('settings.checkingUpdates');
      case 'available':
        return t('settings.versionAvailable', { version: updateStatus.version || '' });
      case 'not-available':
        return t('settings.latestVersion');
      case 'downloading':
        if (downloadProgress) {
          return t('settings.downloading', { percent: downloadProgress.percent.toFixed(0) });
        }
        return t('settings.startingDownload');
      case 'downloaded':
        return t('settings.readyToInstall', { version: updateStatus.version || '' });
      case 'error':
        return updateStatus.error || t('settings.updateFailed');
      default:
        return t('settings.clickToCheck');
    }
  };

  return (
    <main className="px-6 pb-6 flex-1">
      <div className="flex items-center gap-3 mb-5 mt-2 px-1">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {t('settings.title')}
        </h1>
      </div>

      <div className="space-y-4">
        {/* Account Section */}
        <div className="p-5" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            {t('settings.account')}
          </h2>
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
              style={{ background: getAvatarColor(user?.username || ''), color: '#000' }}
            >
              {(user?.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{user?.username || t('messages.user')}</p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {user?.role === 'dev' ? t('settings.developer') : user?.role === 'admin' ? t('settings.administrator') : t('settings.basicUser')}
              </p>
            </div>
            <button
              onClick={onSignOut}
              className="h-9 px-4 flex items-center gap-2 text-sm font-medium rounded-full transition-colors hover:opacity-80"
              style={{
                background: 'rgba(255, 69, 58, 0.15)',
                color: 'var(--accent-red)',
              }}
            >
              <SignOut size={16} weight="bold" />
              {t('settings.signOut')}
            </button>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="p-5" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            {t('settings.appearance')}
          </h2>

          {/* Theme */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{t('settings.theme')}</p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {THEMES.find(th => th.id === theme)?.name || 'Dark'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {THEMES.map((themeOption) => (
                <button
                  key={themeOption.id}
                  onClick={() => onChangeTheme(themeOption.id)}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    background: themeOption.accent,
                    border: themeOption.border ? `1px solid ${themeOption.border}` : 'none',
                    boxShadow: theme === themeOption.id
                      ? `0 0 0 2px var(--bg-secondary), 0 0 0 4px ${themeOption.accent}`
                      : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <div>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{t('settings.language')}</p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {language === 'en' ? t('settings.english') : t('settings.spanish')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLanguage('en')}
                className="h-9 px-4 flex items-center gap-2 text-sm font-medium rounded-full transition-colors"
                style={{
                  background: language === 'en' ? 'var(--accent-primary)' : 'var(--chip-bg)',
                  color: language === 'en' ? 'var(--accent-text)' : 'var(--text-primary)',
                }}
              >
                <img src={usFlag} alt="English" className="w-4 h-3 object-contain" /> EN
              </button>
              <button
                onClick={() => setLanguage('es')}
                className="h-9 px-4 flex items-center gap-2 text-sm font-medium rounded-full transition-colors"
                style={{
                  background: language === 'es' ? 'var(--accent-primary)' : 'var(--chip-bg)',
                  color: language === 'es' ? 'var(--accent-text)' : 'var(--text-primary)',
                }}
              >
                <img src={esFlag} alt="Español" className="w-4 h-3 object-contain" /> ES
              </button>
            </div>
          </div>
        </div>

        {/* Updates Section */}
        <div className="p-5" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            {t('settings.updates')}
          </h2>

          {/* Current Version */}
          <div className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('settings.currentVersion')}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>v{appVersion}</p>
            </div>
          </div>

          {/* Update Status */}
          <div className="flex items-start gap-3 mb-4">
            <div className="mt-0.5">{getStatusIcon()}</div>
            <div className="flex-1">
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{getStatusMessage()}</p>

              {/* Download Progress Bar */}
              {updateStatus.status === 'downloading' && downloadProgress && (
                <div className="mt-3">
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${downloadProgress.percent}%`,
                        background: 'var(--accent-primary)',
                      }}
                    />
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                    {formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)} • {formatBytes(downloadProgress.bytesPerSecond)}/s
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {updateStatus.status === 'idle' || updateStatus.status === 'not-available' || updateStatus.status === 'error' ? (
              <button
                onClick={handleCheckForUpdates}
                className="h-9 px-4 flex items-center gap-2 text-sm font-medium rounded-full transition-colors"
                style={{
                  background: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-color)',
                }}
              >
                <ArrowsClockwise size={16} weight="bold" />
                {t('settings.checkForUpdates')}
              </button>
            ) : updateStatus.status === 'available' ? (
              <button
                onClick={handleDownloadUpdate}
                className="h-9 px-4 flex items-center gap-2 text-sm font-medium rounded-full transition-colors"
                style={{
                  background: 'var(--accent-primary)',
                  color: 'var(--accent-text)',
                }}
              >
                <DownloadSimple size={16} weight="bold" />
                {t('settings.downloadUpdate')}
              </button>
            ) : updateStatus.status === 'downloaded' ? (
              <button
                onClick={handleInstallUpdate}
                className="h-9 px-4 flex items-center gap-2 text-sm font-medium rounded-full transition-colors"
                style={{
                  background: 'var(--accent-green)',
                  color: '#fff',
                }}
              >
                <ArrowSquareOut size={16} weight="bold" />
                {t('settings.restartInstall')}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
