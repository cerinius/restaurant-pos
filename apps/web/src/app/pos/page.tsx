import { redirect } from 'next/navigation';

import { getServerSession } from '@/lib/server-api';
import { getRestaurantPOSPath } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export default async function POSPage() {
  const { token, restaurantId } = getServerSession();

  if (!token || !restaurantId) {
    redirect('/login');
  }

  redirect(getRestaurantPOSPath(restaurantId));
}
