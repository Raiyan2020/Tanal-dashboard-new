import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, Trash2, Ban, ChevronLeft, ChevronRight,
  Calendar, User, Phone, Briefcase, ClipboardList, Loader2, Eye,
  AlertTriangle, ShieldOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import {
  ApiServiceOrderItem, ServiceOrderStatus, parseAmount,
  updateServiceOrderPaymentStatus,
} from '@/lib/api';
import { getToken } from '@/lib/auth';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from 'sonner';

interface OrderListProps {
  orders: ApiServiceOrderItem[];
  statuses: ServiceOrderStatus[];
  paymentStatuses: ServiceOrderStatus[];
  loading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  activeTab: string;
  onTabChange: (val: string) => void;
  orderBy: string;
  onOrderByChange: (val: string) => void;
  orderDir: 'ASC' | 'DESC';
  onOrderDirChange: (val: 'ASC' | 'DESC') => void;
  page: number;
  onPageChange: (val: number) => void;
  totalPages: number;
  totalItems: number;
  onCreateNew: () => void;
  onViewDetail: (order: ApiServiceOrderItem) => void;
  onEdit: (order: ApiServiceOrderItem) => void;
  onDelete: (order: ApiServiceOrderItem) => void;
  onCancel: (order: ApiServiceOrderItem) => void;
}

/** Status values that represent payment state rather than lifecycle state. */
export const PAYMENT_STATUS_VALUES = ['paid', 'unpaid', 'installments', 'rejected'];

export const getStatusBadgeClass = (val: string) => {
  switch (val) {
    case 'upcoming':
    case 'coming':
      return 'bg-blue-100 text-blue-700';
    case 'in-progress':
      return 'bg-amber-100 text-amber-700';
    case 'finished':
    case 'paid':
      return 'bg-emerald-100 text-emerald-700';
    case 'rejected':
      return 'bg-red-100 text-red-700';
    case 'cancelled':
      return 'bg-rose-100 text-rose-700';
    case 'installments':
      return 'bg-violet-100 text-violet-700';
    case 'unpaid':
      return 'bg-orange-100 text-orange-700';
    default:
      return 'bg-secondary/10 text-secondary/70';
  }
};

export const getStatusDotClass = (val: string) => {
  switch (val) {
    case 'upcoming':
    case 'coming':
      return 'bg-blue-500';
    case 'in-progress':
      return 'bg-amber-500';
    case 'finished':
    case 'paid':
      return 'bg-emerald-500';
    case 'rejected':
      return 'bg-red-500';
    case 'cancelled':
      return 'bg-rose-500';
    case 'installments':
      return 'bg-violet-500';
    case 'unpaid':
      return 'bg-orange-500';
    default:
      return 'bg-secondary/40';
  }
};

/** An order is cancelled when the API reports a `cancelled` status. */
export const isOrderCancelled = (statuses: ServiceOrderStatus[]) =>
  statuses.some(s => s.value === 'cancelled');

/**
 * Paid (fully or partially) orders must be cancelled rather than deleted —
 * `DELETE` is rejected by the backend once money has changed hands.
 */
export const isOrderPaid = (statuses: ServiceOrderStatus[]) =>
  statuses.some(s => s.value === 'paid' || s.value === 'installments');

