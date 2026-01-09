import { useState, useRef, useEffect } from 'react';
import { Profile, Model } from '../../shared/types';
import { CaretRight, FolderSimple, ChatCircle, File, Check, Circle, DotsThreeVertical, PencilSimple, Trash, User, Plus, Calendar } from '@phosphor-icons/react';

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
  onToggleComplete: (id: string, completed: boolean) => void;
  onToggleStatus: (id: string, status: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
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

const getTodayDate = () => new Date().toISOString().split('T')[0];

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
  onToggleComplete,
  onToggleStatus,
  onToggleEnabled,
  onRenameModel,
  onDeleteModel,
  onToggleModelExpand,
  onCreateAccountInModel,
}: ProfileListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [moveMenuProfileId, setMoveMenuProfileId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDelete = (profile: Profile) => {
    setOpenMenuId(null);
    setDeleteConfirmId(profile.id);
  };

  const confirmDelete = (id: string) => {
    onDelete(id);
    setDeleteConfirmId(null);
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
          </div>

          {/* Status & Karma Pills */}
          <div className="flex items-center gap-2 mt-2">
            {/* Status pill */}
            <button
              onClick={() => onToggleStatus(profile.id, profile.status === 'banned' ? 'working' : 'banned')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
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
                {profile.status === 'banned' ? 'Banned' : profile.status === 'error' ? 'Error' : 'Working'}
              </span>
            </button>
            {/* Enabled/Disabled pill */}
            <button
              onClick={() => onToggleEnabled(profile.id, profile.isEnabled === false)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                background: profile.isEnabled !== false ? 'rgba(10, 132, 255, 0.15)' : 'rgba(142, 142, 147, 0.12)',
              }}
            >
              <span
                className="text-xs font-medium"
                style={{
                  color: profile.isEnabled !== false ? 'var(--accent-blue)' : 'var(--text-tertiary)',
                }}
              >
                {profile.isEnabled !== false ? 'Enabled' : 'Disabled'}
              </span>
            </button>
            {/* Daily/Done pill */}
            {(() => {
              const isCompletedToday = profile.lastCompletedDate === getTodayDate();
              return (
                <button
                  onClick={() => onToggleComplete(profile.id, !isCompletedToday)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    background: isCompletedToday ? 'rgba(48, 209, 88, 0.15)' : 'rgba(142, 142, 147, 0.12)',
                  }}
                >
                  {isCompletedToday && <Check size={12} weight="bold" color="var(--accent-green)" />}
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: isCompletedToday ? 'var(--accent-green)' : 'var(--text-tertiary)',
                    }}
                  >
                    {isCompletedToday ? 'Done' : 'Daily'}
                  </span>
                </button>
              );
            })()}
            {/* Comment Karma */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(142, 142, 147, 0.12)' }}
              title="Comment Karma"
            >
              <ChatCircle size={12} weight="bold" color="var(--text-tertiary)" />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {profile.commentKarma || 0}
              </span>
            </div>
            {/* Post Karma */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(142, 142, 147, 0.12)' }}
              title="Post Karma"
            >
              <File size={12} weight="bold" color="var(--text-tertiary)" />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {profile.postKarma || 0}
              </span>
            </div>
            {/* Account Age */}
            {(() => {
              const ageDays = getAccountAgeDays(profile.purchaseDate);
              if (ageDays === null) return null;
              return (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(142, 142, 147, 0.12)' }}
                  title={`Account age: ${ageDays} days`}
                >
                  <Calendar size={12} weight="bold" color="var(--text-tertiary)" />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {ageDays}d
                  </span>
                </div>
              );
            })()}
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
              Stop
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
              Launch
            </button>
          )}

          {/* Menu button */}
          <div className="relative" ref={openMenuId === profile.id ? menuRef : null}>
            <button
              onClick={() => {
                setOpenMenuId(openMenuId === profile.id ? null : profile.id);
                setMoveMenuProfileId(null);
              }}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <DotsThreeVertical size={16} weight="bold" />
            </button>

            {/* Dropdown menu */}
            {openMenuId === profile.id && (
              <div
                className="absolute right-0 z-50 min-w-[160px] top-8 overflow-hidden"
                style={{
                  background: 'var(--bg-tertiary)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                  borderRadius: '12px',
                }}
              >
                <button
                  onClick={() => {
                    setOpenMenuId(null);
                    onEdit(profile);
                  }}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <PencilSimple size={14} weight="bold" />
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(profile)}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--accent-red)' }}
                >
                  <Trash size={14} weight="bold" />
                  Delete
                </button>
              </div>
            )}
          </div>
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
                <span className="font-semibold text-base flex-1" style={{ color: 'var(--text-primary)' }}>
                  {model.name}
                </span>

                {/* New Browser button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateAccountInModel(model.id);
                  }}
                  className="h-8 px-3 text-xs font-medium rounded-full flex items-center gap-1.5 hover:bg-white/10 transition-colors"
                  style={{
                    background: 'var(--chip-bg)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <Plus size={14} weight="bold" />
                  New
                </button>

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

      {/* Delete Profile Confirmation Modal */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => e.target === e.currentTarget && setDeleteConfirmId(null)}
        >
          <div
            className="w-full max-w-sm p-5"
            style={{
              background: 'var(--bg-secondary)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              borderRadius: '28px',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255, 69, 58, 0.15)' }}
              >
                <Trash size={20} weight="bold" color="var(--accent-red)" />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Delete Account
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
              Are you sure you want to delete "{profiles.find(p => p.id === deleteConfirmId)?.name}"?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 text-sm font-medium transition-colors"
                style={{
                  background: 'rgba(142, 142, 147, 0.12)',
                  color: 'var(--text-primary)',
                  borderRadius: '100px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(deleteConfirmId)}
                className="flex-1 py-2.5 text-sm font-medium transition-colors"
                style={{
                  background: 'var(--accent-red)',
                  color: '#ffffff',
                  borderRadius: '100px',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

export default ProfileList;
