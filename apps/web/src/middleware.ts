
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/_next', '/api', '/icon', '/manifest', '/sw.js', '/workbox'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for auth token in cookies (set on login)
  const token = request.cookies.get('pos_token')?.value;

  // For client-side auth we rely on the store â just allow all non-public routes
  // The page components themselves redirect if unauthenticated
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
