import React from 'react';
import { notFound } from 'next/navigation';
import { getServerToken } from '@/lib/server-auth';
import { getAdminServiceOrderById } from '@/lib/api';
import { EditOrderClient } from './EditOrderClient';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isFinite(orderId)) notFound();

  const token = await getServerToken();
  if (!token) notFound();

  try {
    const res = await getAdminServiceOrderById(orderId, token);
    return <EditOrderClient token={token} order={res.data} />;
  } catch {
    notFound();
  }
}
