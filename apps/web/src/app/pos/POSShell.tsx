'use client';

import POSContent from './POSContent';
import { useGlobalWSNotifications } from '@/hooks/useWebSocket';

interface POSShellProps {
  initialData: {
    menu: any;
    tables: any[];
    openOrders: any[];
    locationId: string | null;
  };
}

export default function POSShell({ initialData }: POSShellProps) {
  useGlobalWSNotifications();

  return (
    <POSContent initialData={initialData} />
  );
}
