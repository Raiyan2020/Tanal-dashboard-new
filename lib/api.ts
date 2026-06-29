/**
 * Central API client.
 * Base URL is read from NEXT_PUBLIC_API_BASE_URL in .env.local
 * e.g. https://portal.tanal.raiyan.cc/api/v1
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export interface ApiResponse<T = unknown> {
  key: string;
  msg: string;
  code: number;
  response_status: {
    error: boolean;
    validation_errors: any;
  };
  data: T;
}

export interface AdminRole {
  name: string;
  display_name: string;
  is_super_admin: boolean;
  is_protected: boolean;
}

export interface Admin {
  id: number;
  name: string;
  email: string;
  country_code: string | null;
  phone: string;
  full_phone: string;
  image: string;
  is_active: boolean;
  is_blocked: boolean;
  is_super_admin: boolean;
  can_be_deleted: boolean;
  can_be_disabled: boolean;
  role: AdminRole;
}

export interface LoginResponseData {
  admin: Admin;
  token: string;
  permissions: string[];
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown> | FormData;
  token?: string;
  headers?: Record<string, string>;
};

/**
 * Generic fetch wrapper.
 * Attaches Authorization header when a token is provided.
 * Throws an Error with the API `msg` on non-2xx responses.
 */
const pendingGetRequests = new Map<string, Promise<any>>();

async function apiRequestInternal<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, token, headers: customHeaders } = options;

  let storedLang = 'ar';
  if (typeof window !== 'undefined') {
    storedLang = localStorage.getItem('tanal_lang') || 'ar';
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': storedLang,
    lang: storedLang,
    ...customHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let requestBody: BodyInit | undefined;

  if (body instanceof FormData) {
    requestBody = body;
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: requestBody,
  });

  // Try to parse JSON — the body might be {"message":"Unauthenticated."} on 401
  let json: ApiResponse<T>;
  try {
    json = await res.json();
  } catch {
    throw new Error('حدث خطأ غير متوقع');
  }

  // ── 401 Unauthenticated: clear local auth data and redirect to login ──
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      const { clearAuth } = await import('@/lib/auth');
      clearAuth();
      window.location.replace('/login');
    }
    throw new Error((json as any)?.message ?? 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً');
  }

  if (!res.ok || json.response_status?.error) {
    let message = json?.msg || '';

    const errors = json.response_status?.validation_errors;
    if (errors) {
      if (Array.isArray(errors)) {
        if (errors.length > 0) {
          message = errors.join(', ');
        }
      } else if (typeof errors === 'object') {
        const messages: string[] = [];
        Object.entries(errors).forEach(([_, fieldErrors]) => {
          if (Array.isArray(fieldErrors)) {
            messages.push(...fieldErrors.map(String));
          } else if (fieldErrors) {
            messages.push(String(fieldErrors));
          }
        });
        if (messages.length > 0) {
          message = messages.join(', ');
        }
      }
    }

    if (!message) {
      message = 'حدث خطأ غير متوقع';
    }

    throw new Error(message);
  }

  return json;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', token } = options;

  // Deduplicate active/pending GET requests to prevent duplicate client-side network calls
  if (method === 'GET') {
    const langHeader = options.headers?.['Accept-Language'] || '';
    const key = `${path}::${token || ''}::${langHeader}`;
    if (pendingGetRequests.has(key)) {
      return pendingGetRequests.get(key)!;
    }
    const promise = apiRequestInternal<T>(path, options).finally(() => {
      pendingGetRequests.delete(key);
    });
    pendingGetRequests.set(key, promise);
    return promise;
  }

  return apiRequestInternal<T>(path, options);
}


/** POST /admin/auth/login */
export async function loginAdmin(
  email: string,
  password: string
): Promise<ApiResponse<LoginResponseData>> {
  const formData = new FormData();
  formData.append('email', email);
  formData.append('password', password);

  return apiRequest<LoginResponseData>('/admin/auth/login', {
    method: 'POST',
    body: formData,
  });
}

/** POST /admin/auth/logout — requires Bearer token */
export async function logoutAdmin(token: string): Promise<void> {
  await apiRequest('/admin/auth/logout', {
    method: 'POST',
    token,
  });
}

/** POST /admin/auth/profile — update authenticated admin profile */
export async function updateProfile(
  fields: { name: string; email: string; password?: string; image?: File },
  token: string
): Promise<ApiResponse<Admin>> {
  const formData = new FormData();
  formData.append('name', fields.name);
  formData.append('email', fields.email);
  if (fields.password) formData.append('password', fields.password);
  if (fields.image) formData.append('image', fields.image);

  return apiRequest<Admin>('/admin/auth/profile?_method=put', {
    method: 'POST',
    body: formData,
    token,
  });
}

/* ─── Dashboard Data Types & Request ────────────────────────── */
export interface DashboardStat {
  value: number;
  growth: number;
  trend: 'up' | 'down';
  currency?: string;
  formatted?: string;
}

export interface DashboardStats {
  total_clients: DashboardStat;
  upcoming_events: DashboardStat;
  monthly_revenue: DashboardStat;
  today_scans: DashboardStat;
}

export interface DashboardRevenueChart {
  period: string;
  currency: string;
  labels: string[];
  series: Array<{
    name: string;
    data: number[];
  }>;
  total: number;
}

export interface DashboardUpcomingEvent {
  id: number;
  event_date: string;
  guest_count: number;
  price: string;
  status: string;
  status_label: string;
  event_name: string;
}

export interface DashboardData {
  stats: DashboardStats;
  revenue_chart: DashboardRevenueChart;
  upcoming_events: DashboardUpcomingEvent[];
}

/** GET /admin/dashboard — fetch dashboard stats/charts/events */
export async function getDashboardData(
  period: 'this_year' | 'this_month' | 'last_12_months' | 'last_6months' | 'all_time',
  token: string
): Promise<ApiResponse<DashboardData>> {
  return apiRequest<DashboardData>(`/admin/dashboard?period=${period}`, {
    method: 'GET',
    token,
  });
}

/* ─── Roles ─────────────────────────────────────────────────── */
export interface Role {
  id: number;
  name: string;
  is_protected: boolean;
  is_super_admin: boolean;
  admins_count: number;
  permissions_count: number;
  can_be_edited: boolean;
  can_be_deleted: boolean;
}

export interface Permission {
  id: number;
  name: string;
  module: string;
  action: string;
  label: string;
}

export interface PermissionGroup {
  module: string;
  label: string;
  permissions: Permission[];
}

export interface RoleDetail extends Role {
  permissions: Permission[];
}

export interface PaginatedItems<T> {
  items: T[];
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number;
    to: number;
  };
}

/** GET /admin/roles */
export async function getRoles(token: string): Promise<ApiResponse<PaginatedItems<Role>>> {
  return apiRequest<PaginatedItems<Role>>('/admin/roles', { token });
}

/** GET /admin/roles/:id */
export async function getRoleById(id: number, token: string): Promise<ApiResponse<RoleDetail>> {
  return apiRequest<RoleDetail>(`/admin/roles/${id}`, { token });
}

/** GET /admin/permissions */
export async function getPermissions(token: string): Promise<ApiResponse<{ items: PermissionGroup[] }>> {
  return apiRequest<{ items: PermissionGroup[] }>('/admin/permissions', { token });
}

/** POST /admin/roles */
export async function createRole(
  fields: { nameAr: string; nameEn: string; permissionIds: number[] },
  token: string
): Promise<ApiResponse<RoleDetail>> {
  const formData = new FormData();
  formData.append('name[ar]', fields.nameAr);
  formData.append('name[en]', fields.nameEn);
  fields.permissionIds.forEach((id, i) => formData.append(`permissions[${i}]`, String(id)));
  return apiRequest<RoleDetail>('/admin/roles', { method: 'POST', body: formData, token });
}

