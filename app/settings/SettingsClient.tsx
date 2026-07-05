'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { getToken } from '@/lib/auth';
import { getSettings, updateSettings, type SettingsData } from '@/lib/api';
import { toast } from 'sonner';
import {
  Save, Loader2, FileText, Lock, Info, RefreshCw, Globe
} from 'lucide-react';

const labelClass = 'block text-xs font-bold text-secondary/50 mb-1.5 uppercase tracking-wider';
const inputClass =
  'w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm text-secondary placeholder:text-secondary/30';

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

function SkeletonPage() {
  return (
    <div className="space-y-6 animate-pulse pb-10">
      <div className="h-10 bg-secondary/8 rounded-2xl w-64" />
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-[2rem] border border-secondary/8 p-6 space-y-4">
          <div className="h-5 bg-secondary/8 rounded-xl w-48" />
          <div className="h-10 bg-secondary/5 rounded-xl" />
          <div className="h-10 bg-secondary/5 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export default function SettingsClient({ initialData }: { initialData: SettingsData | null }) {
  const { t, dir } = useLanguage();
  const [token] = useState(() => getToken() ?? '');

  const [settings, setSettings] = useState<SettingsData | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getSettings(token);
      setSettings(res.data);
    } catch (e) {
      toast.error((e as Error).message || t('failedToLoadSettings'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!initialData) {
      load();
    }
  }, [initialData, load]);

  const patch = (key: keyof SettingsData, value: any) =>
    setSettings(s => s ? { ...s, [key]: value } : s);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateSettings({
        privacy_policy_ar: settings.privacy_policy.ar,
        privacy_policy_en: settings.privacy_policy.en,
        terms_conditions_ar: settings.terms_conditions.ar,
        terms_conditions_en: settings.terms_conditions.en,
        about_us_ar: settings.about_us.ar,
        about_us_en: settings.about_us.en,
      }, token);
      toast.success(t('settingsSavedSuccessfully'));
      load();
    } catch (e) {
      toast.error((e as Error).message || t('failedToSaveSettings'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SkeletonPage />;
  if (!settings) return (
    <div className="flex flex-col items-center justify-center py-24 space-y-4 text-secondary/50">
      <Globe className="w-12 h-12" />
      <p className="text-sm">{t('failedToLoadSettings')}</p>
      <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold cursor-pointer">
        <RefreshCw className="w-4 h-4" /> {t('retry')}
      </button>
    </div>
  );

  return (
    <div className={cn('space-y-6 pb-10', dir === 'ltr' ? 'font-serif' : 'font-arabic')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-secondary">{t('settings')}</h2>
          <p className="text-sm text-secondary/50 mt-0.5">{t('manageSettingsDesc')}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm shadow-primary/20 w-full sm:w-auto justify-center cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? t('saving') : t('saveChanges')}
        </button>
      </div>

      <div className="space-y-6">
        <SectionCard icon={Lock} title={t('privacyPolicy')}>
          <BilingualTextarea
            labelEn="Privacy Policy (EN)" labelAr="سياسة الخصوصية (AR)"
            valueEn={settings.privacy_policy.en} valueAr={settings.privacy_policy.ar}
            onChangeEn={v => patch('privacy_policy', { ...settings.privacy_policy, en: v })}
            onChangeAr={v => patch('privacy_policy', { ...settings.privacy_policy, ar: v })}
            rows={6}
          />
        </SectionCard>

        <SectionCard icon={FileText} title={t('termsConditions')}>
          <BilingualTextarea
            labelEn="Terms & Conditions (EN)" labelAr="الشروط والأحكام (AR)"
            valueEn={settings.terms_conditions.en} valueAr={settings.terms_conditions.ar}
            onChangeEn={v => patch('terms_conditions', { ...settings.terms_conditions, en: v })}
            onChangeAr={v => patch('terms_conditions', { ...settings.terms_conditions, ar: v })}
            rows={6}
          />
        </SectionCard>

        <SectionCard icon={Info} title={t('aboutUs')}>
          <BilingualTextarea
            labelEn="About Us (EN)" labelAr="من نحن (AR)"
            valueEn={settings.about_us.en} valueAr={settings.about_us.ar}
            onChangeEn={v => patch('about_us', { ...settings.about_us, en: v })}
            onChangeAr={v => patch('about_us', { ...settings.about_us, ar: v })}
            rows={6}
          />
        </SectionCard>
      </div>

      {/* Floating save bar on mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-secondary/10 px-4 py-3 z-40">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? t('saving') : t('saveChanges')}
        </button>
      </div>
    </div>
  );
}
