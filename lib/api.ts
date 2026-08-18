/**
 * Central API client.
 * Base URL is read from NEXT_PUBLIC_API_BASE_URL in .env.local
 * e.g. https://portal.tanalevents.com/api/v1
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
  id: number;
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

/** Field name → list of messages, as returned in `response_status.validation_errors`. */
export type ValidationErrors = Record<string, string[]>;

/**
 * Error thrown by `apiRequest` on a failed response. Extends `Error` so existing
 * `catch (e) { e.message }` call sites keep working, while newer callers can read
 * per-field validation errors and the `data` payload some 422s carry (e.g. the
 * invitation guest-overage confirmation).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly validationErrors: ValidationErrors;
  readonly data: unknown;

  constructor(message: string, status: number, validationErrors: ValidationErrors, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.validationErrors = validationErrors;
    this.data = data;
  }

  /** First message for a field, or undefined — convenient for rendering under inputs. */
  fieldError(field: string): string | undefined {
    return this.validationErrors[field]?.[0];
  }
}

/**
 * Thrown when the API rejects the stored token (HTTP 401).
 *
 * Extends `ApiError` so existing `catch (e) { e.message }` call sites keep
 * working, while server components can tell an expired session apart from a
 * genuine failure and redirect to /login instead of rendering a dead page.
 */
export class UnauthenticatedError extends ApiError {
  constructor(message: string) {
    super(message, 401, {}, null);
    this.name = 'UnauthenticatedError';
  }
}

/**
 * `instanceof` alone is not enough: server and client get separate module
 * instances in a Next build, so a 401 crossing that boundary would not match.
 * The status check is the reliable half.
 */
export function isUnauthenticatedError(e: unknown): e is UnauthenticatedError {
  return e instanceof UnauthenticatedError || (e as { status?: number } | null)?.status === 401;
}

/**
 * Endpoints where a 401 is a legitimate answer rather than an expired session.
 * Signing in with the wrong password answers 401, and force-reloading there
 * would throw away the form's error message before it could be read.
 */
const AUTH_EXEMPT_PATHS = ['/admin/auth/login'];

/**
 * Normalises `response_status.validation_errors` into `Record<field, string[]>`.
 * The API returns either a keyed object or a flat array of messages; the latter
 * is bucketed under `_` since it carries no field association.
 */
