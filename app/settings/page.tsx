import React from 'react';
import { getServerToken } from '@/lib/server-auth';
import { getSettings, type SettingsData } from '@/lib/api';
import SettingsClient from './SettingsClient';

export default async function Page() {
  const token = await getServerToken();
  let initialData: SettingsData | null = null;

  if (token) {
    try {
      const res = await getSettings(token);
      initialData = res.data;
    } catch (e) {
      console.error('Failed to prefetch settings server-side:', e);
    }
  }

  return <SettingsClient initialData={initialData} />;
}
