import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function fetchJSON<T>(path: string, token: string) {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: getHeaders(token),
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function getServerSession() {
  const cookieStore = cookies();
  return {
    token: cookieStore.get('pos_token')?.value || null,
    locationId: cookieStore.get('pos_location_id')?.value || null,
  };
}

export async function getPOSBootstrap(token: string, locationId?: string | null) {
  const search = locationId ? `?locationId=${encodeURIComponent(locationId)}` : '';

  const [menu, tables, openOrders] = await Promise.all([
    fetchJSON<any>('/api/menu/full', token),
    fetchJSON<any>(`/api/tables${search}`, token),
    fetchJSON<any>(`/api/orders/open${search}`, token),
  ]);

  return {
    menu: menu?.data || null,
    tables: tables?.data || [],
    openOrders: openOrders?.data || [],
    locationId: locationId || null,
  };
}

export async function getKDSBootstrap(token: string, locationId?: string | null) {
  const search = locationId ? `?locationId=${encodeURIComponent(locationId)}` : '';
  const stationsResponse = await fetchJSON<any>(`/api/stations${search}`, token);
  const stations = stationsResponse?.data || [];
  const selectedStationId = stations[0]?.id || null;
  const ticketSearch = new URLSearchParams();

  if (locationId) ticketSearch.set('locationId', locationId);
  if (selectedStationId) ticketSearch.set('stationId', selectedStationId);

  const [tickets, stats] = await Promise.all([
    selectedStationId
      ? fetchJSON<any>(`/api/kds/tickets?${ticketSearch.toString()}`, token)
      : Promise.resolve(null),
    fetchJSON<any>(`/api/kds/stats${search}`, token),
  ]);

  return {
    stations,
    tickets: tickets?.data || [],
    stats: stats?.data || null,
    selectedStationId,
    locationId: locationId || null,
  };
}
