import React, { useRef, useState } from 'react';
import { AlertTriangle, Image as ImageIcon, Loader2, RefreshCw, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n';
import { uploadServiceOrderItemDesign } from '@/lib/api';
import {
  isServiceItemDesignExpired,
  type FormServiceItem,
  type FormState,
} from '@/lib/service-order-form';

interface ServiceItemDesignSectionProps {
  item: FormServiceItem;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  token: string;
  error?: string;
}

const MAX_BYTES = 10 * 1024 * 1024;

/** Uploads the primary design for one photobooth service-order item. */
export function ServiceItemDesignSection({
  item,
  setForm,
  token,
  error,
}: ServiceItemDesignSectionProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');

  const expired = isServiceItemDesignExpired(item);
  const previewUrl = !expired && item.designPreviewUrl
    ? item.designPreviewUrl
    : item.existingDesignUrl;
  const hasDesign = Boolean(previewUrl || (!expired && item.designToken));

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(isAr ? 'يرجى اختيار ملف صورة' : 'Please select an image file');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(isAr ? 'يجب ألا يتجاوز حجم التصميم 10 ميجابايت' : 'The design must be 10MB or smaller');
      return;
    }

    setUploading(true);
    const itemId = item.id;
    const serviceId = item.serviceId;
    try {
      const res = await uploadServiceOrderItemDesign(file, token);
      setForm(prev => {
        const index = prev.services.findIndex(row => row.id === itemId);
        if (index < 0 || prev.services[index].serviceId !== serviceId) return prev;

        const services = [...prev.services];
        services[index] = {
          ...services[index],
          designToken: res.data.design_token,
          designPreviewUrl: res.data.preview_url,
          designExpiresAt: res.data.expires_at,
        };
        return { ...prev, services };
      });
      setFileName(file.name);
      toast.success(isAr ? 'تم رفع تصميم الفوتوبوث' : 'Photobooth design uploaded');
    } catch (err) {
      toast.error(
        (err as Error).message
          || (isAr ? 'فشل رفع تصميم الفوتوبوث' : 'Failed to upload the photobooth design')
      );
    } finally {
      setUploading(false);
      // Allow choosing the same file again after a failed upload.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void upload(file);
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) void upload(file);
  };

  const expiryLabel = item.designExpiresAt
    ? new Date(item.designExpiresAt).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="space-y-2 pt-3 border-t border-secondary/10">
      <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
        <ImageIcon className="w-4 h-4 text-secondary/40" />
        {isAr ? 'تصميم الفوتوبوث' : 'Photobooth Design'}{' '}
        <span className="text-red-500">*</span>
      </label>
      <p className="text-xs text-secondary/45">
        {isAr
          ? 'ارفع صورة التصميم قبل حفظ الطلب. الحد الأقصى 10 ميجابايت.'
          : 'Upload the design image before saving the order. Maximum size is 10MB.'}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onPick}
        className="hidden"
      />

      {hasDesign ? (
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/50 border border-secondary/15">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary/5 shrink-0 flex items-center justify-center">
            {previewUrl ? (
              // API upload previews are arbitrary remote URLs, so use a plain image.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={isAr ? 'معاينة تصميم الفوتوبوث' : 'Photobooth design preview'}
                className="object-cover w-full h-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <ImageIcon className="w-5 h-5 text-secondary/30" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-secondary truncate">
              {fileName || (item.designToken
                ? (isAr ? 'التصميم الجديد' : 'New design')
                : (isAr ? 'التصميم الحالي' : 'Current design'))}
            </p>
            {item.designToken && expiryLabel && (
              <p className="text-[11px] text-secondary/45">
                {isAr ? 'صالح حتى' : 'Valid until'} {expiryLabel}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-secondary/15 text-secondary/70 hover:text-secondary text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {uploading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />}
            {isAr ? 'استبدال' : 'Replace'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={event => event.preventDefault()}
          onDrop={onDrop}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-2 py-7 rounded-2xl border-2 border-dashed border-secondary/20 bg-white/30 hover:bg-white/60 hover:border-primary/40 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
        >
          {uploading
            ? <Loader2 className="w-6 h-6 animate-spin text-primary" />
            : <Upload className="w-6 h-6 text-secondary/40" />}
          <span className="text-sm font-medium text-secondary/70">
            {uploading
              ? (isAr ? 'جارٍ رفع التصميم...' : 'Uploading design...')
              : (isAr ? 'رفع صورة التصميم' : 'Upload design image')}
          </span>
          <span className="text-[11px] text-secondary/40">
            {isAr ? 'اسحب الصورة هنا أو اضغط للاختيار' : 'Drop an image here or click to choose'}
          </span>
        </button>
      )}

      {expired && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200/70">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800">
            {isAr
              ? 'انتهت صلاحية التصميم الجديد. ارفعه مرة أخرى قبل الحفظ.'
              : 'The new design upload expired. Upload it again before saving.'}
          </p>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}
