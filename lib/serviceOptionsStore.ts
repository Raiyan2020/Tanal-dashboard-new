// ── Tanal Service Options Store ──
// Manages option definitions for each service (e.g. "number of guests", "dress color")
// and the select-value lists for select-type options.

export type OptionType = 'text' | 'select' | 'number' | 'color' | 'employee';

export interface ServiceOption {
  id: string;
  serviceId: string;        // which service this belongs to
  nameEn: string;
  nameAr: string;
  type: OptionType;
  required: boolean;
  order: number;            // display order
}

export interface ServiceOptionSelectValue {
  id: string;
  optionId: string;
  labelEn: string;
  labelAr: string;
}

// Stored per order-service item
export interface OrderOptionValue {
  optionId: string;
  value: string; // text/number as string; for select: value id; for color: hex/label; for employee: name
}

// ── Storage keys ──────────────────────────────────────────────────────────────

const OPTIONS_KEY = 'tanal_service_options_v1';
const VALUES_KEY  = 'tanal_service_option_values_v2';

// ── Pre-seeded data ───────────────────────────────────────────────────────────
// Aligned with the 5 real Tanal services:
//   ps1 = Photobooth (الفوتوبوث)
//   ps2 = Barcode (الباركود)
//   ps3 = Photography Cover (كفرات منع التصوير)
//   ps4 = Coat Hanging (تعليق العبايات والمعاطف)
//   ps5 = Welcoming Service (التهليل والترحيب)

const SEED_OPTIONS: ServiceOption[] = [
  // ── Photobooth ──
  { id: 'opt-ps1-1', serviceId: 'ps1', nameEn: 'Number of Photos Package', nameAr: 'باقة عدد الصور', type: 'select',   required: true,  order: 1 },
  { id: 'opt-ps1-2', serviceId: 'ps1', nameEn: 'Delivery Employee',        nameAr: 'موظف التوصيل',  type: 'employee', required: true,  order: 2 },
  { id: 'opt-ps1-3', serviceId: 'ps1', nameEn: 'Service Employee',         nameAr: 'موظف الخدمة',   type: 'employee', required: false, order: 3 },
  { id: 'opt-ps1-4', serviceId: 'ps1', nameEn: 'Device Type',              nameAr: 'نوع الجهاز',    type: 'select',   required: true,  order: 4 },
  { id: 'opt-ps1-5', serviceId: 'ps1', nameEn: 'Notes',                    nameAr: 'ملاحظات',       type: 'text',     required: false, order: 5 },

  // ── Barcode ──
  { id: 'opt-ps2-1', serviceId: 'ps2', nameEn: 'Number of Guests Package', nameAr: 'باقة عدد الضيوف', type: 'select',   required: true,  order: 1 },
  { id: 'opt-ps2-2', serviceId: 'ps2', nameEn: 'Service Employee(s)',      nameAr: 'موظف الخدمة',     type: 'employee', required: true,  order: 2 },
  { id: 'opt-ps2-3', serviceId: 'ps2', nameEn: 'Delivery Employee',        nameAr: 'موظف التوصيل',    type: 'employee', required: false, order: 3 },
  { id: 'opt-ps2-4', serviceId: 'ps2', nameEn: 'Notes',                    nameAr: 'ملاحظات',         type: 'text',     required: false, order: 4 },

  // ── Photography Cover (كفرات منع التصوير) ──
  { id: 'opt-ps3-1', serviceId: 'ps3', nameEn: 'Number of Guests Package', nameAr: 'باقة عدد الضيوف', type: 'select',   required: true,  order: 1 },
  { id: 'opt-ps3-2', serviceId: 'ps3', nameEn: 'Service Employee(s)',      nameAr: 'موظف الخدمة',     type: 'employee', required: true,  order: 2 },
  { id: 'opt-ps3-3', serviceId: 'ps3', nameEn: 'Delivery Employee',        nameAr: 'موظف التوصيل',    type: 'employee', required: true,  order: 3 },
  { id: 'opt-ps3-4', serviceId: 'ps3', nameEn: 'Cover Color',              nameAr: 'لون الكفر',       type: 'color',    required: true,  order: 4 },
  { id: 'opt-ps3-5', serviceId: 'ps3', nameEn: 'Notes',                    nameAr: 'ملاحظات',         type: 'text',     required: false, order: 5 },

  // ── Coat & Abaya Hanging (تعليق العبايات والمعاطف) ──
  { id: 'opt-ps4-1', serviceId: 'ps4', nameEn: 'Number of Guests Package', nameAr: 'باقة عدد الضيوف', type: 'select',   required: true,  order: 1 },
  { id: 'opt-ps4-2', serviceId: 'ps4', nameEn: 'Service Employee(s)',      nameAr: 'موظف الخدمة',     type: 'employee', required: true,  order: 2 },
  { id: 'opt-ps4-3', serviceId: 'ps4', nameEn: 'Delivery Employee',        nameAr: 'موظف التوصيل',    type: 'employee', required: true,  order: 3 },
  { id: 'opt-ps4-4', serviceId: 'ps4', nameEn: 'Stand Color',              nameAr: 'لون الستاند',     type: 'color',    required: true,  order: 4 },
  { id: 'opt-ps4-5', serviceId: 'ps4', nameEn: 'Notes',                    nameAr: 'ملاحظات',         type: 'text',     required: false, order: 5 },

  // ── Welcoming Service (التهليل والترحيب) ──
  { id: 'opt-ps5-1', serviceId: 'ps5', nameEn: 'Number of Staff Required', nameAr: 'عدد الموظفات المطلوب', type: 'select',   required: true,  order: 1 },
  { id: 'opt-ps5-2', serviceId: 'ps5', nameEn: 'Service Employee(s)',      nameAr: 'موظف الخدمة',          type: 'employee', required: true,  order: 2 },
  { id: 'opt-ps5-3', serviceId: 'ps5', nameEn: 'Dress Model / Color',      nameAr: 'نموذج الثوب',          type: 'color',    required: true,  order: 3 },
  { id: 'opt-ps5-4', serviceId: 'ps5', nameEn: 'Notes',                    nameAr: 'ملاحظات',              type: 'text',     required: false, order: 4 },
];

