import React from 'react';
import { notFound } from 'next/navigation';
import { getServerToken, redirectToLogin } from '@/lib/server-auth';
import {
  getAdminServiceOrderById,
  isUnauthenticatedError,
  type ApiServiceOrderDetail,
} from '@/lib/api';
import { EditOrderClient } from './EditOrderClient';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isFinite(orderId)) notFound();

  const token = await getServerToken();
  if (!token) notFound();

  // Only the fetch belongs in the try: JSX returned from inside one looks
  // guarded but is not, since render errors surface long after the catch.
  let order: ApiServiceOrderDetail;
  try {
    order = (await getAdminServiceOrderById(orderId, token)).data;
  } catch (e) {
    // An expired token is not a missing order — sending it to /login is far
    // more useful than a 404 the admin cannot act on.
    if (isUnauthenticatedError(e)) redirectToLogin();
    notFound();
  }

  return <EditOrderClient token={token} order={order} />;
}
