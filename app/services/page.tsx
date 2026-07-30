import React from 'react';
import { getServerToken, handlePrefetchError } from '@/lib/server-auth';
import { getServices, type ApiService, type PaginatedItems } from '@/lib/api';
import ServicesClient from './ServicesClient';

export default async function Page() {
  const token = await getServerToken();
  let initialData: ApiService[] | null = null;
  let initialPagination: PaginatedItems<ApiService>['pagination'] | null = null;

  if (token) {
    try {
      const res = await getServices({ page: 1, per_page: 15 }, token);
      initialData = res.data.items;
      initialPagination = res.data.pagination;
    } catch (e) {
      handlePrefetchError(e, 'services');
    }
  }

  return (
    <ServicesClient
      initialData={initialData}
      initialPagination={initialPagination}
    />
  );
}
