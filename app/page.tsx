import React from 'react';
import { getServerToken, handlePrefetchError } from '@/lib/server-auth';
import { getDashboardData, type DashboardData } from '@/lib/api';
import HomeClient from './HomeClient';

export default async function Page() {
  const token = await getServerToken();
  let initialData: DashboardData | null = null;

  if (token) {
    try {
      const res = await getDashboardData('this_year', token);
      initialData = res.data;
    } catch (e) {
      handlePrefetchError(e, 'dashboard');
    }
  }

  return <HomeClient initialData={initialData} />;
}
