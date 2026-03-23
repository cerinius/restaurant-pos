'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';

type WarmupState = 'warming' | 'ready' | 'degraded';

export function LandingWarmupStatus() {
  const [state, setState] = useState<WarmupState>('warming');

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (!apiUrl) {
      setState('degraded');
      return;
    }

    const urls = [
      `${apiUrl.replace(/\/$/, '')}/health?landing=${Date.now()}`,
      `${apiUrl.replace(/\/$/, '')}/api/restaurants/slug/demo-restaurant`,
    ];

    let cancelled = false;

    const warm = async () => {
      const [health] = await Promise.allSettled([
        fetch(urls[0], {
          method: 'GET',
          cache: 'no-store',
        }),
        fetch(urls[1], {
          method: 'GET',
          cache: 'no-store',
        }),
      ]);

      if (cancelled) return;
      setState(health.status === 'fulfilled' && health.value.ok ? 'ready' : 'degraded');
    };

    void warm();
    return () => {
      cancelled = true;
    };
  }, []);

  const copy =
    state === 'ready'
      ? 'Live demo stack is awake'
      : state === 'degraded'
        ? 'Public site is up, API is waking'
        : 'Waking the live API for your session';

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-3 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]',
        state === 'ready'
          ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
          : state === 'degraded'
            ? 'border-amber-400/40 bg-amber-500/10 text-amber-100'
            : 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100'
      )}
    >
      <span
        className={clsx(
          'h-2.5 w-2.5 rounded-full',
          state === 'ready'
            ? 'bg-emerald-400'
            : state === 'degraded'
              ? 'bg-amber-300'
              : 'animate-pulse bg-cyan-300'
        )}
      />
      {copy}
    </div>
  );
}
