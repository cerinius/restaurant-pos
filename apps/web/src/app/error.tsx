'use client';

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { SystemState } from '@/components/ui/SystemState';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SystemState
      eyebrow="500"
      title="Something went wrong"
      description="RestaurantOS hit an unexpected error. You can retry safely, or move back to a known-good route while we keep the failure visible for support."
      Icon={ExclamationTriangleIcon}
      actions={[
        { label: 'Retry', onClick: reset },
        { label: 'Go Home', href: '/', variant: 'secondary' },
      ]}
      meta={error?.digest ? `Incident reference: ${error.digest}` : 'If the issue persists, contact support with the time and route.'}
    />
  );
}
