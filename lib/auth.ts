/**
 * Auth helpers — token is stored in:
 *  • localStorage  (client-side access)
 *  • A secure httpOnly-like cookie via document.cookie  (middleware can read it)
 *
 * We use a plain cookie (not httpOnly from the client) because Next.js middleware
 * runs on the edge and can only read cookies, not localStorage.
 *
 * Cookie name: tanal_token
 * localStorage key: tanal_token
 */

export const TOKEN_KEY = 'tanal_token';
export const ADMIN_KEY = 'tanal_admin';

export function saveToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  // Set a cookie so Next.js middleware can detect auth state
  // SameSite=Lax is sufficient for same-origin requests
  document.cookie = `${TOKEN_KEY}=${token}; path=/; SameSite=Lax`;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY) ?? null;
}

export function saveAdmin(admin: unknown): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

export function getAdmin<T = unknown>(): T | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(ADMIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
  // Expire the cookie
  document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
