import { redirect } from 'next/navigation';

import TeamHubPage from '@/modules/workforce/TeamHubPage';
import { getRestaurantLoginPath, getRestaurantTeamPath } from '@/lib/paths';
import { getServerSession } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

export default async function TenantTeamPage({
  params,
}: {
  params: { restaurantId: string };
}) {
  const { token, restaurantId, locationId } = await getServerSession();

  if (!token) {
    redirect(getRestaurantLoginPath(params.restaurantId));
  }

  if (restaurantId && restaurantId !== params.restaurantId) {
    redirect(getRestaurantTeamPath(restaurantId));
  }

  return <TeamHubPage restaurantId={params.restaurantId} initialLocationId={locationId} />;
}
