import { motion } from 'framer-motion';
import { LayoutGrid, BarChart3, Timer, Settings } from 'lucide-react';
import { cn } from '../lib/utils.js';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'timer', label: 'Timer', icon: Timer },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Navigation({ activeTab, onTabChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="glass border-t border-[var(--glass-border)]">
        <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                whileTap={{ scale: 0.9 }}
                className={cn(
                  'relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors duration-200',
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <motion.div
                  className="relative z-10"
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                </motion.div>
                <span className="relative z-10 text-[10px] font-medium">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
