import { redirect } from 'next/navigation';

import HostShell from './HostShell';
import { getPOSBootstrap, getServerSession } from '@/lib/server-api';
import { getRestaurantLoginPath } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export default async function HostPage({
  params,
}: {
  params: { restaurantId: string };
}) {
  const { token, restaurantId, locationId } = await getServerSession();

  if (!token) {
    redirect(getRestaurantLoginPath(params.restaurantId));
  }

  if (restaurantId && restaurantId !== params.restaurantId) {
    redirect(`/login`);
  }

  const initialData = await getPOSBootstrap(token, locationId);
  return <HostShell initialData={initialData} />;
}