const SEED_SELECT_VALUES: ServiceOptionSelectValue[] = [
  // Photobooth — Number of Photos
  { id: 'sv-ps1-1-1', optionId: 'opt-ps1-1', labelEn: '50 Photos',        labelAr: '50 صورة' },
  { id: 'sv-ps1-1-2', optionId: 'opt-ps1-1', labelEn: '100 Photos',       labelAr: '100 صورة' },
  { id: 'sv-ps1-1-3', optionId: 'opt-ps1-1', labelEn: '200 Photos',       labelAr: '200 صورة' },
  { id: 'sv-ps1-1-4', optionId: 'opt-ps1-1', labelEn: 'Unlimited Photos', labelAr: 'صور غير محدودة' },

  // Photobooth — Device Type
  { id: 'sv-ps1-4-1', optionId: 'opt-ps1-4', labelEn: 'Device 1', labelAr: 'جهاز أول' },
  { id: 'sv-ps1-4-2', optionId: 'opt-ps1-4', labelEn: 'Device 2', labelAr: 'جهاز ثاني' },
  { id: 'sv-ps1-4-3', optionId: 'opt-ps1-4', labelEn: 'Device 3', labelAr: 'جهاز ثالث' },

  // Barcode — Number of Guests
  { id: 'sv-ps2-1-1', optionId: 'opt-ps2-1', labelEn: 'Up to 100 guests',  labelAr: 'حتى 100 ضيف' },
  { id: 'sv-ps2-1-2', optionId: 'opt-ps2-1', labelEn: 'Up to 200 guests',  labelAr: 'حتى 200 ضيف' },
  { id: 'sv-ps2-1-3', optionId: 'opt-ps2-1', labelEn: 'Up to 500 guests',  labelAr: 'حتى 500 ضيف' },
  { id: 'sv-ps2-1-4', optionId: 'opt-ps2-1', labelEn: 'Up to 1000 guests', labelAr: 'حتى 1000 ضيف' },

  // Photography Cover — Guests
  { id: 'sv-ps3-1-1', optionId: 'opt-ps3-1', labelEn: 'Up to 50 guests',  labelAr: 'حتى 50 ضيف' },
  { id: 'sv-ps3-1-2', optionId: 'opt-ps3-1', labelEn: 'Up to 100 guests', labelAr: 'حتى 100 ضيف' },
  { id: 'sv-ps3-1-3', optionId: 'opt-ps3-1', labelEn: 'Up to 200 guests', labelAr: 'حتى 200 ضيف' },

  // Photography Cover — Colors
  { id: 'sv-ps3-4-1', optionId: 'opt-ps3-4', labelEn: '#ffffff', labelAr: 'أبيض' },
  { id: 'sv-ps3-4-2', optionId: 'opt-ps3-4', labelEn: '#000000', labelAr: 'أسود' },
  { id: 'sv-ps3-4-3', optionId: 'opt-ps3-4', labelEn: '#f5f0e8', labelAr: 'بيج' },
  { id: 'sv-ps3-4-4', optionId: 'opt-ps3-4', labelEn: '#d4af37', labelAr: 'ذهبي' },
  { id: 'sv-ps3-4-5', optionId: 'opt-ps3-4', labelEn: '#c0c0c0', labelAr: 'فضي' },

  // Coat Hanging — Guests
  { id: 'sv-ps4-1-1', optionId: 'opt-ps4-1', labelEn: 'Up to 50 guests',  labelAr: 'حتى 50 ضيف' },
  { id: 'sv-ps4-1-2', optionId: 'opt-ps4-1', labelEn: 'Up to 100 guests', labelAr: 'حتى 100 ضيف' },
  { id: 'sv-ps4-1-3', optionId: 'opt-ps4-1', labelEn: 'Up to 200 guests', labelAr: 'حتى 200 ضيف' },

  // Coat Hanging — Stand Colors
  { id: 'sv-ps4-4-1', optionId: 'opt-ps4-4', labelEn: '#000000', labelAr: 'أسود' },
  { id: 'sv-ps4-4-2', optionId: 'opt-ps4-4', labelEn: '#ffffff', labelAr: 'أبيض' },
  { id: 'sv-ps4-4-3', optionId: 'opt-ps4-4', labelEn: '#d4af37', labelAr: 'ذهبي' },
  { id: 'sv-ps4-4-4', optionId: 'opt-ps4-4', labelEn: '#c0c0c0', labelAr: 'فضي' },

  // Welcoming — Number of Staff
  { id: 'sv-ps5-1-1', optionId: 'opt-ps5-1', labelEn: '2 Staff Members',  labelAr: 'موظفتان' },
  { id: 'sv-ps5-1-2', optionId: 'opt-ps5-1', labelEn: '4 Staff Members',  labelAr: '4 موظفات' },
  { id: 'sv-ps5-1-3', optionId: 'opt-ps5-1', labelEn: '6 Staff Members',  labelAr: '6 موظفات' },
  { id: 'sv-ps5-1-4', optionId: 'opt-ps5-1', labelEn: '8 Staff Members',  labelAr: '8 موظفات' },

  // Welcoming — Dress Colors
  { id: 'sv-ps5-3-1', optionId: 'opt-ps5-3', labelEn: '#000000', labelAr: 'أسود' },
  { id: 'sv-ps5-3-2', optionId: 'opt-ps5-3', labelEn: '#ffffff', labelAr: 'أبيض' },
  { id: 'sv-ps5-3-3', optionId: 'opt-ps5-3', labelEn: '#d4af37', labelAr: 'ذهبي' },
  { id: 'sv-ps5-3-4', optionId: 'opt-ps5-3', labelEn: '#f5f0e8', labelAr: 'بيج' },
];

