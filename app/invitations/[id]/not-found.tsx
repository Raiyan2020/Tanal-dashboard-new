'use client';

import React from 'react';
import Link from 'next/link';
import { MailX, ArrowRight, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

/**
 * Shown when the API says this invitation does not exist (a real 404, not a
 * failed request — the page only reaches here on an API 404 or a malformed id).
 * The default Next.js page is bare English with no way back, which reads as a
 * broken dashboard rather than a deleted record.
 */
export default function InvitationNotFound() {
  const { t, dir } = useLanguage();
  const BackIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <span className="w-16 h-16 rounded-3xl bg-secondary/5 text-secondary/40 flex items-center justify-center mb-5">
        <MailX className="w-8 h-8" />
      </span>
      <h1 className="text-xl font-semibold text-secondary mb-2">
        {t('invitationNotFoundTitle')}
      </h1>
      <p className="text-sm text-secondary/55 max-w-sm leading-relaxed mb-6">
        {t('invitationNotFoundMessage')}
      </p>
      <Link
        href="/invitations"
        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
      >
        {t('backToInvitations')}
        <BackIcon className="w-4 h-4" />
      </Link>
    </div>
  );
}
