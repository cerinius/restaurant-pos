'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  Bars3Icon,
  BoltIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  CubeIcon,
  EnvelopeIcon,
  FireIcon,
  GiftIcon,
  HeartIcon,
  HomeIcon,
  PhoneIcon,
  SparklesIcon,
  Squares2X2Icon,
  TableCellsIcon,
  TagIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { WSStatusBanner } from '@/components/ui/WSStatusBanner';
import { posWS } from '@/hooks/useWebSocket';
import api from '@/lib/api';
import { OPERATIONS_INTELLIGENCE_ENABLED } from '@/lib/features';
import {
  getRestaurantAdminPath,
  getRestaurantLoginPath,
  getRestaurantPOSPath,
  getRestaurantPublicPath,
} from '@/lib/paths';
import { useAuthStore } from '@/store';

function canAccessAdmin(role?: string) {
  return ['OWNER', 'MANAGER'].includes(String(role || '').toUpperCase());
}

function isActivePath(pathname: string, href: string) {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const normalizedHref = href.replace(/\/+$/, '') || '/';

  if (normalizedPath === normalizedHref) return true;
  if (normalizedHref.endsWith('/admin')) return false;

  return normalizedPath.startsWith(`${normalizedHref}/`);
}

function getCurrentSection(pathname: string, restaurantId: string) {
  const adminRoot = getRestaurantAdminPath(restaurantId);
  const suffix = pathname.startsWith(adminRoot)
    ? pathname.slice(adminRoot.length).replace(/^\/+/, '')
    : '';

  return suffix.split('/')[0] || 'dashboard';
}

