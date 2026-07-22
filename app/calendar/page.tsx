import React from 'react';
import { getServerToken } from '@/lib/server-auth';
import { getAdminServiceOrders, type ApiServiceOrderItem } from '@/lib/api';
import CalendarClient from './CalendarClient';

export default async function Page() {
  const token = await getServerToken();

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  let initialOrders: ApiServiceOrderItem[] | null = null;

  if (token) {
    try {
      const res = await getAdminServiceOrders(token, {
        page: 1,
        per_page: 100,
        date: today,
        order_by: 'event_date',
        order: 'ASC',
      });
      initialOrders = res.data.items;
    } catch (e) {
      console.error('Failed to prefetch calendar orders server-side:', e);
    }
  }

  return <CalendarClient initialOrders={initialOrders} initialDate={today} />;
}
