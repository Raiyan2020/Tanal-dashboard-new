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
  /** The admin-set ceiling. Falls back to `companions_count` on pre-BR-17 API builds. */
  companions_max?: number;
  /** Effective seats: the guest's own answer, or the reserved ceiling. */
  companions_count?: number;
  companions_counted_in_allowance?: boolean;
  /** Has the guest picked their number yet? */
  companions_selected?: boolean;
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
 * Sets the **maximum** number of companions one guest may bring, and whether
 * those seats count against the event's paid guest allowance.
 *
 * The guest picks the actual number (0..max) on their own invitation page, so
 * this modal no longer decides how many people arrive — it decides how many
 * they are *allowed* to bring. Until they answer, the full ceiling stays
 * reserved against the allowance, which is why the projection below can read
 * higher than the event will end up being.
 *
 * The allowance toggle is separate on purpose: companions always walk through
 * the door with the guest (so the venue headcount includes them), but whether
 * they are *billed* against `guests_included` is the admin's call — some are
 * absorbed as a courtesy.
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

  /** The guest's own answer, if they gave one. */
  const hasChosen = guest.companions_selected === true;
  const chosen = guest.companions_count ?? 0;

  // Pre-BR-17 builds report no ceiling; the admin's old number was the ceiling
  // in all but name, so it is the right seed.
  const [max, setMax] = useState(guest.companions_max ?? guest.companions_count ?? 0);
  const [counted, setCounted] = useState(
    guest.companions_counted_in_allowance ?? true,
  );
  /** Let the guest choose again — the only way past the one-shot lock. */
  const [resetSelection, setResetSelection] = useState(false);
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
   * Seats this guest would hold after saving: their own answer while it still
   * stands, otherwise the reserved ceiling. Mirrors `applyCompanionsMax` on the
   * backend so the readout cannot disagree with what gets stored.
   */
  const effective = hasChosen && !resetSelection ? Math.min(chosen, max) : max;
  /** The saved answer is about to be trimmed because the ceiling dropped under it. */
  const clampsChoice = hasChosen && !resetSelection && chosen > max;
  /** The projected seats are a reservation, not a confirmed figure. */
  const isReservation = (!hasChosen || resetSelection) && max > 0;

  /**
   * What the invitation would total against the allowance if this were saved:
   * everyone else's counted seats, plus this guest, plus their companion seats
   * when the toggle is on.
   */
  const projectedTotal =
    countedElsewhere == null ? null : countedElsewhere + 1 + (counted ? effective : 0);
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
          companions_max: max,
          // Meaningless with no companions, but sent anyway so the stored flag
          // matches what the admin last chose if they add some later.
          companions_counted_in_allowance: counted,
          // Only sent when it means something — the guest has an answer on
          // record that the admin is deliberately clearing.
          ...(hasChosen && resetSelection ? { reset_selection: true } : {}),
        },
        token,
      );
      toast.success(res.msg || t('companionsSaved'));
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.fieldError('companions_max') ?? err.fieldError('companions_count') ?? null);
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
          {t('companionsMaxHint')}
        </p>

        {/* Where this guest stands: their own answer, or still pending. */}
        {max > 0 && (
          <div
            className={cn(
              'flex items-start gap-2.5 p-3 rounded-2xl border mb-5',
              hasChosen
                ? 'bg-primary/5 border-primary/25'
                : 'bg-white/40 border-secondary/10',
            )}
          >
            <Users
              className={cn(
                'w-4 h-4 shrink-0 mt-0.5',
                hasChosen ? 'text-primary' : 'text-secondary/40',
              )}
            />
            <p className="text-xs leading-relaxed text-secondary/70">
              {hasChosen
                ? t('companionsGuestChose').replace('{count}', String(chosen))
                : t('companionsGuestPending')}
            </p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-secondary/80">
              {t('companionsMax')}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMax(c => clamp(c - 1))}
                disabled={max <= 0}
                className="w-11 h-11 shrink-0 rounded-xl bg-white/60 border border-secondary/15 text-secondary/70 text-lg font-medium hover:bg-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_COMPANIONS}
                value={max}
                onChange={e => setMax(clamp(Number(e.target.value)))}
                className={`${inputClass} text-center font-mono`}
              />
              <button
                type="button"
                onClick={() => setMax(c => clamp(c + 1))}
                disabled={max >= MAX_COMPANIONS}
                className="w-11 h-11 shrink-0 rounded-xl bg-white/60 border border-secondary/15 text-secondary/70 text-lg font-medium hover:bg-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            {/* Dropping the ceiling under a saved answer trims it — say so before saving. */}
            {clampsChoice && (
              <p className="text-xs text-amber-700">
                {t('companionsClampsChoice')
                  .replace('{from}', String(chosen))
                  .replace('{to}', String(max))}
              </p>
            )}
          </div>

          {/* The allowance toggle — only meaningful once companions are allowed. */}
          {max > 0 && (
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

          {/* Reopening a locked answer — only offered when there is one. */}
          {hasChosen && (
            <label
              className={cn(
                'flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-colors',
                resetSelection
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-secondary/15 bg-white/50 hover:bg-white/80',
              )}
            >
              <input
                type="checkbox"
                checked={resetSelection}
                onChange={e => setResetSelection(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium text-secondary">
                  {t('companionsAllowReselect')}
                </span>
                <span className="block text-xs text-secondary/55 mt-0.5 leading-relaxed">
                  {t('companionsAllowReselectHint')}
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
                {/* The ceiling is held until the guest answers, so this is an
                    upper bound — without saying so, the number reads as final. */}
                {isReservation && (
                  <span className="block mt-1 text-secondary/50">
                    {t('companionsReservedNote').replace('{count}', String(max))}
                  </span>
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
