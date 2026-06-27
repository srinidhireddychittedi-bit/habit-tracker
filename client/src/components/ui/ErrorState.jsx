import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function ErrorState({
  message = 'Something went wrong',
  details = '',
  onRetry,
  className = '',
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}
    >
      <motion.div
        initial={{ rotate: -10 }}
        animate={{ rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4"
      >
        <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
      </motion.div>

      <h3 className="text-lg font-semibold font-heading text-[var(--text-primary)] mb-2">
        {message}
      </h3>

      <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-xs">
        Don&apos;t worry — this is usually temporary. Try refreshing.
      </p>

      {onRetry && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-zen text-white font-medium text-sm shadow-md hover:shadow-lg transition-shadow"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </motion.button>
      )}

      {details && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="mt-4 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] underline transition-colors"
        >
          {showDetails ? 'Hide details' : 'Show details'}
        </button>
      )}

      {showDetails && details && (
        <motion.pre
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-left text-[var(--text-secondary)] font-mono max-w-full overflow-x-auto"
        >
          {details}
        </motion.pre>
      )}
    </motion.div>
  );
}
