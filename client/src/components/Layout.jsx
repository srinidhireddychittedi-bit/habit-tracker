import { useState } from 'react';
import { useHabits } from '../contexts/HabitContext.jsx';
import PersonalizedMatrix from './PersonalizedMatrix.jsx';
import ProductivityCurve from './ProductivityCurve.jsx';
import PomodoroTimer from './PomodoroTimer.jsx';
import HabitModal from './HabitModal.jsx';
import SettingsPanel from './SettingsPanel.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'timer',     label: 'Timer',     icon: '⏱' },
  { id: 'settings',  label: 'Settings',  icon: '⚙' },
];

export default function Layout() {
  const [tab, setTab] = useState('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const { streakInfo } = useHabits();
  const { user } = useAuth();
  const { isDark } = useTheme();

  const maxStreak = Object.values(streakInfo).reduce(
    (max, s) => Math.max(max, s?.currentStreak || 0), 0
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* ── Top Header ─────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center shadow-md">
              <span className="text-white text-base font-bold">✓</span>
            </div>
            <div>
              <span className="font-heading font-bold text-sm tracking-tight" style={{ color: 'var(--text)' }}>
                Habit Tracker
              </span>
              <div className="text-[9px] tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
                by {user?.name || 'You'}
              </div>
            </div>
          </div>

          {/* Streak badge */}
          {maxStreak > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}>
              🔥 {maxStreak} day streak
            </div>
          )}

          {/* Tab nav (desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                style={{
                  background: tab === t.id ? 'var(--accent-glow)' : 'transparent',
                  color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
                }}>
                {t.icon} {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-6 py-6 pb-24 md:pb-8 animate-fade-in">
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <PersonalizedMatrix
              onAddHabit={() => { setEditingHabit(null); setShowModal(true); }}
              onEditHabit={h => { setEditingHabit(h); setShowModal(true); }}
            />
            <ProductivityCurve />
          </div>
        )}
        {tab === 'timer'     && <PomodoroTimer />}
        {tab === 'settings'  && <SettingsPanel />}
      </main>

      {/* ── Bottom Tab Bar (mobile) ─────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t flex"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-semibold transition-colors"
            style={{ color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)' }}>
            <span className="text-base leading-none">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Modals ─────────────────────────────────────── */}
      {showModal && (
        <HabitModal
          habit={editingHabit}
          onClose={() => { setShowModal(false); setEditingHabit(null); }}
        />
      )}
    </div>
  );
}
