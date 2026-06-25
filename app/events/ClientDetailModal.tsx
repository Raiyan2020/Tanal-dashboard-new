import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Phone, Mail, Calendar, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { type Client } from '@/lib/api';

export interface ClientDetailModalProps {
  client: Client | null;
  onClose: () => void;
}

export function ClientDetailModal({ client, onClose }: ClientDetailModalProps) {
  const { dir } = useLanguage();

  return (
    <AnimatePresence>
      {client && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm p-4 bg-black/20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg glass-panel crystal-accent rounded-3xl relative z-10 overflow-hidden shadow-2xl p-6 sm:p-8"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className={cn("text-xl font-semibold text-secondary", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
                {dir === 'ltr' ? 'Client Profile' : 'ملف العميل'}
              </h3>
              <button
                onClick={onClose}
                className="text-secondary/60 hover:text-secondary text-sm font-medium cursor-pointer"
              >
                {dir === 'ltr' ? 'Close' : 'إغلاق'}
              </button>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-secondary">{client.name}</h4>
                  <span className="text-xs font-mono text-secondary/60 bg-secondary/5 px-2 py-0.5 rounded">
                    {client.reference_label || `#${client.id}`}
                  </span>
                </div>
              </div>
              <div className="space-y-4 border-t border-secondary/15 pt-4">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/50 border border-secondary/5">
                  <span className="text-secondary/60 text-sm flex items-center gap-1.5"><Phone className="w-4 h-4 text-primary" />{dir === 'ltr' ? 'Phone' : 'الهاتف'}</span>
                  <span className="font-mono text-secondary" dir="ltr">{client.full_phone || `${client.country_code} ${client.phone}`}</span>
                </div>
                {client.email && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white/50 border border-secondary/5">
                    <span className="text-secondary/60 text-sm flex items-center gap-1.5"><Mail className="w-4 h-4 text-primary" />{dir === 'ltr' ? 'Email' : 'البريد الإلكتروني'}</span>
                    <span className="font-medium text-secondary truncate max-w-[200px]">{client.email}</span>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/50 border border-secondary/5">
                  <span className="text-secondary/60 text-sm flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary" />{dir === 'ltr' ? 'Events' : 'المناسبات'}</span>
                  <span className="font-bold text-primary font-mono">{client.events_count || 0}</span>
                </div>
                {client.notes && (
                  <div className="flex flex-col gap-2 p-3 rounded-2xl bg-white/50 border border-secondary/5">
                    <span className="text-secondary/60 text-sm flex items-center gap-1.5"><FileText className="w-4 h-4 text-primary" />{dir === 'ltr' ? 'Notes' : 'الملاحظات'}</span>
                    <p className="text-secondary/80 text-sm whitespace-pre-wrap mt-1 leading-relaxed bg-white/30 p-2.5 rounded-xl">{client.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
