'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, MapPin, CreditCard, CheckCircle2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { ServiceOrder, getOrderById, updatePaymentStatus } from '@/lib/orderStore';
import logo from "@/public/logo.webp"
// Inline SVG Components for high fidelity and zero external image assets dependencies
const VisaLogo = () => (
  <svg className="h-3.5 w-auto" viewBox="0 0 24 8" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3.385 7.643h1.365L6.34 2.109H4.975l-1.59 5.534zm5.836-5.328c-.287-.107-.736-.222-1.294-.222-1.42 0-2.42.717-2.427 1.745-.008.758.718 1.18 1.264 1.433.56.26.75.426.75.658 0 .356-.45.52-.863.52-.576 0-1.026-.145-1.564-.37L4.793 7.15c.343.149.98.278 1.635.283 1.51 0 2.493-.71 2.506-1.808.012-.603-.382-1.06-1.222-1.442-.505-.246-.816-.412-.816-.662 0-.227.265-.47.838-.47.468-.008.81.096 1.076.2l.255.12.362-1.056zm2.463 3.65c.101-.26.49-1.258.49-1.258-.026.044.1.264.161.444l.27 1.238.163-.162h-1.084zm1.968-3.856H12.63c-.347 0-.61.1-.762.443L9.75 7.643h1.431s.233-.306.287-.447h1.742c.04.175.163.447.163.447h1.266L13.652 2.309zm4.27 5.334c.383-.984.773-1.983 1.144-2.923.064-.176.12-.338.12-.338l.643 2.9c.074.329.28.361.503.361h2.1l-2.023-5.334H19.06c-.302 0-.558.172-.676.438L15.932 7.643h1.442z" fill="#1A1F71" />
  </svg>
);

const MastercardLogo = () => (
  <svg className="h-4 w-auto" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="7" cy="8" r="7" fill="#EB001B" />
    <circle cx="17" cy="8" r="7" fill="#F79E1B" fillOpacity="0.8" />
    <path d="M12 11.835a6.974 6.974 0 0 1-1.3-3.835c0-1.445.44-2.784 1.3-3.835a6.974 6.974 0 0 1 1.3 3.835c0 1.445-.44 2.784-1.3 3.835z" fill="#FF5F00" />
  </svg>
);

const KnetLogo = () => (
  <svg className="h-4.5 w-auto" viewBox="0 0 54 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="54" height="20" rx="3" fill="#003B7E" />
    <path d="M6 3h3v5.5L13.5 3H17l-4.5 6 5 8h-3.5L10 11.5V17H6V3z" fill="#FFF" />
    <path d="M20 17V3h3.5l3.5 7.5V3h3v14h-3L23.5 9.5V17H20z" fill="#F7A81B" />
    <path d="M33 3h7.5v3H36v2.5h3.5v3H36V14h4.5v3H33V3z" fill="#00A859" />
    <path d="M43 3h7v3h-2v11h-3.5V6h-1.5V3z" fill="#FFF" />
  </svg>
);

const ApplePayLogo = () => (
  <svg className="h-4.5 w-auto" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.2.67-2.92 1.49-.62.71-1.16 1.85-1.01 2.96 1.12.09 2.26-.57 2.94-1.39" />
  </svg>
);

const DimaLogo = () => (
  <svg className="h-4.5 w-auto" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="20" rx="3" fill="#0A1128" />
    <circle cx="12" cy="10" r="4.5" stroke="#3A86FF" strokeWidth="1.8" />
    <circle cx="20" cy="10" r="4.5" stroke="#00B4D8" strokeWidth="1.8" />
  </svg>
);

const TallyLogo = () => (
  <svg className="h-4.5 w-auto" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="20" rx="3" fill="#FFF" stroke="#E2E8F0" strokeWidth="1" />
    <path d="M8 14C8 14 12 6 16 6C20 6 24 14 24 14" stroke="#0F2042" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 11C12 11 14.5 8 16 8C17.5 8 20 11 20 11" stroke="#3A86FF" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const CodLogo = () => (
  <svg className="h-4.5 w-4.5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
    <circle cx="12" cy="14" r="2" />
  </svg>
);

