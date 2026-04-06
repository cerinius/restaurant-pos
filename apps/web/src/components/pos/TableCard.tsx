'use client';

import clsx from 'clsx';
import { motion } from 'framer-motion';

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'table-available',
  OCCUPIED:  'table-occupied',
  RESERVED:  'table-reserved',
  DIRTY:     'table-dirty',
  BLOCKED:   'table-blocked',
};

const STATUS_DOT: Record<string, string> = {
  AVAILABLE: 'bg-emerald-400',
  OCCUPIED:  'bg-sky-400',
  RESERVED:  'bg-fuchsia-400',
  DIRTY:     'bg-amber-400',
  BLOCKED:   'bg-slate-500',
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Available',
  OCCUPIED:  'Occupied',
  RESERVED:  'Reserved',
  DIRTY:     'Needs Cleaning',
  BLOCKED:   'Blocked',
};

function formatCurrency(amount?: number) {
  return `$${Number(amount || 0).toFixed(0)}`;
}

function formatElapsed(ms: number) {
  if (!ms) return '';
  const m = Math.floor(ms / 60000);
  if (m < 1) return '<1m';
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

interface TableCardProps {
  table: any;
  isSelected?: boolean;
  onSelect: (table: any) => void;
  compact?: boolean;
}

export function TableCard({ table, isSelected = false, onSelect, compact = false }: TableCardProps) {
  const status: string = table.status || 'AVAILABLE';
  const styleClass = STATUS_STYLES[status] || STATUS_STYLES.AVAILABLE;
  const dotClass  = STATUS_DOT[status]   || STATUS_DOT.AVAILABLE;
  const label     = STATUS_LABELS[status] || status;

  const elapsed = table.currentOrder?.openedAt
    ? formatElapsed(Date.now() - new Date(table.currentOrder.openedAt).getTime())
    : null;

  const billAmount = table.currentOrder?.total;

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(table)}
      className={clsx(
        'relative flex w-full flex-col items-start rounded-3xl border p-4 text-left transition-all touch-manipulation',
        'min-h-[88px]',
        styleClass,
        isSelected && 'ring-2 ring-cyan-300 ring-offset-2 ring-offset-slate-950',
      )}
    >
      {/* Status dot */}
      <span className={clsx('absolute right-3 top-3 h-2.5 w-2.5 rounded-full', dotClass, status === 'OCCUPIED' && 'animate-pulse-slow')} />

      {/* Table name */}
      <p className="text-base font-black leading-tight">{table.name || table.tableNumber}</p>

      {/* Seats */}
      <p className={clsx('mt-0.5 text-[11px] font-medium', compact ? 'text-current/60' : 'text-current/70')}>
        {table.capacity} seats · {label}
      </p>

      {/* Live data row */}
      {(elapsed || billAmount) && (
        <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold tabular-nums">
          {elapsed && <span className="opacity-70">{elapsed}</span>}
          {billAmount !== undefined && billAmount > 0 && (
            <span className="rounded-full bg-black/20 px-1.5 py-0.5">
              {formatCurrency(billAmount)}
            </span>
          )}
        </div>
      )}
    </motion.button>
  );
}

