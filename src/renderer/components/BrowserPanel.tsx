import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, ArrowClockwise, X, Plus, Compass } from '@phosphor-icons/react';

interface Tab {
  id: string;
  title: string;
  active: boolean;
}

interface BrowserPanelProps {
  profileId: string;
  profileName: string;
  onClose: () => void;
}

export default function BrowserPanel({ profileId, profileName, onClose }: BrowserPanelProps) {
  const [url, setUrl] = useState('');
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [proxyStatus, setProxyStatus] = useState<'checking' | 'connected' | 'error' | ''>('');
  const [proxyIP, setProxyIP] = useState('');
  const [isStartPage, setIsStartPage] = useState(true);

  useEffect(() => {
    // Listen for URL changes
    const handleUrlChanged = (newUrl: string) => {
      setUrl(newUrl);
      setIsStartPage(newUrl.startsWith('data:') || newUrl === 'about:blank');
    };

    // Listen for tabs updates
    const handleTabsUpdated = (newTabs: Tab[]) => {
      setTabs(newTabs);
    };

    // Listen for proxy status
    const handleProxyStatus = (status: string, ip: string) => {
      setProxyStatus(status as any);
      setProxyIP(ip);
    };

    window.electronAPI?.onBrowserUrlChanged(handleUrlChanged);
    window.electronAPI?.onBrowserTabsUpdated(handleTabsUpdated);
    window.electronAPI?.onBrowserProxyStatus(handleProxyStatus);

    return () => {
      window.electronAPI?.removeBrowserListeners();
    };
  }, [profileId]);

  const handleNavigate = (targetUrl: string) => {
    let finalUrl = targetUrl;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    setUrl(finalUrl);
    window.electronAPI?.browserNavigate(finalUrl);
    setIsStartPage(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNavigate(url);
    }
  };

  const handleQuickNav = (targetUrl: string) => {
    handleNavigate(targetUrl);
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        background: 'var(--bg-secondary)',
      }}
    >
      {/* Status bar */}
      <div
        className="h-8 flex items-center justify-between px-4 text-xs"
        style={{ borderBottom: '1px solid var(--border-light)' }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X size={12} weight="bold" />
          </button>
          {proxyStatus && (
            <>
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background:
                    proxyStatus === 'connected' ? 'var(--accent-green)' :
                    proxyStatus === 'error' ? 'var(--accent-red)' :
                    proxyStatus === 'checking' ? 'var(--accent-orange)' : 'var(--text-tertiary)',
                  animation: proxyStatus === 'checking' ? 'pulse 1s infinite' : 'none',
                }}
              />
              <span style={{ color: 'var(--text-tertiary)' }}>
                {proxyStatus === 'connected' ? 'Proxy Connected' :
                 proxyStatus === 'error' ? 'Proxy Error' :
                 proxyStatus === 'checking' ? 'Checking proxy...' : 'Direct'}
              </span>
            </>
          )}
          {proxyIP && (
            <span style={{ color: 'var(--text-quaternary)', fontFamily: 'monospace' }}>
              {proxyIP}
            </span>
          )}
        </div>
        <span style={{ color: 'var(--text-tertiary)' }}>{profileName}</span>
      </div>

      {/* Tab bar */}
      <div
        className="h-9 flex items-end px-2 gap-1"
        style={{ borderBottom: '1px solid var(--border-light)' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => window.electronAPI?.browserSwitchTab(tab.id)}
            className="h-7 min-w-[100px] max-w-[180px] px-2 flex items-center gap-1 text-xs transition-colors"
            style={{
              background: tab.active ? 'var(--bg-tertiary)' : 'transparent',
              color: tab.active ? 'var(--text-primary)' : 'var(--text-tertiary)',
              borderRadius: '6px 6px 0 0',
            }}
          >
            <span className="flex-1 truncate text-left">{tab.title || 'New Tab'}</span>
            {tabs.length > 1 && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.electronAPI?.browserCloseTab(tab.id);
                }}
                className="w-4 h-4 flex items-center justify-center rounded hover:bg-white/10"
              >
                <X size={10} weight="bold" />
              </span>
            )}
          </button>
        ))}
        <button
          onClick={() => window.electronAPI?.browserNewTab()}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 mb-0.5"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <Plus size={14} weight="bold" />
        </button>
      </div>

      {/* Navigation bar */}
      <div className="h-12 flex items-center gap-2 px-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <button
          onClick={() => window.electronAPI?.browserBack()}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <ArrowLeft size={16} weight="bold" />
        </button>
        <button
          onClick={() => window.electronAPI?.browserForward()}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <ArrowRight size={16} weight="bold" />
        </button>
        <button
          onClick={() => window.electronAPI?.browserRefresh()}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <ArrowClockwise size={16} weight="bold" />
        </button>
        <input
          type="text"
          value={isStartPage ? '' : url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter URL..."
          className="flex-1 h-8 px-3 text-xs rounded-lg outline-none"
          style={{
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-light)',
          }}
        />
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <X size={16} weight="bold" />
        </button>
      </div>

      {/* Browser content area - this is where BrowserView will be positioned */}
      <div className="flex-1 relative" id="browser-content">
        {isStartPage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6" style={{ background: 'var(--bg-primary)' }}>
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Quick Navigation</span>
            <div className="flex gap-4">
              <button
                onClick={() => proxyStatus === 'connected' && handleQuickNav('https://www.reddit.com')}
                disabled={proxyStatus !== 'connected' && proxyStatus !== ''}
                className="w-24 h-24 flex flex-col items-center justify-center gap-2 rounded-2xl transition-all"
                style={{
                  background: 'var(--bg-secondary)',
                  color: proxyStatus === 'connected' || proxyStatus === '' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  opacity: proxyStatus === 'connected' || proxyStatus === '' ? 1 : 0.5,
                  cursor: proxyStatus === 'connected' || proxyStatus === '' ? 'pointer' : 'not-allowed',
                }}
              >
                <svg viewBox="0 0 256 256" fill="currentColor" className="w-8 h-8">
                  <path d="M248,104a32,32,0,0,0-52.94-24.19c-16.75-8.9-36.76-14.28-57.66-15.53l5.19-31.17,17.72,2.72a24,24,0,1,0,2.87-15.74l-26-4a8,8,0,0,0-9.11,6.59L121.2,64.16c-21.84.94-42.82,6.38-60.26,15.65a32,32,0,0,0-42.59,47.74A59,59,0,0,0,16,144c0,21.93,12,42.35,33.91,57.49C70.88,216,98.61,224,128,224s57.12-8,78.09-22.51C228,186.35,240,165.93,240,144a59,59,0,0,0-2.35-16.45A32.16,32.16,0,0,0,248,104ZM184,24a8,8,0,1,1-8,8A8,8,0,0,1,184,24Zm40,80a16.07,16.07,0,0,1-7.93,13.79,8,8,0,0,0-3.9,5.53,43.34,43.34,0,0,1,.83,8.68c0,39.7-43.89,64-85,64s-85-24.3-85-64a43.34,43.34,0,0,1,.83-8.68,8,8,0,0,0-3.9-5.53A16,16,0,1,1,60.93,95.48a8,8,0,0,0,8.21-1.93c14.8-13.06,35.1-20.58,57.24-21.47L128,72l1.62,0c22.14.89,42.44,8.41,57.24,21.47a8,8,0,0,0,8.21,1.93A16,16,0,0,1,224,104ZM92,152a12,12,0,1,1,12-12A12,12,0,0,1,92,152Zm72,0a12,12,0,1,1,12-12A12,12,0,0,1,164,152Zm19.26,28.09a8,8,0,0,1-10.35,4.56c-9.73-3.8-19.88-5.74-28.91-5.74s-19.18,1.94-28.91,5.74A8,8,0,0,1,108.74,169a8.06,8.06,0,0,1,4.56-10.35c12-4.69,24.51-7.07,35.7-7.07s23.7,2.38,35.7,7.07A8,8,0,0,1,183.26,180.09Z"/>
                </svg>
                <span className="text-xs font-medium">Reddit</span>
              </button>
              <button
                onClick={() => handleQuickNav('https://www.google.com')}
                className="w-24 h-24 flex flex-col items-center justify-center gap-2 rounded-2xl transition-colors hover:bg-white/5"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                <Compass size={32} weight="regular" />
                <span className="text-xs font-medium">Google</span>
              </button>
            </div>
            {/* Proxy status chip */}
            {proxyStatus && proxyStatus !== 'connected' && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{
                  background: proxyStatus === 'checking' ? 'rgba(255, 159, 10, 0.15)' : 'rgba(255, 69, 58, 0.15)',
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: proxyStatus === 'checking' ? 'var(--accent-orange)' : 'var(--accent-red)',
                    animation: proxyStatus === 'checking' ? 'pulse 1s infinite' : 'none',
                  }}
                />
                <span
                  className="text-xs font-medium"
                  style={{
                    color: proxyStatus === 'checking' ? 'var(--accent-orange)' : 'var(--accent-red)',
                  }}
                >
                  {proxyStatus === 'checking' ? 'Connecting to proxy...' : 'Proxy connection failed'}
                </span>
              </div>
            )}
            {proxyStatus === 'connected' && proxyIP && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(48, 209, 88, 0.15)' }}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-green)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--accent-green)' }}>
                  Connected · {proxyIP}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
