import React from 'react';
import { getServerToken } from '@/lib/server-auth';
import { getRoles, type Role } from '@/lib/api';
import RolesClient from './RolesClient';

export default async function Page() {
  const token = await getServerToken();
  let initialData: Role[] | null = null;

  if (token) {
    try {
      const res = await getRoles(token);
      initialData = res.data.items;
    } catch (e) {
      console.error('Failed to prefetch roles server-side:', e);
    }
  }

  return <RolesClient initialData={initialData} />;
}
