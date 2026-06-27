import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { getDaysInRange, daysAgo, getDayAbbr } from '../lib/utils.js';

function getColorIntensity(percentage, isDark) {
  if (percentage === 0) return isDark ? '#1E293B' : '#F1F5F9';
  if (percentage <= 25) return isDark ? '#064E3B' : '#D1FAE5';
  if (percentage <= 50) return isDark ? '#047857' : '#A7F3D0';
  if (percentage <= 75) return isDark ? '#059669' : '#6EE7B7';
  return isDark ? '#10B981' : '#10B981';
}

export default function HeatmapChart({ habits, getLog, days = 30 }) {
  const isDark = document.documentElement.classList.contains('dark');

  const data = useMemo(() => {
    const dateRange = getDaysInRange(daysAgo(days - 1), daysAgo(0));
    return dateRange.map((date) => {
      const total = habits.length;
      if (total === 0) return { date, completed: 0, total: 0, percentage: 0 };

      const completed = habits.filter((h) => {
        const log = getLog(h.id, date);
        return log?.status === 'completed';
      }).length;

      const partial = habits.filter((h) => {
        const log = getLog(h.id, date);
        return log?.status === 'partial';
      }).length;

      const score = completed + partial * 0.5;
      const percentage = Math.round((score / total) * 100);

      return { date, completed, partial, total, percentage };
    });
  }, [habits, getLog, days]);

  const maxDays = data.length;
  const rows = 7;
  const cols = Math.ceil(maxDays / rows);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">
          Completion Heatmap
        </h3>
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)]">
          <span>Less</span>
          {[0, 25, 50, 75, 100].map((pct) => (
            <div
              key={pct}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: getColorIntensity(pct, isDark) }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="flex gap-[3px]">
        {Array.from({ length: cols }, (_, colIdx) => (
          <div key={colIdx} className="flex flex-col gap-[3px]">
            {Array.from({ length: rows }, (_, rowIdx) => {
              const dayIdx = colIdx * rows + rowIdx;
              const day = data[dayIdx];
              if (!day) return <div key={rowIdx} className="w-full aspect-square" />;

              return (
                <motion.div
                  key={rowIdx}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: dayIdx * 0.01, duration: 0.2 }}
                  className="w-full aspect-square rounded-sm cursor-pointer group relative"
                  style={{ backgroundColor: getColorIntensity(day.percentage, isDark) }}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                    <div>{getDayAbbr(day.date)} — {day.date}</div>
                    <div>{day.completed}/{day.total} completed ({day.percentage}%)</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
