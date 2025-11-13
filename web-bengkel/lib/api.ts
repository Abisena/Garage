'use client';

import { PortalBootstrap, PortalBootstrapFilters, PortalNavigationItem, PortalUserProfile } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const getBaseUrl = () => {
  const base = process.env.NEXT_PUBLIC_PRAVENYA_URL;
  if (!base) {
    throw new Error('NEXT_PUBLIC_PRAVENYA_URL is not configured');
  }
  return base.replace(/\/$/, '');
};

interface RequestOptions extends RequestInit {
  rawBody?: BodyInit | null;
}

async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path}`;
  const headers = new Headers(options.headers);
  let body = options.body;

  if (options.rawBody !== undefined) {
    body = options.rawBody ?? undefined;
  } else if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof URLSearchParams) && !(body instanceof Blob)) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }

  const response = await fetch(url, {
    method: options.method || 'POST',
    credentials: 'include',
    ...options,
    headers,
    body,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error('Permintaan API gagal');
    }
    return null as T;
  }

  const payloadObject = isRecord(payload) ? payload : undefined;

  if (!response.ok || payloadObject?.exc || payloadObject?.exception) {
    const message =
      payloadObject?.message || payloadObject?._server_messages || payloadObject?.exc || 'Permintaan API gagal';
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  if (payloadObject && Object.prototype.hasOwnProperty.call(payloadObject, 'message')) {
    return payloadObject.message as T;
  }

  return payload as T;
}

export async function loginPortal(credentials: { username: string; password: string }): Promise<void> {
  const body = new URLSearchParams();
  body.append('usr', credentials.username);
  body.append('pwd', credentials.password);
  await apiRequest('/api/method/login', {
    method: 'POST',
    rawBody: body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
}

export async function logoutPortal(): Promise<void> {
  try {
    await apiRequest('/api/method/logout', { method: 'POST' });
  } catch {
    // Ignore errors when logging out, session might already be expired.
  }
}

export async function fetchSessionUser(): Promise<PortalUserProfile> {
  const userId = await apiRequest<string>('/api/method/frappe.auth.get_logged_user', { method: 'GET' });
  const detail = await apiRequest<{ message: { full_name?: string; email?: string } }>(
    '/api/method/frappe.client.get_value',
    {
      body: {
        doctype: 'User',
        filters: { name: userId },
        fieldname: ['full_name', 'email'],
      },
    },
  );
  const info = detail?.message || {};
  return {
    id: userId,
    fullName: info.full_name || userId,
    email: info.email || userId,
  };
}

export async function fetchPortalBootstrap(filters?: PortalBootstrapFilters): Promise<PortalBootstrap> {
  return apiRequest<PortalBootstrap>('/api/method/garage.api.portal.portal_bootstrap', {
    body: filters || {},
  });
}

export async function fetchPortalNavigation(): Promise<PortalNavigationItem[]> {
  const response = await apiRequest<{ items: PortalNavigationItem[] }>(
    '/api/method/garage.api.auth.get_portal_navigation',
    {},
  );
  return response?.items || [];
}

export async function registerCustomerVehicle(payload: Record<string, unknown>): Promise<unknown> {
  return apiRequest('/api/method/garage.api.portal.register_customer_vehicle', {
    body: { payload },
  });
}

export async function updateSparePartRequestStatus(name: string, action: string): Promise<unknown> {
  return apiRequest('/api/method/garage.api.portal.update_spare_part_request_status', {
    body: { name, action },
  });
}
