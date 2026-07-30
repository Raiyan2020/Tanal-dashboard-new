import React from 'react';
import { getServerToken, handlePrefetchError } from '@/lib/server-auth';
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
      handlePrefetchError(e, 'roles');
    }
  }

  return <RolesClient initialData={initialData} />;
}
