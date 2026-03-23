'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useAuthStore } from '@/store';

export default function RootAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, restaurantId } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (pathname === '/admin' || pathname === '/admin/login') {
      return;
    }

    const tenantId = restaurantId || user?.restaurantId;
    if (tenantId) {
      router.replace(`/${tenantId}${pathname}`);
      return;
    }

    router.replace('/login');
  }, [hydrated, pathname, restaurantId, router, user?.restaurantId]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading admin route...
      </div>
    );
  }

  if (pathname !== '/admin' && pathname !== '/admin/login') {
    return null;
  }

  return <>{children}</>;
}
