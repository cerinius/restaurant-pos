'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { BoltIcon } from '@heroicons/react/24/outline';

function getTicketTone(ticket: any, liveElapsed: number): string {
  if (ticket.priority === 'rush') return 'kds-ticket-rush';
  if (liveElapsed >= 900) return 'kds-ticket-danger';
  if (liveElapsed >= 600) return 'kds-ticket-warning';
  return 'kds-ticket-normal';
}

function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface TicketCardProps {
  ticket: any;
  onBump: (id: string) => void;
  onRush: (id: string) => void;
  onRecall: (id: string) => void;
  isBumping?: boolean;
  isRushing?: boolean;
  isRecalling?: boolean;
}

export function TicketCard({ ticket, onBump, onRush, onRecall, isBumping, isRushing, isRecalling }: TicketCardProps) {
  // Compute initial elapsed from server value then tick every second
  const [liveElapsed, setLiveElapsed] = useState<number>(ticket.elapsedSeconds ?? 0);

  useEffect(() => {
    setLiveElapsed(ticket.elapsedSeconds ?? 0);
    const interval = setInterval(() => {
      setLiveElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [ticket.id, ticket.elapsedSeconds]);

  const tone = getTicketTone(ticket, liveElapsed);
  const isUrgent = tone === 'kds-ticket-danger' || tone === 'kds-ticket-rush';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.2 } }}
      className={clsx(
        'kds-ticket p-5',
        tone,
        isUrgent && 'animate-pulse-slow',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            {ticket.station?.name || 'Station'}
          </p>
          <h3 className="mt-1 text-xl font-black text-white">
            {ticket.order?.tableName
              ? `Table ${ticket.order.tableName}`
              : ticket.order?.type || 'Order'}
          </h3>
          <p className="mt-1 text-sm text-slate-300">
            {ticket.order?.serverName || 'Server'} · {ticket.order?.guestCount ?? 0} guests
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-500">Elapsed</p>
          <p className={clsx(
            'mt-1 font-mono text-2xl font-bold tabular-nums',
            liveElapsed >= 900 ? 'text-red-300 animate-tick' : liveElapsed >= 600 ? 'text-amber-300' : 'text-white',
          )}>
            {formatElapsed(liveElapsed)}
          </p>
          {ticket.priority === 'rush' && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-400/15 px-2 py-1 text-xs font-bold text-red-200">
              <BoltIcon className="h-3 w-3" />
              Rush
            </span>
          )}
        </div>
      </div>

      {/* Item list */}
      <div className="mt-4 space-y-2">
        {(ticket.items || []).map((item: any, idx: number) => (
          <div key={item.id || idx} className="rounded-2xl bg-black/20 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-100">
                  {item.quantity || 1} × {item.menuItemName || item.name || 'Item'}
                </p>
                {Array.isArray(item.modifiers) && item.modifiers.length > 0 && (
                  <p className="mt-1 text-sm text-slate-400">{item.modifiers.join(', ')}</p>
                )}
                {item.notes && (
                  <p className="mt-1 text-sm font-medium text-amber-200">↳ {item.notes}</p>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-slate-950/70 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-400">
                {item.status || 'PENDING'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          onClick={() => onRush(ticket.id)}
          disabled={isRushing || ticket.priority === 'rush'}
          className="touch-target rounded-2xl border border-red-300/20 bg-red-400/10 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-400/20 disabled:opacity-50"
        >
          Rush
        </button>
        <button
          onClick={() => onRecall(ticket.id)}
          disabled={isRecalling}
          className="touch-target rounded-2xl border border-cyan-300/20 bg-cyan-400/10 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:opacity-50"
        >
          Recall
        </button>
        <button
          onClick={() => onBump(ticket.id)}
          disabled={isBumping}
          className="touch-target rounded-2xl border border-emerald-300/20 bg-emerald-400/10 py-3 text-sm font-bold text-emerald-100 transition hover:bg-emerald-400/25 disabled:opacity-50"
        >
          {isBumping ? '…' : 'Bump ✓'}
        </button>
      </div>
    </motion.div>
  );
}

