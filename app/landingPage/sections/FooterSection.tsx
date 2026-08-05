'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { getLandingFooter, updateLandingFooter, type LandingFooter } from '@/lib/api';
import { BilingualField, ImageUploadBox, SectionSkeleton, inputClass, labelClass } from './shared';

export default function FooterSection({ token }: { token: string }) {
  const { t, language } = useLanguage();
  const [footer, setFooter] = useState<LandingFooter | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getLandingFooter(token)
      .then(r => setFooter(r.data ?? null))
      .catch(() => toast.error('فشل جلب بيانات Footer'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    if (!footer) return;

    const schema = z.object({
      brandNameAr: z.string().min(1, { message: language === 'ar' ? 'اسم العلامة التجارية بالعربية مطلوب' : 'Brand name in Arabic is required' })
        .max(40, { message: language === 'ar' ? 'الاسم لا يمكن أن يتجاوز 40 حرفاً' : 'Brand name must not exceed 40 characters' }),
      brandNameEn: z.string().min(1, { message: language === 'ar' ? 'اسم العلامة التجارية بالإنجليزية مطلوب' : 'Brand name in English is required' })
        .max(40, { message: language === 'ar' ? 'الاسم لا يمكن أن يتجاوز 40 حرفاً' : 'Brand name must not exceed 40 characters' }),
      taglineAr: z.string().min(1, { message: language === 'ar' ? 'الشعار اللفظي بالعربية مطلوب' : 'Tagline in Arabic is required' })
        .max(40, { message: language === 'ar' ? 'الشعار لا يمكن أن يتجاوز 40 حرفاً' : 'Tagline must not exceed 40 characters' }),
      taglineEn: z.string().min(1, { message: language === 'ar' ? 'الشعار اللفظي بالإنجليزية مطلوب' : 'Tagline in English is required' })
        .max(40, { message: language === 'ar' ? 'الشعار لا يمكن أن يتجاوز 40 حرفاً' : 'Tagline must not exceed 40 characters' }),
      descriptionAr: z.string().min(1, { message: language === 'ar' ? 'الوصف بالعربية مطلوب' : 'Description in Arabic is required' })
        .max(100, { message: language === 'ar' ? 'الوصف لا يمكن أن يتجاوز 100 حرف' : 'Description must not exceed 100 characters' }),
      descriptionEn: z.string().min(1, { message: language === 'ar' ? 'الوصف بالإنجليزية مطلوب' : 'Description in English is required' })
        .max(100, { message: language === 'ar' ? 'الوصف لا يمكن أن يتجاوز 100 حرف' : 'Description must not exceed 100 characters' }),
      copyright: z.string().min(1, { message: language === 'ar' ? 'حقوق النشر مطلوبة' : 'Copyright info is required' })
        .max(200, { message: language === 'ar' ? 'حقوق النشر لا يمكن أن تتجاوز 200 حرف' : 'Copyright must not exceed 200 characters' }),
      logo: z.any().refine(val => val !== null && val !== undefined, { message: language === 'ar' ? 'شعار الموقع مطلوب' : 'Logo image is required' }),
    });

    const result = schema.safeParse({
      brandNameAr: footer.brand_name_ar,
      brandNameEn: footer.brand_name_en,
      taglineAr: footer.tagline_ar,
      taglineEn: footer.tagline_en,
      descriptionAr: footer.description_ar,
      descriptionEn: footer.description_en,
      copyright: footer.copyright,
      logo: logoFile || footer.logo_url,
    });

    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    setSaving(true);
    try {
      await updateLandingFooter({
        brand_name_ar: footer.brand_name_ar,
        brand_name_en: footer.brand_name_en,
        tagline_ar: footer.tagline_ar,
        tagline_en: footer.tagline_en,
        description_ar: footer.description_ar,
        description_en: footer.description_en,
        copyright: footer.copyright,
        logo: logoFile
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

  if (loading) return <SectionSkeleton />;
  if (!footer) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end border-b border-secondary/5 pb-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? t('lpSaving') : t('lpSaveChanges')}
        </button>
      </div>

      <BilingualField
        labelEn={`${t('lpBrandName')} (EN)`}
        labelAr={`${t('lpBrandName')} (AR)`}
        valueEn={footer.brand_name_en}
        valueAr={footer.brand_name_ar}
        onChangeEn={v => setFooter(f => f ? { ...f, brand_name_en: v } : f)}
        onChangeAr={v => setFooter(f => f ? { ...f, brand_name_ar: v } : f)}
        placeholderEn={t('lpBrandNameEnPlaceholder')}
        placeholderAr={t('lpBrandNameArPlaceholder')}
      />

      <BilingualField
        labelEn={`${t('lpTagline')} (EN)`}
        labelAr={`${t('lpTagline')} (AR)`}
        valueEn={footer.tagline_en}
        valueAr={footer.tagline_ar}
        onChangeEn={v => setFooter(f => f ? { ...f, tagline_en: v } : f)}
        onChangeAr={v => setFooter(f => f ? { ...f, tagline_ar: v } : f)}
        placeholderEn={t('lpTaglineEnPlaceholder')}
        placeholderAr={t('lpTaglineArPlaceholder')}
      />

      <BilingualField
        labelEn={`${t('lpDescription')} (EN)`}
        labelAr={`${t('lpDescription')} (AR)`}
        valueEn={footer.description_en}
        valueAr={footer.description_ar}
        onChangeEn={v => setFooter(f => f ? { ...f, description_en: v } : f)}
        onChangeAr={v => setFooter(f => f ? { ...f, description_ar: v } : f)}
        multiline
        placeholderEn={t('lpFooterDescEnPlaceholder')}
        placeholderAr={t('lpFooterDescArPlaceholder')}
      />

      <div>
        <label className={labelClass}>{t('lpCopyright')}</label>
        <input
          type="text"
          value={footer.copyright}
          onChange={e => setFooter(f => f ? { ...f, copyright: e.target.value } : f)}
          dir="ltr"
          className={inputClass}
        />
      </div>

      <ImageUploadBox
        url={logoPreview ?? footer.logo_url}
        label={t('lpLogo')}
        aspect="aspect-[3/1] max-w-[300px]"
        onFile={f => {
          setLogoFile(f);
          setLogoPreview(URL.createObjectURL(f));
        }}
        onClear={() => {
          setLogoFile(null);
          setLogoPreview(null);
        }}
      />
    </div>
  );
}
