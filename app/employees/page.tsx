import React from 'react';
import { getServerToken, handlePrefetchError } from '@/lib/server-auth';
import { getEmployees, type ApiEmployee, type PaginatedItems } from '@/lib/api';
import EmployeesClient from './EmployeesClient';

export default async function Page() {
  const token = await getServerToken();
  let initialData: ApiEmployee[] | null = null;
  let initialPagination: PaginatedItems<ApiEmployee>['pagination'] | null = null;

  if (token) {
    try {
      const res = await getEmployees({ page: 1, per_page: 15 }, token);
      initialData = res.data.items;
      initialPagination = res.data.pagination;
    } catch (e) {
      handlePrefetchError(e, 'employees');
    }
  }

  return (
    <EmployeesClient
      initialData={initialData}
      initialPagination={initialPagination}
    />
  );
}
