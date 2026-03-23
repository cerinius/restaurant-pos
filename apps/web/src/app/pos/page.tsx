import { redirect } from 'next/navigation';

import POSShell from './POSShell';
import { getPOSBootstrap, getServerSession } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

export default async function POSPage() {
  const { token, locationId } = getServerSession();

  if (!token) {
    redirect('/login');
  }

  const initialData = await getPOSBootstrap(token, locationId);

  return <POSShell initialData={initialData} />;
}
