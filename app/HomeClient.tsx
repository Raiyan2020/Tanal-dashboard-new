'use client';

import React from 'react';
import { DashboardContent } from '@/components/dashboard-content';
import { useRouter } from 'next/navigation';
import { type DashboardData } from '@/lib/api';

export default function HomeClient({ initialData }: { initialData: DashboardData | null }) {
  const router = useRouter();

  return (
    <DashboardContent 
       initialData={initialData}
       onNavigate={(id) => router.push(id === 'dashboard' ? '/' : `/${id}`)}
       onCreateEvent={() => router.push('/service-orders')}
    />
  );
}
