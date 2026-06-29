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

export const TOKEN_KEY       = 'tanal_token';
export const ADMIN_KEY       = 'tanal_admin';
export const PERMISSIONS_KEY = 'tanal_permissions';

export function saveToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  // Set a cookie so Next.js middleware can detect auth state
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

/** Persist the permissions array from the login response. */
export function savePermissions(permissions: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions));
  // Also store in a cookie so middleware can enforce route-level access
  document.cookie = `${PERMISSIONS_KEY}=${encodeURIComponent(JSON.stringify(permissions))}; path=/; SameSite=Lax`;
}

/** Read the permissions array from localStorage. Returns [] on server or if not set. */
export function getPermissions(): string[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(PERMISSIONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

/**
 * Check if the current user has a specific permission.
 * Super-admins (is_super_admin = true on their saved admin object) always return true.
 */
export function hasPermission(permission: string): boolean {
  const permissions = getPermissions();
  return permissions.includes(permission);
}

/** Returns true when the logged-in admin is a super-admin. */
export function isSuperAdmin(): boolean {
  const admin = getAdmin<{ is_super_admin?: boolean }>();
  return admin?.is_super_admin === true;
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
  localStorage.removeItem(PERMISSIONS_KEY);
  // Expire the cookies
  document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  document.cookie = `${PERMISSIONS_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
