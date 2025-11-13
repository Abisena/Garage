import { Buffer } from 'node:buffer';

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SESSION_COOKIE_NAME = 'pravenya.sid';
const CSRF_COOKIE_NAME = 'pravenya.csrf_token';
const SECURE_COOKIE = process.env.NODE_ENV === 'production';

const normalizeBaseUrl = (value: string) => value.replace(/\/$/, '');

const getTargetBaseUrl = () => {
  const base =
    process.env.PRAVENYA_API_BASE_URL || process.env.NEXT_PUBLIC_PRAVENYA_URL || 'http://127.0.0.1:8005';
  return normalizeBaseUrl(base);
};

const parseSetCookieHeader = (header: string) => {
  const [cookiePair, ...attributes] = header.split(';');
  const [rawName, ...rawValueParts] = cookiePair.split('=');
  if (!rawName) {
    return null;
  }

  const name = rawName.trim();
  const value = rawValueParts.join('=').trim();
  const metadata: { maxAge?: number; expires?: number } = {};

  for (const attribute of attributes) {
    const [attributeName, ...attributeValueParts] = attribute.split('=');
    const attributeValue = attributeValueParts.join('=').trim();
    const normalizedName = attributeName.trim().toLowerCase();

    if (normalizedName === 'max-age') {
      const parsedMaxAge = Number(attributeValue);
      if (!Number.isNaN(parsedMaxAge)) {
        metadata.maxAge = parsedMaxAge;
      }
    }

    if (normalizedName === 'expires') {
      const expiresAt = new Date(attributeValue);
      if (!Number.isNaN(expiresAt.valueOf())) {
        metadata.expires = expiresAt.valueOf();
      }
    }
  }

  return { name, value, ...metadata };
};

const shouldClearCookie = (payload: { maxAge?: number; expires?: number } | null | undefined) => {
  if (!payload) {
    return false;
  }

  if (payload.maxAge === 0) {
    return true;
  }

  if (payload.expires && payload.expires <= Date.now()) {
    return true;
  }

  return false;
};

const applyUpstreamCookies = (upstream: Response, response: NextResponse) => {
  const upstreamCookies = (upstream.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.();

  if (!upstreamCookies || upstreamCookies.length === 0) {
    return;
  }

  for (const header of upstreamCookies) {
    const parsed = parseSetCookieHeader(header);
    if (!parsed) {
      continue;
    }

    if (parsed.name === 'sid') {
      if (shouldClearCookie(parsed) || !parsed.value || parsed.value.toLowerCase() === 'guest') {
        response.cookies.set({
          name: SESSION_COOKIE_NAME,
          value: '',
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: SECURE_COOKIE,
          maxAge: 0,
        });
        response.cookies.set({
          name: CSRF_COOKIE_NAME,
          value: '',
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: SECURE_COOKIE,
          maxAge: 0,
        });
      } else {
        response.cookies.set({
          name: SESSION_COOKIE_NAME,
          value: parsed.value,
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: SECURE_COOKIE,
        });
      }
    }
  }
};

async function proxyRequest(request: NextRequest, context: { params: { path?: string[] } }) {
  const path = context.params.path?.join('/') ?? '';
  const targetUrl = `${getTargetBaseUrl()}/${path}${request.nextUrl.search}`;
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const cookieJar: string[] = [];
  if (sessionCookie) {
    cookieJar.push(`sid=${sessionCookie}`);
  }
  if (cookieJar.length) {
    headers.set('cookie', cookieJar.join('; '));
  } else {
    headers.delete('cookie');
  }

  if (csrfCookie) {
    headers.set('X-Frappe-CSRF-Token', csrfCookie);
  } else {
    headers.delete('X-Frappe-CSRF-Token');
  }

  const method = request.method.toUpperCase();
  const hasBody = !['GET', 'HEAD'].includes(method);
  const body = hasBody ? Buffer.from(await request.arrayBuffer()) : undefined;

  const upstream = await fetch(targetUrl, {
    method,
    headers,
    body,
    redirect: 'manual',
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('set-cookie');
  responseHeaders.delete('content-length');

  const downstream = new NextResponse(Buffer.from(await upstream.arrayBuffer()), {
    status: upstream.status,
    headers: responseHeaders,
  });

  applyUpstreamCookies(upstream, downstream);

  const csrfHeader = upstream.headers.get('x-frappe-csrf-token');
  if (csrfHeader) {
    downstream.cookies.set({
      name: CSRF_COOKIE_NAME,
      value: csrfHeader,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: SECURE_COOKIE,
    });
  }

  return downstream;
}

export async function GET(request: NextRequest, context: { params: { path?: string[] } }) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: { params: { path?: string[] } }) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: { params: { path?: string[] } }) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: { params: { path?: string[] } }) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { path?: string[] } }) {
  return proxyRequest(request, context);
}

export async function OPTIONS(request: NextRequest, context: { params: { path?: string[] } }) {
  return proxyRequest(request, context);
}
