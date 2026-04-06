'use client';

import clsx from 'clsx';
import { useWSStatus } from '@/hooks/useWSStatus';

const STATUS_CONFIG = {
  connected:    { label: 'Live',         dotClass: 'ws-dot-live',         barClass: 'hidden' },
  reconnecting: { label: 'Reconnecting', dotClass: 'ws-dot-reconnecting',  barClass: 'bg-amber-500/15 border-amber-400/30 text-amber-200' },
  offline:      { label: 'Offline',      dotClass: 'ws-dot-offline',       barClass: 'bg-red-500/15 border-red-400/30 text-red-200' },
};

interface WSStatusBannerProps {
  /** If true, renders as slim top bar; otherwise inline chip */
  bar?: boolean;
}

export function WSStatusBanner({ bar = false }: WSStatusBannerProps) {
  const status = useWSStatus();
  const { label, dotClass, barClass } = STATUS_CONFIG[status];

  if (status === 'connected' && bar) return null;

  if (bar) {
    return (
      <div className={clsx('flex items-center justify-center gap-2 border-b px-4 py-1.5 text-xs font-semibold', barClass)}>
        <span className={clsx('inline-block h-2 w-2 rounded-full', dotClass)} />
        {label} — real-time updates paused
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className={clsx('inline-block h-2 w-2 rounded-full', dotClass)} />
      <span className="text-[11px] font-semibold text-slate-400">{label}</span>
    </div>
  );
}

