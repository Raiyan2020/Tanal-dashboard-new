/**
 * Shared shape and payload mapping for the service-order create/edit form.
 *
 * Create and edit post the same body (minus the payment fields, which are
 * create-only), so both flows build their request through here rather than
 * each assembling its own payload.
 */

import type {
  ApiServiceOrderDetail,
  CreateServiceOrderItem,
  CreateServiceOrderPayload,
  UpdateServiceOrderPayload,
} from '@/lib/api';

export interface ServicePackage {
  id: number;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  price: number | string;
  guests_included?: number | null;
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
  /** Defaults to `employee`; an empty `employeeIds` means nobody is assigned yet. */
  employeeType: 'employee' | 'freelancer';
  /** Internal employees assigned to this item. The first is also sent as `employee_id`. */
  employeeIds: number[];
  freelancerUsername?: string;
  freelancerName?: string;
  freelancerCountryCode?: string;
  freelancerPhone?: string;
  selectedPackageId?: number;
  selectedAddonIds?: number[];
  packages?: ServicePackage[];
  addons?: ServiceAddon[];
  /** Filled in from the selected package so the UI can show the guest allowance. */
  guestsIncluded?: number | null;
  /** Present only when editing — needed to address item attachments. */
  serverItemId?: number;
}

/**
 * How the order is being created.
 *
 * - `full`  — the admin enters every detail up front.
 * - `quick` — the admin enters only the client's phone, the event date and the
 *   start time (plus the services being ordered). The backend then WhatsApps
 *   the client a form to fill in their own name, address and hall data, and the
 *   order sits at `client.data_status === 'incomplete'` until they do.
 */
export type OrderCreationMode = 'full' | 'quick';

export type FormState = {
  /** Create-only; editing always presents the full form. */
  creationMode: OrderCreationMode;
  services: FormServiceItem[];
  description: string;
  date: string;
  time: string;
  /** Required by the API and must be later than `time`. */
  endTime: string;
  hallName: string;
  hallLocation: string;
  governorate: string;
  blockNumber: string;
  streetName: string;
  houseNumber: string;
  addressNotes: string;
  executionNotes: string;
  paymentType: 'single' | 'two_installments';
  firstInstallmentAmount: string;
  isPaid: boolean;
  /** Legacy client reference — when absent the embedded `client` fields are sent. */
  clientId: string;
  clientName: string;
  clientCountryCode: string;
  clientPhone: string;
  clientAltCountryCode: string;
  clientAltPhone: string;
  /** Employees assigned to the order as a whole. */
  orderEmployeeIds: number[];
  /**
   * Mirrors "one of the selected services is the barcode/QR system service".
   * Derived by the form from the services list, and kept here so validation and
   * payload building can see it without re-fetching the service catalogue.
   */
  requiresInvitationDesign: boolean;
  /** Single-use token from `uploadInvitationDesign`; empty until one is uploaded. */
  invitationDesignToken: string;
  invitationDesignPreviewUrl: string;
  /** ISO timestamp after which the token is rejected and must be re-uploaded. */
  invitationDesignExpiresAt: string;
};

export const createEmptyServiceItem = (): FormServiceItem => ({
  id: Math.random().toString(),
  serviceId: '',
  serviceName: '',
  serviceNameAr: '',
  price: '0',
  description: '',
  options: [],
  employeeType: 'employee',
  employeeIds: [],
  selectedAddonIds: [],
  packages: [],
  addons: [],
});

export const createEmptyOrderForm = (): FormState => ({
  creationMode: 'full',
  services: [createEmptyServiceItem()],
  description: '',
  date: '',
  time: '',
  endTime: '',
  hallName: '',
  hallLocation: '',
  governorate: '',
  blockNumber: '',
  streetName: '',
  houseNumber: '',
  addressNotes: '',
  executionNotes: '',
  paymentType: 'single',
  firstInstallmentAmount: '',
  isPaid: false,
  clientId: '',
  clientName: '',
  clientCountryCode: '+965',
  clientPhone: '',
  clientAltCountryCode: '',
  clientAltPhone: '',
  orderEmployeeIds: [],
  requiresInvitationDesign: false,
  invitationDesignToken: '',
  invitationDesignPreviewUrl: '',
  invitationDesignExpiresAt: '',
});

/** `"18:00"` → minutes since midnight, or null when unparseable. */
function toMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export type OrderFormErrors = Partial<Record<
  'client' | 'event_date' | 'event_time' | 'event_end_time' | 'hall_name' | 'items'
  | 'invitation_design',
  string
>>;

/**
 * Client-side mirror of the backend rules, so obvious mistakes surface before a
 * round trip. The server remains the authority.
 */
