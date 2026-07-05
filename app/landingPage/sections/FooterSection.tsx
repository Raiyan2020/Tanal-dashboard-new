'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';
import { getLandingFooter, updateLandingFooter, type LandingFooter } from '@/lib/api';
import { BilingualField, ImageUploadBox, SectionSkeleton, inputClass, labelClass } from './shared';

export default function FooterSection({ token }: { token: string }) {
  const { t } = useLanguage();
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
    setSaving(true);
    try {
      await updateLandingFooter({
        brand_name_ar: footer.brand_name.ar,
        brand_name_en: footer.brand_name.en,
        tagline_ar: footer.tagline.ar,
        tagline_en: footer.tagline.en,
        description_ar: footer.description.ar,
        description_en: footer.description.en,
        copyright: footer.copyright,
        logo: logoFile
      }, token);
      toast.success(t('lpSavedOk'));
    } catch (e) {
      toast.error((e as Error).message);
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
        valueEn={footer.brand_name.en}
        valueAr={footer.brand_name.ar}
        onChangeEn={v => setFooter(f => f ? { ...f, brand_name: { ...f.brand_name, en: v } } : f)}
        onChangeAr={v => setFooter(f => f ? { ...f, brand_name: { ...f.brand_name, ar: v } } : f)}
      />

      <BilingualField
        labelEn={`${t('lpTagline')} (EN)`}
        labelAr={`${t('lpTagline')} (AR)`}
        valueEn={footer.tagline.en}
        valueAr={footer.tagline.ar}
        onChangeEn={v => setFooter(f => f ? { ...f, tagline: { ...f.tagline, en: v } } : f)}
        onChangeAr={v => setFooter(f => f ? { ...f, tagline: { ...f.tagline, ar: v } } : f)}
      />

      <BilingualField
        labelEn={`${t('lpDescription')} (EN)`}
        labelAr={`${t('lpDescription')} (AR)`}
        valueEn={footer.description.en}
        valueAr={footer.description.ar}
        onChangeEn={v => setFooter(f => f ? { ...f, description: { ...f.description, en: v } } : f)}
        onChangeAr={v => setFooter(f => f ? { ...f, description: { ...f.description, ar: v } } : f)}
        multiline
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
