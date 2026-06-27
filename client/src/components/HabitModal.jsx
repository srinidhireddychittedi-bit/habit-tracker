import { useState, useEffect } from 'react';
import { useHabits } from '../contexts/HabitContext.jsx';
import { HABIT_COLORS, DAYS_OF_WEEK, cn, resolveIcon } from '../lib/utils.js';


const EMOJI_OPTIONS = [
  '💪','🧘','📚','💧','🏃','🍎','😴','✍️','🎯','🎸',
  '🏋️','🚴','🧠','🌿','🍵','🎨','💊','🛌','🧹','🌅',
  '🏊','🎻','📝','🌱','🔥','⭐','❤️','🦷','🥗','🧘',
  '📌','🎮','🚶','🤸','🧪','📖','🎵','🌻','🍀','🕯️',
  '🏆','🌙','☀️','🌊','🦁','🦋','🌈','⚡','🎪','🏅',
];

const PRIORITY_OPTIONS = [
  { value: 'high',   label: '🔴 High',   desc: 'Must not miss this',  color: '#EF4444', bg: '#FEF2F2' },
  { value: 'medium', label: '🟡 Medium', desc: 'Try to do daily',     color: '#F59E0B', bg: '#FFFBEB' },
  { value: 'low',    label: '🟢 Low',    desc: 'Nice to have',        color: '#10B981', bg: '#ECFDF5' },
];

const FREQ_OPTIONS = [
  { value: 'daily',    label: '📆 Every day' },
  { value: 'weekdays', label: '💼 Weekdays (Mon–Fri)' },
  { value: 'weekends', label: '🌅 Weekends only' },
  { value: 'custom',   label: '🎛️ Pick specific days' },
  { value: 'weekly',   label: '🔢 X times per week' },
];

const DAY_TO_NUM = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };

