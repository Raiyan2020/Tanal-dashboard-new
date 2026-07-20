'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { ApiFinancialRecordItem } from '@/lib/api';

interface FinancialRecordRowProps {
  item: ApiFinancialRecordItem;
  idx: number;
  onClick: () => void;
  language: string;
  t: (key: string) => string;
}

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'paid':
      return 'bg-emerald-100 text-emerald-700';
    case 'unpaid':
      return 'bg-orange-100 text-orange-700';
    case 'installments':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-secondary/10 text-secondary/70';
  }
};

export function FinancialRecordRow({ item, idx, onClick, language, t }: FinancialRecordRowProps) {
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return t('statusPaidFully');
      case 'unpaid':
        return t('statusUnpaid');
      case 'installments':
        return t('statusInstallments');
      case 'cancelled':
        return t('statusCancelled');
      default:
        return status.toUpperCase();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.02, duration: 0.15 }}
      onClick={onClick}
      className="p-4 rounded-2xl bg-white/40 border border-secondary/5 shadow-sm hover:bg-white/65 hover:border-secondary/15 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 text-start group"
    >
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono bg-secondary/5 px-2 py-0.5 rounded text-secondary/60">
            {item.reference_code || `FIN-${item.reference_number}`}
          </span>
          {/* Service order reference, falling back to the legacy event name */}
          <h3 className="font-semibold text-secondary text-sm truncate m-0 group-hover:text-primary transition-colors">
            {item.service_order_reference || item.event_name || '—'}
          </h3>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center text-xs text-secondary/55 gap-1 sm:gap-3">
          <span className="font-medium">{item.client_name}</span>
          <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
          <span dir="ltr">{item.client_phone}</span>
          <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
          <span>{item.record_date_label || item.record_date}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap shrink-0 justify-between md:justify-end border-t border-secondary/5 md:border-none pt-2 md:pt-0 mt-1 md:mt-0">
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0', getStatusBadgeClass(item.status))}>
          {getStatusLabel(item.status)}
        </span>
        <div className="flex flex-col items-end min-w-[100px]">
          <span className="text-[10px] font-bold text-secondary/40 whitespace-nowrap uppercase">
            {t('totalAmount')}
          </span>
          <span className="text-sm font-bold text-primary">
            {Number(item.amount).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}{' '}
            {item.currency}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
