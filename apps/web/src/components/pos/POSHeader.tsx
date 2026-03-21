'use client';

import { useAuthStore, useNotificationStore } from '@/store';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { POSView } from '@/components/pos/type';
import {
  TableCellsIcon,
  Squares2X2Icon,
  ClipboardDocumentListIcon,
  ArrowLeftOnRectangleIcon,
  Cog6ToothIcon,
  BellIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { posWS } from '@/hooks/useWebSocket';

interface Props {
  view: POSView;
  onViewChange: (v: POSView) => void;
  onNewOrder: () => void;
  hasActiveOrder: boolean;
}

const NAV: Array<{ id: POSView; label: string; Icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = [
  { id: 'tables', label: 'Tables', Icon: TableCellsIcon },
  { id: 'menu', label: 'Menu', Icon: Squares2X2Icon },
  { id: 'open-orders', label: 'Open Orders', Icon: ClipboardDocumentListIcon },
];

const ADMIN_ROLES = ['OWNER', 'MANAGER'];

export function POSHeader({ view, onViewChange, onNewOrder, hasActiveOrder }: Props) {
  const { user, clearAuth } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const router = useRouter();

  const canAccessAdmin =
    !!user?.role && ADMIN_ROLES.includes(String(user.role).toUpperCase());

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore logout API failure and continue local logout
    }

    posWS.disconnect();
    clearAuth();
    router.push('/login');
    toast.success('Logged out');
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-700 flex items-center px-4 gap-4 shrink-0 z-10">
      <div className="flex items-center gap-2 w-44 shrink-0">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm">
          🍽️
        </div>
        <span className="font-bold text-sm text-slate-200 truncate">RestaurantOS</span>
      </div>

      <nav className="flex items-center gap-1">
        {NAV.map(({ id, label, Icon }) => {
          const active = view === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onViewChange(id)}
              className={`flex items-center gap-2 px-3 h-9 rounded-lg text-sm transition ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {canAccessAdmin && (
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition"
            title="Admin Panel"
          >
            <ShieldCheckIcon className="w-4 h-4" />
            <span>Admin</span>
          </button>
        )}

        <button
          type="button"
          onClick={onNewOrder}
          disabled={hasActiveOrder}
          className={`px-3 h-9 rounded-lg text-sm font-medium transition ${
            hasActiveOrder
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          New Order
        </button>

        <button
          type="button"
          onClick={() => router.push('/notifications')}
          className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition"
        >
          <BellIcon className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => router.push('/settings')}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition"
        >
          <Cog6ToothIcon className="w-5 h-5" />
        </button>

        <div className="hidden md:flex flex-col items-end px-2">
          <span className="text-xs text-slate-300 leading-none">{timeStr}</span>
          <span className="text-[11px] text-slate-500 leading-none mt-1">{dateStr}</span>
        </div>

        <div className="hidden lg:flex items-center gap-2 px-3 h-9 rounded-lg bg-slate-800 border border-slate-700">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <div className="text-sm text-slate-200 truncate max-w-[140px]">
              {user?.name || 'User'}
            </div>
            <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
              {user?.role || 'Staff'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:bg-red-600 hover:text-white transition"
          title="Logout"
        >
          <ArrowLeftOnRectangleIcon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}