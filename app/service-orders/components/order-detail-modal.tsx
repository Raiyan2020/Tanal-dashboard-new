'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, User, Calendar, Clock, MapPin, Briefcase, DollarSign,
  Phone, Mail, ExternalLink, Loader2, CheckCircle2, XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { ApiServiceOrderDetail, ServiceOrderStatus } from '@/lib/api';
import Image from 'next/image';

const getStatusBadgeClass = (val: string) => {
  switch (val) {
    case 'upcoming': case 'coming': return 'bg-blue-100 text-blue-700';
    case 'in-progress': return 'bg-amber-100 text-amber-700';
    case 'finished': case 'paid': return 'bg-emerald-100 text-emerald-700';
    case 'rejected': return 'bg-red-100 text-red-700';
    case 'unpaid': return 'bg-orange-100 text-orange-700';
    default: return 'bg-secondary/10 text-secondary/70';
  }
};

const getStatusDotClass = (val: string) => {
  switch (val) {
    case 'upcoming': case 'coming': return 'bg-blue-500';
    case 'in-progress': return 'bg-amber-500';
    case 'finished': case 'paid': return 'bg-emerald-500';
    case 'rejected': return 'bg-red-500';
    case 'unpaid': return 'bg-orange-500';
    default: return 'bg-secondary/40';
  }
};

interface OrderDetailModalProps {
  order: ApiServiceOrderDetail | null;
  loading: boolean;
  onClose: () => void;
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-secondary/6 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-primary/70" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-wider">{label}</p>
        <div className="text-sm text-secondary font-medium mt-0.5 break-words">{value || '—'}</div>
      </div>
    </div>
  );
}

