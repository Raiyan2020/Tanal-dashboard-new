'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, UserPlus } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { COUNTRIES } from '@/lib/countries';
import {
  createInvitationGuest,
  updateInvitationGuest,
  ApiError,
  type InvitationGuest,
} from '@/lib/api';
import { toast } from 'sonner';

export interface GuestFormValues {
  id?: number;
  name: string;
  countryCode: string;
  phone: string;
}

interface GuestFormModalProps {
  invitationId: number;
  token: string;
  /** Omit to add a new guest; pass values to edit an existing one. */
  guest?: GuestFormValues | null;
  onClose: () => void;
  onSaved: (guest: InvitationGuest) => void;
}

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm';

/**
 * The guest list only carries a combined `full_phone`, so an edit has to split
 * it back apart. Longest matching dial code wins, since e.g. `+1` prefixes
 * several longer codes. Falls back to Kuwait with the number left intact.
 */
function splitFullPhone(full: string): { countryCode: string; phone: string } {
  const trimmed = (full ?? '').replace(/[\s-]/g, '');
  const match = COUNTRIES
    .filter(c => trimmed.startsWith(c.code))
    .sort((a, b) => b.code.length - a.code.length)[0];
  return match
    ? { countryCode: match.code, phone: trimmed.slice(match.code.length) }
    : { countryCode: '+965', phone: trimmed };
}

export function GuestFormModal({
  invitationId,
  token,
  guest,
  onClose,
  onSaved,
}: GuestFormModalProps) {
  const { t, dir } = useLanguage();
  const editing = !!guest?.id;

  // An edit arrives with a combined number and no country code; a fresh add
  // arrives empty. Both resolve through the same split.
  const initialPhone = guest?.countryCode
    ? { countryCode: guest.countryCode, phone: guest.phone ?? '' }
    : splitFullPhone(guest?.phone ?? '');

  const [name, setName] = useState(guest?.name ?? '');
  const [countryCode, setCountryCode] = useState(initialPhone.countryCode);
  const [phone, setPhone] = useState(initialPhone.phone);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  // Close on Escape, matching the other overlays in this module.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = t('nameRequired');
    if (!phone.trim()) nextErrors.phone = t('phoneRequired');
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        country_code: countryCode,
        phone: phone.trim(),
        // Every guest is treated as reachable on WhatsApp — the field is no
        // longer exposed in the form, but the API still requires it.
        have_whatsapp: true,
      };
      const res = editing
        ? await updateInvitationGuest(invitationId, guest!.id!, payload, token)
        : await createInvitationGuest(invitationId, payload, token);

      toast.success(res.msg || (editing ? t('guestUpdated') : t('guestAdded')));
      onSaved(res.data);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({
          name: err.fieldError('name'),
          phone: err.fieldError('phone') ?? err.fieldError('country_code'),
        });
      }
      toast.error((err as Error).message || t('guestSaveFailed'));
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
        <div className="flex items-center gap-3 mb-6">
          <span className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </span>
          <h3 className="text-lg font-bold text-secondary">
            {editing ? t('editGuest') : t('addGuest')}
          </h3>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-secondary/80">
              {t('name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className={inputClass}
              autoFocus
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-secondary/80">
              {t('phoneNumber')} <span className="text-red-500">*</span>
            </label>
            <div className={dir === 'rtl' ? 'flex gap-2 flex-row-reverse' : 'flex gap-2'}>
              <select
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
                className="px-2 py-3 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary/50 outline-none text-secondary text-sm cursor-pointer shrink-0 w-28"
                dir="ltr"
              >
                {COUNTRIES.map(c => (
                  <option key={c.iso} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                dir="ltr"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="50123456"
                className={`${inputClass} font-mono`}
              />
            </div>
            {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
          </div>

          <div className="flex gap-3 pt-3">
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
