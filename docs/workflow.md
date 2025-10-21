# Sistem Workflow Bengkel

Dokumen ini menjelaskan implementasi workflow layanan bengkel pada modul
`garage.workflow`. Implementasi ini mengikuti diagram Mermaid yang diberikan
pada permintaan awal dan memecahnya menjadi langkah operasional lengkap sesuai
praktik bengkel modern: dari booking layanan, inspeksi kendaraan, pengelolaan
stok, sampai penagihan dan tindak lanjut piutang.

## Ringkasan Alur

### Service & Repair
1. **Registrasi Customer & Kendaraan** – `register_customer` dan
   `register_vehicle` memastikan data awal tervalidasi.
2. **Create Service Booking** – `create_service_booking` menandai customer
   datang dan memilih `service_type` (service/repair) serta mencatat keluhan.
3. **Vehicle Inspection** – `record_inspection` menghasilkan `InspectionReport`
   dan mengubah status booking menjadi `INSPECTED`.
4. **Create Job Card** – `create_job_card` membuat job card untuk teknisi.
5. **Estimate Biaya** – `create_estimate` menghitung biaya tenaga kerja dan
   sparepart dengan objek `EstimateLine` terstruktur.
6. **Persetujuan Customer** – `record_customer_decision` menutup job card jika
   ditolak, atau membuat `WorkOrder` jika disetujui.
7. **Cek Stok Sparepart** – `check_work_order_stock` memberi daftar kekurangan.
8. **Create Purchase Order / Stock Entry** – `create_purchase_order`,
   `receive_purchase_order`, dan `create_stock_entry` menambah stok yang kurang.
9. **Material Issue** – `issue_materials` mengurangi stok dan mencatat
   `StockMovement`.
10. **Proses Pengerjaan** – `start_work`, `update_job_progress`, dan
    `complete_work` mengatur progres teknisi hingga siap QC.
11. **Quality Check** – `perform_quality_check` menandai hasil QC
    (`QualityResult`). Jika lulus, lanjut ke `complete_job_card`.
12. **Generate Sales Invoice** – `generate_sales_invoice` mencatat nilai akhir
    layanan sebelum customer melakukan pembayaran.
13. **Payment Entry** – `record_payment` menangani pembayaran cash/transfer.
    Untuk kredit gunakan `create_payment_term` lalu `follow_up_receivable` untuk
    tindak lanjut piutang.
14. **Print Invoice & Receipt** – `print_receipt` membuat dokumen siap cetak.
15. **Customer Selesai** – `close_customer_interaction` memastikan seluruh
    invoice lunas sebelum menutup interaksi.

### Penjualan Sparepart
1. **Create Sales Order** – `create_sales_order` menampung permintaan barang.
2. **Cek Stock Sparepart** – `check_sales_order_stock` mengecek ketersediaan.
3. **Purchase Order bila perlu** – alirannya sama dengan service.
4. **Reserve Stock & Delivery** – `reserve_sales_stock` lalu
   `create_delivery_note` mengeluarkan barang dari gudang.
5. **Generate Sales Invoice & Pembayaran** – proses sama seperti servis.

### Pengelolaan Stok & Laporan
- `register_inventory_item`, `adjust_inventory`, dan
  `evaluate_reorder_levels` membantu tim gudang menjaga stok aman.
- `generate_reports` menghasilkan Sales Report, Inventory Report, Job Card
  Report, dan Financial Report sesuai node pelaporan pada diagram.

## Keamanan & Audit

- **Role Based Access Control (RBAC)** –
  `AccessController` memetakan aksi ke role (`SERVICE_ADVISOR`, `TECHNICIAN`,
  `INVENTORY_CONTROLLER`, `CASHIER`, `MANAGER`). Semua method memanggil
  `self.access.require` sebelum mengeksekusi.
- **Validasi State Transition** – Method mengangkat
  `InvalidTransitionError` atau `ValidationError` jika urutan alur tidak
  sesuai (misalnya mengeluarkan material sebelum job disetujui).