/** POST /admin/roles/:id?_method=put */
export async function updateRole(
  id: number,
  fields: { nameAr: string; nameEn: string; permissionIds: number[] },
  token: string
): Promise<ApiResponse<RoleDetail>> {
  const formData = new FormData();
  formData.append('name[ar]', fields.nameAr);
  formData.append('name[en]', fields.nameEn);
  fields.permissionIds.forEach((pid, i) => formData.append(`permissions[${i}]`, String(pid)));
  return apiRequest<RoleDetail>(`/admin/roles/${id}?_method=put`, { method: 'POST', body: formData, token });
}

/** DELETE /admin/roles/:id */
export async function deleteRole(id: number, token: string): Promise<ApiResponse<unknown>> {
  return apiRequest(`/admin/roles/${id}`, { method: 'DELETE', token });
}

/* ─── Admins CRUD ────────────────────────────────────────────── */

/** GET /admin/admins */
export async function getAdmins(
  token: string,
  params?: { page?: number; per_page?: number; keyword?: string }
): Promise<ApiResponse<PaginatedItems<Admin>>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.per_page) query.set('per_page', String(params.per_page));
  if (params?.keyword) query.set('filters[keyword]', params.keyword);
  const qs = query.toString();
  return apiRequest<PaginatedItems<Admin>>(`/admin/admins${qs ? `?${qs}` : ''}`, { token });
}

/** GET /admin/admins/:id */
export async function getAdminById(id: number, token: string): Promise<ApiResponse<Admin>> {
  return apiRequest<Admin>(`/admin/admins/${id}`, { token });
}

/** POST /admin/admins */
export async function createAdmin(
  fields: { name: string; email: string; password: string; role_id: number; is_active: 0 | 1 },
  token: string
): Promise<ApiResponse<Admin>> {
  const formData = new FormData();
  formData.append('name', fields.name);
  formData.append('email', fields.email);
  formData.append('password', fields.password);
  formData.append('role_id', String(fields.role_id));
  formData.append('is_active', String(fields.is_active));
  return apiRequest<Admin>('/admin/admins', { method: 'POST', body: formData, token });
}

/** POST /admin/admins/:id  (update) */
export async function updateAdmin(
  id: number,
  fields: { name: string; email: string; password?: string; role_id: number; is_active: 0 | 1 },
  token: string
): Promise<ApiResponse<Admin>> {
  const formData = new FormData();
  formData.append('name', fields.name);
  formData.append('email', fields.email);
  if (fields.password) formData.append('password', fields.password);
  formData.append('role_id', String(fields.role_id));
  formData.append('is_active', String(fields.is_active));
  return apiRequest<Admin>(`/admin/admins/${id}?_method=put`, { method: 'POST', body: formData, token });
}

/** DELETE /admin/admins/:id */
export async function deleteAdmin(id: number, token: string): Promise<ApiResponse<unknown>> {
  return apiRequest(`/admin/admins/${id}`, { method: 'DELETE', token });
}

/* ─── Clients CRUD ────────────────────────────────────────────── */

export interface Client {
  id: number;
  reference_number: number;
  reference_label: string;
  name: string;
  country_code: string;
  phone: string;
  full_phone: string;
  whatsapp_url: string;
  email: string;
  notes: string | null;
  events_count: number;
}

/** GET /admin/clients */
export async function getClients(
  token: string,
  params?: { page?: number; per_page?: number; keyword?: string }
): Promise<ApiResponse<PaginatedItems<Client>>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.per_page) query.set('per_page', String(params.per_page));
  if (params?.keyword) query.set('filters[keyword]', params.keyword);
  const qs = query.toString();
  return apiRequest<PaginatedItems<Client>>(`/admin/clients${qs ? `?${qs}` : ''}`, { token });
}

/** GET /admin/clients/:id */
export async function getClientById(id: number, token: string): Promise<ApiResponse<Client>> {
  return apiRequest<Client>(`/admin/clients/${id}`, { token });
}

/** POST /admin/clients */
export async function createClient(
  fields: { name: string; country_code: string; phone: string; email?: string; notes?: string },
  token: string
): Promise<ApiResponse<Client>> {
  const formData = new FormData();
  formData.append('name', fields.name);
  formData.append('country_code', fields.country_code);
  formData.append('phone', fields.phone);
  if (fields.email) formData.append('email', fields.email);
  if (fields.notes) formData.append('notes', fields.notes);
  return apiRequest<Client>('/admin/clients', { method: 'POST', body: formData, token });
}

/** POST /admin/clients/:id  (update) */
export async function updateClient(
  id: number,
  fields: { name: string; country_code: string; phone: string; email?: string; notes?: string },
  token: string
): Promise<ApiResponse<Client>> {
  const formData = new FormData();
  formData.append('name', fields.name);
  formData.append('country_code', fields.country_code);
  formData.append('phone', fields.phone);
  if (fields.email) formData.append('email', fields.email);
  formData.append('notes', fields.notes || '');
  return apiRequest<Client>(`/admin/clients/${id}?_method=put`, { method: 'POST', body: formData, token });
}

/** DELETE /admin/clients/:id */
export async function deleteClient(id: number, token: string): Promise<ApiResponse<unknown>> {
  return apiRequest(`/admin/clients/${id}`, { method: 'DELETE', token });
}

/* ─── Events CRUD ────────────────────────────────────────────── */

export interface ApiEvent {
  id: number;
  reference_number?: number;
  name: string;
  event_date: string | null;
  event_time?: string | null;
  guest_count: number;
  price?: string | null;
  status: string;
  status_label?: string;
  invitations_created?: boolean | number;
  payment_type?: 'one_payment' | 'installments' | null;
  hall_name?: string | null;
  hall_location?: string | null;
  welcome_message?: string | null;
  assigned_employee_id?: number | null;
  client_id?: number | null;
  created_at?: string;
  actions?: {
    can_delete: boolean;
    can_edit: boolean;
    can_update_payment: boolean;
  };
}

/** GET /admin/events */
export async function getEvents(
  token: string,
  params?: {
    page?: number;
    per_page?: number;
    keyword?: string;
    guest_count?: string;
    status?: string;
    is_paid?: 0 | 1;
    client_id?: number;
    event_date_min?: string;
    event_date_max?: string;
  }
): Promise<ApiResponse<PaginatedItems<ApiEvent>>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.per_page) query.set('per_page', String(params.per_page));
  if (params?.keyword) query.set('filters[keyword]', params.keyword);
  if (params?.guest_count) query.set('filters[guest_count]', params.guest_count);
  if (params?.status) query.set('filters[status]', params.status);
  if (params?.is_paid !== undefined) query.set('filters[is_paid]', String(params.is_paid));
  if (params?.client_id) query.set('filters[client_id]', String(params.client_id));
  if (params?.event_date_min) query.set('filters[event_date_min]', params.event_date_min);
  if (params?.event_date_max) query.set('filters[event_date_max]', params.event_date_max);
  const qs = query.toString();
  return apiRequest<PaginatedItems<ApiEvent>>(`/admin/events${qs ? `?${qs}` : ''}`, { token });
}

/** POST /admin/events */
export async function createEvent(
  fields: {
    client_id: number;
    event_date: string;
    event_time: string;
    hall_name: string;
    location_url?: string;
    whatsapp_message: string;
    total_cost: number;
    is_paid: 0 | 1;
    payment_type: 'single' | 'two_installments';
    first_installment_amount?: number;
  },
  token: string
): Promise<ApiResponse<ApiEvent>> {
  const formData = new FormData();
  formData.append('client_id', String(fields.client_id));
  formData.append('event_date', fields.event_date);
  formData.append('event_time', fields.event_time);
  formData.append('hall_name', fields.hall_name);
  if (fields.location_url) formData.append('location_url', fields.location_url);
  formData.append('whatsapp_message', fields.whatsapp_message);
  formData.append('total_cost', String(fields.total_cost));
  formData.append('is_paid', String(fields.is_paid));
  formData.append('payment_type', fields.payment_type);
  if (fields.first_installment_amount !== undefined) {
    formData.append('first_installment_amount', String(fields.first_installment_amount));
  }
  return apiRequest<ApiEvent>('/admin/events', { method: 'POST', body: formData, token });
}

