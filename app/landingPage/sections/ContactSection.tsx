'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';
import { getLandingContact, updateLandingContact, type LandingContact } from '@/lib/api';
import { BilingualField, SectionSkeleton, getSocialIcon, inputClass, labelClass } from './shared';

export default function ContactSection({ token }: { token: string }) {
  const { t } = useLanguage();
  const [contact, setContact] = useState<LandingContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getLandingContact(token)
      .then(r => setContact(r.data ?? null))
      .catch(() => toast.error('فشل جلب معلومات التواصل'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    if (!contact) return;
    setSaving(true);
    try {
      await updateLandingContact({
        whatsapp_country_code: contact.whatsapp_country_code,
        whatsapp_phone: contact.whatsapp_phone,
        office_address_ar: contact.office_address_ar,
        office_address_en: contact.office_address_en,
        google_maps_url: contact.google_maps_url
      }, token);
      toast.success('تم تحديث معلومات التواصل');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SectionSkeleton />;
  if (!contact) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t('lpCountryCode')}</label>
          <input
            type="text"
            value={contact.whatsapp_country_code}
            onChange={e => setContact(c => c ? { ...c, whatsapp_country_code: e.target.value } : c)}
            dir="ltr"
            className={inputClass}
            placeholder="+965"
          />
        </div>
        <div>
          <label className={labelClass}>{t('lpWhatsappPhone')}</label>
          <input
            type="text"
            value={contact.whatsapp_phone}
            onChange={e => setContact(c => c ? { ...c, whatsapp_phone: e.target.value } : c)}
            dir="ltr"
            className={inputClass}
          />
        </div>
      </div>

      <BilingualField
        labelEn={`${t('lpOfficeAddress')} (EN)`}
        labelAr={`${t('lpOfficeAddress')} (AR)`}
        valueEn={contact.office_address_en || ''}
        valueAr={contact.office_address_ar || ''}
        onChangeEn={v => setContact(c => c ? { ...c, office_address_en: v } : c)}
        onChangeAr={v => setContact(c => c ? { ...c, office_address_ar: v } : c)}
      />

      <div>
        <label className={labelClass}>{t('lpGoogleMapsUrl')}</label>
        <input
          type="url"
          value={contact.google_maps_url}
          onChange={e => setContact(c => c ? { ...c, google_maps_url: e.target.value } : c)}
          dir="ltr"
          className={inputClass}
          placeholder="https://maps.google.com/..."
        />
      </div>

      {/* Social links (read-only display — managed in the Social Links section) */}
      {contact.social_links.length > 0 && (
        <div className="bg-secondary/3 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold text-secondary/40 uppercase tracking-wider mb-3">
            {t('lpLinkedSocialLinks')}
          </p>
          {contact.social_links.map(sl => {
            const Icon = getSocialIcon(sl.platform);
            return (
              <div key={sl.id} className="flex items-center gap-3 text-sm">
                <Icon className="w-4 h-4 text-secondary/50 shrink-0" />
                <a
                  href={sl.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary/70 hover:underline truncate"
                >
                  {sl.url}
                </a>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? t('lpSaving') : t('lpSaveChanges')}
        </button>
      </div>
    </div>
  );
}