- **Audit Trail** – Tiap aksi memanggil `_log_action` untuk menyimpan
  `AuditLogEntry` di `InMemoryStore.audit_log`. Informasi user, referensi, dan
  payload tersimpan sebagai dict sehingga mudah dipersist ke database
  produksi.

## Struktur Data Penting

| Entitas | Penjelasan |
| --- | --- |
| `Customer` & `Vehicle` | Identitas customer dan kendaraan yang dilayani. |
| `ServiceBooking` | Mewakili kedatangan customer dan tipe layanan. |
| `InspectionReport` | Catatan hasil inspeksi awal. |
| `JobCard` | Track status pengerjaan termasuk QC (`QualityResult`). |
| `Estimate` | Kalkulasi biaya per line item (`EstimateLine`). |
| `WorkOrder` | Daftar tugas teknisi + kebutuhan sparepart. |
| `PurchaseOrder` & `StockEntry` | Proses pengadaan ketika stok kurang. |
| `StockItem` & `StockMovement` | Menjaga stok, reserved quantity, dan history. |
| `SalesOrder` & `DeliveryNote` | Flow penjualan counter. |
| `SalesInvoice` & `PaymentRecord` | Penagihan dan pembayaran customer. |
| `PaymentTerm` & `ReceivableFollowUp` | Penjadwalan dan eskalasi piutang kredit. |
| `ReceiptDocument` | Ringkasan siap cetak untuk invoice & payment. |

## DocType Frappe / Pravenya

Untuk pengujian langsung di site Frappe seperti **Pravenya**, modul ini
menyediakan DocType siap pakai pada folder `garage/garage/doctype/`:

- **Garage Customer** & **Garage Vehicle** – data master pelanggan dan kendaraan.
- **Garage Service Order** – dokumen inti yang menampung inspeksi, estimasi,
  parts, progres, dan QC.
- **Garage Procurement Order** & **Garage Stock Movement** – mendukung alur
  pengadaan serta penerimaan/issue stok.
- **Garage Spare Part Order** – jalur khusus untuk transaksi counter.
- **Garage Sales Invoice**, **Garage Payment Entry**, dan **Garage Receipt
  Document** – melengkapi proses billing hingga penerbitan bukti bayar.

Instruksi instalasi serta contoh skenario uji tersedia di
[`docs/pravenya_setup.md`](pravenya_setup.md).

### Portal Web Terintegrasi

- Halaman publik `/garage` menyajikan portal operasional lengkap yang menggunakan
  API `garage.api.portal`. Seluruh form di portal ini menulis langsung ke DocType
  yang sama dengan versi Desk sehingga data intake, service order, procurement,
  hingga invoice tetap sinkron.
- Portal menyediakan form cepat untuk registrasi customer & kendaraan, pembuatan
  service order (beserta task, kebutuhan part, progress log, dan jadwal
  pembayaran), order sparepart counter, procurement, mutasi stok, invoice,
  payment entry, serta penerbitan bukti bayar.
- Bagian insight menampilkan agregasi status dokumen dan nilai keuangan
  (total invoice, outstanding, pembayaran) yang diambil dari fungsi
  `portal_bootstrap`, memudahkan manajer memonitor operasional tanpa harus
  masuk ke Desk.

## Contoh Penggunaan

