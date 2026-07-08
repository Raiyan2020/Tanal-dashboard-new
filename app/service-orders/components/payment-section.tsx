import React from 'react';
import { useLanguage } from '@/lib/i18n';
import { type FormState } from './order-form';

interface PaymentSectionProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}

export function PaymentSection({ form, setForm }: PaymentSectionProps) {
  const { t, language } = useLanguage();

  return (
    <>
      {/* Is Paid */}
      <label className="flex items-center gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={form.isPaid}
          onChange={e => setForm({
            ...form,
            isPaid: e.target.checked,
            paymentType: e.target.checked ? 'single' : form.paymentType
          })}
          className="w-5 h-5 rounded text-primary border-secondary/20 focus:ring-primary cursor-pointer"
        />
        <span className="text-sm font-medium text-secondary/80 group-hover:text-secondary transition-colors">
          {t('isPaidQuestion') || 'Is this order paid?'}
        </span>
      </label>

      {!form.isPaid && (
        <>
          {/* Payment Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary/80">{t('paymentType') || 'Payment Type'}</label>
            <div className="flex gap-6">
              {(['single', 'two_installments'] as const).map(pt => (
                <label key={pt} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentType"
                    value={pt}
                    checked={form.paymentType === pt}
                    onChange={() => setForm({ ...form, paymentType: pt })}
                    className="w-4 h-4 text-primary border-secondary/20 focus:ring-primary cursor-pointer"
                  />
                  <span className="text-sm text-secondary/80">
                    {pt === 'single'
                      ? t('onePayment') || 'Full Payment'
                      : t('twoInstallments') || 'Two Installments'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {form.paymentType === 'two_installments' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-secondary/80">
                {t('firstInstallmentAmount') || 'First Installment Amount'} ({language === 'ar' ? 'د.ك' : 'KD'}) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.firstInstallmentAmount}
                onChange={e => setForm({ ...form, firstInstallmentAmount: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm"
              />
            </div>
          )}
        </>
      )}
    </>
  );
}
