import React from 'react';
import { getServerToken } from '@/lib/server-auth';
import { getInvitations, type ApiInvitation } from '@/lib/api';
import InvitationsClient, { type Invitation, type InvitationStatus } from './InvitationsClient';

export default async function Page() {
  const token = await getServerToken();
  let initialData: Invitation[] | null = null;
  let initialTotalPages = 1;

  if (token) {
    try {
      const res = await getInvitations(token, { page: 1, per_page: 15 });
      initialData = res.data.items.map((apiInv) => {
        let status: InvitationStatus = 'unsent';
        if (apiInv.status === 'previous') {
          status = 'past';
        } else {
          status = apiInv.is_sent ? 'sent' : 'unsent';
        }
        return {
          id: String(apiInv.id),
          eventId: String(apiInv.client_id),
          eventName: apiInv.event_name,
          deadlineDate: apiInv.deadline_date,
          guestsNumber: apiInv.guest_count,
          status,
        };
      });
      initialTotalPages = res.data.pagination.last_page;
    } catch (e) {
      console.error('Failed to prefetch invitations server-side:', e);
    }
  }

  return (
    <InvitationsClient
      initialData={initialData}
      initialTotalPages={initialTotalPages}
    />
  );
}
