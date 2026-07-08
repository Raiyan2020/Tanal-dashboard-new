import React from 'react';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { type FormState, type FormServiceItemOption } from './order-form';

const PRESET_COLORS = [
  { hex: '#4234F3', label: 'Classic Royal Blue' },
  { hex: '#D4AF37', label: 'Metallic Gold' },
  { hex: '#C0C0C0', label: 'Silver' },
  { hex: '#0F52BA', label: 'Sapphire' },
  { hex: '#50C878', label: 'Emerald' },
  { hex: '#E6A8D7', label: 'Orchid Pink' },
  { hex: '#1C1C1C', label: 'Charcoal Black' },
];

interface ServiceOptionRendererProps {
  opt: FormServiceItemOption;
  optIdx: number;
  index: number;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  dbEmployees: any[];
}

export function ServiceOptionRenderer({
  opt,
  optIdx,
  index,
  form,
  setForm,
  dbEmployees,
}: ServiceOptionRendererProps) {
  const { t, language } = useLanguage();

  return (
    <div className="space-y-1">
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
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={opt.value || '#000000'}
              onChange={e => {
                const copy = [...form.services];
                copy[index].options[optIdx].value = e.target.value;
                setForm({ ...form, services: copy });
              }}
              className="w-40 h-10 rounded-lg cursor-pointer p-0.5 border border-secondary/25 transition-transform hover:scale-105"
            />
            <span className="text-[11px] font-mono text-secondary/60">
              {(opt.value || '#000000').toUpperCase()}
            </span>
          </div>

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
              <option
                key={emp.id}
                value={emp.id}
                disabled={(opt.selectedEmployeeIds || []).includes(emp.id)}
              >
                {emp.name}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1.5 min-h-[36px] p-1.5 bg-white/30 border border-secondary/15 rounded-lg">
            {(opt.selectedEmployeeIds || []).length > 0 ? (
              (opt.selectedEmployeeIds || []).map(empId => {
                const emp = dbEmployees.find(e => e.id === empId);
                return (
                  <span
                    key={empId}
                    className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-lg"
                  >
                    {emp?.name || empId}
                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...form.services];
                        const prevIds = opt.selectedEmployeeIds || [];
                        copy[index].options[optIdx].selectedEmployeeIds = prevIds.filter(
                          id => id !== empId
                        );
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

        </div>
      )}
    </div>
  );
}
