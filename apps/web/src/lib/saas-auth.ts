const STORAGE_KEY = 'saas_admin_token';
const COOKIE_KEY = 'saas_admin_token';
const COOKIE_MAX_AGE = 60 * 60 * 12;

function setCookie(value: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

function clearCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_KEY}=; path=/; max-age=0; samesite=lax`;
}

export function setSaasAdminSession(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, token);
  }
  setCookie(token);
}

export function getSaasAdminToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function clearSaasAdminSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  clearCookie();
}
