# Sistem Workflow Bengkel

Dokumen ini menjelaskan implementasi workflow layanan bengkel seperti yang digambarkan pada diagram Mermaid. Seluruh logika bisnis dikemas di dalam modul Python `garage.workflow` sehingga dapat digunakan sebagai service mandiri, worker di latar belakang, ataupun diintegrasikan dengan aplikasi Frappe.

## Fitur Utama

1. **Pemesanan Layanan** – Membuat booking servis dan repair dengan validasi data wajib.
2. **Inspeksi dan Job Card** – Setiap booking dapat dibuatkan job card setelah inspeksi selesai.
3. **Estimasi & Persetujuan** – Estimasi biaya tenaga kerja dan sparepart tercatat dan butuh persetujuan customer sebelum lanjut.
4. **Work Order** – Jika disetujui, sistem otomatis membuat work order sebagai dasar pengerjaan teknisi.
5. **Manajemen Inventori** – Dukungan stok, pemesanan sparepart (Purchase Order), penerimaan barang, dan pengeluaran material.
6. **Penjualan Sparepart** – Flow penjualan, pengecekan stok, sampai penerbitan delivery note.
7. **Faktur & Pembayaran** – Pembuatan faktur penjualan dan pencatatan pembayaran beserta metode bayar.
8. **Audit Log** – Seluruh aktivitas tersimpan pada audit log untuk ditelusuri kembali.
9. **Dashboard & Laporan** – Fungsi `generate_reports` menyediakan ringkasan penjualan, job card, inventori, dan posisi keuangan.

## Keamanan

- **Role Based Access Control (RBAC)**: Setiap role hanya bisa menjalankan aksi tertentu. Role tersedia antara lain `SERVICE_ADVISOR`, `TECHNICIAN`, `INVENTORY_CONTROLLER`, `CASHIER`, dan `MANAGER`.
- **Validasi Data**: Hampir seluruh input melalui workflow memiliki pemeriksaan dasar (nilai positif, status dokumen sesuai, dsb.).
- **Audit Trail**: Setiap aksi tercatat lengkap dengan user, waktu, dan payload yang relevan.

## Cara Menggunakan

```python
from garage.workflow import GarageWorkflowEngine, Role, ServiceType, PaymentMethod
from garage.workflow.models import User

engine = GarageWorkflowEngine()
manager = User(user_id="USR-001", full_name="Manager", role=Role.MANAGER)
engine.register_user(manager)

advisor = User(user_id="USR-002", full_name="Advisor", role=Role.SERVICE_ADVISOR)
engine.register_user(advisor, acting_user=manager)

# Membuat booking servis
booking = engine.create_service_booking(
    advisor,
    customer_name="Budi",
    vehicle_registration="B 1234 CD",
    service_type=ServiceType.SERVICE,
)

# Melanjutkan flow sesuai kebutuhan ...
```

## Integrasi dengan Front-end

- Modul ini tidak bergantung pada framework tertentu sehingga bisa dipanggil dari API, worker, ataupun UI Frappe.
- Untuk kebutuhan web publik, tersedia halaman `workflow` yang menampilkan diagram lengkap dan ringkasan tiap langkah.

## Struktur Data Penting

| Entitas | Penjelasan |
| --- | --- |
| `ServiceBooking` | Mewakili kedatangan customer dan pilihan layanan. |
| `JobCard` | Catatan inspeksi, estimasi, dan status pengerjaan. |
| `WorkOrder` | Daftar tugas teknisi yang terhubung ke job card. |
| `PurchaseOrder` | Pemesanan stok jika sparepart tidak tersedia. |
| `StockItem` | Stok sparepart beserta level reservasi dan reorder. |
| `SalesOrder` | Penjualan sparepart langsung. |
| `SalesInvoice` | Faktur hasil servis maupun penjualan. |
| `PaymentRecord` | Bukti pembayaran customer. |

## Rekomendasi Produksi

- Simpan data hasil workflow ke database (MySQL, PostgreSQL, dsb) menggunakan layer persistence sendiri.
- Implementasikan autentikasi/otorisasi sesuai platform (OAuth2, session-based, dll). Modul ini hanya menyediakan RBAC tingkat aksi.
- Buat backup berkala terhadap audit log dan laporan agar mudah melakukan investigasi ketika terjadi insiden.

## Pengujian

- Gunakan test unit untuk tiap aksi krusial (persetujuan customer, penerimaan PO, pembayaran). Contoh: gunakan `pytest` untuk memanggil method engine dan memeriksa state.
- Pastikan jalur penolakan customer, stok tidak cukup, dan pembayaran kurang tetap aman.

## Referensi

- [Dokumentasi Frappe Desk dan Website](https://frappeframework.com/docs/)
- [Python Dataclasses](https://docs.python.org/3/library/dataclasses.html)
- [State Machine Design Patterns](https://martinfowler.com/articles/richer-message.html)
