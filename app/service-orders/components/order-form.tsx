import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Plus, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getClients, getServices, getEmployees, getServiceById } from '@/lib/api';
import { type ServiceOrder } from '@/lib/orderStore';
import { getMockDataForService } from '@/lib/mockServicesStore';

import { ClientSection } from './client-section';
import { EventDetailsSection } from './event-details-section';
import { ServiceItemRow } from './service-item-row';
import { PaymentSection } from './payment-section';

export interface ServicePackage {
  id: number;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  price: number | string;
}

export interface ServiceAddon {
  id: number;
  name_ar: string;
  name_en: string;
  price: number | string;
}

export interface FormServiceItemOption {
  service_option_id: number;
  type: string; // text, number, list, employee, color
  name: string; // label
  is_required: boolean;
  values?: any[];                  // available choices from API (colors / labels)
  value?: any;                     // selected value for text / number
  selectedEmployeeIds?: number[];  // employee type — selected employee IDs
  selectedColorIds?: number[];     // color type — selected color value IDs from API
  labelValues?: { service_option_value_id: number; text_value: string }[]; // list type
}

export interface FormServiceItem {
  id: string; // local temp key
  serviceId: string;
  serviceName: string;
  serviceNameAr: string;
  price: string;
  description: string;
  options: FormServiceItemOption[];
  employeeType: 'employee' | 'freelancer' | 'none';
  employeeId?: number;
  freelancerUsername?: string;
  freelancerCountryCode?: string;
  freelancerPhone?: string;
  selectedPackageId?: number;
  selectedAddonIds?: number[];
  packages?: ServicePackage[];
  addons?: ServiceAddon[];
}

export type FormState = {
  services: FormServiceItem[];
  description: string;
  date: string;
  time: string;
  hallName: string;
  hallLocation: string;
  paymentType: 'single' | 'two_installments';
  firstInstallmentAmount: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  isPaid: boolean;
};

export const createEmptyServiceItem = (): FormServiceItem => ({
  id: Math.random().toString(),
  serviceId: '',
  serviceName: '',
  serviceNameAr: '',
  price: '0',
  description: '',
  options: [],
  employeeType: 'none',
  selectedAddonIds: [],
  packages: [],
  addons: [],
});

interface OrderFormProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  editing: ServiceOrder | null;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  token: string;
}

export function OrderForm({
  form,
  setForm,
  editing,
  loading,
  onCancel,
  onSubmit,
  token,
}: OrderFormProps) {
  const { t, dir, language } = useLanguage();
  const clientDropdownValue = form.clientName ? `${form.clientName}` : '';

  // Compute tomorrow's date in YYYY-MM-DD format for the date input min constraint
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const [dbClients, setDbClients] = useState<any[]>([]);
  const [dbServices, setDbServices] = useState<any[]>([]);
  const [dbEmployees, setDbEmployees] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  // Fetch foundational database lists from APIs
  useEffect(() => {
    if (!token) return;
    setDbLoading(true);
    Promise.all([
      getClients(token, { page: 1, per_page: 100 }),
      getServices({ page: 1, per_page: 100 }, token),
      getEmployees({ page: 1, per_page: 100 }, token)
    ])
      .then(([clientsRes, servicesRes, employeesRes]) => {
        setDbClients(clientsRes.data.items || []);
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

  const getServicePackagesAndAddons = (serviceId: number, apiData: any) => {
    if (apiData?.packages && apiData.packages.length > 0) {
      return {
        packages: apiData.packages as ServicePackage[],
        addons: apiData.addons as ServiceAddon[]
      };
    }
    // Fetch from shared mock store
    return getMockDataForService(serviceId);
  };

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
        const updatedItem = {
          ...copy[index],
          selectedPackageId: packageId,
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

      const { packages, addons } = getServicePackagesAndAddons(Number(service.id), res.data);
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
        }
        return { ...prev, services: copy };
      });
    } catch (err) {
      toast.error((err as Error).message || 'فشل جلب خيارات الخدمة');
    }
  };

  const derivedTotalPrice = useMemo(() => {
    return form.services.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
  }, [form.services]);

  if (dbLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10 max-w-2xl mx-auto text-start">
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

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Client Selection Section */}
          <ClientSection
            form={form}
            setForm={setForm}
            dbClients={dbClients}
            clientDropdownValue={clientDropdownValue}
          />

          {/* Event Details Section */}
          <EventDetailsSection
            form={form}
            setForm={setForm}
            tomorrow={tomorrow}
          />

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
              onClick={() => setForm({ ...form, services: [...form.services, createEmptyServiceItem()] })}
              className="w-full text-xs font-bold text-white bg-primary hover:bg-primary-dark flex items-center gap-1 justify-center py-2 rounded cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t('addService') || 'Add Service'}
            </button>
          </div>

          {/* Total readout */}
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex justify-between items-center">
            <span className="text-sm font-medium text-secondary/70">{t('totalCostKd') || 'Total Price'}</span>
            <span className="text-lg font-bold text-primary">
              {derivedTotalPrice.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}{' '}
              {language === 'ar' ? 'د.ك' : 'KD'}
            </span>
          </div>

          {/* Payment Section */}
          <PaymentSection
            form={form}
            setForm={setForm}
          />

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel}
              className="flex-1 py-3 text-sm font-medium text-secondary/70 bg-white/60 hover:bg-white border border-secondary/15 rounded-xl transition-colors cursor-pointer">
              {t('cancel') || 'Cancel'}
            </button>
            <button type="submit" disabled={loading || form.services.length === 0 || form.services.some(s => !s.serviceId || !s.price) || !form.clientId}
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
