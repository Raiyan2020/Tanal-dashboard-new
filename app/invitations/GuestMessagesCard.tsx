'use client';

import React, { useRef, useState } from 'react';
import { MessageSquare, Loader2, RotateCcw, ThumbsUp, ThumbsDown, Send, BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { usePermissions } from '@/hooks/use-permissions';
import {
  updateInvitationGuestMessages,
  ApiError,
  type InvitationDetailData,
  type InvitationGuestMessages,
  type UpdateInvitationGuestMessagesPayload,
} from '@/lib/api';

interface GuestMessagesCardProps {
  invitationId: number;
  /**
   * Absent on API builds that predate the guest-message overrides — the card
   * then falls back to `FALLBACK_MESSAGES` so the editor is still usable.
   */
  messages?: InvitationGuestMessages | null;
  /** Renders `{invitation_name}` in the previews. */
  invitationName: string;
  token: string;
  /** Receives the refreshed detail payload the PATCH returns. */
  onSaved: (detail: InvitationDetailData) => void;
}

/**
 * The editable messages, grouped by where the guest meets them: the two
 * WhatsApp sends first, then the two confirmations shown on the guest page.
 */
type MessageKey =
  | 'whatsapp_message'
  | 'reminder_message'
  | 'accept_message'
  | 'reject_message';

const FIELDS: {
  key: MessageKey;
  icon: typeof Send;
  labelKey: string;
  hintKey: string;
  rows: number;
}[] = [
  { key: 'whatsapp_message', icon: Send, labelKey: 'guestWhatsappMessage', hintKey: 'guestWhatsappMessageHint', rows: 4 },
  { key: 'reminder_message', icon: BellRing, labelKey: 'guestReminderMessage', hintKey: 'guestReminderMessageHint', rows: 3 },
  { key: 'accept_message', icon: ThumbsUp, labelKey: 'guestAcceptMessage', hintKey: 'guestAcceptMessageHint', rows: 2 },
  { key: 'reject_message', icon: ThumbsDown, labelKey: 'guestRejectMessage', hintKey: 'guestRejectMessageHint', rows: 2 },
];

/**
 * Readable label per placeholder token. The token itself is inserted and saved —
 * the backend substitutes it — so only the chip text is localised. Tokens the
 * backend adds later fall through to their raw form.
 */
const PLACEHOLDER_LABELS: Record<string, string> = {
  '{guest_name}': 'placeholderGuestName',
  '{event_name}': 'placeholderEventName',
  '{invitation_name}': 'placeholderInvitationName',
};

const MAX_LENGTH = 1000;

/**
 * Stand-in for the `guest_messages` block until the API serves it.
 *
 * ⚠️ Not a source of truth. `defaults` here only fills the textarea
 * placeholders so the admin can read roughly what guests get today; the real
 * wording lives in the backend's `lang/{ar,en}/invitations.php`, and the moment
 * the API returns `guest_messages.defaults` **that** is what shows. Kept as
 * close to the current lang strings as makes sense in the editor — the `:link`
 * line is dropped because the invitation link is appended automatically.
 */
const FALLBACK_MESSAGES: Record<'ar' | 'en', InvitationGuestMessages> = {
  ar: {
    whatsapp_message: null,
    reminder_message: null,
    accept_message: null,
    reject_message: null,
    placeholders: ['{guest_name}', '{event_name}', '{invitation_name}'],
    defaults: {
      whatsapp_message: 'مرحباً {guest_name} 👋\n\nيسعدنا دعوتك لحضور: {event_name}',
      reminder_message: 'تذكير ⏰\n\nمرحباً {guest_name}\n\nتذكير بمناسبتك غداً: {event_name}',
      accept_message: 'تم تأكيد حضورك. نتطلع لرؤيتك!',
      reject_message: 'تم تسجيل اعتذارك عن الحضور.',
    },
  },
  en: {
    whatsapp_message: null,
    reminder_message: null,
    accept_message: null,
    reject_message: null,
    placeholders: ['{guest_name}', '{event_name}', '{invitation_name}'],
    defaults: {
      whatsapp_message: 'Hello {guest_name} 👋\n\nYou are invited to: {event_name}',
      reminder_message: 'Reminder ⏰\n\nHello {guest_name}\n\nYour event is tomorrow: {event_name}',
      accept_message: 'Your attendance has been confirmed. See you there!',
      reject_message: 'Your regrets have been recorded.',
    },
  },
};

/**
 * Overrides the copy the guest sees: the WhatsApp invitation, the day-before
 * WhatsApp reminder, and the confirmations shown on the guest page after they
 * accept or decline.
 *
 * Each field is an override — empty means the backend's own Arabic default is
 * used, which is shown as the input's placeholder so the admin can see what
 * guests get today before replacing it.
 *
 * Editing stays available after the invitation is sent, matching the check-in
 * welcome message: the accept/reject texts are only read once guests respond.
 * A changed WhatsApp text applies to later sends only — messages already
 * delivered cannot be recalled — which the hint says out loud.
 */
export function GuestMessagesCard({
  invitationId,
  messages: served,
  invitationName,
  token,
  onSaved,
}: GuestMessagesCardProps) {
  const { t, dir, language } = useLanguage();
  const { can } = usePermissions();
  const editable = can('edit-invitation');

  const messages = served ?? FALLBACK_MESSAGES[language === 'ar' ? 'ar' : 'en'];

  const refs = useRef<Partial<Record<MessageKey, HTMLTextAreaElement | null>>>({});
  /** Which textarea a placeholder chip should insert into. */
  const [activeField, setActiveField] = useState<MessageKey>('whatsapp_message');

  const saved = (key: MessageKey) => messages[key] ?? '';

  const [draft, setDraft] = useState<Record<MessageKey, string>>({
    whatsapp_message: saved('whatsapp_message'),
    reminder_message: saved('reminder_message'),
    accept_message: saved('accept_message'),
    reject_message: saved('reject_message'),
  });
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<MessageKey, string>>>({});

  const dirtyKeys = FIELDS
    .map(f => f.key)
    .filter(key => draft[key].trim() !== saved(key).trim());

  const setField = (key: MessageKey, value: string) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setFieldErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  /** Inserts a placeholder at the caret of the last-focused textarea. */
  const insertPlaceholder = (placeholder: string) => {
    const key = activeField;
    const el = refs.current[key];
    if (!el) {
      setField(key, draft[key] + placeholder);
      return;
    }
    const current = draft[key];
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    setField(key, current.slice(0, start) + placeholder + current.slice(end));
    // Restore the caret after React has re-rendered with the new value.
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + placeholder.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const renderPreview = (value: string) =>
    value
      .replaceAll('{guest_name}', dir === 'ltr' ? 'Ahmed' : 'أحمد')
      .replaceAll('{invitation_name}', invitationName);

  const handleSave = async () => {
    if (!token || saving || dirtyKeys.length === 0) return;

    // Only the changed fields go out. A cleared field is sent as `null` so the
    // backend drops the override rather than storing an empty string.
    const payload: UpdateInvitationGuestMessagesPayload = {};
    for (const key of dirtyKeys) {
      const value = draft[key].trim();
      payload[key] = value === '' ? null : value;
    }

    setSaving(true);
    setFieldErrors({});
    try {
      const res = await updateInvitationGuestMessages(invitationId, payload, token);
      toast.success(res.msg || t('guestMessagesSaved'));
      onSaved(res.data);
    } catch (err) {
      if (err instanceof ApiError) {
        const next: Partial<Record<MessageKey, string>> = {};
        for (const { key } of FIELDS) {
          const message = err.fieldError(key);
          if (message) next[key] = message;
        }
        setFieldErrors(next);
      }
      toast.error((err as Error).message || t('guestMessagesSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-3xl">
      <h3 className="font-semibold text-secondary mb-1 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" />
        {t('guestMessages')}
      </h3>
      <p className="text-xs text-secondary/50 mb-4">{t('guestMessagesHint')}</p>

      {editable && messages.placeholders.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-[11px] text-secondary/40 font-medium">
            {t('checkInPlaceholdersLabel')}
          </span>
          {messages.placeholders.map(placeholder => {
            const labelKey = PLACEHOLDER_LABELS[placeholder];
            return (
              <button
                key={placeholder}
                type="button"
                // Chips steal focus from the textarea, so the caret position is
                // captured on mousedown — before the blur — and the click is
                // suppressed from moving focus at all.
                onMouseDown={event => event.preventDefault()}
                onClick={() => insertPlaceholder(placeholder)}
                title={placeholder}
                className={cn(
                  'px-2.5 py-1 rounded-lg bg-primary/8 hover:bg-primary/15 text-primary text-[11px] transition-colors cursor-pointer',
                  labelKey ? 'font-medium' : 'font-mono'
                )}
              >
                {labelKey ? t(labelKey) : placeholder}
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-5">
        {FIELDS.map(({ key, icon: Icon, labelKey, hintKey, rows }) => {
          const value = draft[key];
          const usingDefault = value.trim() === '';
          const preview = renderPreview(value);

          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
                  <Icon className="w-4 h-4 text-secondary/40" />
                  {t(labelKey)}
                </label>
                {usingDefault && (
                  <span className="px-2 py-0.5 rounded-md bg-secondary/8 text-[10px] font-medium text-secondary/50">
                    {t('usingDefault')}
                  </span>
                )}
                {!usingDefault && editable && (
                  <button
                    type="button"
                    onClick={() => setField(key, '')}
                    className="ms-auto flex items-center gap-1 text-[11px] text-secondary/45 hover:text-secondary/70 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {t('resetToDefault')}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-secondary/45 leading-relaxed">{t(hintKey)}</p>

              <textarea
                ref={el => { refs.current[key] = el; }}
                value={value}
                onChange={event => setField(key, event.target.value)}
                onFocus={() => setActiveField(key)}
                disabled={!editable || saving}
                rows={rows}
                maxLength={MAX_LENGTH}
                // The backend default doubles as the placeholder, so the admin
                // can read the current wording before overriding it.
                placeholder={messages.defaults[key]}
                className={cn(
                  'w-full bg-white/50 border rounded-2xl px-4 py-3 text-sm text-secondary outline-none transition-all resize-none',
                  'focus:ring-2 focus:ring-primary/20 disabled:opacity-60 disabled:cursor-not-allowed',
                  fieldErrors[key]
                    ? 'border-red-300 focus:border-red-400'
                    : 'border-white/60 focus:border-primary/50'
                )}
              />

              {fieldErrors[key] && (
                <p className="text-xs text-red-600">{fieldErrors[key]}</p>
              )}

              {/* Newlines matter in a WhatsApp message, so the preview keeps them. */}
              {preview.trim() !== '' && (
                <div className="p-3 rounded-2xl bg-white/40 border border-secondary/5">
                  <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-wider mb-1">
                    {t('checkInPreview')}
                  </p>
                  <p className="text-sm text-secondary whitespace-pre-wrap break-words">
                    {preview}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {editable && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || dirtyKeys.length === 0}
            className="w-full py-3 rounded-2xl bg-primary text-white text-sm font-medium shadow-md shadow-primary/20 hover:bg-primary-dark transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('saveGuestMessages')}
          </button>
        )}
      </div>
    </div>
  );
}
