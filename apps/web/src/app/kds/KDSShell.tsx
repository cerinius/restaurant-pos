'use client';

import KDSContent from './KDSContent';

interface KDSShellProps {
  initialData: {
    stations: any[];
    tickets: any[];
    stats: any;
    selectedStationId: string | null;
    locationId: string | null;
  };
}

export default function KDSShell({ initialData }: KDSShellProps) {
  return <KDSContent initialData={initialData} />;
}
