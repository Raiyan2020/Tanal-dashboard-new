import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import {
  ChevronLeft, ChevronRight, User, Calendar, Clock, MapPin,
  Briefcase, DollarSign, Plus, Trash2, Send, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dropdown } from './dropdown';
import { toast } from 'sonner';
import {
  getClients,
  getServices,
  getEmployees,
  getServiceById
} from '@/lib/api';
import { type ServiceOrder } from '@/lib/orderStore';

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
}

export type FormState = {
  services: FormServiceItem[];
  description: string;
  date: string;
  time: string;
  hallName: string;
  hallLocation: string;
  paymentType: 'one-payment' | 'two-installments';
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
  price: '',
  description: '',
  options: [],
  employeeType: 'none',
});

const PRESET_COLORS = [
  { hex: '#4234F3', label: 'Classic Royal Blue' },
  { hex: '#D4AF37', label: 'Metallic Gold' },
  { hex: '#C0C0C0', label: 'Silver' },
  { hex: '#0F52BA', label: 'Sapphire' },
  { hex: '#50C878', label: 'Emerald' },
  { hex: '#E6A8D7', label: 'Orchid Pink' },
  { hex: '#1C1C1C', label: 'Charcoal Black' },
];

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

  // Fetch options for selected service item
  const handleServiceSelect = async (index: number, service: any) => {
    const updatedServices = [...form.services];
    updatedServices[index] = {
      ...updatedServices[index],
      serviceId: String(service.id),
      serviceName: service.name,
      serviceNameAr: service.name,
      price: '',
      options: [],
    };
    setForm({ ...form, services: updatedServices });

    try {
      const res = await getServiceById(service.id, token);
      const optionsData = res.data.options || [];

      const optionsState: FormServiceItemOption[] = optionsData.map(opt => {
        const optionName = language === 'ar'
          ? ((opt as any).name_ar || opt.name)
          : ((opt as any).name_en || opt.name);

        // Available choices — colors come in `values`, list choices come in `labels`
        const availableChoices = (opt as any).labels || opt.values || [];

        return {
          service_option_id: opt.id,
          type: opt.type,
          name: optionName,
          is_required: opt.is_required,
          values: availableChoices,
          // For color with no API palette, pre-fill a default hex so the picker isn't blank
          value: opt.type === 'number'
            ? ''
            : (opt.type === 'color' && availableChoices.length === 0)
              ? '#4234F3'
              : '',
          selectedEmployeeIds: [],
          selectedColorIds: opt.type === 'color' ? [] : undefined,
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
          {/* Client */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
              <User className="w-4 h-4 text-secondary/40" /> {t('selectClient') || 'Select Client'} <span className="text-red-500">*</span>
            </label>
            <Dropdown
              value={clientDropdownValue}
              placeholder={t('chooseClientPlaceholder') || 'Choose Client'}
              items={dbClients}
              filterFn={(c, q) => c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q)}
              label={c => c.name}
              sublabel={c => <span dir="ltr">{c.phone}</span>}
              onSelect={c => setForm({ ...form, clientId: String(c.id), clientName: c.name, clientPhone: c.phone })}
            />
            {!form.clientId && <p className="text-xs text-secondary/40 mt-0.5">{t('required') || 'Required'}</p>}
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
                <Calendar className="w-4 h-4 text-secondary/40" /> {t('eventDate') || 'Event Date'} <span className="text-red-500">*</span>
              </label>
              <input type="date" required min={tomorrow} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
                <Clock className="w-4 h-4 text-secondary/40" /> {t('eventTime') || 'Event Time'} <span className="text-red-500">*</span>
              </label>
              <input type="time" required value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm" />
            </div>
          </div>

          {/* Hall */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-secondary/80">{t('hallName') || 'Hall Name'} <span className="text-red-500">*</span></label>
            <input type="text" required placeholder={language === 'ar' ? 'فندق الفيصلية - قاعة الاحتفالات الكبرى' : 'Al Faisaliah Hotel – Grand Ballroom'} value={form.hallName}
              onChange={e => setForm({ ...form, hallName: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm" />
          </div>

          {/* Hall Location */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
              <MapPin className="w-4 h-4 text-secondary/40" /> {t('hallLocationLink') || 'Hall Location Map Link'}
            </label>
            <input type="url" placeholder="https://maps.google.com/…" value={form.hallLocation} dir="ltr"
              onChange={e => setForm({ ...form, hallLocation: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm font-mono text-left" />
          </div>

          {/* Dynamic Services List Section */}
          <div className="space-y-4 border-t border-secondary/10 pt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-secondary">{t('services') || 'Services'}</h3>
            </div>

            {form.services.map((svc, index) => {
              const svcDropdownValue = svc.serviceName ? svc.serviceName : '';

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
                    {t('service') || 'Service'} #{index + 1}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Select Service Dropdown */}
                    <div className="space-y-1.5 text-start">
                      <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
                        <Briefcase className="w-4 h-4 text-secondary/40" /> {t('selectService') || 'Select Service'} <span className="text-red-500">*</span>
                      </label>
                      <Dropdown
                        value={svcDropdownValue}
                        placeholder={t('chooseServicePlaceholder') || 'Choose Service'}
                        items={dbServices}
                        filterFn={(s, q) => s.name.toLowerCase().includes(q.toLowerCase())}
                        label={s => s.name}
                        sublabel={s => <span className="text-xs text-secondary/40">{s.description}</span>}
                        onSelect={s => handleServiceSelect(index, s)}
                      />
                    </div>

                    {/* Custom Price for this service */}
                    <div className="space-y-1.5 text-start">
                      <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
                        <DollarSign className="w-4 h-4 text-secondary/40" /> {t('price') || 'Price'} (KD) <span className="text-red-500">*</span>
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

                  {/* Dynamic Options UI rendering */}
                  {svc.options.length > 0 && (
                    <div className="space-y-3 p-4 bg-white/40 border border-secondary/10 rounded-xl mt-3 text-start">
                      <h4 className="text-xs font-bold text-secondary/60 uppercase tracking-wider">
                        {t('serviceOptions') || 'Service Options'}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {svc.options.map((opt, optIdx) => {
                          return (
                            <div key={opt.service_option_id} className="space-y-1">
                              <label className="text-xs font-semibold text-secondary/70">
                                {opt.name} {opt.is_required && <span className="text-red-500">*</span>}
                              </label>

                              {opt.type === 'text' && (
                                <input
                                  type="text"
                                  required={opt.is_required}
                                  value={opt.value || ''}
                                  onChange={e => {
                                    const copy = [...form.services];
                                    copy[index].options[optIdx].value = e.target.value;
                                    setForm({ ...form, services: copy });
                                  }}
                                  placeholder={language === 'ar' ? 'أدخل نصاً...' : 'Enter text...'}
                                  className="w-full px-3 py-2 text-xs rounded-lg bg-white/50 border border-secondary/20 focus:border-primary/50 outline-none text-secondary"
                                />
                              )}

                              {opt.type === 'number' && (
                                <input
                                  type="number"
                                  required={opt.is_required}
                                  value={opt.value !== undefined ? opt.value : ''}
                                  onChange={e => {
                                    const copy = [...form.services];
                                    copy[index].options[optIdx].value = Number(e.target.value);
                                    setForm({ ...form, services: copy });
                                  }}
                                  placeholder="0"
                                  className="w-full px-3 py-2 text-xs rounded-lg bg-white/50 border border-secondary/20 focus:border-primary/50 outline-none text-secondary"
                                />
                              )}

                              {opt.type === 'color' && (
                                <div className="space-y-1.5">
                                  {(opt.values || []).length > 0 ? (
                                    // API-provided palette — multi-select by swatch ID
                                    <>
                                      <div className="flex flex-wrap gap-2">
                                        {(opt.values || []).map((colorVal: any) => {
                                          const isSelected = (opt.selectedColorIds || []).includes(colorVal.id);
                                          return (
                                            <button
                                              key={colorVal.id}
                                              type="button"
                                              title={language === 'ar' ? colorVal.label_ar : colorVal.label_en}
                                              onClick={() => {
                                                const copy = [...form.services];
                                                const prev = copy[index].options[optIdx].selectedColorIds || [];
                                                copy[index].options[optIdx].selectedColorIds = isSelected
                                                  ? prev.filter(id => id !== colorVal.id)
                                                  : [...prev, colorVal.id];
                                                setForm({ ...form, services: copy });
                                              }}
                                              style={{ backgroundColor: colorVal.color_hex }}
                                              className={cn(
                                                'w-7 h-7 rounded-full border-2 transition-all cursor-pointer shadow-sm hover:scale-110',
                                                isSelected
                                                  ? 'border-primary ring-2 ring-primary ring-offset-1 scale-110'
                                                  : 'border-white/70'
                                              )}
                                            />
                                          );
                                        })}
                                      </div>
                                      {(opt.selectedColorIds || []).length > 0 && (
                                        <p className="text-[10px] text-secondary/50">
                                          {(opt.selectedColorIds || []).length}{' '}
                                          {language === 'ar' ? 'لون محدد' : 'color(s) selected'}
                                        </p>
                                      )}
                                    </>
                                  ) : (
                                    // No predefined palette — free-form hex picker
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="color"
                                          value={opt.value || '#4234F3'}
                                          onChange={e => {
                                            const copy = [...form.services];
                                            copy[index].options[optIdx].value = e.target.value;
                                            setForm({ ...form, services: copy });
                                          }}
                                          className="w-8 h-8 rounded-lg cursor-pointer p-0.5 border border-secondary/25 transition-transform hover:scale-105"
                                        />
                                        <span className="text-[11px] font-mono text-secondary/60">
                                          {(opt.value || '#4234F3').toUpperCase()}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {PRESET_COLORS.map(c => (
                                          <button
                                            key={c.hex}
                                            type="button"
                                            title={c.label}
                                            onClick={() => {
                                              const copy = [...form.services];
                                              copy[index].options[optIdx].value = c.hex;
                                              setForm({ ...form, services: copy });
                                            }}
                                            style={{ backgroundColor: c.hex }}
                                            className={cn(
                                              'w-5 h-5 rounded-full border border-white/60 transition-transform hover:scale-110 cursor-pointer shadow-sm',
                                              opt.value === c.hex ? 'ring-2 ring-primary ring-offset-1' : ''
                                            )}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {opt.type === 'list' && (
                                <select
                                  required={opt.is_required}
                                  value={opt.value || ''}
                                  onChange={e => {
                                    const copy = [...form.services];
                                    copy[index].options[optIdx].value = e.target.value ? Number(e.target.value) : '';
                                    setForm({ ...form, services: copy });
                                  }}
                                  className="w-full px-3 py-2 text-xs rounded-lg bg-white/50 border border-secondary/20 focus:border-primary/50 outline-none text-secondary cursor-pointer"
                                >
                                  <option value="">{t('selectChoice') || 'Select choice...'}</option>
                                  {(opt.values || []).map((label: any) => {
                                    const labelText = language === 'ar' ? label.label_ar : label.label_en;
                                    return (
                                      <option key={label.id} value={label.id}>
                                        {labelText}
                                      </option>
                                    );
                                  })}
                                </select>
                              )}

                              {opt.type === 'employee' && (
                                <div className="space-y-2">
                                  <div className="flex flex-wrap gap-1.5 min-h-[36px] p-1.5 bg-white/30 border border-secondary/15 rounded-lg">
                                    {(opt.selectedEmployeeIds || []).length > 0 ? (
                                      (opt.selectedEmployeeIds || []).map(empId => {
                                        const emp = dbEmployees.find(e => e.id === empId);
                                        return (
                                          <span key={empId} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-lg">
                                            {emp?.name || empId}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const copy = [...form.services];
                                                const prevIds = opt.selectedEmployeeIds || [];
                                                copy[index].options[optIdx].selectedEmployeeIds = prevIds.filter(id => id !== empId);
                                                setForm({ ...form, services: copy });
                                              }}
                                              className="hover:text-primary-dark font-normal ml-0.5 cursor-pointer text-xs"
                                            >
                                              &times;
                                            </button>
                                          </span>
                                        );
                                      })
                                    ) : (
                                      <span className="text-xs text-secondary/40 px-2 py-1">
                                        {t('noEmployeesSelected') || 'No employees selected'}
                                      </span>
                                    )}
                                  </div>
                                  <select
                                    value=""
                                    onChange={e => {
                                      if (!e.target.value) return;
                                      const selectedId = Number(e.target.value);
                                      const copy = [...form.services];
                                      const prevIds = opt.selectedEmployeeIds || [];
                                      if (!prevIds.includes(selectedId)) {
                                        copy[index].options[optIdx].selectedEmployeeIds = [...prevIds, selectedId];
                                        setForm({ ...form, services: copy });
                                      }
                                    }}
                                    className="w-full px-3 py-2 text-xs rounded-lg bg-white/50 border border-secondary/20 focus:border-primary/50 outline-none text-secondary cursor-pointer"
                                  >
                                    <option value="">{t('selectEmployeeToAdd') || 'Select employee to add...'}</option>
                                    {dbEmployees.map(emp => (
                                      <option key={emp.id} value={emp.id} disabled={(opt.selectedEmployeeIds || []).includes(emp.id)}>
                                        {emp.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Responsible Employee Configuration */}
                  <div className="space-y-3 pt-3 border-t border-secondary/10">
                    <label className="flex items-center gap-2 text-xs font-semibold text-secondary/70">
                      <User className="w-4 h-4 text-secondary/40" /> {t('responsibleEmployee') || 'Responsible Employee'}
                    </label>

                    <div className="flex bg-secondary/5 rounded-xl p-0.5 gap-0.5 max-w-xs">
                      {([
                        { id: 'none', label: t('unassigned') || 'Unassigned' },
                        { id: 'employee', label: t('existingStaff') || 'Existing Staff' },
                        { id: 'freelancer', label: t('freelancer') || 'Freelancer' }
                      ] as const).map(mode => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => {
                            const copy = [...form.services];
                            copy[index] = {
                              ...copy[index],
                              employeeType: mode.id,
                              employeeId: undefined,
                              freelancerUsername: '',
                              freelancerCountryCode: '+965',
                              freelancerPhone: ''
                            };
                            setForm({ ...form, services: copy });
                          }}
                          className={cn('flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap',
                            svc.employeeType === mode.id ? 'bg-white text-secondary shadow-sm' : 'text-secondary/50 hover:text-secondary')}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>

                    {svc.employeeType === 'employee' && (
                      <Dropdown
                        value={dbEmployees.find(e => e.id === svc.employeeId)?.name || ''}
                        placeholder={t('chooseEmployeePlaceholder') || 'Choose Employee'}
                        items={dbEmployees}
                        filterFn={(e, q) => e.name.toLowerCase().includes(q.toLowerCase()) || e.phone.includes(q)}
                        label={e => e.name}
                        sublabel={e => <span dir="ltr">{e.phone}</span>}
                        onSelect={e => {
                          const copy = [...form.services];
                          copy[index].employeeId = e.id;
                          setForm({ ...form, services: copy });
                        }}
                      />
                    )}

                    {svc.employeeType === 'freelancer' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-secondary/50 font-bold block mb-1 uppercase">{t('username') || 'Username'}</label>
                          <input
                            type="text"
                            required
                            placeholder="ali_photo32"
                            value={svc.freelancerUsername || ''}
                            onChange={e => {
                              const copy = [...form.services];
                              copy[index].freelancerUsername = e.target.value;
                              setForm({ ...form, services: copy });
                            }}
                            className="w-full px-3 py-2 text-xs rounded-lg bg-white/50 border border-secondary/20 focus:border-primary/50 outline-none text-secondary"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-secondary/50 font-bold block mb-1 uppercase">{t('countryCode') || 'Country Code'}</label>
                          <input
                            type="text"
                            required
                            placeholder="+965"
                            value={svc.freelancerCountryCode || '+965'}
                            onChange={e => {
                              const copy = [...form.services];
                              copy[index].freelancerCountryCode = e.target.value;
                              setForm({ ...form, services: copy });
                            }}
                            className="w-full px-3 py-2 text-xs rounded-lg bg-white/50 border border-secondary/20 focus:border-primary/50 outline-none text-secondary"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-secondary/50 font-bold block mb-1 uppercase">{t('phoneNumber') || 'Phone Number'}</label>
                          <input
                            type="tel"
                            required
                            placeholder="51112233"
                            value={svc.freelancerPhone || ''}
                            onChange={e => {
                              const copy = [...form.services];
                              copy[index].freelancerPhone = e.target.value;
                              setForm({ ...form, services: copy });
                            }}
                            className="w-full px-3 py-2 text-xs rounded-lg bg-white/50 border border-secondary/20 focus:border-primary/50 outline-none text-secondary"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Per-service description */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-sm font-medium text-secondary/80">
                      {t('otherDetails') || 'Other Details'} <span className="text-xs text-secondary/40">({t('optional') || 'Optional'})</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder={t('detailsPlaceholder') || 'Details...'}
                      value={svc.description}
                      onChange={e => {
                        const copy = [...form.services];
                        copy[index].description = e.target.value;
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

          {/* Is Paid */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" checked={form.isPaid} onChange={e => setForm({ ...form, isPaid: e.target.checked })}
              className="w-5 h-5 rounded text-primary border-secondary/20 focus:ring-primary cursor-pointer" />
            <span className="text-sm font-medium text-secondary/80 group-hover:text-secondary transition-colors">{t('isPaidQuestion') || 'Is this order paid?'}</span>
          </label>

          {/* Payment Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary/80">{t('paymentType') || 'Payment Type'}</label>
            <div className="flex gap-6">
              {(['one-payment', 'two-installments'] as const).map(pt => (
                <label key={pt} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="radio" name="paymentType" value={pt}
                    checked={form.paymentType === pt}
                    onChange={() => setForm({ ...form, paymentType: pt })}
                    className="w-4 h-4 text-primary border-secondary/20 focus:ring-primary cursor-pointer" />
                  <span className="text-sm text-secondary/80">{pt === 'one-payment' ? t('onePayment') || 'Full Payment' : t('twoInstallments') || 'Two Installments'}</span>
                </label>
              ))}
            </div>
          </div>

          {form.paymentType === 'two-installments' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-secondary/80">
                {t('firstInstallmentAmount') || 'First Installment Amount'} ({language === 'ar' ? 'د.ك' : 'KD'}) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.firstInstallmentAmount}
                onChange={e => setForm({ ...form, firstInstallmentAmount: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm"
              />
            </div>
          )}

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
