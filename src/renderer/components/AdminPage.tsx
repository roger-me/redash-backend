import { useState, useEffect, useRef } from 'react';
import { Plus, Trash, PencilSimple, Shield, X, Check, CaretDown, CaretRight, FolderSimple, Camera, User } from '@phosphor-icons/react';
import { Model } from '../../shared/types';

// Generate a consistent color based on string
const avatarColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#FF8C00', '#00CED1', '#9370DB', '#3CB371',
];

const getAvatarColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

interface AppUser {
  id: string;
  username: string;
  role: 'admin' | 'basic';
  created_at: string;
}

interface AdminPageProps {
  models: Model[];
  currentUserId: string;
  onCreateModel: (name: string, profilePicture?: string) => Promise<void>;
  onUpdateModel: (id: string, name: string, profilePicture?: string) => Promise<void>;
  onDeleteModel: (id: string) => Promise<void>;
}

export default function AdminPage({ models, currentUserId, onCreateModel, onUpdateModel, onDeleteModel }: AdminPageProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userAssignments, setUserAssignments] = useState<Record<string, string[]>>({});

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'basic'>('basic');
  const [createError, setCreateError] = useState('');

  // Model management state
  const [showModelModal, setShowModelModal] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [newModelName, setNewModelName] = useState('');
  const [modelProfilePicture, setModelProfilePicture] = useState('');
  const [modelError, setModelError] = useState('');
  const modelFileInputRef = useRef<HTMLInputElement>(null);

  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'basic'>('basic');
  const [editError, setEditError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await window.electronAPI?.adminListUsers();
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserAssignments = async (userId: string) => {
    try {
      const assignments = await window.electronAPI?.adminGetUserModelAssignments(userId);
      setUserAssignments(prev => ({ ...prev, [userId]: assignments || [] }));
    } catch (err) {
      console.error('Failed to load user assignments:', err);
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername.trim()) {
      setCreateError('Username is required');
      return;
    }
    if (newPassword.length < 6) {
      setCreateError('Password must be at least 6 characters');
      return;
    }

    try {
      await window.electronAPI?.adminCreateUser(newUsername, newPassword, newRole);
      await loadUsers();
      setShowCreateModal(false);
      setNewUsername('');
      setNewPassword('');
      setNewRole('basic');
      setCreateError('');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    const updates: any = {};
    if (editUsername.trim() && editUsername !== editingUser.username) {
      updates.username = editUsername;
    }
    if (editPassword.length > 0) {
      if (editPassword.length < 6) {
        setEditError('Password must be at least 6 characters');
        return;
      }
      updates.password = editPassword;
    }
    if (editRole !== editingUser.role) {
      updates.role = editRole;
    }

    if (Object.keys(updates).length === 0) {
      setEditingUser(null);
      return;
    }

    try {
      await window.electronAPI?.adminUpdateUser(editingUser.id, updates);
      await loadUsers();
      setEditingUser(null);
      setEditError('');
    } catch (err: any) {
      setEditError(err.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUserId) {
      alert('You cannot delete yourself!');
      return;
    }
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await window.electronAPI?.adminDeleteUser(userId);
      await loadUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const handleToggleExpand = async (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
      if (!userAssignments[userId]) {
        await loadUserAssignments(userId);
      }
    }
  };

  const handleToggleModelAssignment = async (userId: string, modelId: string) => {
    console.log('Toggle model assignment:', { userId, modelId });
    const current = userAssignments[userId] || [];
    const newAssignments = current.includes(modelId)
      ? current.filter(id => id !== modelId)
      : [...current, modelId];
    console.log('Current assignments:', current, 'New assignments:', newAssignments);

    try {
      const result = await window.electronAPI?.adminSetUserModelAssignments(userId, newAssignments);
      console.log('Assignment result:', result);
      setUserAssignments(prev => ({ ...prev, [userId]: newAssignments }));
    } catch (err) {
      console.error('Failed to update assignments:', err);
      alert('Failed to update assignments: ' + (err as Error).message);
    }
  };

  const openEditModal = (user: AppUser) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditPassword('');
    setEditRole(user.role);
    setEditError('');
  };

  // Model handlers
  // Image upload handler for model profile picture
  const handleModelImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          setModelProfilePicture(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          setModelProfilePicture(result);
        }
      };
      img.onerror = () => setModelProfilePicture(result);
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleCreateModel = async () => {
    if (!newModelName.trim()) {
      setModelError('Model name is required');
      return;
    }
    try {
      await onCreateModel(newModelName.trim(), modelProfilePicture || undefined);
      setShowModelModal(false);
      setNewModelName('');
      setModelProfilePicture('');
      setModelError('');
    } catch (err: any) {
      setModelError(err.message || 'Failed to create model');
    }
  };

  const handleUpdateModel = async () => {
    if (!editingModel) return;
    if (!newModelName.trim()) {
      setModelError('Model name is required');
      return;
    }
    try {
      await onUpdateModel(editingModel.id, newModelName.trim(), modelProfilePicture || undefined);
      setEditingModel(null);
      setNewModelName('');
      setModelProfilePicture('');
      setModelError('');
    } catch (err: any) {
      setModelError(err.message || 'Failed to update model');
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model? All browsers in this model will become unassigned.')) return;
    try {
      await onDeleteModel(modelId);
    } catch (err) {
      console.error('Failed to delete model:', err);
    }
  };

  const openModelEditModal = (model: Model) => {
    setEditingModel(model);
    setNewModelName(model.name);
    setModelProfilePicture(model.profilePicture || '');
    setModelError('');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p style={{ color: 'var(--text-tertiary)' }}>Loading users...</p>
      </div>
    );
  }

  return (
    <main className="flex-1 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          User Management
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="h-9 px-4 flex items-center gap-2 text-sm font-medium transition-colors"
          style={{
            background: 'var(--btn-primary-bg)',
            borderRadius: '100px',
            color: 'var(--btn-primary-color)',
          }}
        >
          <Plus size={14} weight="bold" />
          New User
        </button>
      </div>

      <div className="space-y-2">
        {users.length === 0 ? (
          <div className="p-12 text-center" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
            <User size={32} weight="light" color="var(--text-tertiary)" className="mx-auto mb-3" />
            <p style={{ color: 'var(--text-tertiary)' }}>No users yet</p>
          </div>
        ) : (
          users.map(user => (
            <div key={user.id} className="overflow-hidden" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => handleToggleExpand(user.id)}
                  className="p-1 hover:opacity-70"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {expandedUser === user.id ? <CaretDown size={16} /> : <CaretRight size={16} />}
                </button>

                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ background: getAvatarColor(user.username) }}
                >
                  {user.username.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {user.username}
                    </span>
                    {user.id === currentUserId && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-green)', color: 'white' }}>
                        You
                      </span>
                    )}
                  </div>
                  <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    {user.role === 'admin' ? 'Administrator' : 'Basic User'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(user)}
                    className="p-2 rounded-lg hover:bg-black/10"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <PencilSimple size={18} />
                  </button>
                  {user.id !== currentUserId && (
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 rounded-lg hover:bg-black/10"
                      style={{ color: 'var(--accent-red)' }}
                    >
                      <Trash size={18} />
                    </button>
                  )}
                </div>
              </div>

              {expandedUser === user.id && user.role === 'basic' && (
                <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Assigned Models
                  </p>
                  {models.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                      No models available. Create models first.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {models.map(model => {
                        const isAssigned = (userAssignments[user.id] || []).includes(model.id);
                        return (
                          <button
                            key={model.id}
                            onClick={() => handleToggleModelAssignment(user.id, model.id)}
                            className="h-9 px-4 rounded-full text-sm font-medium transition-colors flex items-center gap-2"
                            style={{
                              background: isAssigned ? 'var(--accent-blue)' : 'var(--chip-bg)',
                              color: isAssigned ? 'white' : 'var(--text-secondary)',
                            }}
                          >
                            {model.name}
                            {isAssigned && <Check size={14} weight="bold" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {expandedUser === user.id && user.role === 'admin' && (
                <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    Administrators have access to all models and can manage users.
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Models Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Models
          </h2>
          <button
            onClick={() => {
              setShowModelModal(true);
              setNewModelName('');
              setModelError('');
            }}
            className="h-9 px-4 flex items-center gap-2 text-sm font-medium transition-colors"
            style={{
              background: 'var(--btn-primary-bg)',
              borderRadius: '100px',
              color: 'var(--btn-primary-color)',
            }}
          >
            <Plus size={14} weight="bold" />
            New Model
          </button>
        </div>

        <div className="space-y-2">
          {models.length === 0 ? (
            <div className="p-8 text-center" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
              <FolderSimple size={32} weight="light" color="var(--text-tertiary)" className="mx-auto mb-3" />
              <p style={{ color: 'var(--text-tertiary)' }}>No models yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Create models to organize browsers and assign to users
              </p>
            </div>
          ) : (
            models.map(model => (
              <div
                key={model.id}
                className="flex items-center gap-3 p-4"
                style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
                  style={{ background: 'var(--chip-bg)' }}
                >
                  {model.profilePicture ? (
                    <img src={model.profilePicture} alt={model.name} className="w-full h-full object-cover" />
                  ) : (
                    <FolderSimple size={20} weight="bold" style={{ color: 'var(--text-secondary)' }} />
                  )}
                </div>

                <div className="flex-1">
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {model.name}
                  </span>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    Created {new Date(model.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openModelEditModal(model)}
                    className="p-2 rounded-lg hover:bg-black/10"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <PencilSimple size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteModel(model.id)}
                    className="p-2 rounded-lg hover:bg-black/10"
                    style={{ color: 'var(--accent-red)' }}
                  >
                    <Trash size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md p-6" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Create User</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ color: 'var(--text-tertiary)' }}>
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg text-sm"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg text-sm"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  placeholder="Min 6 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Role</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewRole('basic')}
                    className="flex-1 h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    style={{
                      background: newRole === 'basic' ? 'var(--accent-blue)' : 'var(--chip-bg)',
                      color: newRole === 'basic' ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    <User size={16} /> Basic
                  </button>
                  <button
                    onClick={() => setNewRole('admin')}
                    className="flex-1 h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    style={{
                      background: newRole === 'admin' ? 'var(--accent-blue)' : 'var(--chip-bg)',
                      color: newRole === 'admin' ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    <Shield size={16} /> Admin
                  </button>
                </div>
              </div>

              {createError && <p className="text-sm" style={{ color: 'var(--accent-red)' }}>{createError}</p>}

              <button
                onClick={handleCreateUser}
                className="w-full h-10 rounded-lg text-sm font-medium"
                style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-color)' }}
              >
                Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md p-6" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Edit User</h2>
              <button onClick={() => setEditingUser(null)} style={{ color: 'var(--text-tertiary)' }}>
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Username</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg text-sm"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  New Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg text-sm"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  placeholder="Min 6 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Role</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditRole('basic')}
                    className="flex-1 h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    style={{
                      background: editRole === 'basic' ? 'var(--accent-blue)' : 'var(--chip-bg)',
                      color: editRole === 'basic' ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    <User size={16} /> Basic
                  </button>
                  <button
                    onClick={() => setEditRole('admin')}
                    className="flex-1 h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    disabled={editingUser.id === currentUserId}
                    style={{
                      background: editRole === 'admin' ? 'var(--accent-blue)' : 'var(--chip-bg)',
                      color: editRole === 'admin' ? 'white' : 'var(--text-secondary)',
                      opacity: editingUser.id === currentUserId ? 0.5 : 1,
                    }}
                  >
                    <Shield size={16} /> Admin
                  </button>
                </div>
                {editingUser.id === currentUserId && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>You cannot change your own role</p>
                )}
              </div>

              {editError && <p className="text-sm" style={{ color: 'var(--accent-red)' }}>{editError}</p>}

              <button
                onClick={handleUpdateUser}
                className="w-full h-10 rounded-lg text-sm font-medium"
                style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-color)' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Model Modal */}
      {(showModelModal || editingModel) && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md p-6" style={{ background: 'var(--bg-secondary)', borderRadius: '28px' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingModel ? 'Edit Model' : 'Create Model'}
              </h2>
              <button
                onClick={() => {
                  setShowModelModal(false);
                  setEditingModel(null);
                  setNewModelName('');
                  setModelProfilePicture('');
                  setModelError('');
                }}
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Profile Picture */}
              <div
                className="flex items-center gap-4 cursor-pointer"
                onClick={() => modelFileInputRef.current?.click()}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden relative group"
                  style={{ background: 'var(--bg-tertiary)' }}
                >
                  {modelProfilePicture ? (
                    <img
                      src={modelProfilePicture}
                      alt="Model"
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
                  ref={modelFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleModelImageUpload}
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

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Model Name
                </label>
                <input
                  type="text"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg text-sm"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  placeholder="Enter model name"
                  autoFocus
                />
              </div>

              {modelError && <p className="text-sm" style={{ color: 'var(--accent-red)' }}>{modelError}</p>}

              <button
                onClick={editingModel ? handleUpdateModel : handleCreateModel}
                className="w-full h-10 rounded-lg text-sm font-medium"
                style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-color)' }}
              >
                {editingModel ? 'Save Changes' : 'Create Model'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
