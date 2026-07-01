'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import {
  ChevronLeft, ChevronRight, Edit2, Trash2,
  User, Phone, Mail, FileText, CalendarDays,
  Hash, MessageSquare,
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5 pb-12 w-full text-start"
    >
      {/* ── Back + Actions bar ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-secondary/50 hover:text-secondary transition-colors cursor-pointer group text-sm font-medium"
        >
          {dir === 'ltr'
            ? <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            : <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          {t('back' as any)}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            title={t('editClient' as any)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200/60 hover:bg-amber-100 hover:-translate-y-[1px] hover:shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            {t('edit' as any)}
          </button>
          <button
            onClick={onDelete}
            title={t('remove' as any)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 text-red-500 border border-red-200/60 hover:bg-red-100 hover:-translate-y-[1px] hover:shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t('remove' as any)}
          </button>
        </div>
      </div>

      {/* ── Hero profile card ── */}
      <div className="relative rounded-[2rem] overflow-hidden shadow-sm border border-secondary/5">
        {/* Gradient banner */}
        <div className="h-28 w-full bg-gradient-to-br from-primary/80 via-primary to-secondary/80 relative">
          {/* Decorative circles */}
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 blur-xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-black/10 blur-2xl" />
        </div>

        {/* White body */}
        <div className="bg-white/70 backdrop-blur-sm px-6 pb-6 pt-0">
          {/* Avatar + name row */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-8 mb-4">
            <div className="flex items-end gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-4 border-white shadow-lg flex items-center justify-center shrink-0">
                <User className="w-8 h-8 text-primary/70" />
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className={cn(
                    'text-xl font-bold text-secondary leading-tight',
                    dir === 'ltr' ? 'font-serif' : 'font-arabic'
                  )}>
                    {client.name}
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-secondary/6 text-secondary/50 px-2 py-0.5 rounded-full border border-secondary/10">
                    <Hash className="w-2.5 h-2.5" />
                    {client.reference_label || client.id}
                  </span>
                </div>
              </div>
            </div>

            {/* WhatsApp CTA */}
            {client.whatsapp_url && (
              <button
                onClick={() => window.open(client.whatsapp_url, '_blank')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-md shadow-emerald-200 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Image
                  src="https://raiyansoft.com/wp-content/uploads/2026/05/whatsapp.png"
                  alt="WhatsApp"
                  width={18}
                  height={18}
                  className="object-contain brightness-0 invert"
                  referrerPolicy="no-referrer"
                />
                WhatsApp
              </button>
            )}
          </div>

          {/* Contact chips */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/5 border border-secondary/10 text-sm text-secondary/70" dir="ltr">
              <Phone className="w-3.5 h-3.5 text-primary/60 shrink-0" />
              {client.full_phone || `${client.country_code} ${client.phone}`}
            </span>
            {client.email && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/5 border border-secondary/10 text-sm text-secondary/70 truncate max-w-[240px]">
                <Mail className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                {client.email}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats + Notes grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Events stat card */}
        <div className="glass-panel rounded-[2rem] p-6 border border-secondary/5 shadow-sm relative overflow-hidden">
          {/* Decorative blob */}
          <div className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full bg-primary/8 blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-secondary/40 font-medium uppercase tracking-wider">
                {dir === 'ltr' ? 'Managed Events' : 'المناسبات المسجلة'}
              </p>
              <h3 className={cn('text-base font-semibold text-secondary', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
                {t('events')}
              </h3>
            </div>
          </div>

          <div className="flex items-end justify-between">
            <p className="text-sm text-secondary/50 max-w-[180px] leading-relaxed">
              {dir === 'ltr'
                ? 'Total events organised for this client.'
                : 'إجمالي المناسبات التي تم تنظيمها لهذا العميل.'}
            </p>
            <div className="flex flex-col items-end">
              <span className="text-5xl font-extrabold text-primary font-mono leading-none">
                {client.events_count}
              </span>
              <span className="text-xs text-secondary/40 mt-1">
                {dir === 'ltr' ? 'events' : 'مناسبة'}
              </span>
            </div>
          </div>
        </div>

        {/* Notes card */}
        <div className="glass-panel rounded-[2rem] p-6 border border-secondary/5 shadow-sm relative overflow-hidden flex flex-col gap-4">
          <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-orange-100/60 blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-secondary/40 font-medium uppercase tracking-wider">
                {dir === 'ltr' ? 'Client Notes' : 'ملاحظات العميل'}
              </p>
              <h3 className={cn('text-base font-semibold text-secondary', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
                {dir === 'ltr' ? 'Notes' : 'الملاحظات'}
              </h3>
            </div>
          </div>

          {client.notes ? (
            <div className="flex-1 rounded-2xl bg-white/60 border border-secondary/8 px-4 py-3 text-secondary/80 whitespace-pre-wrap text-sm leading-relaxed min-h-[100px]">
              {client.notes}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-secondary/15 min-h-[100px] text-secondary/30">
              <MessageSquare className="w-8 h-8 opacity-40" />
              <p className="text-sm">{dir === 'ltr' ? 'No notes yet' : 'لا توجد ملاحظات'}</p>
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
}
