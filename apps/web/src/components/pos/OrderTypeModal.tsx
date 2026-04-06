'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface Props {
  table: any;
  onConfirm: (type: string, guestCount?: number) => void;
  onClose: () => void;
}

const ORDER_TYPES = [
  { id: 'DINE_IN', label: 'Dine In', icon: 'Table', desc: 'Seated table service' },
  { id: 'TAKEOUT', label: 'Takeout', icon: 'To Go', desc: 'Pick up at counter' },
  { id: 'DELIVERY', label: 'Delivery', icon: 'Ship', desc: 'Deliver to address' },
  { id: 'BAR', label: 'Bar Tab', icon: 'Bar', desc: 'Bar seat or open tab' },
];

export function OrderTypeModal({ table, onConfirm, onClose }: Props) {
  const [type, setType] = useState(table ? 'DINE_IN' : 'TAKEOUT');
  const [guestCount, setGuestCount] = useState(table?.capacity ? Math.min(2, table.capacity) : 1);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm md:items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-2xl overflow-hidden"
      >
        <div className="ops-toolbar flex items-start justify-between gap-3 px-5 py-5">
          <div>
            <p className="section-kicker">New order</p>
            <h2 className="mt-1 text-2xl font-black text-slate-100">Choose service type</h2>
            {table && (
              <p className="mt-1 text-sm text-slate-400">
                Table {table.name} · {table.capacity} seats
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {ORDER_TYPES.map((orderType) => (
              <button
                key={orderType.id}
                type="button"
                onClick={() => setType(orderType.id)}
                className={clsx(
                  'touch-target rounded-[24px] border p-4 text-left transition-all',
                  type === orderType.id
                    ? 'border-cyan-300/30 bg-cyan-300 text-slate-950'
                    : 'border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]',
                )}
              >
                <span className={clsx('inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]', type === orderType.id ? 'bg-slate-950/10' : 'bg-white/8 text-slate-400')}>
                  {orderType.icon}
                </span>
                <p className="mt-3 text-lg font-black">{orderType.label}</p>
                <p className={clsx('mt-1 text-sm', type === orderType.id ? 'text-slate-950/70' : 'text-slate-400')}>
                  {orderType.desc}
                </p>
              </button>
            ))}
          </div>

          {type === 'DINE_IN' && (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <label className="label">Number of Guests</label>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setGuestCount(value)}
                    className={clsx(
                      'touch-target rounded-2xl text-base font-black transition-all',
                      guestCount === value
                        ? 'bg-cyan-300 text-slate-950'
                        : 'border border-white/10 bg-white/[0.03] text-slate-200',
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => onConfirm(type, guestCount)}
            className="touch-target flex w-full items-center justify-center rounded-2xl bg-emerald-400 py-4 text-lg font-black text-slate-950 transition hover:bg-emerald-300"
          >
            Start Order
          </button>
        </div>
      </motion.div>
    </div>
  );
}
