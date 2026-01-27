import { useState, useEffect, useRef } from 'react';
import { Profile, Model, UserRole } from '../../shared/types';
import { User, Copy, EnvelopeSimple, Key, VideoCamera, Star, Calendar, RedditLogo, DotsThree, Play, Archive, Stop } from '@phosphor-icons/react';
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
  userRole?: UserRole;
  onLaunch: (id: string) => void;
  onClose: (id: string) => void;
  onArchive: (id: string) => void;
  onCreateBrowser: () => void;
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
  userRole,
  onLaunch,
  onClose,
  onArchive,
}: ProfileListProps) {
  const { t } = useLanguage();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openKarmaId, setOpenKarmaId] = useState<string | null>(null);
  const [openRedditId, setOpenRedditId] = useState<string | null>(null);
  const [openRedgifsId, setOpenRedgifsId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAdminOrDev = userRole === 'admin' || userRole === 'dev';

  // Close popups when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
      setOpenKarmaId(null);
      setOpenRedditId(null);
      setOpenRedgifsId(null);
    };
    if (openKarmaId || openRedditId || openRedgifsId || openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openKarmaId, openRedditId, openRedgifsId, openMenuId]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Sort profiles by createdAt descending (most recent first)
  const sortedProfiles = [...profiles].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });

  // Get model for a profile
  const getModel = (modelId?: string) => models.find(m => m.id === modelId);

  const renderCard = (profile: Profile) => {
    const isActive = activeBrowsers.includes(profile.id);
    const model = getModel(profile.modelId);
    const ageDays = getAccountAgeDays(profile.purchaseDate);

    return (
      <div
        key={profile.id}
        className="flex flex-col"
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '24px',
        }}
      >
        {/* Top Section - Profile Picture + Browser Name */}
        <div
          className="flex items-center gap-3"
          style={{ padding: '20px 20px 12px 20px' }}
        >
          {/* Model profile picture */}
          <div
            className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            {model?.profilePicture && model.profilePicture.startsWith('data:image') ? (
              <img
                src={model.profilePicture}
                alt={model?.name}
                className="w-full h-full object-cover"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            ) : (
              <User size={18} weight="bold" color="var(--text-tertiary)" />
            )}
          </div>

          {/* Browser username */}
          <span className="font-semibold text-base truncate" style={{ color: 'var(--text-primary)' }}>
            {profile.name}
          </span>

          <div className="flex-1" />

          {/* Ellipsis menu for admin/dev */}
          {isAdminOrDev && (
            <div className="relative" ref={openMenuId === profile.id ? menuRef : null}>
              <button
                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === profile.id ? null : profile.id); }}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                style={{ background: 'var(--bg-tertiary)' }}
              >
                <DotsThree size={20} weight="bold" color="var(--text-secondary)" />
              </button>
              {openMenuId === profile.id && (
                <div
                  className="absolute top-full right-0 mt-1 py-1 z-50 min-w-[140px]"
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  {/* Launch/Stop */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isActive) {
                        onClose(profile.id);
                      } else {
                        onLaunch(profile.id);
                      }
                      setOpenMenuId(null);
                    }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {isActive ? (
                      <>
                        <Stop size={14} weight="bold" color="var(--accent-red)" />
                        <span>{t('profile.stop')}</span>
                      </>
                    ) : (
                      <>
                        <Play size={14} weight="bold" color="var(--accent-green)" />
                        <span>{t('profile.launch')}</span>
                      </>
                    )}
                  </button>
                  {/* Archive */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(null);
                      setArchiveConfirmId(profile.id);
                    }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <Archive size={14} weight="bold" color="var(--text-tertiary)" />
                    <span>{t('profile.archive')}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Section - Browser Info */}
        <div className="flex flex-col gap-4" style={{ padding: '12px 20px 20px 20px' }}>
          {/* Country flag, status badge, karma and account age */}
          <div className="flex items-center gap-3">
            {profile.country && (countryFlagImages[profile.country] || countryFlagsEmoji[profile.country]) && (
              countryFlagImages[profile.country] ? (
                <img
                  src={countryFlagImages[profile.country]}
                  alt={countryNames[profile.country]}
                  title={countryNames[profile.country]}
                  className="w-5 h-5 object-contain rounded-sm"
                />
              ) : (
                <span className="text-base" title={countryNames[profile.country]}>
                  {countryFlagsEmoji[profile.country]}
                </span>
              )
            )}
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
            {/* Karma */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setOpenKarmaId(openKarmaId === profile.id ? null : profile.id); }}
                className="flex items-center gap-1 text-sm font-medium hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-primary)' }}
              >
                <Star size={14} weight="fill" color="var(--text-tertiary)" />
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
            {/* Account age */}
            {ageDays !== null && (
              <span className="flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }} title={`Account age: ${ageDays} days`}>
                <Calendar size={14} weight="bold" color="var(--text-tertiary)" />
                {ageDays}d
              </span>
            )}
          </div>

          {/* Credential buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* OnlyFans badge */}
            {model?.onlyfans && (
              <button
                onClick={(e) => { e.stopPropagation(); copyToClipboard(model.onlyfans!, `of-${model.id}-${profile.id}`); }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:opacity-80 transition-opacity"
                style={{ background: 'rgba(142, 142, 147, 0.12)' }}
                title={model.onlyfans}
              >
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {copiedId === `of-${model.id}-${profile.id}` ? <span style={{ color: 'var(--accent-green)' }}>{t('common.copied')}</span> : 'OF'}
                </span>
              </button>
            )}
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
                    className="absolute bottom-full left-0 mb-1 py-1 z-50 min-w-[140px]"
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
                    className="absolute bottom-full left-0 mb-1 py-1 z-50 min-w-[140px]"
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

          {/* Launch button for non-admin users */}
          {!isAdminOrDev && (
            <div className="mt-2">
              {isActive ? (
                <button
                  onClick={() => onClose(profile.id)}
                  className="w-full h-9 text-sm font-medium transition-colors"
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
                  className="w-full h-9 text-sm font-medium transition-colors"
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
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Grid layout */}
      <div
        className="gap-5"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        }}
      >
        {sortedProfiles.map(profile => renderCard(profile))}
      </div>

      {/* Archive confirmation modal */}
      {archiveConfirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setArchiveConfirmId(null)}
        >
          <div
            className="p-6 max-w-sm w-full mx-4"
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              {t('profile.archiveConfirm')}
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              {t('profile.archiveConfirmMessage')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setArchiveConfirmId(null)}
                className="flex-1 h-10 text-sm font-medium"
                style={{
                  background: 'var(--chip-bg)',
                  color: 'var(--text-primary)',
                  borderRadius: '100px',
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  onArchive(archiveConfirmId);
                  setArchiveConfirmId(null);
                }}
                className="flex-1 h-10 text-sm font-medium"
                style={{
                  background: 'var(--accent-primary)',
                  color: 'var(--accent-text)',
                  borderRadius: '100px',
                }}
              >
                {t('profile.archive')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProfileList;
