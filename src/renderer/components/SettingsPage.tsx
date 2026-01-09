import { useState, useEffect } from 'react';
import { ArrowsClockwise, DownloadSimple, ArrowSquareOut, CheckCircle, XCircle, Info } from '@phosphor-icons/react';

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

export default function SettingsPage() {
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
        return 'Checking for updates...';
      case 'available':
        return `Version ${updateStatus.version} is available`;
      case 'not-available':
        return 'You have the latest version';
      case 'downloading':
        if (downloadProgress) {
          return `Downloading... ${downloadProgress.percent.toFixed(0)}%`;
        }
        return 'Starting download...';
      case 'downloaded':
        return `Version ${updateStatus.version} is ready to install`;
      case 'error':
        return updateStatus.error || 'Update check failed';
      default:
        return 'Click to check for updates';
    }
  };

  return (
    <main className="px-6 pb-6 flex-1">
      <div className="flex items-center gap-3 mb-5 mt-2 px-1">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Settings
        </h1>
      </div>

      <div className="max-w-xl">
        {/* Updates Section */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-secondary)' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Updates
          </h2>

          {/* Current Version */}
          <div className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Current Version</p>
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
                        background: 'var(--accent-blue)',
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
                Check for Updates
              </button>
            ) : updateStatus.status === 'available' ? (
              <button
                onClick={handleDownloadUpdate}
                className="h-9 px-4 flex items-center gap-2 text-sm font-medium rounded-full transition-colors"
                style={{
                  background: 'var(--accent-blue)',
                  color: '#fff',
                }}
              >
                <DownloadSimple size={16} weight="bold" />
                Download Update
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
                Restart & Install
              </button>
            ) : null}
          </div>
        </div>

        {/* About Section */}
        <div className="rounded-2xl p-5 mt-4" style={{ background: 'var(--bg-secondary)' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            About
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Redash is a browser profile manager with proxy support, mobile device emulation, and AI integration.
          </p>
        </div>
      </div>
    </main>
  );
}
