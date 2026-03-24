import { redirect } from 'next/navigation';

import POSShell from '@/app/pos/POSShell';
import { getPOSBootstrap, getServerSession } from '@/lib/server-api';
import { getRestaurantLoginPath, getRestaurantPOSPath } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export default async function TenantPOSPage({
  params,
}: {
  params: { restaurantId: string };
}) {
  const { token, restaurantId, locationId } = await getServerSession();

  if (!token) {
    redirect(getRestaurantLoginPath(params.restaurantId));
  }

  if (restaurantId && restaurantId !== params.restaurantId) {
    redirect(getRestaurantPOSPath(restaurantId));
  }

  const initialData = await getPOSBootstrap(token, locationId);
  return <POSShell initialData={initialData} />;
}
