import { useState, useEffect } from 'react';
import { Profile, Model } from '../../shared/types';
import { CaretRight, User, Copy, EnvelopeSimple, Key, VideoCamera, Star, Calendar, RedditLogo } from '@phosphor-icons/react';
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

interface ProfileListProps {
  profiles: Profile[];
  models: Model[];
  activeBrowsers: string[];
  onLaunch: (id: string) => void;
  onClose: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (profile: Profile) => void;
  onRenameModel: (model: Model) => void;
  onDeleteModel: (modelId: string) => void;
  onToggleModelExpand: (modelId: string) => void;
  onCreateAccountInModel: (modelId: string) => void;
}

// PNG flag images (fallback to emoji for missing)
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

// Emoji fallback for missing PNG flags
const countryFlagsEmoji: Record<string, string> = {
  'IT': '🇮🇹', 'NL': '🇳🇱', 'CH': '🇨🇭', 'IE': '🇮🇪', 'NZ': '🇳🇿', 'SA': '🇸🇦',
};

const countryNames: Record<string, string> = {
  'US': 'United States', 'GB': 'United Kingdom', 'DE': 'Germany', 'FR': 'France', 'ES': 'Spain',
  'IT': 'Italy', 'NL': 'Netherlands', 'BE': 'Belgium', 'PT': 'Portugal', 'PL': 'Poland',
  'RU': 'Russia', 'UA': 'Ukraine', 'CA': 'Canada', 'AU': 'Australia', 'JP': 'Japan',
  'KR': 'South Korea', 'CN': 'China', 'IN': 'India', 'BR': 'Brazil', 'MX': 'Mexico',
  'AR': 'Argentina', 'CL': 'Chile', 'CO': 'Colombia', 'SE': 'Sweden', 'NO': 'Norway',
  'DK': 'Denmark', 'FI': 'Finland', 'CH': 'Switzerland', 'AT': 'Austria', 'IE': 'Ireland',
  'NZ': 'New Zealand', 'SG': 'Singapore', 'HK': 'Hong Kong', 'TW': 'Taiwan', 'TH': 'Thailand',
  'VN': 'Vietnam', 'ID': 'Indonesia', 'MY': 'Malaysia', 'PH': 'Philippines', 'TR': 'Turkey',
  'SA': 'Saudi Arabia', 'AE': 'UAE', 'IL': 'Israel', 'ZA': 'South Africa', 'EG': 'Egypt',
};


