'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getToken } from '@/lib/auth';
import { deleteRole, type Role } from '@/lib/api';

interface DeleteRoleModalProps {
  role: Role;
  onClose: () => void;
  onConfirmed: () => void;
}

export function DeleteRoleModal({ role, onClose, onConfirmed }: DeleteRoleModalProps) {
  const { t, dir } = useLanguage();
  const token = getToken() ?? '';
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    setLoading(true);
    try {
      const res = await deleteRole(role.id, token);
      toast.success((res as any).msg ?? 'تم الحذف');
      onConfirmed();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm p-4 bg-black/20">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm glass-panel crystal-accent rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 sm:p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6 text-red-500">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className={cn('text-xl font-semibold text-secondary mb-2', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>{t('deleteRoleTitle')}</h3>
          <p className="text-secondary/70 mb-2">{t('deleteRoleMessage')}</p>
          <p className="font-semibold text-secondary mb-8">{dir === 'rtl' ? role.name_ar : role.name_en}</p>
          <div className="w-full flex gap-3">
            <button type="button" onClick={onClose} disabled={loading}
              className="flex-1 bg-white/50 hover:bg-white/80 text-secondary border border-white/60 rounded-xl py-3 font-medium transition-all cursor-pointer">
              {t('cancel')}
            </button>
            <button type="button" onClick={confirm} disabled={loading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-medium transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('remove')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
