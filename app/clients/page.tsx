import React from 'react';
import { getServerToken } from '@/lib/server-auth';
import { getClients, type Client, type PaginatedItems } from '@/lib/api';
import ClientsClient from './ClientsClient';

export default async function Page() {
  const token = await getServerToken();
  let initialData: Client[] | null = null;
  let initialPagination: PaginatedItems<Client>['pagination'] | null = null;

  if (token) {
    try {
      const res = await getClients(token, { page: 1, per_page: 15 });
      initialData = res.data.items;
      initialPagination = res.data.pagination;
    } catch (e) {
      console.error('Failed to prefetch clients server-side:', e);
    }
  }

  return (
    <ClientsClient
      initialData={initialData}
      initialPagination={initialPagination}
    />
  );
}
