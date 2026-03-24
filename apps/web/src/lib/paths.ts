const RESTAURANT_ROUTE_PATTERN = /^\/([^/]+)\/(login|pos|kds|admin|team)(?:\/.*)?$/;

export function getRestaurantPath(restaurantId: string, suffix = '/pos') {
  const normalizedSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`;
  return `/${restaurantId}${normalizedSuffix}`;
}

export function getRestaurantPublicPath(restaurantId: string) {
  return `/${restaurantId}`;
}

export function getRestaurantLoginPath(restaurantId: string) {
  return getRestaurantPath(restaurantId, '/login');
}

export function getRestaurantPOSPath(restaurantId: string) {
  return getRestaurantPath(restaurantId, '/pos');
}

export function getRestaurantKDSPath(restaurantId: string) {
  return getRestaurantPath(restaurantId, '/kds');
}

export function getRestaurantAdminPath(restaurantId: string, suffix = '') {
  return getRestaurantPath(restaurantId, suffix ? `/admin/${suffix}` : '/admin');
}

export function getRestaurantTeamPath(restaurantId: string) {
  return getRestaurantPath(restaurantId, '/team');
}

export function extractRestaurantIdFromPathname(pathname: string) {
  const match = pathname.match(RESTAURANT_ROUTE_PATTERN);
  return match?.[1] || null;
}

export function resolveRestaurantHomePath(user?: { restaurantId?: string; role?: string } | null) {
  const restaurantId = user?.restaurantId;
  if (!restaurantId) return '/login';
  const normalizedRole = String(user?.role || '').toUpperCase();
  if (['OWNER', 'MANAGER'].includes(normalizedRole)) {
    return getRestaurantAdminPath(restaurantId);
  }
  if (normalizedRole === 'KDS') {
    return getRestaurantKDSPath(restaurantId);
  }
  return getRestaurantPOSPath(restaurantId);
}

export function resolveLoginPathFromPathname(pathname: string) {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return '/admin/login';
  }

  const restaurantId = extractRestaurantIdFromPathname(pathname);
  if (restaurantId) {
    return getRestaurantLoginPath(restaurantId);
  }

  return '/login';
}