export default function HabitModal({ habit = null, onClose }) {
  const { addHabit, updateHabit } = useHabits();
  const isEditing = !!habit;

  const [name,         setName]         = useState('');
  const [icon,         setIcon]         = useState('📌');
  const [color,        setColor]        = useState(HABIT_COLORS[0]);
  const [priority,     setPriority]     = useState('medium');
  const [frequency,    setFrequency]    = useState('daily');
  const [customDays,   setCustomDays]   = useState([]);
  const [timesPerWeek, setTimesPerWeek] = useState(3);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState('');
  const [showEmoji,    setShowEmoji]    = useState(false);

  useEffect(() => {
    if (habit) {
      setName(habit.name || '');
      // resolveIcon converts old Lucide names ("Moon", "Leaf") → emojis (🌙, 🌿)
      setIcon(resolveIcon(habit.icon));
      setColor(habit.color || HABIT_COLORS[0]);
      setPriority(habit.priority || 'medium');

      const freq = habit.frequency || {};
      if (freq.type === 'weekly') {
        setFrequency('weekly'); setTimesPerWeek(freq.timesPerWeek || 3);
      } else if (freq.type === 'specific_days') {
        const days = [...(freq.days || [])].sort().join(',');
        if (days === '1,2,3,4,5') setFrequency('weekdays');
        else if (days === '0,6' || days === '6,0') setFrequency('weekends');
        else {
          setFrequency('custom');
          setCustomDays(Object.entries(DAY_TO_NUM).filter(([, n]) => (freq.days || []).includes(n)).map(([k]) => k));
        }
      } else {
        setFrequency('daily');
      }
    }
  }, [habit]);

  function buildFreqPayload() {
    switch (frequency) {
      case 'weekdays': return { type: 'specific_days', days: [1,2,3,4,5] };
      case 'weekends': return { type: 'specific_days', days: [0,6] };
      case 'custom':   return { type: 'specific_days', days: customDays.length ? customDays.map(d => DAY_TO_NUM[d]) : [1] };
      case 'weekly':   return { type: 'weekly', timesPerWeek };
      default:         return { type: 'daily' };
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter a habit name.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const payload = { name: name.trim(), icon, color, priority, frequency: buildFreqPayload() };
      if (isEditing) await updateHabit(habit.id, payload);
      else           await addHabit(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save. Is the server running on port 3001?');
    } finally {
      setSubmitting(false);
    }
  }

  const toggleDay = d => setCustomDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const inputStyle = {
    borderColor: 'var(--border)',
    background: 'var(--bg-raised)',
    color: 'var(--text)',
    borderRadius: '0.75rem',
    padding: '0.625rem 1rem',
    width: '100%',
    fontSize: '0.875rem',
    outline: 'none',
    border: '1px solid var(--border)',
    transition: 'border-color 0.15s',
  };

  const Row = ({ label, children }) => (
    <div>
      <label className="block text-xs font-semibold mb-1.5 tracking-wide uppercase"
        style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div className="w-full max-w-md rounded-2xl shadow-2xl animate-slide-up overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold text-sm" style={{ color: 'var(--text)' }}>
            {isEditing ? '✎ Edit Habit' : '+ Add New Habit'}
          </h2>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xl hover:opacity-60 transition-opacity"
            style={{ color: 'var(--text-muted)' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 64px)' }}>

          {/* Name + emoji */}
          <Row label="Habit Name">
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowEmoji(s => !s)}
                title="Pick an icon"
                className="w-12 h-11 rounded-xl flex items-center justify-center text-2xl transition-all hover:scale-110 flex-shrink-0"
                style={{
                  border: `2px solid ${showEmoji ? '#10B981' : 'var(--border)'}`,
                  background: 'var(--bg-raised)',
                }}>
                {icon}
              </button>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Morning Run, Read 30 min…"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#10B981'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            {showEmoji && (
              <div className="mt-2 p-3 rounded-xl border grid grid-cols-10 gap-1.5 max-h-36 overflow-y-auto"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
                {EMOJI_OPTIONS.map(e => (
                  <button key={e} type="button"
                    onClick={() => { setIcon(e); setShowEmoji(false); }}
                    className="w-7 h-7 text-lg rounded-lg flex items-center justify-center transition-transform hover:scale-125"
                    style={{ outline: icon === e ? '2px solid #10B981' : 'none', background: icon === e ? 'var(--accent-glow)' : 'transparent' }}>
                    {e}
                  </button>
                ))}
              </div>
            )}
          </Row>

          {/* Priority */}
          <Row label="Priority">
            <div className="grid grid-cols-3 gap-2">
              {PRIORITY_OPTIONS.map(p => (
                <button key={p.value} type="button"
                  onClick={() => setPriority(p.value)}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all"
                  style={{
                    borderColor: priority === p.value ? p.color : 'var(--border)',
                    background:  priority === p.value ? p.bg     : 'var(--bg-raised)',
                    color:       priority === p.value ? p.color  : 'var(--text-soft)',
                    transform:   priority === p.value ? 'scale(1.03)' : 'scale(1)',
                  }}>
                  <span>{p.label}</span>
                  <span className="text-[9px] font-normal opacity-70">{p.desc}</span>
                </button>
              ))}
            </div>
          </Row>

          {/* Color */}
          <Row label="Color">
            <div className="flex gap-2 flex-wrap">
              {HABIT_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full transition-all"
                  style={{
                    background: c,
                    border: `3px solid ${color === c ? 'var(--text)' : 'transparent'}`,
                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                    boxShadow: color === c ? `0 0 0 2px ${c}50` : 'none',
                  }} />
              ))}
            </div>
          </Row>

          {/* Frequency */}
          <Row label="How often?">
            <select value={frequency} onChange={e => setFrequency(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}
              onFocus={e => e.target.style.borderColor = '#10B981'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}>
              {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Row>

          {/* Custom days */}
          {frequency === 'custom' && (
            <Row label="Which days?">
              <div className="flex gap-1.5 flex-wrap">
                {DAYS_OF_WEEK.map(d => (
                  <button key={d} type="button" onClick={() => toggleDay(d)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all"
                    style={{
                      background:  customDays.includes(d) ? '#10B981' : 'var(--bg-raised)',
                      color:       customDays.includes(d) ? '#fff'     : 'var(--text-soft)',
                      borderColor: customDays.includes(d) ? '#10B981' : 'var(--border)',
                    }}>
                    {d}
                  </button>
                ))}
              </div>
            </Row>
          )}

          {/* Times per week */}
          {frequency === 'weekly' && (
            <Row label={`Times per week: ${timesPerWeek}×`}>
              <input type="range" min={1} max={7} value={timesPerWeek}
                onChange={e => setTimesPerWeek(+e.target.value)}
                className="w-full cursor-pointer accent-emerald-500" />
              <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                <span>1×/wk</span><span>7×/wk</span>
              </div>
            </Row>
          )}

          {error && (
            <div className="text-xs text-red-500 px-4 py-2.5 rounded-xl border"
              style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
              ⚠ {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1 pb-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:opacity-80"
              style={{ borderColor: 'var(--border)', color: 'var(--text-soft)', background: 'var(--bg-raised)' }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #059669, #10B981)', boxShadow: '0 2px 8px rgba(16,185,129,0.35)' }}>
              {submitting ? 'Saving…' : isEditing ? 'Save Changes' : '+ Add Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
