import { useState, useEffect, useRef } from 'react';
import { Profile, Model } from '../../shared/types';
import { Desktop, CaretDown, FolderSimple, MinusCircle } from '@phosphor-icons/react';

interface CreateProfileModalProps {
  models: Model[];
  initialModelId?: string;
  requireModel?: boolean;
  onClose: () => void;
  onCreate: (profile: Omit<Profile, 'id' | 'createdAt'>) => void;
}

const countries = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
];

function CreateProfileModal({ models, initialModelId, requireModel, onClose, onCreate }: CreateProfileModalProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('');
  const [modelId, setModelId] = useState<string | undefined>(initialModelId);
  const [status, setStatus] = useState<'working' | 'banned' | 'error'>('working');
  const [isEnabled, setIsEnabled] = useState(true);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderNumber, setOrderNumber] = useState('');
  const [proxyString, setProxyString] = useState('');
  const [showCountryMenu, setShowCountryMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);

  const countryMenuRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryMenuRef.current && !countryMenuRef.current.contains(e.target as Node)) {
        setShowCountryMenu(false);
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCountry = countries.find(c => c.code === country);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      alert('Please enter a username');
      return;
    }

    if (!email.trim()) {
      alert('Please enter an email');
      return;
    }

    if (!country) {
      alert('Please select a country');
      return;
    }

    if (requireModel && !modelId) {
      alert('Please select a model');
      return;
    }

    if (!orderNumber.trim()) {
      alert('Please enter an order number');
      return;
    }

    // Parse proxy string
    let proxy = undefined;
    if (proxyString.trim()) {
      const parts = proxyString.split(':');
      if (parts.length >= 2) {
        proxy = {
          host: parts[0],
          port: parseInt(parts[1]),
          username: parts[2] || undefined,
          password: parts[3] || undefined,
        };
      }
    }

    onCreate({
      name: username.trim(),
      type: 'desktop',
      browser: 'chromium',
      proxy,
      status,
      modelId,
      credentials: {
        username: username.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
      },
      country,
      purchaseDate,
      orderNumber: orderNumber.trim(),
      isEnabled,
    });
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '24px',
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-blue)' }}
            >
              <Desktop size={16} weight="bold" color="white" />
            </div>
            <div>
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                New Browser
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Create a new browser profile
              </p>
            </div>
          </div>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Account Credentials */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Account Credentials
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username (display name)"
                autoFocus
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
              />
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
            </div>
          </div>

          {/* Country */}
          <div className="relative" ref={countryMenuRef}>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Country
            </label>
            <button
              type="button"
              onClick={() => setShowCountryMenu(!showCountryMenu)}
              className="w-full text-left px-3 py-2 text-sm flex items-center gap-2"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
              }}
            >
              {selectedCountry ? (
                <>
                  <span>{selectedCountry.flag}</span>
                  <span className="truncate">{selectedCountry.name}</span>
                </>
              ) : (
                <span style={{ color: 'var(--text-tertiary)' }}>Select country</span>
              )}
              <CaretDown size={12} weight="bold" className="ml-auto" />
            </button>

            {showCountryMenu && (
              <div
                className="absolute z-50 w-full mt-1 py-1 max-h-48 overflow-y-auto"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                }}
              >
                {countries.map(c => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => { setCountry(c.code); setShowCountryMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <span>{c.flag}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Model */}
          {models.length > 0 && (
            <div className="relative" ref={modelMenuRef}>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Model
                <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal' }}> (optional)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowModelMenu(!showModelMenu)}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                }}
              >
                <FolderSimple size={14} weight="bold" color="var(--text-tertiary)" />
                {modelId ? (
                  <span className="truncate">{models.find(m => m.id === modelId)?.name}</span>
                ) : (
                  <span style={{ color: 'var(--text-tertiary)' }}>No model</span>
                )}
                <CaretDown size={12} weight="bold" className="ml-auto" />
              </button>

              {showModelMenu && (
                <div
                  className="absolute z-50 w-full mt-1 py-1 max-h-48 overflow-y-auto"
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  {!requireModel && (
                    <button
                      type="button"
                      onClick={() => { setModelId(undefined); setShowModelMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5"
                      style={{ color: !modelId ? 'var(--accent-blue)' : 'var(--text-primary)' }}
                    >
                      <MinusCircle size={14} weight="bold" />
                      <span>No model</span>
                    </button>
                  )}
                  {models.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { setModelId(m.id); setShowModelMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5"
                      style={{ color: modelId === m.id ? 'var(--accent-blue)' : 'var(--text-primary)' }}
                    >
                      <FolderSimple size={14} weight="bold" />
                      <span>{m.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Status & Enabled Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Status
              </label>
              <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="working">Working</option>
                <option value="banned">Banned</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Enabled
              </label>
              <button
                type="button"
                onClick={() => setIsEnabled(!isEnabled)}
                className="w-full px-3 py-2 text-sm flex items-center justify-between"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                }}
              >
                <span>{isEnabled ? 'On' : 'Off'}</span>
                <div
                  className="w-10 h-6 rounded-full relative transition-colors"
                  style={{ background: isEnabled ? 'var(--accent-green)' : 'var(--bg-primary)' }}
                >
                  <div
                    className="w-5 h-5 rounded-full absolute top-0.5 transition-all"
                    style={{
                      background: '#fff',
                      left: isEnabled ? '18px' : '2px',
                    }}
                  />
                </div>
              </button>
            </div>
          </div>

          {/* Purchase Date & Order Number */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Purchase Date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Order Number <span style={{ color: 'var(--accent-red)' }}>*</span>
              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. #12345"
              />
            </div>
          </div>

          {/* Proxy */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Proxy
              <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal' }}> (optional)</span>
            </label>
            <input
              type="text"
              value={proxyString}
              onChange={(e) => setProxyString(e.target.value)}
              placeholder="IP:PORT:USERNAME:PASSWORD"
              className="font-mono"
              style={{ fontSize: '12px' }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium"
              style={{
                background: 'rgba(142, 142, 147, 0.12)',
                color: 'var(--text-primary)',
                borderRadius: '100px',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 text-sm font-medium"
              style={{
                background: '#fff',
                color: '#000',
                borderRadius: '100px',
              }}
            >
              Create Browser
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateProfileModal;
