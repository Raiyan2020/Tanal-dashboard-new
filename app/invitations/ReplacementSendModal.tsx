'use client';

/**
 * Replacement-send picker.
 *
 * Every rejection frees one seat, and the backend turns that into one
 * replacement-send credit (`available_resends`). This modal spends that credit:
 * the admin picks who gets the freed invitations, capped at the credit on hand.
 *
 * Eligible guests are only the ones the backend will accept — guests who were
 * never messaged, and guests who rejected. A `pending` guest who *was* already
 * messaged is still waiting to answer, so they are filtered out; the API answers
 * 422 for them anyway.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Loader2, RefreshCw, Search, ChevronLeft, ChevronRight, XCircle,
  UserPlus, AlertCircle, Check,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { getInvitationGuests, type InvitationGuest } from '@/lib/api';
import { toast } from 'sonner';

type EligibleTab = 'unsent' | 'rejected';

interface ReplacementSendModalProps {
  invitationId: number;
  token: string;
  /** Credit on hand — read straight from the invitation detail, never computed here. */
  availableResends: number;
  onClose: () => void;
  /** Resolves `true` when the send succeeded, so the modal can close itself. */
  onSubmit: (guestIds: number[]) => Promise<boolean>;
}

const PER_PAGE = 15;

/**
 * The API has no "never messaged" filter, so the unsent tab asks for `pending`
 * and drops anyone already messaged. `invitation_sent_at` is absent on older API
 * builds — then the row stays listed and the backend has the final say.
 */
function isEligible(guest: InvitationGuest, tab: EligibleTab): boolean {
  if (!guest.have_whatsapp) return false;
  if (tab === 'rejected') return guest.status === 'rejected';
  return guest.status === 'pending' && !guest.invitation_sent_at;
}

