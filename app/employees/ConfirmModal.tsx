import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '@/lib/i18n';

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }) {
  const { dir } = useLanguage();
  
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
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-secondary/20 hover:bg-secondary/5 transition-colors cursor-pointer">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer">
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
}
