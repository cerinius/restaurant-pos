'use client';

import clsx from 'clsx';
import { useState, type ComponentType, type SVGProps } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  BellIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  TableCellsIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import type { POSView } from '@/components/pos/type';
import { NotificationDrawer } from '@/components/ui/NotificationDrawer';
import { WSStatusBanner } from '@/components/ui/WSStatusBanner';
import { posWS } from '@/hooks/useWebSocket';
import api from '@/lib/api';
import { getRestaurantAdminPath, getRestaurantLoginPath, getRestaurantTeamPath } from '@/lib/paths';
import { useAuthStore, useNotificationStore } from '@/store';

interface Props {
  view: POSView;
  onViewChange: (view: POSView) => void;
  onNewOrder: () => void;
  hasActiveOrder: boolean;
  isOffline: boolean;
}

const NAV_ITEMS: Array<{
  id: POSView;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}> = [
  { id: 'tables', label: 'Tables', Icon: TableCellsIcon },
  { id: 'menu', label: 'Menu', Icon: Squares2X2Icon },
  { id: 'open-orders', label: 'Orders', Icon: ClipboardDocumentListIcon },
];

const ADMIN_ROLES = ['OWNER', 'MANAGER'];

function canAccessAdmin(role?: string) {
  return ADMIN_ROLES.includes(String(role || '').toUpperCase());
}

