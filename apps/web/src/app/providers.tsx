'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';

import { ApiKeepAlive } from '@/components/ApiKeepAlive';
import { syncRememberedRestaurantId } from '@/lib/remembered-restaurant';

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30 * 1000,
            gcTime: 10 * 60 * 1000,
          },
        },
      })
  );

  useEffect(() => {
    syncRememberedRestaurantId();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ApiKeepAlive />
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'border border-white/10 bg-slate-950/90 text-white shadow-[0_18px_50px_rgba(2,6,23,0.35)] backdrop-blur-xl',
        }}
      />
    </QueryClientProvider>
  );
}
