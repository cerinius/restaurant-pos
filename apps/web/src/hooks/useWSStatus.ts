'use client';

import { useEffect, useState } from 'react';
import { posWS } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/store';

export type WSStatus = 'connected' | 'reconnecting' | 'offline';

/**
 * Subscribes to the global POSWebSocket singleton and
 * returns a reactive status string for UI indicators.
 */
export function useWSStatus(): WSStatus {
  const { accessToken } = useAuthStore();
  const [status, setStatus] = useState<WSStatus>('offline');

  useEffect(() => {
    // Poll every second — lightweight enough and avoids patching POSWebSocket
    const interval = setInterval(() => {
      if (posWS.isConnected) {
        setStatus('connected');
      } else if (accessToken) {
        // Token is present but not connected → reconnecting
        setStatus('reconnecting');
      } else {
        setStatus('offline');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [accessToken]);

  return status;
}

