'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarDays, Loader2, User, Phone, Briefcase, Eye, MailPlus,
  AlertTriangle, ShieldOff, CalendarX2, ChevronRight, ChevronLeft,
} from 'lucide-react';
import { DayPicker } from '@daypicker/react';
import '@daypicker/react/dist/style.css';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { getToken } from '@/lib/auth';
import {
  getAdminServiceOrders, getAdminServiceOrderById, parseAmount,
  type ApiServiceOrderItem, type ApiServiceOrderDetail,
} from '@/lib/api';
import { OrderDetailModal } from '../service-orders/components/order-detail-modal';
import { getStatusBadgeClass, getStatusDotClass } from '../service-orders/components/order-list';

/** `YYYY-MM-DD` in local time — matches what the backend expects for `filters[date]`. */
export function toISODate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export default function CalendarClient({
  initialOrders,
  initialDate,
}: {
  initialOrders: ApiServiceOrderItem[] | null;
  initialDate: string;
}) {
  const { t, dir, language } = useLanguage();
  const router = useRouter();
  const isAr = language === 'ar';
  const [token] = useState(() => getToken() ?? '');

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(`${initialDate}T00:00:00`));
  const [orders, setOrders] = useState<ApiServiceOrderItem[]>(initialOrders ?? []);
  const [loading, setLoading] = useState(!initialOrders);

  const [detailOrder, setDetailOrder] = useState<ApiServiceOrderDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const isInitialMount = useRef(true);

  const isoDate = toISODate(selectedDate);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getAdminServiceOrders(token, {
        page: 1,
        per_page: 100,
        date: isoDate,
        order_by: 'event_date',
        order: 'ASC',
      });
      setOrders(res.data.items);
    } catch (err) {
      toast.error((err as Error).message || (isAr ? 'حدث خطأ أثناء تحميل الطلبات' : 'Failed to load orders'));
    } finally {
      setLoading(false);
    }
  }, [token, isoDate, isAr]);

  useEffect(() => {
    if (isInitialMount.current && initialOrders) {
      isInitialMount.current = false;
      return;
    }
    fetchOrders();
  }, [fetchOrders, initialOrders]);

  const openDetail = async (id: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailOrder(null);
    try {
      const res = await getAdminServiceOrderById(id, token);
      setDetailOrder(res.data);
    } catch (err) {
      toast.error((err as Error).message || (isAr ? 'تعذر تحميل تفاصيل الطلب' : 'Failed to load order details'));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailOrder(null);
  };

  const dayLabel = selectedDate.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const totalAmount = orders.reduce((sum, o) => sum + parseAmount(o.total_amount), 0);
  const currency = orders[0]?.currency || (isAr ? 'د.ك' : 'KD');

  // ── Day picker column ──────────────────────────────────────────────────────
  const picker = (
    <aside className="w-full lg:w-[340px] shrink-0 order-first lg:order-none space-y-4">
      <div className="glass-panel rounded-3xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setSelectedDate(d => addDays(d, -1))}
            className="p-2 rounded-xl bg-white/60 border border-secondary/10 text-secondary/60 hover:text-secondary hover:border-secondary/20 transition-all cursor-pointer"
            title={isAr ? 'اليوم السابق' : 'Previous day'}
          >
            {dir === 'ltr' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-4 py-2 rounded-xl bg-secondary text-white text-xs font-bold hover:bg-secondary/90 transition-all cursor-pointer"
          >
            {isAr ? 'اليوم' : 'Today'}
          </button>
          <button
            onClick={() => setSelectedDate(d => addDays(d, 1))}
            className="p-2 rounded-xl bg-white/60 border border-secondary/10 text-secondary/60 hover:text-secondary hover:border-secondary/20 transition-all cursor-pointer"
            title={isAr ? 'اليوم التالي' : 'Next day'}
          >
            {dir === 'ltr' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex justify-center [&_.rdp]:m-0">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(date) => { if (date) setSelectedDate(date); }}
            locale={dir === 'rtl' ? ar : undefined}
            dir={dir}
          />
        </div>
      </div>

      {/* Day summary */}
      <div className="glass-panel rounded-3xl p-5 space-y-3">
        <div className="text-xs font-medium text-secondary/50">{isAr ? 'ملخص اليوم' : 'Day summary'}</div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-secondary/70">{isAr ? 'عدد الطلبات' : 'Orders'}</span>
          <span className="text-lg font-bold text-secondary">
            {orders.length.toLocaleString(isAr ? 'ar-EG' : 'en-US')}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-secondary/70">{isAr ? 'الإجمالي' : 'Total'}</span>
          <span className="text-lg font-bold text-primary">
            {totalAmount.toLocaleString(isAr ? 'ar-EG' : 'en-US')} {currency}
          </span>
        </div>
      </div>
    </aside>
  );

  // ── Orders grid column ─────────────────────────────────────────────────────
  const grid = (
    <div className="flex-1 min-w-0 space-y-4">
      <div className="glass-panel rounded-3xl p-4 sm:p-6">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-secondary/5">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-secondary truncate">{dayLabel}</h3>
            <p className="text-xs text-secondary/50">
              {isAr
                ? `${orders.length} طلب في هذا اليوم`
                : `${orders.length} order${orders.length === 1 ? '' : 's'} on this day`}
            </p>
          </div>
        </div>

        <div className="relative min-h-[240px]">
          {loading && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {orders.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
                {orders.map((order, idx) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ delay: idx * 0.03, duration: 0.18 }}
                    className="group relative flex flex-col rounded-3xl bg-white/50 border border-white/70 shadow-sm hover:shadow-lg hover:bg-white/80 hover:-translate-y-0.5 transition-all overflow-hidden"
                  >
                    {/* Accent rail */}
                    <span className="absolute inset-y-0 start-0 w-1 bg-gradient-to-b from-primary/60 to-primary/10" />

                    <button
                      type="button"
                      onClick={() => openDetail(order.id)}
                      className="flex-1 text-start p-5 ps-6 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="text-[10px] font-mono bg-secondary/5 px-2 py-1 rounded-md text-secondary/60 shrink-0">
                          {order.reference_label || `SO-${order.reference_number}`}
                        </span>
                        <div className="flex flex-wrap justify-end gap-1">
                          {order.statuses.map((st, i) => (
                            <span
                              key={i}
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0',
                                getStatusBadgeClass(st.value)
                              )}
                            >
                              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', getStatusDotClass(st.value))} />
                              {st.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center shrink-0 transition-colors">
                          <Briefcase className="w-4 h-4 text-primary" />
                        </div>
                        <h4 className="font-semibold text-secondary text-sm  group-hover:text-primary transition-colors text-wrap ">
                          {order.service_name || '—'}
                        </h4>
                      </div>

                      <div className="space-y-1.5 text-xs text-secondary/60">
                        {order.client_name && (
                          <div className="flex items-center gap-1.5 truncate">
                            <User className="w-3 h-3 shrink-0" /> <span className="truncate">{order.client_name}</span>
                          </div>
                        )}
                        {order.client_phone && (
                          <div className="flex items-center gap-1.5 font-mono" dir="ltr">
                            <Phone className="w-3 h-3 shrink-0" /> {order.client_phone}
                          </div>
                        )}
                      </div>

                      {(order.has_pending_second_payment || order.is_barcode_suspended) && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-3">
                          {order.has_pending_second_payment && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-bold">
                              <AlertTriangle className="w-3 h-3" />
                              {isAr ? 'قسط ثانٍ مستحق' : 'Second payment due'}
                            </span>
                          )}
                          {order.is_barcode_suspended && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold">
                              <ShieldOff className="w-3 h-3" />
                              {isAr ? 'الباركود موقوف' : 'Barcode suspended'}
                            </span>
                          )}
                        </div>
                      )}
                    </button>

                    <div className="flex items-center justify-between gap-2 px-5 ps-6 py-3 border-t border-secondary/5 bg-white/30">
                      <span className="text-sm font-bold text-secondary">
                        {parseAmount(order.total_amount).toLocaleString(isAr ? 'ar-EG' : 'en-US')}{' '}
                        <span className="text-xs font-medium text-secondary/50">
                          {order.currency || (isAr ? 'د.ك' : 'KD')}
                        </span>
                      </span>

                      <div className="flex items-center gap-1">
                        {order.whatsapp_url && (
                          <button
                            title={isAr ? 'فتح المحادثة' : 'Open WhatsApp'}
                            onClick={() => window.open(order.whatsapp_url!, '_blank')}
                            className="p-2 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer flex items-center justify-center"
                          >
                            <Image
                              src="https://raiyansoft.com/wp-content/uploads/2026/05/whatsapp.png"
                              alt="WA" width={15} height={15} referrerPolicy="no-referrer"
                            />
                          </button>
                        )}
                        {order.has_barcode_service && order.invitation_id && (
                          <Link
                            href={`/invitations/${order.invitation_id}`}
                            title={isAr ? 'عرض الدعوة' : 'View invitation'}
                            className="p-2 bg-white text-violet-500 hover:bg-violet-50 border border-transparent hover:border-violet-200 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                          >
                            <MailPlus className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        <button
                          title={isAr ? 'عرض التفاصيل' : 'View details'}
                          onClick={() => openDetail(order.id)}
                          className="p-2 bg-white text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 rounded-lg transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              !loading && (
                <div className="flex flex-col items-center justify-center py-20 text-secondary/40 gap-4">
                  <CalendarX2 className="w-14 h-14 opacity-25" />
                  <div className="text-center">
                    <p className="text-base font-medium">
                      {isAr ? 'لا توجد طلبات في هذا اليوم' : 'No orders on this day'}
                    </p>
                    <p className="text-sm mt-1">
                      {isAr ? 'اختر يوماً آخر من التقويم' : 'Pick another day from the calendar'}
                    </p>
                  </div>
                </div>
              )
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-10 text-start">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className={cn('text-2xl font-medium text-secondary', dir === 'ltr' ? 'font-serif' : 'font-arabic')}>
            {t('calendar') || 'Calendar'}
          </h2>
          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
            {orders.length}
          </span>
        </div>
      </div>

      {/* The picker always sits on the physical right, in both LTR and RTL. */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {dir === 'rtl' ? <>{picker}{grid}</> : <>{grid}{picker}</>}
      </div>

      {detailOpen && (
        <OrderDetailModal
          order={detailOrder}
          loading={detailLoading}
          token={token}
          onClose={closeDetail}
          onEdit={id => router.push(`/service-orders/${id}/edit`)}
          onChanged={() => { closeDetail(); fetchOrders(); }}
        />
      )}
    </div>
  );
}
