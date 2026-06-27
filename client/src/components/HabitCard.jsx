import { motion } from 'framer-motion';
import { Check, Minus, X, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils.js';

const statusConfig = {
  completed: {
    icon: Check,
    bg: 'bg-emerald-500',
    ring: 'ring-emerald-500/20',
    label: 'Completed',
  },
  partial: {
    icon: Minus,
    bg: 'bg-amber-500',
    ring: 'ring-amber-500/20',
    label: 'Partial',
  },
  missed: {
    icon: X,
    bg: 'bg-red-400',
    ring: 'ring-red-400/20',
    label: 'Missed',
  },
};

const statusCycle = [null, 'completed', 'partial', 'missed'];

export default function HabitCard({
  habit,
  status,
  onToggle,
  onEdit,
  onDelete,
}) {
  const [showActions, setShowActions] = useState(false);

  const currentIndex = statusCycle.indexOf(status);
  const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
  const config = status ? statusConfig[status] : null;
  const StatusIcon = config?.icon;

  const handleToggle = () => {
    onToggle(nextStatus);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="glass-card p-3.5 sm:p-4 flex items-center gap-3 group"
    >
      {/* Color accent */}
      <div
        className="w-1 h-10 rounded-full flex-shrink-0 transition-all duration-300"
        style={{ backgroundColor: habit.color || '#10B981' }}
      />

      {/* Habit info */}
      <div className="flex-1 min-w-0">
        <h3
          className={cn(
            'text-sm font-medium truncate transition-all duration-200',
            status === 'completed'
              ? 'text-[var(--text-tertiary)] line-through'
              : 'text-[var(--text-primary)]'
          )}
        >
          {habit.icon && <span className="mr-1.5">{habit.icon}</span>}
          {habit.name}
        </h3>
        {status && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px] font-medium mt-0.5"
            style={{ color: config?.bg?.replace('bg-', '') }}
          >
            <span
              className={cn(
                'inline-block w-1.5 h-1.5 rounded-full mr-1',
                config?.bg
              )}
            />
            {config?.label}
          </motion.p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        {/* More button */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowActions(!showActions)}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] opacity-0 group-hover:opacity-100 transition-all"
          >
            <MoreHorizontal className="w-4 h-4" />
          </motion.button>

          {showActions && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowActions(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute right-0 top-full mt-1 z-20 glass-elevated py-1 min-w-[120px]"
              >
                <button
                  onClick={() => {
                    setShowActions(false);
                    onEdit?.();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setShowActions(false);
                    onDelete?.();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </motion.div>
            </>
          )}
        </div>

        {/* Toggle button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.85 }}
          onClick={handleToggle}
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
            status
              ? `${config.bg} text-white ring-4 ${config.ring}`
              : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] hover:bg-emerald-50 hover:text-emerald-500 dark:hover:bg-emerald-900/20 border border-[var(--glass-border)]'
          )}
        >
          {status ? (
            <motion.div
              key={status}
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <StatusIcon className="w-5 h-5" strokeWidth={3} />
            </motion.div>
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-dashed border-current" />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