function Sidebar({
  pathname,
  restaurantId,
  user,
  onNavigate,
  onLogout,
  onPrefetch,
  collapsed = false,
  onToggleCollapse,
}: {
  pathname: string;
  restaurantId: string;
  user: any;
  onNavigate: () => void;
  onLogout: () => void;
  onPrefetch: (href: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const currentSection = getCurrentSection(pathname, restaurantId);
  const navSections: Array<{
    label: string;
    items: Array<{ href: string; label: string; Icon: any; badge?: string }>;
  }> = [
    {
      label: 'Overview',
      items: [
        { href: getRestaurantAdminPath(restaurantId), label: 'Dashboard', Icon: HomeIcon },
        { href: getRestaurantAdminPath(restaurantId, 'control-center'), label: 'Control Center', Icon: ChartBarIcon },
      ],
    },
    {
      label: 'Guest Experience',
      items: [
        { href: getRestaurantAdminPath(restaurantId, 'reservations'), label: 'Reservations', Icon: CalendarDaysIcon, badge: 'Live' },
        { href: getRestaurantAdminPath(restaurantId, 'guests'), label: 'Guest Profiles', Icon: HeartIcon },
        { href: getRestaurantAdminPath(restaurantId, 'marketing'), label: 'Marketing', Icon: EnvelopeIcon },
        { href: getRestaurantAdminPath(restaurantId, 'support'), label: 'Support Center', Icon: PhoneIcon },
        { href: getRestaurantAdminPath(restaurantId, 'orders'), label: 'Orders', Icon: ClipboardDocumentListIcon },
        { href: getRestaurantAdminPath(restaurantId, 'floor'), label: 'Floor Plan', Icon: TableCellsIcon },
      ],
    },
    {
      label: 'Menu',
      items: [
        { href: getRestaurantAdminPath(restaurantId, 'menu'), label: 'Menu Items', Icon: Squares2X2Icon },
        { href: getRestaurantAdminPath(restaurantId, 'modifiers'), label: 'Modifiers', Icon: BoltIcon },
        { href: getRestaurantAdminPath(restaurantId, 'combos'), label: 'Combos', Icon: SparklesIcon },
        { href: getRestaurantAdminPath(restaurantId, 'happy-hours'), label: 'Happy Hours', Icon: FireIcon },
        { href: getRestaurantAdminPath(restaurantId, 'pricing'), label: 'Pricing', Icon: TagIcon },
      ],
    },
    {
      label: 'Finance',
      items: [
        { href: getRestaurantAdminPath(restaurantId, 'discounts'), label: 'Discounts', Icon: TagIcon },
        { href: getRestaurantAdminPath(restaurantId, 'taxes'), label: 'Taxes', Icon: BuildingStorefrontIcon },
        { href: getRestaurantAdminPath(restaurantId, 'gift-cards'), label: 'Gift Cards', Icon: GiftIcon },
      ],
    },
    {
      label: 'People',
      items: [
        { href: getRestaurantAdminPath(restaurantId, 'staff'), label: 'Staff', Icon: UserGroupIcon },
        { href: getRestaurantAdminPath(restaurantId, 'workforce'), label: 'Workforce', Icon: CalendarDaysIcon },
        { href: getRestaurantAdminPath(restaurantId, 'people-ops'), label: 'People Ops', Icon: ClipboardDocumentListIcon },
        { href: getRestaurantAdminPath(restaurantId, 'payroll'), label: 'Payroll & Tips', Icon: ChartBarIcon },
        { href: getRestaurantAdminPath(restaurantId, 'hiring'), label: 'Hiring', Icon: UserGroupIcon },
        { href: getRestaurantAdminPath(restaurantId, 'reports'), label: 'Reports', Icon: ChartBarIcon },
        { href: getRestaurantAdminPath(restaurantId, 'audit'), label: 'Audit Log', Icon: ClipboardDocumentListIcon },
      ],
    },
    {
      label: 'System',
      items: [
        { href: getRestaurantAdminPath(restaurantId, 'stations'), label: 'KDS Stations', Icon: FireIcon },
        { href: getRestaurantAdminPath(restaurantId, 'inventory'), label: 'Inventory', Icon: CubeIcon },
        { href: getRestaurantAdminPath(restaurantId, 'integrations'), label: 'Integrations', Icon: BoltIcon },
        { href: getRestaurantAdminPath(restaurantId, 'workflows'), label: 'Workflows', Icon: BoltIcon },
        { href: getRestaurantAdminPath(restaurantId, 'settings'), label: 'Settings', Icon: Cog6ToothIcon },
      ],
    },
  ];

  if (OPERATIONS_INTELLIGENCE_ENABLED) {
    navSections[0].items.push({
      href: getRestaurantAdminPath(restaurantId, 'intelligence'),
      label: 'Operations Intelligence',
      Icon: SparklesIcon,
      badge: 'Internal',
    });
  }

  return (
    <aside
      className={clsx(
        'flex h-full flex-col border-r border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.98),rgba(8,15,30,0.96))] transition-all duration-200',
        collapsed ? 'w-[72px]' : 'w-[296px]',
      )}
    >
      <div className="shrink-0 border-b border-white/10 px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-300 text-sm font-black text-slate-950 shadow-[0_18px_40px_rgba(34,211,238,0.18)]">
            RO
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black uppercase tracking-[0.16em] text-white">Admin</p>
              <p className="mt-0.5 truncate text-xs text-slate-400">Restaurant operating system</p>
            </div>
          )}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="touch-target ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
            </button>
          )}
        </div>

        {!collapsed && (
          <div className="mt-3 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Current area</p>
                <p className="mt-1 text-base font-bold text-white">
                  {currentSection === 'dashboard'
                    ? 'Dashboard'
                    : currentSection.replace(/-/g, ' ').replace(/\b\w/g, (value) => value.toUpperCase())}
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300">
                Live
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href={getRestaurantPublicPath(restaurantId)}
                onClick={onNavigate}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Public site
              </Link>
              <Link
                href={getRestaurantLoginPath(restaurantId)}
                onClick={onNavigate}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Staff login
              </Link>
            </div>
          </div>
        )}
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto px-2 py-4">
        {navSections.map((section) => (
          <div key={section.label} className="mb-4">
            {!collapsed && (
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map(({ href, label, Icon, badge }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  onMouseEnter={() => onPrefetch(href)}
                  onFocus={() => onPrefetch(href)}
                  title={collapsed ? label : undefined}
                  className={clsx(
                    'touch-target flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all',
                    collapsed && 'justify-center',
                    isActivePath(pathname, href)
                      ? 'bg-cyan-300 text-slate-950 shadow-[0_18px_38px_rgba(34,211,238,0.22)]'
                      : 'text-slate-300 hover:bg-white/6 hover:text-white',
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="flex-1">{label}</span>}
                  {!collapsed && badge && !isActivePath(pathname, href) && (
                    <span className="rounded-full bg-cyan-300/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-300">
                      {badge}
                    </span>
                  )}
                  {!collapsed && isActivePath(pathname, href) && (
                    <span className="rounded-full bg-slate-950/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em]">
                      Open
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <Link
          href={getRestaurantPOSPath(restaurantId)}
          onClick={onNavigate}
          title={collapsed ? 'Back to POS' : undefined}
          className={clsx(
            'touch-target mb-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white',
            collapsed && 'justify-center',
          )}
        >
          <ArrowLeftIcon className="h-5 w-5 shrink-0" />
          {!collapsed && 'Back to POS'}
        </Link>

        {!collapsed && (
          <div className="glass-panel flex items-center gap-3 px-3 py-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-300 text-sm font-bold text-slate-950">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-100">{user?.name || 'User'}</p>
              <p className="truncate text-xs uppercase tracking-[0.16em] text-slate-400">{user?.role || 'staff'}</p>
            </div>
            <button
              onClick={onLogout}
              className="touch-target rounded-xl px-3 text-xs font-semibold text-slate-300 transition hover:bg-red-500/10 hover:text-red-200"
            >
              Exit
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export default function RestaurantAdminLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = useMemo(() => String(params?.restaurantId || ''), [params?.restaurantId]);
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, clearAuth, locationId } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated || !restaurantId) {
      router.replace(getRestaurantLoginPath(restaurantId || 'restaurant'));
      return;
    }

    if (user?.restaurantId && user.restaurantId !== restaurantId) {
      router.replace(getRestaurantAdminPath(user.restaurantId));
      return;
    }

    if (!canAccessAdmin(user?.role)) {
      router.replace(getRestaurantPOSPath(restaurantId));
    }
  }, [hydrated, isAuthenticated, restaurantId, router, user?.restaurantId, user?.role]);

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
    router.replace(getRestaurantLoginPath(restaurantId));
  };

  const handlePrefetch = useCallback(
    (href: string) => {
      if (!restaurantId) return;

      router.prefetch(href);

      const today = new Date().toISOString().split('T')[0];
      const suffix = href.startsWith(`/${restaurantId}/admin`)
        ? href.slice(`/${restaurantId}/admin`.length).replace(/^\//, '')
        : '';

      const safePrefetch = <T,>(queryKey: any[], queryFn: () => Promise<T>) => {
        void queryClient.prefetchQuery({ queryKey, queryFn, staleTime: 30 * 1000 });
      };

      if (!suffix) {
        safePrefetch(['sales-report', today], () => api.getSalesReport({ dateFrom: today, dateTo: today }));
        safePrefetch(['open-orders-count', locationId], () => api.getOpenOrders(locationId || undefined));
        safePrefetch(['kds-stats-dash', locationId], () => api.getKDSStats(locationId || undefined));
        safePrefetch(['low-stock'], () => api.getLowStockAlerts());
        safePrefetch(['recent-audit'], () => api.getAuditLogs({ limit: '10' }));
        safePrefetch(['dashboard-tables', locationId], () => api.getTables({ locationId }));
        safePrefetch(['dashboard-reservations', today], () => api.getReservations({ date: today }));
        safePrefetch(['dashboard-staff'], () => api.getStaff());
        return;
      }

      if (suffix === 'orders') {
        safePrefetch(['admin-orders', today, today, '', '', 1], () =>
          api.getOrders({ dateFrom: today, dateTo: today, page: '1', limit: '30' })
        );
        return;
      }

      if (suffix === 'floor') {
        safePrefetch(['tables-floor', locationId], () => api.getTables({ locationId }));
        safePrefetch(['locations'], () => api.getLocations());
        safePrefetch(['staff'], () => api.getStaff());
        return;
      }

      if (suffix === 'menu') {
        safePrefetch(['categories-admin-with-items'], () => api.getCategories(true));
        safePrefetch(['modifier-groups'], () => api.getModifierGroups());
        return;
      }

      if (suffix === 'modifiers') {
        safePrefetch(['modifier-groups'], () => api.getModifierGroups());
        return;
      }

      if (suffix === 'combos') {
        safePrefetch(['combos'], () => api.getCombos());
        safePrefetch(['combo-menu-items'], () => api.getMenuItems());
        return;
      }

      if (suffix === 'happy-hours') {
        safePrefetch(['happy-hours'], () => api.getHappyHours());
        safePrefetch(['categories-admin'], () => api.getCategories());
        return;
      }

      if (suffix === 'discounts') {
        safePrefetch(['discounts'], () => api.getDiscounts());
        return;
      }

      if (suffix === 'taxes') {
        safePrefetch(['taxes'], () => api.getTaxes());
        return;
      }

      if (suffix === 'gift-cards') {
        safePrefetch(['gift-cards'], () => api.getGiftCards());
        return;
      }

      if (suffix === 'staff') {
        safePrefetch(['staff'], () => api.getStaff());
        safePrefetch(['locations'], () => api.getLocations());
        return;
      }

      if (suffix === 'workforce') {
        safePrefetch(['workforce', locationId, today], () =>
          api.getWorkforceOverview({ locationId, weekStart: today })
        );
        safePrefetch(['staff'], () => api.getStaff());
        safePrefetch(['tables-floor', locationId], () => api.getTables({ locationId }));
        return;
      }

      if (['control-center', 'people-ops', 'payroll', 'hiring', 'integrations', 'guests', 'marketing'].includes(suffix)) {
        safePrefetch(['ops-overview', locationId], () => api.getOperationsOverview({ locationId }));
        return;
      }

      if (suffix === 'reports') {
        safePrefetch(['report-sales', today, today], () => api.getSalesReport({ dateFrom: today, dateTo: today }));
        safePrefetch(['report-items', today, today], () => api.getItemMixReport({ dateFrom: today, dateTo: today }));
        safePrefetch(['report-staff', today, today], () => api.getStaffReport({ dateFrom: today, dateTo: today }));
        safePrefetch(['report-voids', today, today], () => api.getVoidsDiscountsReport({ dateFrom: today, dateTo: today }));
        return;
      }

      if (suffix === 'stations') {
        safePrefetch(['admin-stations'], () => api.getStations());
        safePrefetch(['admin-locations'], () => api.getLocations());
        safePrefetch(['station-categories'], () => api.getCategories());
        return;
      }

      if (suffix === 'inventory') {
        safePrefetch(['inventory'], () => api.getInventory());
        return;
      }

      if (suffix === 'settings' && user?.restaurantId) {
        safePrefetch(['restaurant', user.restaurantId], () => api.getRestaurant(user.restaurantId));
      }
    },
    [locationId, queryClient, restaurantId, router, user?.restaurantId]
  );

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading restaurant admin...
      </div>
    );
  }

  if (!isAuthenticated || !canAccessAdmin(user?.role)) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[linear-gradient(180deg,#07111f_0%,#0c1728_50%,#020617_100%)]">
      <div className="hidden shrink-0 xl:block">
        <Sidebar
          pathname={pathname}
          restaurantId={restaurantId}
          user={user}
          onNavigate={() => undefined}
          onLogout={handleLogout}
          onPrefetch={handlePrefetch}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
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
              restaurantId={restaurantId}
              user={user}
              onNavigate={() => setSidebarOpen(false)}
              onLogout={handleLogout}
              onPrefetch={handlePrefetch}
            />
          </div>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <WSStatusBanner bar />

        <div className="glass flex min-h-[58px] items-center gap-3 border-b border-white/10 px-3 xl:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="touch-target inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl bg-white/6 text-slate-100"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-100">Restaurant Admin</p>
            <p className="truncate text-xs text-slate-400">
              {getCurrentSection(pathname, restaurantId) === 'dashboard'
                ? 'Dashboard'
                : getCurrentSection(pathname, restaurantId).replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
            </p>
          </div>
          <Link
            href={getRestaurantPOSPath(restaurantId)}
            className="touch-target ml-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl bg-white/6 text-slate-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <button
            onClick={handleLogout}
            className="touch-target inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl bg-white/6 text-slate-100"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {children}
      </main>
    </div>
  );
}
