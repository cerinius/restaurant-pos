import { redirect } from 'next/navigation';

import { getServerSession } from '@/lib/server-api';
import { getRestaurantKDSPath } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export default async function KDSPage() {
  const { token, restaurantId } = await getServerSession();

  if (!token || !restaurantId) {
    redirect('/login');
  }

  redirect(getRestaurantKDSPath(restaurantId));
}
