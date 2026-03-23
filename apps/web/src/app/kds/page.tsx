import { redirect } from 'next/navigation';

import KDSShell from './KDSShell';
import { getKDSBootstrap, getServerSession } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

export default async function KDSPage() {
  const { token, locationId } = getServerSession();

  if (!token) {
    redirect('/login');
  }

  const initialData = await getKDSBootstrap(token, locationId);

  return <KDSShell initialData={initialData} />;
}
