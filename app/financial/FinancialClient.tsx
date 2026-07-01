'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Download, CreditCard, Loader2, X, FileText,
  Calendar, Phone, Mail, User, ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getToken } from '@/lib/auth';
import {
  getAdminFinancialRecords,
  getFinancialRecordById,
  settleFinancialRecord,
  downloadFinancialRecordPdf,
  type ApiFinancialRecordItem,
  type ApiFinancialRecordDetail,
  type PaginatedItems
} from '@/lib/api';

export default function FinancialClient({
  initialData,
  initialPagination,
}: {
  initialData: ApiFinancialRecordItem[] | null;
  initialPagination: PaginatedItems<ApiFinancialRecordItem>['pagination'] | null;
}) {
  const { t, dir, language } = useLanguage();
  const [token] = useState(() => getToken() ?? '');

  const [records, setRecords] = useState<ApiFinancialRecordItem[]>(initialData ?? []);
  const [loading, setLoading] = useState(!initialData);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialPagination?.last_page ?? 1);
  const [totalItems, setTotalItems] = useState(initialPagination?.total ?? 0);

  // Detail view states
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [detailRecord, setDetailRecord] = useState<ApiFinancialRecordDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);

  const isInitialMount = useRef(true);

  const fetchRecords = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getAdminFinancialRecords(token, {
        page,
        per_page: 15,
        keyword: searchTerm || undefined,
      });
      setRecords(res.data.items || []);
      setTotalPages(res.data.pagination.last_page || 1);
      setTotalItems(res.data.pagination.total || 0);
    } catch (err) {
      toast.error((err as Error).message || 'فشل تحميل السجلات المالية');
    } finally {
      setLoading(false);
    }
  }, [token, page, searchTerm]);

  useEffect(() => {
    if (isInitialMount.current && initialData) {
      isInitialMount.current = false;
      return;
    }
    fetchRecords();
  }, [fetchRecords, initialData]);

  // Fetch record details
  const handleViewDetails = async (id: number) => {
    if (!token) return;
    setSelectedRecordId(id);
    setDetailLoading(true);
    try {
      const res = await getFinancialRecordById(id, token);
      setDetailRecord(res.data);
    } catch (err) {
      toast.error((err as Error).message || 'فشل تحميل تفاصيل السجل');
      setSelectedRecordId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // Settle Record Action
  const handleSettle = async () => {
    if (!token || !selectedRecordId) return;
    setSettling(true);
    try {
      const res = await settleFinancialRecord(selectedRecordId, token);
      toast.success(res.msg || (language === 'ar' ? 'تمت تسوية السجل بنجاح' : 'Record settled successfully'));

      // Refresh details
      const detailRes = await getFinancialRecordById(selectedRecordId, token);
      setDetailRecord(detailRes.data);
      // Refresh list
      fetchRecords();
    } catch (err) {
      toast.error((err as Error).message || 'فشل تسوية السجل');
    } finally {
      setSettling(false);
    }
  };

  // Download PDF Action
  const handleDownloadPdf = async (id: number) => {
    if (!token) return;
    setPdfDownloading(true);
    try {
      const blob = await downloadFinancialRecordPdf(id, token);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial-record-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success(language === 'ar' ? 'تم تحميل ملف PDF بنجاح' : 'PDF downloaded successfully');
    } catch (err) {
      toast.error((err as Error).message || 'فشل تحميل ملف PDF');
    } finally {
      setPdfDownloading(false);
    }
  };

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

  const getStatusLabel = (status: string) => {
    if (language === 'ar') {
      switch (status) {
        case 'paid': return 'مدفوع بالكامل';
        case 'unpaid': return 'غير مدفوع';
        case 'installments': return 'أقساط';
        default: return status;
      }
    }
    return status.toUpperCase();
  };

  return (
    <div className="space-y-6 pb-10 text-start">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className={cn('text-2xl font-medium text-secondary', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            {t('financial') || 'Financial Records'}
          </h2>
          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">{totalItems}</span>
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-4 sm:p-6 space-y-4">
        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 rtl:right-0 rtl:left-auto flex items-center px-4 pointer-events-none text-secondary/40">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder={t('searchFinancialPlaceholder') || 'Search financial records by event, client or code...'}
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 pl-10 pr-4 rtl:pr-10 rtl:pl-4 outline-none text-secondary text-sm transition-all"
            />
          </div>



        </div>

        {/* List Grid */}
        <div className="space-y-3 relative min-h-[200px]">
          {loading && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {records.length > 0 ? (
            records.map((item, idx) => {
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02, duration: 0.15 }}
                  onClick={() => handleViewDetails(item.id)}
                  className="p-4 rounded-2xl bg-white/40 border border-secondary/5 shadow-sm hover:bg-white/65 hover:border-secondary/15 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 text-start group"
                >
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono bg-secondary/5 px-2 py-0.5 rounded text-secondary/60">
                        {item.reference_code || `FIN-${item.reference_number}`}
                      </span>
                      <h3 className="font-semibold text-secondary text-sm truncate m-0 group-hover:text-primary transition-colors">
                        {item.event_name}
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
                        {language === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount'}
                      </span>
                      <span className="text-sm font-bold text-primary">
                        {Number(item.amount).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}{' '}
                        {item.currency}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            !loading && (
              <div className="flex flex-col items-center justify-center py-16 text-secondary/40 gap-4">
                <CreditCard className="w-14 h-14 opacity-25" />
                <div className="text-center">
                  <p className="text-base font-medium">{t('noRecordsFound') || 'No records found'}</p>
                  <p className="text-sm mt-1">{t('adjustSearchFilters') || 'Try adjusting your search or filters'}</p>
                </div>
              </div>
            )
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6 border-t border-secondary/5">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="p-2 rounded-xl bg-white border border-secondary/10 text-secondary/60 hover:text-secondary hover:border-secondary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {dir === 'ltr' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <span className="text-xs text-secondary/60 font-mono px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-xl bg-white border border-secondary/10 text-secondary/60 hover:text-secondary hover:border-secondary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {dir === 'ltr' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal Overlay */}
      <AnimatePresence>
        {selectedRecordId !== null && (
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
                    {language === 'ar' ? 'تفاصيل السجل المالي' : 'Financial Record Details'}
                  </h3>
                </div>
                <button
                  onClick={() => { setSelectedRecordId(null); setDetailRecord(null); }}
                  className="p-1.5 rounded-lg hover:bg-secondary/10 text-secondary/60 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {detailLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-secondary/60">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-xs">{language === 'ar' ? 'جاري تحميل التفاصيل...' : 'Loading details...'}</span>
                  </div>
                ) : (
                  detailRecord && (
                    <div className="space-y-6">
                      {/* Summary Section */}
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="text-xs font-mono bg-secondary/5 px-2 py-0.5 rounded text-secondary/60">
                            {detailRecord.reference_code || `FIN-${detailRecord.reference_number}`}
                          </span>
                          <h4 className="font-bold text-secondary text-lg mt-1">{detailRecord.event?.name}</h4>
                          <span className="text-xs text-secondary/50 block mt-0.5 font-medium">
                            {language === 'ar' ? 'تاريخ السجل: ' : 'Record Date: '} {detailRecord.record_date}
                          </span>
                        </div>
                        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold shrink-0', getStatusBadgeClass(detailRecord.status))}>
                          {getStatusLabel(detailRecord.status)}
                        </span>
                      </div>

                      {/* Amounts Board */}
                      <div className="grid grid-cols-3 gap-3 p-4 bg-secondary/5 rounded-2xl border border-secondary/10">
                        <div className="text-center">
                          <span className="text-[10px] text-secondary/40 font-bold block mb-0.5 uppercase">
                            {language === 'ar' ? 'الإجمالي' : 'Total'}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-secondary">
                            {Number(detailRecord.amount).toLocaleString()} {detailRecord.currency}
                          </span>
                        </div>
                        <div className="text-center border-x border-secondary/10">
                          <span className="text-[10px] text-secondary/40 font-bold block mb-0.5 uppercase">
                            {language === 'ar' ? 'المدفوع' : 'Paid'}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-emerald-600">
                            {Number(detailRecord.paid_amount).toLocaleString()} {detailRecord.currency}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] text-secondary/40 font-bold block mb-0.5 uppercase">
                            {language === 'ar' ? 'المتبقي' : 'Remaining'}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-red-500">
                            {Number(detailRecord.remaining_amount).toLocaleString()} {detailRecord.currency}
                          </span>
                        </div>
                      </div>

                      {/* Info Details List */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h5 className="text-xs font-bold text-secondary/50 uppercase tracking-wider">
                            {language === 'ar' ? 'معلومات العميل' : 'Client Info'}
                          </h5>
                          <div className="bg-white/40 border border-secondary/5 p-3.5 rounded-xl space-y-2 text-sm text-secondary/80">
                            <p className="flex items-center gap-2">
                              <User className="w-4 h-4 text-secondary/30" />
                              <span className="font-semibold text-secondary">{detailRecord.client?.name}</span>
                            </p>
                            <p className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-secondary/30" />
                              <span dir="ltr">{detailRecord.client?.full_phone || detailRecord.client?.phone}</span>
                            </p>
                            {detailRecord.client?.email && (
                              <p className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-secondary/30" />
                                <span>{detailRecord.client?.email}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h5 className="text-xs font-bold text-secondary/50 uppercase tracking-wider">
                            {language === 'ar' ? 'معلومات الفعالية' : 'Event Info'}
                          </h5>
                          <div className="bg-white/40 border border-secondary/5 p-3.5 rounded-xl space-y-2 text-sm text-secondary/80">
                            <p className="flex justify-between">
                              <span className="text-secondary/50">{language === 'ar' ? 'رقم مرجع الفعالية' : 'Event Ref'}</span>
                              <span className="font-mono">{detailRecord.event?.reference_label || `#${detailRecord.event?.reference_number}`}</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-secondary/50">{language === 'ar' ? 'تاريخ الفعالية' : 'Event Date'}</span>
                              <span>{detailRecord.event?.event_date}</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-secondary/50">{language === 'ar' ? 'توقيت الفعالية' : 'Event Time'}</span>
                              <span>{detailRecord.event?.event_time}</span>
                            </p>
                          </div>
                        </div>

                        {detailRecord.notes && (
                          <div className="space-y-2">
                            <h5 className="text-xs font-bold text-secondary/50 uppercase tracking-wider">
                              {language === 'ar' ? 'ملاحظات' : 'Notes'}
                            </h5>
                            <div className="bg-amber-50/50 border border-amber-100 p-3.5 rounded-xl text-sm text-amber-900">
                              {detailRecord.notes}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Modal Actions */}
                      <div className="flex gap-3 pt-4 border-t border-secondary/10">
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(detailRecord.id)}
                          disabled={pdfDownloading}
                          className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-secondary bg-white hover:bg-secondary/5 border border-secondary/15 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                        >
                          {pdfDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          {language === 'ar' ? 'تحميل الفاتورة PDF' : 'Download Invoice'}
                        </button>

                        {detailRecord.status !== 'paid' && (
                          <button
                            type="button"
                            onClick={handleSettle}
                            disabled={settling}
                            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-primary hover:bg-primary/95 rounded-xl transition-all cursor-pointer shadow-md shadow-primary/20 disabled:opacity-50"
                          >
                            {settling && <Loader2 className="w-4 h-4 animate-spin" />}
                            {language === 'ar' ? 'تسوية يدوية' : 'Manual Settle'}
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
    </div>
  );
}
