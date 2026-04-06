'use client';

import clsx from 'clsx';

export type StatusVariant = 'available' | 'pending' | 'warning' | 'urgent' | 'info' | 'neutral';

interface StatusChipProps {
  variant?: StatusVariant;
  label: string;
  dot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  pulseDot?: boolean;
}

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  available: 'status-chip-available',
  pending:   'status-chip-pending',
  warning:   'status-chip-warning',
  urgent:    'status-chip-urgent',
  info:      'status-chip-info',
  neutral:   'status-chip-neutral',
};

const DOT_CLASSES: Record<StatusVariant, string> = {
  available: 'bg-emerald-400',
  pending:   'bg-amber-400',
  warning:   'bg-orange-400',
  urgent:    'bg-red-400',
  info:      'bg-cyan-400',
  neutral:   'bg-slate-400',
};

export function StatusChip({ variant = 'neutral', label, dot = false, size = 'md', className, pulseDot = false }: StatusChipProps) {
  return (
    <span className={clsx('status-chip', VARIANT_CLASSES[variant], size === 'sm' && 'px-2 py-1 text-[10px]', className)}>
      {dot && (
        <span className={clsx('inline-block h-1.5 w-1.5 rounded-full', DOT_CLASSES[variant], pulseDot && 'animate-pulse-fast')} aria-hidden />
      )}
      {label}
    </span>
  );
}

