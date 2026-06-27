import React from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface DeleteModalProps {
  order: any;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteModal({ order, onClose, onConfirm }: DeleteModalProps) {
  const { t, dir } = useLanguage();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
        <div className="p-8 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-secondary text-lg mb-1">{t('deleteOrderTitle') || 'Delete Order'}</h3>
            <p className="text-sm text-secondary/60">
              {t('confirmDeleteOrder') || 'Are you sure you want to delete order'} "{order?.reference_label || order?.id}"{dir === 'rtl' ? '؟' : '?'} {t('cannotBeUndone') || 'This action cannot be undone.'}
            </p>
          </div>
          <div className="w-full flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-secondary/70 bg-secondary/5 hover:bg-secondary/10 border border-secondary/15 rounded-xl transition-colors cursor-pointer">
              {t('cancel') || 'Cancel'}
            </button>
            <button onClick={onConfirm} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer shadow-md">
              {t('yesDelete') || 'Delete'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
