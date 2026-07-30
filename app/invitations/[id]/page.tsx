import React from 'react';
import { notFound } from 'next/navigation';
import { getServerToken, redirectToLogin } from '@/lib/server-auth';
import { getInvitationById, isUnauthenticatedError, type InvitationDetailData } from '@/lib/api';
import type { Invitation } from '../InvitationsClient';
import InvitationDetailClient from './InvitationDetailClient';

/**
 * Builds the list view-model from a detail payload. The detail resource has no
 * client/execution fields — those are list-only and unused by the header — so
 * they stay empty here.
 */
function mapDetailToInvitation(detail: InvitationDetailData): Invitation {
  return {
    id: String(detail.id),
    serviceOrderId: detail.service_order_id != null ? String(detail.service_order_id) : '',
    serviceOrderReference: detail.service_order_reference ?? detail.name ?? '—',
    clientName: '',
    clientPhone: '',
    executionDate: '',
    deadlineDate: detail.details?.deadline_date ?? '',
    guestsNumber: detail.details?.guest_count ?? 0,
    guestsIncluded: detail.guests_included,
    isBarcodeSuspended: detail.is_barcode_suspended,
    whatsappUrl: '',
    status: detail.actions?.status === 'previous' ? 'past' : detail.actions?.is_sent ? 'sent' : 'unsent',
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invitationId = Number(id);
  if (!Number.isFinite(invitationId)) notFound();

  const token = await getServerToken();
  if (!token) notFound();

  let detail: InvitationDetailData;
  try {
    detail = (await getInvitationById(invitationId, token)).data;
  } catch (e) {
    // An expired token is not a missing invitation — send the admin to /login
    // rather than a 404 they cannot act on.
    if (isUnauthenticatedError(e)) redirectToLogin();
    notFound();
  }

  return <InvitationDetailClient initialInvitation={mapDetailToInvitation(detail)} />;
}
