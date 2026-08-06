import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import { Wallet, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InstallmentAmountModalProps {
  /** The order being switched to `installments`. */
  order: { id: number; reference_label?: string; total_amount?: number | string | null } | null;
  /** Order total, already parsed — bounds the first instalment. */
  total: number;
  currency: string;
  onClose: () => void;
  onConfirm: (firstInstallmentAmount: number) => void | Promise<void>;
}

/**
 * Switching an order to `installments` from the list needs the amount already
 * paid, which the status dropdown alone cannot express. The remainder becomes
 * the second instalment, so the amount has to be below the order total.
 */
export function InstallmentAmountModal({
  order,
  total,
  currency,
  onClose,
  onConfirm,
}: InstallmentAmountModalProps) {
  const { t, language } = useLanguage();
  const ar = language === 'ar';
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const parsed = parseFloat(amount);
  const remaining = Number.isFinite(parsed) ? total - parsed : null;

  /** Checked on every keystroke, not just on confirm. */
  const validationError = ((): string | null => {
    if (!amount.trim()) return ar ? 'أدخل قيمة القسط الأول' : 'Enter the first installment amount';
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return ar ? 'يجب أن تكون القيمة أكبر من صفر' : 'The amount must be greater than zero';
    }
    // Equal to the total would mean the order is simply paid, not on instalments.
    if (total > 0 && parsed >= total) {
      return ar
        ? `يجب أن تكون القيمة أقل من إجمالي الطلب (${total} ${currency})`
        : `The amount must be less than the order total (${total} ${currency})`;
    }
    return null;
  })();

  // The "enter an amount" case is the empty starting state, so it only surfaces
  // once the field has been touched — everything else shows as it is typed.
  const visibleError = amount.trim() ? validationError : null;

  const handleConfirm = async () => {
    if (validationError) return;
    setSubmitting(true);
    try {
      await onConfirm(parsed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={submitting ? undefined : onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
        <div className="p-8 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
            <Wallet className="w-7 h-7 text-violet-500" />
          </div>

          <div>
            <h3 className="font-semibold text-secondary text-lg mb-1">
              {ar ? 'تحويل الطلب إلى أقساط' : 'Switch order to installments'}
            </h3>
            <p className="text-sm text-secondary/60">
              {ar
                ? `أدخل قيمة القسط الأول للطلب "${order?.reference_label ?? order?.id}"`
                : `Enter the first installment for order "${order?.reference_label ?? order?.id}"`}
            </p>
          </div>

          <div className="w-full space-y-1.5 text-start">
            <label className="text-sm font-medium text-secondary/80">
              {t('firstInstallmentAmount') || 'First Installment Amount'} ({currency})
              <span className="text-red-500"> *</span>
            </label>
            <input
              type="number"
              autoFocus
              min="0"
              // Caps the stepper arrows; typing past it is caught by `visibleError`.
              max={total > 0 ? total : undefined}
              step="0.001"
              placeholder="0.000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
              disabled={submitting}
              className={cn(
                'w-full px-4 py-3 rounded-xl bg-white/60 border outline-none text-secondary text-sm disabled:opacity-50 transition-colors',
                visibleError
                  ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                  : 'border-secondary/15 focus:border-primary/50 focus:ring-2 focus:ring-primary/20'
              )}
            />
            {visibleError ? (
              <p className="text-xs text-red-500">{visibleError}</p>
            ) : (
              <div className="flex items-center justify-between text-xs text-secondary/50 pt-0.5">
                <span>{ar ? 'إجمالي الطلب' : 'Order total'}: {total} {currency}</span>
                {remaining !== null && remaining > 0 && (
                  <span className="text-secondary/70 font-medium">
                    {ar ? 'المتبقي' : 'Remaining'}: {remaining.toFixed(3)} {currency}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="w-full flex gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-secondary/70 bg-secondary/5 hover:bg-secondary/10 border border-secondary/15 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {t('cancel') || (ar ? 'إلغاء' : 'Cancel')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting || !!validationError}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-xl transition-colors cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {ar ? 'تأكيد' : 'Confirm'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
