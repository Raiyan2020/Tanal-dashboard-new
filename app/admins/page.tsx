import React from 'react';
import { getServerToken, handlePrefetchError } from '@/lib/server-auth';
import { getAdmins, type Admin, type PaginatedItems } from '@/lib/api';
import AdminsClient from './AdminsClient';

export default async function Page() {
  const token = await getServerToken();
  let initialData: Admin[] | null = null;
  let initialPagination: PaginatedItems<Admin>['pagination'] | null = null;

  if (token) {
    try {
      const res = await getAdmins(token, { page: 1, per_page: 15 });
      initialData = res.data.items;
      initialPagination = res.data.pagination;
    } catch (e) {
      handlePrefetchError(e, 'admins');
    }
  }

  return (
    <AdminsClient
      initialData={initialData}
      initialPagination={initialPagination}
    />
  );
}
