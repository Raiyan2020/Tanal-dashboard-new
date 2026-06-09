'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, MapPin, User, Briefcase, CheckCircle2, XCircle, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { ServiceOrder, OrderStatus, getOrderById, updateServiceItemStatus } from '@/lib/orderStore';

// Helper function to format date dynamically based on language
const getFormattedDate = (dateStr: string, lang: string) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return dateStr; }
};

// Helper function to format time dynamically based on language
const getFormattedTime = (timeStr: string, lang: string) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  if (lang === 'ar') {
    const ampm = hour >= 12 ? 'م' : 'ص';
    return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${ampm}`;
  } else {
    return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  }
};

export default function EmployeeOrderPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const itemIdParam = searchParams.get('itemId');

  const { language, setLanguage, dir, t } = useLanguage();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [status, setStatus] = useState<OrderStatus>('coming');
  const [saving, setSaving] = useState<OrderStatus | 'reject' | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState(false);
  const [flash, setFlash] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const toggleLanguage = () => setLanguage(language === 'en' ? 'ar' : 'en');

  // Linear progression steps translated
  const steps = useMemo(() => [
    { id: 'coming' as OrderStatus,      label: t('coming'),      sub: t('orderConfirmed'),      color: 'bg-blue-500',    ring: 'ring-blue-200' },
    { id: 'in-progress' as OrderStatus,  label: t('inProgress'),  sub: t('currentlyWorking'),    color: 'bg-amber-500',   ring: 'ring-amber-200' },
    { id: 'finished' as OrderStatus,    label: t('finished'),    sub: t('completed'),            color: 'bg-emerald-500', ring: 'ring-emerald-200' },
  ], [t]);

  useEffect(() => {
    if (!id) return;
    const found = getOrderById(id as string);
    if (!found) { setNotFound(true); return; }
    setOrder(found);

    // Filter service selection based on query itemId or size
    if (itemIdParam) {
      setSelectedItemId(itemIdParam);
      const matched = found.services.find(s => s.id === itemIdParam);
      if (matched) setStatus(matched.status);
    } else if (found.services.length === 1) {
      setSelectedItemId(found.services[0].id);
      setStatus(found.services[0].status);
    } else {
      setSelectedItemId(null);
    }
  }, [id, itemIdParam]);

  const applyStatus = (next: OrderStatus) => {
    if (!order || !selectedItemId) return;
    setSaving(next === 'rejected' ? 'reject' : next);
    setTimeout(() => {
      updateServiceItemStatus(order.id, selectedItemId, next);
      const updated = getOrderById(order.id);
      if (updated) {
        setOrder(updated);
        const matched = updated.services.find(s => s.id === selectedItemId);
        if (matched) setStatus(matched.status);
      }
      setSaving(null);
      setRejectConfirm(false);
      setFlash(true);
      setTimeout(() => setFlash(false), 2500);
    }, 800);
  };

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" dir={dir}>
        <div className="text-center text-slate-400 p-8">
          <Briefcase className="w-14 h-14 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium text-slate-600">{t('orderNotFound')}</p>
          <p className="text-sm mt-1">{t('orderLinkInvalid')}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
      </div>
    );
  }

  const currentIdx = steps.findIndex(s => s.id === status);
  const isRejected = status === 'rejected';
  const isFinished = status === 'finished';

  const svcItem = selectedItemId ? order.services.find(s => s.id === selectedItemId) : null;
  const serviceName = svcItem ? (language === 'ar' ? (svcItem.serviceNameAr || svcItem.serviceName) : svcItem.serviceName) : '';
  const serviceDesc = svcItem ? (language === 'ar' ? (svcItem.serviceDescriptionAr || svcItem.serviceDescription) : svcItem.serviceDescription) : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 font-sans" dir={dir}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-100 px-5 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="https://raiyansoft.com/wp-content/uploads/2026/05/logo-2.png" alt="Tanal"
              width={26} height={34} className="object-contain" referrerPolicy="no-referrer" />
            <span className="text-base font-semibold text-slate-700">Tanal</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-100 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              {language === 'en' ? 'عربي' : 'English'}
            </button>
            <span className="text-xs font-mono bg-slate-100 text-slate-400 px-3 py-1.5 rounded-full">{order.id}</span>
            <span className="hidden sm:block text-xs bg-slate-700 text-white px-3 py-1.5 rounded-full font-medium">{t('employeePortal')}</span>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-7 space-y-5">

        {/* Dynamic selector check */}
        {!selectedItemId ? (
          /* Checklist selector of all services in this order */
          <div className="space-y-4">
            <div className="text-start">
              <h2 className="text-xl font-bold text-slate-700">{language === 'ar' ? 'مهام الطلب' : 'Order Tasks'}</h2>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'ar' ? 'اختر خدمة لعرض تفاصيلها وتحديث حالة عملها.' : 'Select a service to view details and update its progress status.'}
              </p>
            </div>

            <div className="space-y-3">
              {order.services.map((item) => {
                const sName = language === 'ar' ? (item.serviceNameAr || item.serviceName) : item.serviceName;
                const stepText = item.status === 'coming' ? t('coming') : item.status === 'in-progress' ? t('inProgress') : item.status === 'finished' ? t('finished') : t('orderRejected');
                const stepColor = item.status === 'coming' ? 'bg-blue-50 text-blue-700 border-blue-100' : item.status === 'in-progress' ? 'bg-amber-50 text-amber-700 border-amber-100' : item.status === 'finished' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100';

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedItemId(item.id);
                      setStatus(item.status);
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-100 shadow-sm transition-all duration-200 cursor-pointer text-start"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50/25 flex items-center justify-center text-lg">
                        ✨
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">{sName}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {language === 'ar' ? `المسؤول: ${item.employeeName}` : `Assigned: ${item.employeeName}`}
                        </p>
                      </div>
                    </div>
                    <span className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold border", stepColor)}>
                      {stepText}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Managing a specific selected task */
          <>
            {/* Back button to choose tasks list if there are multiple */}
            {order.services.length > 1 && (
              <button onClick={() => setSelectedItemId(null)}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer group text-sm font-medium">
                {dir === 'ltr'
                  ? <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  : <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
                <span>{language === 'ar' ? 'العودة للمهام' : 'Back to Tasks'}</span>
              </button>
            )}

            {/* ── Service card ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl overflow-hidden bg-white shadow-sm border border-slate-100">
              {svcItem?.serviceImageUrl ? (
                <div className="relative w-full h-44">
                  <Image src={svcItem.serviceImageUrl} alt={serviceName} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <h1 className="absolute bottom-4 left-5 rtl:left-auto rtl:right-5 text-2xl font-bold text-white drop-shadow">{serviceName}</h1>
                </div>
              ) : (
                <div className="w-full h-24 bg-gradient-to-r from-slate-700 to-slate-900 flex items-center gap-4 px-6 text-start">
                  <Briefcase className="w-7 h-7 text-white/50 shrink-0" />
                  <h1 className="text-xl font-bold text-white">{serviceName}</h1>
                </div>
              )}
              <div className="p-5 space-y-3 text-start">
                <p className="text-slate-500 text-sm leading-relaxed">{serviceDesc}</p>
                {order.description && (
                  <div className="p-4 bg-amber-50 rounded-2xl border-l-[3px] rtl:border-l-0 rtl:border-r-[3px] border-amber-400">
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1.5">{t('adminNotes')}</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{order.description}</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* ── Event details ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
              className="rounded-3xl bg-white shadow-sm border border-slate-100 p-5 space-y-3 text-start">
              <h2 className="font-semibold text-slate-700">{t('eventDetails')}</h2>
              <div className="flex items-start gap-3 text-sm text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>{getFormattedDate(order.date, language)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{getFormattedTime(order.time, language)}</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p>{order.hallName}</p>
                  {order.hallLocation && (
                    <a href={order.hallLocation} target="_blank" rel="noopener noreferrer"
                      className="group flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline mt-0.5 inline-block transition-colors">
                      <span>{t('openInGoogleMaps')}</span>
                      <span className="inline-block transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                        {dir === 'rtl' ? '←' : '→'}
                      </span>
                    </a>
                  )}
                </div>
              </div>
            </motion.div>

            {/* ── Client contact (no price) ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}
              className="rounded-3xl bg-white shadow-sm border border-slate-100 p-5 text-start">
              <h2 className="font-semibold text-slate-700 mb-4">{t('clientContact')}</h2>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 text-sm">{order.clientName}</p>
                    <p className="text-xs text-slate-400 mt-0.5" dir="ltr">{order.clientPhone}</p>
                  </div>
                </div>
                <a href={`https://wa.me/${order.clientPhone.replace(/[^0-9]/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-sm font-medium transition-colors cursor-pointer border border-emerald-100">
                  <Image src="https://raiyansoft.com/wp-content/uploads/2026/05/whatsapp.png" alt="WA" width={16} height={16} referrerPolicy="no-referrer" />
                  {t('contact')}
                </a>
              </div>
            </motion.div>

            {/* ── Status update panel ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }}
              className="rounded-3xl bg-white shadow-sm border border-slate-100 p-5 space-y-5 text-start">

              {/* Title + flash feedback */}
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-700">{t('updateOrderStatus')}</h2>
                <AnimatePresence>
                  {flash && (
                    <motion.span key="flash"
                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {t('statusUpdated')}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Rejected state */}
              {isRejected ? (
                <div className="flex items-center gap-4 p-4 bg-red-50 rounded-2xl border border-red-100">
                  <XCircle className="w-7 h-7 text-red-400 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-700 text-sm">{t('orderRejected')}</p>
                    <p className="text-xs text-red-400 mt-0.5">{t('orderRejectedMsg')}</p>
                  </div>
                  <button onClick={() => applyStatus('coming')} disabled={!!saving}
                    className="text-xs text-red-500 hover:text-red-700 underline cursor-pointer shrink-0 transition-colors">
                    {t('undo')}
                  </button>
                </div>
              ) : (
                <>
                  {/* Step buttons */}
                  <div className="flex items-center gap-1">
                    {steps.map((step, idx) => {
                      const isActive = idx === currentIdx;
                      const isDone = idx < currentIdx;
                      const isLoading = saving === step.id;
                      return (
                        <React.Fragment key={step.id}>
                          <button
                            onClick={() => !saving && !isFinished && applyStatus(step.id)}
                            disabled={!!saving || isFinished}
                            title={step.sub}
                            className={cn(
                              'flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-2xl flex-1 text-center',
                              'transition-all duration-200 focus:outline-none',
                              isLoading && 'cursor-wait',
                              !saving && !isFinished && !isActive && !isDone && 'cursor-pointer hover:bg-slate-50',
                              isActive && !isFinished && 'cursor-pointer',
                              isFinished ? 'cursor-default' : '',
                              isActive
                                ? cn('ring-2 shadow-lg', step.ring, step.color.replace('bg-', 'shadow-') + '/25')
                                : isDone
                                  ? 'bg-emerald-50'
                                  : 'bg-slate-50',
                            )}>
                            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center transition-all',
                              isActive ? `${step.color} text-white` : isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400')}>
                              {isLoading
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : isDone
                                  ? <CheckCircle2 className="w-4 h-4" />
                                  : <span className="text-xs font-bold">{idx + 1}</span>}
                            </div>
                            <span className={cn('text-xs font-semibold',
                              isActive ? 'text-slate-800' : isDone ? 'text-emerald-600' : 'text-slate-400')}>
                              {step.label}
                            </span>
                          </button>
                          {idx < steps.length - 1 && (
                            <ChevronRight className="w-4 h-4 text-slate-200 shrink-0 rtl:rotate-180" />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {isFinished && (
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                      <div>
                        <p className="font-semibold text-emerald-700 text-sm">{t('orderCompleted')}</p>
                        <p className="text-xs text-emerald-500 mt-0.5">{t('orderCompletedMsg')}</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Reject action */}
              {!isRejected && !isFinished && (
                <div className="border-t border-slate-100 pt-4">
                  <AnimatePresence mode="wait">
                    {!rejectConfirm ? (
                      <motion.button key="reject-btn"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setRejectConfirm(true)}
                        className="w-full py-2.5 text-sm text-red-500 hover:text-red-700 font-medium hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-red-100 hover:border-red-200">
                        {t('markAsRejected')}
                      </motion.button>
                    ) : (
                      <motion.div key="reject-confirm"
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="space-y-2">
                        <p className="text-xs text-slate-500 text-center font-medium">{t('confirmRejectTitle')}</p>
                        <div className="flex gap-3">
                          <button onClick={() => setRejectConfirm(false)}
                            className="flex-1 py-2.5 text-sm text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
                            {t('cancel')}
                          </button>
                          <button onClick={() => applyStatus('rejected')} disabled={!!saving}
                            className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                            {saving === 'reject' && <Loader2 className="w-4 h-4 animate-spin" />}
                            {t('confirmReject')}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </>
        )}

        <p className="text-center text-xs text-slate-300 pb-4">
          {t('poweredBy')} <span className="font-semibold text-slate-500">Tanal Events</span>
        </p>
      </div>
    </div>
  );
}
