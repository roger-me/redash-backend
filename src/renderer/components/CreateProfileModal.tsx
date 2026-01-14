import { useState, useEffect, useRef } from 'react';
import { Profile, Model } from '../../shared/types';
import { CaretDown, FolderSimple, MinusCircle } from '@phosphor-icons/react';
import { useLanguage } from '../i18n';

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
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('');
  const [modelId, setModelId] = useState<string | undefined>(initialModelId);
  const [status, setStatus] = useState<'working' | 'banned' | 'error'>('working');
  const today = new Date();
  const oneMonthLater = new Date(today);
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
  const [purchaseDate, setPurchaseDate] = useState(today.toISOString().split('T')[0]);
  const [expiresAt, setExpiresAt] = useState<string>(oneMonthLater.toISOString().split('T')[0]);
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

  const isFormValid =
    username.trim() !== '' &&
    email.trim() !== '' &&
    country !== '' &&
    orderNumber.trim() !== '' &&
    proxyString.trim() !== '' &&
    (!requireModel || modelId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      alert(t('validation.enterUsername'));
      return;
    }

    if (!email.trim()) {
      alert(t('validation.enterEmail'));
      return;
    }

    if (!country) {
      alert(t('validation.selectCountry'));
      return;
    }

    if (requireModel && !modelId) {
      alert(t('validation.selectModel'));
      return;
    }

    if (!orderNumber.trim()) {
      alert(t('validation.enterOrderNumber'));
      return;
    }

    if (!proxyString.trim()) {
      alert(t('validation.enterProxy'));
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
      isEnabled: !!expiresAt,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
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
          borderRadius: '28px',
        }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-2 flex-shrink-0">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('profile.newBrowser')}
          </h2>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4 overflow-y-auto flex-1">
          {/* Account Credentials */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {t('profile.accountCredentials')}
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('profile.username')}
                autoFocus
                style={{
                  background: 'var(--bg-tertiary)',
                  border: 'none',
                  borderRadius: '34px',
                  color: 'var(--text-primary)',
                  padding: '12px 16px',
                  width: '100%',
                  fontSize: '14px',
                }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('profile.email')}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: 'none',
                  borderRadius: '34px',
                  color: 'var(--text-primary)',
                  padding: '12px 16px',
                  width: '100%',
                  fontSize: '14px',
                }}
              />
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('profile.password')}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: 'none',
                  borderRadius: '34px',
                  color: 'var(--text-primary)',
                  padding: '12px 16px',
                  width: '100%',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          {/* Country */}
          <div className="relative" ref={countryMenuRef}>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {t('profile.country')}
            </label>
            <button
              type="button"
              onClick={() => setShowCountryMenu(!showCountryMenu)}
              className="w-full text-left text-sm flex items-center gap-2"
              style={{
                background: 'var(--bg-tertiary)',
                border: 'none',
                borderRadius: '34px',
                color: 'var(--text-primary)',
                padding: '12px 16px',
              }}
            >
              {selectedCountry ? (
                <>
                  <span>{selectedCountry.flag}</span>
                  <span className="truncate">{selectedCountry.name}</span>
                </>
              ) : (
                <span style={{ color: 'var(--text-tertiary)' }}>{t('profile.selectCountry')}</span>
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
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                {t('profile.model')}
                <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal' }}> {t('profile.optional')}</span>
              </label>
              <button
                type="button"
                onClick={() => setShowModelMenu(!showModelMenu)}
                className="w-full text-left text-sm flex items-center gap-2"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: 'none',
                  borderRadius: '34px',
                  color: 'var(--text-primary)',
                  padding: '12px 16px',
                }}
              >
                <FolderSimple size={14} weight="bold" color="var(--text-tertiary)" />
                {modelId ? (
                  <span className="truncate">{models.find(m => m.id === modelId)?.name}</span>
                ) : (
                  <span style={{ color: 'var(--text-tertiary)' }}>{t('profile.noModel')}</span>
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
                      <span>{t('profile.noModel')}</span>
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
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                {t('profile.status')}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: 'none',
                  borderRadius: '34px',
                  color: 'var(--text-primary)',
                  padding: '12px 16px',
                  width: '100%',
                  fontSize: '14px',
                  appearance: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="working">{t('profile.working')}</option>
                <option value="banned">{t('profile.banned')}</option>
                <option value="error">{t('profile.error')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                {t('profile.renew')} {expiresAt && (() => {
                  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return <span style={{ color: days <= 0 ? '#F44336' : 'var(--accent-blue)' }}>
                    ({days <= 0 ? t('profile.expired') : t('profile.daysLeft', { days })})
                  </span>;
                })()}
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: 'none',
                  borderRadius: '34px',
                  color: 'var(--text-primary)',
                  padding: '12px 16px',
                  width: '100%',
                  fontSize: '14px',
                  colorScheme: 'dark',
                }}
              />
            </div>
          </div>

          {/* Purchase Date & Order Number */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                {t('profile.purchaseDate')}
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => {
                  setPurchaseDate(e.target.value);
                  // Update expiresAt to one month after new purchase date
                  const newPurchase = new Date(e.target.value);
                  newPurchase.setMonth(newPurchase.getMonth() + 1);
                  setExpiresAt(newPurchase.toISOString().split('T')[0]);
                }}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: 'none',
                  borderRadius: '34px',
                  color: 'var(--text-primary)',
                  padding: '12px 16px',
                  width: '100%',
                  fontSize: '14px',
                  colorScheme: 'dark',
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                {t('profile.orderNumber')}              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. #12345"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: 'none',
                  borderRadius: '34px',
                  color: 'var(--text-primary)',
                  padding: '12px 16px',
                  width: '100%',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          {/* Proxy */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {t('profile.proxy')}            </label>
            <input
              type="text"
              value={proxyString}
              onChange={(e) => setProxyString(e.target.value)}
              placeholder={t('profile.proxyPlaceholder')}
              className="font-mono"
              style={{
                background: 'var(--bg-tertiary)',
                border: 'none',
                borderRadius: '34px',
                color: 'var(--text-primary)',
                padding: '12px 16px',
                width: '100%',
                fontSize: '12px',
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
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
              {t('button.cancel')}
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className="flex-1 py-2.5 text-sm font-medium transition-opacity"
              style={{
                background: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-color)',
                borderRadius: '100px',
                opacity: isFormValid ? 1 : 0.4,
                cursor: isFormValid ? 'pointer' : 'not-allowed',
              }}
            >
              {t('button.createBrowser')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateProfileModal;