/** POST /admin/events/:id?_method=put */
export async function updateEvent(
  id: number,
  fields: {
    client_id: number;
    event_date: string;
    event_time: string;
    hall_name: string;
    location_url?: string;
    whatsapp_message: string;
    total_cost: number;
    is_paid: 0 | 1;
    payment_type: 'single' | 'two_installments';
    first_installment_amount?: number;
  },
  token: string
): Promise<ApiResponse<ApiEvent>> {
  const formData = new FormData();
  formData.append('client_id', String(fields.client_id));
  formData.append('event_date', fields.event_date);
  formData.append('event_time', fields.event_time);
  formData.append('hall_name', fields.hall_name);
  if (fields.location_url) formData.append('location_url', fields.location_url);
  formData.append('whatsapp_message', fields.whatsapp_message);
  formData.append('total_cost', String(fields.total_cost));
  formData.append('is_paid', String(fields.is_paid));
  formData.append('payment_type', fields.payment_type);
  if (fields.first_installment_amount !== undefined) {
    formData.append('first_installment_amount', String(fields.first_installment_amount));
  }
  return apiRequest<ApiEvent>(`/admin/events/${id}?_method=put`, { method: 'POST', body: formData, token });
}

/** DELETE /admin/events/:id */
export async function deleteEvent(id: number, token: string): Promise<ApiResponse<unknown>> {
  return apiRequest(`/admin/events/${id}`, { method: 'DELETE', token });
}

export interface EventDetailData {
  details: {
    client_id: number;
    client_name: string;
    created_at: string;
    event_date: string;
    event_time: string;
    guest_count: number;
  };
  hall: {
    id: number;
    name: string;
    location_url: string | null;
  };
  financial_transaction: {
    total_cost: string;
    paid_amount: string;
    remaining_amount: string;
    is_paid: boolean;
    payment_type: 'single' | 'two_installments';
    status: 'paid' | 'unpaid' | 'installments' | 'completed' | 'cancelled';
    first_installment_amount: string | null;
    second_installment_amount: string | null;
    second_installment_due_date: string | null;
  };
  welcome_message: string;
  invitations: {
    sent_whatsapp_count: number;
  };
  employees: Array<{
    id: number;
    name: string;
    phone?: string;
  }>;
  actions: {
    can_delete: boolean;
    can_edit: boolean;
    can_update_payment: boolean;
  };
}

/** GET /admin/events/:id */
export async function getEventById(id: number, token: string): Promise<ApiResponse<EventDetailData>> {
  return apiRequest<EventDetailData>(`/admin/events/${id}`, { method: 'GET', token });
}

/** PATCH /admin/events/:id/payment-status */
export async function updateEventPaymentStatus(
  id: number,
  status: 'paid' | 'unpaid' | 'installments' | 'completed' | 'cancelled',
  token: string
): Promise<ApiResponse<unknown>> {
  const formData = new FormData();
  formData.append('status', status);
  return apiRequest(`/admin/events/${id}/payment-status?_method=patch`, {
    method: 'POST',
    body: formData,
    token,
  });
}

export interface ApiGuest {
  id: number;
  name: string;
  country_code: string;
  phone: string;
  full_phone: string;
  have_whatsapp: boolean;
  invitation_sent: boolean;
  invitation_sent_at: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
}

export interface GuestListData {
  items: ApiGuest[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface GetEventGuestsParams {
  page?: number;
  per_page?: number;
  has_whatsapp?: boolean | null;
}

/** GET /admin/events/:id/guests */
export async function getEventGuests(
  eventId: number,
  params: GetEventGuestsParams,
  token: string
): Promise<ApiResponse<GuestListData>> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.per_page !== undefined) query.set('per_page', String(params.per_page));
  if (params.has_whatsapp === true) query.set('has_whatsapp', '1');
  else if (params.has_whatsapp === false) query.set('has_whatsapp', '0');