export function normaliseValidationErrors(errors: unknown): ValidationErrors {
  if (!errors) return {};
  if (Array.isArray(errors)) {
    return errors.length > 0 ? { _: errors.map(String) } : {};
  }
  if (typeof errors !== 'object') return {};

  const out: ValidationErrors = {};
  Object.entries(errors as Record<string, unknown>).forEach(([field, messages]) => {
    if (Array.isArray(messages)) {
      out[field] = messages.map(String);
    } else if (messages) {
      out[field] = [String(messages)];
    }
  });
  return out;
}

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

  // ── 401 Unauthenticated: drop the stored session and get back to /login ──
  if (res.status === 401 && !AUTH_EXEMPT_PATHS.some((p) => path.startsWith(p))) {
    const message =
      (json as any)?.message ?? 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً';

    if (typeof window !== 'undefined') {
      const { clearAuth } = await import('@/lib/auth');
      clearAuth();
      // Already on /login (or heading there) — redirecting again would loop.
      if (!window.location.pathname.startsWith('/login')) {
        window.location.replace('/login?session=expired');
      }
    }

    /*
     * On the server there is no localStorage, and cookies cannot be written
     * while a component renders. So the token is dropped one step later: the
     * caller catches this and redirects to /login?session=expired, where the
     * middleware expires the cookies and the login page clears localStorage.
     */
    throw new UnauthenticatedError(message);
  }

  if (!res.ok || json.response_status?.error) {
    const validationErrors = normaliseValidationErrors(json.response_status?.validation_errors);

    // Prefer the flattened validation messages, falling back to the top-level msg.
    const flattened = Object.values(validationErrors).flat();
    const message = flattened.length > 0
      ? flattened.join(', ')
      : json?.msg || 'حدث خطأ غير متوقع';

    throw new ApiError(message, res.status, validationErrors, json?.data ?? null);
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
  total_service_orders: DashboardStat;
  upcoming_service_orders: DashboardStat;
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

export interface DashboardUpcomingServiceOrder {
  id: number;
  reference_label: string;
  client_name: string | null;
  service_name: string | null;
  event_date: string;
  event_time: string;
  hall_name: string;
  total_amount: ApiAmount;
  statuses: ServiceOrderStatus[];
  is_barcode_suspended: boolean;
}

export interface DashboardData {
  stats: DashboardStats;
  revenue_chart: DashboardRevenueChart;
  upcoming_service_orders: DashboardUpcomingServiceOrder[];
}

/** GET /admin/dashboard — fetch dashboard stats/charts/upcoming orders */
export async function getDashboardData(
  period: 'this_year' | 'this_month' | 'last_12_months' | 'last_6months' | 'all_time',
  token: string
): Promise<ApiResponse<DashboardData>> {
  return apiRequest<DashboardData>(`/admin/dashboard?period=${period}`, {
    method: 'GET',
    token,
  });
}

/**
 * GET /admin/dashboard/upcoming-service-orders
 * Replaces the `upcoming-events` alias, which is kept only for compatibility.
 */
export async function getDashboardUpcomingServiceOrders(
  token: string,
  perPage = 15
): Promise<ApiResponse<{ items: DashboardUpcomingServiceOrder[] }>> {
  return apiRequest<{ items: DashboardUpcomingServiceOrder[] }>(
    `/admin/dashboard/upcoming-service-orders?per_page=${perPage}`,
    { token }
  );
}

/* ─── Roles ─────────────────────────────────────────────────── */
export interface Role {
  id: number;
  name: string;
  name_ar: string;
  name_en: string;
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
  name_ar: string;
  name_en: string;
  module: string;
  action: string;
  label: string;
  label_ar: string;
  label_en: string;
}

export interface PermissionGroup {
  module: string;
  module_label: string;
  module_label_ar: string;
  module_label_en: string;
  /** @deprecated use module_label_ar / module_label_en */
  label?: string;
  permissions: Permission[];
}

export interface RoleDetail extends Role {
  /** Flat list is no longer returned – the API now returns grouped permissions */
  permissions: PermissionGroup[];
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
export async function getRoleById(id: number, token: string, lang?: string): Promise<ApiResponse<RoleDetail>> {
  const headers = lang ? { 'Accept-Language': lang, lang } : undefined;
  return apiRequest<RoleDetail>(`/admin/roles/${id}`, { token, headers });
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


export interface ApiInvitation {
  id: number;
  /** Null for legacy invitations still attached to an event. */
  service_order_id: number | null;
  service_order_reference: string | null;
  client_id: number;
  client_name: string | null;
  client_phone: string | null;
  client_email: string;
  reference_number: string;
  whatsapp_url: string | null;
  event_name: string | null;
  execution_date: string | null;
  guest_count: number;
  /** Guest allowance from the order's package; null when uncapped. */
  guests_included: number | null;
  is_barcode_suspended: boolean;
  deadline_date: string | null;
  deadline_time: string | null;
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

/**
 * Check-in welcome screen settings. The venue screen is a backend-hosted Blade
 * page — `display_url` is absolute and must be linked verbatim rather than
 * rebuilt from `display_token`, since it points at the API host, not the SPA.
 *
 * `realtime` describes the Pusher channel the Blade page subscribes to; the SPA
 * does not listen to it, so it is here only for completeness.
 */
export interface CheckInDisplay {
  welcome_message: string | null;
  /** False until an admin saves a message — there is no default. */
  is_configured: boolean;
  /** e.g. ["{guest_name}", "{invitation_name}"] */
  placeholders: string[];
  display_url: string;
  display_token: string;
  realtime: {
    channel: string;
    event: string;
  };
}

export interface InvitationDetailData {
  id: number;
  reference_code: string;
  name: string;
  service_order_id: number | null;
  service_order_reference: string | null;
  is_barcode_suspended: boolean;
  guests_included: number | null;
  /** Legacy — populated only for invitations created before the migration. */
  event_id?: number;
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
  /** Absent on invitations with no barcode service, and on legacy records. */
  check_in_display?: CheckInDisplay | null;
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

/*
 * There is no client-side invitation create call any more. Invitations are
 * created by the backend as part of POST /admin/service-orders whenever the
 * order includes the `barcode_invitations` system service, and the new id comes
 * back as `invitation_id` on the order detail.
 */

/** GET /admin/invitations/:id */
export async function getInvitationById(
  id: number,
  token: string
): Promise<ApiResponse<InvitationDetailData>> {
  return apiRequest<InvitationDetailData>(`/admin/invitations/${id}`, { token });
}

/**
 * `service_order_id` is deliberately absent — an invitation cannot be moved to a
 * different order. Guests and send-status have their own endpoints too, so this
 * payload only ever carries invitation metadata plus the design image.
 */
export interface UpdateInvitationPayload {
  name?: string;
  logic_type: 'strict_action' | 'default_accept' | 'view_only';
  /** `YYYY-MM-DD` — must be sent together with `deadline_time`. */
  deadline_date: string;
  /** `HH:mm` — must be sent together with `deadline_date`. */
  deadline_time: string;
  design?: File | null;
}

/**
 * POST /admin/invitations/:id?_method=put — spoofed because the design is a
 * file upload, so the body has to be multipart.
 */
export async function updateInvitation(
  id: number,
  payload: UpdateInvitationPayload,
  token: string
): Promise<ApiResponse<CreateInvitationResponse>> {
  const formData = new FormData();
  if (payload.name) {
    formData.append('name', payload.name);
  }
  formData.append('logic_type', payload.logic_type);
  formData.append('deadline_date', payload.deadline_date);
  formData.append('deadline_time', payload.deadline_time);
  if (payload.design) {
    formData.append('design', payload.design);
  }
  return apiRequest<CreateInvitationResponse>(`/admin/invitations/${id}?_method=put`, {
    method: 'POST',
    body: formData,
    token,
  });
}

/**
 * POST /admin/invitations/:id/upload-design — multipart `design`
 *
 * Replaces the design on an existing invitation. Same payload as the
 * order-creation upload (`uploadInvitationDesign`), but scoped to the
 * invitation, so the backend persists it directly instead of handing back a
 * token. Callers refetch the detail for the cache-busted `design_url` rather
 * than reading anything out of `data`.
 */
export async function replaceInvitationDesign(
  id: number,
  design: File,
  token: string
): Promise<ApiResponse<unknown>> {
  const formData = new FormData();
  formData.append('design', design);
  return apiRequest(`/admin/invitations/${id}/upload-design`, {
    method: 'POST',
    body: formData,
    token,
  });
}

/**
 * PATCH /admin/invitations/:id/check-in-welcome-message
 *
 * Separate from `updateInvitation` on purpose: the invitation is frozen once it
 * is sent, but the welcome message stays editable, so this endpoint bypasses
 * that lock. Requires the `edit-invitation` permission and returns the full
 * detail payload, which callers can drop straight into state.
 *
 * `message` is validated server-side (min 3, max 1000) — the failure comes back
 * as an `ApiError`, so read `fieldError('message')` for the per-field text.
 */
export async function updateInvitationCheckInWelcomeMessage(
  id: number,
  message: string,
  token: string
): Promise<ApiResponse<InvitationDetailData>> {
  return apiRequest<InvitationDetailData>(
    `/admin/invitations/${id}/check-in-welcome-message`,
    { method: 'PATCH', body: { message }, token }
  );
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

/*
 * Guests are addressed through their invitation: the id lives in the path, so
 * no `service_order_id` / `event_id` is ever sent alongside them.
 */

export interface GetInvitationGuestsParams {
  keyword?: string;
  name?: string;
  phone?: string;
  status?: string;
  page?: number;
  per_page?: number;
}

/** GET /admin/invitations/:invitationId/guests */
export async function getInvitationGuests(
  invitationId: number,
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
  const qs = query.toString();
  return apiRequest<PaginatedItems<InvitationGuest>>(
    `/admin/invitations/${invitationId}/guests${qs ? `?${qs}` : ''}`,
    { token }
  );
}

export interface InvitationGuestPayload {
  name: string;
  country_code: string;
  phone: string;
  have_whatsapp?: boolean;
}

const guestFormData = (payload: InvitationGuestPayload) => {
  const fd = new FormData();
  fd.append('name', payload.name);
  fd.append('country_code', payload.country_code);
  fd.append('phone', payload.phone);
  fd.append('have_whatsapp', payload.have_whatsapp ? '1' : '0');
  return fd;
};

/** POST /admin/invitations/:invitationId/guests */
export async function createInvitationGuest(
  invitationId: number,
  payload: InvitationGuestPayload,
  token: string
): Promise<ApiResponse<InvitationGuest>> {
  return apiRequest<InvitationGuest>(`/admin/invitations/${invitationId}/guests`, {
    method: 'POST',
    body: guestFormData(payload),
    token,
  });
}

/** GET /admin/invitations/:invitationId/guests/:guestId */
export async function getInvitationGuest(
  invitationId: number,
  guestId: number,
  token: string
): Promise<ApiResponse<InvitationGuest>> {
  return apiRequest<InvitationGuest>(
    `/admin/invitations/${invitationId}/guests/${guestId}`,
    { token }
  );
}

/** POST /admin/invitations/:invitationId/guests/:guestId?_method=put */
export async function updateInvitationGuest(
  invitationId: number,
  guestId: number,
  payload: InvitationGuestPayload,
  token: string
): Promise<ApiResponse<InvitationGuest>> {
  return apiRequest<InvitationGuest>(
    `/admin/invitations/${invitationId}/guests/${guestId}?_method=put`,
    { method: 'POST', body: guestFormData(payload), token }
  );
}

/** DELETE /admin/invitations/:invitationId/guests/:guestId */
export async function deleteInvitationGuest(
  invitationId: number,
  guestId: number,
  token: string
): Promise<ApiResponse<unknown>> {
  return apiRequest(
    `/admin/invitations/${invitationId}/guests/${guestId}`,
    { method: 'DELETE', token }
  );
}

/**
 * Shape of a partially-failed import. The backend contract for this is not yet
 * confirmed, so the fields are all optional and the UI degrades to `msg`.
 */
export interface InvitationGuestImportResult {
  imported_count?: number;
  failed_count?: number;
  errors?: Array<{ row?: number; message?: string }>;
}

/** POST /admin/invitations/:invitationId/guests/import — multipart */
export async function importInvitationGuests(
  invitationId: number,
  file: File,
  token: string
): Promise<ApiResponse<InvitationGuestImportResult>> {
  const fd = new FormData();
  fd.append('file', file);
  return apiRequest<InvitationGuestImportResult>(
    `/admin/invitations/${invitationId}/guests/import`,
    { method: 'POST', body: fd, token }
  );
}

/** Payload of the 422 returned when the guest count exceeds the package allowance. */
export interface InvitationOverageError {
  guest_count: number;
  guests_included: number;
  requires_confirmation: true;
}

/** Narrows an ApiError to the guest-overage confirmation case. */
export function isInvitationOverageError(err: unknown): err is ApiError & { data: InvitationOverageError } {
  return (
    err instanceof ApiError &&
    typeof err.data === 'object' &&
    err.data !== null &&
    (err.data as InvitationOverageError).requires_confirmation === true
  );
}

/**
 * PATCH /admin/invitations/:id/send
 *
 * Rejected with a 422 carrying `requires_confirmation` when the guest count
 * exceeds the package allowance — retry with `forceOverage` after the user
 * confirms. Also blocked when the barcode is suspended, payment is incomplete,
 * or the event has already started.
 */
export async function sendInvitation(
  id: number,
  token: string,
  forceOverage = false
): Promise<ApiResponse<CreateInvitationResponse>> {
  const qs = forceOverage ? '?force_overage=1' : '';
  return apiRequest<CreateInvitationResponse>(`/admin/invitations/${id}/send${qs}`, {
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
  /**
   * Packages attached to the service. A service with none cannot be ordered —
   * the package sets the price. Absent on payloads predating the field.
   */
  packages_count?: number;
  /** System services are created by the backend and cannot be deleted. */
  is_system: boolean;
  /** e.g. "barcode_invitations" — identifies special-cased services. */
  system_key: string | null;
}

/** Services whose packages must declare a guest allowance. */
export const BARCODE_INVITATIONS_KEY = 'barcode_invitations';

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

export interface ApiServicePackage {
  id: number;
  service_id: number;
  /** Localised display name resolved by the API from name_ar / name_en. */
  name: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  price: string;
  sort_order: number;
  /** Required for packages of the barcode-invitations service. */
  guests_included: number | null;
  option_values?: Array<{
    service_option_id: number;
    service_option_value_id: number;
  }>;
}

export interface ApiServiceAddon {
  id: number;
  service_id: number;
  name_ar: string;
  name_en: string;
  price: string;
  sort_order: number;
}

export interface ApiServiceDetail extends ApiService {
  options: ApiServiceOption[];
  packages: ApiServicePackage[];
  addons: ApiServiceAddon[];
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

/* ─── Service Packages ─── */

export interface ServicePackagePayload {
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  price: number;
  sort_order?: number;
  /** Mandatory when the parent service is the barcode-invitations system service. */
  guests_included?: number;
}

/** GET /admin/services/:serviceId/packages */
export async function getServicePackages(
  serviceId: number,
  token: string
): Promise<ApiResponse<PaginatedItems<ApiServicePackage>>> {
  return apiRequest<PaginatedItems<ApiServicePackage>>(
    `/admin/services/${serviceId}/packages`,
    { token }
  );
}

/** POST /admin/services/:serviceId/packages */
export async function createServicePackage(
  serviceId: number,
  payload: ServicePackagePayload,
  token: string
): Promise<ApiResponse<ApiServicePackage>> {
  return apiRequest<ApiServicePackage>(
    `/admin/services/${serviceId}/packages`,
    { method: 'POST', body: payload as any, token }
  );
}

/** POST /admin/services/:serviceId/packages/:packageId?_method=put */
export async function updateServicePackage(
  serviceId: number,
  packageId: number,
  payload: ServicePackagePayload,
  token: string
): Promise<ApiResponse<ApiServicePackage>> {
  return apiRequest<ApiServicePackage>(
    `/admin/services/${serviceId}/packages/${packageId}?_method=put`,
    { method: 'POST', body: payload as any, token }
  );
}

/** DELETE /admin/services/:serviceId/packages/:packageId */
export async function deleteServicePackage(
  serviceId: number,
  packageId: number,
  token: string
): Promise<ApiResponse<unknown>> {
  return apiRequest(`/admin/services/${serviceId}/packages/${packageId}`, {
    method: 'DELETE',
    token,
  });
}

/* ─── Service Addons ─── */

export interface ServiceAddonPayload {
  name_ar: string;
  name_en: string;
  price: number;
  sort_order?: number;
}

/** GET /admin/services/:serviceId/addons */
export async function getServiceAddons(
  serviceId: number,
  token: string
): Promise<ApiResponse<PaginatedItems<ApiServiceAddon>>> {
  return apiRequest<PaginatedItems<ApiServiceAddon>>(
    `/admin/services/${serviceId}/addons`,
    { token }
  );
}

/** POST /admin/services/:serviceId/addons */
export async function createServiceAddon(
  serviceId: number,
  payload: ServiceAddonPayload,
  token: string
): Promise<ApiResponse<ApiServiceAddon>> {
  return apiRequest<ApiServiceAddon>(
    `/admin/services/${serviceId}/addons`,
    { method: 'POST', body: payload as any, token }
  );
}

/** POST /admin/services/:serviceId/addons/:addonId?_method=put */
export async function updateServiceAddon(
  serviceId: number,
  addonId: number,
  payload: ServiceAddonPayload,
  token: string
): Promise<ApiResponse<ApiServiceAddon>> {
  return apiRequest<ApiServiceAddon>(
    `/admin/services/${serviceId}/addons/${addonId}?_method=put`,
    { method: 'POST', body: payload as any, token }
  );
}

/** DELETE /admin/services/:serviceId/addons/:addonId */
export async function deleteServiceAddon(
  serviceId: number,
  addonId: number,
  token: string
): Promise<ApiResponse<unknown>> {
  return apiRequest(`/admin/services/${serviceId}/addons/${addonId}`, {
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

/**
 * Money fields are serialised as strings by the Laravel resources but the spec
 * documents them as numbers — accept both and normalise at the render site.
 */
export type ApiAmount = string | number;

/** Safe numeric coercion for the `ApiAmount` union. */
export function parseAmount(value: ApiAmount | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export interface ApiServiceOrderItem {
  id: number;
  reference_number: number;
  reference_label: string;
  service_name: string | null;
  client_name: string | null;
  client_phone: string | null;
  event_date: string | null;
  total_amount: ApiAmount;
  currency: string;
  statuses: ServiceOrderStatus[];
  has_pending_second_payment: boolean;
  /** True when the order includes the `barcode_invitations` system service. */
  has_barcode_service: boolean;
  is_barcode_suspended: boolean;
  /** Set only when `has_barcode_service` — links straight to /invitations/:id. */
  invitation_id: number | null;
  whatsapp_url: string | null;
}

export interface ServiceOrdersResponse {
  items: ApiServiceOrderItem[];
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
  };
  statuses: ServiceOrderStatus[];
  payment_statuses: ServiceOrderStatus[];
}

/** Values accepted by the `status` filter on the service-orders list. */
export type ServiceOrderListStatus =
  | 'upcoming'
  | 'rejected'
  | 'installments'
  | 'paid'
  | 'unpaid'
  | 'cancelled';

export interface GetServiceOrdersParams {
  page?: number;
  per_page?: number;
  keyword?: string;
  status?: ServiceOrderListStatus | '';
  client_id?: number;
  order_by?: string;
  order?: 'ASC' | 'DESC';
  /** `YYYY-MM-DD` — returns only orders whose event_date falls on that day. */
  date?: string;
}

/** GET /admin/service-orders */
export async function getAdminServiceOrders(
  token: string,
  params?: GetServiceOrdersParams
): Promise<ApiResponse<ServiceOrdersResponse>> {
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.per_page !== undefined) query.set('per_page', String(params.per_page));
  if (params?.keyword) query.set('filters[keyword]', params.keyword);
  if (params?.status) query.set('filters[status]', params.status);
  if (params?.client_id !== undefined) query.set('filters[client_id]', String(params.client_id));
  if (params?.order_by !== undefined) query.set('filters[order_by]', params.order_by);
  if (params?.order !== undefined) query.set('filters[order]', params.order);
  if (params?.date) query.set('filters[date]', params.date);

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

/** Employee attached to the order as a whole (`order_employees[]`). */
export interface ApiServiceOrderEmployee {
  id: number;
  name: string;
  reference_label?: string;
  full_phone?: string;
}

/**
 * Employee attached to a single item. The detail endpoint returns the full set
 * in `employees[]`; the singular `employee` is the first of them.
 */
export interface ApiServiceOrderItemEmployee {
  type: 'employee' | 'freelancer';
  id?: number;
  employee_id?: number;
  name?: string;
  username?: string;
  country_code?: string;
  phone?: string;
  full_phone?: string;
  reference_label?: string;
}

/** Client data embedded in the order — replaces the standalone clients module. */
export interface ApiServiceOrderClient {
  name: string | null;
  country_code: string | null;
  phone: string | null;
  alt_country_code: string | null;
  alt_phone: string | null;
  data_status: 'complete' | 'incomplete' | null;
  completed_at: string | null;
  whatsapp_url: string | null;
  legacy_client_id: number | null;
  /**
   * Public, tokenised page where the client fills in their own name, address
   * and hall data. Present while `data_status === 'incomplete'`.
   */
  form_url?: string | null;
  /** WhatsApp deep link that sends `form_url` to the client. */
  form_whatsapp_url?: string | null;
}

export interface ApiServiceOrderDetailItem {
  id: number;
  service_id: number;
  service_package_id: number | null;
  service: {
    id: number;
    name: string;
    description: string;
    image: string | null;
    sort_order: number;
    system_key?: string | null;
  };
  /** Primary photobooth design image; both fields currently point to the same URL. */
  image?: string | null;
  design_url?: string | null;
  package?: ApiServicePackage | null;
  base_price: ApiAmount;
  addon_total_price: ApiAmount;
  guests_included: number | null;
  price: ApiAmount;
  notes: string | null;
  sort: number;
  employee: ApiServiceOrderItemEmployee | null;
  /** Every employee assigned to the item. Absent on older payloads. */
  employees?: ApiServiceOrderItemEmployee[];
  /** Ids mirroring `employees[]`. Absent on older payloads. */
  employee_ids?: number[];
  addons?: ApiServiceOrderDetailAddon[];
  options: ApiServiceOrderDetailOption[];
}

/**
 * Addon saved against an order item. The backend has shipped both shapes, so
 * `addon_id` is preferred and `id` is the fallback when mapping back to input.
 */
export interface ApiServiceOrderDetailAddon {
  id: number;
  addon_id?: number;
  name?: string;
  price?: ApiAmount;
}

export interface ApiServiceOrderDetail {
  id: number;
  reference_number: number;
  reference_label: string;
  client_id: number | null;
  client: ApiServiceOrderClient;
  legacy_client?: unknown;
  event_date: string;
  event_time: string;
  event_end_time: string;
  /** Aliases of event_time / event_end_time. */
  start_time: string;
  end_time: string;
  hall_name: string;
  location_url: string | null;
  /**
   * Map fields, all optional and returned only by the show endpoint — the list
   * endpoint omits them. Decimals may arrive as strings; normalise with
   * `toCoord` from `@/lib/map-location`.
   */
  map_desc: string | null;
  lat: number | string | null;
  lng: number | string | null;
  governorate: string | null;
  block_number: string | null;
  street_name: string | null;
  house_number: string | null;
  address_notes: string | null;
  client_notes: string | null;
  execution_notes: string | null;
  portal_url: string;
  cancelled_at: string | null;
  cancelled_by: number | null;
  /** How the order was created. Absent on orders predating the two-mode flow. */
  creation_mode?: 'full' | 'quick';
  /** True while the order still contains the `barcode_invitations` system service. */
  has_barcode_service?: boolean;
  /**
   * Set when the order includes the `barcode_invitations` system service — the
   * backend creates the invitation as part of the create request.
   */
  invitation_id?: number | null;
  order_employees: ApiServiceOrderEmployee[];
  statuses: ServiceOrderStatus[];
  is_paid: boolean;
  payment_type: string;
  paid_amount: ApiAmount;
  first_installment_amount: ApiAmount | null;
  second_installment_amount: ApiAmount | null;
  second_installment_due_date: string | null;
  second_payment_status: string | null;
  has_pending_second_payment: boolean;
  is_barcode_suspended: boolean;
  installment_step: string | null;
  available_payment_statuses: ServiceOrderStatus[];
  total_amount: ApiAmount;
  notes: string | null;
  primary_service_name: { ar: string; en: string } | null;
  items: ApiServiceOrderDetailItem[];
  items_count?: number;
  whatsapp_url: string | null;
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

/**
 * DELETE /admin/service-orders/:id
 * Only valid for unpaid orders — use `cancelAdminServiceOrder` once any amount
 * has been paid.
 */
export async function deleteAdminServiceOrder(
  id: number,
  token: string
): Promise<ApiResponse<any>> {
  return apiRequest<any>(`/admin/service-orders/${id}`, { method: 'DELETE', token });
}

/**
 * POST /admin/service-orders/:id/cancel
 * Sets the order to `cancelled` and suspends the barcode. Does not refund.
 */
export async function cancelAdminServiceOrder(
  id: number,
  token: string
): Promise<ApiResponse<ApiServiceOrderDetail>> {
  return apiRequest<ApiServiceOrderDetail>(`/admin/service-orders/${id}/cancel`, {
    method: 'POST',
    body: { confirm: true },
    token,
  });
}

/**
 * POST /admin/service-orders/:id/payment-status?_method=patch
 *
 * `firstInstallmentAmount` is required by `installments` and meaningless for
 * every other status — the amount already paid, with the remainder owed as the
 * second instalment.
 */
export async function updateServiceOrderPaymentStatus(
  id: number,
  status: 'paid' | 'unpaid' | 'installments' | "rejected",
  token: string,
  firstInstallmentAmount?: number
): Promise<ApiResponse<unknown>> {
  const formData = new FormData();
  formData.append('status', status);
  if (status === 'installments' && firstInstallmentAmount != null) {
    formData.append('first_installment_amount', String(firstInstallmentAmount));
  }
  return apiRequest(`/admin/service-orders/${id}/payment-status?_method=patch`, {
    method: 'POST',
    body: formData,
    token,
  });
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
  /**
   * Required by backend validation even when `employee_ids` is supplied —
   * always send the first entry of `employee_ids` here.
   */
  employee_id?: number;
  employee_ids?: number[];
  username?: string;
  name?: string;
  country_code?: string;
  phone?: string;
}

export interface CreateServiceOrderItem {
  service_id: number;
  service_package_id?: number;
  /** Single-use token returned by `uploadServiceOrderItemDesign`. Photobooth only. */
  design_token?: string;
  addon_ids?: number[];
  /** Optional once a `service_package_id` is chosen — the package carries them. */
  options?: CreateServiceOrderItemOption[];
  price?: number;
  employee?: CreateServiceOrderItemEmployee;
  notes?: string;
}

/** Embedded client — send this when there is no legacy `client_id`. */
export interface CreateServiceOrderClient {
  name?: string;
  country_code?: string;
  phone?: string;
  alt_country_code?: string;
  alt_phone?: string;
}

/** Fields shared by create and update. */
export interface ServiceOrderBasePayload {
  client_id?: number;
  client?: CreateServiceOrderClient;
  event_date: string;
  event_time: string;
  /**
   * Must be later than `event_time` when present. Optional only for
   * `creation_mode: 'quick'`, where the client supplies it through their form.
   */
  event_end_time?: string;
  /** Optional only for `creation_mode: 'quick'` — see `event_end_time`. */
  hall_name?: string;
  location_url?: string;
  /** Free-text description of the spot on the map (max 500 chars). */
  map_desc?: string;
  /** −90…90 */
  lat?: number;
  /** −180…180 */
  lng?: number;
  governorate?: string;
  block_number?: string;
  street_name?: string;
  house_number?: string;
  address_notes?: string;
  execution_notes?: string;
  notes?: string;
  order_employee_ids?: number[];
  items: CreateServiceOrderItem[];
}

export interface CreateServiceOrderPayload extends ServiceOrderBasePayload {
  /**
   * `full`  — every detail supplied by the admin.
   * `quick` — only phone + date + start time + items; the backend WhatsApps the
   *           client a form for the rest and marks the order data-incomplete.
   * Defaults to `full` server-side when omitted.
   */
  creation_mode?: 'full' | 'quick';
  /**
   * From `uploadInvitationDesign`. Required when `items[]` includes the
   * `barcode_invitations` system service; must be omitted otherwise.
   */
  invitation_design_token?: string;
  /** Create only — payment cannot be changed through the update endpoint. */
  is_paid: 0 | 1 | boolean;
  payment_type: 'single' | 'two_installments' | string;
  first_installment_amount?: number;
}

/**
 * Update accepts everything create does except the payment fields, which move
 * through `updateServiceOrderPaymentStatus`. `items[]` is a **full replace** —
 * always send the complete array you want to end up with.
 */
export interface UpdateServiceOrderPayload extends ServiceOrderBasePayload {
  /** Omit to keep the order's existing mode. */
  creation_mode?: 'full' | 'quick';
  /**
   * Required only when the QR service is being added to an order that has no
   * design yet. Must be omitted when the order already has one.
   */
  invitation_design_token?: string;
}

/** POST /admin/service-orders — body sent as JSON */
export async function createAdminServiceOrder(
  payload: CreateServiceOrderPayload,
  token: string
): Promise<ApiResponse<ApiServiceOrderDetail>> {
  return apiRequest<ApiServiceOrderDetail>('/admin/service-orders', {
    method: 'POST',
    body: payload as any,
    token,
  });
}

/**
 * PUT /admin/service-orders/:id — a real PUT, not the `?_method=put` spoof used
 * for the multipart endpoints, because this body is plain JSON.
 */
export async function updateAdminServiceOrder(
  id: number,
  payload: UpdateServiceOrderPayload,
  token: string
): Promise<ApiResponse<ApiServiceOrderDetail>> {
  return apiRequest<ApiServiceOrderDetail>(`/admin/service-orders/${id}`, {
    method: 'PUT',
    body: payload as any,
    token,
  });
}

export interface InvitationDesignUploadResponse {
  /** Single-use; pass as `invitation_design_token` when creating the order. */
  design_token: string;
  preview_url: string;
  /** ISO timestamp — the token is valid for roughly an hour. */
  expires_at: string;
}

export interface ServiceOrderItemDesignUploadResponse {
  /** Single-use; pass inside the matching `items[]` entry as `design_token`. */
  design_token: string;
  preview_url: string;
  /** ISO timestamp — the token is valid for roughly an hour. */
  expires_at: string;
}

/** POST /admin/service-orders/item-design — upload a photobooth item design. */
export async function uploadServiceOrderItemDesign(
  design: File,
  token: string
): Promise<ApiResponse<ServiceOrderItemDesignUploadResponse>> {
  const formData = new FormData();
  formData.append('design', design);
  return apiRequest<ServiceOrderItemDesignUploadResponse>('/admin/service-orders/item-design', {
    method: 'POST',
    body: formData,
    token,
  });
}

/**
 * POST /admin/service-orders/invitation-design — multipart
 *
 * The design must be uploaded *before* the order is created; the returned token
 * is then sent as `invitation_design_token`. Required whenever `items[]`
 * contains the `barcode_invitations` system service.
 *
 * Order creation only — replacing the design on an existing invitation goes
 * through `replaceInvitationDesign`.
 */
export async function uploadInvitationDesign(
  design: File,
  token: string
): Promise<ApiResponse<InvitationDesignUploadResponse>> {
  const formData = new FormData();
  formData.append('design', design);
  return apiRequest<InvitationDesignUploadResponse>('/admin/service-orders/invitation-design', {
    method: 'POST',
    body: formData,
    token,
  });
}

export interface ServiceOrderCalculatedTotal {
  total_amount: ApiAmount;
  currency?: string;
  items?: Array<{
    service_id: number;
    base_price: ApiAmount;
    addon_total_price: ApiAmount;
    price: ApiAmount;
  }>;
}

/** POST /admin/service-orders/calculate-total — price preview before saving */
export async function calculateServiceOrderTotal(
  items: CreateServiceOrderItem[],
  token: string
): Promise<ApiResponse<ServiceOrderCalculatedTotal>> {
  return apiRequest<ServiceOrderCalculatedTotal>('/admin/service-orders/calculate-total', {
    method: 'POST',
    body: { items } as any,
    token,
  });
}

/* ─── Service order item attachments ────────────────────────── */
export interface ApiServiceOrderItemAttachment {
  id: number;
  service_order_item_id: number;
  file_path: string;
  file_url: string;
  original_name: string;
  mime_type: string;
  notes: string | null;
  created_at: string;
}

/** GET /admin/service-orders/:id/items/:itemId/attachments */
export async function getServiceOrderItemAttachments(
  orderId: number,
  itemId: number,
  token: string
): Promise<ApiResponse<{ items: ApiServiceOrderItemAttachment[] }>> {
  return apiRequest<{ items: ApiServiceOrderItemAttachment[] }>(
    `/admin/service-orders/${orderId}/items/${itemId}/attachments`,
    { token }
  );
}

/** POST /admin/service-orders/:id/items/:itemId/attachments — multipart */
export async function uploadServiceOrderItemAttachment(
  orderId: number,
  itemId: number,
  file: File,
  token: string,
  notes?: string
): Promise<ApiResponse<ApiServiceOrderItemAttachment>> {
  const formData = new FormData();
  formData.append('file', file);
  if (notes) formData.append('notes', notes);
  return apiRequest<ApiServiceOrderItemAttachment>(
    `/admin/service-orders/${orderId}/items/${itemId}/attachments`,
    { method: 'POST', body: formData, token }
  );
}

/** DELETE /admin/service-orders/:id/items/:itemId/attachments/:attachmentId */
export async function deleteServiceOrderItemAttachment(
  orderId: number,
  itemId: number,
  attachmentId: number,
  token: string
): Promise<ApiResponse<unknown>> {
  return apiRequest(
    `/admin/service-orders/${orderId}/items/${itemId}/attachments/${attachmentId}`,
    { method: 'DELETE', token }
  );
}

export interface ApiFinancialRecordItem {
  id: number;
  reference_number: number;
  reference_code: string;
  client_id: number;
  client_name: string;
  client_phone: string;
  /** Records are linked to service orders; the event fields persist for legacy rows. */
  service_order_id: number | null;
  service_order_reference: string | null;
  event_id?: number;
  event_name?: string | null;
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
  status: 'paid' | 'unpaid' | 'installments' | "cancelled";
  record_date: string;
  notes: string | null;
  client: {
    id: number;
    name: string;
    phone: string;
    full_phone: string;
    email: string | null;
  };
  /** Present for records created against a service order. */
  service_order?: {
    id: number;
    reference_number: number;
    reference_label: string;
    event_date: string;
    event_time: string;
    hall_name?: string;
    status?: string;
  } | null;
  /** Legacy shape, still returned for pre-migration records. */
  event?: {
    id: number;
    reference_number: number;
    reference_label: string;
    name: string;
    event_date: string;
    event_time: string;
    status: string;
  } | null;
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
  title: string;
  subtitle: string;
  primary_cta_label: string;
  primary_cta_url: string;
  secondary_cta_label: string;
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
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
}

export interface LandingFeature {
  id: number;
  icon: string;
  icon_url?: string;
  title: string;
  description: string;
  sort: number;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
}

export interface LandingPortfolioItem {
  id: number;
  /** Bare stored filename, e.g. "1785396481_4675.webp" — not renderable on its own. */
  image: string | null;
  /** Absolute URL for the stored image; this is what `next/image` needs. */
  image_url: string | null;
  /** Legacy single-locale name resolved from `Accept-Language`; absent now that the API returns both locales. */
  name?: string;
  sort: number;
  name_ar: string;
  name_en: string;
}

export interface LandingSocialLink {
  id: number;
  platform: string;
  url: string;
  sort: number;
  label_ar: string | null;
  label_en: string | null;
}

export interface LandingFooter {
  id: number;
  brand_name_ar: string;
  brand_name_en: string;
  tagline_ar: string;
  tagline_en: string;
  description_ar: string;
  description_en: string;
  about_url?: string | null;
  privacy_url?: string | null;
  terms_url?: string | null;
  copyright: string;
  logo_url: string | null;
}

export interface LandingContact {
  id: number;
  whatsapp_country_code: string;
  whatsapp_phone: string;
  whatsapp_full_number: string;
  office_address_ar: string;
  office_address_en: string;
  google_maps_url: string;
  social_links: LandingSocialLink[];
}

export interface LandingEventType {
  id: number;
  name?: string;
  name_ar: string;
  name_en: string;
  sort: number;
}

// ── Helper ───────────────────────────────────────────────────────────────────
interface ReorderItem { id: number; sort: number }

// ── Hero ─────────────────────────────────────────────────────────────────────
export async function getLandingHero(token: string, lang?: string): Promise<ApiResponse<LandingHero>> {
  const headers = lang ? { 'Accept-Language': lang, lang } : undefined;
  return apiRequest<LandingHero>('/admin/landing-page/hero', { token, headers });
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
export async function getLandingHowItWorks(token: string, lang?: string): Promise<ApiResponse<{ items: LandingHowItWorksStep[] }>> {
  const headers = lang ? { 'Accept-Language': lang, lang } : undefined;
  return apiRequest('/admin/landing-page/how-it-works', { token, headers });
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

export async function getLandingFeatures(token: string, lang?: string): Promise<ApiResponse<{ items: LandingFeature[] }>> {
  const headers = lang ? { 'Accept-Language': lang, lang } : undefined;
  return apiRequest('/admin/landing-page/features', { token, headers });
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
export async function getLandingPortfolio(token: string, lang?: string): Promise<ApiResponse<{ items: LandingPortfolioItem[] }>> {
  const headers = lang ? { 'Accept-Language': lang, lang } : undefined;
  return apiRequest('/admin/landing-page/portfolio', { token, headers });
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
/** Body shape both create and update post: `{ name_ar, name_en, sort }` as flat JSON. */
function eventTypeBody(fields: { name_ar: string; name_en: string; sort?: number }) {
  return {
    name_ar: fields.name_ar,
    name_en: fields.name_en,
    sort: fields.sort ?? 0,
  };
}
export async function createEventType(fields: { name_ar: string; name_en: string; sort?: number }, token: string): Promise<ApiResponse<LandingEventType>> {
  return apiRequest('/admin/landing-page/event-types', { method: 'POST', body: eventTypeBody(fields), token });
}
export async function updateEventType(id: number, fields: { name_ar: string; name_en: string; sort?: number }, token: string): Promise<ApiResponse<LandingEventType>> {
  return apiRequest(`/admin/landing-page/event-types/${id}?_method=put`, { method: 'POST', body: eventTypeBody(fields), token });
}
export async function deleteEventType(id: number, token: string): Promise<ApiResponse<any>> {
  return apiRequest(`/admin/landing-page/event-types/${id}`, { method: 'DELETE', token });
}
export async function reorderEventTypes(items: ReorderItem[], token: string): Promise<ApiResponse<any>> {
  return apiRequest('/admin/landing-page/event-types/reorder?_method=patch', { method: 'POST', body: { items } as any, token });
}

// ── Admin Settings ─────────────────────────────────────────────────────────────

export interface SettingsData {
  privacy_policy: { ar: string; en: string };
  terms_conditions: { ar: string; en: string };
  about_us: { ar: string; en: string };
}

export async function getSettings(token: string): Promise<ApiResponse<SettingsData>> {
  return apiRequest<SettingsData>('/admin/settings', { token });
}

export async function updateSettings(
  fields: {
    privacy_policy_ar?: string;
    privacy_policy_en?: string;
    terms_conditions_ar?: string;
    terms_conditions_en?: string;
    about_us_ar?: string;
    about_us_en?: string;
  },
  token: string
): Promise<ApiResponse<SettingsData>> {
  const fd = new FormData();
  if (fields.privacy_policy_ar !== undefined) fd.append('privacy_policy[ar]', fields.privacy_policy_ar);
  if (fields.privacy_policy_en !== undefined) fd.append('privacy_policy[en]', fields.privacy_policy_en);
  if (fields.terms_conditions_ar !== undefined) fd.append('terms_conditions[ar]', fields.terms_conditions_ar);
  if (fields.terms_conditions_en !== undefined) fd.append('terms_conditions[en]', fields.terms_conditions_en);
  if (fields.about_us_ar !== undefined) fd.append('about_us[ar]', fields.about_us_ar);
  if (fields.about_us_en !== undefined) fd.append('about_us[en]', fields.about_us_en);
  return apiRequest<SettingsData>('/admin/settings?_method=put', { method: 'POST', body: fd, token });
}
