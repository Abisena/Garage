# Next.js Frontend untuk Garage

Dokumentasi ini menjelaskan struktur dasar dan langkah menyiapkan frontend Next.js yang terintegrasi dengan API Frappe. Tujuannya adalah memindahkan layer web publik/operasional dari templating Jinja ke aplikasi React penuh.

## Struktur folder

```
web/
├─ app/                  # Halaman Next.js (App Router)
├─ lib/                  # Helper pemanggilan API Frappe
├─ next.config.mjs       # Rewrites dan konfigurasi Next.js
├─ package.json          # Dependensi & scripts
├─ tsconfig.json         # TypeScript config
└─ .env.example          # Contoh variabel environment
```

## Instalasi dependensi

Pastikan Node.js 18+ terpasang lalu jalankan perintah berikut dari akar repo:

```bash
cd web
npm install
```

Perintah di atas akan menarik Next.js 14, React 18, ESLint, serta TypeScript sehingga proyek siap dikembangkan tanpa setup manual lain.

## Menjalankan aplikasi

1. Duplikasi file `.env.example` menjadi `.env.local` lalu isi:
   - `FRAPPE_API_BASE_URL` → URL instance Frappe (misal `http://localhost:8000`).
   - `FRAPPE_API_KEY` dan `FRAPPE_API_SECRET` → kredensial API untuk user Frappe yang diizinkan memanggil REST.
2. Jalankan server dev:

```bash
npm run dev
```

Next.js otomatis menggunakan file `.env.local` dan proxy `/api/*` serta `/files/*` ke `FRAPPE_API_BASE_URL` melalui `next.config.mjs`. Dengan demikian, permintaan dari browser tidak akan terkena CORS.

## Contoh konsumsi API Frappe

Helper `web/lib/frappeClient.ts` menyediakan dua fungsi awal:

- `getSessionToken()` → memanggil `frappe.auth.get_logged_user` untuk memastikan kredensial API valid.
- `listGarageCustomers()` → mengambil daftar `Garage Customer` beserta nama dan nomor ponsel.

Keduanya menggunakan header `Authorization: token <api_key>:<api_secret>` sehingga kompatibel dengan standar Frappe REST API.

## Langkah lanjutan

- Tambahkan route App Router (mis. `app/workflow/page.tsx`) yang merender data workflow dari endpoint Frappe.
- Buat komponen client-side untuk booking layanan, lalu gunakan `fetch('/api/...')` sehingga tetap melewati proxy Next.js.
- Siapkan deployment production dengan `npm run build` lalu `npm run start`, atau gunakan adaptor Vercel/Node sesuai kebutuhan.
