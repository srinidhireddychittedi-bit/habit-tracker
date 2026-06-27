import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Trophy, TrendingUp, CheckCircle2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useHabits } from '../contexts/HabitContext.jsx';
import { getToday, daysAgo, getDaysInRange, cn } from '../lib/utils.js';
import GlassCard from './ui/GlassCard.jsx';
import HeatmapChart from './HeatmapChart.jsx';
import { StatsCardSkeleton, ChartSkeleton } from './ui/LoadingSkeleton.jsx';
import EmptyState from './ui/EmptyState.jsx';

const TIME_PERIODS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

function CircularProgress({ percentage, size = 80, strokeWidth = 6 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-tertiary)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progress-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        />
        <defs>
          <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-heading font-bold text-[var(--text-primary)]">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
}

export default function StatsPanel() {
  const { habits, getLog, streakInfo, habitStats, loading } = useHabits();
  const [period, setPeriod] = useState(TIME_PERIODS[1]);

  const stats = useMemo(() => {
    if (!habits.length) return null;

    const dateRange = getDaysInRange(daysAgo(period.days - 1), getToday());
    let totalPossible = 0;
    let totalCompleted = 0;
    let totalPartial = 0;

    habits.forEach((habit) => {
      dateRange.forEach((date) => {
        totalPossible++;
        const log = getLog(habit.id, date);
        if (log?.status === 'completed') totalCompleted++;
        if (log?.status === 'partial') totalPartial++;
      });
    });

    const completionRate = totalPossible > 0
      ? Math.round(((totalCompleted + totalPartial * 0.5) / totalPossible) * 100)
      : 0;

    // Per-habit stats
    const perHabit = habits.map((habit) => {
      let completed = 0;
      let total = dateRange.length;
      dateRange.forEach((date) => {
        const log = getLog(habit.id, date);
        if (log?.status === 'completed') completed++;
      });
      return {
        ...habit,
        completed,
        total,
        rate: Math.round((completed / total) * 100),
      };
    });

    return {
      completionRate,
      totalCompleted,
      totalPartial,
      totalPossible,
      perHabit: perHabit.sort((a, b) => b.rate - a.rate),
    };
  }, [habits, getLog, period]);

  // Daily bar chart data — completions per day
  const chartData = useMemo(() => {
    const dateRange = getDaysInRange(daysAgo(period.days - 1), getToday());
    // For readability, sample evenly if > 30 days
    const step = period.days > 30 ? 3 : 1;
    return dateRange
      .filter((_, i) => i % step === 0)
      .map((date) => {
        const completed = habits.filter((h) => getLog(h.id, date)?.status === 'completed').length;
        const partial = habits.filter((h) => getLog(h.id, date)?.status === 'partial').length;
        const label = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
          month: 'short', day: 'numeric',
        });
        return { date, label, completed, partial };
      });
  }, [habits, getLog, period]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 pb-28 space-y-4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  if (!habits.length) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 pb-28">
        <EmptyState
          icon={TrendingUp}
          title="No stats yet"
          description="Start tracking habits to see your analytics and streaks here."
        />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-28 space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-between mb-2"
      >
        <h1 className="text-xl font-heading font-bold text-[var(--text-primary)]">
          Statistics
        </h1>

        {/* Period selector */}
        <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-secondary)]">
          {TIME_PERIODS.map((p) => (
            <button
              key={p.label}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                period.label === p.label
                  ? 'bg-gradient-zen text-white shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Streak + Completion Cards */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="!p-4 text-center">
          <Flame className="w-6 h-6 text-orange-500 mx-auto mb-1" />
          <p className="text-2xl font-heading font-bold text-[var(--text-primary)] font-mono">
            {streakInfo?.currentStreak || 0}
          </p>
          <p className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mt-0.5">
            Current Streak
          </p>
        </GlassCard>

        <GlassCard className="!p-4 text-center">
          <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-1" />
          <p className="text-2xl font-heading font-bold text-[var(--text-primary)] font-mono">
            {streakInfo?.bestStreak || 0}
          </p>
          <p className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mt-0.5">
            Best Streak
          </p>
        </GlassCard>
      </div>

      {/* Completion Rate Ring + Total */}
      <GlassCard className="!p-5 flex items-center gap-6">
        <CircularProgress percentage={stats?.completionRate || 0} />
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">Completion Rate</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Last {period.days} days
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-mono font-medium text-[var(--text-primary)]">
              {stats?.totalCompleted || 0}
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">completions</span>
          </div>
        </div>
      </GlassCard>

      {/* Bar Chart — daily completions */}
      <GlassCard className="!p-5">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Daily Completions</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 0, right: 4, left: -28, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              tickLine={false}
              axisLine={false}
              interval={period.days <= 7 ? 0 : Math.floor(chartData.length / 6)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={[0, habits.length || 1]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--text-primary)',
              }}
              cursor={{ fill: 'var(--bg-tertiary)' }}
              formatter={(val, name) => [val, name === 'completed' ? '✅ Completed' : '⚡ Partial']}
            />
            <Bar dataKey="completed" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} maxBarSize={20} />
            <Bar dataKey="partial" stackId="a" fill="#34D399" radius={[3, 3, 0, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* Heatmap */}
      <GlassCard className="!p-5">
        <HeatmapChart habits={habits} getLog={getLog} days={period.days} />
      </GlassCard>

      {/* Per-habit breakdown */}
      <GlassCard className="!p-5">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
          Per-Habit Performance
        </h3>
        <div className="space-y-3">
          {stats?.perHabit?.map((habit, idx) => (
            <motion.div
              key={habit.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-3"
            >
              <div
                className="w-2 h-8 rounded-full flex-shrink-0"
                style={{ backgroundColor: habit.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {habit.name}
                  </p>
                  <span className="text-xs font-mono text-[var(--text-tertiary)] ml-2">
                    {habit.rate}%
                  </span>
                </div>
                <div className="h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: habit.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${habit.rate}%` }}
                    transition={{ duration: 0.6, delay: idx * 0.05 + 0.2 }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
