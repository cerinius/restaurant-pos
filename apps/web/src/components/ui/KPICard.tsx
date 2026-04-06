'use client';

import clsx from 'clsx';
import type { ComponentType, SVGProps } from 'react';

export type KPITone = 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple' | 'neutral';

interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  delta?: string;
  deltaPositive?: boolean;
  tone?: KPITone;
  Icon?: ComponentType<SVGProps<SVGSVGElement>>;
  className?: string;
  onClick?: () => void;
}

const TONE_CLASSES: Record<KPITone, string> = {
  cyan:    'kpi-card-cyan',
  emerald: 'kpi-card-emerald',
  amber:   'kpi-card-amber',
  rose:    'kpi-card-rose',
  purple:  'kpi-card-purple',
  neutral: 'kpi-card-neutral',
};

const VALUE_COLORS: Record<KPITone, string> = {
  cyan:    'text-cyan-100',
  emerald: 'text-emerald-100',
  amber:   'text-amber-100',
  rose:    'text-rose-100',
  purple:  'text-purple-100',
  neutral: 'text-white',
};

export function KPICard({
  label,
  value,
  sub,
  delta,
  deltaPositive,
  tone = 'neutral',
  Icon,
  className,
  onClick,
}: KPICardProps) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      className={clsx(
        'metric-tile border transition-all',
        TONE_CLASSES[tone],
        onClick && 'cursor-pointer hover:brightness-110 active:scale-[0.98]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-500" />}
      </div>
      <p className={clsx('mt-3 text-4xl font-black tabular-nums', VALUE_COLORS[tone])}>{value}</p>
      <div className="mt-2 flex items-center gap-2">
        {sub && <p className="text-sm text-slate-300">{sub}</p>}
        {delta && (
          <span
            className={clsx(
              'rounded-full px-2 py-0.5 text-[11px] font-semibold',
              deltaPositive ? 'bg-emerald-400/15 text-emerald-300' : 'bg-red-400/15 text-red-300',
            )}
          >
            {delta}
          </span>
        )}
      </div>
    </Tag>
  );
}