const getAccountAgeDays = (purchaseDate?: string) => {
  if (!purchaseDate) return null;
  const purchase = new Date(purchaseDate);
  const today = new Date();
  const diffTime = today.getTime() - purchase.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

function ProfileList({
  profiles,
  models,
  activeBrowsers,
  onLaunch,
  onClose,
  onDelete,
  onEdit,
  onRenameModel,
  onDeleteModel,
  onToggleModelExpand,
  onCreateAccountInModel,
}: ProfileListProps) {
  const { t } = useLanguage();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openKarmaId, setOpenKarmaId] = useState<string | null>(null);
  const [openRedditId, setOpenRedditId] = useState<string | null>(null);
  const [openRedgifsId, setOpenRedgifsId] = useState<string | null>(null);

  // Close popups when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenKarmaId(null);
      setOpenRedditId(null);
      setOpenRedgifsId(null);
    };
    if (openKarmaId || openRedditId || openRedgifsId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openKarmaId, openRedditId, openRedgifsId]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Group profiles by model
  // Sort order: working (0) -> error (1) -> banned (2)
  const getStatusOrder = (status?: string) => {
    if (status === 'banned') return 2;
    if (status === 'error') return 1;
    return 0;
  };

  const unassignedProfiles = profiles
    .filter(p => !p.modelId)
    .sort((a, b) => getStatusOrder(a.status) - getStatusOrder(b.status));

  const renderProfileRow = (profile: Profile, isLast: boolean) => {
    const isActive = activeBrowsers.includes(profile.id);

    return (
      <div
        key={profile.id}
        className="px-6 py-4 flex items-center gap-3"
        style={{
          borderBottom: isLast ? 'none' : '1px solid var(--border-light)',
        }}
      >
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Username · Karma · Age */}
          <div className="flex items-center gap-2">
            {profile.country && (countryFlagImages[profile.country] || countryFlagsEmoji[profile.country]) && (
              countryFlagImages[profile.country] ? (
                <img
                  src={countryFlagImages[profile.country]}
                  alt={countryNames[profile.country]}
                  title={countryNames[profile.country]}
                  className="w-4 h-4 object-contain rounded-sm"
                />
              ) : (
                <span className="text-sm" title={countryNames[profile.country]}>
                  {countryFlagsEmoji[profile.country]}
                </span>
              )
            )}
            <span className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
              {profile.name}
            </span>
            <span style={{ color: 'var(--text-tertiary)' }}>·</span>
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setOpenKarmaId(openKarmaId === profile.id ? null : profile.id); }}
                className="flex items-center gap-1 text-sm hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Star size={12} weight="fill" color="var(--text-tertiary)" />
                {(profile.commentKarma || 0) + (profile.postKarma || 0)}
              </button>
              {openKarmaId === profile.id && (
                <div
                  className="absolute top-full left-0 mt-1 py-2 px-3 z-50 whitespace-nowrap"
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center">
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Comments</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{profile.commentKarma || 0}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Posts</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{profile.postKarma || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {(() => {
              const ageDays = getAccountAgeDays(profile.purchaseDate);
              if (ageDays === null) return null;
              return (
                <>
                  <span style={{ color: 'var(--text-tertiary)' }}>·</span>
                  <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }} title={`Account age: ${ageDays} days`}>
                    <Calendar size={12} weight="bold" color="var(--text-tertiary)" />
                    {ageDays}d
                  </span>
                </>
              );
            })()}
          </div>

          {/* Status, Email, Password, RedGifs - all on same line */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Status pill */}
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-full"
              style={{
                background: profile.status === 'banned' ? 'rgba(255, 69, 58, 0.15)'
                  : profile.status === 'error' ? 'rgba(255, 159, 10, 0.15)'
                  : 'rgba(48, 209, 88, 0.15)',
              }}
            >
              <span
                className="text-xs font-medium"
                style={{
                  color: profile.status === 'banned' ? 'var(--accent-red)'
                    : profile.status === 'error' ? 'var(--accent-orange)'
                    : 'var(--accent-green)',
                }}
              >
                {profile.status === 'banned' ? t('profile.banned') : profile.status === 'error' ? t('profile.error') : t('profile.working')}
              </span>
            </div>
            {/* Reddit credentials */}
            {(profile.credentials?.email || profile.credentials?.password) && (
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setOpenRedditId(openRedditId === profile.id ? null : profile.id); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:opacity-80 transition-opacity"
                  style={{ background: 'rgba(142, 142, 147, 0.12)' }}
                >
                  <RedditLogo size={12} weight="bold" color="var(--text-tertiary)" />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Reddit
                  </span>
                </button>
                {openRedditId === profile.id && (
                  <div
                    className="absolute top-full left-0 mt-1 py-1 z-50 min-w-[140px]"
                    style={{
                      background: 'var(--bg-tertiary)',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    {profile.credentials?.email && (
                      <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(profile.credentials!.email!, `email-${profile.id}`); }}
                        className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <EnvelopeSimple size={14} weight="bold" color="var(--text-tertiary)" />
                        <span className="flex-1 truncate">{copiedId === `email-${profile.id}` ? t('common.copied') : profile.credentials.email}</span>
                      </button>
                    )}
                    {profile.credentials?.password && (
                      <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(profile.credentials!.password!, `pwd-${profile.id}`); }}
                        className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <Key size={14} weight="bold" color="var(--text-tertiary)" />
                        <span className="flex-1 truncate">{copiedId === `pwd-${profile.id}` ? t('common.copied') : profile.credentials.password}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* RedGifs */}
            {profile.redgifsUsername && (
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setOpenRedgifsId(openRedgifsId === profile.id ? null : profile.id); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:opacity-80 transition-opacity"
                  style={{ background: 'rgba(142, 142, 147, 0.12)' }}
                >
                  <VideoCamera size={12} weight="bold" color="var(--text-tertiary)" />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    RedGifs
                  </span>
                </button>
                {openRedgifsId === profile.id && (
                  <div
                    className="absolute top-full right-0 mt-1 py-1 z-50 min-w-[140px]"
                    style={{
                      background: 'var(--bg-tertiary)',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(profile.redgifsUsername!, `rg-user-${profile.id}`); }}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <User size={14} weight="bold" color="var(--text-tertiary)" />
                      <span className="flex-1 truncate">{copiedId === `rg-user-${profile.id}` ? t('common.copied') : profile.redgifsUsername}</span>
                    </button>
                    {profile.redgifsPassword && (
                      <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(profile.redgifsPassword!, `rg-pwd-${profile.id}`); }}
                        className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <Key size={14} weight="bold" color="var(--text-tertiary)" />
                        <span className="flex-1 truncate">{copiedId === `rg-pwd-${profile.id}` ? t('common.copied') : profile.redgifsPassword}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Launch/Stop button */}
          {isActive ? (
            <button
              onClick={() => onClose(profile.id)}
              className="h-9 px-5 text-sm font-medium transition-colors"
              style={{
                background: 'rgba(255, 69, 58, 0.15)',
                color: 'var(--accent-red)',
                borderRadius: '100px',
              }}
            >
              {t('profile.stop')}
            </button>
          ) : (
            <button
              onClick={() => onLaunch(profile.id)}
              className="h-9 px-5 text-sm font-medium transition-colors"
              style={{
                background: 'var(--chip-bg)',
                color: 'var(--text-primary)',
                borderRadius: '100px',
              }}
            >
              {t('profile.launch')}
            </button>
          )}

        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4">
        {/* Models with their profiles */}
        {models.map(model => {
          const modelProfiles = profiles
            .filter(p => p.modelId === model.id)
            .sort((a, b) => getStatusOrder(a.status) - getStatusOrder(b.status));
          const isExpanded = model.isExpanded !== false;

          return (
            <div
              key={model.id}
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: '34px',
              }}
            >
              {/* Model header */}
              <div
                className="px-6 py-4 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors"
                style={{
                  borderBottom: isExpanded && modelProfiles.length > 0 ? '1px solid var(--border-light)' : 'none',
                  borderRadius: isExpanded && modelProfiles.length > 0 ? '34px 34px 0 0' : '34px',
                }}
                onClick={() => onToggleModelExpand(model.id)}
              >
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ background: 'var(--bg-tertiary)' }}
                >
                  {model.profilePicture && model.profilePicture.startsWith('data:image') ? (
                    <img
                      src={model.profilePicture}
                      alt={model.name}
                      className="w-full h-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <User size={16} weight="bold" color="var(--text-tertiary)" />
                  )}
                </div>
                <span className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                  {model.name}
                </span>
                {model.onlyfans && (
                  <button
                    onClick={(e) => { e.stopPropagation(); copyToClipboard(model.onlyfans!, `of-${model.id}`); }}
                    className="h-7 px-2.5 flex items-center gap-1.5 text-xs font-medium"
                    style={{ background: 'var(--chip-bg)', borderRadius: '100px', color: 'var(--text-tertiary)' }}
                    title={model.onlyfans}
                  >
                    {copiedId === `of-${model.id}` ? <span style={{ color: 'var(--accent-green)' }}>{t('common.copied')}</span> : <><span>OnlyFans</span><Copy size={12} /></>}
                  </button>
                )}
                <div className="flex-1" />
                <CaretRight
                  size={16}
                  weight="bold"
                  color="var(--text-tertiary)"
                  style={{
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                />
              </div>

              {/* Model profiles */}
              {isExpanded && modelProfiles.map((profile, index) =>
                renderProfileRow(profile, index === modelProfiles.length - 1)
              )}
            </div>
          );
        })}

        {/* Unassigned profiles */}
        {unassignedProfiles.length > 0 && (
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: '34px',
            }}
          >
            {unassignedProfiles.map((profile, index) =>
              renderProfileRow(profile, index === unassignedProfiles.length - 1)
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default ProfileList;
