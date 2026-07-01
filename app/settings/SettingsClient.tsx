'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { getToken } from '@/lib/auth';
import { getSettings, updateSettings, type SettingsData } from '@/lib/api';
import { toast } from 'sonner';
import {
  Save, Loader2, Upload, Trash2, Globe, Phone, Mail, MapPin,
  Facebook, Instagram, Twitter, Linkedin, Youtube, MessageCircle,
  Building2, FileText, Lock, Info, ChevronDown, RefreshCw,
} from 'lucide-react';

// ── Leaflet map picker (client-only) ─────────────────────────────────────────
const MapPicker = dynamic(() => import('./MapPicker'), {
  ssr: false, loading: () => (
    <div className="w-full h-56 rounded-2xl bg-secondary/8 animate-pulse flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-secondary/30 animate-spin" />
    </div>
  )
});

// ── Shared primitives ─────────────────────────────────────────────────────────
const inputClass =
  'w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm text-secondary placeholder:text-secondary/30';
const labelClass = 'block text-xs font-bold text-secondary/50 mb-1.5 uppercase tracking-wider';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

function BilingualTextarea({ labelEn, labelAr, valueEn, valueAr, onChangeEn, onChangeAr, rows = 4 }: {
  labelEn: string; labelAr: string;
  valueEn: string; valueAr: string;
  onChangeEn: (v: string) => void; onChangeAr: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className={labelClass}>{labelEn}</label>
        <textarea rows={rows} value={valueEn} onChange={e => onChangeEn(e.target.value)}
          dir="ltr" className={cn(inputClass, 'resize-none text-left')} />
      </div>
      <div>
        <label className={labelClass}>{labelAr}</label>
        <textarea rows={rows} value={valueAr} onChange={e => onChangeAr(e.target.value)}
          dir="rtl" className={cn(inputClass, 'resize-none text-right font-arabic')} />
      </div>
    </div>
  );
}

