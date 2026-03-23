'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  Bars3Icon,
  BoltIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  CubeIcon,
  FireIcon,
  GiftIcon,
  HomeIcon,
  SparklesIcon,
  Squares2X2Icon,
  TableCellsIcon,
  TagIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { posWS } from '@/hooks/useWebSocket';
import api from '@/lib/api';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';

const NAV_SECTIONS = [
  {
    label: 'Operations',
    items: [
      { href: '/admin', label: 'Dashboard', Icon: HomeIcon },
      { href: '/admin/orders', label: 'Orders', Icon: ClipboardDocumentListIcon },
      { href: '/admin/floor', label: 'Floor Plan', Icon: TableCellsIcon },
    ],
  },
  {
    label: 'Menu',
    items: [
      { href: '/admin/menu', label: 'Menu Items', Icon: Squares2X2Icon },
      { href: '/admin/modifiers', label: 'Modifiers', Icon: BoltIcon },
      { href: '/admin/combos', label: 'Combos', Icon: SparklesIcon },
      { href: '/admin/happy-hours', label: 'Happy Hours', Icon: FireIcon },
      { href: '/admin/pricing', label: 'Pricing', Icon: TagIcon },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/admin/discounts', label: 'Discounts', Icon: TagIcon },
      { href: '/admin/taxes', label: 'Taxes', Icon: BuildingStorefrontIcon },
      { href: '/admin/gift-cards', label: 'Gift Cards', Icon: GiftIcon },
    ],
  },
  {
    label: 'Staff & Reports',
    items: [
      { href: '/admin/staff', label: 'Staff', Icon: UserGroupIcon },
      { href: '/admin/reports', label: 'Reports', Icon: ChartBarIcon },
      { href: '/admin/audit', label: 'Audit Log', Icon: ClipboardDocumentListIcon },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/stations', label: 'KDS Stations', Icon: FireIcon },
      { href: '/admin/inventory', label: 'Inventory', Icon: CubeIcon },
      { href: '/admin/workflows', label: 'Workflows', Icon: BoltIcon },
      { href: '/admin/settings', label: 'Settings', Icon: Cog6ToothIcon },
    ],
  },
];

function canAccessAdmin(role?: string) {
  return ['OWNER', 'MANAGER'].includes(role || '');
}

function isActivePath(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Sidebar({
  pathname,
  user,
  onNavigate,
  onLogout,
}: {
  pathname: string;
  user: any;
  onNavigate: () => void;
  onLogout: () => void;
}) {
  return (
    <aside className="flex h-full w-72 flex-col bg-slate-900">
      <div className="flex h-16 items-center gap-3 border-b border-slate-700 px-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-sm font-semibold text-white">
          POS
        </div>
        <div>
          <p className="text-sm font-bold text-slate-100 leading-none">RestaurantOS</p>
          <p className="mt-1 text-xs text-slate-500 leading-none">Admin Console</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 no-scrollbar">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={clsx(
                    'touch-target flex items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-all',
                    isActivePath(pathname, href)
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-700 p-3">
        <Link
          href="/pos"
          onClick={onNavigate}
          className="touch-target mb-2 flex items-center gap-3 rounded-2xl px-3 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Back to POS
        </Link>

        <div className="flex items-center gap-3 rounded-2xl bg-slate-800/80 px-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-200">{user?.name || 'User'}</p>
            <p className="truncate text-xs text-slate-500">{user?.role || 'staff'}</p>
          </div>
          <button
            onClick={onLogout}
            className="touch-target rounded-xl px-3 text-xs font-semibold text-slate-400 transition hover:bg-red-600/10 hover:text-red-400"
          >
            Exit
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!canAccessAdmin(user?.role)) {
      router.replace('/pos');
    }
  }, [hydrated, isAuthenticated, router, user?.role]);

  const handleLogout = async () => {
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
    router.replace('/login');
  };

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading admin...
      </div>
    );
  }

  if (!isAuthenticated || !canAccessAdmin(user?.role)) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <div className="hidden shrink-0 border-r border-slate-700 xl:block">
        <Sidebar
          pathname={pathname}
          user={user}
          onNavigate={() => undefined}
          onLogout={handleLogout}
        />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <button
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          />
          <div className="relative h-full max-w-[85vw] border-r border-slate-700 shadow-2xl">
            <Sidebar
              pathname={pathname}
              user={user}
              onNavigate={() => setSidebarOpen(false)}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-16 items-center gap-3 border-b border-slate-800 bg-slate-950/90 px-4 backdrop-blur xl:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="touch-target inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl bg-slate-800 text-slate-200"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-100">Admin Console</p>
            <p className="truncate text-xs text-slate-500">{user?.name || 'User'}</p>
          </div>
          <Link
            href="/pos"
            className="touch-target ml-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl bg-slate-800 text-slate-200"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <button
            onClick={handleLogout}
            className="touch-target inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl bg-slate-800 text-slate-200"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {children}
      </main>
    </div>
  );
}
