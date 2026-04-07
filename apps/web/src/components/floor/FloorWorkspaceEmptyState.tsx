import clsx from 'clsx';
import type { ReactNode } from 'react';

interface FloorWorkspaceEmptyStateProps {
  title: string;
  description: string;
  actions?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function FloorWorkspaceEmptyState({
  title,
  description,
  actions,
  compact = false,
  className,
}: FloorWorkspaceEmptyStateProps) {
  return (
    <div className={clsx('absolute inset-0 flex items-center justify-center p-4 md:p-6', className)}>
      <div
        className={clsx(
          'w-full max-w-xl rounded-[28px] border border-dashed border-slate-700/90 bg-slate-950/78 text-center shadow-[0_18px_50px_rgba(2,6,23,0.45)] backdrop-blur',
          compact ? 'px-5 py-6' : 'px-6 py-8 md:px-8 md:py-10',
        )}
      >
        <p className={clsx('font-black text-slate-100', compact ? 'text-lg' : 'text-xl md:text-2xl')}>{title}</p>
        <p className={clsx('mx-auto max-w-md text-slate-400', compact ? 'mt-2 text-sm' : 'mt-3 text-sm md:text-base')}>
          {description}
        </p>
        {actions ? <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
