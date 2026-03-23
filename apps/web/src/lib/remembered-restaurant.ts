const STORAGE_KEY = 'pos_saved_restaurant_id';
const COOKIE_KEY = 'pos_saved_restaurant_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 120;

function setCookie(value: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

function clearCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_KEY}=; path=/; max-age=0; samesite=lax`;
}

export function setRememberedRestaurantId(restaurantId: string) {
  const value = String(restaurantId || '').trim();
  if (!value || typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, value);
  setCookie(value);
}

export function getRememberedRestaurantId() {
  if (typeof window === 'undefined') return null;
  const fromStorage = localStorage.getItem(STORAGE_KEY)?.trim();
  if (fromStorage) return fromStorage;

  const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]+)`));
  return cookieMatch?.[1] ? decodeURIComponent(cookieMatch[1]) : null;
}

export function clearRememberedRestaurantId() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  clearCookie();
}

export function syncRememberedRestaurantId() {
  if (typeof window === 'undefined') return null;

  const fromStorage = localStorage.getItem(STORAGE_KEY)?.trim() || '';
  const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]+)`));
  const fromCookie = cookieMatch?.[1] ? decodeURIComponent(cookieMatch[1]).trim() : '';
  const resolved = fromStorage || fromCookie;

  if (!resolved) return null;

  if (!fromStorage) {
    localStorage.setItem(STORAGE_KEY, resolved);
  }

  if (!fromCookie) {
    setCookie(resolved);
  }

  return resolved;
}
