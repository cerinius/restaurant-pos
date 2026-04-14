'use client';

import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

import { SystemState } from '@/components/ui/SystemState';

export default function NotFound() {
  const router = useRouter();

  return (
    <SystemState
      eyebrow="404"
      title="That route does not exist"
      description="The link may be outdated, or the page may have moved. Use the nearest safe path to get back into RestaurantOS."
      Icon={ArrowUturnLeftIcon}
      actions={[
        { label: 'Go Home', href: '/' },
        { label: 'Go Back', onClick: () => router.back(), variant: 'secondary' },
      ]}
      meta="Authenticated users should be routed back into their current workspace from the shell."
    />
  );
}