```python
from datetime import datetime, timedelta

from garage.workflow import (
    GarageWorkflowEngine,
    InspectionSeverity,
    PaymentMethod,
    Role,
    ServiceType,
)
from garage.workflow.models import User

engine = GarageWorkflowEngine()
manager = User(user_id="USR-MGR", full_name="Manager", role=Role.MANAGER)
engine.register_user(manager)

advisor = User(user_id="USR-ADV", full_name="Advisor", role=Role.SERVICE_ADVISOR)
tech = User(user_id="USR-TECH", full_name="Technician", role=Role.TECHNICIAN)
engine.register_user(advisor, acting_user=manager)
engine.register_user(tech, acting_user=manager)

customer = engine.register_customer(advisor, "Budi", phone="0812")
vehicle = engine.register_vehicle(advisor, customer.customer_id, "B 1234 CD", make="Toyota")
booking = engine.create_service_booking(advisor, customer.customer_id, vehicle.vehicle_id, ServiceType.SERVICE)
report = engine.record_inspection(advisor, booking.booking_id, advisor, "Perlu servis berkala", InspectionSeverity.MEDIUM)
job_card = engine.create_job_card(advisor, booking.booking_id, tech)
estimate = engine.create_estimate(advisor, job_card.job_card_id, advisor, labor_hours=2, labor_rate=150000)
job_card, work_order = engine.record_customer_decision(advisor, job_card.job_card_id, approved=True)
engine.prepare_work_order(advisor, work_order.work_order_id, tasks=["Ganti oli"], required_parts={"OLI-001": 1})

engine.register_inventory_item(manager, "OLI-001", "Oli 10W-40", quantity=10, reorder_level=2)
shortages = engine.check_work_order_stock(manager, work_order.work_order_id)
if shortages:
    po = engine.create_purchase_order(manager, job_card.job_card_id, shortages)
    engine.receive_purchase_order(manager, po.purchase_order_id)
    engine.create_stock_entry(manager, po.purchase_order_id)

engine.issue_materials(manager, job_card.job_card_id, {"OLI-001": 1})
engine.start_work(tech, job_card.job_card_id)
engine.complete_work(tech, job_card.job_card_id)
engine.perform_quality_check(manager, job_card.job_card_id, passed=True)
engine.complete_job_card(manager, job_card.job_card_id)

invoice = engine.generate_sales_invoice(manager, job_card.job_card_id, amount=450000)
term = engine.create_payment_term(manager, invoice.invoice_id, datetime.utcnow() + timedelta(days=14), amount=450000)
engine.follow_up_receivable(manager, term.term_id, contact_person="Budi", method="WhatsApp", notes="Reminder jatuh tempo")
payment = engine.record_payment(manager, invoice.invoice_id, PaymentMethod.TRANSFER, amount=450000)
receipt = engine.print_receipt(manager, invoice.invoice_id, payment.payment_id)
engine.close_customer_interaction(manager, booking.booking_id)

reports = engine.generate_reports(manager)
```

> Catatan: contoh di atas menggunakan `InMemoryStore`. Untuk produksi disarankan
> membuat adaptor persistence (database) dan mengganti mekanisme autentikasi
> sesuai platform (misalnya session Frappe, OAuth2, dsb.).

## Rekomendasi Implementasi Produksi

- **Persistensi** – Simpan entitas penting (`Customer`, `JobCard`, `SalesInvoice`,
  dll.) ke database dan bangun repository pattern agar `GarageWorkflowEngine`
  dapat diganti backend-nya tanpa mengubah API publik.
- **Integrasi UI / API** – Gunakan modul ini sebagai service layer di Frappe,
  FastAPI, atau worker. Pastikan mapping role aplikasi selaras dengan enum
  `Role`.
- **Monitoring** – Gunakan output `generate_reports` dan audit log untuk
  dashboard real-time. Tambahkan alert otomatis untuk item dengan
  `reorder_level` rendah menggunakan `evaluate_reorder_levels`.

## Pengujian

- Buat test unit untuk skenario utama: penolakan customer, kekurangan stok,
  quality check gagal, penjadwalan piutang, serta pembayaran parsial.
- Gunakan fixture untuk membuat user per role agar validasi RBAC tetap terjaga.
- Pastikan error `ValidationError` dan `InvalidTransitionError` muncul ketika
  urutan alur dilanggar.

## Referensi

- [Frappe Framework Documentation](https://frappeframework.com/docs/)
- [Python Dataclasses](https://docs.python.org/3/library/dataclasses.html)
- [State Machine Design Patterns](https://martinfowler.com/articles/richer-message.html)
