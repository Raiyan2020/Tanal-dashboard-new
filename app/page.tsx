'use client';

import React from 'react';
import { DashboardContent } from '@/components/dashboard-content';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <DashboardContent 
       onNavigate={(id) => router.push(id === 'dashboard' ? '/' : `/${id}`)}
       onCreateEvent={() => router.push('/events')}
    />
  );
}
