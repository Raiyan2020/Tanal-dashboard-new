import React from 'react';
import { getServerToken } from '@/lib/server-auth';
import { getAdminServiceOptions, type ServiceOptionItem, type PaginatedItems } from '@/lib/api';
import ServiceOptionsClient from './ServiceOptionsClient';

export default async function Page() {
  const token = await getServerToken();
  let initialData: ServiceOptionItem[] | null = null;
  let initialPagination: PaginatedItems<ServiceOptionItem>['pagination'] | null = null;

  if (token) {
    try {
      const res = await getAdminServiceOptions(token, { page: 1, per_page: 15 });
      initialData = res.data.items;
      initialPagination = res.data.pagination;
    } catch (e) {
      console.error('Failed to prefetch service options server-side:', e);
    }
  }

  return (
    <ServiceOptionsClient
      initialData={initialData}
      initialPagination={initialPagination}
    />
  );
}
