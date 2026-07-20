'use client';

import { useEffect, useState, useCallback } from 'react';
import { getPermissions, isSuperAdmin } from '@/lib/auth';

/**
 * Reads RBAC permissions for the logged-in admin.
 *
 * Permissions live in localStorage, which is unavailable during SSR — reading
 * them at render time would desync the server and client HTML. So the first
 * render reports no permissions and the real set arrives after mount. Gated
 * controls stay hidden for that first paint rather than flashing and vanishing.
 */
export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [superAdmin, setSuperAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPermissions(getPermissions());
    setSuperAdmin(isSuperAdmin());
    setReady(true);
  }, []);

  const can = useCallback(
    (permission: string) => superAdmin || permissions.includes(permission),
    [permissions, superAdmin]
  );

  return { can, permissions, isSuperAdmin: superAdmin, ready };
}
