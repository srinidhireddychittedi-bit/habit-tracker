import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Flame, Target, Leaf } from 'lucide-react';
import { useHabits } from '../contexts/HabitContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getToday, getGreeting, cn } from '../lib/utils.js';
import HabitCard from './HabitCard.jsx';
import HabitModal from './HabitModal.jsx';
import { HabitCardSkeleton } from './ui/LoadingSkeleton.jsx';
import EmptyState from './ui/EmptyState.jsx';
import ErrorState from './ui/ErrorState.jsx';
import GlassCard from './ui/GlassCard.jsx';

export default function HabitMatrix() {
  const { habits, loading, error, toggleCompletion, getLog, addHabit, updateHabit, deleteHabit, streakInfo, refetch } = useHabits();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);

  const today = getToday();
  const greeting = getGreeting();

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Calculate today's progress
  const todayProgress = useMemo(() => {
    if (!habits.length) return { completed: 0, total: 0, percentage: 0 };
    const total = habits.length;
    const completed = habits.filter((h) => {
      const log = getLog(h.id, today);
      return log?.status === 'completed';
    }).length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  }, [habits, getLog, today]);

  const handleToggle = (habitId, status) => {
    toggleCompletion(habitId, today, status);
  };

  const handleSave = async (data) => {
    if (editingHabit) {
      await updateHabit(editingHabit.id, data);
    } else {
      await addHabit(data);
    }
  };

  const handleEdit = (habit) => {
    setEditingHabit(habit);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Remove this habit? This cannot be undone.')) {
      await deleteHabit(id);
    }
  };

  const openNewModal = () => {
    setEditingHabit(null);
    setModalOpen(true);
  };

  if (error) {
    return <ErrorState message="Couldn't load your habits" details={error} onRetry={refetch} />;
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-28">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-heading font-bold text-gradient-zen tracking-tight">
              AURA
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {greeting}, {user?.name?.split(' ')[0] || 'friend'} 🍃
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              Today
            </p>
            <p className="text-sm font-medium text-[var(--text-secondary)]">{todayFormatted}</p>
          </div>
        </div>
      </motion.div>

      {/* Progress bar */}
      {habits.length > 0 && (
        <GlassCard className="mb-5 !p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Today&apos;s Progress
              </span>
            </div>
            <span className="text-sm font-mono font-medium text-emerald-600 dark:text-emerald-400">
              {todayProgress.completed}/{todayProgress.total}
            </span>
          </div>
          <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-zen rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${todayProgress.percentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
        </GlassCard>
      )}

      {/* Streak cards */}
      {(streakInfo?.currentStreak > 0 || streakInfo?.bestStreak > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          {streakInfo?.currentStreak > 0 && (
            <GlassCard className="!p-3.5 text-center">
              <p className="text-lg mb-0.5">🔥</p>
              <p className="text-xl font-heading font-bold text-[var(--text-primary)] font-mono">
                {streakInfo.currentStreak}
              </p>
              <p className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Current Streak
              </p>
            </GlassCard>
          )}
          {streakInfo?.bestStreak > 0 && (
            <GlassCard className="!p-3.5 text-center">
              <p className="text-lg mb-0.5">🏆</p>
              <p className="text-xl font-heading font-bold text-[var(--text-primary)] font-mono">
                {streakInfo.bestStreak}
              </p>
              <p className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                Best Streak
              </p>
            </GlassCard>
          )}
        </div>
      )}

      {/* Habits list */}
      <div className="space-y-2.5">
        {loading ? (
          Array.from({ length: 4 }, (_, i) => <HabitCardSkeleton key={i} />)
        ) : habits.length === 0 ? (
          <EmptyState
            icon={Leaf}
            title="Your habit garden is empty"
            description="Plant your first habit and start growing into your best self."
            actionLabel="Add your first habit"
            onAction={openNewModal}
          />
        ) : (
          <AnimatePresence mode="popLayout">
            {habits.map((habit) => {
              const log = getLog(habit.id, today);
              return (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  status={log?.status || null}
                  onToggle={(status) => handleToggle(habit.id, status)}
                  onEdit={() => handleEdit(habit)}
                  onDelete={() => handleDelete(habit.id)}
                />
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* FAB */}
      {habits.length > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={openNewModal}
          className="fixed right-5 bottom-24 w-14 h-14 rounded-2xl bg-gradient-zen text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center z-40"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      {/* Modal */}
      <HabitModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingHabit(null);
        }}
        onSave={handleSave}
        habit={editingHabit}
      />
    </div>
  );
}