export function OrderDetailModal({ order, loading, onClose }: OrderDetailModalProps) {
  const { language, dir } = useLanguage();
  const isAr = language === 'ar';

  return (
    <AnimatePresence>
      {(loading || order) && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: dir === 'rtl' ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: dir === 'rtl' ? '-100%' : '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className={cn(
              'fixed top-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden',
              dir === 'rtl' ? 'left-0 rounded-r-3xl' : 'right-0 rounded-l-3xl'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-secondary/8 bg-gradient-to-r from-primary/5 to-transparent shrink-0">
              <div>
                <p className="text-xs text-secondary/50 font-mono">
                  {order?.reference_label || '…'}
                </p>
                <h2 className="text-lg font-bold text-secondary mt-0.5">
                  {isAr
                    ? order?.primary_service_name?.ar
                    : order?.primary_service_name?.en}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-secondary/8 hover:bg-secondary/15 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-secondary" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-start" dir={dir}>
              {loading && !order && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}

              {order && (
                <>
                  {/* Status badges */}
                  <div className="flex flex-wrap gap-2">
                    {order.statuses.map((st, i) => (
                      <span
                        key={i}
                        className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold', getStatusBadgeClass(st.value))}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full', getStatusDotClass(st.value))} />
                        {st.label}
                      </span>
                    ))}
                  </div>

                  {/* ── Client ── */}
                  <section>
                    <h3 className="text-xs font-bold text-secondary/40 uppercase tracking-wider mb-2">
                      {isAr ? 'بيانات العميل' : 'Client'}
                    </h3>
                    <div className="bg-secondary/3 rounded-2xl px-4 py-1">
                      <InfoRow icon={User} label={isAr ? 'الاسم' : 'Name'} value={order.client.name} />
                      <InfoRow icon={Phone} label={isAr ? 'الهاتف' : 'Phone'} value={
                        <a href={order.client.whatsapp_url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-600 hover:underline">
                          {order.client.full_phone}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      } />
                      {order.client.email && (
                        <InfoRow icon={Mail} label={isAr ? 'البريد' : 'Email'} value={order.client.email} />
                      )}
                      {order.client.notes && (
                        <InfoRow icon={Briefcase} label={isAr ? 'ملاحظات' : 'Notes'} value={order.client.notes} />
                      )}
                    </div>
                  </section>

                  {/* ── Event ── */}
                  <section>
                    <h3 className="text-xs font-bold text-secondary/40 uppercase tracking-wider mb-2">
                      {isAr ? 'تفاصيل الفعالية' : 'Event Details'}
                    </h3>
                    <div className="bg-secondary/3 rounded-2xl px-4 py-1">
                      <InfoRow icon={Calendar} label={isAr ? 'التاريخ' : 'Date'} value={order.event_date} />
                      <InfoRow icon={Clock} label={isAr ? 'الوقت' : 'Time'} value={order.event_time?.slice(0, 5)} />
                      <InfoRow icon={Briefcase} label={isAr ? 'القاعة' : 'Hall'} value={order.hall_name} />
                      {order.location_url && (
                        <InfoRow icon={MapPin} label={isAr ? 'الموقع' : 'Location'} value={
                          <a href={order.location_url} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline truncate max-w-[240px]">
                            {isAr ? 'عرض الخريطة' : 'View on Map'}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        } />
                      )}
                    </div>
                  </section>

                  {/* ── Payment ── */}
                  <section>
                    <h3 className="text-xs font-bold text-secondary/40 uppercase tracking-wider mb-2">
                      {isAr ? 'معلومات الدفع' : 'Payment'}
                    </h3>
                    <div className="bg-secondary/3 rounded-2xl px-4 py-1">
                      <InfoRow icon={DollarSign} label={isAr ? 'الإجمالي' : 'Total'} value={
                        <span className="text-primary font-bold">
                          {Number(order.total_amount).toLocaleString(isAr ? 'ar-EG' : 'en-US')}{' '}
                          {isAr ? 'د.ك' : 'KD'}
                        </span>
                      } />
                      <InfoRow icon={DollarSign} label={isAr ? 'المدفوع' : 'Paid'} value={
                        <span className="text-emerald-600 font-bold">
                          {Number(order.paid_amount).toLocaleString(isAr ? 'ar-EG' : 'en-US')}{' '}
                          {isAr ? 'د.ك' : 'KD'}
                        </span>
                      } />
                      <InfoRow
                        icon={order.is_paid ? CheckCircle2 : XCircle}
                        label={isAr ? 'حالة الدفع' : 'Payment Status'}
                        value={
                          <span className={order.is_paid ? 'text-emerald-600' : 'text-orange-500'}>
                            {order.is_paid
                              ? (isAr ? 'مدفوع' : 'Paid')
                              : (isAr ? 'غير مدفوع' : 'Unpaid')}
                          </span>
                        }
                      />
                      <InfoRow icon={DollarSign} label={isAr ? 'طريقة الدفع' : 'Payment Type'} value={
                        order.payment_type === 'single'
                          ? (isAr ? 'دفعة واحدة' : 'Single Payment')
                          : (isAr ? 'دفعتان' : 'Two Installments')
                      } />
                      {order.first_installment_amount && (
                        <InfoRow icon={DollarSign} label={isAr ? 'الدفعة الأولى' : '1st Installment'} value={
                          `${Number(order.first_installment_amount).toLocaleString(isAr ? 'ar-EG' : 'en-US')} ${isAr ? 'د.ك' : 'KD'}`
                        } />
                      )}
                    </div>
                  </section>

                  {/* ── Items ── */}
                  <section>
                    <h3 className="text-xs font-bold text-secondary/40 uppercase tracking-wider mb-2">
                      {isAr ? 'الخدمات' : 'Services'}
                    </h3>
                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="bg-secondary/3 rounded-2xl p-4 space-y-3">
                          {/* Service header */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-secondary text-sm">{item.service.name}</p>
                              {item.service.description && (
                                <p className="text-xs text-secondary/50 mt-0.5">{item.service.description}</p>
                              )}
                            </div>
                            <span className="text-sm font-bold text-primary shrink-0">
                              {Number(item.price).toLocaleString(isAr ? 'ar-EG' : 'en-US')}{' '}{isAr ? 'د.ك' : 'KD'}
                            </span>
                          </div>

                          {/* Responsible employee */}
                          {item.employee && (
                            <div className="flex items-center gap-2 text-xs bg-white/60 rounded-xl px-3 py-2">
                              <User className="w-3.5 h-3.5 text-secondary/50 shrink-0" />
                              <span className="text-secondary/60">{isAr ? 'المسؤول:' : 'Assigned:'}</span>
                              <span className="font-semibold text-secondary">{item.employee.name}</span>
                              <span className="text-secondary/40 font-mono text-[10px]">{item.employee.reference_label}</span>
                            </div>
                          )}

                          {/* Options */}
                          {item.options.length > 0 && (
                            <div className="space-y-1.5 pt-1 border-t border-secondary/8">
                              <p className="text-[10px] font-bold text-secondary/35 uppercase tracking-wider">
                                {isAr ? 'الخيارات' : 'Options'}
                              </p>
                              {/* Group options by service_option_id to collapse repeated color/employee entries */}
                              {Object.values(
                                item.options.reduce((acc: Record<number, typeof item.options>, opt) => {
                                  const key = opt.service_option_id;
                                  if (!acc[key]) acc[key] = [];
                                  acc[key].push(opt);
                                  return acc;
                                }, {})
                              ).map((group) => {
                                const first = group[0];
                                const optName = first.option
                                  ? (isAr ? first.option.name_ar : first.option.name_en) || first.option.name
                                  : `Option #${first.service_option_id}`;
                                const optType = first.option?.type ?? 'text';

                                let displayValue: React.ReactNode = '—';

                                if (optType === 'text' || optType === 'number') {
                                  displayValue = first.text_value || first.number_value || '—';
                                } else if (optType === 'color') {
                                  displayValue = (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {group.map((o) => o.value && (
                                        <span key={o.id} className="inline-flex items-center gap-1 text-[11px] bg-white/70 rounded-lg px-2 py-0.5 font-medium">
                                          {o.value.color_hex && (
                                            <span className="w-3 h-3 rounded-full border border-white/60 shrink-0"
                                              style={{ backgroundColor: o.value.color_hex }} />
                                          )}
                                          {o.value.label}
                                        </span>
                                      ))}
                                    </div>
                                  );
                                } else if (optType === 'list') {
                                  displayValue = group.map((o) => o.value?.label || '—').join(', ');
                                } else if (optType === 'employee') {
                                  displayValue = (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {group.map((o) => o.employee && (
                                        <span key={o.id} className="inline-flex items-center gap-1 text-[11px] bg-primary/10 text-primary rounded-lg px-2 py-0.5 font-bold">
                                          <User className="w-2.5 h-2.5" />
                                          {o.employee.name}
                                        </span>
                                      ))}
                                    </div>
                                  );
                                }

                                return (
                                  <div key={first.service_option_id} className="flex items-start gap-2 text-xs">
                                    <span className="text-secondary/50 min-w-[100px] shrink-0 pt-0.5">{optName}</span>
                                    <span className="text-secondary font-medium flex-1">{displayValue}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  {order.notes && (
                    <section>
                      <h3 className="text-xs font-bold text-secondary/40 uppercase tracking-wider mb-2">
                        {isAr ? 'ملاحظات' : 'Notes'}
                      </h3>
                      <p className="text-sm text-secondary/70 bg-secondary/3 rounded-2xl px-4 py-3">
                        {order.notes}
                      </p>
                    </section>
                  )}
                </>
              )}
            </div>

            {/* Footer actions */}
            {order && (
              <div className="px-6 py-4 border-t border-secondary/8 shrink-0 flex items-center gap-3">
                <a
                  href={order.whatsapp_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  <Image
                    src="https://raiyansoft.com/wp-content/uploads/2026/05/whatsapp.png"
                    alt="WA"
                    width={16}
                    height={16}
                    referrerPolicy="no-referrer"
                  />
                  {isAr ? 'واتساب' : 'WhatsApp'}
                </a>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-secondary/8 hover:bg-secondary/15 text-secondary text-sm font-semibold transition-colors cursor-pointer"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
