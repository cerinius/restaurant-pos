'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store';
import api from '@/lib/api';

function getTrialDaysRemaining(settings: any): number | null {
  const trialEndsAt = settings?.trial?.endsAt || settings?.trialEndsAt;
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt);
  if (Number.isNaN(end.getTime())) return null;
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

export function TrialBanner() {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user?.restaurantId) return;
    api.getRestaurant(user.restaurantId)
      .then((res) => setSettings(res?.data?.settings))
      .catch(() => {/* ignore */});
  }, [user?.restaurantId]);

  if (!settings || dismissed) return null;

  const daysRemaining = getTrialDaysRemaining(settings);
  if (daysRemaining === null || daysRemaining > 5) return null;

  const expired = daysRemaining === 0;
  const urgent = daysRemaining <= 2;

  return (
    <div
      className={`flex items-center justify-between gap-3 border-b px-4 py-2 text-sm font-semibold ${
        expired
          ? 'border-red-500/30 bg-red-500/10 text-red-200'
          : urgent
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
          : 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200'
      }`}
    >
      <span>
        {expired
          ? '⚠️ Your trial has expired. Contact your administrator to continue.'
          : `⏰ ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining on your trial.`}
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-full px-3 py-1 text-xs opacity-70 hover:opacity-100"
      >
        Dismiss
      </button>
    </div>
  );
}
