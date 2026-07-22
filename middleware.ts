import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Public routes that do NOT require authentication.
 * Everyone can access these even without a token.
 */
const PUBLIC_PATHS = [
  '/login',
  '/client-portal',
  '/guest-view',
  '/order-client',
  '/order-employee',
];

/**
 * Map from URL path prefix → required permission string.
 * The middleware checks that the user's permissions array (stored in the
 * tanal_permissions cookie) contains the required entry.
 *
 * Super-admins skip this check entirely.
 */
const ROUTE_PERMISSIONS: Record<string, string> = {
  '/admins':          'admins',
  '/roles':           'roles',
  '/invitations':     'invitations',
  '/service-orders':  'service-orders',
  '/calendar':        'service-orders',
  '/services':        'services',
  '/service-options': 'service-options',
  '/employees':       'employees',
  '/financial':       'finance',
  '/landing-page':    'landing-page',
  '/notifications':   'notifications',
  '/settings':        'show-settings',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow Next.js internals and static files through without any checks
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if the current path is public
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  // Read the auth token from the cookie set by lib/auth.ts
  const token = request.cookies.get('tanal_token')?.value;

  // If visiting a protected route without a token → redirect to /login
  if (!isPublic && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If already authenticated and visiting /login → redirect to dashboard
  if (pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // ── Permission check for protected routes ────────────────────────────────
  if (token && !isPublic && pathname !== '/') {
    // Parse permissions from cookie
    const rawPerms = request.cookies.get('tanal_permissions')?.value;
    let permissions: string[] = [];
    if (rawPerms) {
      try {
        permissions = JSON.parse(decodeURIComponent(rawPerms)) as string[];
      } catch {
        permissions = [];
      }
    }

    // Find if this path requires a specific permission
    const requiredPerm = Object.entries(ROUTE_PERMISSIONS).find(([prefix]) =>
      pathname === prefix || pathname.startsWith(`${prefix}/`)
    )?.[1];

    if (requiredPerm && !permissions.includes(requiredPerm)) {
      // User lacks the required permission — redirect to dashboard
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
