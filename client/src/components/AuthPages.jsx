import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function AuthPages() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        if (password.length < 8) throw new Error('Password must be at least 8 characters.');
        await register(email.trim(), password, name.trim());
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = {
    borderColor: 'var(--border)',
    background: 'var(--bg-raised)',
    color: 'var(--text)',
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>

      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #10B981, transparent)' }} />
        <div className="absolute -bottom-40 -right-20 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #3B82F6, transparent)' }} />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-sm animate-slide-up">
        <div className="card px-8 py-10 shadow-2xl">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center shadow-lg mb-4">
              <span className="text-white text-2xl font-bold">✓</span>
            </div>
            <h1 className="font-heading text-xl font-bold" style={{ color: 'var(--text)' }}>
              Habit Tracker
            </h1>
            <p className="text-xs mt-1 text-center" style={{ color: 'var(--text-muted)' }}>
              Build habits. Find clarity. Grow.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden mb-6 border" style={{ borderColor: 'var(--border)' }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className="flex-1 py-2 text-xs font-bold capitalize transition-colors"
                style={{
                  background: mode === m ? '#10B981' : 'var(--bg-raised)',
                  color:      mode === m ? '#fff'     : 'var(--text-muted)',
                }}>
                {m === 'login' ? '🔑 Sign In' : '✨ Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                  style={{ color: 'var(--text-muted)' }}>Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none transition"
                  style={inputClass}
                  onFocus={e => e.target.style.borderColor = '#10B981'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                style={{ color: 'var(--text-muted)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none transition"
                style={inputClass}
                onFocus={e => e.target.style.borderColor = '#10B981'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                style={{ color: 'var(--text-muted)' }}>Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Min 8 characters' : '••••••••'}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none transition pr-12"
                  style={inputClass}
                  onFocus={e => e.target.style.borderColor = '#10B981'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                  style={{ color: 'var(--text-muted)' }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                ⚠ {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 mt-2">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Loading…</>
              ) : mode === 'login' ? '🔑 Sign In' : '✨ Create Account'}
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have one? '}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="font-semibold text-emerald-500 hover:underline">
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>

        <p className="text-center text-[10px] mt-4 tracking-wider" style={{ color: 'var(--text-muted)' }}>
          🔒 Your data is stored locally & encrypted
        </p>
      </div>
    </div>
  );
}
