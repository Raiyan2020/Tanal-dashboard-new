import React from 'react';
import { Briefcase, DollarSign, Plus, Trash2, User } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Dropdown } from './dropdown';
import { ServiceOptionRenderer } from './service-option-renderer';
import { type FormState, type FormServiceItem } from './order-form';

interface ServiceItemRowProps {
  svc: FormServiceItem;
  index: number;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  dbServices: any[];
  dbEmployees: any[];
  handleServiceSelect: (index: number, service: any) => Promise<void>;
  handlePackageSelect: (index: number, packageId: number) => void;
  handleAddonToggle: (index: number, addonId: number) => void;
}

export function ServiceItemRow({
  svc,
  index,
  form,
  setForm,
  dbServices,
  dbEmployees,
  handleServiceSelect,
  handlePackageSelect,
  handleAddonToggle,
}: ServiceItemRowProps) {
  const { t, dir, language } = useLanguage();

  const svcDropdownValue = svc.serviceName ? svc.serviceName : '';

  return (
    <div className="p-5 bg-secondary/5 rounded-2xl border border-secondary/10 relative space-y-4">
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

        {/* Select Package Dropdown */}
        {svc.packages && svc.packages.length > 0 ? (
          <div className="space-y-1.5 text-start">
            <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
              <Briefcase className="w-4 h-4 text-secondary/40" /> {language === 'ar' ? 'الباقة' : 'Package'} <span className="text-red-500">*</span>
            </label>
            <select
              value={svc.selectedPackageId || ''}
              onChange={e => handlePackageSelect(index, Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm cursor-pointer"
            >
              {svc.packages.map(p => {
                const packageName = language === 'ar' ? p.name_ar : p.name_en;
                return (
                  <option key={p.id} value={p.id}>
                    {packageName} ({p.price} {language === 'ar' ? 'د.ك' : 'KD'})
                  </option>
                );
              })}
            </select>
          </div>
        ) : (
          /* Fallback placeholder if no packages have been loaded yet */
          <div className="space-y-1.5 text-start opacity-50">
            <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
              <Briefcase className="w-4 h-4 text-secondary/40" /> {language === 'ar' ? 'الباقة' : 'Package'}
            </label>
            <div className="w-full px-4 py-3 rounded-xl bg-secondary/5 border border-secondary/10 text-secondary/50 text-sm">
              {language === 'ar' ? 'يرجى اختيار الخدمة أولاً' : 'Select a service first'}
            </div>
          </div>
        )}
      </div>

      {/* Calculated Price & Add-ons Grid */}
      {svc.serviceId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Calculated Price */}
          <div className="space-y-1.5 text-start">
            <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
              <DollarSign className="w-4 h-4 text-secondary/40" /> {t('price') || 'Price'} (KD)
            </label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={svc.price || '0.000'}
                dir="ltr"
                className={cn(
                  "w-full py-3 rounded-xl bg-secondary/5 border border-secondary/10 outline-none text-secondary font-bold text-sm cursor-not-allowed",
                  dir === 'rtl' ? 'pr-14 pl-4' : 'pl-14 pr-4'
                )}
              />
              <span className={cn("absolute top-1/2 -translate-y-1/2 text-sm font-semibold text-secondary/40 pointer-events-none", dir === 'rtl' ? 'right-4' : 'left-4')}>
                {language === 'ar' ? 'د.ك' : 'KD'}
              </span>
            </div>
          </div>

          {/* Add-ons Multi-Select Badges */}
          {svc.addons && svc.addons.length > 0 && (
            <div className="space-y-1.5 text-start">
              <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
                {language === 'ar' ? 'الاضافات الاختيارية (Add-ons)' : 'Optional Add-ons'}
              </label>
              <div className="flex flex-wrap gap-1.5 p-1.5 bg-white/30 border border-secondary/15 rounded-xl min-h-[46px]">
                {svc.addons.map(addon => {
                  const isSelected = (svc.selectedAddonIds || []).includes(addon.id);
                  const addonName = language === 'ar' ? addon.name_ar : addon.name_en;
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => handleAddonToggle(index, addon.id)}
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer",
                        isSelected
                          ? "bg-primary/10 border-primary/20 text-primary"
                          : "bg-white/50 border-secondary/10 text-secondary/50 hover:bg-white"
                      )}
                    >
                      {addonName} (+{addon.price} KD)
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Options UI rendering */}
      {svc.options.length > 0 && (
        <div className="space-y-3 p-4 bg-white/40 border border-secondary/10 rounded-xl mt-3 text-start">
          <h4 className="text-xs font-bold text-secondary/60 uppercase tracking-wider">
            {t('serviceOptions') || 'Service Options'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {svc.options.map((opt, optIdx) => (
              <ServiceOptionRenderer
                key={opt.service_option_id}
                opt={opt}
                optIdx={optIdx}
                index={index}
                form={form}
                setForm={setForm}
                dbEmployees={dbEmployees}
              />
            ))}
          </div>
        </div>
      )}

      {/* Responsible Employee */}
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
}
