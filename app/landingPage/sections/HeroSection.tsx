'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { getLandingHero, updateLandingHero, type LandingHero } from '@/lib/api';
import { BilingualField, ImageUploadBox, SectionSkeleton, inputClass, labelClass } from './shared';

interface BilingualHero {
  title: { ar: string; en: string };
  subtitle: { ar: string; en: string };
  primary_cta_label: { ar: string; en: string };
  primary_cta_url: string;
  secondary_cta_label: { ar: string; en: string };
  secondary_cta_url: string;
  image: string | null;
}

export default function HeroSection({ token }: { token: string }) {
  const { t, language } = useLanguage();
  const [hero, setHero] = useState<BilingualHero | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      getLandingHero(token, 'ar'),
      getLandingHero(token, 'en')
    ])
      .then(([resAr, resEn]) => {
        const arHero = (resAr.data as any)?.data || resAr.data;
        const enHero = (resEn.data as any)?.data || resEn.data;
        if (arHero && enHero) {
          setHero({
            title: {
              ar: (arHero.title && typeof arHero.title === 'object' ? arHero.title.ar : arHero.title) || '',
              en: (enHero.title && typeof enHero.title === 'object' ? enHero.title.en : enHero.title) || '',
            },
            subtitle: {
              ar: (arHero.subtitle && typeof arHero.subtitle === 'object' ? arHero.subtitle.ar : arHero.subtitle) || '',
              en: (enHero.subtitle && typeof enHero.subtitle === 'object' ? enHero.subtitle.en : enHero.subtitle) || '',
            },
            primary_cta_label: {
              ar: (arHero.primary_cta_label && typeof arHero.primary_cta_label === 'object' ? arHero.primary_cta_label.ar : arHero.primary_cta_label) || '',
              en: (enHero.primary_cta_label && typeof enHero.primary_cta_label === 'object' ? enHero.primary_cta_label.en : enHero.primary_cta_label) || '',
            },
            primary_cta_url: arHero.primary_cta_url || enHero.primary_cta_url || '',
            secondary_cta_label: {
              ar: (arHero.secondary_cta_label && typeof arHero.secondary_cta_label === 'object' ? arHero.secondary_cta_label.ar : arHero.secondary_cta_label) || '',
              en: (enHero.secondary_cta_label && typeof enHero.secondary_cta_label === 'object' ? enHero.secondary_cta_label.en : enHero.secondary_cta_label) || '',
            },
            secondary_cta_url: arHero.secondary_cta_url || enHero.secondary_cta_url || '',
            image: arHero.image || enHero.image || null,
          });
        } else {
          toast.error(t('noDataFound'));
        }
      })
      .catch(() => toast.error(t('noDataFound')))
      .finally(() => setLoading(false));
  }, [token, t]);

  const handleSave = async () => {
    if (!hero) return;

    const schema = z.object({
      titleAr: z.string().min(1, { message: language === 'ar' ? 'العنوان بالعربية مطلوب' : 'Title in Arabic is required' })
        .max(100, { message: language === 'ar' ? 'العنوان لا يمكن أن يتجاوز 100 حرفاً' : 'Title must not exceed 100 characters' }),
      titleEn: z.string().min(1, { message: language === 'ar' ? 'العنوان بالإنجليزية مطلوب' : 'Title in English is required' })
        .max(200, { message: language === 'ar' ? 'العنوان لا يمكن أن يتجاوز 200 حرفاً' : 'Title must not exceed 200 characters' }),
      subtitleAr: z.string().min(1, { message: language === 'ar' ? 'النص الفرعي بالعربية مطلوب' : 'Subtitle in Arabic is required' })
        .max(200, { message: language === 'ar' ? 'النص الفرعي لا يمكن أن يتجاوز 200 حرفاً' : 'Subtitle must not exceed 200 characters' }),
      subtitleEn: z.string().min(1, { message: language === 'ar' ? 'النص الفرعي بالإنجليزية مطلوب' : 'Subtitle in English is required' })
        .max(200, { message: language === 'ar' ? 'النص الفرعي لا يمكن أن يتجاوز 200 حرفاً' : 'Subtitle must not exceed 200 characters' }),
      primaryCtaLabelAr: z.string().min(1, { message: language === 'ar' ? 'اسم زر الدعوة الأساسي بالعربية مطلوب' : 'Primary CTA Label in Arabic is required' })
        .max(100, { message: language === 'ar' ? 'اسم زر الدعوة لا يمكن أن يتجاوز 100 حرفاً' : 'Primary CTA Label must not exceed 100 characters' }),
      primaryCtaLabelEn: z.string().min(1, { message: language === 'ar' ? 'اسم زر الدعوة الأساسي بالإنجليزية مطلوب' : 'Primary CTA Label in English is required' })
        .max(100, { message: language === 'ar' ? 'اسم زر الدعوة لا يمكن أن يتجاوز 100 حرفاً' : 'Primary CTA Label must not exceed 100 characters' }),
      primaryCtaUrl: z.string(),
      secondaryCtaLabelAr: z.string().min(1, { message: language === 'ar' ? 'اسم زر الدعوة الثانوي بالعربية مطلوب' : 'Secondary CTA Label in Arabic is required' })
        .max(100, { message: language === 'ar' ? 'اسم زر الدعوة لا يمكن أن يتجاوز 100 حرفاً' : 'Secondary CTA Label must not exceed 100 characters' }),
      secondaryCtaLabelEn: z.string().min(1, { message: language === 'ar' ? 'اسم زر الدعوة الثانوي بالإنجليزية مطلوب' : 'Secondary CTA Label in English is required' })
        .max(100, { message: language === 'ar' ? 'اسم زر الدعوة لا يمكن أن يتجاوز 100 حرفاً' : 'Secondary CTA Label must not exceed 100 characters' }),
      secondaryCtaUrl: z.string(),
      image: z.any().refine(val => val !== null && val !== undefined, { message: language === 'ar' ? 'الصورة مطلوبة' : 'Hero Image is required' }),
    });

    const result = schema.safeParse({
      titleAr: hero.title.ar,
      titleEn: hero.title.en,
      subtitleAr: hero.subtitle.ar,
      subtitleEn: hero.subtitle.en,
      primaryCtaLabelAr: hero.primary_cta_label.ar,
      primaryCtaLabelEn: hero.primary_cta_label.en,
      primaryCtaUrl: hero.primary_cta_url,
      secondaryCtaLabelAr: hero.secondary_cta_label.ar,
      secondaryCtaLabelEn: hero.secondary_cta_label.en,
      secondaryCtaUrl: hero.secondary_cta_url,
      image: imageFile || hero.image,
    });

    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

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
      const msg = (e as Error).message;
      if (msg.includes(', ')) {
        msg.split(', ').forEach(err => toast.error(err));
      } else {
        toast.error(msg);
      }
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
