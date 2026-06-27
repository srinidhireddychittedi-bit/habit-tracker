import { useRef, useMemo, useState } from 'react';
import { useHabits } from '../contexts/HabitContext.jsx';
import { getToday, daysAgo, resolveIcon } from '../lib/utils.js';

// ── Priority config ────────────────────────────────────────
const PRIORITY_CONFIG = {
  high:   { label: 'High',   color: '#EF4444', bg: '#FEF2F2', dot: '🔴' },
  medium: { label: 'Medium', color: '#F59E0B', bg: '#FFFBEB', dot: '🟡' },
  low:    { label: 'Low',    color: '#10B981', bg: '#ECFDF5', dot: '🟢' },
};

// ── Status cycle ───────────────────────────────────────────
// null → completed → partial → missed → null (DELETE)
const STATUS_CYCLE = [null, 'completed', 'partial', 'missed'];

function nextStatus(current) {
  const idx = STATUS_CYCLE.indexOf(current ?? null);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

function CellButton({ status, isToday, onClick }) {
  const base = 'w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-150 text-sm font-bold select-none border-2';

  if (status === 'completed') return (
    <button onClick={onClick} title="Completed (click to change)" className={`${base} text-white`}
      style={{ background: '#10B981', borderColor: '#059669', boxShadow: '0 1px 6px rgba(16,185,129,0.4)' }}>✓</button>
  );
  if (status === 'partial') return (
    <button onClick={onClick} title="Partial (click to change)" className={`${base} text-white`}
      style={{ background: '#F59E0B', borderColor: '#D97706', boxShadow: '0 1px 4px rgba(245,158,11,0.4)' }}>~</button>
  );
  if (status === 'missed') return (
    <button onClick={onClick} title="Missed (click to clear)" className={`${base} text-white`}
      style={{ background: '#EF4444', borderColor: '#DC2626', boxShadow: '0 1px 4px rgba(239,68,68,0.3)' }}>✕</button>
  );
  return (
    <button onClick={onClick} title={isToday ? "Click to mark today" : "Click to mark"}
      className={`${base} hover:scale-110`}
      style={{ borderStyle: 'dashed', borderColor: isToday ? '#10B981' : 'var(--border)', background: isToday ? 'rgba(16,185,129,0.05)' : 'transparent' }}
    />
  );
}

function getDateRange(numDays) {
  return Array.from({ length: numDays }, (_, i) => daysAgo(numDays - 1 - i));
}

export default function PersonalizedMatrix({ onAddHabit, onEditHabit }) {
  const { habits, getLog, toggleCompletion, deleteHabit, loading, streakInfo } = useHabits();
  const scrollRef = useRef(null);
  const today = getToday();
  const dates = useMemo(() => getDateRange(30), []);
  const [confirm, setConfirm] = useState(null);

  function handleCell(habitId, date) {
    const log = getLog(habitId, date);
    const next = nextStatus(log?.status ?? null);
    toggleCompletion(habitId, date, next);
  }

  // Sort habits by priority: high → medium → low
  const sortedHabits = useMemo(() => {
    const order = { high: 0, medium: 1, low: 2 };
    return [...habits].sort((a, b) => (order[a.priority || 'medium'] ?? 1) - (order[b.priority || 'medium'] ?? 1));
  }, [habits]);

  return (
    <section className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>📋 Habit Matrix</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Tap a cell: empty → ✓ done → ~ partial → ✕ missed → empty
          </p>
        </div>
        <button onClick={onAddHabit} className="btn-primary flex items-center gap-1.5">
          <span className="text-base leading-none font-bold">+</span> Add Habit
        </button>
      </div>

      {/* Matrix card */}
      <div className="card overflow-hidden">
        <div ref={scrollRef} className="overflow-x-auto">
          <table className="border-collapse" style={{ minWidth: `${Math.max(dates.length * 38 + 220, 520)}px` }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="sticky left-0 z-10 px-4 py-3 text-left text-[10px] font-bold tracking-widest uppercase"
                  style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)', minWidth: 220, borderRight: '1px solid var(--border)' }}>
                  Habit / Priority
                </th>
                {dates.map(date => {
                  const isToday = date === today;
                  const d = new Date(date + 'T00:00:00');
                  return (
                    <th key={date} className="px-0.5 py-2 text-center" style={{ minWidth: 38, background: isToday ? 'rgba(16,185,129,0.08)' : 'var(--bg-raised)' }}>
                      <div className="text-[9px] font-semibold tracking-wide" style={{ color: isToday ? '#10B981' : 'var(--text-muted)' }}>
                        {d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0,2).toUpperCase()}
                      </div>
                      <div className="text-xs font-bold" style={{ color: isToday ? '#10B981' : 'var(--text-soft)' }}>{d.getDate()}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading && habits.length === 0 ? (
                <tr><td colSpan={dates.length + 1} className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>Loading habits…</td></tr>
              ) : sortedHabits.length === 0 ? (
                <tr>
                  <td colSpan={dates.length + 1} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-4xl">🌱</span>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-soft)' }}>No habits yet</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Click "Add Habit" to start your journey</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedHabits.map((habit, i) => {
                  const streak = streakInfo[habit.id];
                  const priority = PRIORITY_CONFIG[habit.priority || 'medium'];
                  const icon = resolveIcon(habit.icon);

                  return (
                    <tr key={habit.id} style={{
                      borderBottom: '1px solid var(--border)',
                      background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg)',
                    }}>
                      {/* Habit name sticky cell */}
                      <td className="sticky left-0 z-10 px-3 py-2"
                        style={{ borderRight: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg)' }}>
                        <div className="flex items-center justify-between gap-2 group">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Color stripe */}
                            <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: habit.color || '#10B981' }} />
                            {/* Emoji icon */}
                            <span className="text-xl leading-none flex-shrink-0" title={`Icon: ${habit.icon}`}>{icon}</span>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{habit.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {/* Priority badge */}
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                                  style={{ background: priority.bg, color: priority.color }}>
                                  {priority.dot} {priority.label}
                                </span>
                                {/* Streak */}
                                {streak?.currentStreak > 0 && (
                                  <span className="text-[9px]" style={{ color: '#F97316' }}>🔥 {streak.currentStreak}d</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Edit/delete buttons (hover) */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button onClick={() => onEditHabit(habit)}
                              className="w-6 h-6 rounded text-xs flex items-center justify-center hover:opacity-70 transition-opacity"
                              style={{ color: 'var(--text-muted)' }} title="Edit habit">✎</button>
                            <button onClick={() => setConfirm(habit.id)}
                              className="w-6 h-6 rounded text-xs flex items-center justify-center hover:text-red-500 transition-colors"
                              style={{ color: 'var(--text-muted)' }} title="Delete habit">✕</button>
                          </div>
                        </div>
                        {/* Inline delete confirm */}
                        {confirm === habit.id && (
                          <div className="mt-1.5 flex items-center gap-2 text-xs">
                            <span style={{ color: 'var(--text-soft)' }}>Delete this habit?</span>
                            <button onClick={() => { deleteHabit(habit.id); setConfirm(null); }}
                              className="px-2 py-0.5 rounded font-semibold text-white bg-red-500">Yes</button>
                            <button onClick={() => setConfirm(null)}
                              className="px-2 py-0.5 rounded font-semibold"
                              style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }}>No</button>
                          </div>
                        )}
                      </td>

                      {/* Date cells */}
                      {dates.map(date => {
                        const isToday = date === today;
                        const log = getLog(habit.id, date);
                        return (
                          <td key={date} className="px-0.5 py-1.5 text-center"
                            style={{ background: isToday ? 'rgba(16,185,129,0.04)' : 'transparent' }}>
                            <CellButton
                              status={log?.status ?? null}
                              isToday={isToday}
                              onClick={() => handleCell(habit.id, date)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 border-t text-xs"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-emerald-500 inline-flex items-center justify-center text-white text-[10px]">✓</span>Completed</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-amber-400 inline-flex items-center justify-center text-white text-[10px]">~</span>Partial</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-red-400 inline-flex items-center justify-center text-white text-[10px]">✕</span>Missed</span>
          <span className="ml-auto text-[10px]">← scroll to see older days</span>
        </div>
      </div>
    </section>
  );
}
