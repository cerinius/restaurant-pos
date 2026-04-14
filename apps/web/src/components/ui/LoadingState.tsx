import clsx from 'clsx';

export function LoadingNotice({
  title = 'Loading workspace',
  description = 'If the API was asleep, we are waking it up now.',
  compact = false,
}: {
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={clsx(
        'glass-panel flex items-center gap-4 border-amber-300/20 bg-amber-400/10 text-amber-50',
        compact ? 'px-4 py-3' : 'px-5 py-4'
      )}
    >
      <div className="relative h-10 w-10 shrink-0">
        <div className="absolute inset-0 rounded-full border-2 border-cyan-200/30" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-amber-200 border-r-amber-300/60" />
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-amber-100/80">{description}</p>
      </div>
    </div>
  );
}

export function SkeletonBlock({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded-2xl bg-[linear-gradient(90deg,rgba(15,23,42,0.92),rgba(30,41,59,0.9),rgba(15,23,42,0.92))]',
        className
      )}
    />
  );
}
