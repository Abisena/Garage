import Link from 'next/link';
import { getSessionToken, listGarageCustomers } from '@/lib/frappeClient';

export default async function Home() {
  const apiBase = process.env.FRAPPE_API_BASE_URL || 'http://localhost:8000';
  return (
    <main>
      <section>
        <div className="badge">
          <span>Next.js 14</span>
          <span>×</span>
          <span>Frappe</span>
        </div>
        <h1>Garage Web Portal</h1>
        <p className="muted">
          Frontend ini menggunakan Next.js App Router. Gunakan sebagai pondasi UI web agar tidak lagi
          bergantung pada template Jinja dari Frappe.
        </p>
        <div className="card-grid">
          <div className="card">
            <h3>Struktur Proyek</h3>
            <ul>
              <li>
                <code>web/app</code> – halaman & routing Next.js (App Router)
              </li>
              <li>
                <code>web/lib/frappeClient.ts</code> – helper fetch ke API Frappe
              </li>
              <li>
                <code>web/next.config.mjs</code> – rewrites ke Frappe agar bebas CORS
              </li>
            </ul>
          </div>
          <div className="card">
            <h3>Langkah Cepat</h3>
            <ol>
              <li>Copy <code>.env.example</code> menjadi <code>.env.local</code>.</li>
              <li>Isi <code>FRAPPE_API_BASE_URL</code>, <code>FRAPPE_API_KEY</code>, dan <code>FRAPPE_API_SECRET</code>.</li>
              <li>Jalankan <code>npm install</code> lalu <code>npm run dev</code> dari folder <code>web</code>.</li>
            </ol>
          </div>
          <div className="card">
            <h3>Contoh Pemanggilan API</h3>
            <p className="muted">Helper <code>listGarageCustomers</code> menembak endpoint REST Frappe.</p>
            <code>await listGarageCustomers()</code>
          </div>
          <div className="card">
            <h3>Next Steps</h3>
            <p className="muted">
              Tambahkan halaman dashboard, katalog layanan, dan pemesanan. Semua data dibaca via REST
              atau GraphQL Frappe.
            </p>
            <Link href="https://frappeframework.com/docs/user/en/api/rest" target="_blank">
              Dokumentasi REST Frappe
            </Link>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 24 }}>
          Base URL API aktif: <code>{apiBase}</code>
        </p>
      </section>
    </main>
  );
}
