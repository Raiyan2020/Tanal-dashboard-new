'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';
import { getLandingHero, updateLandingHero, type LandingHero } from '@/lib/api';
import { BilingualField, ImageUploadBox, SectionSkeleton, inputClass, labelClass } from './shared';

export default function HeroSection({ token }: { token: string }) {
  const { t } = useLanguage();
  const [hero, setHero] = useState<LandingHero | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getLandingHero(token)
      .then(r => setHero(r.data?.data ?? null))
      .catch(() => toast.error(t('noDataFound')))
      .finally(() => setLoading(false));
  }, [token, t]);

  const handleSave = async () => {
    if (!hero) return;
    setSaving(true);
    try {
      await updateLandingHero({
        title_ar: hero.title.ar,
        title_en: hero.title.en,
        subtitle_ar: hero.subtitle.ar,
        subtitle_en: hero.subtitle.en,
        primary_cta_label_ar: hero.primary_cta_label.ar,
        primary_cta_label_en: hero.primary_cta_label.en,
        primary_cta_url: hero.primary_cta_url,
        secondary_cta_label_ar: hero.secondary_cta_label.ar,
        secondary_cta_label_en: hero.secondary_cta_label.en,
        secondary_cta_url: hero.secondary_cta_url,
        image: imageFile,
      }, token);
      toast.success(t('lpSavedOk'));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleImageFile = (f: File) => {
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  if (loading) return <SectionSkeleton />;
  if (!hero) return null;

  return (
    <div className="space-y-6">
      <BilingualField
        labelEn={`${t('lpTitle')} (EN)`} labelAr={`${t('lpTitle')} (AR)`}
        valueEn={hero.title.en} valueAr={hero.title.ar}
        onChangeEn={v => setHero(h => h ? { ...h, title: { ...h.title, en: v } } : h)}
        onChangeAr={v => setHero(h => h ? { ...h, title: { ...h.title, ar: v } } : h)}
      />

      <BilingualField
        labelEn={`${t('lpSubtitle')} (EN)`} labelAr={`${t('lpSubtitle')} (AR)`}
        valueEn={hero.subtitle.en} valueAr={hero.subtitle.ar}
        onChangeEn={v => setHero(h => h ? { ...h, subtitle: { ...h.subtitle, en: v } } : h)}
        onChangeAr={v => setHero(h => h ? { ...h, subtitle: { ...h.subtitle, ar: v } } : h)}
        multiline rows={3}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <BilingualField
            labelEn={`${t('lpPrimaryCta')} (EN)`} labelAr={`${t('lpPrimaryCta')} (AR)`}
            valueEn={hero.primary_cta_label.en} valueAr={hero.primary_cta_label.ar}
            onChangeEn={v => setHero(h => h ? { ...h, primary_cta_label: { ...h.primary_cta_label, en: v } } : h)}
            onChangeAr={v => setHero(h => h ? { ...h, primary_cta_label: { ...h.primary_cta_label, ar: v } } : h)}
          />
          <label className={cn(labelClass, 'mt-3')}>{t('lpPrimaryCtaUrl')}</label>
          <input
            type="url" value={hero.primary_cta_url}
            onChange={e => setHero(h => h ? { ...h, primary_cta_url: e.target.value } : h)}
            dir="ltr" className={cn(inputClass, 'mt-1.5')}
          />
        </div>
        <div>
          <BilingualField
            labelEn={`${t('lpSecondaryCta')} (EN)`} labelAr={`${t('lpSecondaryCta')} (AR)`}
            valueEn={hero.secondary_cta_label.en} valueAr={hero.secondary_cta_label.ar}
            onChangeEn={v => setHero(h => h ? { ...h, secondary_cta_label: { ...h.secondary_cta_label, en: v } } : h)}
            onChangeAr={v => setHero(h => h ? { ...h, secondary_cta_label: { ...h.secondary_cta_label, ar: v } } : h)}
          />
          <label className={cn(labelClass, 'mt-3')}>{t('lpSecondaryCtaUrl')}</label>
          <input
            type="url" value={hero.secondary_cta_url}
            onChange={e => setHero(h => h ? { ...h, secondary_cta_url: e.target.value } : h)}
            dir="ltr" className={cn(inputClass, 'mt-1.5')}
          />
        </div>
      </div>

      <ImageUploadBox
        url={imagePreview ?? hero.image}
        label={t('lpHeroImage')}
        onFile={handleImageFile}
        onClear={() => { setImageFile(null); setImagePreview(null); setHero(h => h ? { ...h, image: null } : h); }}
      />

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? t('lpSaving') : t('lpSaveChanges')}
        </button>
      </div>
    </div>
  );
}
