'use client';

import { useEffect } from 'react';

const DEFAULT_INTERVAL_MS = 60 * 1000;
const DEFAULT_TIMEOUT_MS = 8 * 1000;

function parseInterval(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function ApiKeepAlive() {
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    const keepAliveEnabled = process.env.NEXT_PUBLIC_API_KEEPALIVE_ENABLED !== 'false';

    if (!apiUrl || !keepAliveEnabled || typeof window === 'undefined') {
      return;
    }

    const intervalMs = parseInterval(
      process.env.NEXT_PUBLIC_API_KEEPALIVE_INTERVAL_MS,
      DEFAULT_INTERVAL_MS
    );
    const healthUrl = `${apiUrl.replace(/\/$/, '')}/health`;

    let currentController: AbortController | null = null;

    const ping = async () => {
      if (!navigator.onLine || document.visibilityState !== 'visible') {
        return;
      }

      currentController?.abort();
      const controller = new AbortController();
      currentController = controller;
      const timeoutId = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

      try {
        await fetch(`${healthUrl}?ts=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });
      } catch (error) {
        if (process.env.NODE_ENV !== 'production' && !controller.signal.aborted) {
          console.warn('API keepalive ping failed', error);
        }
      } finally {
        window.clearTimeout(timeoutId);

        if (currentController === controller) {
          currentController = null;
        }
      }
    };

    const intervalId = window.setInterval(() => {
      void ping();
    }, intervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void ping();
      }
    };

    const handleFocus = () => {
      void ping();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    void ping();

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      currentController?.abort();
    };
  }, []);

  return null;
}
