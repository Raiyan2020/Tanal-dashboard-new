import React from 'react';
import { getNotifications, type AdminNotification, type PaginatedItems } from '@/lib/api';
import { getServerToken, handlePrefetchError } from '@/lib/server-auth';
import NotificationsClient from './NotificationsClient';

export default async function NotificationsPage() {
  const token = await getServerToken();

  let initialData: AdminNotification[] | null = null;
  let initialPagination: PaginatedItems<AdminNotification>['pagination'] | null = null;

  if (token) {
    try {
      const res = await getNotifications(token, { page: 1, per_page: 15 });
      initialData = res.data.items;
      initialPagination = res.data.pagination;
    } catch (e) {
      handlePrefetchError(e, 'notifications');
    }
  }

  return (
    <NotificationsClient
      initialData={initialData}
      initialPagination={initialPagination}
    />
  );
}
