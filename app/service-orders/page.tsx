import React from 'react';
import { getServerToken } from '@/lib/server-auth';
import { getAdminServiceOrders, type ApiServiceOrderItem, type ServiceOrderStatus, type PaginatedItems } from '@/lib/api';
import ServiceOrdersClient from './ServiceOrdersClient';

export default async function Page() {
  const token = await getServerToken();
  let initialData: ApiServiceOrderItem[] | null = null;
  let initialStatuses: ServiceOrderStatus[] = [];
  let initialPagination: PaginatedItems<ApiServiceOrderItem>['pagination'] | null = null;

  if (token) {
    try {
      const res = await getAdminServiceOrders(token, { page: 1, per_page: 15 });
      initialData = res.data.items;
      initialStatuses = res.data.statuses || [];
      initialPagination = res.data.pagination;
    } catch (e) {
      console.error('Failed to prefetch service orders server-side:', e);
    }
  }

  return (
    <ServiceOrdersClient
      initialData={initialData}
      initialStatuses={initialStatuses}
      initialPagination={initialPagination}
    />
  );
}
