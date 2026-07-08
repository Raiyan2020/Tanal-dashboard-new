import React from 'react';
import { User } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { Dropdown } from './dropdown';
import { type FormState } from './order-form';

interface ClientSectionProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  dbClients: any[];
  clientDropdownValue: string;
}

export function ClientSection({
  form,
  setForm,
  dbClients,
  clientDropdownValue,
}: ClientSectionProps) {
  const { t } = useLanguage();

  return (
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
  );
}
