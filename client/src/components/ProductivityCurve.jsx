import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line,
} from 'recharts';
import { useHabits } from '../contexts/HabitContext.jsx';
import { getToday, daysAgo } from '../lib/utils.js';

// Priority weights — High matters 3× more than Low
const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 };

function getWeight(habit) {
  return PRIORITY_WEIGHT[habit.priority || 'medium'] ?? 2;
}

// Weighted score: completed = full weight, partial = half weight
// Score = earned / possible × 100
function weightedScore(habits, getLog, date, filterFn = () => true) {
  const filtered = habits.filter(filterFn);
  if (filtered.length === 0) return null;

  let earned   = 0;
  let possible = 0;

  filtered.forEach(h => {
    const w = getWeight(h);
    const s = getLog(h.id, date)?.status;
    possible += w;
    if      (s === 'completed') earned += w;
    else if (s === 'partial')   earned += w * 0.5;
    // missed / unmarked → 0
  });

  return possible > 0 ? Math.round((earned / possible) * 100) : 0;
}

function buildData(habits, getLog) {
  return Array.from({ length: 60 }, (_, i) => {
    const date  = daysAgo(59 - i);
    const d     = new Date(date + 'T00:00:00');
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const overall = weightedScore(habits, getLog, date) ?? 0;
    const high    = weightedScore(habits, getLog, date, h => h.priority === 'high');
    const medium  = weightedScore(habits, getLog, date, h => h.priority === 'medium');
    const low     = weightedScore(habits, getLog, date, h => h.priority === 'low');

    const completed = habits.filter(h => getLog(h.id, date)?.status === 'completed').length;
    const partial   = habits.filter(h => getLog(h.id, date)?.status === 'partial').length;
    const missed    = habits.filter(h => getLog(h.id, date)?.status === 'missed').length;

    return { date, label, overall, high, medium, low, completed, partial, missed, total: habits.length };
  });
}


const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="card px-3.5 py-3 text-xs shadow-xl" style={{ minWidth: 170, border: '1px solid var(--border)' }}>
      <div className="font-bold mb-2.5" style={{ color: 'var(--text)', fontSize: 11 }}>{d.label}</div>

      {/* Weighted overall score */}
      <div className="flex items-center justify-between mb-2">
        <span style={{ color: 'var(--text-muted)' }}>Weighted score</span>
        <span className="font-bold text-emerald-500 text-sm">{d.overall}%</span>
      </div>

      {/* Per-priority breakdown */}
      {d.high   !== null && <div className="flex items-center justify-between mb-1"><span style={{ color: '#EF4444' }}>🔴 High (3×)</span><span className="font-semibold" style={{ color: '#EF4444' }}>{d.high}%</span></div>}
      {d.medium !== null && <div className="flex items-center justify-between mb-1"><span style={{ color: '#F59E0B' }}>🟡 Medium (2×)</span><span className="font-semibold" style={{ color: '#F59E0B' }}>{d.medium}%</span></div>}
      {d.low    !== null && <div className="flex items-center justify-between mb-1"><span style={{ color: '#10B981' }}>🟢 Low (1×)</span><span className="font-semibold" style={{ color: '#10B981' }}>{d.low}%</span></div>}

      {d.total > 0 && (
        <div className="mt-2 pt-1.5 border-t text-[10px] flex gap-3" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          <span>✓ {d.completed}</span>
          <span>~ {d.partial}</span>
          <span>✕ {d.missed}</span>
        </div>
      )}
    </div>
  );
};


export default function ProductivityCurve() {
  const { habits, getLog, loading } = useHabits();
  const data = useMemo(() => buildData(habits, getLog), [habits, getLog]);

  const todayPct  = data[data.length - 1]?.overall ?? 0;
  const filledDays = data.filter(d => d.total > 0 && d.overall > 0);
  const avgPct    = filledDays.length > 0
    ? Math.round(filledDays.reduce((s, d) => s + d.overall, 0) / filledDays.length) : 0;
  const bestDay   = data.reduce((b, d) => d.overall > b.overall ? d : b, { overall: 0, label: '—' });

  const hasHigh   = habits.some(h => h.priority === 'high');
  const hasMedium = habits.some(h => h.priority === 'medium');
  const hasLow    = habits.some(h => h.priority === 'low');
  const showPriority = hasHigh || hasMedium || hasLow;

  const isEmpty = habits.length === 0;

  return (
    <section className="animate-fade-in">
      {/* Section header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>📈 Productivity Curve</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Daily score — partial = 50% · split by priority
          </p>
        </div>

        {/* Stat pills */}
        {!isEmpty && (
          <div className="flex gap-2 flex-shrink-0">
            <div className="px-3 py-1.5 rounded-xl text-center"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div className="text-base font-bold font-mono text-emerald-500">{todayPct}%</div>
              <div className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>Today</div>
            </div>
            {avgPct > 0 && (
              <div className="px-3 py-1.5 rounded-xl text-center"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                <div className="text-base font-bold font-mono" style={{ color: 'var(--text-soft)' }}>{avgPct}%</div>
                <div className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>60d avg</div>
              </div>
            )}
            {bestDay.overall > 0 && (
              <div className="px-3 py-1.5 rounded-xl text-center hidden sm:block"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div className="text-base font-bold font-mono text-amber-500">{bestDay.overall}%</div>
                <div className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>Best</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main chart */}
      <div className="card p-4 pt-5 mb-3">
        {loading && isEmpty ? (
          <div className="h-44 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Loading…
          </div>
        ) : isEmpty ? (
          <div className="h-44 flex flex-col items-center justify-center gap-2">
            <span className="text-4xl">📊</span>
            <p className="text-sm font-medium" style={{ color: 'var(--text-soft)' }}>Add habits to see your curve</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="overallGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickLine={false} axisLine={false} interval={9}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickLine={false} axisLine={false}
                tickFormatter={v => `${v}%`}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone" dataKey="overall"
                stroke="#10B981" strokeWidth={2.5}
                fill="url(#overallGrad)" dot={false}
                activeDot={{ r: 5, fill: '#10B981', stroke: 'var(--bg-card)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Priority breakdown — only when habits have actual priorities */}
      {showPriority && !isEmpty && (
        <div className="card p-4 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-bold" style={{ color: 'var(--text)' }}>Priority Breakdown</h3>
            <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              score by priority level
            </span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={9} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} ticks={[0, 50, 100]} />
              <Tooltip content={<CustomTooltip />} />
              {hasHigh   && <Line type="monotone" dataKey="high"   stroke="#EF4444" strokeWidth={2} dot={false} activeDot={{ r: 3 }} connectNulls />}
              {hasMedium && <Line type="monotone" dataKey="medium" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 3 }} connectNulls />}
              {hasLow    && <Line type="monotone" dataKey="low"    stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 3 }} connectNulls />}
            </LineChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {hasHigh   && <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-0.5 rounded bg-red-500"/>High</span>}
            {hasMedium && <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-0.5 rounded bg-amber-400"/>Medium</span>}
            {hasLow    && <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-0.5 rounded bg-emerald-500"/>Low</span>}
          </div>
        </div>
      )}

      {/* Score key */}
      <div className="flex flex-wrap gap-4 mt-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block"/>🔴 High = 3× weight</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block"/>🟡 Medium = 2× weight</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"/>🟢 Low = 1× weight</span>
        <span className="flex items-center gap-1.5 opacity-60">· partial = 50%</span>
      </div>

    </section>
  );
}
