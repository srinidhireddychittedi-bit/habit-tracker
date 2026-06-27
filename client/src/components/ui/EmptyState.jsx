import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Leaf,
  title = 'Nothing here yet',
  description = 'Get started by adding your first item.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
    >
      {/* Decorative rings */}
      <div className="relative mb-6">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 w-20 h-20 rounded-full bg-emerald-200 dark:bg-emerald-800/30 -m-2"
        />
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-zen-subtle flex items-center justify-center">
          <Icon className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
        </div>
      </div>

      <h3 className="text-lg font-semibold font-heading text-[var(--text-primary)] mb-2">
        {title}
      </h3>

      <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-xs leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          className="px-6 py-2.5 rounded-xl bg-gradient-zen text-white font-medium text-sm shadow-md hover:shadow-lg transition-all"
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
}
