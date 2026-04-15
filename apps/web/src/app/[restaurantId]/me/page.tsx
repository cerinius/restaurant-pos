import { redirect } from 'next/navigation';

import StaffPortalPage from '@/modules/workforce/StaffPortalPage';
import { getRestaurantLoginPath } from '@/lib/paths';
import { getServerSession } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

export default async function StaffPortalRoute({
  params,
}: {
  params: { restaurantId: string };
}) {
  const { token, restaurantId, locationId } = await getServerSession();

  if (!token) {
    redirect(getRestaurantLoginPath(params.restaurantId));
  }

  if (restaurantId && restaurantId !== params.restaurantId) {
    redirect(`/${restaurantId}/me`);
  }

  return <StaffPortalPage restaurantId={params.restaurantId} initialLocationId={locationId} />;
}
