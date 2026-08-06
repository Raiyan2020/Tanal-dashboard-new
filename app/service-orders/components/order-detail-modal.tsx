'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, User, Calendar, Clock, MapPin, Briefcase, DollarSign,
  Phone, ExternalLink, Loader2, CheckCircle2, XCircle,
  Copy, Check, Link2, AlertTriangle, ShieldOff, Users, Ban, Trash2, Edit2, MailPlus,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import {
  ApiServiceOrderDetail,
  parseAmount,
  updateServiceOrderPaymentStatus,
  cancelAdminServiceOrder,
  deleteAdminServiceOrder,
} from '@/lib/api';
import { getToken } from '@/lib/auth';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from 'sonner';
import Image from 'next/image';
import {
  PAYMENT_STATUS_VALUES,
  getStatusBadgeClass,
  getStatusDotClass,
  isOrderCancelled,
  isOrderPaid,
} from './order-list';
import { ItemAttachments } from './item-attachments';
import { LeafletMap } from '@/components/leaflet-map';
import { buildMapsUrl, toCoord } from '@/lib/map-location';
import { formatDate, formatDateParts } from '@/lib/format-date';

interface OrderDetailModalProps {
  order: ApiServiceOrderDetail | null;
  loading: boolean;
  token: string;
  onClose: () => void;
  onEdit?: (id: number) => void;
  /** Called after a mutation that invalidates the list (cancel / delete). */
  onChanged?: () => void;
  onPaymentStatusChange?: (newStatus: string) => void;
}

/** Copy-to-clipboard button that briefly confirms the copy. */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(label);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/70 hover:bg-white border border-primary/20 text-primary text-[11px] font-medium transition-colors cursor-pointer shrink-0"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {label}
    </button>
  );
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

