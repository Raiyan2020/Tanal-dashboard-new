import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import { Ban, Loader2 } from 'lucide-react';

interface CancelModalProps {
  order: { reference_label?: string; id?: number } | null;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

/**
 * Confirmation for cancelling a paid order. Cancelling suspends the barcode and
 * does not issue a refund, so the consequences are spelled out here.
 */
export function CancelModal({ order, onClose, onConfirm }: CancelModalProps) {
  const { t, dir, language } = useLanguage();
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
        <div className="p-8 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center">
            <Ban className="w-7 h-7 text-rose-500" />
          </div>
          <div>
            <h3 className="font-semibold text-secondary text-lg mb-1">
              {language === 'ar' ? 'إلغاء الطلب' : 'Cancel Order'}
            </h3>
            <p className="text-sm text-secondary/60">
              {language === 'ar'
                ? `هل أنت متأكد من إلغاء الطلب "${order?.reference_label ?? order?.id}"؟`
                : `Are you sure you want to cancel order "${order?.reference_label ?? order?.id}"${dir === 'rtl' ? '؟' : '?'}`}
            </p>
            <p className="text-xs text-rose-600 mt-2 font-medium">
              {language === 'ar'
                ? 'سيتم إيقاف الباركود ولن يتم استرداد المبلغ تلقائياً.'
                : 'The barcode will be suspended and no refund is issued automatically.'}
            </p>
          </div>
          <div className="w-full flex gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-secondary/70 bg-secondary/5 hover:bg-secondary/10 border border-secondary/15 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {language === 'ar' ? 'رجوع' : 'Back'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors cursor-pointer shadow-md disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {language === 'ar' ? 'تأكيد الإلغاء' : 'Confirm Cancel'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