function ImageUploadCard({ label, url, preview, onFile, onClear, aspectClass = 'aspect-video' }: {
  label: string; url: string | null; preview: string | null;
  onFile: (f: File) => void; onClear: () => void; aspectClass?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const displayUrl = preview ?? url;
  return (
    <div className="space-y-2">
      <label className={labelClass}>{label}</label>
      <div className={cn('relative rounded-2xl overflow-hidden border-2 border-dashed border-secondary/20 bg-secondary/5 group cursor-pointer', aspectClass)}
        onClick={() => ref.current?.click()}>
        {displayUrl ? (
          <>
            <Image src={displayUrl} alt={label} fill className="object-contain p-2" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button type="button" onClick={e => { e.stopPropagation(); ref.current?.click(); }}
                className="px-3 py-1.5 bg-white text-xs font-semibold rounded-xl shadow cursor-pointer hover:bg-gray-50 transition-colors">
                تغيير
              </button>
              <button type="button" onClick={e => { e.stopPropagation(); onClear(); }}
                className="p-2 bg-red-500 text-white rounded-xl cursor-pointer hover:bg-red-600 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-secondary/40 group-hover:text-primary transition-colors">
            <Upload className="w-7 h-7 mb-2" />
            <span className="text-xs font-medium">رفع صورة</span>
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ icon: Icon, title, children, accent = 'primary' }: {
  icon: React.ElementType; title: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <div className="bg-white rounded-[2rem] border border-secondary/8 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-secondary/8 bg-gradient-to-r from-secondary/3 to-transparent">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
          accent === 'primary' ? 'bg-primary/10' : 'bg-blue-50')}>
          <Icon className={cn('w-4.5 h-4.5', accent === 'primary' ? 'text-primary' : 'text-blue-500')} />
        </div>
        <h3 className="font-bold text-secondary text-sm">{title}</h3>
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonPage() {
  return (
    <div className="space-y-6 animate-pulse pb-10">
      <div className="h-10 bg-secondary/8 rounded-2xl w-64" />
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white rounded-[2rem] border border-secondary/8 p-6 space-y-4">
          <div className="h-5 bg-secondary/8 rounded-xl w-48" />
          <div className="h-10 bg-secondary/5 rounded-xl" />
          <div className="h-10 bg-secondary/5 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

// ── Tab strip ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'general', label: 'عام', icon: Globe },
  { id: 'social', label: 'التواصل الاجتماعي', icon: Globe },
  { id: 'legal', label: 'قانوني ومحتوى', icon: FileText },
  { id: 'location', label: 'الموقع والخريطة', icon: MapPin },
];

export default function SettingsClient({ initialData }: { initialData: SettingsData | null }) {
  const { dir } = useLanguage();
  const [token] = useState(() => getToken() ?? '');

  const [settings, setSettings] = useState<SettingsData | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // File states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  // Load settings
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getSettings(token);
      setSettings(res.data);
    } catch (e) {
      toast.error((e as Error).message || 'فشل جلب الإعدادات');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!initialData) {
      load();
    }
  }, [initialData, load]);

  // Helpers to patch nested state
  const patch = (key: keyof SettingsData, value: any) =>
    setSettings(s => s ? { ...s, [key]: value } : s);

  const patchNested = <K extends keyof SettingsData>(
    key: K,
    sub: string,
    value: any
  ) => setSettings(s => s ? { ...s, [key]: { ...(s[key] as any), [sub]: value } } : s);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateSettings({
        contact_number: settings.contact_number,
        contact_mail: settings.contact_mail,
        commercial_register: settings.commercial_register,
        tax_number: settings.tax_number,
        copy_right: settings.copy_right,
        facebook: settings.facebook,
        instagram: settings.instagram,
        twitter: settings.twitter,
        whatsapp: settings.whatsapp,
        youtube: settings.youtube,
        linkedin: settings.linkedin,
        location_map_desc_ar: settings.location.map_desc.ar,
        location_map_desc_en: settings.location.map_desc.en,
        location_lat: settings.location.lat !== null ? String(settings.location.lat) : '',
        location_lng: settings.location.lng !== null ? String(settings.location.lng) : '',
        privacy_policy_ar: settings.privacy_policy.ar,
        privacy_policy_en: settings.privacy_policy.en,
        terms_conditions_ar: settings.terms_conditions.ar,
        terms_conditions_en: settings.terms_conditions.en,
        about_us_ar: settings.about_us.ar,
        about_us_en: settings.about_us.en,
        logo: logoFile ?? undefined,
        favicon: faviconFile ?? undefined,
      }, token);
      toast.success('تم حفظ الإعدادات بنجاح');
      // Clear file states and reload
      setLogoFile(null); setLogoPreview(null);
      setFaviconFile(null); setFaviconPreview(null);
      load();
    } catch (e) {
      toast.error((e as Error).message || 'فشل حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SkeletonPage />;
  if (!settings) return (
    <div className="flex flex-col items-center justify-center py-24 space-y-4 text-secondary/50">
      <Globe className="w-12 h-12" />
      <p className="text-sm">فشل تحميل الإعدادات</p>
      <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold cursor-pointer">
        <RefreshCw className="w-4 h-4" /> إعادة المحاولة
      </button>
    </div>
  );

  return (
    <div className={cn('space-y-6 pb-10', dir === 'ltr' ? 'font-serif' : 'font-arabic')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-secondary">الإعدادات</h2>
          <p className="text-sm text-secondary/50 mt-0.5">إدارة إعدادات الموقع والتطبيق</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm shadow-primary/20 w-full sm:w-auto justify-center cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>

      {/* Tab strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0',
              activeTab === tab.id
                ? 'bg-primary text-white shadow-sm shadow-primary/30'
                : 'bg-white text-secondary/60 border border-secondary/15 hover:border-primary/30 hover:text-primary'
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: General ── */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Identity */}
          <SectionCard icon={Globe} title="هوية الموقع">
            <Field label="اسم الموقع (AR)">
              <input type="text" dir="rtl" value={settings.website_name.ar}
                onChange={e => patch('website_name', { ...settings.website_name, ar: e.target.value })}
                className={cn(inputClass, 'text-right font-arabic')} />
            </Field>
            <Field label="Website Name (EN)">
              <input type="text" dir="ltr" value={settings.website_name.en}
                onChange={e => patch('website_name', { ...settings.website_name, en: e.target.value })}
                className={inputClass} />
            </Field>
            <Field label="حقوق النشر">
              <input type="text" dir="rtl" value={settings.copy_right}
                onChange={e => patch('copy_right', e.target.value)}
                className={cn(inputClass, 'text-right font-arabic')} />
            </Field>
          </SectionCard>

          {/* Contact */}
          <SectionCard icon={Phone} title="معلومات التواصل" accent="blue">
            <Field label="رقم الهاتف">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-secondary/40 shrink-0" />
                <input type="tel" dir="ltr" value={settings.contact_number}
                  onChange={e => patch('contact_number', e.target.value)}
                  className={inputClass} placeholder="966xxxxxxxx" />
              </div>
            </Field>
            <Field label="البريد الإلكتروني">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-secondary/40 shrink-0" />
                <input type="email" dir="ltr" value={settings.contact_mail}
                  onChange={e => patch('contact_mail', e.target.value)}
                  className={inputClass} />
              </div>
            </Field>
          </SectionCard>

          {/* Commercial */}
          <SectionCard icon={Building2} title="البيانات التجارية" accent="blue">
            <Field label="رقم السجل التجاري">
              <input type="text" dir="ltr" value={settings.commercial_register}
                onChange={e => patch('commercial_register', e.target.value)}
                className={inputClass} />
            </Field>
            <Field label="الرقم الضريبي">
              <input type="text" dir="ltr" value={settings.tax_number}
                onChange={e => patch('tax_number', e.target.value)}
                className={inputClass} />
            </Field>
          </SectionCard>

          {/* Logo & Favicon */}
          <SectionCard icon={Upload} title="الشعار والأيقونة">
            <div className="grid grid-cols-2 gap-4">
              <ImageUploadCard
                label="الشعار (Logo)"
                url={settings.logo}
                preview={logoPreview}
                onFile={f => { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }}
                onClear={() => { setLogoFile(null); setLogoPreview(null); }}
                aspectClass="aspect-video"
              />
              <ImageUploadCard
                label="الأيقونة (Favicon)"
                url={settings.favicon}
                preview={faviconPreview}
                onFile={f => { setFaviconFile(f); setFaviconPreview(URL.createObjectURL(f)); }}
                onClear={() => { setFaviconFile(null); setFaviconPreview(null); }}
                aspectClass="aspect-square"
              />
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── TAB: Social ── */}
      {activeTab === 'social' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[
            { key: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/...' },
            { key: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/...' },
            { key: 'twitter', label: 'X / Twitter', icon: Twitter, placeholder: 'https://twitter.com/...' },
            { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, placeholder: 'https://wa.me/...' },
            { key: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/...' },
            { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/...' },
          ].map(({ key, label, icon: Icon, placeholder }) => (
            <SectionCard key={key} icon={Icon} title={label}>
              <Field label="الرابط">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-secondary/40 shrink-0" />
                  <input type="url" dir="ltr" value={(settings as any)[key]}
                    onChange={e => patch(key as keyof SettingsData, e.target.value)}
                    placeholder={placeholder}
                    className={inputClass} />
                </div>
              </Field>
            </SectionCard>
          ))}
        </div>
      )}

      {/* ── TAB: Legal & Content ── */}
      {activeTab === 'legal' && (
        <div className="space-y-6">
          <SectionCard icon={Lock} title="سياسة الخصوصية">
            <BilingualTextarea
              labelEn="Privacy Policy (EN)" labelAr="سياسة الخصوصية (AR)"
              valueEn={settings.privacy_policy.en} valueAr={settings.privacy_policy.ar}
              onChangeEn={v => patch('privacy_policy', { ...settings.privacy_policy, en: v })}
              onChangeAr={v => patch('privacy_policy', { ...settings.privacy_policy, ar: v })}
              rows={6}
            />
          </SectionCard>

          <SectionCard icon={FileText} title="الشروط والأحكام">
            <BilingualTextarea
              labelEn="Terms & Conditions (EN)" labelAr="الشروط والأحكام (AR)"
              valueEn={settings.terms_conditions.en} valueAr={settings.terms_conditions.ar}
              onChangeEn={v => patch('terms_conditions', { ...settings.terms_conditions, en: v })}
              onChangeAr={v => patch('terms_conditions', { ...settings.terms_conditions, ar: v })}
              rows={6}
            />
          </SectionCard>

          <SectionCard icon={Info} title="من نحن">
            <BilingualTextarea
              labelEn="About Us (EN)" labelAr="من نحن (AR)"
              valueEn={settings.about_us.en} valueAr={settings.about_us.ar}
              onChangeEn={v => patch('about_us', { ...settings.about_us, en: v })}
              onChangeAr={v => patch('about_us', { ...settings.about_us, ar: v })}
              rows={6}
            />
          </SectionCard>
        </div>
      )}

      {/* ── TAB: Location / Map ── */}
      {activeTab === 'location' && (
        <div className="space-y-6">
          <SectionCard icon={MapPin} title="الموقع الجغرافي">
            {/* Coordinates display */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="خط العرض (Latitude)">
                <input type="number" step="any" dir="ltr"
                  value={settings.location.lat ?? ''}
                  onChange={e => patch('location', {
                    ...settings.location,
                    lat: e.target.value ? parseFloat(e.target.value) : null
                  })}
                  placeholder="31.9554"
                  className={inputClass} />
              </Field>
              <Field label="خط الطول (Longitude)">
                <input type="number" step="any" dir="ltr"
                  value={settings.location.lng ?? ''}
                  onChange={e => patch('location', {
                    ...settings.location,
                    lng: e.target.value ? parseFloat(e.target.value) : null
                  })}
                  placeholder="35.9451"
                  className={inputClass} />
              </Field>
            </div>

            {/* Map */}
            <div className="rounded-2xl overflow-hidden border border-secondary/15 shadow-sm" style={{ height: '350px' }}>
              <MapPicker
                lat={settings.location.lat !== null ? (typeof settings.location.lat === 'string' ? parseFloat(settings.location.lat) : settings.location.lat) : null}
                lng={settings.location.lng !== null ? (typeof settings.location.lng === 'string' ? parseFloat(settings.location.lng) : settings.location.lng) : null}
                onChange={(lat, lng) => patch('location', { ...settings.location, lat, lng })}
              />
            </div>

            <p className="text-xs text-secondary/40 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              انقر على الخريطة لتحديد الموقع، أو اسحب العلامة لضبطها.
            </p>
          </SectionCard>

          {/* Map description */}
          <SectionCard icon={FileText} title="وصف الخريطة / العنوان">
            <BilingualTextarea
              labelEn="Map Description (EN)" labelAr="وصف الخريطة (AR)"
              valueEn={settings.location.map_desc.en} valueAr={settings.location.map_desc.ar}
              onChangeEn={v => patch('location', { ...settings.location, map_desc: { ...settings.location.map_desc, en: v } })}
              onChangeAr={v => patch('location', { ...settings.location, map_desc: { ...settings.location.map_desc, ar: v } })}
              rows={3}
            />
          </SectionCard>
        </div>
      )}

      {/* Floating save bar on mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-secondary/10 px-4 py-3 z-40">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>
    </div>
  );
}
