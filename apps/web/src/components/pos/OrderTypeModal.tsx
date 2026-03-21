
// ============================================================
// apps/web/src/components/pos/OrderTypeModal.tsx
// ============================================================
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
  { id: 'DINE_IN',  label: 'Dine In',  icon: 'ð½ï¸', desc: 'Seated table service' },
  { id: 'TAKEOUT',  label: 'Takeout',  icon: 'ð¥¡', desc: 'Pick up at counter' },
  { id: 'DELIVERY', label: 'Delivery', icon: 'ðµ', desc: 'Deliver to address' },
  { id: 'BAR',      label: 'Bar Tab',  icon: 'ðº', desc: 'Bar seat / tab' },
];

export function OrderTypeModal({ table, onConfirm, onClose }: Props) {
  const [type, setType] = useState(table ? 'DINE_IN' : 'TAKEOUT');
  const [guestCount, setGuestCount] = useState(table?.capacity ? Math.min(2, table.capacity) : 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-sm p-6 space-y-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-100 text-lg">Start Order</h2>
            {table && <p className="text-sm text-slate-400">Table {table.name} Â· {table.capacity} seats</p>}
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Order Type */}
        <div className="grid grid-cols-2 gap-2">
          {ORDER_TYPES.map((ot) => (
            <button
              key={ot.id}
              onClick={() => setType(ot.id)}
              className={clsx(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border font-medium transition-all',
                type === ot.id
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-blue-500'
              )}
            >
              <span className="text-2xl">{ot.icon}</span>
              <span className="text-sm font-semibold">{ot.label}</span>
              <span className={clsx('text-xs', type === ot.id ? 'text-blue-200' : 'text-slate-500')}>
                {ot.desc}
              </span>
            </button>
          ))}
        </div>

        {/* Guest Count */}
        {type === 'DINE_IN' && (
          <div>
            <label className="label">Number of Guests</label>
            <div className="flex items-center gap-2">
              {[1,2,3,4,5,6,7,8].map((n) => (
                <button
                  key={n}
                  onClick={() => setGuestCount(n)}
                  className={clsx(
                    'w-9 h-9 rounded-xl font-bold text-sm transition-all',
                    guestCount === n
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => onConfirm(type, guestCount)}
          className="btn-primary w-full h-12 text-base"
        >
          Start Order
        </button>
      </motion.div>
    </div>
  );
}
