'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import {
  ChevronLeft, ChevronRight, Edit2, Trash2,
  User, Phone, Mail, FileText, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import type { Client } from './_types';

interface ClientDetailsProps {
  client: Client;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ClientDetails({ client, onBack, onEdit, onDelete }: ClientDetailsProps) {
  const { t, dir } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, x: dir === 'ltr' ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: dir === 'ltr' ? -20 : 20 }}
      className="space-y-6 pb-10 w-full"
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-secondary/60 hover:text-secondary transition-colors cursor-pointer group"
        >
          {dir === 'ltr'
            ? <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            : <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          <span className="font-medium">{t('back' as any)}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 rounded-xl transition-all duration-200 cursor-pointer"
            title={t('editClient' as any)}
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 bg-white text-red-500 border border-transparent hover:bg-red-50 hover:border-red-200 hover:text-red-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 rounded-xl transition-all duration-200 cursor-pointer"
            title={t('remove' as any)}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Client profile card */}
      <div className="glass-panel rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <User className="w-8 h-8" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className={cn('text-2xl font-semibold text-secondary truncate', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
                  {client.name}
                </h2>
                <span className="text-xs font-mono bg-secondary/5 px-2 py-0.5 rounded text-secondary/60 shrink-0">
                  {client.reference_label || `#${client.id}`}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center text-sm text-secondary/70 gap-2 sm:gap-4">
                <span className="flex items-center gap-1.5" dir="ltr">
                  <Phone className="w-4 h-4 opacity-70 shrink-0" />
                  {client.full_phone || `${client.country_code} ${client.phone}`}
                </span>
                {client.email && (
                  <>
                    <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                    <span className="flex items-center gap-1.5 truncate">
                      <Mail className="w-4 h-4 opacity-70 shrink-0" />
                      {client.email}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* WhatsApp button */}
          {client.whatsapp_url && (
            <button
              title="WhatsApp"
              onClick={() => window.open(client.whatsapp_url, '_blank')}
              className="p-3 bg-white text-emerald-600 border border-transparent hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 rounded-xl transition-all duration-200 cursor-pointer shrink-0"
            >
              <Image
                src="https://raiyansoft.com/wp-content/uploads/2026/05/whatsapp.png"
                alt="WhatsApp"
                width={24}
                height={24}
                className="object-contain"
                referrerPolicy="no-referrer"
              />
            </button>
          )}
        </div>
      </div>

      {/* Events & Notes grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events count */}
        <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className={cn('text-lg font-semibold text-secondary', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
                {t('events')}
              </h3>
            </div>
            <p className="text-secondary/70 text-sm mb-6">
              {dir === 'ltr'
                ? 'Total number of events managed for this client.'
                : 'إجمالي عدد المناسبات المسجلة لهذا العميل.'}
            </p>
          </div>
          <div className="bg-white/40 border border-secondary/5 rounded-2xl p-6 flex items-center justify-between">
            <span className="text-secondary/60 font-medium">
              {dir === 'ltr' ? 'Total Events' : 'إجمالي المناسبات'}
            </span>
            <span className="text-3xl font-bold text-primary font-mono">
              {client.events_count}
            </span>
          </div>
        </div>

        {/* Notes */}
        <div className="glass-panel rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className={cn('text-lg font-semibold text-secondary', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
              {dir === 'ltr' ? 'Notes' : 'الملاحظات'}
            </h3>
          </div>
          {client.notes ? (
            <div className="p-4 rounded-2xl bg-white/40 border border-secondary/5 text-secondary/80 whitespace-pre-wrap text-sm leading-relaxed min-h-[120px]">
              {client.notes}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-secondary/40 text-sm min-h-[120px]">
              {dir === 'ltr' ? 'No notes available' : 'لا توجد ملاحظات'}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
