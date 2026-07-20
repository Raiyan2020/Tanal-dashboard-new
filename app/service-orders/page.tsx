import React from 'react';
import { getServerToken } from '@/lib/server-auth';
import {
  getAdminServiceOrders,
  type ApiServiceOrderItem,
  type ServiceOrderStatus,
  type ServiceOrdersResponse,
} from '@/lib/api';
import ServiceOrdersClient from './ServiceOrdersClient';

export default async function Page() {
  const token = await getServerToken();
  let initialData: ApiServiceOrderItem[] | null = null;
  let initialStatuses: ServiceOrderStatus[] = [];
  let initialPaymentStatuses: ServiceOrderStatus[] = [];
  let initialPagination: ServiceOrdersResponse['pagination'] | null = null;

  if (token) {
    try {
      const res = await getAdminServiceOrders(token, { page: 1, per_page: 15 });
      initialData = res.data.items;
      initialStatuses = res.data.statuses || [];
      initialPaymentStatuses = res.data.payment_statuses || [];
      initialPagination = res.data.pagination;
    } catch (e) {
      console.error('Failed to prefetch service orders server-side:', e);
    }
  }

  return (
    <ServiceOrdersClient
      initialData={initialData}
      initialStatuses={initialStatuses}
      initialPaymentStatuses={initialPaymentStatuses}
      initialPagination={initialPagination}
    />
  );
}
