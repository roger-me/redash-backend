import { useState, useRef } from 'react';
import { FolderSimple, Camera, User } from '@phosphor-icons/react';

interface ModelModalProps {
  mode: 'create' | 'edit';
  initialName?: string;
  initialProfilePicture?: string;
  onClose: () => void;
  onSave: (name: string, profilePicture?: string) => void;
}

function ModelModal({ mode, initialName = '', initialProfilePicture = '', onClose, onSave }: ModelModalProps) {
  const [name, setName] = useState(initialName);
  const [profilePicture, setProfilePicture] = useState(initialProfilePicture);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;

      // Compress using canvas
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 150;
        let { width, height } = img;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height / width) * maxSize);
            width = maxSize;
          } else {
            width = Math.round((width / height) * maxSize);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setProfilePicture(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          setProfilePicture(result); // Fallback
        }
      };
      img.onerror = () => setProfilePicture(result); // Fallback
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a model name');
      return;
    }
    onSave(name.trim(), profilePicture || undefined);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm p-5"
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(10, 132, 255, 0.15)' }}
          >
            <FolderSimple size={20} weight="bold" color="var(--accent-blue)" />
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {mode === 'create' ? 'New Model' : 'Edit Model'}
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {mode === 'create' ? 'Create a group for accounts' : 'Update model settings'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Profile Picture */}
          <div
            className="flex items-center gap-4 mb-4 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden relative group"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={28} weight="bold" color="var(--text-tertiary)" />
              )}
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                style={{ background: 'rgba(0, 0, 0, 0.5)' }}
              >
                <Camera size={20} weight="bold" color="white" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Profile Picture
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Click to upload
              </p>
            </div>
          </div>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Model name"
            autoFocus
            className="w-full mb-4"
          />

          <div className="flex gap-3">
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
              {mode === 'create' ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModelModal;
