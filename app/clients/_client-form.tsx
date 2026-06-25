'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { getClientById, createClient, updateClient, type Client } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { toast } from 'sonner';

import {
  getCountries,
  getCountryCallingCode,
} from 'libphonenumber-js';

/* ─── Dynamic Country Codes List ──────────────────────────────── */
export interface CountryOption {
  code: string;
  flag: string;
  name: string;
  nameAr: string;
  iso: string;
}

const countryCodeToFlag = (countryCode: string) => {
  return countryCode
    .toUpperCase()
    .replace(/./g, char =>
      String.fromCodePoint(127397 + char.charCodeAt(0))
    );
};

const englishNames = new Intl.DisplayNames(['en'], { type: 'region' });
const arabicNames = new Intl.DisplayNames(['ar'], { type: 'region' });

const rawCountries = getCountries().map((country) => ({
  code: `+${getCountryCallingCode(country)}`,
  flag: countryCodeToFlag(country),
  name: englishNames.of(country) || country,
  nameAr: arabicNames.of(country) || country,
  iso: country,
}));

// Sort so that Gulf/Arab countries appear first
const PRIORITY_ISOS = ['KW', 'SA', 'AE', 'QA', 'BH', 'OM', 'EG', 'JO', 'LB', 'SY', 'IQ', 'YE', 'MA', 'TN', 'DZ', 'LY', 'SD', 'PS'];

export const COUNTRIES: CountryOption[] = [
  ...rawCountries.filter(c => PRIORITY_ISOS.includes(c.iso)).sort((a, b) => PRIORITY_ISOS.indexOf(a.iso) - PRIORITY_ISOS.indexOf(b.iso)),
  ...rawCountries.filter(c => !PRIORITY_ISOS.includes(c.iso)).sort((a, b) => a.name.localeCompare(b.name)),
];


interface ClientEditFormProps {
  clientId: number | null; // null = create, number = edit
  onBack: () => void;
  onSaved: (client: Client) => void;
}

export function ClientEditForm({ clientId, onBack, onSaved }: ClientEditFormProps) {
  const { t, dir } = useLanguage();
  const token = getToken() ?? '';

  // loading state for edit mode
  const [fetchLoading, setFetchLoading] = useState(clientId !== null);

  // form state
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+965');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // load single client data if editing
  useEffect(() => {
    if (clientId === null) return;
    setFetchLoading(true);
    getClientById(clientId, token)
      .then(res => {
        const c = res.data;
        setName(c.name);
        setCountryCode(c.country_code || '+965');
        setPhone(c.phone);
        setEmail(c.email || '');
        setNotes(c.notes || '');
      })
      .catch(err => toast.error((err as Error).message || 'فشل جلب بيانات العميل'))
      .finally(() => setFetchLoading(false));
  }, [clientId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error(dir === 'ltr' ? 'Name is required' : 'الاسم الكامل مطلوب'); return; }
    if (!phone.trim()) { toast.error(dir === 'ltr' ? 'Phone is required' : 'رقم الهاتف مطلوب'); return; }

    setLoading(true);
    try {
      let res;
      const payload = {
        name,
        country_code: countryCode,
        phone,
        email: email.trim() ? email : undefined,
        notes: notes.trim() ? notes : undefined,
      };

      if (clientId !== null) {
        res = await updateClient(clientId, payload, token);
      } else {
        res = await createClient(payload, token);
      }

      toast.success(res.msg || (clientId !== null ? 'تم تحديث العميل بنجاح' : 'تم إضافة العميل بنجاح'));
      onSaved(res.data);
    } catch (err) {
      toast.error((err as Error).message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: dir === 'ltr' ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: dir === 'ltr' ? -20 : 20 }}
      className="space-y-6 pb-10 w-full"
    >
      {/* Back button */}
      <div className="flex items-center justify-start mb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-secondary/60 hover:text-secondary transition-colors cursor-pointer group"
        >
          {dir === 'ltr'
            ? <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            : <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          <span className="font-medium">{t('back' as any)}</span>
        </button>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-secondary/5 shadow-sm w-full max-w-3xl mx-auto crystal-accent">
        <h2 className={cn('text-2xl font-medium text-secondary mb-8', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
          {clientId !== null ? t('editClient' as any) : t('addClient' as any)}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary/80 ml-1 rtl:mr-1 rtl:ml-0">
              {t('fullName' as any) || 'Full Name'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 px-4 transition-all outline-none text-secondary"
              placeholder="Mohammed Khalid"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary/80 ml-1 rtl:mr-1 rtl:ml-0">
              {t('phoneNumber' as any) || 'Phone Number'} <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative shrink-0 w-[140px]">
                <select
                  value={countryCode}
                  onChange={e => setCountryCode(e.target.value)}
                  className="w-full appearance-none bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 ps-3 pe-8 transition-all outline-none text-secondary text-sm font-medium h-full cursor-pointer"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.iso} value={c.code}>
                      {c.flag} {c.code} ({dir === 'ltr' ? c.name : c.nameAr})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 end-0 flex items-center pe-2.5 pointer-events-none text-secondary/50">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} // only digits
                required
                dir="ltr"
                className="flex-1 min-w-0 bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 px-4 transition-all outline-none text-secondary"
                placeholder="501234567"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#e8f5e9] text-[#2e7d32] rounded-lg text-xs font-medium mt-1">
              <Image
                src="https://raiyansoft.com/wp-content/uploads/2026/05/whatsapp.png"
                alt="WhatsApp"
                width={14}
                height={14}
                className="opacity-80 drop-shadow-sm"
                referrerPolicy="no-referrer"
              />
              {t('phoneMustHaveWhatsapp' as any) || 'Phone number must have WhatsApp'}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary/80 ml-1 rtl:mr-1 rtl:ml-0">
              {t('emailOptional' as any) || 'Email (Optional)'}
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 px-4 transition-all outline-none text-secondary"
              placeholder="mohammed.k@example.com"
              dir="ltr"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary/80 ml-1 rtl:mr-1 rtl:ml-0">
              {t('notesOptional' as any) || 'Notes (Optional)'}
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 px-4 transition-all outline-none text-secondary resize-none"
              rows={4}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-xl py-3.5 font-medium transition-all shadow-md hover:shadow-lg flex justify-center items-center gap-2 group cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('saveChanges' as any) || 'Save Changes'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
