'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, Users, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { updateInvitationGuestCompanions, ApiError } from '@/lib/api';

/**
 * Only what the modal needs. Deliberately structural rather than either
 * `InvitationGuest` type — the detail page keeps its own view-model, and the
 * API has a fuller one; both satisfy this.
 */
export interface CompanionsGuest {
  id: string | number;
  name: string;
  companions_count?: number;
  companions_counted_in_allowance?: boolean;
}

interface GuestCompanionsModalProps {
  invitationId: number;
  token: string;
  guest: CompanionsGuest;
  /** Package allowance, for the live "will this overflow?" readout. */
  guestsIncluded?: number | null;
  /** Seats already counted across the whole invitation, excluding this guest's. */
  countedElsewhere?: number | null;
  onClose: () => void;
  onSaved: () => void;
}

const MAX_COMPANIONS = 50;

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm';

/**
 * Sets how many companions arrive on one guest's QR, and whether they count
 * against the event's paid guest allowance.
 *
 * The two are deliberately separate: companions always walk through the door
 * with the guest (so the venue headcount includes them), but whether they are
 * *billed* against `guests_included` is the admin's call — some are absorbed as
 * a courtesy. Hence the toggle rather than a single number.
 */
export function GuestCompanionsModal({
  invitationId,
  token,
  guest,
  guestsIncluded,
  countedElsewhere,
  onClose,
  onSaved,
}: GuestCompanionsModalProps) {
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  const [count, setCount] = useState(guest.companions_count ?? 0);
  const [counted, setCounted] = useState(
    guest.companions_counted_in_allowance ?? true,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escape to close, matching the other overlays in this module.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  /**
   * What the invitation would total against the allowance if this were saved:
   * everyone else's counted seats, plus this guest, plus their companions when
   * the toggle is on.
   */
  const projectedTotal =
    countedElsewhere == null ? null : countedElsewhere + 1 + (counted ? count : 0);
  const overflows =
    projectedTotal != null && guestsIncluded != null && projectedTotal > guestsIncluded;

  const clamp = (value: number) =>
    Math.max(0, Math.min(MAX_COMPANIONS, Number.isFinite(value) ? value : 0));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setError(null);
    try {
      const res = await updateInvitationGuestCompanions(
        invitationId,
        Number(guest.id),
        {
          companions_count: count,
          // Meaningless with no companions, but sent anyway so the stored flag
          // matches what the admin last chose if they add some later.
          companions_counted_in_allowance: counted,
        },
        token,
      );
      toast.success(res.msg || t('companionsSaved'));
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.fieldError('companions_count') ?? null);
      }
      toast.error((err as Error).message || t('companionsSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm p-4 bg-black/20"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md glass-panel rounded-3xl relative z-10 shadow-2xl p-6 sm:p-8 text-start"
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Users className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-secondary">{t('companions')}</h3>
            <p className="text-xs text-secondary/50">{guest.name}</p>
          </div>
        </div>

        <p className="text-xs text-secondary/50 leading-relaxed mb-5">
          {t('companionsHint')}
        </p>

        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-secondary/80">
              {t('companionsCount')}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCount(c => clamp(c - 1))}
                disabled={count <= 0}
                className="w-11 h-11 shrink-0 rounded-xl bg-white/60 border border-secondary/15 text-secondary/70 text-lg font-medium hover:bg-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_COMPANIONS}
                value={count}
                onChange={e => setCount(clamp(Number(e.target.value)))}
                className={`${inputClass} text-center font-mono`}
              />
              <button
                type="button"
                onClick={() => setCount(c => clamp(c + 1))}
                disabled={count >= MAX_COMPANIONS}
                className="w-11 h-11 shrink-0 rounded-xl bg-white/60 border border-secondary/15 text-secondary/70 text-lg font-medium hover:bg-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          {/* The allowance toggle — only meaningful once there is a companion. */}
          {count > 0 && (
            <label
              className={cn(
                'flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-colors',
                counted
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-secondary/15 bg-white/50 hover:bg-white/80',
              )}
            >
              <input
                type="checkbox"
                checked={counted}
                onChange={e => setCounted(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium text-secondary">
                  {t('companionsCounted')}
                </span>
                <span className="block text-xs text-secondary/55 mt-0.5 leading-relaxed">
                  {t('companionsCountedHint')}
                </span>
              </span>
            </label>
          )}

          {/* Live projection against the package allowance. */}
          {projectedTotal != null && (
            <div
              className={cn(
                'flex items-start gap-2.5 p-3 rounded-2xl border',
                overflows
                  ? 'bg-amber-50 border-amber-200/70'
                  : 'bg-white/40 border-secondary/10',
              )}
            >
              <Info
                className={cn(
                  'w-4 h-4 shrink-0 mt-0.5',
                  overflows ? 'text-amber-600' : 'text-secondary/40',
                )}
              />
              <p
                className={cn(
                  'text-xs leading-relaxed',
                  overflows ? 'text-amber-800' : 'text-secondary/60',
                )}
              >
                {isAr
                  ? `الإجمالي المحسوب على المناسبة: ${projectedTotal}`
                  : `Counted toward this event: ${projectedTotal}`}
                {guestsIncluded != null && (
                  <>
                    {isAr ? ` من ${guestsIncluded}` : ` of ${guestsIncluded}`}
                    {overflows && (isAr ? ' — تجاوز العدد المتاح' : ' — over the allowance')}
                  </>
                )}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-medium text-secondary/70 bg-white/60 hover:bg-white border border-secondary/15 rounded-xl transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer shadow-md shadow-primary/20"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('save')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