const LinkLogo = () => (
  <svg className="h-4.5 w-4.5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

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

export default function ClientOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { language, setLanguage, dir, t } = useLanguage();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [paid, setPaid] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [paidWith, setPaidWith] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);

  const toggleLanguage = () => setLanguage(language === 'en' ? 'ar' : 'en');

  // Load gateway list with translated labels
  const gateways = useMemo(() => [
    {
      id: 'visa-mastercard',
      name: t('visaMaster'),
      logo: (
        <div className="flex items-center gap-1.5 bg-white border border-stone-200/50 shadow-sm px-2 py-1 rounded-xl h-8">
          <VisaLogo />
          <MastercardLogo />
        </div>
      )
    },
    {
      id: 'knet',
      name: t('knet'),
      logo: (
        <div className="flex items-center bg-white border border-stone-200/50 shadow-sm px-2.5 py-1 rounded-xl h-8">
          <KnetLogo />
        </div>
      )
    },
    {
      id: 'apple-pay',
      name: t('applePay'),
      logo: (
        <div className="flex items-center text-black bg-white border border-stone-200/50 shadow-sm px-3 py-1 rounded-xl h-8">
          <ApplePayLogo />
        </div>
      )
    },
    {
      id: 'dima',
      name: t('dima'),
      logo: (
        <div className="flex items-center bg-white border border-stone-200/50 shadow-sm px-2 py-1 rounded-xl h-8">
          <DimaLogo />
        </div>
      )
    },
    {
      id: 'tally',
      name: t('tally'),
      logo: (
        <div className="flex items-center bg-white border border-stone-200/50 shadow-sm px-2 py-1 rounded-xl h-8">
          <TallyLogo />
        </div>
      )
    },
    {
      id: 'cod',
      name: t('cod'),
      logo: (
        <div className="flex items-center justify-center bg-white border border-stone-200/50 shadow-sm p-1 px-2.5 rounded-xl w-14 h-8">
          <CodLogo />
        </div>
      )
    },
    {
      id: 'pay-by-link',
      name: t('payByLink'),
      logo: (
        <div className="flex items-center justify-center bg-white border border-stone-200/50 shadow-sm p-1 px-2.5 rounded-xl w-14 h-8">
          <LinkLogo />
        </div>
      )
    },
  ], [t]);

  useEffect(() => {
    if (!id) return;
    const found = getOrderById(id as string);
    if (!found) { setNotFound(true); return; }
    setOrder(found);
    if (found.paymentStatus === 'paid') {
      setPaid(true);
      setPaidWith('previously');
    }
  }, [id]);

  const handlePay = (gatewayId: string) => {
    if (!order || processing) return;
    setProcessing(gatewayId);
    // Simulate payment processing (2s)
    setTimeout(() => {
      updatePaymentStatus(order.id, 'paid');
      const updated = getOrderById(order.id);
      if (updated) setOrder(updated);
      setPaid(true);
      setPaidWith(gatewayId);
      setProcessing(null);
    }, 2000);
  };

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50" dir={dir}>
        <div className="text-center text-stone-400 p-8">
          <CreditCard className="w-14 h-14 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium text-stone-600">{t('orderNotFound')}</p>
          <p className="text-sm mt-1">{t('orderLinkExpired')}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="w-8 h-8 animate-spin text-stone-300" />
      </div>
    );
  }

  const gwName = gateways.find(g => g.id === paidWith)?.name ?? '';
  const totalOrderPrice = order.services.reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/20 to-stone-100 font-sans" dir={dir}>
      {/* Branded header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-stone-100 px-5 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src={logo} alt="Tanal"
              width={26} height={34} className="object-contain" referrerPolicy="no-referrer" />
            <span className="text-base font-semibold text-stone-700 tracking-tight">Tanal</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="text-xs font-semibold bg-stone-50 hover:bg-stone-100 text-stone-500 border border-stone-100 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              {language === 'en' ? 'عربي' : 'English'}
            </button>
            <span className="text-xs font-mono bg-stone-100 text-stone-400 px-3 py-1.5 rounded-full">{order.id}</span>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-7 space-y-5">

        {/* ── Services list card ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl overflow-hidden bg-white shadow-sm border border-stone-100 p-5 space-y-4">
          <h2 className="font-semibold text-stone-700 text-start">{t('services')}</h2>
          <div className="space-y-4">
            {order.services.map((svcItem) => {
              const sName = language === 'ar' ? (svcItem.serviceNameAr || svcItem.serviceName) : svcItem.serviceName;
              const sDesc = language === 'ar' ? (svcItem.serviceDescriptionAr || svcItem.serviceDescription) : svcItem.serviceDescription;
              return (
                <div key={svcItem.id} className="flex gap-4 items-start pb-4 border-b border-stone-100 last:border-b-0 last:pb-0">
                  {svcItem.serviceImageUrl ? (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                      <Image src={svcItem.serviceImageUrl} alt={sName} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-amber-50/50 flex items-center justify-center shrink-0 text-xl">
                      ✨
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-start">
                    <h3 className="font-bold text-stone-800 text-sm">{sName}</h3>
                    <p className="text-stone-500 text-xs mt-1 leading-relaxed">{sDesc}</p>
                    <p className="text-amber-700 text-xs font-bold mt-1.5">
                      {svcItem.price.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}{' '}
                      {language === 'ar' ? 'د.ك' : 'KD'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Order details ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="rounded-3xl bg-white shadow-sm border border-stone-100 p-5 space-y-4 text-start">
          <h2 className="font-semibold text-stone-700">{t('orderDetails')}</h2>
          {order.description && (
            <p className="text-stone-500 text-sm leading-relaxed bg-stone-50 rounded-2xl p-4 border border-stone-100">
              {order.description}
            </p>
          )}
          <div className="space-y-3">
            <div className="flex items-start gap-3 text-sm text-stone-600">
              <Calendar className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{getFormattedDate(order.date, language)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-600">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{getFormattedTime(order.time, language)}</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-stone-600">
              <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span>{order.hallName}</span>
                {order.hallLocation && (
                  <a href={order.hallLocation} target="_blank" rel="noopener noreferrer"
                    className="group flex items-center gap-1 text-xs text-amber-700 underline mt-0.5 hover:text-amber-900 transition-colors">
                    <span>{t('openInGoogleMaps')}</span>
                    <span className="inline-block transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                      {dir === 'rtl' ? '←' : '→'}
                    </span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Payment section ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
          className="rounded-3xl bg-white shadow-sm border border-stone-100 p-5 space-y-5">

          {/* Price display */}
          <div className="flex items-start justify-between gap-4">
            <div className="text-start">
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">{t('totalAmount')}</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-stone-800">
                  {totalOrderPrice.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                </span>
                <span className="text-stone-400 mb-1 font-medium">
                  {language === 'ar' ? 'د.ك' : 'KD'}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                {order.paymentType === 'single' ? t('singlePayment') : t('twoInstallments')}
              </p>
            </div>
            <div>
              {paid ? (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4" /> {t('paid')}
                </span>
              ) : (
                <span className="text-sm font-semibold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
                  {t('unpaid')}
                </span>
              )}
            </div>
          </div>

          {/* Payment gateways or success */}
          <AnimatePresence mode="wait">
            {!paid ? (
              <motion.div key="gateways" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <p className="text-sm text-stone-500 font-medium text-start">{t('selectPaymentMethod')}</p>

                <div className="flex flex-col gap-3">
                  {gateways.map(gw => {
                    const isSelected = selectedGateway === gw.id;
                    return (
                      <button
                        key={gw.id}
                        onClick={() => setSelectedGateway(gw.id)}
                        disabled={!!processing}
                        className={cn(
                          'w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                          isSelected
                            ? 'border-amber-600 bg-amber-50/10 shadow-md ring-1 ring-amber-600/35'
                            : 'border-stone-100 bg-white hover:bg-stone-50/50 hover:border-stone-200'
                        )}
                      >
                        {dir === 'rtl' ? (
                          <>
                            {/* Left: Logo */}
                            <div className="shrink-0 flex items-center justify-center">
                              {gw.logo}
                            </div>
                            {/* Right: Text + Radio */}
                            <div className="flex items-center gap-4">
                              <span className="text-base font-bold text-stone-700">{gw.name}</span>
                              <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                isSelected ? "border-amber-600 bg-white" : "border-stone-200"
                              )}>
                                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-amber-600" />}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Left: Radio + Text */}
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                isSelected ? "border-amber-600 bg-white" : "border-stone-200"
                              )}>
                                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-amber-600" />}
                              </div>
                              <span className="text-base font-bold text-stone-700">{gw.name}</span>
                            </div>
                            {/* Right: Logo */}
                            <div className="shrink-0 flex items-center justify-center">
                              {gw.logo}
                            </div>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Primary checkout button */}
                <button
                  onClick={() => selectedGateway && handlePay(selectedGateway)}
                  disabled={!selectedGateway || !!processing}
                  className="w-full py-4 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-100 disabled:text-stone-400 text-white font-bold rounded-2xl transition-all shadow-sm hover:shadow-md cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('processing')}
                    </>
                  ) : (
                    t('payNow')
                  )}
                </button>

                <p className="text-xs text-stone-300 text-center">{t('securedByTanal')}</p>
              </motion.div>
            ) : (
              <motion.div key="success"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-6 gap-4 text-center">
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-stone-700">{t('paymentConfirmed')}</p>
                  {gwName && gwName !== 'previously' && (
                    <p className="text-sm text-stone-400 mt-1">{t('paidVia')} <span className="font-medium text-stone-600">{gwName}</span></p>
                  )}
                  <p className="text-sm text-stone-400 mt-1.5">
                    {t('thankYouEvent')}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-xs text-stone-300 pb-4">
          {t('poweredBy')} <span className="font-semibold text-stone-500">Tanal Events</span>
        </p>
      </div>
    </div>
  );
}