export function OrderDetailModal({
  order,
  loading,
  token: propToken,
  onClose,
  onEdit,
  onChanged,
  onPaymentStatusChange,
}: OrderDetailModalProps) {
  const { language, dir } = useLanguage();
  const isAr = language === 'ar';
  const { can } = usePermissions();
  const [token] = useState(() => getToken() ?? propToken ?? '');
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [actionRunning, setActionRunning] = useState(false);
  const [localOrder, setLocalOrder] = useState<ApiServiceOrderDetail | null>(null);
  const effectiveOrder = localOrder ?? order;

  // Reset local order when the main order changes
  React.useEffect(() => { setLocalOrder(null); }, [order?.id]);

  const cancelled = effectiveOrder ? isOrderCancelled(effectiveOrder.statuses) : false;
  const paid = effectiveOrder ? isOrderPaid(effectiveOrder.statuses) : false;

  // A pin is only shown when both coordinates came back — orders saved before the
  // map fields existed, and quick orders awaiting the client, have neither.
  const mapLat = toCoord(effectiveOrder?.lat);
  const mapLng = toCoord(effectiveOrder?.lng);
  const mapPoint = mapLat !== null && mapLng !== null ? { lat: mapLat, lng: mapLng } : null;

  const handleCancel = async () => {
    if (!effectiveOrder) return;
    setActionRunning(true);
    try {
      await cancelAdminServiceOrder(effectiveOrder.id, token);
      toast.success(isAr ? 'تم إلغاء الطلب' : 'Order cancelled');
      onChanged?.();
    } catch (err) {
      toast.error((err as Error).message || (isAr ? 'فشل إلغاء الطلب' : 'Failed to cancel order'));
    } finally {
      setActionRunning(false);
    }
  };

  const handleDelete = async () => {
    if (!effectiveOrder) return;
    setActionRunning(true);
    try {
      await deleteAdminServiceOrder(effectiveOrder.id, token);
      toast.success(isAr ? 'تم حذف الطلب' : 'Order deleted');
      onChanged?.();
    } catch (err) {
      toast.error((err as Error).message || (isAr ? 'فشل حذف الطلب' : 'Failed to delete order'));
    } finally {
      setActionRunning(false);
    }
  };

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

              {effectiveOrder && (
                <>
                  {/* Status badges + payment status select */}
                  <div className="flex flex-wrap items-center gap-2">
                    {effectiveOrder.statuses
                      .filter(st => !PAYMENT_STATUS_VALUES.includes(st.value))
                      .map((st, i) => (
                        <span
                          key={i}
                          className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold', getStatusBadgeClass(st.value))}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full', getStatusDotClass(st.value))} />
                          {st.label}
                        </span>
                      ))}

                    {/* Payment status select — mirrors EventDetails pattern */}
                    <div className="relative">
                      {updatingPayment && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        </div>
                      )}
                      <select
                        disabled={updatingPayment || cancelled || !can('edit-service-order')}
                        value={effectiveOrder.statuses.find(s => ['paid', 'unpaid', 'installments'].includes(s.value))?.value ?? (effectiveOrder.is_paid ? 'paid' : 'unpaid')}
                        onChange={async (e) => {
                          const nextStatus = e.target.value as 'paid' | 'unpaid' | 'installments';
                          setUpdatingPayment(true);
                          try {
                            await updateServiceOrderPaymentStatus(effectiveOrder.id, nextStatus, token);
                            toast.success(isAr ? 'تم تحديث حالة الدفع بنجاح' : 'Payment status updated successfully');
                            const updatedStatuses = effectiveOrder.statuses.map(s =>
                              ['paid', 'unpaid', 'installments'].includes(s.value) ? { ...s, value: nextStatus } : s
                            );
                            if (!updatedStatuses.some(s => ['paid', 'unpaid', 'installments'].includes(s.value))) {
                              updatedStatuses.push({ value: nextStatus, label: nextStatus === 'paid' ? (isAr ? 'مدفوع' : 'Paid') : nextStatus === 'unpaid' ? (isAr ? 'غير مدفوع' : 'Unpaid') : (isAr ? 'أقساط' : 'Installments') });
                            }
                            const updated = { ...effectiveOrder, is_paid: nextStatus === 'paid', statuses: updatedStatuses };
                            setLocalOrder(updated);
                            if (onPaymentStatusChange) onPaymentStatusChange(nextStatus);
                          } catch (err) {
                            toast.error((err as Error).message || (isAr ? 'فشل في تحديث حالة الدفع' : 'Failed to update payment status'));
                          } finally {
                            setUpdatingPayment(false);
                          }
                        }}
                        className={cn(
                          'appearance-none cursor-pointer py-1 outline-none rounded-full text-[11px] font-medium ring-1 ring-inset whitespace-nowrap transition-opacity',
                          dir === 'ltr' ? 'pl-2.5 pr-6' : 'pr-2.5 pl-6',
                          updatingPayment && 'opacity-40 pointer-events-none',
                          getStatusBadgeClass(
                            effectiveOrder.statuses.find(s => ['paid', 'unpaid', 'installments'].includes(s.value))?.value ?? (effectiveOrder.is_paid ? 'paid' : 'unpaid')
                          )
                        )}
                      >
                        {/* Options come from the order's own allowed transitions */}
                        {(effectiveOrder.available_payment_statuses?.length
                          ? effectiveOrder.available_payment_statuses
                          : [
                              { value: 'paid', label: isAr ? 'مدفوع' : 'Paid' },
                              { value: 'unpaid', label: isAr ? 'غير مدفوع' : 'Unpaid' },
                              { value: 'installments', label: isAr ? 'أقساط' : 'Installments' },
                            ]
                        ).map(ps => (
                          <option key={ps.value} value={ps.value}>{ps.label}</option>
                        ))}
                      </select>
                      <div className={cn('pointer-events-none absolute inset-y-0 flex items-center', dir === 'ltr' ? 'right-2' : 'left-2')}>
                        <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  {/* ── Alerts ── */}
                  {(effectiveOrder.is_barcode_suspended || effectiveOrder.has_pending_second_payment) && (
                    <div className="space-y-2">
                      {effectiveOrder.is_barcode_suspended && (
                        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-50 border border-rose-200">
                          <ShieldOff className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-rose-700">
                              {isAr ? 'الباركود موقوف' : 'Barcode suspended'}
                            </p>
                            <p className="text-xs text-rose-600/80 mt-0.5">
                              {isAr
                                ? 'لا يمكن إرسال الدعوات أو مسح الباركود لهذا الطلب.'
                                : 'Invitations cannot be sent and scanning is disabled for this order.'}
                            </p>
                          </div>
                        </div>
                      )}
                      {effectiveOrder.has_pending_second_payment && (
                        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50 border border-amber-200">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-amber-700">
                              {isAr ? 'قسط ثانٍ مستحق' : 'Second payment pending'}
                            </p>
                            {effectiveOrder.second_installment_due_date && (
                              <p className="text-xs text-amber-600/80 mt-0.5">
                                {isAr ? 'تاريخ الاستحقاق: ' : 'Due: '}
                                {formatDate(effectiveOrder.second_installment_due_date, isAr ? 'ar' : 'en')}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Client portal link ── */}
                  {effectiveOrder.portal_url && (
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-primary/5 border border-primary/15">
                      <Link2 className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs text-secondary/60 flex-1 truncate font-mono" dir="ltr">
                        {effectiveOrder.portal_url}
                      </span>
                      <CopyButton
                        value={effectiveOrder.portal_url}
                        label={isAr ? 'نسخ الرابط' : 'Copy link'}
                      />
                    </div>
                  )}

                  {/* ── Client ── */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-secondary/40 uppercase tracking-wider">
                        {isAr ? 'بيانات العميل' : 'Client'}
                      </h3>
                      {/* The client fills their own details through the portal —
                          flag when that has not happened yet. */}
                      {effectiveOrder.client?.data_status === 'incomplete' && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-bold">
                          {isAr ? 'بيانات غير مكتملة' : 'Incomplete data'}
                        </span>
                      )}
                      {effectiveOrder.client?.data_status === 'complete' && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                          {isAr ? 'بيانات مكتملة' : 'Complete'}
                        </span>
                      )}
                    </div>
                    <div className="bg-secondary/3 rounded-2xl px-4 py-1">
                      <InfoRow icon={User} label={isAr ? 'الاسم' : 'Name'} value={effectiveOrder.client?.name} />
                      <InfoRow icon={Phone} label={isAr ? 'الهاتف' : 'Phone'} value={
                        effectiveOrder.client?.phone
                          ? (effectiveOrder.client.whatsapp_url ? (
                            <a href={effectiveOrder.client.whatsapp_url} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-600 hover:underline" dir="ltr">
                              {`${effectiveOrder.client.country_code ?? ''} ${effectiveOrder.client.phone}`.trim()}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span dir="ltr">{`${effectiveOrder.client.country_code ?? ''} ${effectiveOrder.client.phone}`.trim()}</span>
                          ))
                          : null
                      } />
                      {effectiveOrder.client?.alt_phone && (
                        <InfoRow icon={Phone} label={isAr ? 'رقم بديل' : 'Alt. Phone'} value={
                          <span dir="ltr">
                            {`${effectiveOrder.client.alt_country_code ?? ''} ${effectiveOrder.client.alt_phone}`.trim()}
                          </span>
                        } />
                      )}
                      {effectiveOrder.client_notes && (
                        <InfoRow icon={Briefcase} label={isAr ? 'ملاحظات العميل' : 'Client Notes'} value={effectiveOrder.client_notes} />
                      )}
                    </div>
                  </section>

                  {/* ── Event ── */}
                  <section>
                    <h3 className="text-xs font-bold text-secondary/40 uppercase tracking-wider mb-2">
                      {isAr ? 'تفاصيل الفعالية' : 'Event Details'}
                    </h3>
                    <div className="bg-secondary/3 rounded-2xl px-4 py-1">
                      <InfoRow icon={Calendar} label={isAr ? 'التاريخ' : 'Date'} value={formatDate(effectiveOrder.event_date, isAr ? 'ar' : 'en')} />
                      <InfoRow icon={Clock} label={isAr ? 'الوقت' : 'Time'} value={
                        [effectiveOrder.event_time?.slice(0, 5), effectiveOrder.event_end_time?.slice(0, 5)]
                          .filter(Boolean)
                          .join(' — ')
                      } />
                      <InfoRow icon={Briefcase} label={isAr ? 'القاعة' : 'Hall'} value={effectiveOrder.hall_name} />
                      {effectiveOrder.location_url && (
                        <InfoRow icon={MapPin} label={isAr ? 'الموقع' : 'Location'} value={
                          <a href={effectiveOrder.location_url} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline truncate max-w-[240px]">
                            {isAr ? 'عرض الخريطة' : 'View on Map'}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        } />
                      )}
                      {(effectiveOrder.governorate || effectiveOrder.block_number ||
                        effectiveOrder.street_name || effectiveOrder.house_number) && (
                        <InfoRow icon={MapPin} label={isAr ? 'العنوان' : 'Address'} value={
                          [
                            effectiveOrder.governorate,
                            effectiveOrder.block_number && `${isAr ? 'قطعة' : 'Block'} ${effectiveOrder.block_number}`,
                            effectiveOrder.street_name && `${isAr ? 'شارع' : 'St.'} ${effectiveOrder.street_name}`,
                            effectiveOrder.house_number && `${isAr ? 'منزل' : 'House'} ${effectiveOrder.house_number}`,
                          ].filter(Boolean).join('، ')
                        } />
                      )}
                      {effectiveOrder.map_desc && (
                        <InfoRow icon={MapPin} label={isAr ? 'وصف الموقع' : 'Location Description'} value={effectiveOrder.map_desc} />
                      )}
                      {effectiveOrder.address_notes && (
                        <InfoRow icon={MapPin} label={isAr ? 'ملاحظات العنوان' : 'Address Notes'} value={effectiveOrder.address_notes} />
                      )}
                      {effectiveOrder.execution_notes && (
                        <InfoRow icon={Briefcase} label={isAr ? 'ملاحظات التنفيذ' : 'Execution Notes'} value={effectiveOrder.execution_notes} />
                      )}
                    </div>

                    {mapPoint && (
                      <div className="mt-3 rounded-2xl overflow-hidden border border-secondary/10">
                        <LeafletMap lat={mapPoint.lat} lng={mapPoint.lng} className="h-[200px] w-full z-0" />
                        <a
                          // Built from the pin, not `location_url` — the saved
                          // link may predate the coordinates.
                          href={buildMapsUrl(mapPoint)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-1.5 bg-secondary/3 py-2.5 text-xs font-medium text-primary hover:bg-secondary/5 transition-colors"
                        >
                          {isAr ? 'فتح في خرائط جوجل' : 'Open in Google Maps'}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </section>

                  {/* ── Order-level employees ── */}
                  {effectiveOrder.order_employees?.length > 0 && (
                    <section>
                      <h3 className="text-xs font-bold text-secondary/40 uppercase tracking-wider mb-2">
                        {isAr ? 'موظفو الطلب' : 'Order Employees'}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {effectiveOrder.order_employees.map(emp => (
                          <span key={emp.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/8 text-primary text-xs font-semibold">
                            <Users className="w-3 h-3" />
                            {emp.name}
                            {emp.reference_label && (
                              <span className="text-primary/50 font-mono text-[10px]">{emp.reference_label}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* ── Linked invitation ── */}
                  {effectiveOrder.invitation_id && (
                    <Link
                      href={`/invitations/${effectiveOrder.invitation_id}`}
                      className="flex items-center gap-2.5 p-3 rounded-2xl bg-secondary/5 hover:bg-secondary/10 border border-secondary/10 transition-colors"
                    >
                      <MailPlus className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-medium text-secondary flex-1">
                        {isAr ? 'عرض الدعوة المرتبطة' : 'View linked invitation'}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-secondary/40" />
                    </Link>
                  )}

                  {/* ── Payment ── */}
                  <section>
                    <h3 className="text-xs font-bold text-secondary/40 uppercase tracking-wider mb-2">
                      {isAr ? 'معلومات الدفع' : 'Payment'}
                    </h3>
                    <div className="bg-secondary/3 rounded-2xl px-4 py-1">
                      <InfoRow icon={DollarSign} label={isAr ? 'الإجمالي' : 'Total'} value={
                        <span className="text-primary font-bold">
                          {parseAmount(effectiveOrder.total_amount).toLocaleString(isAr ? 'ar-EG' : 'en-US')}{' '}
                          {isAr ? 'د.ك' : 'KD'}
                        </span>
                      } />
                      <InfoRow icon={DollarSign} label={isAr ? 'المدفوع' : 'Paid'} value={
                        <span className="text-emerald-600 font-bold">
                          {parseAmount(effectiveOrder.paid_amount).toLocaleString(isAr ? 'ar-EG' : 'en-US')}{' '}
                          {isAr ? 'د.ك' : 'KD'}
                        </span>
                      } />
                      <InfoRow
                        icon={effectiveOrder.is_paid ? CheckCircle2 : XCircle}
                        label={isAr ? 'حالة الدفع' : 'Payment Status'}
                        value={
                          <span className={effectiveOrder.is_paid ? 'text-emerald-600' : 'text-orange-500'}>
                            {effectiveOrder.is_paid
                              ? (isAr ? 'مدفوع' : 'Paid')
                              : (isAr ? 'غير مدفوع' : 'Unpaid')}
                          </span>
                        }
                      />
                      <InfoRow icon={DollarSign} label={isAr ? 'طريقة الدفع' : 'Payment Type'} value={
                        effectiveOrder.payment_type === 'single'
                          ? (isAr ? 'دفعة واحدة' : 'Single Payment')
                          : (isAr ? 'دفعتان' : 'Two Installments')
                      } />
                      {effectiveOrder.first_installment_amount != null && (
                        <InfoRow icon={DollarSign} label={isAr ? 'الدفعة الأولى' : '1st Installment'} value={
                          `${parseAmount(effectiveOrder.first_installment_amount).toLocaleString(isAr ? 'ar-EG' : 'en-US')} ${isAr ? 'د.ك' : 'KD'}`
                        } />
                      )}
                      {effectiveOrder.second_installment_amount != null && (
                        <InfoRow icon={DollarSign} label={isAr ? 'الدفعة الثانية' : '2nd Installment'} value={
                          <span>
                            {parseAmount(effectiveOrder.second_installment_amount).toLocaleString(isAr ? 'ar-EG' : 'en-US')}{' '}
                            {isAr ? 'د.ك' : 'KD'}
                            {effectiveOrder.second_installment_due_date && (
                              <span className="text-secondary/45 text-xs font-normal">
                                {' '}({formatDate(effectiveOrder.second_installment_due_date, isAr ? 'ar' : 'en')})
                              </span>
                            )}
                          </span>
                        } />
                      )}
                      {effectiveOrder.cancelled_at && (() => {
                        // The API returns this pre-formatted in English, which
                        // reads as untranslated UI in Arabic — reformat it.
                        const parts = formatDateParts(effectiveOrder.cancelled_at, isAr ? 'ar' : 'en');
                        return (
                          <InfoRow icon={Ban} label={isAr ? 'تاريخ الإلغاء' : 'Cancelled At'} value={
                            <span className="text-rose-600 flex flex-wrap items-baseline gap-x-2">
                              <span>{parts?.date}</span>
                              {parts?.time && (
                                <span className="text-rose-600/70 text-xs font-normal">{parts.time}</span>
                              )}
                            </span>
                          } />
                        );
                      })()}
                    </div>
                  </section>

                  {/* ── Items ── */}
                  <section>
                    <h3 className="text-xs font-bold text-secondary/40 uppercase tracking-wider mb-2">
                      {isAr ? 'الخدمات' : 'Services'}
                    </h3>
                    <div className="space-y-3">
                      {effectiveOrder.items.map((item) => (
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
                              {parseAmount(item.price).toLocaleString(isAr ? 'ar-EG' : 'en-US')}{' '}{isAr ? 'د.ك' : 'KD'}
                            </span>
                          </div>

                          {/* Package + guest allowance */}
                          {(item.package || item.guests_included != null) && (
                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              {item.package && (
                                <span className="px-2 py-0.5 rounded-md bg-white/70 text-secondary/70 font-medium">
                                  {item.package.name}
                                </span>
                              )}
                              {item.guests_included != null && (
                                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
                                  {isAr ? `المدعوون: ${item.guests_included}` : `Guests: ${item.guests_included}`}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Responsible employee */}
                          {item.employee && (
                            <div className="flex items-center gap-2 text-xs bg-white/60 rounded-xl px-3 py-2">
                              <User className="w-3.5 h-3.5 text-secondary/50 shrink-0" />
                              <span className="text-secondary/60">{isAr ? 'المسؤول:' : 'Assigned:'}</span>
                              <span className="font-semibold text-secondary">
                                {item.employee.name || item.employee.username}
                              </span>
                              {item.employee.type === 'freelancer' && (
                                <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-bold">
                                  {isAr ? 'مستقل' : 'Freelancer'}
                                </span>
                              )}
                              {item.employee.reference_label && (
                                <span className="text-secondary/40 font-mono text-[10px]">{item.employee.reference_label}</span>
                              )}
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

                          {/* Attachments — only for users who can edit the order */}
                          {can('edit-service-order') && (
                            <ItemAttachments
                              orderId={effectiveOrder.id}
                              itemId={item.id}
                              token={token}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  {effectiveOrder.notes && (
                    <section>
                      <h3 className="text-xs font-bold text-secondary/40 uppercase tracking-wider mb-2">
                        {isAr ? 'ملاحظات' : 'Notes'}
                      </h3>
                      <p className="text-sm text-secondary/70 bg-secondary/3 rounded-2xl px-4 py-3">
                        {effectiveOrder.notes}
                      </p>
                    </section>
                  )}
                </>
              )}
            </div>

            {/* Footer actions */}
            {effectiveOrder && (
              <div className="px-6 py-4 border-t border-secondary/8 shrink-0 space-y-2">
                <div className="flex items-center gap-3">
                  {effectiveOrder.whatsapp_url && (
                    <a
                      href={effectiveOrder.whatsapp_url}
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
                  )}
                  {can('edit-service-order') && !cancelled && onEdit && (
                    <button
                      onClick={() => onEdit(effectiveOrder.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                      {isAr ? 'تعديل' : 'Edit'}
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl bg-secondary/8 hover:bg-secondary/15 text-secondary text-sm font-semibold transition-colors cursor-pointer"
                  >
                    {isAr ? 'إغلاق' : 'Close'}
                  </button>
                </div>

                {/* Cancelled orders offer neither destructive action. Paid orders
                    cancel; unpaid ones delete outright. */}
                {!cancelled && (
                  paid
                    ? can('cancel-service-order') && (
                      <button
                        onClick={handleCancel}
                        disabled={actionRunning}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {actionRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                        {isAr ? 'إلغاء الطلب' : 'Cancel Order'}
                      </button>
                    )
                    : can('delete-service-order') && (
                      <button
                        onClick={handleDelete}
                        disabled={actionRunning}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {actionRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        {isAr ? 'حذف الطلب' : 'Delete Order'}
                      </button>
                    )
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
