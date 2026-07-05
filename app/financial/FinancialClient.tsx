'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Search, CreditCard, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getToken } from '@/lib/auth';
import {
  getAdminFinancialRecords,
  getFinancialRecordById,
  settleFinancialRecord,
  type ApiFinancialRecordItem,
  type ApiFinancialRecordDetail,
  type PaginatedItems
} from '@/lib/api';
import { FinancialRecordRow } from './components/FinancialRecordRow';
import { FinancialDetailsModal } from './components/FinancialDetailsModal';

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
      toast.error((err as Error).message || t('failedToLoadFinancialRecords'));
    } finally {
      setLoading(false);
    }
  }, [token, page, searchTerm, t]);

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
      toast.error((err as Error).message || t('failedToLoadRecordDetails'));
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
      toast.success(res.msg || t('recordSettledSuccessfully'));

      // Refresh details
      const detailRes = await getFinancialRecordById(selectedRecordId, token);
      setDetailRecord(detailRes.data);
      // Refresh list
      fetchRecords();
    } catch (err) {
      toast.error((err as Error).message || t('failedToSettleRecord'));
    } finally {
      setSettling(false);
    }
  };

  // Download PDF Action
  const handleDownloadPdf = async (id: number) => {
    if (!detailRecord) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(language === 'ar' ? 'يرجى السماح بالنوافذ المنبثقة لتحميل الفاتورة' : 'Please allow popups to download the invoice');
      return;
    }

    const isAr = language === 'ar';
    const dir = isAr ? 'rtl' : 'ltr';

    // Labels
    const title = isAr ? 'فاتورة مالية' : 'Financial Invoice';
    const invoiceNum = isAr ? 'رقم الفاتورة' : 'Invoice No.';
    const dateLabel = isAr ? 'التاريخ' : 'Date';
    const statusLabel = isAr ? 'الحالة' : 'Status';
    const clientLabel = isAr ? 'بيانات العميل' : 'Client Details';
    const nameLabel = isAr ? 'الاسم' : 'Name';
    const phoneLabel = isAr ? 'الهاتف' : 'Phone';
    const emailLabel = isAr ? 'البريد الإلكتروني' : 'Email';
    const eventLabel = isAr ? 'بيانات المناسبة' : 'Event Details';
    const eventNameLabel = isAr ? 'اسم المناسبة' : 'Event Name';
    const eventDateLabel = isAr ? 'تاريخ المناسبة' : 'Event Date';
    const eventTimeLabel = isAr ? 'توقيت المناسبة' : 'Event Time';
    const referenceLabel = isAr ? 'الرقم المرجعي للمناسبة' : 'Event Ref';
    const billingSummary = isAr ? 'ملخص الحساب' : 'Billing Summary';
    const totalLabel = isAr ? 'الإجمالي' : 'Total Amount';
    const paidLabel = isAr ? 'المدفوع' : 'Paid Amount';
    const remainingLabel = isAr ? 'المتبقي' : 'Remaining Amount';
    const notesLabel = isAr ? 'ملاحظات' : 'Notes';
    const footerText = isAr ? 'نشكركم على اختياركم تنال!' : 'Thank you for choosing Tanal!';

    // Status translations
    let statusVal = detailRecord.status.toUpperCase();
    if (detailRecord.status === 'paid') statusVal = isAr ? 'مدفوع بالكامل' : 'Paid Fully';
    else if (detailRecord.status === 'unpaid') statusVal = isAr ? 'غير مدفوع' : 'Unpaid';
    else if (detailRecord.status === 'installments') statusVal = isAr ? 'أقساط' : 'Installments';
    else if (detailRecord.status === 'cancelled') statusVal = isAr ? 'تم الإلغاء' : 'Cancelled';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="${language}" dir="${dir}">
      <head>
        <meta charset="utf-8">
        <title>${title} - ${detailRecord.reference_code || `FIN-${detailRecord.reference_number}`}</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Cairo:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: ${isAr ? "'Cairo', sans-serif" : "'Outfit', sans-serif"};
            color: #1e293b;
            padding: 40px;
            background-color: #ffffff;
            font-size: 14px;
            line-height: 1.6;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #e2e8f0;
            border-radius: 24px;
            padding: 40px;
            background: #ffffff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 24px;
            margin-bottom: 30px;
          }
          .brand-logo {
            font-size: 28px;
            font-weight: 700;
            color: #1e1e1e;
            letter-spacing: -0.5px;
          }
          .invoice-title {
            text-align: ${isAr ? 'left' : 'right'};
          }
          .invoice-title h1 {
            font-size: 24px;
            color: #0f172a;
            font-weight: 700;
            margin-bottom: 4px;
          }
          .meta-info {
            display: flex;
            flex-direction: column;
            gap: 6px;
            color: #64748b;
            font-size: 13px;
          }
          .info-grid {
            display: grid;
            grid-template-cols: 1fr 1fr;
            gap: 30px;
            margin-bottom: 40px;
          }
          .info-card {
            background-color: #f8fafc;
            border: 1px solid #f1f5f9;
            border-radius: 16px;
            padding: 20px;
          }
          .info-card h3 {
            font-size: 14px;
            color: #0f172a;
            font-weight: 700;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-card p {
            margin-bottom: 8px;
            color: #334155;
          }
          .info-card p:last-child {
            margin-bottom: 0;
          }
          .info-label {
            font-weight: 600;
            color: #64748b;
          }
          .billing-section {
            margin-bottom: 40px;
          }
          .billing-section h3 {
            font-size: 16px;
            color: #0f172a;
            font-weight: 700;
            margin-bottom: 16px;
          }
          .table-wrapper {
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            overflow: hidden;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th {
            background-color: #f8fafc;
            color: #475569;
            font-weight: 600;
            text-align: ${isAr ? 'right' : 'left'};
            padding: 14px 20px;
            font-size: 13px;
            border-bottom: 1px solid #e2e8f0;
          }
          td {
            padding: 16px 20px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
            font-size: 14px;
          }
          tr:last-child td {
            border-bottom: none;
          }
          .amount-value {
            font-weight: 700;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .status-paid {
            background-color: #d1fae5;
            color: #065f46;
          }
          .status-unpaid {
            background-color: #ffedd5;
            color: #9a3412;
          }
          .status-installments {
            background-color: #dbeafe;
            color: #1e40af;
          }
          .status-cancelled {
            background-color: #f1f5f9;
            color: #475569;
          }
          .notes-box {
            background-color: #fffbeb;
            border: 1px solid #fef3c7;
            border-radius: 16px;
            padding: 16px 20px;
            margin-bottom: 40px;
            color: #78350f;
          }
          .notes-box h4 {
            font-weight: 700;
            margin-bottom: 4px;
          }
          .footer {
            text-align: center;
            color: #94a3b8;
            font-size: 12px;
            border-top: 1px solid #f1f5f9;
            padding-top: 24px;
          }
          @media print {
            body {
              padding: 0;
            }
            .invoice-container {
              border: none;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="brand-logo">Tanal</div>
            <div class="invoice-title">
              <h1>${title}</h1>
              <div class="meta-info">
                <div><span class="info-label">${invoiceNum}:</span> ${detailRecord.reference_code || `FIN-${detailRecord.reference_number}`}</div>
                <div><span class="info-label">${dateLabel}:</span> ${detailRecord.record_date}</div>
                <div>
                  <span class="info-label">${statusLabel}:</span>
                  <span class="status-badge status-${detailRecord.status}">${statusVal}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-card">
              <h3>${clientLabel}</h3>
              <p><span class="info-label">${nameLabel}:</span> ${detailRecord.client?.name || ''}</p>
              <p><span class="info-label">${phoneLabel}:</span> <span dir="ltr">${detailRecord.client?.full_phone || detailRecord.client?.phone || ''}</span></p>
              ${detailRecord.client?.email ? `<p><span class="info-label">${emailLabel}:</span> ${detailRecord.client.email}</p>` : ''}
            </div>

            <div class="info-card">
              <h3>${eventLabel}</h3>
              <p><span class="info-label">${eventNameLabel}:</span> ${detailRecord.event?.name || ''}</p>
              <p><span class="info-label">${eventDateLabel}:</span> ${detailRecord.event?.event_date || ''}</p>
              <p><span class="info-label">${eventTimeLabel}:</span> ${detailRecord.event?.event_time || ''}</p>
              <p><span class="info-label">${referenceLabel}:</span> <span class="font-mono">${detailRecord.event?.reference_label || `#${detailRecord.event?.reference_number || ''}`}</span></p>
            </div>
          </div>

          ${detailRecord.notes ? `
          <div class="notes-box">
            <h4>${notesLabel}</h4>
            <p>${detailRecord.notes}</p>
          </div>
          ` : ''}

          <div class="billing-section">
            <h3>${billingSummary}</h3>
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>${totalLabel}</th>
                    <th>${paidLabel}</th>
                    <th>${remainingLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="amount-value">${Number(detailRecord.amount).toLocaleString()} ${detailRecord.currency}</td>
                    <td class="amount-value" style="color: #059669;">${Number(detailRecord.paid_amount).toLocaleString()} ${detailRecord.currency}</td>
                    <td class="amount-value" style="color: #dc2626;">${Number(detailRecord.remaining_amount).toLocaleString()} ${detailRecord.currency}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="footer">
            <p>${footerText}</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 pb-10 text-start">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className={cn('text-2xl font-medium text-secondary', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            {t('financialRecords')}
          </h2>
          {!loading && (
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
              {totalItems}
            </span>
          )}
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-4 sm:p-6 space-y-4">
        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 rtl:right-0 rtl:left-auto flex items-center px-4 pointer-events-none text-secondary/40">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder={t('searchFinancialPlaceholder')}
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
            records.map((item, idx) => (
              <FinancialRecordRow
                key={item.id}
                item={item}
                idx={idx}
                onClick={() => handleViewDetails(item.id)}
                language={language}
                t={t}
              />
            ))
          ) : (
            !loading && (
              <div className="flex flex-col items-center justify-center py-16 text-secondary/40 gap-4">
                <CreditCard className="w-14 h-14 opacity-25" />
                <div className="text-center">
                  <p className="text-base font-medium">{t('noRecordsFound')}</p>
                  <p className="text-sm mt-1">{t('adjustSearchFilters')}</p>
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
      <FinancialDetailsModal
        isOpen={selectedRecordId !== null}
        onClose={() => {
          setSelectedRecordId(null);
          setDetailRecord(null);
        }}
        loading={detailLoading}
        record={detailRecord}
        settling={settling}
        pdfDownloading={pdfDownloading}
        onSettle={handleSettle}
        onDownloadPdf={handleDownloadPdf}
        language={language}
        t={t}
      />
    </div>
  );
}
