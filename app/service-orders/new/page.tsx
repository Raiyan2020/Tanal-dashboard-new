import React from 'react';
import { getServerToken } from '@/lib/server-auth';
import { CreateOrderClient } from './CreateOrderClient';

export default async function Page() {
  const token = await getServerToken();
  return <CreateOrderClient token={token ?? ''} />;
}