export function POSHeader({
  view,
  onViewChange,
  onNewOrder,
  hasActiveOrder,
  isOffline,
}: Props) {
  const { user, clearAuth } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const router = useRouter();
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const canOpenAdmin = canAccessAdmin(user?.role);
  const now = new Date();
  const timeLabel = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const closeMobileActions = () => setShowMobileActions(false);

  const handleLogout = async () => {
    closeMobileActions();

    try {
      await api.logout();
    } catch {
      // Ignore API failures and continue local logout.
    }

    try {
      posWS.disconnect();
    } catch {
      // Ignore websocket teardown failures.
    }

    clearAuth();
    toast.success('Logged out');
    router.replace(getRestaurantLoginPath(user?.restaurantId || 'restaurant'));
  };

  const goToAdmin = () => {
    closeMobileActions();
    if (!user?.restaurantId) return;
    router.push(getRestaurantAdminPath(user.restaurantId));
  };

  const goToTeam = () => {
    closeMobileActions();
    if (!user?.restaurantId) return;
    router.push(getRestaurantTeamPath(user.restaurantId));
  };

  const handleNewOrder = () => {
    closeMobileActions();
    onNewOrder();
  };

  return (
    <>
      <WSStatusBanner bar />

      <header className="relative z-20 shrink-0 border-b border-white/10 bg-slate-950/72 backdrop-blur-xl">
        <div className="flex min-h-[78px] items-center gap-3 px-4 py-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300 text-sm font-black text-slate-950 shadow-[0_16px_34px_rgba(34,211,238,0.18)]">
            POS
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-black text-slate-100">RestaurantOS</p>
              {isOffline && (
                <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                  Offline
                </span>
              )}
            </div>
            <p className="truncate text-sm text-slate-400">
              {user?.name || 'Staff'} · {user?.role || 'Team'} · {timeLabel}
            </p>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <nav className="flex items-center gap-1 rounded-[20px] border border-white/10 bg-white/5 p-1.5">
              {NAV_ITEMS.map(({ id, label, Icon }) => {
                const active = view === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onViewChange(id)}
                    className={clsx(
                      'touch-target inline-flex items-center gap-2 rounded-2xl px-4 text-sm font-semibold transition',
                      active
                        ? 'bg-cyan-300 text-slate-950'
                        : 'text-slate-200 hover:bg-white/8 hover:text-white',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={onNewOrder}
              disabled={hasActiveOrder}
              className={clsx(
                'touch-target inline-flex items-center gap-2 rounded-2xl px-4 text-sm font-bold transition',
                hasActiveOrder
                  ? 'cursor-not-allowed bg-white/5 text-slate-500'
                  : 'bg-emerald-400 text-slate-950 hover:bg-emerald-300',
              )}
            >
              <PlusIcon className="h-4 w-4" />
              New Order
            </button>

            {canOpenAdmin && (
              <button
                type="button"
                onClick={goToAdmin}
                className="touch-target inline-flex items-center gap-2 rounded-2xl bg-white/5 px-4 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                <ShieldCheckIcon className="h-4 w-4" />
                Admin
              </button>
            )}

            <button
              type="button"
              onClick={goToTeam}
              className="touch-target inline-flex items-center gap-2 rounded-2xl bg-white/5 px-4 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              <CalendarDaysIcon className="h-4 w-4" />
              My Shift
            </button>

            <button
              type="button"
              onClick={() => setNotifOpen(true)}
              className="touch-target relative inline-flex items-center justify-center rounded-2xl bg-white/5 px-3 text-slate-200 transition hover:bg-white/10"
              aria-label="Notifications"
            >
              <BellIcon className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-black text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <div className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 lg:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-300 text-sm font-bold text-slate-950">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-100">{user?.name || 'User'}</p>
                <p className="truncate text-xs text-slate-400">{user?.role || 'Staff'}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="touch-target inline-flex items-center justify-center rounded-2xl bg-white/5 px-3 text-slate-200 transition hover:bg-red-500/15 hover:text-white"
              aria-label="Log out"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowMobileActions(true)}
            className="touch-target relative inline-flex items-center justify-center rounded-2xl bg-white/5 px-3 text-slate-100 transition hover:bg-white/10 md:hidden"
            aria-label="Open POS actions"
          >
            <Bars3Icon className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {showMobileActions && (
        <div className="fixed inset-0 z-30 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeMobileActions}
            aria-label="Close POS actions"
          />

          <div className="absolute inset-x-4 top-20 rounded-[28px] border border-white/10 bg-slate-950/95 p-4 shadow-2xl">
            <div className="flex items-start gap-3 border-b border-white/10 pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300 text-base font-bold text-slate-950">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-100">
                  {user?.name || 'User'}
                </p>
                <p className="truncate text-xs text-slate-400">{user?.role || 'Staff'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-200">
                    {timeLabel}
                  </span>
                  {isOffline && (
                    <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-amber-100">
                      Offline mode
                    </span>
                  )}
                  {unreadCount > 0 && (
                    <span className="rounded-full border border-red-300/20 bg-red-400/10 px-2 py-1 text-red-100">
                      {unreadCount} unread alerts
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={closeMobileActions}
                className="touch-target inline-flex items-center justify-center rounded-2xl bg-white/5 px-3 text-slate-200"
                aria-label="Close menu"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleNewOrder}
                disabled={hasActiveOrder}
                className={clsx(
                  'touch-target flex min-h-[56px] items-center gap-3 rounded-2xl border px-4 text-left text-sm font-semibold transition',
                  hasActiveOrder
                    ? 'cursor-not-allowed border-white/10 bg-white/5 text-slate-500'
                    : 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100',
                )}
              >
                <PlusIcon className="h-5 w-5 shrink-0" />
                New Order
              </button>

              {canOpenAdmin ? (
                <button
                  type="button"
                  onClick={goToAdmin}
                  className="touch-target flex min-h-[56px] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 text-left text-sm font-semibold text-slate-100 transition"
                >
                  <ShieldCheckIcon className="h-5 w-5 shrink-0" />
                  Admin
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    closeMobileActions();
                    onViewChange('tables');
                  }}
                  className="touch-target flex min-h-[56px] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 text-left text-sm font-semibold text-slate-200 transition"
                >
                  <TableCellsIcon className="h-5 w-5 shrink-0" />
                  Floor Plan
                </button>
              )}

              <button
                type="button"
                onClick={goToTeam}
                className="touch-target flex min-h-[56px] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 text-left text-sm font-semibold text-slate-100 transition"
              >
                <CalendarDaysIcon className="h-5 w-5 shrink-0" />
                My Shift
              </button>

              <button
                type="button"
                onClick={() => {
                  closeMobileActions();
                  onViewChange('open-orders');
                }}
                className="touch-target flex min-h-[56px] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 text-left text-sm font-semibold text-slate-100 transition"
              >
                <ClipboardDocumentListIcon className="h-5 w-5 shrink-0" />
                Open Orders
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="touch-target flex min-h-[56px] items-center gap-3 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 text-left text-sm font-semibold text-red-100 transition"
              >
                <ArrowLeftOnRectangleIcon className="h-5 w-5 shrink-0" />
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-slate-950/88 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-2 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-3 gap-2">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const active = view === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => onViewChange(id)}
                className={clsx(
                  'touch-target flex min-h-[60px] flex-col items-center justify-center rounded-2xl px-2 text-[11px] font-semibold transition',
                  active
                    ? 'bg-cyan-300 text-slate-950'
                    : 'bg-white/5 text-slate-400 hover:bg-white/8 hover:text-slate-100',
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}
