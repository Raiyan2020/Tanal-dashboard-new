import React from 'react';
import { getServerToken, handlePrefetchError } from '@/lib/server-auth';
import { getInvitations } from '@/lib/api';
import InvitationsClient, { mapApiInvitation, type Invitation } from './InvitationsClient';

export default async function Page() {
  const token = await getServerToken();
  let initialData: Invitation[] | null = null;
  let initialTotalPages = 1;

  if (token) {
    try {
      const res = await getInvitations(token, { page: 1, per_page: 15 });
      initialData = res.data.items.map(mapApiInvitation);
      initialTotalPages = res.data.pagination.last_page;
    } catch (e) {
      handlePrefetchError(e, 'invitations');
    }
  }

  return (
    <InvitationsClient
      initialData={initialData}
      initialTotalPages={initialTotalPages}
    />
  );
}
