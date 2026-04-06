'use client';

import clsx from 'clsx';
import { motion } from 'framer-motion';

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'bg-green-500/10 border-green-500/80 text-green-300',
  OCCUPIED: 'bg-blue-500/10 border-blue-500/80 text-blue-300',
  RESERVED: 'bg-purple-500/10 border-purple-500/80 text-purple-300',
  DIRTY: 'bg-yellow-500/10 border-yellow-500/80 text-yellow-300',
  BLOCKED: 'bg-slate-700/50 border-slate-600/80 text-slate-400',
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Available',
  OCCUPIED:  'Occupied',
  RESERVED:  'Reserved',
  DIRTY:     'Needs Cleaning',
  BLOCKED:   'Blocked',
};

function formatCurrency(amount?: number) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

interface TableCardProps {
  table: any;
  isSelected?: boolean;
  onSelect: (table: any) => void;
}

export function TableCard({ table, isSelected = false, onSelect }: TableCardProps) {
  const status: string = table.status || 'AVAILABLE';
  const styleClass = STATUS_STYLES[status] || STATUS_STYLES.AVAILABLE;
  const label     = STATUS_LABELS[status] || status;

  const billAmount = table.currentOrder?.total;

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(table)}
      className={clsx(
        'relative flex w-full flex-col items-start rounded-2xl border-2 p-4 text-left transition-all touch-manipulation',
        styleClass,
        isSelected && 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-900',
      )}
    >
      <div className="flex items-start justify-between w-full">
        <p className="text-xl font-bold leading-tight">{table.name || table.tableNumber}</p>
        <p className={clsx('text-sm font-semibold', styleClass)}>{label}</p>
      </div>

      <p className="mt-1 text-sm text-current/70">
        {table.capacity} seats
      </p>

      {billAmount !== undefined && billAmount > 0 && (
        <div className="mt-auto pt-4 text-xl font-bold tabular-nums">
          {formatCurrency(billAmount)}
        </div>
      )}
    </motion.button>
  );
}

