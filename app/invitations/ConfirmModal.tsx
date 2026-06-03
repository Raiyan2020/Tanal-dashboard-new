import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'bg-red-500 hover:bg-red-600'
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void, 
  title: string, 
  message: string,
  confirmLabel?: string,
  cancelLabel?: string,
  confirmColor?: string
}) {
  const { t, dir } = useLanguage();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl"
        dir={dir}
      >
        <h3 className="text-xl font-semibold text-secondary mb-2">{title}</h3>
        <p className="text-secondary/70 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-secondary/20 hover:bg-secondary/5 transition-colors cursor-pointer text-sm font-medium">
            {cancelLabel === 'Cancel' ? (t('cancel' as any) || (dir === 'ltr' ? 'Cancel' : 'إلغاء')) : cancelLabel}
          </button>
          <button onClick={onConfirm} className={cn("px-4 py-2 rounded-xl text-white transition-colors cursor-pointer text-sm font-medium", confirmColor)}>
            {confirmLabel === 'Confirm' ? (t('confirm' as any) || (dir === 'ltr' ? 'Confirm' : 'تأكيد')) : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
