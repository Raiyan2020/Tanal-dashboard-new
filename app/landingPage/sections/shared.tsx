'use client';

import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Upload, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { Instagram, Twitter, Facebook, Linkedin, Youtube, Phone, Globe } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

// ── CSS class constants ───────────────────────────────────────────────────────

export const inputClass =
  'w-full px-4 py-2.5 rounded-xl bg-white/50 border border-secondary/20 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all text-sm';
export const labelClass =
  'block text-xs font-bold text-secondary/50 mb-1.5 uppercase tracking-wider';

// ── Social platforms registry ─────────────────────────────────────────────────

export const SOCIAL_PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram },
  { id: 'twitter', name: 'X / Twitter', icon: Twitter },
  { id: 'facebook', name: 'Facebook', icon: Facebook },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin },
  { id: 'youtube', name: 'YouTube', icon: Youtube },
  { id: 'whatsapp', name: 'WhatsApp', icon: Phone },
];

export const getSocialIcon = (platform: string) => {
  const found = SOCIAL_PLATFORMS.find(p => p.id === platform?.toLowerCase());
  return found ? found.icon : Globe;
};

// ── BilingualField ────────────────────────────────────────────────────────────

export const errorInputClass = 'border-red-400 focus:border-red-400 focus:ring-red-300/40';

export const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="mt-1.5 text-xs font-medium text-red-500">{message}</p> : null;

export const BilingualField = ({
  labelEn, labelAr, valueEn, valueAr, onChangeEn, onChangeAr, multiline, rows = 3,
  placeholderEn, placeholderAr, errorEn, errorAr,
}: {
  labelEn: string; labelAr: string;
  valueEn: string; valueAr: string;
  onChangeEn: (v: string) => void; onChangeAr: (v: string) => void;
  multiline?: boolean; rows?: number;
  placeholderEn?: string; placeholderAr?: string;
  errorEn?: string; errorAr?: string;
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div>
      <label className={labelClass}>{labelEn}</label>
      {multiline
        ? <textarea placeholder={placeholderEn} value={valueEn} onChange={e => onChangeEn(e.target.value)} dir="ltr" rows={rows} aria-invalid={!!errorEn} className={cn(inputClass, 'resize-none text-left', errorEn && errorInputClass)} />
        : <input type="text" placeholder={placeholderEn} value={valueEn} onChange={e => onChangeEn(e.target.value)} dir="ltr" aria-invalid={!!errorEn} className={cn(inputClass, 'text-left', errorEn && errorInputClass)} />}
      <FieldError message={errorEn} />
    </div>
    <div>
      <label className={labelClass}>{labelAr}</label>
      {multiline
        ? <textarea placeholder={placeholderAr} value={valueAr} onChange={e => onChangeAr(e.target.value)} dir="rtl" rows={rows} aria-invalid={!!errorAr} className={cn(inputClass, 'resize-none text-right font-arabic', errorAr && errorInputClass)} />
        : <input type="text" placeholder={placeholderAr} value={valueAr} onChange={e => onChangeAr(e.target.value)} dir="rtl" aria-invalid={!!errorAr} className={cn(inputClass, 'text-right font-arabic', errorAr && errorInputClass)} />}
      <FieldError message={errorAr} />
    </div>
  </div>
);

// ── ImageUploadBox ────────────────────────────────────────────────────────────

export const ImageUploadBox = ({
  url, onFile, onClear, aspect = 'aspect-video', label, error,
}: {
  url: string | null; onFile: (f: File) => void; onClear: () => void;
  aspect?: string; label?: string; error?: string;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  return (
    <div className="space-y-1.5">
      {label && <label className={labelClass}>{label}</label>}
      {url ? (
        <div className={cn('relative rounded-2xl overflow-hidden bg-secondary/5 group', aspect)}>
          <img src={url} alt="upload" className="w-full h-full object-cover absolute inset-0" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button type="button" onClick={() => ref.current?.click()}
              className="px-3 py-1.5 bg-white text-sm font-medium rounded-xl shadow cursor-pointer hover:bg-secondary/10 transition-colors">
              {t('lpReplaceImage')}
            </button>
            <button type="button" onClick={onClear}
              className="p-2 bg-red-500 text-white rounded-xl cursor-pointer hover:bg-red-600 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div onClick={() => ref.current?.click()}
          className={cn('rounded-2xl border-2 border-dashed border-secondary/20 flex flex-col items-center justify-center bg-white/30 text-secondary/50 hover:bg-primary/5 hover:border-primary/30 transition-colors cursor-pointer group', aspect, error && 'border-red-400 text-red-400')}>
          <Upload className="w-6 h-6 mb-2 group-hover:text-primary transition-colors" />
          <span className="text-sm font-medium group-hover:text-primary transition-colors">{t('lpUploadImage')}</span>
        </div>
      )}
      <FieldError message={error} />
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </div>
  );
};

// ── SectionSkeleton ───────────────────────────────────────────────────────────

export const SectionSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-secondary/8 rounded-2xl" />)}
  </div>
);

// ── DeleteConfirm modal ───────────────────────────────────────────────────────

export const DeleteConfirm = ({
  label, onConfirm, onCancel, loading,
}: {
  label: string; onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) => {
  const { t } = useLanguage();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onCancel}>
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm space-y-4">
        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <div className="text-center">
          <h3 className="font-bold text-secondary text-lg">{t('lpConfirmDelete')}</h3>
          <p className="text-sm text-secondary/60 mt-1">{t('lpConfirmDeleteMsg')} <span className="font-semibold text-secondary">{label}</span>؟</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-secondary/8 hover:bg-secondary/15 text-secondary text-sm font-semibold transition-colors cursor-pointer">
            {t('lpCancel')}
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {t('lpDelete')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
