import React from 'react';
import { getServerToken, handlePrefetchError } from '@/lib/server-auth';
import { getServiceOrdersForDate, type ApiServiceOrderItem } from '@/lib/api';
import CalendarClient from './CalendarClient';

export default async function Page() {
  const token = await getServerToken();

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  let initialOrders: ApiServiceOrderItem[] | null = null;

  if (token) {
    try {
      initialOrders = await getServiceOrdersForDate(token, today);
    } catch (e) {
      handlePrefetchError(e, 'calendar orders');
    }
  }

  return <CalendarClient initialOrders={initialOrders} initialDate={today} />;
}
