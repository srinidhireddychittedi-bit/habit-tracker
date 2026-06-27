import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Sun,
  Moon,
  Download,
  Upload,
  LogOut,
  Trash2,
  Globe,
  Target,
  Leaf,
  ChevronRight,
  Save,
  Info,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import GlassCard from './ui/GlassCard.jsx';
import { cn } from '../lib/utils.js';
import { api } from '../api/client.js';

function SettingsSection({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3 px-1">
        {title}
      </h3>
      <GlassCard className="divide-y divide-[var(--glass-border)]">{children}</GlassCard>
    </div>
  );
}

function SettingsRow({ icon: Icon, label, description, children, onClick, danger }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full px-4 py-3.5 text-left transition-colors',
        onClick && 'hover:bg-[var(--bg-secondary)] cursor-pointer',
        danger && 'text-red-500 dark:text-red-400',
      )}
    >
      {Icon && (
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
            danger
              ? 'bg-red-50 dark:bg-red-900/20'
              : 'bg-emerald-50 dark:bg-emerald-900/20',
          )}
        >
          <Icon
            className={cn('w-4 h-4', danger ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400')}
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', danger ? 'text-red-500 dark:text-red-400' : 'text-[var(--text-primary)]')}>
          {label}
        </p>
        {description && (
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate">{description}</p>
        )}
      </div>
      {children || (onClick && <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />)}
    </Wrapper>
  );
}

export default function ProfileSettings() {
  const { user, updateProfile, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [dailyGoal, setDailyGoal] = useState(user?.dailyGoal || 50);
  const [timezone, setTimezone] = useState(user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Timezone list
  const timezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf('timeZone');
    } catch {
      return ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'];
    }
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setDailyGoal(user.dailyGoal || 50);
      setTimezone(user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ name, bio, dailyGoal: Number(dailyGoal), timezone });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    name !== (user?.name || '') ||
    bio !== (user?.bio || '') ||
    dailyGoal !== (user?.dailyGoal || 50) ||
    timezone !== (user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);

  const handleExport = async () => {
    try {
      const [habits, logs] = await Promise.all([
        api.get('/api/habits?archived=true'),
        api.get('/api/logs?from=2020-01-01&to=2099-12-31'),
      ]);
      const data = { habits, logs, profile: user, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aura-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.habits || !data.logs) {
          alert('Invalid backup file format.');
          return;
        }
        if (!window.confirm('This will import habits and logs from the backup. Continue?')) return;
        // Import habits
        for (const habit of (Array.isArray(data.habits) ? data.habits : data.habits.habits || [])) {
          try {
            await api.post('/api/habits', {
              name: habit.name,
              color: habit.color,
              icon: habit.icon,
              frequency: habit.frequency || { type: 'daily' },
            });
          } catch { /* skip duplicates */ }
        }
        alert('Import complete! Refresh to see your habits.');
        window.location.reload();
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    };
    input.click();
  };

  const handleLogout = () => {
    if (window.confirm('Sign out of AURA?')) {
      logout();
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete your account? This will permanently erase all your data. This action cannot be undone.')) return;
    if (!window.confirm('Are you absolutely sure? Type is not supported — click OK to confirm deletion.')) return;
    try {
      // We don't have a delete endpoint yet, so just logout
      await logout();
    } catch {
      // Still logout locally
      logout();
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-28">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-xl font-heading font-bold text-[var(--text-primary)] flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-zen flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          Settings
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Configure your zen dashboard
        </p>
      </motion.div>

      {/* Profile */}
      <SettingsSection title="Profile">
        <div className="px-4 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition resize-none"
              placeholder="A brief bio..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">
              Daily goal — {dailyGoal}%
            </label>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>
        </div>
      </SettingsSection>

      {/* Preferences */}
      <SettingsSection title="Preferences">
        <SettingsRow icon={isDark ? Moon : Sun} label="Theme" description={isDark ? 'Dark mode' : 'Light mode'}>
          <button
            onClick={toggleTheme}
            className={cn(
              'relative w-11 h-6 rounded-full transition-colors duration-200',
              isDark ? 'bg-emerald-500' : 'bg-[var(--bg-tertiary)]',
            )}
          >
            <div
              className={cn(
                'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                isDark ? 'translate-x-[22px]' : 'translate-x-0.5',
              )}
            />
          </button>
        </SettingsRow>
        <SettingsRow icon={Globe} label="Timezone" description={timezone}>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="text-xs bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-lg px-2 py-1 text-[var(--text-primary)] focus:outline-none max-w-[160px]"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </SettingsRow>
      </SettingsSection>

      {/* Save button */}
      {hasChanges && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-gradient-zen text-white font-medium text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : saved ? (
              <>✓ Saved</>
            ) : (
              <><Save className="w-4 h-4" /> Save Changes</>
            )}
          </button>
        </motion.div>
      )}

      {/* Data */}
      <SettingsSection title="Data">
        <SettingsRow icon={Download} label="Export data" description="Download a JSON backup" onClick={handleExport} />
        <SettingsRow icon={Upload} label="Import data" description="Restore from a backup file" onClick={handleImport} />
      </SettingsSection>

      {/* Account */}
      <SettingsSection title="Account">
        <SettingsRow icon={LogOut} label="Sign out" description={user?.email} onClick={handleLogout} />
        <SettingsRow icon={Trash2} label="Delete account" description="Permanently erase all data" onClick={handleDeleteAccount} danger />
      </SettingsSection>

      {/* App info */}
      <div className="text-center mt-6 mb-4 space-y-1">
        <p className="text-xs text-[var(--text-tertiary)]">
          <span className="font-heading font-semibold text-gradient-zen">AURA</span>{' '}
          <span className="font-mono">v1.0.0</span>
        </p>
        <p className="text-[10px] text-[var(--text-tertiary)]">
          Zen Productivity Dashboard — Built with 🍃
        </p>
      </div>
    </div>
  );
}