export function validateOrderForm(form: FormState, language: 'ar' | 'en'): OrderFormErrors {
  const ar = language === 'ar';
  const errors: OrderFormErrors = {};
  const quick = form.creationMode === 'quick';

  // Either a legacy client id, or an embedded client with at least a phone.
  if (!form.clientId && !form.clientPhone.trim()) {
    errors.client = ar ? 'رقم هاتف العميل مطلوب' : 'Client phone is required';
  }
  if (!form.date) {
    errors.event_date = ar ? 'تاريخ التنفيذ مطلوب' : 'Event date is required';
  }
  if (!form.time) {
    errors.event_time = ar ? 'وقت البدء مطلوب' : 'Start time is required';
  }

  // In quick mode the end time and hall come from the client's own form later,
  // so they are optional here — but still validated when supplied.
  if (!quick && !form.endTime) {
    errors.event_end_time = ar ? 'وقت الانتهاء مطلوب' : 'End time is required';
  } else if (form.endTime) {
    const start = toMinutes(form.time);
    const end = toMinutes(form.endTime);
    if (start !== null && end !== null && end <= start) {
      errors.event_end_time = ar
        ? 'وقت الانتهاء يجب أن يكون بعد وقت البدء'
        : 'End time must be after the start time';
    }
  }
  if (!quick && !form.hallName.trim()) {
    errors.hall_name = ar ? 'اسم القاعة مطلوب' : 'Hall name is required';
  }

  if (form.services.length === 0 || form.services.some(s => !s.serviceId)) {
    errors.items = ar ? 'يجب اختيار خدمة واحدة على الأقل' : 'At least one service is required';
  }

  // The QR service cannot be ordered without a design uploaded up front.
  if (form.requiresInvitationDesign && !form.invitationDesignToken) {
    errors.invitation_design = ar
      ? 'يجب رفع تصميم الدعوة أولاً'
      : 'An invitation design must be uploaded first';
  }

  return errors;
}

/** True when the upload token has passed its expiry and must be replaced. */
export function isInvitationDesignExpired(form: FormState): boolean {
  if (!form.invitationDesignToken || !form.invitationDesignExpiresAt) return false;
  const expiry = new Date(form.invitationDesignExpiresAt).getTime();
  return Number.isFinite(expiry) && expiry <= Date.now();
}

/** Maps a single form row to the `items[]` entry the API expects. */
export function buildItemPayload(s: FormServiceItem): CreateServiceOrderItem {
  const optionsPayload: any[] = [];
  for (const opt of s.options) {
    if (opt.type === 'employee') {
      optionsPayload.push({
        service_option_id: opt.service_option_id,
        value: opt.selectedEmployeeIds || [],
      });
    } else if (opt.type === 'color') {
      optionsPayload.push({
        service_option_id: opt.service_option_id,
        value: opt.value || '',
      });
    } else if (opt.type === 'list') {
      optionsPayload.push({
        service_option_id: opt.service_option_id,
        value: String(opt.value),
      });
    } else {
      optionsPayload.push({
        service_option_id: opt.service_option_id,
        value: opt.type === 'number' ? Number(opt.value) : opt.value,
      });
    }
  }

  let employee: CreateServiceOrderItem['employee'];
  if (s.employeeType === 'employee' && s.employeeIds.length > 0) {
    employee = {
      type: 'employee',
      // Validation requires the singular field even when sending several ids.
      employee_id: s.employeeIds[0],
      employee_ids: s.employeeIds,
    };
  } else if (s.employeeType === 'freelancer' && s.freelancerUsername) {
    employee = {
      type: 'freelancer',
      username: s.freelancerUsername,
      name: s.freelancerName || undefined,
      country_code: s.freelancerCountryCode || undefined,
      phone: s.freelancerPhone || undefined,
    };
  }

  return {
    service_id: Number(s.serviceId),
    service_package_id: s.selectedPackageId ? Number(s.selectedPackageId) : undefined,
    addon_ids: s.selectedAddonIds?.length ? s.selectedAddonIds.map(Number) : undefined,
    // A package carries its own option values — only send options without one.
    options: s.selectedPackageId ? undefined : optionsPayload,
    employee,
    notes: s.description || undefined,
  };
}

const trimmed = (value: string) => {
  const v = value.trim();
  return v === '' ? undefined : v;
};