  const qs = query.toString();
  return apiRequest<GuestListData>(`/admin/events/${eventId}/guests${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    token,
  });
}

export interface CreateGuestPayload {
  name: string;
  phone: string;
  country_code: string;
}

export interface CreateGuestResponse {
  id: number;
  have_whatsapp: boolean;
}

/** POST /admin/events/:id/guests */
export async function createEventGuest(
  eventId: number,
  payload: CreateGuestPayload,
  token: string
): Promise<ApiResponse<CreateGuestResponse>> {
  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('phone', payload.phone);
  formData.append('country_code', payload.country_code);
  return apiRequest<CreateGuestResponse>(`/admin/events/${eventId}/guests`, {
    method: 'POST',
    body: formData,
    token,
  });
}

export interface ImportGuestsResponse {
  imported: number;
  failed: number;
  errors: string[];
}

/** POST /admin/events/:id/guests/import */
export async function importEventGuests(
  eventId: number,
  file: File,
  token: string
): Promise<ApiResponse<ImportGuestsResponse>> {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest<ImportGuestsResponse>(`/admin/events/${eventId}/guests/import`, {
    method: 'POST',
    body: formData,
    token,
  });
}

/** POST /admin/events/:eventId/guests/:guestId?_method=put */
export async function updateEventGuest(
  eventId: number,
  guestId: number,
  payload: CreateGuestPayload,
  token: string
): Promise<ApiResponse<CreateGuestResponse>> {
  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('phone', payload.phone);
  formData.append('country_code', payload.country_code);
  return apiRequest<CreateGuestResponse>(`/admin/events/${eventId}/guests/${guestId}?_method=put`, {
    method: 'POST',
    body: formData,
    token,
  });
}

/** DELETE /admin/events/:eventId/guests/:guestId */
export async function deleteEventGuest(
  eventId: number,
  guestId: number,
  token: string
): Promise<ApiResponse<unknown>> {
  return apiRequest(`/admin/events/${eventId}/guests/${guestId}`, {
    method: 'DELETE',
    token,
  });
}

export interface ApiInvitation {
  id: number;
  client_id: number;
  client_name: string;
  client_phone: string;
  client_email: string;
  reference_number: string;
  whatsapp_url: string;
  event_name: string;
  guest_count: number;
  deadline_date: string;
  is_sent: boolean;
  status: 'upcoming' | 'previous';
  status_label: string;
}

export interface CreateInvitationResponse {
  id: number;
  reference_number: number;
  reference_code: string;
  event_id: string;
  event: {
    id: number;
    reference_number: number;
    reference_label: string;
    name: string;
    event_date: string;
    event_time: string;
    status: string;
  };
  name: string;
  logic_type: 'strict_action' | 'default_accept' | 'view_only';
  deadline_date: string;
  deadline_time: string;
  deadline_at: string;
  design: string;
  design_url: string;
  is_sent: boolean;
  status: string;
  status_label: string;
  guest_count: number;
  is_deadline_passed: boolean;
  can_be_deleted: boolean;
  can_be_edited: boolean;
  sent_at: string | null;
}

export interface InvitationDetailData {
  id: number;
  reference_code: string;
  name: string;
  event_id: number;
  response_stats: {
    total_sent: { count: number };
    accepted: { count: number; percentage: number };
    rejected: { count: number; percentage: number };
    pending: { count: number; percentage: number };
  };
  details: {
    deadline_date: string;
    deadline_time: string;
    guest_count: number;
    logic_type: 'strict_action' | 'default_accept' | 'view_only';
    logic_type_label: string;
    is_deadline_passed: boolean;
  };
  attendance: {
    has_data: boolean;
    total_accepted: number;
    checked_in: { count: number; percentage: number };
    not_checked_in: { count: number; percentage: number };
  };
  design: {
    design_url: string | null;
    can_be_changed: boolean;
  };
  actions: {
    is_sent: boolean;
    status: 'upcoming' | 'previous';
    status_label: string;
    can_be_sent: boolean;
    can_be_edited: boolean;
    can_be_deleted: boolean;
    sent_at: string | null;
  };
}

export interface InvitationGuest {
  id: number;
  name: string;
  full_phone: string;
  have_whatsapp: boolean;
  status: 'pending' | 'accepted' | 'rejected' | 'all';
  status_label: string;
}

export interface GetInvitationsParams {
  page?: number;
  per_page?: number;
  keyword?: string;
  period?: 'upcoming' | 'previous';
}

/** GET /admin/invitations */
export async function getInvitations(
  token: string,
  params?: GetInvitationsParams
): Promise<ApiResponse<PaginatedItems<ApiInvitation>>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.per_page) query.set('per_page', String(params.per_page));
  if (params?.keyword) query.set('filters[keyword]', params.keyword);
  if (params?.period) query.set('filters[period]', params.period);
  const qs = query.toString();
  return apiRequest<PaginatedItems<ApiInvitation>>(`/admin/invitations${qs ? `?${qs}` : ''}`, { token });
}

export interface CreateInvitationPayload {
  event_id: string;
  logic_type: 'strict_action' | 'default_accept' | 'view_only';
  deadline_date: string;
  deadline_time: string;
  design?: File | null;
}

/** POST /admin/invitations */
export async function createInvitation(
  payload: CreateInvitationPayload,
  token: string
): Promise<ApiResponse<CreateInvitationResponse>> {
  const formData = new FormData();
  formData.append('event_id', payload.event_id);
  formData.append('logic_type', payload.logic_type);
  formData.append('deadline_date', payload.deadline_date);
  formData.append('deadline_time', payload.deadline_time);
  if (payload.design) {
    formData.append('design', payload.design);
  }
  return apiRequest<CreateInvitationResponse>('/admin/invitations', {
    method: 'POST',
    body: formData,
    token,
  });
}

/** GET /admin/invitations/:id */
export async function getInvitationById(
  id: number,
  token: string
): Promise<ApiResponse<InvitationDetailData>> {
  return apiRequest<InvitationDetailData>(`/admin/invitations/${id}`, { token });
}

export interface UpdateInvitationPayload {
  event_id: string;
  logic_type: 'strict_action' | 'default_accept' | 'view_only';
  deadline_date: string;
  deadline_time: string;
  image?: File | null;
}

/** POST /admin/invitations/:id?_method=put */
export async function updateInvitation(
  id: number,
  payload: UpdateInvitationPayload,
  token: string
): Promise<ApiResponse<CreateInvitationResponse>> {
  const formData = new FormData();
  formData.append('event_id', payload.event_id);
  formData.append('logic_type', payload.logic_type);
  formData.append('deadline_date', payload.deadline_date);
  formData.append('deadline_time', payload.deadline_time);
  if (payload.image) {
    formData.append('image', payload.image);
  }
  return apiRequest<CreateInvitationResponse>(`/admin/invitations/${id}?_method=put`, {
    method: 'POST',
    body: formData,
    token,
  });
}

/** DELETE /admin/invitations/:id */
export async function deleteInvitation(
  id: number,
  token: string
): Promise<ApiResponse<unknown>> {
  return apiRequest(`/admin/invitations/${id}`, {
    method: 'DELETE',
    token,
  });
}

export interface GetInvitationGuestsParams {
  keyword?: string;
  name?: string;
  phone?: string;
  status?: string;
  page?: number;
  per_page?: number;
  event_id?: number;
}

/** GET /admin/invitations/guests */
export async function getInvitationGuests(
  params: GetInvitationGuestsParams,
  token: string
): Promise<ApiResponse<PaginatedItems<InvitationGuest>>> {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.name) query.set('name', params.name);
  if (params.phone) query.set('phone', params.phone);
  if (params.status) query.set('status', params.status);
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.per_page !== undefined) query.set('per_page', String(params.per_page));
  if (params.event_id !== undefined) query.set('event_id', String(params.event_id));
  const qs = query.toString();
  return apiRequest<PaginatedItems<InvitationGuest>>(`/admin/invitations/guests${qs ? `?${qs}` : ''}`, { token });
}

/** PATCH /admin/invitations/:id/send */
export async function sendInvitation(
  id: number,
  token: string
): Promise<ApiResponse<CreateInvitationResponse>> {
  return apiRequest<CreateInvitationResponse>(`/admin/invitations/${id}/send`, {
    method: 'PATCH',
    token,
  });
}

export interface ApiService {
  id: number;
  name: string;
  description: string;
  image: string | null;
  sort_order: number;
  options_count: number;
}

export interface ApiServiceOptionValue {
  id: number;
  service_option_id: number;
  value: string;
  color_hex: string | null;
  sort: number;
}

export interface ApiServiceOption {
  id: number;
  service_id: number;
  name: string;
  type: string;
  is_required: boolean;
  sort: number;
  requires_values: boolean;
  values: ApiServiceOptionValue[];
  values_count?: number;
}

export interface ApiServiceDetail extends ApiService {
  options: ApiServiceOption[];
  option_types_summary: Record<string, number>;
}

export interface GetServicesParams {
  page?: number;
  per_page?: number;
}

/** GET /admin/services */
export async function getServices(
  params: GetServicesParams,
  token: string
): Promise<ApiResponse<PaginatedItems<ApiService>>> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.per_page !== undefined) query.set('per_page', String(params.per_page));
  const qs = query.toString();
  return apiRequest<PaginatedItems<ApiService>>(`/admin/services${qs ? `?${qs}` : ''}`, { token });
}

/** GET /admin/services/:id */
export async function getServiceById(
  id: number,
  token: string,
  lang?: string
): Promise<ApiResponse<ApiServiceDetail>> {
  const options: RequestOptions = { token };
  if (lang) {
    options.headers = {
      'Accept-Language': lang,
      lang: lang,
    };
  }
  return apiRequest<ApiServiceDetail>(`/admin/services/${id}`, options);
}

export interface CreateServicePayload {
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  sort_order: number;
  image?: File | null;
}

/** POST /admin/services */
export async function createService(
  payload: CreateServicePayload,
  token: string
): Promise<ApiResponse<ApiService>> {
  const formData = new FormData();
  formData.append('name_ar', payload.name_ar);
  formData.append('name_en', payload.name_en);
  formData.append('description_ar', payload.description_ar);
  formData.append('description_en', payload.description_en);
  formData.append('sort_order', String(payload.sort_order));
  if (payload.image) {
    formData.append('image', payload.image);
  }
  return apiRequest<ApiService>('/admin/services', {
    method: 'POST',
    body: formData,
    token,
  });
}

/** PUT /admin/services/:id?_method=put */
export async function updateService(
  id: number,
  payload: CreateServicePayload,
  token: string
): Promise<ApiResponse<ApiService>> {
  const formData = new FormData();
  formData.append('name_ar', payload.name_ar);
  formData.append('name_en', payload.name_en);
  formData.append('description_ar', payload.description_ar);
  formData.append('description_en', payload.description_en);
  formData.append('sort_order', String(payload.sort_order));
  if (payload.image) {
    formData.append('image', payload.image);
  }
  return apiRequest<ApiService>(`/admin/services/${id}?_method=put`, {
    method: 'POST',
    body: formData,
    token,
  });
}

/** DELETE /admin/services/:id */
export async function deleteService(
  id: number,
  token: string
): Promise<ApiResponse<unknown>> {
  return apiRequest(`/admin/services/${id}`, {
    method: 'DELETE',
    token,
  });
}

/* ─── Service Options ─── */

export interface GetServiceOptionsParams {
  page?: number;
  per_page?: number;
}

/** GET /admin/services/:serviceId/options */
export async function getServiceOptions(
  serviceId: number,
  params: GetServiceOptionsParams,
  token: string
): Promise<ApiResponse<PaginatedItems<ApiServiceOption>>> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.per_page !== undefined) query.set('per_page', String(params.per_page));
  const qs = query.toString();
  return apiRequest<PaginatedItems<ApiServiceOption>>(
    `/admin/services/1/options${qs ? `?${qs}` : ''}`,
    { token }
  );
}

/* ─── Employees CRUD ─── */

export interface ApiEmployee {
  id: number;
  reference_number: number;
  reference_label: string;
  name: string;
  username: string;
  country_code: string;
  phone: string;
  full_phone: string;
  assigned_events_count: number;
  is_active?: boolean;
}

export interface ApiEmployeeEvent {
  id: number;
  reference_number: number;
  reference_label: string;
  name: string;
  event_date: string;
}

export interface ApiEmployeeDetail extends ApiEmployee {
  upcomingEvents?: ApiEmployeeEvent[];
  pastEvents?: ApiEmployeeEvent[];
  assigned_events?: {
    upcoming: ApiEmployeeEvent[];
    past: ApiEmployeeEvent[];
    upcoming_count: number;
    past_count: number;
    total_count: number;
  };
}

export interface ApiAssignableEvent {
  id: number;
  reference_number: number;
  reference_label: string;
  name: string;
  event_date: string;
  is_assigned: boolean;
  other_staff?: { id: number; name: string }[];
}

export interface GetEmployeesParams {
  page?: number;
  per_page?: number;
  keyword?: string;
}

export interface CreateEmployeePayload {
  name: string;
  username: string;
  password?: string;
  country_code: string;
  phone: string;
  is_active?: boolean;
}

/** GET /admin/employees */
export async function getEmployees(
  params: GetEmployeesParams,
  token: string
): Promise<ApiResponse<PaginatedItems<ApiEmployee>>> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.per_page !== undefined) query.set('per_page', String(params.per_page));
  if (params.keyword !== undefined && params.keyword !== '') {
    query.set('filters[keyword]', params.keyword);
  }
  const qs = query.toString();
  return apiRequest<PaginatedItems<ApiEmployee>>(`/admin/employees${qs ? `?${qs}` : ''}`, { token });
}

/** GET /admin/employees/:id */
export async function getEmployeeById(
  id: number,
  token: string
): Promise<ApiResponse<ApiEmployeeDetail>> {
  return apiRequest<ApiEmployeeDetail>(`/admin/employees/${id}`, { token });
}

/** POST /admin/employees */
export async function createEmployee(
  payload: CreateEmployeePayload,
  token: string
): Promise<ApiResponse<ApiEmployee>> {
  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('username', payload.username);
  if (payload.password) {
    formData.append('password', payload.password);
  }
  formData.append('country_code', payload.country_code);
  formData.append('phone', payload.phone);
  if (payload.is_active !== undefined) {
    formData.append('is_active', payload.is_active ? '1' : '0');
  }
  return apiRequest<ApiEmployee>('/admin/employees', {
    method: 'POST',
    body: formData,
    token,
  });
}

/** POST /admin/employees/:id?_method=put */
export async function updateEmployee(
  id: number,
  payload: CreateEmployeePayload,
  token: string
): Promise<ApiResponse<ApiEmployee>> {
  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('username', payload.username);
  if (payload.password) {
    formData.append('password', payload.password);
  }
  formData.append('country_code', payload.country_code);
  formData.append('phone', payload.phone);
  return apiRequest<ApiEmployee>(`/admin/employees/${id}?_method=put`, {
    method: 'POST',
    body: formData,
    token,
  });
}

/** DELETE /admin/employees/:id */
export async function deleteEmployee(
  id: number,
  token: string
): Promise<ApiResponse<unknown>> {
  return apiRequest(`/admin/employees/${id}`, {
    method: 'DELETE',
    token,
  });
}

/** GET /admin/employees/:id/assignable-events */
export async function getEmployeeAssignableEvents(
  id: number,
  token: string
): Promise<ApiResponse<PaginatedItems<ApiAssignableEvent>>> {
  return apiRequest<PaginatedItems<ApiAssignableEvent>>(`/admin/employees/${id}/assignable-events`, {
    token,
  });
}

/** PUT /admin/employees/:id/events */
export async function assignEmployeeEvents(
  id: number,
  eventIds: number[],
  token: string
): Promise<ApiResponse<ApiEmployeeDetail>> {
  return apiRequest<ApiEmployeeDetail>(`/admin/employees/${id}/events`, {
    method: 'PUT',
    body: { event_ids: eventIds },
    token,
  });
}

/* ─── Service Options CRUD ────────────────────────────────────────────── */

export interface ServiceOptionItem {
  id: number;
  name: string;
  type: 'text' | 'number' | 'color' | 'employee' | 'list';
  is_required: boolean;
}

export interface ServiceOptionDetailItem {
  id: number;
  name?: string;
  'name_ar'?: string;
  'name_en'?: string;
  type: 'text' | 'number' | 'color' | 'employee' | 'list';
  is_required: boolean;
  values?: Array<{ id: number; value_ar?: string; value_en?: string; value?: string; label_ar?: string; label_en?: string }>;
  labels?: Array<{ id: number; label_ar?: string; label_en?: string }>;
}

export interface CreateServiceOptionPayload {
  nameAr: string;
  nameEn: string;
  type: 'text' | 'number' | 'color' | 'employee' | 'list';
  is_required: 0 | 1;
  labels?: Array<{ label_ar: string; label_en: string }>;
}

export interface UpdateServiceOptionPayload {
  nameAr: string;
  nameEn: string;
  type: 'text' | 'number' | 'color' | 'employee' | 'list';
  is_required: 0 | 1;
  labels?: Array<{ label_ar: string; label_en: string }>;
}
/** GET /admin/service-options */
export async function getAdminServiceOptions(
  token: string,
  params?: { page?: number; per_page?: number }
): Promise<ApiResponse<PaginatedItems<ServiceOptionItem>>> {
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.per_page !== undefined) query.set('per_page', String(params.per_page));
  const qs = query.toString();
  return apiRequest<PaginatedItems<ServiceOptionItem>>(
    `/admin/service-options${qs ? `?${qs}` : ''}`,
    { token }
  );
}

/** POST /admin/service-options */
export async function createAdminServiceOption(
  payload: CreateServiceOptionPayload,
  token: string
): Promise<ApiResponse<ServiceOptionItem>> {
  const formData = new FormData();
  formData.append('name[ar]', payload.nameAr);
  formData.append('name[en]', payload.nameEn);
  formData.append('type', payload.type);
  formData.append('is_required', String(payload.is_required));

  if (payload.labels && payload.labels.length > 0) {
    payload.labels.forEach((label, i) => {
      formData.append(`labels[${i}][label_ar]`, label.label_ar);
      formData.append(`labels[${i}][label_en]`, label.label_en);
    });
  }

  return apiRequest<ServiceOptionItem>('/admin/service-options', {
    method: 'POST',
    body: formData,
    token,
  });
}

/** POST /admin/service-options/:id?_method=put */
export async function updateAdminServiceOption(
  id: number,
  payload: UpdateServiceOptionPayload,
  token: string
): Promise<ApiResponse<ServiceOptionItem>> {
  const body = {
    name: {
      ar: payload.nameAr,
      en: payload.nameEn,
    },
    type: payload.type,
    is_required: payload.is_required,
    labels: payload.labels,
  };

  return apiRequest<ServiceOptionItem>(`/admin/service-options/${id}?_method=put`, {
    method: 'POST',
    body,
    token,
  });
}

/** GET /admin/service-options/:id */
export async function getAdminServiceOptionById(
  id: number,
  token: string
): Promise<ApiResponse<ServiceOptionDetailItem>> {
  return apiRequest<ServiceOptionDetailItem>(`/admin/service-options/${id}`, {
    method: 'GET',
    token,
  });
}

/** DELETE /admin/service-options/:id */
export async function deleteAdminServiceOption(
  id: number,
  token: string
): Promise<ApiResponse<unknown>> {
  return apiRequest(`/admin/service-options/${id}`, {
    method: 'DELETE',
    token,
  });
}

/** POST /admin/services/:serviceId/options?_method=put */
export async function assignServiceOptions(
  serviceId: number,
  optionIds: number[],
  token: string
): Promise<ApiResponse<unknown>> {
  return apiRequest(`/admin/services/${serviceId}/options?_method=put`, {
    method: 'POST',
    body: { option_ids: optionIds },
    token,
  });
}

export interface ServiceOrderStatus {
  value: string;
  label: string;
}

export interface ApiServiceOrderItem {
  id: number;
  reference_number: number;
  reference_label: string;
  service_name: string;
  client_name: string;
  event_date: string;
  total_amount: string;
  currency: string;
  statuses: ServiceOrderStatus[];
  has_pending_second_payment: boolean;
  whatsapp_url: string;
}

export interface ServiceOrdersResponse {
  items: ApiServiceOrderItem[];
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number;
    to: number;
  };
  statuses: ServiceOrderStatus[];
}

export interface GetServiceOrdersParams {
  page?: number;
  per_page?: number;
  keyword?: string;
  order_by?: string;
  order?: 'ASC' | 'DESC';
}

/** GET /admin/service-orders */
export async function getAdminServiceOrders(
  token: string,
  params?: GetServiceOrdersParams
): Promise<ApiResponse<ServiceOrdersResponse>> {
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.per_page !== undefined) query.set('per_page', String(params.per_page));
  if (params?.keyword !== undefined) query.set('filters[keyword]', params.keyword);
  if (params?.order_by !== undefined) query.set('filters[order_by]', params.order_by);
  if (params?.order !== undefined) query.set('filters[order]', params.order);

  const qs = query.toString();
  return apiRequest<ServiceOrdersResponse>(
    `/admin/service-orders${qs ? `?${qs}` : ''}`,
    { token }
  );
}

// ── Detail types ──────────────────────────────────────────────────────────────
export interface ApiServiceOrderDetailOption {
  id: number;
  service_option_id: number;
  option: { id: number; name: string; name_ar: string; name_en: string; type: string; is_required: boolean } | null;
  service_option_value_id: number | null;
  value: { id: number; label: string; color_hex: string | null } | null;
  text_value: string | null;
  number_value: string | null;
  employee_id: number | null;
  employee: { id: number; name: string; reference_label: string; full_phone: string } | null;
}

export interface ApiServiceOrderDetailItem {
  id: number;
  service_id: number;
  service: { id: number; name: string; description: string; image: string | null; sort_order: number };
  price: string;
  notes: string | null;
  sort: number;
  employee: { type: string; id: number; name: string; reference_label: string; full_phone: string } | null;
  options: ApiServiceOrderDetailOption[];
}

export interface ApiServiceOrderDetail {
  id: number;
  reference_number: number;
  reference_label: string;
  client_id: number;
  client: {
    id: number; reference_label: string; name: string; country_code: string;
    phone: string; full_phone: string; whatsapp_url: string; email: string; notes: string | null;
  };
  event_date: string;
  event_time: string;
  hall_name: string;
  location_url: string | null;
  statuses: ServiceOrderStatus[];
  is_paid: boolean;
  payment_type: string;
  paid_amount: string;
  first_installment_amount: string | null;
  second_installment_amount: string | null;
  second_payment_status: string | null;
  has_pending_second_payment: boolean;
  total_amount: string;
  notes: string | null;
  primary_service_name: { ar: string; en: string };
  items: ApiServiceOrderDetailItem[];
  whatsapp_url: string;
  created_at: string;
  updated_at: string;
}

/** GET /admin/service-orders/:id */
export async function getAdminServiceOrderById(
  id: number,
  token: string
): Promise<ApiResponse<ApiServiceOrderDetail>> {
  return apiRequest<ApiServiceOrderDetail>(`/admin/service-orders/${id}`, { token });
}

/** DELETE /admin/service-orders/:id */
export async function deleteAdminServiceOrder(
  id: number,
  token: string
): Promise<ApiResponse<any>> {
  return apiRequest<any>(`/admin/service-orders/${id}`, { method: 'DELETE', token });
}


/** Option shape variants sent to POST /admin/service-orders */
export interface CreateServiceOrderItemOptionValue {
  service_option_id: number;
  value?: string | number;         // text / number types
}
export interface CreateServiceOrderItemOptionValues {
  service_option_id: number;
  values?: (string | number)[];    // list type  (array of ids)
}
export interface CreateServiceOrderItemOptionEmployee {
  service_option_id: number;
  employee_id?: number;            // employee type (one entry per employee)
}
export interface CreateServiceOrderItemOptionLabels {
  service_option_id: number;
  labels?: { service_option_value_id: number; text_value: string }[]; // labels type
}
export type CreateServiceOrderItemOption =
  | CreateServiceOrderItemOptionValue
  | CreateServiceOrderItemOptionValues
  | CreateServiceOrderItemOptionEmployee
  | CreateServiceOrderItemOptionLabels;

export interface CreateServiceOrderItemEmployee {
  type: 'employee' | 'freelancer';
  employee_id?: number;
  username?: string;
  country_code?: string;
  phone?: string;
}

export interface CreateServiceOrderItem {
  service_id: number;
  price: number;
  options: CreateServiceOrderItemOption[];
  employee?: CreateServiceOrderItemEmployee;
}

export interface CreateServiceOrderPayload {
  client_id: number;
  event_date: string;
  event_time: string;
  hall_name: string;
  location_url?: string;
  is_paid: 0 | 1;
  payment_type: 'single' | 'two_installments';
  first_installment_amount?: number;
  items: CreateServiceOrderItem[];
}

/** POST /admin/service-orders — body sent as JSON */
export async function createAdminServiceOrder(
  payload: CreateServiceOrderPayload,
  token: string
): Promise<ApiResponse<any>> {
  return apiRequest<any>('/admin/service-orders', {
    method: 'POST',
    body: payload as any,
    token,
  });
}

export interface ApiFinancialRecordItem {
  id: number;
  reference_number: number;
  reference_code: string;
  client_id: number;
  client_name: string;
  client_phone: string;
  event_id: number;
  event_name: string;
  amount: string;
  paid_amount: string;
  remaining_amount: string;
  currency: string;
  status: 'paid' | 'unpaid' | 'installments';
  record_date: string;
  record_date_label: string;
}

export interface ApiFinancialRecordDetail {
  id: number;
  reference_number: number;
  reference_code: string;
  amount: string;
  paid_amount: string;
  remaining_amount: string;
  currency: string;
  status: 'paid' | 'unpaid' | 'installments';
  record_date: string;
  notes: string | null;
  client: {
    id: number;
    name: string;
    phone: string;
    full_phone: string;
    email: string | null;
  };
  event: {
    id: number;
    reference_number: number;
    reference_label: string;
    name: string;
    event_date: string;
    event_time: string;
    status: string;
  };
  transactions: any[];
  created_at: string;
  updated_at: string;
}

export interface FinancialRecordsResponse {
  items: ApiFinancialRecordItem[];
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number;
    to: number;
  };
}

/** GET /admin/financial-records */
export async function getAdminFinancialRecords(
  token: string,
  params?: { page?: number; per_page?: number; keyword?: string }
): Promise<ApiResponse<FinancialRecordsResponse>> {
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.per_page !== undefined) query.set('per_page', String(params.per_page));
  if (params?.keyword !== undefined) query.set('filters[keyword]', params.keyword);

  const qs = query.toString();
  return apiRequest<FinancialRecordsResponse>(
    `/admin/financial-records${qs ? `?${qs}` : ''}`,
    { token }
  );
}

/** GET /admin/financial-records/:id */
export async function getFinancialRecordById(
  id: number,
  token: string
): Promise<ApiResponse<ApiFinancialRecordDetail>> {
  return apiRequest<ApiFinancialRecordDetail>(`/admin/financial-records/${id}`, { token });
}

/** GET /admin/financial-records/:id/pdf */
export async function downloadFinancialRecordPdf(
  id: number,
  token: string
): Promise<Blob> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://portal.tanal.raiyan.cc/api'}/admin/financial-records/${id}/pdf`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/pdf',
    },
  });
  if (!response.ok) throw new Error('فشل تحميل ملف PDF');
  return response.blob();
}

