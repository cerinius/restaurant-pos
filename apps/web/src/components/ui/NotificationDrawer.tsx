'use client';

import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { BellIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Drawer } from '@/components/ui/Drawer';
import { useNotificationStore } from '@/store';

const TYPE_CONFIG = {
  order:   { dot: 'bg-cyan-400',    label: 'Order' },
  info:    { dot: 'bg-blue-400',    label: 'Info' },
  success: { dot: 'bg-emerald-400', label: 'Done' },
  warning: { dot: 'bg-amber-400',   label: 'Alert' },
  error:   { dot: 'bg-red-400',     label: 'Error' },
};

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationDrawer({ open, onClose }: NotificationDrawerProps) {
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotificationStore();

  return (
    <Drawer open={open} onClose={onClose} title="Notifications" side="right">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
        <p className="text-sm text-slate-400">
          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        </p>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/20"
            >
              <CheckIcon className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="touch-target inline-flex items-center justify-center rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-red-500/10 hover:text-red-200"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
          <BellIcon className="h-10 w-10 opacity-30" />
          <p className="text-sm">No notifications yet</p>
        </div>
      ) : (
        <ul className="divide-y divide-white/8">
          {notifications.map((n) => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
            return (
              <li
                key={n.id}
                onClick={() => markRead(n.id)}
                className={clsx(
                  'flex cursor-pointer items-start gap-3 px-5 py-4 transition hover:bg-white/4',
                  !n.read && 'bg-white/3',
                )}
              >
                <span className={clsx('mt-1 h-2 w-2 shrink-0 rounded-full', cfg.dot)} />
                <div className="min-w-0 flex-1">
                  <p className={clsx('text-sm font-semibold', n.read ? 'text-slate-400' : 'text-white')}>
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{n.message}</p>
                  <p className="mt-1 text-[11px] text-slate-600">
                    {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                  </p>
                </div>
                {!n.read && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-400" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Drawer>
  );
}

