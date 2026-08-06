import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Plus, Send, Loader2, Calculator, Users, MessageCircle, ClipboardList, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getServices, getEmployees, getServiceById, calculateServiceOrderTotal, parseAmount, BARCODE_INVITATIONS_KEY } from '@/lib/api';
import {
  type FormState,
  type FormServiceItem,
  type FormServiceItemOption,
  type ServicePackage,
  type ServiceAddon,
  type OrderFormErrors,
  createEmptyServiceItem,
  buildItemPayload,
  isInvitationDesignExpired,
  needsInvitationDesignUpload,
} from '@/lib/service-order-form';

import { ClientSection } from './client-section';
import { EventDetailsSection } from './event-details-section';
import { InvitationDesignSection } from './invitation-design-section';
import { ServiceItemRow } from './service-item-row';
import { PaymentSection } from './payment-section';

// Re-exported so existing component imports keep resolving from one place.
export type {
  FormState,
  FormServiceItem,
  FormServiceItemOption,
  ServicePackage,
  ServiceAddon,
};
export { createEmptyServiceItem };

interface OrderFormProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  /** True when editing an existing order — hides the create-only payment section. */
  editing: boolean;
  loading: boolean;
  errors?: OrderFormErrors;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  token: string;
}

export function OrderForm({
  form,
  setForm,
  editing,
  loading,
  errors = {},
  onCancel,
  onSubmit,
  token,
}: OrderFormProps) {
  const { t, dir, language } = useLanguage();

  // On create the earliest bookable day is tomorrow — same-day orders leave no
  // time to staff them. When editing, an order may legitimately sit in the past,
  // so the constraint is dropped.
  // Built from local date parts rather than `toISOString()`, which would shift
  // the day either side of midnight for any non-UTC timezone.
  const minDate = useMemo(() => {
    if (editing) return undefined;
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }, [editing]);

  const [dbServices, setDbServices] = useState<any[]>([]);
  const [dbEmployees, setDbEmployees] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  // Server-calculated total — authoritative once requested.
  const [calculatedTotal, setCalculatedTotal] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);

  // Fetch foundational database lists from APIs
  useEffect(() => {
    if (!token) return;
    setDbLoading(true);
    Promise.all([
      getServices({ page: 1, per_page: 100 }, token),
      getEmployees({ page: 1, per_page: 100 }, token)
    ])
      .then(([servicesRes, employeesRes]) => {
        setDbServices(servicesRes.data.items || []);
        setDbEmployees(employeesRes.data.items || []);
      })
      .catch(err => {
        toast.error((err as Error).message || 'فشل تحميل بيانات التأسيس');
      })
      .finally(() => {
        setDbLoading(false);
      });
  }, [token]);

  // Any change to the items invalidates a previously calculated total.
  useEffect(() => {
    setCalculatedTotal(null);
  }, [form.services]);

  const handleCalculateTotal = async () => {
    const items = form.services.filter(s => s.serviceId).map(buildItemPayload);
    if (items.length === 0) {
      toast.error(language === 'ar' ? 'اختر خدمة أولاً' : 'Select a service first');
      return;
    }
    setCalculating(true);
    try {
      const res = await calculateServiceOrderTotal(items, token);
      setCalculatedTotal(parseAmount(res.data?.total_amount));
    } catch (err) {
      toast.error((err as Error).message || (language === 'ar' ? 'فشل حساب الإجمالي' : 'Failed to calculate total'));
    } finally {
      setCalculating(false);
    }
  };

  // A service with no packages on the API genuinely has none — the row renders
  // its empty state rather than falling back to invented packages.
  const getServicePackagesAndAddons = (apiData: any) => ({
    packages: (apiData?.packages ?? []) as ServicePackage[],
    addons: (apiData?.addons ?? []) as ServiceAddon[],
  });

  const recalculateServicePrice = (item: FormServiceItem): string => {
    const selectedPackage = item.packages?.find(p => p.id === item.selectedPackageId);
    const basePrice = selectedPackage ? parseFloat(String(selectedPackage.price)) || 0 : 0;
    const addonsPrice = (item.selectedAddonIds || []).reduce((sum, id) => {
      const addon = item.addons?.find(a => a.id === id);
      const price = addon ? parseFloat(String(addon.price)) || 0 : 0;
      return sum + price;
    }, 0);
    return (basePrice + addonsPrice).toFixed(3);
  };

  const handlePackageSelect = (index: number, packageId: number) => {
    setForm(prev => {
      const copy = [...prev.services];
      if (copy[index]) {
        const pkg = copy[index].packages?.find(p => p.id === packageId);
        const updatedItem = {
          ...copy[index],
          selectedPackageId: packageId,
          // Surface the package's guest allowance in the UI immediately.
          guestsIncluded: pkg?.guests_included ?? null,
        };
        updatedItem.price = recalculateServicePrice(updatedItem);
        copy[index] = updatedItem;
      }
      return { ...prev, services: copy };
    });
  };

  const handleAddonToggle = (index: number, addonId: number) => {
    setForm(prev => {
      const copy = [...prev.services];
      if (copy[index]) {
        const prevAddons = copy[index].selectedAddonIds || [];
        const nextAddons = prevAddons.includes(addonId)
          ? prevAddons.filter(id => id !== addonId)
          : [...prevAddons, addonId];
        const updatedItem = {
          ...copy[index],
          selectedAddonIds: nextAddons,
        };
        updatedItem.price = recalculateServicePrice(updatedItem);
        copy[index] = updatedItem;
      }
      return { ...prev, services: copy };
    });
  };

  // Fetch options for selected service item
  const handleServiceSelect = async (index: number, service: any) => {
    // The dropdown already greys out taken services; this catches the case where
    // another row claimed it while this one was open.
    if (form.services.some((s, i) => i !== index && s.serviceId === String(service.id))) {
      toast.error(
        language === 'ar'
          ? 'هذه الخدمة مضافة بالفعل في هذا الطلب'
          : 'This service is already added to this order'
      );
      return;
    }

    const updatedServices = [...form.services];
    updatedServices[index] = {
      ...updatedServices[index],
      serviceId: String(service.id),
      serviceName: service.name,
      serviceNameAr: service.name,
      price: '0',
      options: [],
    };
    setForm({ ...form, services: updatedServices });

    try {
      const res = await getServiceById(service.id, token);
      const optionsData = res.data.options || [];

      const { packages, addons } = getServicePackagesAndAddons(res.data);
      const defaultPackage = packages[0];
      const defaultPrice = defaultPackage ? String(defaultPackage.price) : '0';

      const optionsState: FormServiceItemOption[] = optionsData.map(opt => {
        const optionName = language === 'ar'
          ? ((opt as any).name_ar || opt.name)
          : ((opt as any).name_en || opt.name);

        const availableChoices = (opt as any).labels || opt.values || [];

        return {
          service_option_id: opt.id,
          type: opt.type,
          name: optionName,
          is_required: opt.is_required,
          values: availableChoices,
          value: opt.type === 'number'
            ? ''
            : '',
          selectedEmployeeIds: [],
          selectedColorIds: undefined,
          labelValues: opt.type === 'list'
            ? availableChoices.map((l: any) => ({
              service_option_value_id: l.id,
              text_value: '',
            }))
            : undefined,
        };
      });

      setForm(prev => {
        const copy = [...prev.services];
        if (copy[index] && copy[index].serviceId === String(service.id)) {
          copy[index].options = optionsState;
          copy[index].packages = packages;
          copy[index].addons = addons;
          copy[index].selectedPackageId = defaultPackage?.id;
          copy[index].selectedAddonIds = [];
          copy[index].price = defaultPrice;
          copy[index].guestsIncluded = defaultPackage?.guests_included ?? null;
        }
        return { ...prev, services: copy };
      });
    } catch (err) {
      toast.error((err as Error).message || 'فشل جلب خيارات الخدمة');
    }
  };

  /**
   * Reachable only from data the dropdown never gated — an order saved before
   * duplicates were blocked, reopened for editing.
   */
  const hasDuplicateServices = useMemo(() => {
    const chosen = form.services.map(s => s.serviceId).filter(Boolean);
    return new Set(chosen).size !== chosen.length;
  }, [form.services]);

  /**
   * Every catalogue service is already on the order, so another row could only
   * ever stay empty.
   */
  const allServicesUsed = useMemo(() => {
    if (dbServices.length === 0) return false;
    const used = new Set(form.services.map(s => s.serviceId).filter(Boolean));
    return used.size >= dbServices.length;
  }, [dbServices, form.services]);

  const derivedTotalPrice = useMemo(() => {
    return form.services.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
  }, [form.services]);

  const quick = !editing && form.creationMode === 'quick';

  /**
   * Submit stays blocked until a valid, unexpired design token exists. Applies
   * when editing too: adding QR to an order that has no invitation yet needs a
   * design just as much as creating one from scratch does.
   */
  const missingInvitationDesign =
    needsInvitationDesignUpload(form)
    && (!form.invitationDesignToken || isInvitationDesignExpired(form));

  /**
   * True once the order includes the barcode/QR system service. The backend
   * creates the invitation automatically in that case, so we only surface it.
   */
  const includesBarcodeService = useMemo(() => {
    const barcodeIds = new Set(
      dbServices
        .filter(s => s.is_system && s.system_key === BARCODE_INVITATIONS_KEY)
        .map(s => String(s.id))
    );
    return form.services.some(s => barcodeIds.has(s.serviceId));
  }, [dbServices, form.services]);

  /**
   * Mirror the QR detection onto the form so validation and payload building can
   * see it. Dropping the service also discards any design already uploaded —
   * the backend rejects a token that arrives without the QR service.
   */
  useEffect(() => {
    setForm(prev => {
      if (prev.requiresInvitationDesign === includesBarcodeService) return prev;
      return includesBarcodeService
        ? { ...prev, requiresInvitationDesign: true }
        : {
            ...prev,
            requiresInvitationDesign: false,
            invitationDesignToken: '',
            invitationDesignPreviewUrl: '',
            invitationDesignExpiresAt: '',
          };
    });
  }, [includesBarcodeService, setForm]);

  if (dbLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10 max-w-4xl mx-auto text-start">
      {/* Back */}
      <button type="button" onClick={onCancel}
        className="flex items-center gap-2 text-secondary/60 hover:text-secondary transition-colors cursor-pointer group">
        {dir === 'ltr'
          ? <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          : <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
        <span className="font-medium">{t('back') || 'Back'}</span>
      </button>

      <div className="glass-panel rounded-3xl p-6 sm:p-8">
        <h2 className={cn('text-2xl font-medium text-secondary mb-6', dir === 'ltr' ? 'font-serif' : 'font-arabic')}>
          {editing ? t('editOrder') || 'Edit Order' : t('createOrder') || 'Create Order'}
        </h2>

        {/* Creation mode — create only; editing always shows the full form */}
        {!editing && (
          <div className="mb-6 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                {
                  mode: 'full' as const,
                  icon: ClipboardList,
                  title: t('modeFullTitle'),
                  desc: t('modeFullDesc'),
                },
                {
                  mode: 'quick' as const,
                  icon: MessageCircle,
                  title: t('modeQuickTitle'),
                  desc: t('modeQuickDesc'),
                },
              ]).map(option => {
                const Icon = option.icon;
                const selected = form.creationMode === option.mode;
                return (
                  <button
                    key={option.mode}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, creationMode: option.mode }))}
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-2xl border text-start transition-all cursor-pointer',
                      selected
                        ? 'bg-primary/5 border-primary/40 ring-2 ring-primary/15 shadow-sm'
                        : 'bg-white/50 border-secondary/15 hover:bg-white'
                    )}
                  >
                    <span className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                      selected ? 'bg-primary text-white' : 'bg-secondary/10 text-secondary/50'
                    )}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-secondary">{option.title}</span>
                      <span className="block text-xs text-secondary/55 mt-0.5">{option.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {quick && (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50 border border-amber-200/70">
                <MessageCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">{t('modeQuickNotice')}</p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Client data — embedded in the order, no separate clients module */}
          <ClientSection
            form={form}
            setForm={setForm}
            error={errors.client}
            altError={errors.client_alt_phone}
            quick={quick}
          />

          {/* Event Details Section */}
          <EventDetailsSection
            form={form}
            setForm={setForm}
            minDate={minDate}
            errors={errors}
            quick={quick}
          />

          {/* Order-level employees */}
          <div className="space-y-1.5 border-t border-secondary/10 pt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
              <Users className="w-4 h-4 text-secondary/40" />
              {language === 'ar' ? 'موظفو الطلب' : 'Order Employees'}
            </label>
            <p className="text-xs text-secondary/45">
              {language === 'ar'
                ? 'موظفون مسؤولون عن الطلب ككل، بالإضافة إلى موظفي كل خدمة.'
                : 'Responsible for the order as a whole, in addition to per-service employees.'}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {dbEmployees.map(emp => {
                const selected = form.orderEmployeeIds.includes(emp.id);
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => setForm(prev => ({
                      ...prev,
                      orderEmployeeIds: selected
                        ? prev.orderEmployeeIds.filter(id => id !== emp.id)
                        : [...prev.orderEmployeeIds, emp.id],
                    }))}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer',
                      selected
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white/50 text-secondary/70 border-secondary/15 hover:bg-white'
                    )}
                  >
                    {emp.name}
                  </button>
                );
              })}
              {dbEmployees.length === 0 && (
                <span className="text-xs text-secondary/40">
                  {language === 'ar' ? 'لا يوجد موظفون' : 'No employees available'}
                </span>
              )}
            </div>
          </div>

          {/* Dynamic Services List Section */}
          <div className="space-y-4 border-t border-secondary/10 pt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-secondary">{t('services') || 'Services'}</h3>
            </div>

            {form.services.map((svc, index) => (
              <ServiceItemRow
                key={svc.id}
                svc={svc}
                index={index}
                form={form}
                setForm={setForm}
                dbServices={dbServices}
                dbEmployees={dbEmployees}
                handleServiceSelect={handleServiceSelect}
                handlePackageSelect={handlePackageSelect}
                handleAddonToggle={handleAddonToggle}
              />
            ))}

            <button
              type="button"
              disabled={allServicesUsed}
              title={
                allServicesUsed
                  ? language === 'ar'
                    ? 'تمت إضافة جميع الخدمات المتاحة'
                    : 'All available services have been added'
                  : undefined
              }
              onClick={() => setForm({ ...form, services: [...form.services, createEmptyServiceItem()] })}
              className="w-full text-xs font-bold text-white bg-primary hover:bg-primary-dark flex items-center gap-1 justify-center py-2 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
            >
              <Plus className="w-4 h-4" />
              {t('addService') || 'Add Service'}
            </button>

            {errors.items && <p className="text-xs text-red-500">{errors.items}</p>}

            {/* The backend creates the invitation itself when this service is
                present — but it needs the design uploaded up front. */}
            {includesBarcodeService && (
              <>
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-primary/5 border border-primary/20">
                  <Ticket className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-secondary/70 leading-relaxed">{t('autoInvitationNotice')}</p>
                </div>
                {/* An order that already has an invitation already has a
                    design — it is changed from the invitation's own screen. */}
                {needsInvitationDesignUpload(form) && (
                  <InvitationDesignSection
                    form={form}
                    setForm={setForm}
                    token={token}
                    error={errors.invitation_design}
                  />
                )}
              </>
            )}
          </div>

          {/* Total readout — local estimate until confirmed against the server */}
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-secondary/70">{t('totalCostKd') || 'Total Price'}</span>
              <span className="text-lg font-bold text-primary">
                {(calculatedTotal ?? derivedTotalPrice).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}{' '}
                {language === 'ar' ? 'د.ك' : 'KD'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-secondary/45">
                {calculatedTotal !== null
                  ? (language === 'ar' ? 'محسوب من الخادم' : 'Calculated by the server')
                  : (language === 'ar' ? 'تقدير مبدئي' : 'Local estimate')}
              </span>
              {/* <button
                type="button"
                onClick={handleCalculateTotal}
                disabled={calculating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/70 hover:bg-white border border-primary/20 text-primary text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {calculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />}
                {language === 'ar' ? 'حساب الإجمالي' : 'Calculate Total'}
              </button> */}
            </div>
          </div>

          {/* Payment — create only; the update endpoint does not accept these fields */}
          {!editing && <PaymentSection form={form} setForm={setForm} />}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel}
              className="flex-1 py-3 text-sm font-medium text-secondary/70 bg-white/60 hover:bg-white border border-secondary/15 rounded-xl transition-colors cursor-pointer">
              {t('cancel') || 'Cancel'}
            </button>
            <button type="submit" disabled={loading || form.services.length === 0 || form.services.some(s => !s.serviceId) || hasDuplicateServices || missingInvitationDesign}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer shadow-md shadow-primary/20 hover:-translate-y-0.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {editing ? t('saveChanges') || 'Save Changes' : t('createSendLinks') || 'Create & Send Link'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
