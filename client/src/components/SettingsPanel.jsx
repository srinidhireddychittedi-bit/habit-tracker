import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useHabits } from '../contexts/HabitContext.jsx';

export default function SettingsPanel() {
  const { user, logout, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { habits, streakInfo, habitStats } = useHabits();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const totalHabits = habits.length;
  const totalCompletions = Object.values(habitStats).reduce((s, h) => s + (h?.totalCompletions || 0), 0);
  const bestStreak = Object.values(streakInfo).reduce((m, s) => Math.max(m, s?.longestStreak || 0), 0);

  async function saveName(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateProfile({ name: name.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {/* ignore */}
    finally { setSaving(false); }
  }

  const StatCard = ({ emoji, value, label }) => (
    <div className="card px-4 py-4 text-center">
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-xl font-bold font-mono" style={{ color: 'var(--text)' }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );

  return (
    <div className="animate-fade-in max-w-lg mx-auto space-y-5">
      <div>
        <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>⚙ Settings</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Manage your profile and preferences</p>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard emoji="📋" value={totalHabits} label="Habits" />
        <StatCard emoji="✅" value={totalCompletions} label="Completions" />
        <StatCard emoji="🔥" value={bestStreak} label="Best Streak" />
      </div>

      {/* Profile */}
      <div className="card px-5 py-5">
        <h3 className="text-xs font-bold mb-4 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Profile</h3>

        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center text-white font-bold text-lg shadow-md">
            {(user?.name || user?.email || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{user?.name || 'User'}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
        </div>

        <form onSubmit={saveName} className="flex gap-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your display name"
            className="flex-1 px-3 py-2 rounded-xl border text-sm focus:outline-none transition"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--bg-raised)',
              color: 'var(--text)',
            }}
            onFocus={e => e.target.style.borderColor = '#10B981'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={{
              background: saved ? '#D1FAE5' : '#10B981',
              color: saved ? '#065F46' : '#fff',
            }}>
            {saved ? '✓ Saved' : saving ? '…' : 'Save'}
          </button>
        </form>
      </div>

      {/* Preferences */}
      <div className="card px-5 py-5">
        <h3 className="text-xs font-bold mb-4 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Preferences</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            </div>
          </div>
          <button
            onClick={toggleTheme}
            role="switch"
            aria-checked={theme === 'dark'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="relative flex-shrink-0 transition-colors duration-300 focus:outline-none"
            style={{
              width: 48,
              height: 28,
              borderRadius: 14,
              background: theme === 'dark' ? '#10B981' : '#D1D5DB',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
            }}>
            {/* Thumb */}
            <span
              style={{
                position: 'absolute',
                top: 3,
                left: theme === 'dark' ? 23 : 3,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
              }}
            />
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card px-5 py-5">
        <h3 className="text-xs font-bold mb-4 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Account</h3>
        <button
          onClick={logout}
          className="w-full py-2.5 rounded-xl border text-sm font-semibold transition-colors"
          style={{ borderColor: '#FCA5A5', color: '#EF4444', background: 'transparent' }}
          onMouseEnter={e => e.target.style.background = '#FEF2F2'}
          onMouseLeave={e => e.target.style.background = 'transparent'}>
          Sign Out
        </button>
      </div>

      <p className="text-center text-[10px] tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Habit Tracker · All data stored locally & encrypted · v1.0
      </p>
    </div>
  );
}
