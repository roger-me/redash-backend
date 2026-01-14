import { useState, useRef, useEffect } from 'react';
import { Profile, Model, MainEmail, SubEmail } from '../../shared/types';
import { CaretDown, FolderSimple, MinusCircle, EnvelopeSimple } from '@phosphor-icons/react';
import { useLanguage } from '../i18n';

interface EditProfileModalProps {
  profile: Profile;
  models: Model[];
  onClose: () => void;
  onSave: (id: string, updates: any) => void;
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

function EditProfileModal({ profile, models, onClose, onSave }: EditProfileModalProps) {
  const { t } = useLanguage();
  const [username, setUsername] = useState(profile.credentials?.username || profile.name || '');
  const [email, setEmail] = useState(profile.credentials?.email || '');
  const [password, setPassword] = useState(profile.credentials?.password || '');
  const [country, setCountry] = useState(profile.country || '');
  const [modelId, setModelId] = useState<string | undefined>(profile.modelId);
  const [status, setStatus] = useState<'working' | 'banned' | 'error'>(
    profile.status === 'banned' ? 'banned' : profile.status === 'error' ? 'error' : 'working'
  );
  const [expiresAt, setExpiresAt] = useState<string>(
    profile.expiresAt ? new Date(profile.expiresAt).toISOString().split('T')[0] : ''
  );
  const [purchaseDate, setPurchaseDate] = useState(profile.purchaseDate || '');
  const [orderNumber, setOrderNumber] = useState(profile.orderNumber || '');
  const [proxyString, setProxyString] = useState(
    profile.proxy
      ? `${profile.proxy.host}:${profile.proxy.port}${profile.proxy.username ? `:${profile.proxy.username}` : ''}${profile.proxy.password ? `:${profile.proxy.password}` : ''}`
      : ''
  );
  const [showCountryMenu, setShowCountryMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showEmailMenu, setShowEmailMenu] = useState(false);
  const [mainEmails, setMainEmails] = useState<MainEmail[]>([]);
  const [subEmails, setSubEmails] = useState<SubEmail[]>([]);
  const [subEmailId, setSubEmailId] = useState<string | undefined>(profile.subEmailId);

  const countryMenuRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const emailMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryMenuRef.current && !countryMenuRef.current.contains(e.target as Node)) {
        setShowCountryMenu(false);
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false);
      }
      if (emailMenuRef.current && !emailMenuRef.current.contains(e.target as Node)) {
        setShowEmailMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadEmails = async () => {
      try {
        const result = await window.electronAPI?.getEmailsForSelection();
        if (result) {
          setMainEmails(result.mainEmails);
          setSubEmails(result.subEmails);
        }
      } catch (err) {
        console.error('Failed to load emails:', err);
      }
    };
    loadEmails();
  }, []);

  const selectedCountry = countries.find(c => c.code === country);

  const handleSubmit = () => {
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

    onSave(profile.id, {
      name: username.trim(),
      status,
      modelId,
      proxy,
      credentials: {
        username: username.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
      },
      country,
      purchaseDate: purchaseDate || undefined,
      orderNumber: orderNumber.trim(),
      isEnabled: !!expiresAt,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      subEmailId,
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
            {t('profile.editBrowser')}
          </h2>
        </div>

        {/* Form - Scrollable */}
        <div className="px-5 pb-5 space-y-4 overflow-y-auto flex-1">
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
                  <button
                    type="button"
                    onClick={() => { setModelId(undefined); setShowModelMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5"
                    style={{ color: !modelId ? 'var(--accent-blue)' : 'var(--text-primary)' }}
                  >
                    <MinusCircle size={14} weight="bold" />
                    <span>{t('profile.noModel')}</span>
                  </button>
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

          {/* Email Selection */}
          {mainEmails.length > 0 && (
            <div className="relative" ref={emailMenuRef}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Email Account
                <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal' }}> {t('profile.optional')}</span>
              </label>
              <button
                type="button"
                onClick={() => setShowEmailMenu(!showEmailMenu)}
                className="w-full text-left text-sm flex items-center gap-2"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: 'none',
                  borderRadius: '34px',
                  color: 'var(--text-primary)',
                  padding: '12px 16px',
                }}
              >
                <EnvelopeSimple size={14} weight="bold" color="var(--text-tertiary)" />
                {subEmailId ? (
                  (() => {
                    const subEmail = subEmails.find(s => s.id === subEmailId);
                    const mainEmail = mainEmails.find(m => m.id === subEmail?.mainEmailId);
                    return <span className="truncate">{mainEmail?.email} → {subEmail?.email}</span>;
                  })()
                ) : (
                  <span style={{ color: 'var(--text-tertiary)' }}>Select email</span>
                )}
                <CaretDown size={12} weight="bold" className="ml-auto" />
              </button>

              {showEmailMenu && (
                <div
                  className="absolute z-50 w-full mt-1 py-1 max-h-64 overflow-y-auto"
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => { setSubEmailId(undefined); setShowEmailMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5"
                    style={{ color: !subEmailId ? 'var(--accent-blue)' : 'var(--text-primary)' }}
                  >
                    <MinusCircle size={14} weight="bold" />
                    <span>No email</span>
                  </button>
                  {mainEmails.map(main => (
                    <div key={main.id}>
                      <div className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                        {main.email}
                      </div>
                      {subEmails.filter(s => s.mainEmailId === main.id).map(sub => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => { setSubEmailId(sub.id); setShowEmailMenu(false); }}
                          className="w-full px-3 py-2 pl-6 text-left text-sm flex items-center gap-2 hover:bg-white/5"
                          style={{ color: subEmailId === sub.id ? 'var(--accent-blue)' : 'var(--text-primary)' }}
                        >
                          <EnvelopeSimple size={14} weight="regular" />
                          <span>{sub.email}</span>
                        </button>
                      ))}
                    </div>
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
                onChange={(e) => setPurchaseDate(e.target.value)}
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
                {t('profile.orderNumber')}
              </label>
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
              {t('profile.proxy')}
            </label>
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
              type="button"
              onClick={handleSubmit}
              className="flex-1 py-2.5 text-sm font-medium"
              style={{
                background: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-color)',
                borderRadius: '100px',
              }}
            >
              {t('button.saveChanges')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditProfileModal;
