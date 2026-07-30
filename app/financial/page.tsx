import React from 'react';
import { getServerToken, handlePrefetchError } from '@/lib/server-auth';
import { getAdminFinancialRecords, type ApiFinancialRecordItem, type PaginatedItems } from '@/lib/api';
import FinancialClient from './FinancialClient';

export default async function Page() {
  const token = await getServerToken();
  let initialData: ApiFinancialRecordItem[] | null = null;
  let initialPagination: PaginatedItems<ApiFinancialRecordItem>['pagination'] | null = null;

  if (token) {
    try {
      const res = await getAdminFinancialRecords(token, { page: 1, per_page: 15 });
      initialData = res.data.items;
      initialPagination = res.data.pagination;
    } catch (e) {
      handlePrefetchError(e, 'financial records');
    }
  }

  return (
    <FinancialClient
      initialData={initialData}
      initialPagination={initialPagination}
    />
  );
}
