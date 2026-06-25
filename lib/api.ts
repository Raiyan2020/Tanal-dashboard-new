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
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown> | FormData;
  token?: string;
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
  const { method = 'GET', body, token } = options;

  let storedLang = 'ar';
  if (typeof window !== 'undefined') {
    storedLang = localStorage.getItem('tanal_lang') || 'ar';
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': storedLang,
    lang: storedLang,
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
    const key = `${path}::${token || ''}`;
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




