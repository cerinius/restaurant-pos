'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import POSContent from './POSContent';
import { useGlobalWSNotifications } from '@/hooks/useWebSocket';

export default function POSShell() {
  // Create a stable QueryClient instance for the client-side session
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 1000 * 60 * 60, 
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <WSNotificationHandler />
      <POSContent />
    </QueryClientProvider>
  );
}

// Separate component to use the hook inside the Provider
function WSNotificationHandler() {
  useGlobalWSNotifications();
  return null;
}