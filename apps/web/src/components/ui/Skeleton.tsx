import clsx from 'clsx';

interface SkeletonProps { className?: string; }

export function SkeletonText({ className }: SkeletonProps) {
  return <div className={clsx('h-4 animate-pulse rounded-xl bg-white/8', className)} />;
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={clsx('rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3', className)}>
      <div className="h-6 w-2/3 animate-pulse rounded-xl bg-white/10" />
      <div className="h-4 w-1/2 animate-pulse rounded-xl bg-white/8" />
      <div className="h-4 w-3/4 animate-pulse rounded-xl bg-white/6" />
    </div>
  );
}

export function SkeletonRow({ className }: SkeletonProps) {
  return (
    <div className={clsx('flex items-center gap-3 py-3', className)}>
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-2xl bg-white/10" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/2 animate-pulse rounded-xl bg-white/8" />
        <div className="h-3 w-1/3 animate-pulse rounded-xl bg-white/6" />
      </div>
    </div>
  );
}

export function SkeletonAvatar({ className }: SkeletonProps) {
  return <div className={clsx('h-10 w-10 animate-pulse rounded-full bg-white/10', className)} />;
}

export function SkeletonKPI({ className }: SkeletonProps) {
  return (
    <div className={clsx('metric-tile border border-white/10 space-y-3', className)}>
      <div className="h-3 w-1/2 animate-pulse rounded-xl bg-white/8" />
      <div className="h-10 w-2/3 animate-pulse rounded-xl bg-white/10" />
      <div className="h-3 w-1/3 animate-pulse rounded-xl bg-white/6" />
    </div>
  );
}

