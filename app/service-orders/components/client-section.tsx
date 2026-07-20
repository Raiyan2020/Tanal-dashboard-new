import React from 'react';
import { User, Phone } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { COUNTRIES } from '@/lib/countries';
import { type FormState } from '@/lib/service-order-form';

interface ClientSectionProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  error?: string;
}

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm';

const codeSelectClass =
  'px-2 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 outline-none text-secondary text-sm cursor-pointer shrink-0 w-28';

/**
 * Client details are stored on the order itself — there is no separate clients
 * module any more. A legacy `client_id` may still be present on older orders,
 * in which case these fields are shown read-only for reference.
 */
export function ClientSection({ form, setForm, error }: ClientSectionProps) {
  const { t, dir, language } = useLanguage();
  const isLegacyClient = !!form.clientId;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-bold text-secondary">
          <User className="w-4 h-4 text-secondary/40" />
          {t('clientData') || (language === 'ar' ? 'بيانات العميل' : 'Client Data')}
        </h3>
        {isLegacyClient && (
          <span className="px-2 py-0.5 rounded-md bg-secondary/10 text-secondary/60 text-[10px] font-bold">
            {language === 'ar' ? `عميل سابق #${form.clientId}` : `Legacy client #${form.clientId}`}
          </span>
        )}
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-secondary/80">
          {t('clientName') || (language === 'ar' ? 'اسم العميل' : 'Client Name')}
        </label>
        <input
          type="text"
          value={form.clientName}
          onChange={e => setForm(prev => ({ ...prev, clientName: e.target.value }))}
          placeholder={language === 'ar' ? 'أحمد' : 'Ahmed'}
          className={inputClass}
        />
      </div>

      {/* Primary phone — required unless a legacy client is attached */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
          <Phone className="w-4 h-4 text-secondary/40" />
          {t('clientPhone') || (language === 'ar' ? 'رقم الهاتف' : 'Phone')}
          {!isLegacyClient && <span className="text-red-500">*</span>}
        </label>
        <div className={dir === 'rtl' ? 'flex gap-2 flex-row-reverse' : 'flex gap-2'}>
          <select
            value={form.clientCountryCode}
            onChange={e => setForm(prev => ({ ...prev, clientCountryCode: e.target.value }))}
            className={codeSelectClass}
            dir="ltr"
          >
            {COUNTRIES.map(c => (
              <option key={c.iso} value={c.code}>
                {c.flag} {c.code}
              </option>
            ))}
          </select>
          <input
            type="tel"
            dir="ltr"
            value={form.clientPhone}
            onChange={e => setForm(prev => ({ ...prev, clientPhone: e.target.value }))}
            placeholder="50123456"
            className={`${inputClass} font-mono`}
          />
        </div>
        {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      </div>

      {/* Alternate phone */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-secondary/80">
          {language === 'ar' ? 'رقم بديل (اختياري)' : 'Alternate Phone (optional)'}
        </label>
        <div className={dir === 'rtl' ? 'flex gap-2 flex-row-reverse' : 'flex gap-2'}>
          <select
            value={form.clientAltCountryCode}
            onChange={e => setForm(prev => ({ ...prev, clientAltCountryCode: e.target.value }))}
            className={codeSelectClass}
            dir="ltr"
          >
            <option value="">—</option>
            {COUNTRIES.map(c => (
              <option key={c.iso} value={c.code}>
                {c.flag} {c.code}
              </option>
            ))}
          </select>
          <input
            type="tel"
            dir="ltr"
            value={form.clientAltPhone}
            onChange={e => setForm(prev => ({ ...prev, clientAltPhone: e.target.value }))}
            placeholder="50123456"
            className={`${inputClass} font-mono`}
          />
        </div>
      </div>
    </div>
  );
}
