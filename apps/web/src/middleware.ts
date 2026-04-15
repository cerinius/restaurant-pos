import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_EXACT_PATHS = new Set(['/', '/login', '/staff', '/demo', '/contact-sales']);
const PUBLIC_PREFIXES = ['/admin/login', '/_next', '/api', '/icon', '/manifest', '/sw.js', '/workbox'];
const TENANT_ROUTE_PATTERN = /^\/([^/]+)\/(login|pos|kds|admin|team)(?:\/.*)?$/;
const LEGACY_APP_PREFIXES = ['/pos', '/kds'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_EXACT_PATHS.has(pathname) || PUBLIC_PREFIXES.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (pathname === '/admin') {
    const saasToken = request.cookies.get('saas_admin_token')?.value;

    if (!saasToken) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  if (pathname.startsWith('/admin/')) {
    // /admin/* routes are SaaS admin only - require saas_admin_token
    const saasToken = request.cookies.get('saas_admin_token')?.value;

    if (saasToken) {
      return NextResponse.next();
    }

    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const tenantMatch = pathname.match(TENANT_ROUTE_PATTERN);
  if (tenantMatch) {
    if (tenantMatch[2] === 'login') {
      return NextResponse.next();
    }

    const token = request.cookies.get('pos_token')?.value;
    if (!token) {
      const loginUrl = new URL(`/${tenantMatch[1]}/login`, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  if (LEGACY_APP_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    const token = request.cookies.get('pos_token')?.value;
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
