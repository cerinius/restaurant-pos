'use client';

import HostContent from './HostContent';
import { useGlobalWSNotifications } from '@/hooks/useWebSocket';

interface HostShellProps {
  initialData: {
    tables: any[];
    locationId: string;
  };
}

export default function HostShell({ initialData }: HostShellProps) {
  useGlobalWSNotifications();

  return <HostContent initialData={initialData} />;
}