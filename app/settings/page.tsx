'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Save, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const { t, dir } = useLanguage();
  const [privacyAr, setPrivacyAr] = useState('');
  const [privacyEn, setPrivacyEn] = useState('');
  const [termsAr, setTermsAr] = useState('');
  const [termsEn, setTermsEn] = useState('');
  const [aboutAr, setAboutAr] = useState('');
  const [aboutEn, setAboutEn] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className={cn("text-2xl font-medium text-secondary", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            {t('settings' as any)}
          </h2>
        </div>
        <button
          onClick={handleSave}
          className="bg-primary hover:bg-primary/90 text-white border-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-sm font-medium transition-all shadow-sm shadow-primary/20 flex items-center gap-2 group w-full sm:w-auto justify-center"
        >
          {isSaved ? <CheckCircle2 className="w-4 h-4 text-white border-white" /> : <Save className="w-4 h-4 text-white border-white group-hover:-translate-y-0.5 transition-transform" />}
          {isSaved ? t('settingsSaved' as any) || 'Saved!' : t('saveChanges' as any) || 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Privacy Policy */}
        <div className="bg-white rounded-[2rem] p-6 lg:p-8 border border-secondary/5 shadow-sm space-y-6">
          <h3 className="text-lg font-semibold text-secondary">{t('privacyPolicyEn' as any)?.split('(')[0] || 'Privacy Policy'}</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
                {t('privacyPolicyAr' as any) || 'Privacy Policy (Arabic)'}
              </label>
              <textarea
                rows={4}
                value={privacyAr}
                onChange={(e) => setPrivacyAr(e.target.value)}
                dir="rtl"
                className="block w-full rounded-2xl border-0 py-3 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 bg-gray-50/50 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
                {t('privacyPolicyEn' as any) || 'Privacy Policy (English)'}
              </label>
              <textarea
                rows={4}
                value={privacyEn}
                onChange={(e) => setPrivacyEn(e.target.value)}
                dir="ltr"
                className="block w-full rounded-2xl border-0 py-3 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 bg-gray-50/50 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="bg-white rounded-[2rem] p-6 lg:p-8 border border-secondary/5 shadow-sm space-y-6">
          <h3 className="text-lg font-semibold text-secondary">{t('termsConditionsEn' as any)?.split('(')[0] || 'Terms & Conditions'}</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
                {t('termsConditionsAr' as any) || 'Terms & Conditions (Arabic)'}
              </label>
              <textarea
                rows={4}
                value={termsAr}
                onChange={(e) => setTermsAr(e.target.value)}
                dir="rtl"
                className="block w-full rounded-2xl border-0 py-3 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 bg-gray-50/50 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
                {t('termsConditionsEn' as any) || 'Terms & Conditions (English)'}
              </label>
              <textarea
                rows={4}
                value={termsEn}
                onChange={(e) => setTermsEn(e.target.value)}
                dir="ltr"
                className="block w-full rounded-2xl border-0 py-3 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 bg-gray-50/50 resize-none"
              />
            </div>
          </div>
        </div>

        {/* About Us */}
        <div className="bg-white rounded-[2rem] p-6 lg:p-8 border border-secondary/5 shadow-sm space-y-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-secondary">{t('aboutUsEn' as any)?.split('(')[0] || 'About Us'}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
                {t('aboutUsAr' as any) || 'About Us (Arabic)'}
              </label>
              <textarea
                rows={4}
                value={aboutAr}
                onChange={(e) => setAboutAr(e.target.value)}
                dir="rtl"
                className="block w-full rounded-2xl border-0 py-3 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 bg-gray-50/50 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
                {t('aboutUsEn' as any) || 'About Us (English)'}
              </label>
              <textarea
                rows={4}
                value={aboutEn}
                onChange={(e) => setAboutEn(e.target.value)}
                dir="ltr"
                className="block w-full rounded-2xl border-0 py-3 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 bg-gray-50/50 resize-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
