'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InvitationDetails } from '../InvitationDetails';
import { InvitationEditForm } from '../InvitationEditForm';
import type { Invitation } from '../InvitationsClient';

/**
 * Route-level shell for a single invitation. The server component seeds the
 * header fields; `InvitationDetails` fetches the full record itself on mount.
 */
export default function InvitationDetailClient({ initialInvitation }: { initialInvitation: Invitation }) {
  const router = useRouter();

  const [invitation, setInvitation] = useState<Invitation>(initialInvitation);
  const [editing, setEditing] = useState(false);
  // Bumped after a save so the details view refetches instead of showing stale data.
  const [detailsKey, setDetailsKey] = useState(0);

  const goToList = () => router.push('/invitations');

  if (editing) {
    return (
      <InvitationEditForm
        invitation={invitation}
        onBack={() => setEditing(false)}
        onSave={(saved) => {
          setInvitation(saved);
          setDetailsKey(k => k + 1);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <InvitationDetails
      key={detailsKey}
      invitation={invitation}
      onBack={goToList}
      onEdit={() => setEditing(true)}
    />
  );
}
