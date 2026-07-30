/**
 * Server-side auth helpers.
 * These functions run ONLY in Server Components / Route Handlers —
 * never in client-side code (they import from next/headers).
 *
 * The token cookie is set by lib/auth.ts → saveToken(), which writes
 * both localStorage AND document.cookie so middleware + server components
 * can access it without touching the browser.
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isUnauthenticatedError } from '@/lib/api';

export const TOKEN_COOKIE = 'tanal_token';

/**
 * Query flag that tells the middleware and the login page to drop the session.
 * The middleware repeats the literal rather than importing it — pulling this
 * module into the edge runtime would drag `next/headers` along with it.
 */
export const SESSION_EXPIRED_QUERY = 'session=expired';

/**
 * Read the auth token from the request cookie store.
 * Returns null when not authenticated (no cookie set).
 *
 * Usage (Server Component):
 *   const token = await getServerToken();
 *   if (!token) redirect('/login');
 */
export async function getServerToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(TOKEN_COOKIE)?.value ?? null;
}

/**
 * Sends the browser to the login screen after the API rejected the cookie
 * token. Clearing it here is not possible — Next.js forbids cookie writes
 * during render — so the `session=expired` flag hands that off to the
 * middleware (cookies) and the login page (localStorage).
 *
 * Throws, like every `redirect()`: never call it inside a `try` whose `catch`
 * would swallow the redirect signal.
 */
export function redirectToLogin(): never {
  redirect(`/login?${SESSION_EXPIRED_QUERY}`);
}

/**
 * Shared `catch` body for the server-side prefetch each page does.
 *
 * An expired token sends the user to login instead of rendering a shell that
 * cannot load anything. Every other failure keeps the old behaviour: log it and
 * render without seed data, leaving the client to refetch.
 */
export function handlePrefetchError(e: unknown, context: string): void {
  if (isUnauthenticatedError(e)) redirectToLogin();
  console.error(`Failed to prefetch ${context} server-side:`, e);
}