export function ReplacementSendModal({
  invitationId,
  token,
  availableResends,
  onClose,
  onSubmit,
}: ReplacementSendModalProps) {
  const { t, dir } = useLanguage();

  const [tab, setTab] = useState<EligibleTab>('rejected');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [guests, setGuests] = useState<InvitationGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Keyed by id so a selection survives paging, searching and tab switches —
  // the name is kept for the "selected" summary, which outlives the visible page.
  const [selected, setSelected] = useState<Map<number, string>>(new Map());

  const atCap = selected.size >= availableResends;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInvitationGuests(
        invitationId,
        {
          page,
          per_page: PER_PAGE,
          keyword: debouncedSearch || undefined,
          status: tab === 'rejected' ? 'rejected' : 'pending',
        },
        token
      );
      setGuests(res.data.items.filter((g) => isEligible(g, tab)));
      setTotalPages(res.data.pagination.last_page);
    } catch (err) {
      toast.error((err as Error).message || t('guestsLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [invitationId, token, page, debouncedSearch, tab, t]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  const toggle = (guest: InvitationGuest) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(guest.id)) {
        next.delete(guest.id);
        return next;
      }
      // Hard stop at the credit on hand — the API rejects an over-sized request.
      if (next.size >= availableResends) {
        toast.warning(t('replacementLimitReached').replace('{count}', String(availableResends)));
        return prev;
      }
      next.set(guest.id, guest.name);
      return next;
    });
  };

  const selectedIds = useMemo(() => Array.from(selected.keys()), [selected]);

  const submit = async () => {
    if (selectedIds.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const ok = await onSubmit(selectedIds);
      if (ok) {
        onClose();
      } else {
        // A rejected send may have been about the selection itself (ineligible
        // ids), so clear it and let the refreshed list drive the next attempt.
        setSelected(new Map());
        fetchGuests();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm p-4 bg-black/20"
      onClick={submitting ? undefined : onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        dir={dir}
        className="w-full max-w-lg glass-panel rounded-3xl relative z-10 shadow-2xl p-6 sm:p-8 text-start flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5" />
          </span>
          <h3 className="text-lg font-bold text-secondary">
            {t('sendReplacementInvitations')}
            <span className="ms-2 text-sm font-medium text-primary">
              ({t('availableResendsShort').replace('{count}', String(availableResends))})
            </span>
          </h3>
        </div>
        <p className="text-xs text-secondary/50 mb-4">{t('replacementSendHint')}</p>

        {/* Eligible guests come in two flavours; the tab is also the API filter. */}
        <div className="flex gap-2 p-1 bg-secondary/5 rounded-2xl w-fit mb-4">
          <button
            type="button"
            onClick={() => { setTab('rejected'); setPage(1); }}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer',
              tab === 'rejected' ? 'bg-white text-secondary shadow-sm' : 'text-secondary/60 hover:text-secondary'
            )}
          >
            <XCircle className="w-3.5 h-3.5" />
            {t('declined')}
          </button>
          <button
            type="button"
            onClick={() => { setTab('unsent'); setPage(1); }}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer',
              tab === 'unsent' ? 'bg-white text-secondary shadow-sm' : 'text-secondary/60 hover:text-secondary'
            )}
          >
            <UserPlus className="w-3.5 h-3.5" />
            {t('notSentYet')}
          </button>
        </div>

        <div className="relative mb-3">
          <Search className={cn('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40', dir === 'ltr' ? 'left-4' : 'right-4')} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchByGuestNamePhone')}
            className={cn(
              'w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-2.5 text-sm transition-all outline-none text-secondary',
              dir === 'ltr' ? 'pl-10 pr-4' : 'pr-10 pl-4'
            )}
          />
        </div>

        {/* Counter — «selected: 3 / 10» */}
        <div className="flex items-center justify-between mb-3">
          <span className={cn('text-xs font-bold', atCap ? 'text-amber-600' : 'text-secondary/60')}>
            {t('selectedCount').replace('{selected}', String(selected.size)).replace('{total}', String(availableResends))}
          </span>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => setSelected(new Map())}
              className="text-xs font-medium text-secondary/50 hover:text-secondary transition-colors cursor-pointer"
            >
              {t('clearSelection')}
            </button>
          )}
        </div>

        <div className="flex-1 min-h-[140px] overflow-y-auto relative flex flex-col gap-2 pe-1">
          {loading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] rounded-2xl flex items-center justify-center z-10">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
            </div>
          )}

          {guests.map((guest) => {
            const isSelected = selected.has(guest.id);
            // Rows beyond the cap stay visible but inert, so the limit reads as a
            // limit rather than as a list that mysteriously shrank.
            const isBlocked = !isSelected && atCap;
            return (
              <button
                type="button"
                key={guest.id}
                onClick={() => toggle(guest)}
                disabled={isBlocked}
                className={cn(
                  'w-full p-3 rounded-2xl flex items-center gap-3 border transition-colors text-start',
                  isSelected
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-white/60 border-secondary/5 hover:bg-white',
                  isBlocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                )}
              >
                <span
                  className={cn(
                    'w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors',
                    isSelected ? 'bg-primary border-primary text-white' : 'bg-white border-secondary/20'
                  )}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </span>
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-semibold text-secondary truncate">{guest.name}</span>
                  <span
                    className="text-xs text-secondary/60"
                    dir="ltr"
                    style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}
                  >
                    {guest.full_phone}
                  </span>
                </span>
                <span className="ms-auto text-[11px] font-medium text-secondary/50 shrink-0">
                  {guest.status_label}
                </span>
              </button>
            );
          })}

          {!loading && guests.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-2">
              <AlertCircle className="w-8 h-8 text-secondary/25" />
              <p className="text-sm text-secondary/50">{t('noEligibleGuests')}</p>
            </div>
          )}
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-3">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-xl bg-white border border-secondary/10 text-secondary/60 hover:text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {dir === 'ltr' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <span className="text-xs text-secondary/60 font-mono px-2">{page} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-xl bg-white border border-secondary/10 text-secondary/60 hover:text-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {dir === 'ltr' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        )}

        <div className="flex gap-3 pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-3 text-sm font-medium text-secondary/70 bg-white/60 hover:bg-white border border-secondary/15 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={selectedIds.length === 0 || submitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer shadow-md shadow-primary/20"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {t('confirmReplacementSend').replace('{count}', String(selectedIds.length))}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
