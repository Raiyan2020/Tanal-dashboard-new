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
    validation_errors: string[];
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
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, token } = options;

  const headers: HeadersInit = {
    Accept: 'application/json',
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

  const json: ApiResponse<T> = await res.json();

  if (!res.ok || json.response_status?.error) {
    const message =
      json?.msg ||
      (json.response_status?.validation_errors?.length
        ? json.response_status.validation_errors.join(', ')
        : 'حدث خطأ غير متوقع');
    throw new Error(message);
  }

  return json;
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

  return apiRequest<Admin>('/admin/auth/profile', {
    method: 'POST',
    body: formData,
    token,
  });
}
