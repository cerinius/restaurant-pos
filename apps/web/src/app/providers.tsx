'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'react-hot-toast';

import { ApiKeepAlive } from '@/components/ApiKeepAlive';

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
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ApiKeepAlive />
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'bg-slate-900 text-white border border-slate-800',
        }}
      />
    </QueryClientProvider>
  );
}
