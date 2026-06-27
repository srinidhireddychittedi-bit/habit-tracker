import { useState, useRef, useEffect } from 'react';
import { useHabits } from '../contexts/HabitContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import PersonalizedMatrix from './PersonalizedMatrix.jsx';
import ProductivityCurve from './ProductivityCurve.jsx';
import HabitModal from './HabitModal.jsx';
import SettingsPanel from './SettingsPanel.jsx';

export default function Dashboard() {
  const { habits, streakInfo } = useHabits();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Best streak across all habits
  const maxStreak = Object.values(streakInfo).reduce(
    (max, s) => Math.max(max, s?.currentStreak || 0),
    0
  );

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 grid grid-cols-2 gap-0.5">
            {[0,1,2,3].map(i => (
              <div key={i} className="bg-emerald-500 rounded-[2px]" />
            ))}
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800 leading-tight tracking-wide">AURA</div>
            <div className="text-[9px] text-slate-400 tracking-widest uppercase leading-tight">Calm Habit Space</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {maxStreak > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
              <span className="text-base">🔥</span>
              <span className="text-xs font-semibold text-amber-700">{maxStreak} Day Streak</span>
            </div>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────── */}
      <main className="flex-1 px-4 md:px-8 py-6 space-y-8 max-w-screen-xl mx-auto w-full">
        <PersonalizedMatrix
          onAddHabit={() => { setEditingHabit(null); setShowModal(true); }}
          onEditHabit={(habit) => { setEditingHabit(habit); setShowModal(true); }}
        />
        <ProductivityCurve />
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 px-6 py-3 flex items-center justify-between">
        <p className="text-[10px] text-slate-300 tracking-wider uppercase">
          © 2026 AURA SPACE // PERSONALIZED HABIT MATRIX. MULTI-HABIT TRACKING. LOCAL. ENCRYPTED.
        </p>
        <div className="text-[10px] text-slate-400 tracking-wider flex items-center gap-1">
          <span>⌃</span> System Command Lab
        </div>
      </footer>

      {/* ── Modals ──────────────────────────────────────────── */}
      {showModal && (
        <HabitModal
          habit={editingHabit}
          onClose={() => { setShowModal(false); setEditingHabit(null); }}
        />
      )}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
