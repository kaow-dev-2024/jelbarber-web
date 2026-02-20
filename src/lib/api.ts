import { AuthUser } from '@/components/auth/AuthProvider';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.0.205:4000/api';

export class ApiError extends Error {
  status: number;
  details?: string;

  constructor(status: number, message: string, details?: string) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {})
    }
  });

  if (res.status === 204) {
    return null as T;
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.message || res.statusText;
    throw new ApiError(res.status, message, text);
  }

  return data as T;
}

export async function loginRequest(email: string, password: string) {
  return apiFetch<{ token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export async function registerRequest(payload: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: string;
}) {
  return apiFetch<{ id: number; email: string; name: string; role: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export type EntityRecord = Record<string, unknown> & { id: number };

export type ListEntitiesOptions = {
  limit?: number;
  offset?: number;
  page?: number;
};

export async function listEntities<T extends EntityRecord>(
  endpoint: string,
  token: string,
  options: ListEntitiesOptions = {}
) {
  const params = new URLSearchParams();
  if (typeof options.limit === 'number') params.set('limit', String(options.limit));
  if (typeof options.offset === 'number') params.set('offset', String(options.offset));
  if (typeof options.page === 'number') params.set('page', String(options.page));
  const query = params.toString();
  return apiFetch<T[]>(`/${endpoint}${query ? `?${query}` : ''}`, { token });
}

export async function createEntity<T extends EntityRecord>(
  endpoint: string,
  token: string,
  payload: Record<string, unknown>
) {
  return apiFetch<T>(`/${endpoint}`, { token, method: 'POST', body: JSON.stringify(payload) });
}

export async function updateEntity<T extends EntityRecord>(
  endpoint: string,
  token: string,
  id: number,
  payload: Record<string, unknown>
) {
  return apiFetch<T>(`/${endpoint}/${id}`, { token, method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteEntity(endpoint: string, token: string, id: number) {
  return apiFetch<void>(`/${endpoint}/${id}`, { token, method: 'DELETE' });
}

export function decodeJwtPayload(token: string | null): AuthUser | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const data = JSON.parse(json);
    return { id: data.id, email: data.email, role: data.role, exp: data.exp };
  } catch {
    return null;
  }
}
