import { useState, useRef, useEffect } from 'react';
import { Profile, Model, MainEmail, SubEmail } from '../../shared/types';
import { CaretDown, FolderSimple, MinusCircle, EnvelopeSimple } from '@phosphor-icons/react';
import { useLanguage } from '../i18n';

interface EditProfileModalProps {
  profile: Profile;
  models: Model[];
  takenSubEmailIds?: string[];
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

function EditProfileModal({ profile, models, takenSubEmailIds = [], onClose, onSave }: EditProfileModalProps) {
  const { t } = useLanguage();
  const [fullProfile, setFullProfile] = useState<Profile>(profile);
  const [username, setUsername] = useState(profile.credentials?.username || profile.name || '');
  const [email, setEmail] = useState(profile.credentials?.email || '');
  const [password, setPassword] = useState(profile.credentials?.password || '');
  const [country, setCountry] = useState(profile.country || '');
  const [modelId, setModelId] = useState<string | undefined>(profile.modelId);
  const [expiresAt, setExpiresAt] = useState<string>(
    profile.expiresAt ? new Date(profile.expiresAt).toISOString().split('T')[0] : ''
  );
  const [purchaseDate, setPurchaseDate] = useState(profile.purchaseDate || '');
  const [orderNumber, setOrderNumber] = useState(profile.orderNumber || '');
  // Initialize proxyString from profile prop (already contains proxy when from AdminPage's getAllProfiles)
  const [proxyString, setProxyString] = useState(() => {
    if (profile.proxy) {
      const proxy = profile.proxy;
      return `${proxy.host}:${proxy.port}${proxy.username ? `:${proxy.username}` : ''}${proxy.password ? `:${proxy.password}` : ''}`;
    }
    return '';
  });
  const [redgifsUsername, setRedgifsUsername] = useState(profile.redgifsUsername || '');
  const [redgifsPassword, setRedgifsPassword] = useState(profile.redgifsPassword || '');
  const [showCountryMenu, setShowCountryMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showEmailMenu, setShowEmailMenu] = useState(false);
  const [mainEmails, setMainEmails] = useState<MainEmail[]>([]);
  const [subEmails, setSubEmails] = useState<SubEmail[]>([]);
  const [subEmailId, setSubEmailId] = useState<string | undefined>(profile.subEmailId);
  const [selectedMainEmailId, setSelectedMainEmailId] = useState<string | undefined>();

  // Fetch full profile data on mount to ensure we have all fields including proxy
  useEffect(() => {
    const loadFullProfile = async () => {
      try {
        const data = await window.electronAPI?.getProfileById(profile.id);
        if (data) {
          setFullProfile(data);
          // Update proxyString with fetched data
          if (data.proxy) {
            const proxy = data.proxy;
            setProxyString(`${proxy.host}:${proxy.port}${proxy.username ? `:${proxy.username}` : ''}${proxy.password ? `:${proxy.password}` : ''}`);
          }
          // Update other fields that might be missing
          if (data.purchaseDate && !purchaseDate) setPurchaseDate(data.purchaseDate);
          if (data.orderNumber && !orderNumber) setOrderNumber(data.orderNumber);
          if (data.subEmailId && !subEmailId) setSubEmailId(data.subEmailId);
          if (data.redgifsUsername && !redgifsUsername) setRedgifsUsername(data.redgifsUsername);
          if (data.redgifsPassword && !redgifsPassword) setRedgifsPassword(data.redgifsPassword);
        }
      } catch (err) {
        console.error('Failed to load full profile:', err);
      }
    };
    loadFullProfile();
  }, [profile.id]);

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

    // Get email address from selection or text input
    let emailAddress = email.trim();
    if (subEmailId) {
      const selectedSubEmail = subEmails.find(s => s.id === subEmailId);
      emailAddress = selectedSubEmail?.email || email.trim();
    } else if (selectedMainEmailId) {
      const selectedMainEmail = mainEmails.find(m => m.id === selectedMainEmailId);
      emailAddress = selectedMainEmail?.email || email.trim();
    }

    if (!emailAddress) {
      alert(t('validation.enterEmail'));
      return;
    }

    if (!country) {
      alert(t('validation.selectCountry'));
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

    const updates: any = {
      name: username.trim(),
      modelId,
      credentials: {
        username: username.trim(),
        email: emailAddress,
        password: password.trim() || undefined,
      },
      country,
      purchaseDate: purchaseDate || undefined,
      orderNumber: orderNumber.trim(),
      isEnabled: !!expiresAt,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      subEmailId: subEmailId || undefined,
      redgifsUsername: redgifsUsername.trim() || undefined,
      redgifsPassword: redgifsPassword.trim() || undefined,
    };

    // Include proxy: use parsed proxy if available, otherwise keep existing profile proxy
    if (proxy) {
      updates.proxy = proxy;
    } else if (fullProfile.proxy) {
      updates.proxy = fullProfile.proxy;
    }

    onSave(profile.id, updates);
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
              {/* Email Selection */}
              <div className="relative" ref={emailMenuRef}>
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
                  {subEmailId ? (
                    <span className="truncate">{subEmails.find(s => s.id === subEmailId)?.email}</span>
                  ) : selectedMainEmailId ? (
                    <span className="truncate">{mainEmails.find(m => m.id === selectedMainEmailId)?.email}</span>
                  ) : email ? (
                    <span className="truncate">{email}</span>
                  ) : (
                    <span style={{ color: 'var(--text-tertiary)' }}>{t('profile.selectEmail')}</span>
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
                    {mainEmails.map(main => {
                      const mainSubEmails = subEmails.filter(s => s.mainEmailId === main.id);
                      return (
                        <div key={main.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMainEmailId(main.id);
                              setSubEmailId(undefined);
                              setEmail(main.email);
                              setShowEmailMenu(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm font-medium flex items-center gap-2 hover:bg-white/5"
                            style={{
                              color: selectedMainEmailId === main.id && !subEmailId ? 'var(--accent-blue)' : 'var(--text-primary)',
                            }}
                          >
                            <EnvelopeSimple size={14} weight="bold" />
                            <span>{main.email}</span>
                          </button>
                          {mainSubEmails.map(sub => {
                            const isTaken = takenSubEmailIds.includes(sub.id) && sub.id !== profile.subEmailId;
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => {
                                  if (!isTaken) {
                                    setSubEmailId(sub.id);
                                    setSelectedMainEmailId(undefined);
                                    setEmail(sub.email);
                                    setShowEmailMenu(false);
                                  }
                                }}
                                disabled={isTaken}
                                className="w-full px-3 py-2 pl-6 text-left text-sm flex items-center gap-2 hover:bg-white/5"
                                style={{
                                  color: isTaken ? 'var(--text-tertiary)' : subEmailId === sub.id ? 'var(--accent-blue)' : 'var(--text-primary)',
                                  opacity: isTaken ? 0.5 : 1,
                                  cursor: isTaken ? 'not-allowed' : 'pointer',
                                }}
                              >
                                <EnvelopeSimple size={14} weight="regular" />
                                <span>{sub.email}</span>
                                {isTaken && <span className="ml-auto text-xs">(in use)</span>}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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

          {/* Renew Date */}
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
                <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal' }}> {t('profile.optional')}</span>
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
              <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal' }}> {t('profile.optional')}</span>
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

          {/* RedGifs */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {t('profile.redgifs')}
              <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal' }}> {t('profile.optional')}</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={redgifsUsername}
                onChange={(e) => setRedgifsUsername(e.target.value)}
                placeholder={t('profile.redgifsUsername')}
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
                value={redgifsPassword}
                onChange={(e) => setRedgifsPassword(e.target.value)}
                placeholder={t('profile.redgifsPassword')}
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
