import { cn } from '../../lib/utils.js';

function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={cn(
        'rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700',
        'bg-[length:200%_100%] animate-shimmer',
        className
      )}
      {...props}
    />
  );
}

export function HabitCardSkeleton() {
  return (
    <div className="glass-card p-4 flex items-center gap-4">
      <Skeleton className="w-1 h-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="w-10 h-10 rounded-full" />
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="glass-card p-5 space-y-3">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="glass-card p-5 space-y-4">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-end gap-1 h-40">
        {Array.from({ length: 30 }, (_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-sm"
            style={{ height: `${20 + Math.random() * 80}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="glass-card p-6 flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass-card p-5 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
