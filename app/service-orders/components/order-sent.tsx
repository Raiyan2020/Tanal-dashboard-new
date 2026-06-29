import React from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { ServiceOrder } from '@/lib/orderStore';

interface OrderSentProps {
  createdOrder: ServiceOrder;
  onBackToOrders: () => void;
  onAddNewOrder: () => void;
  sendWhatsApp: (phone: string, msg: string) => void;
  clientMsg: (o: ServiceOrder) => string;
  employeeMsg: (o: ServiceOrder, item: any) => string;
}

export function OrderSent({
  createdOrder,
  onBackToOrders,
  onAddNewOrder,
  sendWhatsApp,
  clientMsg,
  employeeMsg,
}: OrderSentProps) {
  const { t, language } = useLanguage();
  const orderSumPrice = createdOrder.services.reduce((sum, s) => sum + s.price, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto py-10 px-4">
      <div className="glass-panel rounded-3xl p-8 flex flex-col items-center text-center gap-5">
        <div className="w-20 h-20 rounded-3xl bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-secondary mb-1">{t('orderCreatedTitle') || 'Order Created'}</h2>
          <p className="text-secondary/60 text-sm">
            <span className="font-mono font-bold text-primary">{createdOrder.id}</span> {t('orderSavedMsg') || 'has been saved successfully.'}
          </p>
        </div>

        {/* Order summary pill */}
        <div className="w-full bg-white/60 rounded-2xl p-4 border border-secondary/10 text-start space-y-3">
          <div className="border-b border-secondary/15 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary/40">{t('services') || 'Services'}</span>
            <div className="mt-1 space-y-1">
              {createdOrder.services.map(s => {
                const sName = language === 'ar' ? (s.serviceNameAr || s.serviceName) : s.serviceName;
                return (
                  <div key={s.id} className="flex justify-between text-sm">
                    <span className="font-medium text-secondary">{sName}</span>
                    <span className="text-secondary/60 text-xs">
                      {s.price.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} {language === 'ar' ? 'د.ك' : 'KD'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-secondary/50">{t('client') || 'Client'}</span>
            <span className="font-medium text-secondary">{createdOrder.clientName}</span>
          </div>
          <div className="flex justify-between text-sm pt-1 border-t border-dashed border-secondary/10">
            <span className="text-secondary/50">{t('price') || 'Price'}</span>
            <span className="font-bold text-secondary">
              {orderSumPrice.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}{' '}
              {language === 'ar' ? 'د.ك' : 'KD'}
            </span>
          </div>
        </div>

        {/* WhatsApp send buttons */}
        <div className="w-full space-y-3">
          {/* Client link */}
          {/* <button onClick={() => sendWhatsApp(createdOrder.clientPhone, clientMsg(createdOrder))}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-medium transition-all cursor-pointer shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5">
            <Image src="https://raiyansoft.com/wp-content/uploads/2026/05/whatsapp.png" alt="WhatsApp" width={20} height={20} referrerPolicy="no-referrer" />
            {t('sendPaymentLinkClient') || 'Send Payment Link to Client'}
          </button> */}

          {/* Employees links */}
          {/* {createdOrder.services.map((svcItem) => {
            const svcName = language === 'ar' ? (svcItem.serviceNameAr || svcItem.serviceName) : svcItem.serviceName;
            return (
              <button key={svcItem.id} onClick={() => sendWhatsApp(svcItem.employeePhone, employeeMsg(createdOrder, svcItem))}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-secondary hover:bg-secondary/90 text-white rounded-2xl font-medium transition-all cursor-pointer shadow-md hover:-translate-y-0.5 text-xs sm:text-sm">
                <Image src="https://raiyansoft.com/wp-content/uploads/2026/05/whatsapp.png" alt="WhatsApp" width={20} height={20} referrerPolicy="no-referrer" />
                {language === 'ar' ? `رابط مهمة: ${svcItem.employeeName} (${svcName})` : `Send Task: ${svcItem.employeeName} (${svcName})`}
              </button>
            );
          })} */}
        </div>

        <div className="flex gap-3 w-full">
          <button onClick={onBackToOrders}
            className="flex-1 py-2.5 text-sm text-secondary/70 bg-secondary/5 hover:bg-secondary/10 rounded-xl transition-colors cursor-pointer">
            {t('backToOrders') || 'Back to Orders'}
          </button>
          <button onClick={onAddNewOrder}
            className="flex-1 py-2.5 text-sm text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors cursor-pointer font-medium">
            {t('addNewOrderBtn') || 'Add New Order'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
