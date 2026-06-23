'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, Trash2, Edit2, ChevronLeft, ChevronRight,
  Calendar, Clock, MapPin, DollarSign, User, Briefcase,
  AlertTriangle, CheckCircle2, Send, ClipboardList, ChevronDown,
  UserPlus, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import {
  ServiceOrder, OrderStatus, PaymentStatus,
  getOrders, saveOrder, deleteOrder, generateOrderId,
  ORDER_MOCK_SERVICES, ORDER_MOCK_CLIENTS, ORDER_MOCK_EMPLOYEES,
  getOverallStatus,
} from '@/lib/orderStore';

// ── Status / payment config ───────────────────────────────────────────────────

const STATUS_CFG: Record<OrderStatus, { label: string; labelAr: string; cls: string; dot: string }> = {
  coming: { label: 'Coming', labelAr: 'قادم', cls: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  'in-progress': { label: 'In Progress', labelAr: 'جارٍ', cls: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  finished: { label: 'Finished', labelAr: 'مكتمل', cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  rejected: { label: 'Rejected', labelAr: 'مرفوض', cls: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

const PAYMENT_CFG: Record<PaymentStatus, { label: string; labelAr: string; cls: string }> = {
  unpaid: { label: 'Unpaid', labelAr: 'غير مدفوع', cls: 'bg-orange-100 text-orange-700' },
  paid: { label: 'Paid', labelAr: 'مدفوع', cls: 'bg-emerald-100 text-emerald-700' },
};

type FilterTab = 'all' | OrderStatus | PaymentStatus;
const TABS: { id: FilterTab; label: string; labelAr: string }[] = [
  { id: 'all', label: 'All', labelAr: 'الكل' },
  { id: 'coming', label: 'Coming', labelAr: 'قادمة' },
  { id: 'in-progress', label: 'In Progress', labelAr: 'جارية' },
  { id: 'finished', label: 'Finished', labelAr: 'مكتملة' },
  { id: 'rejected', label: 'Rejected', labelAr: 'مرفوضة' },
  { id: 'paid', label: 'Paid', labelAr: 'مدفوعة' },
  { id: 'unpaid', label: 'Unpaid', labelAr: 'غير مدفوعة' },
];

// Helper to format date in card
const getFormattedDateShort = (dateStr: string, lang: string) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return dateStr; }
};

// ── Shared dropdown component ─────────────────────────────────────────────────

interface DropdownProps<T> {
  value: string;
  placeholder: string;
  label: (item: T) => React.ReactNode;
  sublabel: (item: T) => React.ReactNode;
  items: T[];
  filterFn: (item: T, q: string) => boolean;
  onSelect: (item: T) => void;
}
function Dropdown<T extends { id: string | number }>({
  value, placeholder, label, sublabel, items, filterFn, onSelect,
}: DropdownProps<T>) {
  const { t, dir } = useLanguage();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = q ? items.filter(i => filterFn(i, q)) : items;
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-white/50 border border-white/60 hover:border-primary/40 outline-none transition-all text-sm cursor-pointer">
        <span className={cn('text-start truncate', value ? 'text-secondary' : 'text-secondary/40')}>{value || placeholder}</span>
        <ChevronDown className="w-4 h-4 text-secondary/40 shrink-0" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setQ(''); }} />
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="absolute top-full mt-1 left-0 right-0 z-50 bg-white rounded-2xl shadow-2xl border border-secondary/10 overflow-hidden">
              <div className="p-2 border-b border-secondary/10">
                <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('searchDropdown')}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-secondary/5 outline-none" />
              </div>
              <div className="max-h-52 overflow-y-auto py-1">
                {filtered.map(item => (
                  <button key={item.id} type="button"
                    onClick={() => { onSelect(item); setOpen(false); setQ(''); }}
                    className={cn("w-full px-3 py-2.5 text-sm flex items-center gap-3 hover:bg-secondary/5 transition-colors cursor-pointer", dir === 'rtl' ? 'text-right' : 'text-left')}>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-secondary truncate">{label(item)}</div>
                      <div className="text-xs text-secondary/50 truncate">{sublabel(item)}</div>
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && <p className="text-center text-secondary/40 text-xs py-4">{t('noResults')}</p>}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Delete modal ──────────────────────────────────────────────────────────────

function DeleteModal({ order, onClose, onConfirm }: { order: ServiceOrder; onClose: () => void; onConfirm: () => void }) {
  const { t, dir } = useLanguage();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
        <div className="p-8 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-secondary text-lg mb-1">{t('deleteOrderTitle')}</h3>
            <p className="text-sm text-secondary/60">
              {t('confirmDeleteOrder')} "{order.id}"{dir === 'rtl' ? '؟' : '?'} {t('cannotBeUndone')}
            </p>
          </div>
          <div className="w-full flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-secondary/70 bg-secondary/5 hover:bg-secondary/10 border border-secondary/15 rounded-xl transition-colors cursor-pointer">
              {t('cancel')}
            </button>
            <button onClick={onConfirm} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer shadow-md">
              {t('yesDelete')}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Form state interfaces ──────────────────────────────────────────────────────

interface ServiceEmployee {
  uid: string;
  mode: 'existing' | 'new';
  id?: string;
  name: string;
  phone: string;
}

interface FormServiceItem {
  id: string; // temp unique key
  serviceId: string;
  serviceName: string;
  serviceNameAr: string;
  serviceImageUrl: string;
  serviceDescription: string;
  serviceDescriptionAr: string;
  price: string;
  description: string;
  employees: ServiceEmployee[];
}

const EMPTY_FORM = {
  services: [] as FormServiceItem[],
  description: '',
  date: '', time: '',
  hallName: '', hallLocation: '',
  paymentType: 'one-payment' as 'one-payment' | 'two-installments',
  clientId: '', clientName: '', clientPhone: '',
  isPaid: false,
};
type FormState = typeof EMPTY_FORM;

const createEmptyEmployee = (): ServiceEmployee => ({
  uid: Math.random().toString(),
  mode: 'existing',
  id: undefined,
  name: '',
  phone: '',
});

const createEmptyServiceItem = (): FormServiceItem => ({
  id: Math.random().toString(),
  serviceId: '',
  serviceName: '',
  serviceNameAr: '',
  serviceImageUrl: '',
  serviceDescription: '',
  serviceDescriptionAr: '',
  price: '',
  description: '',
  employees: [createEmptyEmployee()],
});

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ServiceOrdersPage() {
  const { dir, t, language } = useLanguage();
  const [view, setView] = useState<'list' | 'form' | 'sent'>('list');
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [editing, setEditing] = useState<ServiceOrder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceOrder | null>(null);
  const [createdOrder, setCreatedOrder] = useState<ServiceOrder | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => { setOrders(getOrders()); }, []);
  const refresh = () => setOrders(getOrders());

  const filtered = useMemo(() => {
    let result = orders;
    if (activeTab !== 'all') {
      result = result.filter(o => getOverallStatus(o) === activeTab || o.paymentStatus === activeTab);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.clientName.toLowerCase().includes(q) ||
        o.services.some(s =>
          s.serviceName.toLowerCase().includes(q) ||
          (s.serviceNameAr && s.serviceNameAr.toLowerCase().includes(q)) ||
          s.employeeName.toLowerCase().includes(q)
        )
      );
    }
    return result;
  }, [orders, activeTab, search]);

  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      services: [createEmptyServiceItem()],
    });
    setEditing(null);
    setView('form');
  };

  const openEdit = (order: ServiceOrder) => {
    setForm({
      services: order.services.map(s => ({
        id: s.id,
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        serviceNameAr: s.serviceNameAr,
        serviceImageUrl: s.serviceImageUrl,
        serviceDescription: s.serviceDescription,
        serviceDescriptionAr: s.serviceDescriptionAr,
        price: s.price.toString(),
        description: (s as any).description ?? '',
        employees: ((s as any).employees as ServiceEmployee[] | undefined)?.length
          ? (s as any).employees as ServiceEmployee[]
          : s.employeeName
            ? [{ uid: Math.random().toString(), mode: 'existing' as const, id: ORDER_MOCK_EMPLOYEES.find(e => e.name === s.employeeName)?.id.toString(), name: s.employeeName, phone: s.employeePhone }]
            : [],
      })),
      description: order.description,
      date: order.date,
      time: order.time,
      hallName: order.hallName,
      hallLocation: order.hallLocation,
      paymentType: order.paymentType,
      clientId: order.clientId,
      clientName: order.clientName,
      clientPhone: order.clientPhone,
      isPaid: order.paymentStatus === 'paid',
    });
    setEditing(order);
    setView('form');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const servicesList = form.services.map(s => ({
      id: s.id || Math.random().toString(),
      serviceId: s.serviceId,
      serviceName: s.serviceName,
      serviceNameAr: s.serviceNameAr,
      serviceImageUrl: s.serviceImageUrl,
      serviceDescription: s.serviceDescription,
      serviceDescriptionAr: s.serviceDescriptionAr,
      price: parseFloat(s.price) || 0,
      description: s.description,
      employees: s.employees.map(e => ({ id: e.id, name: e.name, phone: e.phone })),
      // keep first employee flat for backwards compatibility with existing ServiceOrder type
      employeeName: s.employees[0]?.name ?? '',
      employeePhone: s.employees[0]?.phone ?? '',
      status: (editing?.services.find(item => item.id === s.id)?.status) ?? 'coming',
    }));

    const order: ServiceOrder = {
      id: editing?.id ?? generateOrderId(),
      services: servicesList,
      currency: 'KD',
      description: form.description,
      date: form.date,
      time: form.time,
      hallName: form.hallName,
      hallLocation: form.hallLocation,
      paymentType: form.paymentType,
      clientId: form.clientId,
      clientName: form.clientName,
      clientPhone: form.clientPhone,
      paymentStatus: form.isPaid ? 'paid' : 'unpaid',
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
    saveOrder(order);
    refresh();
    if (editing) { setView('list'); }
    else { setCreatedOrder(order); setView('sent'); }
  };

  const sendWhatsApp = (phone: string, msg: string) => {
    const clean = phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const clientMsg = (o: ServiceOrder) => {
    const link = `${window.location.origin}/order-client/${o.id}`;
    if (language === 'ar') {
      return `مرحباً ${o.clientName}!\nطلب الخدمات الخاص بك #${o.id} جاهز.\nاضغط لمشاهدة التفاصيل والدفع: ${link}`;
    }
    return `Hello ${o.clientName}!\nYour Service Order #${o.id} is ready.\nClick to view details and pay: ${link}`;
  };

  const employeeMsg = (o: ServiceOrder, item: any) => {
    const link = `${window.location.origin}/order-employee/${o.id}?itemId=${item.id}`;
    const sName = language === 'ar' ? (item.serviceNameAr || item.serviceName) : item.serviceName;
    if (language === 'ar') {
      return `مرحباً ${item.employeeName}!\nتم تعيينك على خدمة "${sName}" في طلب #${o.id}.\nاضغط لعرض التفاصيل وتحديث الحالة: ${link}`;
    }
    return `Hello ${item.employeeName}!\nYou have been assigned to service "${sName}" in order #${o.id}.\nClick to view details and update status: ${link}`;
  };

  const derivedTotalPrice = useMemo(() => {
    return form.services.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
  }, [form.services]);

  // ── SENT VIEW ──────────────────────────────────────────────────────────────
  if (view === 'sent' && createdOrder) {
    const orderSumPrice = createdOrder.services.reduce((sum, s) => sum + s.price, 0);
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto py-10 px-4">
        <div className="glass-panel rounded-3xl p-8 flex flex-col items-center text-center gap-5">
          <div className="w-20 h-20 rounded-3xl bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-secondary mb-1">{t('orderCreatedTitle')}</h2>
            <p className="text-secondary/60 text-sm">
              <span className="font-mono font-bold text-primary">{createdOrder.id}</span> {t('orderSavedMsg')}
            </p>
          </div>

          {/* Order summary pill */}
          <div className="w-full bg-white/60 rounded-2xl p-4 border border-secondary/10 text-start space-y-3">
            <div className="border-b border-secondary/15 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary/40">{t('services')}</span>
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
              <span className="text-secondary/50">{t('client')}</span>
              <span className="font-medium text-secondary">{createdOrder.clientName}</span>
            </div>
            <div className="flex justify-between text-sm pt-1 border-t border-dashed border-secondary/10">
              <span className="text-secondary/50">{t('price')}</span>
              <span className="font-bold text-secondary">
                {orderSumPrice.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}{' '}
                {language === 'ar' ? 'د.ك' : 'KD'}
              </span>
            </div>
          </div>

          {/* WhatsApp send buttons */}
          <div className="w-full space-y-3">
            {/* Client link */}
            <button onClick={() => sendWhatsApp(createdOrder.clientPhone, clientMsg(createdOrder))}
              className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-medium transition-all cursor-pointer shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5">
              <Image src="https://raiyansoft.com/wp-content/uploads/2026/05/whatsapp.png" alt="WhatsApp" width={20} height={20} referrerPolicy="no-referrer" />
              {t('sendPaymentLinkClient')}
            </button>

            {/* Employees links */}
            {createdOrder.services.map((svcItem) => {
              const svcName = language === 'ar' ? (svcItem.serviceNameAr || svcItem.serviceName) : svcItem.serviceName;
              return (
                <button key={svcItem.id} onClick={() => sendWhatsApp(svcItem.employeePhone, employeeMsg(createdOrder, svcItem))}
                  className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-secondary hover:bg-secondary/90 text-white rounded-2xl font-medium transition-all cursor-pointer shadow-md hover:-translate-y-0.5 text-xs sm:text-sm">
                  <Image src="https://raiyansoft.com/wp-content/uploads/2026/05/whatsapp.png" alt="WhatsApp" width={20} height={20} referrerPolicy="no-referrer" />
                  {language === 'ar' ? `رابط مهمة: ${svcItem.employeeName} (${svcName})` : `Send Task: ${svcItem.employeeName} (${svcName})`}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 w-full">
            <button onClick={() => { setCreatedOrder(null); setView('list'); }}
              className="flex-1 py-2.5 text-sm text-secondary/70 bg-secondary/5 hover:bg-secondary/10 rounded-xl transition-colors cursor-pointer">
              {t('backToOrders')}
            </button>
            <button onClick={() => { setCreatedOrder(null); openCreate(); }}
              className="flex-1 py-2.5 text-sm text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors cursor-pointer font-medium">
              {t('addNewOrderBtn')}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── FORM VIEW ──────────────────────────────────────────────────────────────
  if (view === 'form') {
    const clientDropdownValue = form.clientName ? `${form.clientName}` : '';

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10 max-w-2xl mx-auto text-start">
        {/* Back */}
        <button onClick={() => setView('list')}
          className="flex items-center gap-2 text-secondary/60 hover:text-secondary transition-colors cursor-pointer group">
          {dir === 'ltr'
            ? <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            : <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          <span className="font-medium">{t('back')}</span>
        </button>

        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <h2 className={cn('text-2xl font-medium text-secondary mb-6', dir === 'ltr' ? 'font-serif' : 'font-arabic')}>
            {editing ? t('editOrder') : t('createOrder')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Client */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
                <User className="w-4 h-4 text-secondary/40" /> {t('selectClient')} <span className="text-red-500">*</span>
              </label>
              <Dropdown
                value={clientDropdownValue}
                placeholder={t('chooseClientPlaceholder')}
                items={ORDER_MOCK_CLIENTS.map(c => ({ ...c }))}
                filterFn={(c, q) => c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q)}
                label={c => c.name}
                sublabel={c => <span dir="ltr">{c.phone}</span>}
                onSelect={c => setForm({ ...form, clientId: c.id, clientName: c.name, clientPhone: c.phone })}
              />
              {!form.clientId && <p className="text-xs text-secondary/40 mt-0.5">{t('required')}</p>}
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
                  <Calendar className="w-4 h-4 text-secondary/40" /> {t('eventDate')} <span className="text-red-500">*</span>
                </label>
                <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
                  <Clock className="w-4 h-4 text-secondary/40" /> {t('eventTime')} <span className="text-red-500">*</span>
                </label>
                <input type="time" required value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm" />
              </div>
            </div>

            {/* Hall */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-secondary/80">{t('hallName')} <span className="text-red-500">*</span></label>
              <input type="text" required placeholder={language === 'ar' ? 'فندق الفيصلية - قاعة الاحتفالات الكبرى' : 'Al Faisaliah Hotel – Grand Ballroom'} value={form.hallName}
                onChange={e => setForm({ ...form, hallName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm" />
            </div>

            {/* Hall Location */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
                <MapPin className="w-4 h-4 text-secondary/40" /> {t('hallLocationLink')}
              </label>
              <input type="url" placeholder="https://maps.google.com/…" value={form.hallLocation} dir="ltr"
                onChange={e => setForm({ ...form, hallLocation: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm font-mono text-left" />
            </div>

            {/* Dynamic Services List Section */}
            <div className="space-y-4 border-t border-secondary/10 pt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-secondary">{t('services')}</h3>

              </div>

              {form.services.map((svc, index) => {
                const svcDropdownValue = svc.serviceName
                  ? `${language === 'ar' ? (svc.serviceNameAr || svc.serviceName) : svc.serviceName}${svc.serviceNameAr && language !== 'ar' ? ` / ${svc.serviceNameAr}` : ''}${svc.serviceName && language === 'ar' && svc.serviceNameAr !== svc.serviceName ? ` / ${svc.serviceName}` : ''}`
                  : '';

                return (
                  <div key={svc.id} className="p-5 bg-secondary/5 rounded-2xl border border-secondary/10 relative space-y-4">
                    {/* Delete service item button */}
                    {form.services.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, services: form.services.filter(s => s.id !== svc.id) })}
                        className="absolute top-4 right-4 rtl:left-4 rtl:right-auto text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div className="text-xs font-bold text-secondary/60">
                      {language === 'ar' ? `الخدمة #${index + 1}` : `Service #${index + 1}`}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Select Service Dropdown */}
                      <div className="space-y-1.5 text-start">
                        <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
                          <Briefcase className="w-4 h-4 text-secondary/40" /> {t('selectService')} <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                          value={svcDropdownValue}
                          placeholder={t('chooseServicePlaceholder')}
                          items={ORDER_MOCK_SERVICES.map(s => ({ ...s }))}
                          filterFn={(s, q) => s.nameEn.toLowerCase().includes(q.toLowerCase()) || s.nameAr.includes(q)}
                          label={s => language === 'ar' ? s.nameAr : s.nameEn}
                          sublabel={s => <span className="font-arabic">{language === 'ar' ? s.nameEn : s.nameAr}</span>}
                          onSelect={s => {
                            const copy = [...form.services];
                            copy[index] = {
                              ...copy[index],
                              serviceId: s.id,
                              serviceName: s.nameEn,
                              serviceNameAr: s.nameAr,
                              serviceImageUrl: s.imageUrl,
                              serviceDescription: s.descriptionEn,
                              serviceDescriptionAr: s.descriptionAr,
                            };
                            setForm({ ...form, services: copy });
                          }}
                        />
                      </div>

                      {/* Custom Price for this service */}
                      <div className="space-y-1.5 text-start">
                        <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
                          <DollarSign className="w-4 h-4 text-secondary/40" /> {t('price')} (KD) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={svc.price}
                            onChange={e => {
                              const copy = [...form.services];
                              copy[index] = { ...copy[index], price: e.target.value };
                              setForm({ ...form, services: copy });
                            }}
                            dir="ltr"
                            className={cn("w-full py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm", dir === 'rtl' ? 'pr-14 pl-4' : 'pl-14 pr-4')}
                          />
                          <span className={cn("absolute top-1/2 -translate-y-1/2 text-sm font-semibold text-secondary/40 pointer-events-none", dir === 'rtl' ? 'right-4' : 'left-4')}>
                            {language === 'ar' ? 'د.ك' : 'KD'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Employees for this service */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
                          <UserPlus className="w-4 h-4 text-secondary/40" /> {t('assignEmployee')}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const copy = [...form.services];
                            copy[index] = { ...copy[index], employees: [...copy[index].employees, createEmptyEmployee()] };
                            setForm({ ...form, services: copy });
                          }}
                          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-dark transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          {language === 'ar' ? 'إضافة موظف' : 'Add Employee'}
                        </button>
                      </div>



                      {svc.employees.map((emp, empIdx) => (
                        <div key={emp.uid} className="p-3 bg-white/40 rounded-xl border border-white/60 space-y-2">
                          {/* Employee mode toggle + delete */}
                          <div className="flex items-center justify-between">
                            <div className="flex bg-secondary/5 rounded-lg p-0.5 gap-0.5">
                              {(['existing', 'new'] as const).map(mode => (
                                <button
                                  key={mode}
                                  type="button"
                                  onClick={() => {
                                    const copy = [...form.services];
                                    const empCopy = [...copy[index].employees];
                                    empCopy[empIdx] = { ...empCopy[empIdx], mode, id: undefined, name: '', phone: '' };
                                    copy[index] = { ...copy[index], employees: empCopy };
                                    setForm({ ...form, services: copy });
                                  }}
                                  className={cn('px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer',
                                    emp.mode === mode ? 'bg-white text-secondary shadow-sm' : 'text-secondary/50 hover:text-secondary')}
                                >
                                  {mode === 'existing' ? t('existingEmployee') : t('addNewEmployee')}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const copy = [...form.services];
                                copy[index] = { ...copy[index], employees: copy[index].employees.filter((_, i) => i !== empIdx) };
                                setForm({ ...form, services: copy });
                              }}
                              className="text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Employee input */}
                          {emp.mode === 'existing' ? (
                            <Dropdown
                              value={emp.name}
                              placeholder={t('chooseEmployeePlaceholder')}
                              items={ORDER_MOCK_EMPLOYEES.map(e => ({ ...e, id: e.id.toString() }))}
                              filterFn={(e, q) => e.name.toLowerCase().includes(q.toLowerCase()) || e.phone.includes(q)}
                              label={e => e.name}
                              sublabel={e => <span dir="ltr">{e.phone}</span>}
                              onSelect={e => {
                                const copy = [...form.services];
                                const empCopy = [...copy[index].employees];
                                empCopy[empIdx] = { ...empCopy[empIdx], id: e.id, name: e.name, phone: e.phone };
                                copy[index] = { ...copy[index], employees: empCopy };
                                setForm({ ...form, services: copy });
                              }}
                            />
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder={t('employeeNamePlaceholder')}
                                value={emp.name}
                                onChange={e => {
                                  const copy = [...form.services];
                                  const empCopy = [...copy[index].employees];
                                  empCopy[empIdx] = { ...empCopy[empIdx], name: e.target.value };
                                  copy[index] = { ...copy[index], employees: empCopy };
                                  setForm({ ...form, services: copy });
                                }}
                                className="w-full px-3 py-2 rounded-lg bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm"
                              />
                              <input
                                type="tel"
                                placeholder={t('phoneNumber')}
                                value={emp.phone}
                                dir="ltr"
                                onChange={e => {
                                  const copy = [...form.services];
                                  const empCopy = [...copy[index].employees];
                                  empCopy[empIdx] = { ...empCopy[empIdx], phone: e.target.value };
                                  copy[index] = { ...copy[index], employees: empCopy };
                                  setForm({ ...form, services: copy });
                                }}
                                className="w-full px-3 py-2 rounded-lg bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Per-service description */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-secondary/80">
                        {t('otherDetails')} <span className="text-xs text-secondary/40">({t('optional')})</span>
                      </label>
                      <textarea
                        rows={3}
                        placeholder={t('detailsPlaceholder')}
                        value={svc.description}
                        onChange={e => {
                          const copy = [...form.services];
                          copy[index] = { ...copy[index], description: e.target.value };
                          setForm({ ...form, services: copy });
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm resize-none"
                      />
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => setForm({ ...form, services: [...form.services, createEmptyServiceItem()] })}
                className="w-full text-xs font-bold text-white bg-primary hover:bg-primary-dark flex items-center gap-1 justify-center py-2 rounded cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {language === 'ar' ? 'إضافة خدمة أخرى' : 'Add Service'}
              </button>
            </div>

            {/* Total readout */}
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex justify-between items-center">
              <span className="text-sm font-medium text-secondary/70">{t('totalCostKd')}</span>
              <span className="text-lg font-bold text-primary">
                {derivedTotalPrice.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}{' '}
                {language === 'ar' ? 'د.ك' : 'KD'}
              </span>
            </div>

            {/* Is Paid */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" checked={form.isPaid} onChange={e => setForm({ ...form, isPaid: e.target.checked })}
                className="w-5 h-5 rounded text-primary border-secondary/20 focus:ring-primary cursor-pointer" />
              <span className="text-sm font-medium text-secondary/80 group-hover:text-secondary transition-colors">{t('isPaidQuestion')}</span>
            </label>

            {/* Payment Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-secondary/80">{t('paymentType')}</label>
              <div className="flex gap-6">
                {(['one-payment', 'two-installments'] as const).map(pt => (
                  <label key={pt} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" name="paymentType" value={pt}
                      checked={form.paymentType === pt}
                      onChange={() => setForm({ ...form, paymentType: pt })}
                      className="w-4 h-4 text-primary border-secondary/20 focus:ring-primary cursor-pointer" />
                    <span className="text-sm text-secondary/80">{pt === 'one-payment' ? t('onePayment') : t('twoInstallments')}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setView('list')}
                className="flex-1 py-3 text-sm font-medium text-secondary/70 bg-white/60 hover:bg-white border border-secondary/15 rounded-xl transition-colors cursor-pointer">
                {t('cancel')}
              </button>
              <button type="submit" disabled={form.services.length === 0 || form.services.some(s => !s.serviceId || !s.price) || !form.clientId}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer shadow-md shadow-primary/20 hover:-translate-y-0.5">
                <Send className="w-4 h-4" />
                {editing ? t('saveChanges') : t('createSendLinks')}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    );
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10 text-start">
      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal key="del" order={deleteTarget} onClose={() => setDeleteTarget(null)}
            onConfirm={() => { deleteOrder(deleteTarget.id); refresh(); setDeleteTarget(null); }} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className={cn('text-2xl font-medium text-secondary', dir === 'ltr' ? 'font-serif' : 'font-arabic')}>
            {t('serviceOrders')}
          </h2>
          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">{orders.length}</span>
        </div>
        <button onClick={openCreate}
          className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer hover:-translate-y-0.5">
          <Plus className="w-4 h-4" />
          {t('addOrder')}
        </button>
      </div>

      <div className="glass-panel rounded-3xl p-4 sm:p-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 rtl:right-0 rtl:left-auto flex items-center px-4 pointer-events-none text-secondary/40">
            <Search className="w-4 h-4" />
          </div>
          <input type="text" placeholder={t('searchOrdersPlaceholder')}
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 pl-10 pr-4 rtl:pr-10 rtl:pl-4 outline-none text-secondary text-sm transition-all" />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('px-3.5 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer shrink-0',
                activeTab === tab.id
                  ? 'bg-secondary text-white shadow-sm'
                  : 'bg-white/50 text-secondary/70 hover:bg-white/80')}>
              {dir === 'rtl' ? tab.labelAr : tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.length > 0 ? filtered.map((order, idx) => {
              const overallStatus = getOverallStatus(order);
              const sc = STATUS_CFG[overallStatus];
              const pc = PAYMENT_CFG[order.paymentStatus];

              // Joined services list text
              const servicesText = order?.services?.map(s => language === 'ar' ? (s.serviceNameAr || s.serviceName) : s.serviceName)
                .join(', ');

              const totalOrderPrice = order?.services?.reduce((sum, s) => sum + s.price, 0);

              // Extract first service item logo or fallback
              const firstSvcImageUrl = order?.services?.[0]?.serviceImageUrl;

              return (
                <motion.div key={order.id}
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }} transition={{ delay: idx * 0.025, duration: 0.18 }}
                  className="p-4 rounded-2xl bg-white/40 border border-secondary/5 shadow-sm hover:bg-white/60 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Left info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        {firstSvcImageUrl
                          ? <img src={firstSvcImageUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                          : <Briefcase className="w-5 h-5 text-primary" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-xs font-mono bg-secondary/5 px-2 py-0.5 rounded text-secondary/60 shrink-0">{order.id}</span>
                          <h3 className="font-semibold text-secondary text-sm truncate">{servicesText}</h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-secondary/55 flex-wrap">
                          <span className="flex items-center gap-1 shrink-0"><User className="w-3 h-3" /> {order.clientName}</span>
                          <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                          <span className="flex items-center gap-1 shrink-0"><Calendar className="w-3 h-3" /> {getFormattedDateShort(order.date, language)}</span>
                          <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                          <span className="shrink-0 font-medium">
                            {totalOrderPrice?.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}{' '}
                            {language === 'ar' ? 'د.ك' : 'KD'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right badges + actions */}
                    <div className={cn("flex items-center gap-2 flex-wrap shrink-0", dir === 'rtl' ? 'flex-row-reverse' : '')}>
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold', sc.cls)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', sc.dot)} />
                        {dir === 'rtl' ? sc.labelAr : sc.label}
                      </span>
                      <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold', pc.cls)}>
                        {dir === 'rtl' ? pc.labelAr : pc.label}
                      </span>
                      {/* Action buttons */}
                      <div className={cn("flex items-center gap-1 shrink-0", dir === 'rtl' ? 'border-r border-secondary/10 pr-2 mr-2' : 'border-l border-secondary/10 pl-2 ml-2')}>
                        <button title={language === 'ar' ? 'إرسال للعميل' : 'Send to Client'} onClick={() => sendWhatsApp(order.clientPhone, clientMsg(order))}
                          className="p-2 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer flex items-center justify-center">
                          <Image src="https://raiyansoft.com/wp-content/uploads/2026/05/whatsapp.png" alt="WA" width={15} height={15} referrerPolicy="no-referrer" />
                        </button>
                        <button title={t('edit')} onClick={() => openEdit(order)}
                          className="p-2 bg-white text-yellow-500 hover:bg-yellow-50 border border-transparent hover:border-yellow-100 rounded-lg transition-all cursor-pointer hover:-translate-y-px">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button title={t('remove')} onClick={() => setDeleteTarget(order)}
                          className="p-2 bg-white text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-all cursor-pointer hover:-translate-y-px">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center py-16 text-secondary/40 gap-4">
                <ClipboardList className="w-14 h-14 opacity-25" />
                <div className="text-center">
                  <p className="text-base font-medium">{t('noOrdersFound')}</p>
                  <p className="text-sm mt-1">{t('adjustSearchFilters')}</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