/** Fields common to create and update. */
function buildBasePayload(form: FormState): UpdateServiceOrderPayload {
  const payload: UpdateServiceOrderPayload = {
    event_date: form.date,
    event_time: form.time,
    // Both are omitted entirely in quick mode — the client supplies them.
    event_end_time: trimmed(form.endTime),
    hall_name: trimmed(form.hallName),
    location_url: trimmed(form.hallLocation),
    governorate: trimmed(form.governorate),
    block_number: trimmed(form.blockNumber),
    street_name: trimmed(form.streetName),
    house_number: trimmed(form.houseNumber),
    address_notes: trimmed(form.addressNotes),
    execution_notes: trimmed(form.executionNotes),
    notes: trimmed(form.description),
    items: form.services.map(buildItemPayload),
  };

  if (form.orderEmployeeIds.length > 0) {
    payload.order_employee_ids = form.orderEmployeeIds;
  }

  // A legacy client id wins; otherwise send the embedded client object.
  if (form.clientId) {
    payload.client_id = Number(form.clientId);
  } else {
    payload.client = {
      name: trimmed(form.clientName),
      country_code: trimmed(form.clientCountryCode),
      phone: trimmed(form.clientPhone),
      alt_country_code: trimmed(form.clientAltCountryCode),
      alt_phone: trimmed(form.clientAltPhone),
    };
  }

  return payload;
}

export function buildCreatePayload(form: FormState): CreateServiceOrderPayload {
  return {
    ...buildBasePayload(form),
    creation_mode: form.creationMode,
    // Sent only alongside the QR service — the backend rejects it otherwise.
    invitation_design_token:
      form.requiresInvitationDesign && form.invitationDesignToken
        ? form.invitationDesignToken
        : undefined,
    is_paid: form.isPaid ? 1 : 0,
    payment_type: form.paymentType,
    first_installment_amount:
      form.paymentType === 'two_installments' && form.firstInstallmentAmount
        ? Number(form.firstInstallmentAmount)
        : undefined,
  };
}

export function buildUpdatePayload(form: FormState): UpdateServiceOrderPayload {
  return buildBasePayload(form);
}

/** Strips a leading `+` difference so `965` and `+965` compare equal. */
const normaliseCode = (code: string | null | undefined) =>
  code ? (code.startsWith('+') ? code : `+${code}`) : '';

/**
 * Hydrates the form from a fetched order so the edit screen starts from server
 * state rather than a local cache.
 */
export function formStateFromDetail(detail: ApiServiceOrderDetail): FormState {
  return {
    // Editing always shows the complete form, whichever way the order was made.
    creationMode: 'full',
    services: detail.items.map(item => ({
      id: `server-${item.id}`,
      serverItemId: item.id,
      serviceId: String(item.service_id),
      serviceName: item.service?.name ?? '',
      serviceNameAr: item.service?.name ?? '',
      price: String(item.price ?? '0'),
      description: item.notes ?? '',
      options: [],
      // An item with no employee hydrates as `employee` with nothing selected,
      // which builds the same payload as the old `none` did.
      employeeType: item.employee?.type === 'freelancer' ? 'freelancer' : 'employee',
      employeeIds:
        item.employee?.type === 'employee' && (item.employee.employee_id ?? item.employee.id)
          ? [(item.employee.employee_id ?? item.employee.id) as number]
          : [],
      freelancerUsername: item.employee?.username ?? '',
      freelancerName: item.employee?.name ?? '',
      freelancerCountryCode: item.employee?.country_code ?? '',
      freelancerPhone: item.employee?.phone ?? '',
      selectedPackageId: item.service_package_id ?? undefined,
      selectedAddonIds: [],
      packages: [],
      addons: [],
      guestsIncluded: item.guests_included ?? null,
    })),
    description: detail.notes ?? '',
    date: detail.event_date ?? '',
    time: (detail.event_time ?? '').slice(0, 5),
    endTime: (detail.event_end_time ?? detail.end_time ?? '').slice(0, 5),
    hallName: detail.hall_name ?? '',
    hallLocation: detail.location_url ?? '',
    governorate: detail.governorate ?? '',
    blockNumber: detail.block_number ?? '',
    streetName: detail.street_name ?? '',
    houseNumber: detail.house_number ?? '',
    addressNotes: detail.address_notes ?? '',
    executionNotes: detail.execution_notes ?? '',
    // Payment is create-only; these are carried for display but never submitted.
    paymentType: detail.payment_type === 'two_installments' ? 'two_installments' : 'single',
    firstInstallmentAmount: detail.first_installment_amount != null
      ? String(detail.first_installment_amount)
      : '',
    isPaid: detail.is_paid,
    clientId: detail.client_id != null ? String(detail.client_id) : '',
    clientName: detail.client?.name ?? '',
    clientCountryCode: normaliseCode(detail.client?.country_code) || '+965',
    clientPhone: detail.client?.phone ?? '',
    clientAltCountryCode: normaliseCode(detail.client?.alt_country_code),
    clientAltPhone: detail.client?.alt_phone ?? '',
    orderEmployeeIds: (detail.order_employees ?? []).map(e => e.id),
    // Design upload is a create-time concern; editing goes through the
    // invitation's own edit screen instead.
    requiresInvitationDesign: false,
    invitationDesignToken: '',
    invitationDesignPreviewUrl: '',
    invitationDesignExpiresAt: '',
  };
}