/** POST /financial-records/:id/admin/settle?_method=patch */
export async function settleFinancialRecord(
  id: number,
  token: string
): Promise<ApiResponse<any>> {
  return apiRequest<any>(`/admin/financial-records/${id}/settle?_method=patch`, {
    method: 'POST',
    token,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// LANDING PAGE APIs
// ═══════════════════════════════════════════════════════════════════════════════

// ── Types ────────────────────────────────────────────────────────────────────
export interface LandingHero {
  title: { ar: string; en: string };
  subtitle: { ar: string; en: string };
  primary_cta_label: { ar: string; en: string };
  primary_cta_url: string;
  secondary_cta_label: { ar: string; en: string };
  secondary_cta_url: string;
  image: string | null;
}

export interface LandingHowItWorksStep {
  id: number;
  icon: string;
  icon_url: string;
  title: string;
  description: string;
  sort: number;
}

export interface LandingFeature {
  id: number;
  icon_url: string;
  title: string;
  description: string;
  sort: number;
}

export interface LandingPortfolioItem {
  id: number;
  image: string | null;
  name: string;
  sort: number;
}

export interface LandingSocialLink {
  id: number;
  platform: string;
  url: string;
  sort: number;
}

export interface LandingFooter {
  id: number;
  brand_name: string;
  tagline: string;
  description: string;
  about_url?: string;
  privacy_url?: string;
  terms_url?: string;
  copyright: string;
  logo_url: string | null;
}

export interface LandingContact {
  id: number;
  whatsapp_country_code: string;
  whatsapp_phone: string;
  whatsapp_full_number: string;
  office_address: { ar: string; en: string };
  google_maps_url: string;
  social_links: LandingSocialLink[];
}

export interface LandingEventType {
  id: number;
  name: string;
  sort: number;
}

// ── Helper ───────────────────────────────────────────────────────────────────
interface ReorderItem { id: number; sort: number }

// ── Hero ─────────────────────────────────────────────────────────────────────
export async function getLandingHero(token: string): Promise<ApiResponse<{ data: LandingHero }>> {
  return apiRequest('/admin/landing-page/hero', { token });
}
export async function updateLandingHero(fields: {
  title_ar: string; title_en: string;
  subtitle_ar: string; subtitle_en: string;
  primary_cta_label_ar: string; primary_cta_label_en: string; primary_cta_url: string;
  secondary_cta_label_ar: string; secondary_cta_label_en: string; secondary_cta_url: string;
  image?: File | null;
}, token: string): Promise<ApiResponse<any>> {
  const fd = new FormData();
  fd.append('title[ar]', fields.title_ar);
  fd.append('title[en]', fields.title_en);
  fd.append('subtitle[ar]', fields.subtitle_ar);
  fd.append('subtitle[en]', fields.subtitle_en);
  fd.append('primary_cta_label[ar]', fields.primary_cta_label_ar);
  fd.append('primary_cta_label[en]', fields.primary_cta_label_en);
  fd.append('primary_cta_url', fields.primary_cta_url);
  fd.append('secondary_cta_label[ar]', fields.secondary_cta_label_ar);
  fd.append('secondary_cta_label[en]', fields.secondary_cta_label_en);
  fd.append('secondary_cta_url', fields.secondary_cta_url);
  if (fields.image) fd.append('image', fields.image);
  return apiRequest<any>('/admin/landing-page/hero?_method=put', { method: 'POST', body: fd, token });
}

// ── How It Works ──────────────────────────────────────────────────────────────
export async function getLandingHowItWorks(token: string): Promise<ApiResponse<{ items: LandingHowItWorksStep[] }>> {
  return apiRequest('/admin/landing-page/how-it-works', { token });
}
export async function createHowItWorksStep(fields: { title_ar: string; title_en: string; description_ar: string; description_en: string; icon?: File }, token: string): Promise<ApiResponse<LandingHowItWorksStep>> {
  const fd = new FormData();
  fd.append('title[ar]', fields.title_ar);
  fd.append('title[en]', fields.title_en);
  fd.append('description[ar]', fields.description_ar);
  fd.append('description[en]', fields.description_en);
  if (fields.icon) fd.append('icon', fields.icon);
  return apiRequest('/admin/landing-page/how-it-works', { method: 'POST', body: fd, token });
}
export async function updateHowItWorksStep(id: number, fields: { title_ar: string; title_en: string; description_ar: string; description_en: string; icon?: File }, token: string): Promise<ApiResponse<LandingHowItWorksStep>> {
  const fd = new FormData();
  fd.append('title[ar]', fields.title_ar);
  fd.append('title[en]', fields.title_en);
  fd.append('description[ar]', fields.description_ar);
  fd.append('description[en]', fields.description_en);
  if (fields.icon) fd.append('icon', fields.icon);
  return apiRequest(`/admin/landing-page/how-it-works/${id}?_method=put`, { method: 'POST', body: fd, token });
}
export async function deleteHowItWorksStep(id: number, token: string): Promise<ApiResponse<any>> {
  return apiRequest(`/admin/landing-page/how-it-works/${id}`, { method: 'DELETE', token });
}
export async function reorderHowItWorks(items: ReorderItem[], token: string): Promise<ApiResponse<any>> {
  return apiRequest('/admin/landing-page/how-it-works/reorder', { method: 'PATCH', body: { items } as any, token });
}

// ── Features ──────────────────────────────────────────────────────────────────
export async function getLandingFeatures(token: string): Promise<ApiResponse<{ items: LandingFeature[] }>> {
  return apiRequest('/admin/landing-page/features', { token });
}
export async function createFeature(fields: { title_ar: string; title_en: string; description_ar: string; description_en: string; sort?: number; icon?: File }, token: string): Promise<ApiResponse<LandingFeature>> {
  const fd = new FormData();
  fd.append('title[ar]', fields.title_ar);
  fd.append('title[en]', fields.title_en);
  fd.append('description[ar]', fields.description_ar);
  fd.append('description[en]', fields.description_en);
  if (fields.sort != null) fd.append('sort', String(fields.sort));
  if (fields.icon) fd.append('icon', fields.icon);
  return apiRequest('/admin/landing-page/features', { method: 'POST', body: fd, token });
}
export async function updateFeature(id: number, fields: { title_ar: string; title_en: string; description_ar: string; description_en: string; sort?: number; icon?: File }, token: string): Promise<ApiResponse<LandingFeature>> {
  const fd = new FormData();
  fd.append('title[ar]', fields.title_ar);
  fd.append('title[en]', fields.title_en);
  fd.append('description[ar]', fields.description_ar);
  fd.append('description[en]', fields.description_en);
  if (fields.sort != null) fd.append('sort', String(fields.sort));
  if (fields.icon) fd.append('icon', fields.icon);
  return apiRequest(`/admin/landing-page/features/${id}?_method=put`, { method: 'POST', body: fd, token });
}
export async function deleteFeature(id: number, token: string): Promise<ApiResponse<any>> {
  return apiRequest(`/admin/landing-page/features/${id}`, { method: 'DELETE', token });
}
export async function reorderFeatures(items: ReorderItem[], token: string): Promise<ApiResponse<any>> {
  return apiRequest('/admin/landing-page/features/reorder?_method=patch', { method: 'POST', body: { items } as any, token });
}

// ── Portfolio ─────────────────────────────────────────────────────────────────
export async function getLandingPortfolio(token: string): Promise<ApiResponse<{ items: LandingPortfolioItem[] }>> {
  return apiRequest('/admin/landing-page/portfolio', { token });
}
export async function createPortfolioItem(fields: { name_ar: string; name_en: string; sort?: number; status?: number; image?: File }, token: string): Promise<ApiResponse<LandingPortfolioItem>> {
  const fd = new FormData();
  fd.append('name[ar]', fields.name_ar);
  fd.append('name[en]', fields.name_en);
  if (fields.sort != null) fd.append('sort', String(fields.sort));
  fd.append('status', String(fields.status ?? 1));
  if (fields.image) fd.append('image', fields.image);
  return apiRequest('/admin/landing-page/portfolio', { method: 'POST', body: fd, token });
}
export async function updatePortfolioItem(id: number, fields: { name_ar: string; name_en: string; sort?: number; status?: number; image?: File }, token: string): Promise<ApiResponse<LandingPortfolioItem>> {
  const fd = new FormData();
  fd.append('name[ar]', fields.name_ar);
  fd.append('name[en]', fields.name_en);
  if (fields.sort != null) fd.append('sort', String(fields.sort));
  fd.append('status', String(fields.status ?? 1));
  if (fields.image) fd.append('image', fields.image);
  return apiRequest(`/admin/landing-page/portfolio/${id}?_method=put`, { method: 'POST', body: fd, token });
}
export async function deletePortfolioItem(id: number, token: string): Promise<ApiResponse<any>> {
  return apiRequest(`/admin/landing-page/portfolio/${id}`, { method: 'DELETE', token });
}
export async function reorderPortfolio(items: ReorderItem[], token: string): Promise<ApiResponse<any>> {
  return apiRequest('/admin/landing-page/portfolio/reorder?_method=patch', { method: 'POST', body: { items } as any, token });
}

// ── Social Links ──────────────────────────────────────────────────────────────
export async function getLandingSocialLinks(token: string): Promise<ApiResponse<{ items: LandingSocialLink[] }>> {
  return apiRequest('/admin/landing-page/social-links', { token });
}
export async function createSocialLink(fields: { platform: string; url: string; label_ar?: string; label_en?: string; sort?: number; status?: number }, token: string): Promise<ApiResponse<LandingSocialLink>> {
  return apiRequest('/admin/landing-page/social-links', { method: 'POST', body: { platform: fields.platform, url: fields.url, 'label[ar]': fields.label_ar ?? '', 'label[en]': fields.label_en ?? '', sort: fields.sort ?? 0, status: fields.status ?? 1 } as any, token });
}
export async function updateSocialLink(id: number, fields: { platform: string; url: string; label_ar?: string; label_en?: string; sort?: number; status?: number }, token: string): Promise<ApiResponse<LandingSocialLink>> {
  return apiRequest(`/admin/landing-page/social-links/${id}?_method=put`, { method: 'POST', body: { platform: fields.platform, url: fields.url, 'label[ar]': fields.label_ar ?? '', 'label[en]': fields.label_en ?? '', sort: fields.sort ?? 0, status: fields.status ?? 1 } as any, token });
}
export async function deleteSocialLink(id: number, token: string): Promise<ApiResponse<any>> {
  return apiRequest(`/admin/landing-page/social-links/${id}`, { method: 'DELETE', token });
}
export async function reorderSocialLinks(items: ReorderItem[], token: string): Promise<ApiResponse<any>> {
  return apiRequest('/admin/landing-page/social-links/reorder?_method=patch', { method: 'POST', body: { items } as any, token });
}

// ── Footer ────────────────────────────────────────────────────────────────────
export async function getLandingFooter(token: string): Promise<ApiResponse<LandingFooter>> {
  return apiRequest('/admin/landing-page/footer', { token });
}
export async function updateLandingFooter(fields: {
  brand_name_ar: string; brand_name_en: string;
  tagline_ar: string; tagline_en: string;
  description_ar: string; description_en: string;
  copyright: string; logo?: File | null;
}, token: string): Promise<ApiResponse<LandingFooter>> {
  const fd = new FormData();
  fd.append('brand_name[ar]', fields.brand_name_ar);
  fd.append('brand_name[en]', fields.brand_name_en);
  fd.append('tagline[ar]', fields.tagline_ar);
  fd.append('tagline[en]', fields.tagline_en);
  fd.append('description[ar]', fields.description_ar);
  fd.append('description[en]', fields.description_en);
  fd.append('copyright', fields.copyright);
  if (fields.logo) fd.append('logo', fields.logo);
  return apiRequest<LandingFooter>('/admin/landing-page/footer?_method=put', { method: 'POST', body: fd, token });
}

// ── Contact ───────────────────────────────────────────────────────────────────
export async function getLandingContact(token: string): Promise<ApiResponse<LandingContact>> {
  return apiRequest('/admin/landing-page/contact', { token });
}
export async function updateLandingContact(fields: {
  whatsapp_country_code: string; whatsapp_phone: string;
  office_address_ar: string; office_address_en: string;
  google_maps_url: string;
}, token: string): Promise<ApiResponse<LandingContact>> {
  const fd = new FormData();
  fd.append('whatsapp_country_code', fields.whatsapp_country_code);
  fd.append('whatsapp_phone', fields.whatsapp_phone);
  fd.append('office_address[ar]', fields.office_address_ar);
  fd.append('office_address[en]', fields.office_address_en);
  fd.append('google_maps_url', fields.google_maps_url);
  return apiRequest<LandingContact>('/admin/landing-page/contact?_method=put', { method: 'POST', body: fd, token });
}

// ── Event Types ───────────────────────────────────────────────────────────────
export async function getLandingEventTypes(token: string): Promise<ApiResponse<{ items: LandingEventType[] }>> {
  return apiRequest('/admin/landing-page/event-types', { token });
}
export async function createEventType(fields: { name_ar: string; name_en: string; sort?: number }, token: string): Promise<ApiResponse<LandingEventType>> {
  return apiRequest('/admin/landing-page/event-types', { method: 'POST', body: { 'name[ar]': fields.name_ar, 'name[en]': fields.name_en, sort: fields.sort ?? 0 } as any, token });
}
export async function updateEventType(id: number, fields: { name_ar: string; name_en: string; sort?: number }, token: string): Promise<ApiResponse<LandingEventType>> {
  return apiRequest(`/admin/landing-page/event-types/${id}?_method=put`, { method: 'POST', body: { 'name[ar]': fields.name_ar, 'name[en]': fields.name_en, sort: fields.sort ?? 0 } as any, token });
}
export async function deleteEventType(id: number, token: string): Promise<ApiResponse<any>> {
  return apiRequest(`/admin/landing-page/event-types/${id}`, { method: 'DELETE', token });
}
export async function reorderEventTypes(items: ReorderItem[], token: string): Promise<ApiResponse<any>> {
  return apiRequest('/admin/landing-page/event-types/reorder?_method=patch', { method: 'POST', body: { items } as any, token });
}
