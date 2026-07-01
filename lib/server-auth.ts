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

export const TOKEN_COOKIE = 'tanal_token';

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
