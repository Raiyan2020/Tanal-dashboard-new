'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getToken } from '@/lib/auth';
import { deleteClient, type Client } from '@/lib/api';
import { toast } from 'sonner';

interface ClientDeleteModalProps {
  client: Client;
  onClose: () => void;
  onConfirmed: () => void;
}

export function ClientDeleteModal({ client, onClose, onConfirmed }: ClientDeleteModalProps) {
  const { t, dir } = useLanguage();
  const token = getToken() ?? '';
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await deleteClient(client.id, token);
      toast.success(res.msg || 'تم حذف العميل بنجاح');
      onConfirmed();
    } catch (err) {
      toast.error((err as Error).message || 'حدث خطأ أثناء الحذف');
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
        className="w-full max-w-sm glass-panel crystal-accent rounded-3xl relative z-10 overflow-hidden shadow-2xl"
      >
        <div className="p-6 sm:p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6 text-red-500">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className={cn('text-xl font-semibold text-secondary mb-2', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            {t('deleteClientTitle' as any) || 'حذف العميل'}
          </h3>
          <p className="text-secondary/70 mb-2">
            {t('deleteClientMessage' as any) || 'هل أنت متأكد أنك تريد حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء.'}
          </p>
          <p className="text-sm font-semibold text-secondary mb-8">{client.name}</p>
          <div className="w-full flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-white/50 hover:bg-white/80 text-secondary border border-white/60 rounded-xl py-3 font-medium transition-all shadow-sm cursor-pointer"
            >
              {t('cancel' as any) || 'إلغاء'}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('remove' as any) || 'حذف'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