export function OrderList({
  orders,
  statuses,
  paymentStatuses,
  loading,
  search,
  onSearchChange,
  activeTab,
  onTabChange,
  orderBy,
  onOrderByChange,
  orderDir,
  onOrderDirChange,
  page,
  onPageChange,
  totalPages,
  totalItems,
  onCreateNew,
  onViewDetail,
  onEdit,
  onDelete,
  onCancel,
}: OrderListProps) {
  const { dir, t, language } = useLanguage();
  const { can } = usePermissions();
  const [token] = useState(() => getToken() ?? '');
  // Track which orders are currently being payment-updated
  const [updatingPayment, setUpdatingPayment] = useState<Record<number, boolean>>({});
  // Local payment status overrides keyed by order id
  const [paymentOverrides, setPaymentOverrides] = useState<Record<number, string>>({});

  const tabs = [
    { id: 'all', label: language === 'ar' ? 'الكل' : 'All' },
    ...statuses.map(st => ({ id: st.value, label: st.label }))
  ];

  return (
    <div className="space-y-6 pb-10 text-start">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className={cn('text-2xl font-medium text-secondary', dir === 'ltr' ? 'font-serif' : 'font-arabic')}>
            {t('serviceOrders') || 'Service Orders'}
          </h2>
          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">{totalItems}</span>
        </div>
        {can('add-service-order') && (
          <button onClick={onCreateNew}
            className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer hover:-translate-y-0.5">
            <Plus className="w-4 h-4" />
            {t('addOrder') || 'Add Order'}
          </button>
        )}
      </div>

      <div className="glass-panel rounded-3xl p-4 sm:p-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 rtl:right-0 rtl:left-auto flex items-center px-4 pointer-events-none text-secondary/40">
            <Search className="w-4 h-4" />
          </div>
          <input type="text" placeholder={t('searchOrdersPlaceholder') || 'Search orders...'}
            value={search} onChange={e => onSearchChange(e.target.value)}
            className="w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 pl-10 pr-4 rtl:pr-10 rtl:pl-4 outline-none text-secondary text-sm transition-all" />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => onTabChange(tab.id)}
              className={cn('px-3.5 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer shrink-0',
                activeTab === tab.id
                  ? 'bg-secondary text-white shadow-sm'
                  : 'bg-white/50 text-secondary/70 hover:bg-white/80')}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort options */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-secondary/5">
          <div className="flex items-center gap-2 text-xs text-secondary/60">
            <span>{language === 'ar' ? 'ترتيب حسب:' : 'Sort By:'}</span>
            <select
              value={orderBy}
              onChange={e => onOrderByChange(e.target.value)}
              className="bg-white/50 border border-secondary/15 rounded-lg px-2.5 py-1.5 outline-none text-secondary cursor-pointer text-xs"
            >
              <option value="event_date">{language === 'ar' ? 'تاريخ الفعالية' : 'Event Date'}</option>
              <option value="created_at">{language === 'ar' ? 'تاريخ الإنشاء' : 'Created At'}</option>
              <option value="reference_number">{language === 'ar' ? 'رقم المرجع' : 'Reference Number'}</option>
              <option value="total_amount">{language === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount'}</option>
            </select>
          </div>

          <div className="flex bg-white/50 border border-secondary/15 rounded-lg p-0.5">
            <button
              onClick={() => onOrderDirChange('ASC')}
              className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all", orderDir === 'ASC' ? "bg-secondary text-white" : "text-secondary/60")}
            >
              {language === 'ar' ? 'تصاعدي' : 'Ascending'}
            </button>
            <button
              onClick={() => onOrderDirChange('DESC')}
              className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all", orderDir === 'DESC' ? "bg-secondary text-white" : "text-secondary/60")}
            >
              {language === 'ar' ? 'تنازلي' : 'Descending'}
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-3 relative min-h-[200px]">
          {loading && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {orders.length > 0 ? orders.map((order, idx) => {
              return (
                <motion.div key={order.id}
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }} transition={{ delay: idx * 0.02, duration: 0.15 }}
                  className="p-4 rounded-2xl bg-white/40 border border-secondary/5 shadow-sm hover:bg-white/60 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Left info — click to open detail */}
                    <button
                      type="button"
                      onClick={() => onViewDetail(order)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-start cursor-pointer group/card"
                    >
                      <div className="w-11 h-11 rounded-xl bg-primary/10 group-hover/card:bg-primary/20 flex items-center justify-center shrink-0 transition-colors">
                        <Briefcase className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-xs font-mono bg-secondary/5 px-2 py-0.5 rounded text-secondary/60 shrink-0">
                            {order.reference_label || `SO-${order.reference_number}`}
                          </span>
                          <h3 className="font-semibold text-secondary text-sm truncate group-hover/card:text-primary transition-colors">{order.service_name}</h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-secondary/55 flex-wrap">
                          {order.client_name && (
                            <span className="flex items-center gap-1 shrink-0"><User className="w-3 h-3" /> {order.client_name}</span>
                          )}
                          {order.client_phone && (
                            <>
                              <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                              <span className="flex items-center gap-1 shrink-0 font-mono" dir="ltr">
                                <Phone className="w-3 h-3" /> {order.client_phone}
                              </span>
                            </>
                          )}
                          <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                          <span className="flex items-center gap-1 shrink-0"><Calendar className="w-3 h-3" /> {order.event_date ?? '—'}</span>
                          <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                          <span className="shrink-0 font-medium">
                            {parseAmount(order.total_amount).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}{' '}
                            {order.currency || (language === 'ar' ? 'د.ك' : 'KD')}
                          </span>
                        </div>

                        {/* Alerts — surfaced inline so they are visible without opening the order */}
                        {(order.has_pending_second_payment || order.is_barcode_suspended) && (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {order.has_pending_second_payment && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-bold">
                                <AlertTriangle className="w-3 h-3" />
                                {language === 'ar' ? 'قسط ثانٍ مستحق' : 'Second payment due'}
                              </span>
                            )}
                            {order.is_barcode_suspended && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold">
                                <ShieldOff className="w-3 h-3" />
                                {language === 'ar' ? 'الباركود موقوف' : 'Barcode suspended'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Right badges + actions */}
                    <div className={cn("flex items-center gap-2 flex-wrap shrink-0", dir === 'rtl' ? 'flex-row-reverse' : '')}>
                      {/* Non-payment status badges */}
                      {order.statuses
                        .filter(st => !PAYMENT_STATUS_VALUES.includes(st.value))
                        .map((st, i) => (
                          <span key={i} className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0', getStatusBadgeClass(st.value))}>
                            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', getStatusDotClass(st.value))} />
                            {st.label}
                          </span>
                        ))}

                      {/* Payment status select */}
                      {(() => {
                        const currentPaymentStatus = paymentOverrides[order.id]
                          ?? order.statuses.find(s => PAYMENT_STATUS_VALUES.includes(s.value))?.value
                          ?? 'unpaid';
                        const isUpdating = !!updatingPayment[order.id];
                        // Payment status is immutable once the order is cancelled.
                        const cancelled = isOrderCancelled(order.statuses);
                        const canEditPayment = can('edit-service-order') && !cancelled;
                        return (
                          <div className="relative shrink-0">
                            {isUpdating && (
                              <div className="absolute inset-0 flex items-center justify-center z-10">
                                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                              </div>
                            )}
                            <select
                              disabled={isUpdating || !canEditPayment}
                              value={currentPaymentStatus}
                              onClick={e => e.stopPropagation()}
                              onChange={async (e) => {
                                e.stopPropagation();
                                const nextStatus = e.target.value as 'paid' | 'unpaid' | 'installments' | "rejected";
                                setUpdatingPayment(prev => ({ ...prev, [order.id]: true }));
                                try {
                                  await updateServiceOrderPaymentStatus(order.id, nextStatus, token);
                                  toast.success(language === 'ar' ? 'تم تحديث حالة الدفع بنجاح' : 'Payment status updated successfully');
                                  setPaymentOverrides(prev => ({ ...prev, [order.id]: nextStatus }));
                                } catch (err) {
                                  toast.error((err as Error).message || (language === 'ar' ? 'فشل في تحديث حالة الدفع' : 'Failed to update payment status'));
                                } finally {
                                  setUpdatingPayment(prev => ({ ...prev, [order.id]: false }));
                                }
                              }}
                              className={cn(
                                'appearance-none cursor-pointer py-0.5 outline-none rounded-full text-[10px] font-bold ring-1 ring-inset whitespace-nowrap transition-opacity shrink-0',
                                dir === 'ltr' ? 'pl-2 pr-5' : 'pr-2 pl-5',
                                isUpdating && 'opacity-40 pointer-events-none',
                                getStatusBadgeClass(currentPaymentStatus)
                              )}
                            >
                              {(paymentStatuses.length > 0
                                ? paymentStatuses
                                : [
                                    { value: 'paid', label: language === 'ar' ? 'مدفوع' : 'Paid' },
                                    { value: 'unpaid', label: language === 'ar' ? 'غير مدفوع' : 'Unpaid' },
                                    { value: 'installments', label: language === 'ar' ? 'أقساط' : 'Installments' },
                                    { value: 'rejected', label: language === 'ar' ? 'مرفوض' : 'Rejected' },
                                  ]
                              ).map(ps => (
                                <option key={ps.value} value={ps.value}>{ps.label}</option>
                              ))}
                            </select>
                            <div className={cn('pointer-events-none absolute inset-y-0 flex items-center', dir === 'ltr' ? 'right-1.5' : 'left-1.5')}>
                              <svg className="w-2.5 h-2.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Action buttons */}
                      <div className={cn("flex items-center gap-1 shrink-0", dir === 'rtl' ? 'border-r border-secondary/10 pr-2 mr-2' : 'border-l border-secondary/10 pl-2 ml-2')}>
                        {order.whatsapp_url && (
                          <button title={language === 'ar' ? 'فتح المحادثة' : 'Open WhatsApp'} onClick={() => window.open(order.whatsapp_url!, '_blank')}
                            className="p-2 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer flex items-center justify-center">
                            <Image src="https://raiyansoft.com/wp-content/uploads/2026/05/whatsapp.png" alt="WA" width={15} height={15} referrerPolicy="no-referrer" />
                          </button>
                        )}
                        <button title={language === 'ar' ? 'عرض التفاصيل' : 'View Details'} onClick={() => onViewDetail(order)}
                          className="p-2 bg-white text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 rounded-lg transition-all cursor-pointer hover:-translate-y-px">
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Cancelled orders can be neither cancelled nor deleted.
                            Paid orders cancel (barcode suspended, no refund); unpaid ones delete. */}
                        {!isOrderCancelled(order.statuses) && (
                          isOrderPaid(order.statuses)
                            ? can('cancel-service-order') && (
                              <button title={language === 'ar' ? 'إلغاء الطلب' : 'Cancel order'} onClick={() => onCancel(order)}
                                className="p-2 bg-white text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-all cursor-pointer hover:-translate-y-px">
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )
                            : can('delete-service-order') && (
                              <button title={language === 'ar' ? 'حذف' : 'Remove'} onClick={() => onDelete(order)}
                                className="p-2 bg-white text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-all cursor-pointer hover:-translate-y-px">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            }) : (
              !loading && (
                <div className="flex flex-col items-center justify-center py-16 text-secondary/40 gap-4">
                  <ClipboardList className="w-14 h-14 opacity-25" />
                  <div className="text-center">
                    <p className="text-base font-medium">{t('noOrdersFound') || 'No orders found'}</p>
                    <p className="text-sm mt-1">{t('adjustSearchFilters') || 'Try adjusting your search or filters'}</p>
                  </div>
                </div>
              )
            )}
          </AnimatePresence>
        </div>

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6 border-t border-secondary/5">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-2 rounded-xl bg-white border border-secondary/10 text-secondary/60 hover:text-secondary hover:border-secondary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {dir === 'ltr' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <span className="text-xs text-secondary/60 font-mono px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-xl bg-white border border-secondary/10 text-secondary/60 hover:text-secondary hover:border-secondary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {dir === 'ltr' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
