import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, RefreshCw, Upload, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';
import { uploadInvitationDesign } from '@/lib/api';
import { type FormState, isInvitationDesignExpired } from '@/lib/service-order-form';

interface InvitationDesignSectionProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  token: string;
  error?: string;
}

const ACCEPTED = 'image/png,image/jpeg,image/webp';
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * The QR/barcode service requires its invitation design to be uploaded *before*
 * the order is created: the upload returns a single-use token that is then sent
 * as `invitation_design_token`. The token expires after roughly an hour, so a
 * long-lived form may need a re-upload before it can be submitted.
 */
export function InvitationDesignSection({
  form,
  setForm,
  token,
  error,
}: InvitationDesignSectionProps) {
  const { t, language } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');

  const expired = isInvitationDesignExpired(form);
  const hasDesign = !!form.invitationDesignToken && !expired;

  const upload = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error(t('designTooLarge'));
      return;
    }
    setUploading(true);
    try {
      const res = await uploadInvitationDesign(file, token);
      setForm(prev => ({
        ...prev,
        invitationDesignToken: res.data.design_token,
        invitationDesignPreviewUrl: res.data.preview_url,
        invitationDesignExpiresAt: res.data.expires_at,
      }));
      setFileName(file.name);
      toast.success(t('designUploaded'));
    } catch (err) {
      toast.error((err as Error).message || t('designUploadFailed'));
    } finally {
      setUploading(false);
      // Allow re-selecting the same file after a failure.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  const expiryLabel = form.invitationDesignExpiresAt
    ? new Date(form.invitationDesignExpiresAt).toLocaleTimeString(
        language === 'ar' ? 'ar-EG' : 'en-US',
        { hour: '2-digit', minute: '2-digit' }
      )
    : null;

  return (
    <div className="space-y-2 border-t border-secondary/10 pt-4">
      <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
        <ImageIcon className="w-4 h-4 text-secondary/40" />
        {t('invitationDesign')} <span className="text-red-500">*</span>
      </label>
      <p className="text-xs text-secondary/45">{t('invitationDesignHint')}</p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={onPick}
        className="hidden"
      />

      {hasDesign ? (
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/50 border border-secondary/15">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-secondary/5 shrink-0 flex items-center justify-center">
            {form.invitationDesignPreviewUrl ? (
              <img
                src={form.invitationDesignPreviewUrl}
                alt=""
                className="object-cover w-full h-full"
              />
            ) : (
              <ImageIcon className="w-5 h-5 text-secondary/30" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-secondary truncate">
              {fileName || t('invitationDesign')}
            </p>
            {expiryLabel && (
              <p className="text-[11px] text-secondary/45">
                {t('designValidUntil')} {expiryLabel}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-secondary/15 text-secondary/70 hover:text-secondary text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {t('replaceDesign')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border-2 border-dashed border-secondary/20 bg-white/30 hover:bg-white/60 hover:border-primary/40 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : (
            <Upload className="w-6 h-6 text-secondary/40" />
          )}
          <span className="text-sm font-medium text-secondary/70">
            {uploading ? t('designUploading') : t('uploadDesign')}
          </span>
          <span className="text-[11px] text-secondary/40">{t('uploadDesignDesc')}</span>
        </button>
      )}

      {expired && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200/70">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800">{t('designExpired')}</p>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}