// ── Service Options CRUD ──────────────────────────────────────────────────────

function initOptions(): ServiceOption[] {
  if (typeof window === 'undefined') return [...SEED_OPTIONS];
  try {
    const raw = localStorage.getItem(OPTIONS_KEY);
    if (raw === null) {
      localStorage.setItem(OPTIONS_KEY, JSON.stringify(SEED_OPTIONS));
      return [...SEED_OPTIONS];
    }
    return JSON.parse(raw) as ServiceOption[];
  } catch {
    return [...SEED_OPTIONS];
  }
}

function saveOptions(options: ServiceOption[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OPTIONS_KEY, JSON.stringify(options));
}

export function getOptions(): ServiceOption[] {
  return initOptions();
}

export function getOptionsByServiceId(serviceId: string): ServiceOption[] {
  return getOptions()
    .filter(o => o.serviceId === serviceId)
    .sort((a, b) => a.order - b.order);
}

export function saveOption(option: ServiceOption): void {
  const all = getOptions();
  const idx = all.findIndex(o => o.id === option.id);
  if (idx >= 0) all[idx] = option;
  else all.push(option);
  saveOptions(all);
}

export function deleteOption(id: string): void {
  saveOptions(getOptions().filter(o => o.id !== id));
  // also remove select values for this option
  saveSelectValues(getSelectValues().filter(v => v.optionId !== id));
}

