import { useState } from 'react';
import { User, Lock, Eye, EyeSlash } from '@phosphor-icons/react';
import appIcon from '../../assets/icon.png';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const result = await window.electronAPI?.signInWithEmail(username, password);

      if (result?.error) {
        setError(result.error);
      } else if (result?.user) {
        onLoginSuccess();
      }
    } catch (err) {
      setError((err as Error).message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!username) {
      setError('Please enter your username first');
      return;
    }

    setLoading(true);
    try {
      const email = `${username.toLowerCase().trim()}@redash.local`;
      const result = await window.electronAPI?.resetPassword(email);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccessMessage('Password reset requested');
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div
        className="w-full max-w-sm p-8 rounded-3xl"
        style={{ background: 'var(--bg-secondary)' }}
      >
        {/* App icon and title */}
        <div className="flex flex-col items-center mb-8">
          <img
            src={appIcon}
            alt="Redash"
            className="w-16 h-16 rounded-2xl mb-4 shadow-lg"
          />
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Welcome Back
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Sign in to sync your profiles
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div className="relative">
            <User
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-tertiary)' }}
            />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-light)'
              }}
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-tertiary)' }}
            />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full pl-10 pr-10 py-3 rounded-xl text-sm"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-light)'
              }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <p
              className="text-sm px-1"
              style={{ color: 'var(--accent-red)' }}
            >
              {error}
            </p>
          )}

          {/* Success message */}
          {successMessage && (
            <p
              className="text-sm px-1"
              style={{ color: 'var(--accent-green)' }}
            >
              {successMessage}
            </p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background: 'var(--accent-blue)',
              color: 'white'
            }}
          >
            {loading ? 'Please wait...' : 'Sign In'}
          </button>
        </form>

      </div>
    </div>
  );
}

export default LoginPage;
