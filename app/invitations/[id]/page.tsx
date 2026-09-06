import React from 'react';
import { notFound } from 'next/navigation';
import { getServerToken, redirectToLogin } from '@/lib/server-auth';
import {
  ApiError,
  getInvitationById,
  isUnauthenticatedError,
  type InvitationDetailData,
} from '@/lib/api';
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

/**
 * Enough of the view-model to mount the client, which fetches the record itself
 * (`InvitationDetails` → `refreshDetails`) and reports its own failure as a
 * toast. Used when the server-side prefetch could not run — the seed is an
 * optimisation, never the only chance to load the page.
 */
function seedInvitation(id: number): Invitation {
  return {
    id: String(id),
    serviceOrderId: '',
    serviceOrderReference: '—',
    clientName: '',
    clientPhone: '',
    executionDate: '',
    deadlineDate: '',
    guestsNumber: 0,
    guestsIncluded: null,
    isBarcodeSuspended: false,
    whatsappUrl: '',
    status: 'unsent',
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invitationId = Number(id);
  // A non-numeric or non-positive id can never match a record: a real 404.
  if (!Number.isInteger(invitationId) || invitationId <= 0) notFound();

  const token = await getServerToken();
  // No cookie means the session is gone, not that the invitation is missing.
  if (!token) redirectToLogin();

  let detail: InvitationDetailData | null = null;
  try {
    const res = await getInvitationById(invitationId, token);
    // `ResponseTrait` nulls an empty payload, so `data` can arrive empty even
    // on a 200 — the client refetch handles that better than a crash here.
    detail = res.data ?? null;
  } catch (e) {
    if (isUnauthenticatedError(e)) redirectToLogin();

    // Only "no such invitation" is a 404. Everything else — a 403 because the
    // role lacks `show-invitation`, a 500, a network blip — used to render as
    // one too, which turned a recoverable failure into a dead end with nothing
    // on screen to explain it. Those now fall through to the client, which
    // retries and surfaces the API's own message.
    if (e instanceof ApiError && e.status === 404) notFound();

    console.error(`Failed to prefetch invitation ${invitationId} server-side:`, e);
  }

  return (
    <InvitationDetailClient
      initialInvitation={detail ? mapDetailToInvitation(detail) : seedInvitation(invitationId)}
    />
  );
}