export function generateOptionId(): string {
  return `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Select Values CRUD ────────────────────────────────────────────────────────

function initSelectValues(): ServiceOptionSelectValue[] {
  if (typeof window === 'undefined') return [...SEED_SELECT_VALUES];
  try {
    const raw = localStorage.getItem(VALUES_KEY);
    if (raw === null) {
      localStorage.setItem(VALUES_KEY, JSON.stringify(SEED_SELECT_VALUES));
      return [...SEED_SELECT_VALUES];
    }
    return JSON.parse(raw) as ServiceOptionSelectValue[];
  } catch {
    return [...SEED_SELECT_VALUES];
  }
}

function saveSelectValues(values: ServiceOptionSelectValue[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VALUES_KEY, JSON.stringify(values));
}

export function getSelectValues(): ServiceOptionSelectValue[] {
  return initSelectValues();
}

export function getSelectValuesByOptionId(optionId: string): ServiceOptionSelectValue[] {
  return getSelectValues().filter(v => v.optionId === optionId);
}

export function saveSelectValue(value: ServiceOptionSelectValue): void {
  const all = getSelectValues();
  const idx = all.findIndex(v => v.id === value.id);
  if (idx >= 0) all[idx] = value;
  else all.push(value);
  saveSelectValues(all);
}

export function deleteSelectValue(id: string): void {
  saveSelectValues(getSelectValues().filter(v => v.id !== id));
}

export function saveSelectValuesForOption(optionId: string, values: ServiceOptionSelectValue[]): void {
  const all = getSelectValues().filter(v => v.optionId !== optionId);
  saveSelectValues([...all, ...values]);
}

export function generateSelectValueId(): string {
  return `sv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Utility ───────────────────────────────────────────────────────────────────

export const OPTION_TYPE_LABELS: Record<OptionType, { en: string; ar: string; icon: string }> = {
  text:     { en: 'Text',     ar: 'نص',       icon: '📝' },
  number:   { en: 'Number',   ar: 'رقم',      icon: '🔢' },
  select:   { en: 'Select',   ar: 'قائمة',    icon: '📋' },
  color:    { en: 'Color',    ar: 'لون',      icon: '🎨' },
  employee: { en: 'Employee', ar: 'موظف',     icon: '👤' },
};
