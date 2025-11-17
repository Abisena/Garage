import 'server-only';

const headers = new Headers({
  'Content-Type': 'application/json',
});

function getAuthHeaders() {
  const apiKey = process.env.FRAPPE_API_KEY;
  const apiSecret = process.env.FRAPPE_API_SECRET;

  if (apiKey && apiSecret) {
    headers.set('Authorization', `token ${apiKey}:${apiSecret}`);
  }

  return headers;
}

export async function getSessionToken() {
  const frappeBase = process.env.FRAPPE_API_BASE_URL;
  if (!frappeBase) {
    throw new Error('FRAPPE_API_BASE_URL belum diset. Tambahkan di .env.local');
  }

  const response = await fetch(`${frappeBase}/api/method/frappe.auth.get_logged_user`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Gagal mengambil session token: ${response.statusText}`);
  }

  const payload = (await response.json()) as { message?: string };
  return payload.message;
}

export async function listGarageCustomers() {
  const frappeBase = process.env.FRAPPE_API_BASE_URL;
  if (!frappeBase) {
    throw new Error('FRAPPE_API_BASE_URL belum diset. Tambahkan di .env.local');
  }

  const response = await fetch(
    `${frappeBase}/api/resource/Garage Customer?fields=${encodeURIComponent('["name","customer_name","mobile_no"]')}`,
    {
      headers: getAuthHeaders(),
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error(`Gagal memuat pelanggan: ${response.statusText}`);
  }

  const payload = (await response.json()) as { data?: Array<Record<string, unknown>> };
  return payload.data ?? [];
}
