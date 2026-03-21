'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  HomeIcon,
  Squares2X2Icon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  CubeIcon,
  TagIcon,
  TableCellsIcon,
  BuildingStorefrontIcon,
  SparklesIcon,
  GiftIcon,
  BoltIcon,
  ArrowLeftIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store';
import api from '@/lib/api';
import { posWS } from '@/hooks/useWebSocket';
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

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
  }, [hydrated, isAuthenticated, user?.role, router]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {}

    try {
      posWS.disconnect();
    } catch {}

    clearAuth();
    toast.success('Logged out');
    router.replace('/login');
  };

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading admin…
      </div>
    );
  }

  if (!isAuthenticated || !canAccessAdmin(user?.role)) {
    return null;
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <aside className="w-56 bg-slate-900 border-r border-slate-700 flex flex-col shrink-0 overflow-hidden">
        <div className="h-14 flex items-center gap-2 px-4 border-b border-slate-700 shrink-0">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-sm">🍽️</div>
          <div>
            <p className="text-sm font-bold text-slate-100 leading-none">RestaurantOS</p>
            <p className="text-xs text-slate-500 leading-none mt-0.5">Admin</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 no-scrollbar">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1">
                {section.label}
              </p>
              {section.items.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    'flex items-center gap-2.5 px-2 py-2 rounded-xl text-sm font-medium transition-all',
                    isActivePath(pathname, href)
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-700 p-3 space-y-1 shrink-0">
          <Link
            href="/pos"
            className="flex items-center gap-2 px-2 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to POS
          </Link>

          <div className="flex items-center gap-2 px-2 py-1">
            <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role?.toLowerCase() || 'staff'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              Exit
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
    </div>
  );
}