'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, X, Loader2, User, Phone, Mail, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApiFinancialRecordDetail } from '@/lib/api';

interface FinancialDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  record: ApiFinancialRecordDetail | null;
  settling: boolean;
  pdfDownloading: boolean;
  onSettle: () => void;
  onDownloadPdf: (id: number) => void;
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

export function FinancialDetailsModal({
  isOpen,
  onClose,
  loading,
  record,
  settling,
  pdfDownloading,
  onSettle,
  onDownloadPdf,
  language,
  t
}: FinancialDetailsModalProps) {
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-3xl shadow-2xl border border-secondary/10 w-full max-w-lg overflow-hidden text-start"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-secondary/10 flex items-center justify-between bg-secondary/5">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-secondary text-base">
                  {t('financialRecordDetails')}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-secondary/10 text-secondary/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-secondary/60">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-xs">{t('loadingDetails')}</span>
                </div>
              ) : (
                record && (
                  <div className="space-y-6">
                    {/* Summary Section */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-xs font-mono bg-secondary/5 px-2 py-0.5 rounded text-secondary/60">
                          {record.reference_code || `FIN-${record.reference_number}`}
                        </span>
                        <h4 className="font-bold text-secondary text-lg mt-1">{record.event?.name}</h4>
                        <span className="text-xs text-secondary/50 block mt-0.5 font-medium">
                          {t('recordDate')}: {record.record_date}
                        </span>
                      </div>
                      <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold shrink-0', getStatusBadgeClass(record.status))}>
                        {getStatusLabel(record.status)}
                      </span>
                    </div>

                    {/* Amounts Board */}
                    <div className="grid grid-cols-3 gap-3 p-4 bg-secondary/5 rounded-2xl border border-secondary/10">
                      <div className="text-center">
                        <span className="text-[10px] text-secondary/40 font-bold block mb-0.5 uppercase">
                          {t('total')}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-secondary">
                          {Number(record.amount).toLocaleString()} {record.currency}
                        </span>
                      </div>
                      <div className="text-center border-x border-secondary/10">
                        <span className="text-[10px] text-secondary/40 font-bold block mb-0.5 uppercase">
                          {t('paid')}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-emerald-600">
                          {Number(record.paid_amount).toLocaleString()} {record.currency}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] text-secondary/40 font-bold block mb-0.5 uppercase">
                          {t('remaining')}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-red-500">
                          {Number(record.remaining_amount).toLocaleString()} {record.currency}
                        </span>
                      </div>
                    </div>

                    {/* Info Details List */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-secondary/50 uppercase tracking-wider">
                          {t('clientInfo')}
                        </h5>
                        <div className="bg-white/40 border border-secondary/5 p-3.5 rounded-xl space-y-2 text-sm text-secondary/80">
                          <p className="flex items-center gap-2">
                            <User className="w-4 h-4 text-secondary/30" />
                            <span className="font-semibold text-secondary">{record.client?.name}</span>
                          </p>
                          <p className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-secondary/30" />
                            <span dir="ltr">{record.client?.full_phone || record.client?.phone}</span>
                          </p>
                          {record.client?.email && (
                            <p className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-secondary/30" />
                              <span>{record.client?.email}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-secondary/50 uppercase tracking-wider">
                          {t('eventInfo')}
                        </h5>
                        <div className="bg-white/40 border border-secondary/5 p-3.5 rounded-xl space-y-2 text-sm text-secondary/80">
                          <p className="flex justify-between">
                            <span className="text-secondary/50">{t('eventRef')}</span>
                            <span className="font-mono">{record.event?.reference_label || `#${record.event?.reference_number}`}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-secondary/50">{t('eventDate')}</span>
                            <span>{record.event?.event_date}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-secondary/50">{t('eventTime')}</span>
                            <span>{record.event?.event_time}</span>
                          </p>
                        </div>
                      </div>

                      {record.notes && (
                        <div className="space-y-2">
                          <h5 className="text-xs font-bold text-secondary/50 uppercase tracking-wider">
                            {t('notes')}
                          </h5>
                          <div className="bg-amber-50/50 border border-amber-100 p-3.5 rounded-xl text-sm text-amber-900">
                            {record.notes}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Modal Actions */}
                    <div className="flex gap-3 pt-4 border-t border-secondary/10">
                      <button
                        type="button"
                        onClick={() => onDownloadPdf(record.id)}
                        disabled={pdfDownloading}
                        className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-secondary bg-white hover:bg-secondary/5 border border-secondary/15 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                      >
                        {pdfDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {t('downloadInvoice')}
                      </button>

                      {record.status !== "paid" && record.status !== 'cancelled' && (
                        <button type="button" onClick={onSettle} disabled={settling} className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-primary hover:bg-primary/95 rounded-xl transition-all cursor-pointer shadow-md shadow-primary/20 disabled:opacity-50">
                          {settling && <Loader2 className="w-4 h-4 animate-spin" />}
                          {t('manualSettle')}
                        </button>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
