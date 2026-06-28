import { useRef, useMemo, useState } from 'react';
import { useHabits } from '../contexts/HabitContext.jsx';
import { getToday, daysAgo, resolveIcon } from '../lib/utils.js';

// ── Colours ────────────────────────────────────────────────
// Mint-green matching the original site's aesthetic
const MINT   = '#10B981';   // emerald — matches Add Habit button & brand
const AMBER  = '#FBBF24';   // warm amber for partial
const ROSE   = '#F87171';   // soft rose for missed

const PRIORITY_COLOR = { high: '#F87171', medium: '#FBBF24', low: '#34D399' };
const PRIORITY_LABEL = { high: 'HIGH', medium: 'MED', low: 'LOW' };

// ── Status cycle ───────────────────────────────────────────
const STATUS_CYCLE = [null, 'completed', 'partial', 'missed'];
function nextStatus(current) {
  const idx = STATUS_CYCLE.indexOf(current ?? null);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

// ── Cell ───────────────────────────────────────────────────
function Cell({ status, isToday, onClick }) {
  // Sizes: 28×28px — compact, premium
  const base = {
    width: 28, height: 28,
    borderRadius: 7,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontSize: 12, fontWeight: 700,
    flexShrink: 0,
  };

  if (status === 'completed') return (
    <button onClick={onClick} title="Completed — click to change" style={{
      ...base,
      background: MINT,
      color: '#fff',
      border: `1.5px solid ${MINT}`,
      boxShadow: `0 2px 8px ${MINT}55`,
    }}>
      {/* Elegant thin checkmark */}
      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
        <path d="M1 5L4.5 8.5L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );

  if (status === 'partial') return (
    <button onClick={onClick} title="Partial — click to change" style={{
      ...base,
      background: 'transparent',
      border: `1.5px solid ${AMBER}`,
      color: AMBER,
      boxShadow: `0 1px 6px ${AMBER}33`,
    }}>
      <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
        <path d="M1 1H9" stroke={AMBER} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </button>
  );

  if (status === 'missed') return (
    <button onClick={onClick} title="Missed — click to clear" style={{
      ...base,
      background: `${ROSE}18`,
      border: `1.5px solid ${ROSE}`,
      color: ROSE,
    }}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M1 1L9 9M9 1L1 9" stroke={ROSE} strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    </button>
  );

  // Empty cell
  return (
    <button onClick={onClick} title="Click to mark" style={{
      ...base,
      background: isToday ? `${MINT}10` : 'transparent',
      border: `1px solid ${isToday ? MINT + '60' : 'var(--border)'}`,
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = MINT + '80'; e.currentTarget.style.background = MINT + '10'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = isToday ? MINT + '60' : 'var(--border)'; e.currentTarget.style.background = isToday ? MINT + '10' : 'transparent'; }}
    />
  );
}

function getDateRange(n) {
  return Array.from({ length: n }, (_, i) => daysAgo(n - 1 - i));
}

export default function PersonalizedMatrix({ onAddHabit, onEditHabit }) {
  const { habits, getLog, toggleCompletion, deleteHabit, loading, streakInfo } = useHabits();
  const scrollRef = useRef(null);
  const today     = getToday();
  const dates     = useMemo(() => getDateRange(30), []);
  const [confirm, setConfirm] = useState(null);

  function handleCell(habitId, date) {
    const log  = getLog(habitId, date);
    const next = nextStatus(log?.status ?? null);
    toggleCompletion(habitId, date, next);
  }

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
          <table className="border-collapse" style={{ minWidth: `${Math.max(dates.length * 36 + 200, 500)}px` }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {/* Sticky header label */}
                <th className="sticky left-0 z-10 px-4 py-3 text-left"
                  style={{
                    background: 'var(--bg-raised)',
                    borderRight: '1px solid var(--border)',
                    minWidth: 200,
                    fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                  }}>
                  Configured Habits
                </th>
                {dates.map(date => {
                  const isToday = date === today;
                  const d = new Date(date + 'T00:00:00');
                  return (
                    <th key={date} style={{
                      minWidth: 36, padding: '8px 1px',
                      textAlign: 'center',
                      background: isToday ? `${MINT}12` : 'var(--bg-raised)',
                    }}>
                      <div style={{
                        fontSize: 9, fontWeight: 600, letterSpacing: '0.05em',
                        color: isToday ? MINT : 'var(--text-muted)',
                        textTransform: 'uppercase',
                      }}>
                        {d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}
                      </div>
                      <div style={{
                        fontSize: 12, fontWeight: 700,
                        color: isToday ? MINT : 'var(--text-soft)',
                      }}>
                        {d.getDate()}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading && habits.length === 0 ? (
                <tr><td colSpan={dates.length + 1} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13 }}>Loading habits…</td></tr>
              ) : sortedHabits.length === 0 ? (
                <tr>
                  <td colSpan={dates.length + 1} style={{ textAlign: 'center', padding: '64px 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 36 }}>🌱</span>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-soft)', margin: 0 }}>No habits yet</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Click "Add Habit" to start your journey</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedHabits.map((habit, i) => {
                  const streak   = streakInfo[habit.id];
                  const pColor   = PRIORITY_COLOR[habit.priority || 'medium'];
                  const pLabel   = PRIORITY_LABEL[habit.priority || 'medium'];
                  const icon     = resolveIcon(habit.icon);
                  const rowBg    = i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg)';

                  return (
                    <tr key={habit.id} style={{ borderBottom: '1px solid var(--border)', background: rowBg }}>

                      {/* ── Habit name cell (sticky) ─────────────────── */}
                      <td className="sticky left-0 z-10"
                        style={{ background: rowBg, borderRight: '1px solid var(--border)', padding: '10px 12px' }}>
                        <div className="flex items-center justify-between gap-2 group">
                          <div className="flex items-center gap-2 min-w-0">

                            {/* Colored bar */}
                            <div style={{
                              width: 3, height: 32, borderRadius: 3, flexShrink: 0,
                              background: habit.color || MINT,
                            }} />

                            {/* Emoji */}
                            <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{icon}</span>

                            {/* Name + priority inline */}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {habit.name}
                                </span>
                                {/* Priority dot + tiny label — inline, not below */}
                                <span style={{
                                  fontSize: 9, fontWeight: 700,
                                  color: pColor,
                                  letterSpacing: '0.05em',
                                  opacity: 0.85,
                                  flexShrink: 0,
                                }}>
                                  ● {pLabel}
                                </span>
                              </div>
                              {/* Streak — only if active */}
                              {streak?.currentStreak > 0 && (
                                <span style={{ fontSize: 10, color: '#FB923C' }}>
                                  🔥 {streak.currentStreak} day streak
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Edit / delete (appear on hover) */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button onClick={() => onEditHabit(habit)} title="Edit"
                              style={{ width: 22, height: 22, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>✎</button>
                            <button onClick={() => setConfirm(habit.id)} title="Delete"
                              style={{ width: 22, height: 22, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
                          </div>
                        </div>

                        {/* Delete confirm */}
                        {confirm === habit.id && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12 }}>
                            <span style={{ color: 'var(--text-soft)' }}>Delete?</span>
                            <button onClick={() => { deleteHabit(habit.id); setConfirm(null); }}
                              style={{ padding: '2px 10px', borderRadius: 5, background: '#EF4444', color: '#fff', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>Yes</button>
                            <button onClick={() => setConfirm(null)}
                              style={{ padding: '2px 10px', borderRadius: 5, background: 'var(--bg-raised)', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>No</button>
                          </div>
                        )}
                      </td>

                      {/* ── Date cells ───────────────────────────────── */}
                      {dates.map(date => {
                        const isToday = date === today;
                        const log     = getLog(habit.id, date);
                        return (
                          <td key={date} style={{
                            padding: '0 4px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            background: isToday ? `${MINT}06` : 'transparent',
                          }}>
                            <Cell
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
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16,
          padding: '10px 16px',
          borderTop: '1px solid var(--border)',
          fontSize: 11, color: 'var(--text-muted)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 16, height: 16, borderRadius: 5, background: MINT, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            Completed
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 16, height: 16, borderRadius: 5, border: `1.5px solid ${AMBER}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="7" height="1.5" viewBox="0 0 7 1.5" fill="none"><path d="M0.5 0.75H6.5" stroke={AMBER} strokeWidth="1.5" strokeLinecap="round"/></svg>
            </span>
            Partial
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 16, height: 16, borderRadius: 5, border: `1.5px solid ${ROSE}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="7" height="7" viewBox="0 0 7 7" fill="none"><path d="M1 1L6 6M6 1L1 6" stroke={ROSE} strokeWidth="1.5" strokeLinecap="round"/></svg>
            </span>
            Missed
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 10 }}>← scroll to see older days</span>
        </div>
      </div>
    </section>
  );
}
