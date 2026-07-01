import React from 'react';
import { getServerToken } from '@/lib/server-auth';
import { getEvents, type ApiEvent, type PaginatedItems } from '@/lib/api';
import EventsClient from './EventsClient';
import { type AppEvent } from './EventDetails';

export default async function Page() {
  const token = await getServerToken();
  let initialData: AppEvent[] | null = null;
  let initialPagination: PaginatedItems<ApiEvent>['pagination'] | null = null;

  if (token) {
    try {
      const res = await getEvents(token, { page: 1, per_page: 15 });
      initialData = res.data.items.map((apiEvent) => ({
        id: String(apiEvent.id),
        name: apiEvent.name,
        creationDate: apiEvent.event_date || apiEvent.created_at || '',
        guests: apiEvent.guest_count,
        invitationsCreated: !!apiEvent.invitations_created,
        status: (apiEvent.status === 'cancelled' ? 'canceled' : apiEvent.status) as any,
        eventDate: apiEvent.event_date || undefined,
        eventTime: apiEvent.event_time || undefined,
        eventCost: apiEvent.price || undefined,
        paymentType: apiEvent.payment_type || undefined,
        hallName: apiEvent.hall_name || undefined,
        hallLocation: apiEvent.hall_location || undefined,
        welcomeMessage: apiEvent.welcome_message || undefined,
        assignedEmployeeId: apiEvent.assigned_employee_id ? String(apiEvent.assigned_employee_id) : undefined,
        clientId: apiEvent.client_id ? String(apiEvent.client_id) : undefined,
        reference_number: apiEvent.reference_number,
        status_label: apiEvent.status_label,
        actions: apiEvent.actions,
      }));
      initialPagination = res.data.pagination;
    } catch (e) {
      console.error('Failed to prefetch events server-side:', e);
    }
  }

  return (
    <EventsClient
      initialData={initialData}
      initialPagination={initialPagination}
    />
  );
}
