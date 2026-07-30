'use client';

import React, { useRef, useState } from 'react';
import { MonitorPlay, Copy, Check, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { usePermissions } from '@/hooks/use-permissions';
import {
  updateInvitationCheckInWelcomeMessage,
  ApiError,
  type CheckInDisplay,
  type InvitationDetailData,
} from '@/lib/api';

interface CheckInWelcomeCardProps {
  invitationId: number;
  display: CheckInDisplay;
  /** Name used to render `{invitation_name}` in the preview. */
  invitationName: string;
  token: string;
  /** Receives the refreshed detail payload the PATCH returns. */
  onSaved: (detail: InvitationDetailData) => void;
}

/**
 * Welcome message + venue screen link for the check-in display.
 *
 * Editing is gated on `edit-invitation` rather than the invitation's own
 * `can_be_edited` flag: the backend keeps this endpoint open after the
 * invitation is sent, which is exactly when the venue screen gets set up.
 */
export function CheckInWelcomeCard({
  invitationId,
  display,
  invitationName,
  token,
  onSaved,
}: CheckInWelcomeCardProps) {
  const { t, dir } = useLanguage();
  const { can } = usePermissions();
  const editable = can('edit-invitation');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState(display.welcome_message ?? '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const dirty = message !== (display.welcome_message ?? '');

  /** Inserts a placeholder at the caret, keeping focus and selection sensible. */
  const insertPlaceholder = (placeholder: string) => {
    const el = textareaRef.current;
    if (!el) {
      setMessage((prev) => prev + placeholder);
      return;
    }
    const start = el.selectionStart ?? message.length;
    const end = el.selectionEnd ?? message.length;
    const next = message.slice(0, start) + placeholder + message.slice(end);
    setMessage(next);
    setFieldError(null);
    // Restore the caret after React has re-rendered with the new value.
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + placeholder.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const preview = message
    .replaceAll('{guest_name}', dir === 'ltr' ? 'Ahmed' : 'أحمد')
    .replaceAll('{invitation_name}', invitationName);

  const handleSave = async () => {
    if (!token || saving) return;
    setSaving(true);
    setFieldError(null);
    try {
      const res = await updateInvitationCheckInWelcomeMessage(invitationId, message.trim(), token);
      toast.success(res.msg || t('welcomeMessageSaved'));
      onSaved(res.data);
    } catch (err) {
      if (err instanceof ApiError) {
        // Surface min:3 / max:1000 under the field instead of only as a toast.
        setFieldError(err.fieldError('message') ?? null);
      }
      toast.error((err as Error).message || t('welcomeMessageSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(display.display_url);
      setCopied(true);
      toast.success(t('linkCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('copyFailed'));
    }
  };

  return (
    <div className="glass-panel p-6 rounded-3xl">
      <h3 className="font-semibold text-secondary mb-1 flex items-center gap-2">
        <MonitorPlay className="w-5 h-5 text-primary" />
        {t('checkInWelcome')}
      </h3>
      <p className="text-xs text-secondary/50 mb-4">{t('checkInWelcomeHint')}</p>

      {/* No default message exists server-side, so an unconfigured screen shows
          nothing at all on a scan — worth calling out explicitly. */}
      {!display.is_configured && (
        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50 border border-amber-200 mb-4">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">{t('checkInNotConfigured')}</p>
        </div>
      )}

      <div className="space-y-3">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => { setMessage(e.target.value); setFieldError(null); }}
          disabled={!editable || saving}
          rows={3}
          maxLength={1000}
          placeholder={t('checkInWelcomePlaceholder')}
          className={cn(
            'w-full bg-white/50 border rounded-2xl px-4 py-3 text-sm text-secondary outline-none transition-all resize-none',
            'focus:ring-2 focus:ring-primary/20 disabled:opacity-60 disabled:cursor-not-allowed',
            fieldError ? 'border-red-300 focus:border-red-400' : 'border-white/60 focus:border-primary/50'
          )}
        />

        {fieldError && <p className="text-xs text-red-600 -mt-1">{fieldError}</p>}

        {editable && display.placeholders.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-secondary/40 font-medium">
              {t('checkInPlaceholdersLabel')}
            </span>
            {display.placeholders.map((placeholder) => (
              <button
                key={placeholder}
                type="button"
                onClick={() => insertPlaceholder(placeholder)}
                className="px-2.5 py-1 rounded-lg bg-primary/8 hover:bg-primary/15 text-primary text-[11px] font-mono transition-colors cursor-pointer"
              >
                {placeholder}
              </button>
            ))}
          </div>
        )}

        {preview.trim() && (
          <div className="p-3 rounded-2xl bg-white/40 border border-secondary/5">
            <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-wider mb-1">
              {t('checkInPreview')}
            </p>
            <p className="text-sm text-secondary font-medium break-words">{preview}</p>
          </div>
        )}

        {editable && (
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving || message.trim().length === 0}
            className="w-full py-3 rounded-2xl bg-primary text-white text-sm font-medium shadow-md shadow-primary/20 hover:bg-primary-dark transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('saveWelcomeMessage')}
          </button>
        )}
      </div>

      {/* Venue screen link — a backend-hosted Blade page, so it is linked
          verbatim and never rebuilt from the token. */}
      <div className="mt-5 pt-5 border-t border-secondary/10">
        <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-wider mb-1">
          {t('checkInDisplayUrl')}
        </p>
        <p className="text-xs text-secondary/50 mb-3">{t('checkInDisplayUrlHint')}</p>
        <p
          className="text-[11px] font-mono text-secondary/70 bg-white/50 border border-secondary/8 rounded-xl px-3 py-2 mb-3 break-all"
          dir="ltr"
          style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}
        >
          {display.display_url}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/70 hover:bg-white border border-primary/20 text-primary text-xs font-medium transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? t('copied') : t('copy')}
          </button>
          <a
            href={display.display_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/5 hover:bg-secondary/10 border border-secondary/10 text-secondary text-xs font-medium transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t('openScreen')}
          </a>
        </div>
      </div>
    </div>
  );
}
