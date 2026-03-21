'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import KDSContent from './KDSContent'; // Or whatever your main KDS component is named

export default function KDSShell() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30000, // KDS usually needs fresher data
        refetchInterval: 10000, // Auto-refresh every 10s
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <KDSContent />
    </QueryClientProvider>
  );
}