import { redirect } from 'next/navigation';

import KDSShell from '@/app/kds/KDSShell';
import { getKDSBootstrap, getServerSession } from '@/lib/server-api';
import { getRestaurantKDSPath, getRestaurantLoginPath } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export default async function TenantKDSPage({
  params,
}: {
  params: { restaurantId: string };
}) {
  const { token, restaurantId, locationId } = await getServerSession();

  if (!token) {
    redirect(getRestaurantLoginPath(params.restaurantId));
  }

  if (restaurantId && restaurantId !== params.restaurantId) {
    redirect(getRestaurantKDSPath(restaurantId));
  }

  const initialData = await getKDSBootstrap(token, locationId);
  return <KDSShell initialData={initialData} />;
}
