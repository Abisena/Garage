# Sistem Workflow Bengkel

Dokumen ini menjabarkan ulang modul `garage.workflow` agar meniru persis
alur "Service Business Regular Booking & Non Booking" sebagaimana diagram
referensi. Seluruh langkah sekarang dipetakan ke objek `ServiceFlow` dan
`ServiceFlowStage` yang menjaga urutan pekerjaan, dari keputusan booking
hingga pemeriksaan akhir Service Advisor.

## Ringkasan Alur

1. **Booking vs Walk-in**  – `create_service_booking` menerima parameter
   `prebooked`, jadwal, estimasi biaya, dan part yang dipesan. Untuk
   pelanggan tanpa booking, gunakan `prebooked=False` lalu panggil
   `check_service_queue` agar PTM memastikan ketersediaan slot.
2. **PKB & Approval** – `create_pkb_document` mencetak PKB sekaligus
   membuat inspeksi, estimasi otomatis dari data booking, dan mengunci
   persetujuan customer. Tahap ini akan mengubah status flow menjadi
   `PKB_CREATED`.
3. **Distribusi Tugas Mekanik** – `distribute_mechanical_task` membuat
   work order beserta task dan kebutuhan part. Kekurangan part dapat
   ditangani dengan `record_local_purchase`, sedangkan pengeluaran part
   & bahan lokal dicatat melalui `record_part_release` dan
   `record_material_release`.
4. **Proses Mekanik** – `start_repair_process`,
   `update_repair_progress`, dan `complete_repair_work` menandai
   pengerjaan mekanik sesuai jalur PTM. Validasi memastikan repair tidak
   dapat dimulai sebelum seluruh material wajib dikeluarkan.
5. **QC Foreman & OPL** – `perform_foreman_check` memanggil QC; ketika
   lulus sistem otomatis menutup job card. Dokumentasi OPL dilakukan
   lewat `log_opl_entry` yang memindahkan flow ke tahap berikutnya.
6. **Billing & Payment** – `print_service_invoice_document` menerbitkan
   faktur service, `process_service_payment` menangani pembayaran kas,
   transfer, maupun kredit (dengan `PaymentMethod`). Bukti final
   dicetak melalui `print_final_service_invoice`.
7. **Finish Check & Close** – `finish_service_check` melakukan pemeriksaan
   akhir SA sebelum menutup interaksi dengan `close_customer_interaction`
   (dipanggil otomatis). Flow ditandai `CLOSED` hanya ketika semua
   invoice sudah lunas sesuai diagram.

Diagram mermaid terbaru tersedia di halaman web
`garage/templates/pages/workflow.html` dan menampilkan langkah-langkah di
atas dalam bentuk visual yang identik dengan gambar referensi.

## Struktur Modul

- **`garage/workflow/models.py`** menyimpan seluruh *data class* yang
  menjadi kontrak data workflow, seperti `ServiceBooking`,
  `ServiceFlow`, `ServiceFlowEvent`, serta entitas turunan lain yang
  dipakai mesin workflow untuk menyimpan inspeksi, job card, invoice,
  pembayaran, dan catatan audit. File ini tidak memiliki logika bisnis;
  fokusnya hanya mendefinisikan bentuk data dan enumerasi status agar
  tiap tahap pada diagram punya representasi yang jelas.
- **`garage/workflow/engine.py`** merupakan pusat logika alur service.
  Di sini terdapat `GarageWorkflowEngine`, *in-memory store*, helper
  untuk pengecekan izin (`AccessController`), serta fungsi-fungsi yang
  menjalankan tiap node diagram—mulai dari registrasi pelanggan,
  penjadwalan booking, pencetakan PKB, distribusi pekerjaan mekanik,
  pembelian & pengeluaran part, sampai pencetakan invoice dan penutupan
  flow. File inilah yang memanfaatkan model-model di atas untuk
  menyimpan state, melakukan validasi, dan menuliskan riwayat event.
- **`garage/templates/pages/workflow.html`** menjadi dokumentasi
  interaktif yang menggambarkan ulang diagram "Service Business Regular
  Booking & Non Booking". Template ini merender diagram Mermaid yang
  bersumber dari state/aksi yang tersedia di `engine.py` sehingga tim
  operasional bisa memverifikasi kesesuaian implementasi dengan gambar
  referensi.

## Entitas Data

| Entitas | Deskripsi |
| --- | --- |
| `ServiceBooking` | Kini menyimpan `prebooked`, `scheduled_at`, `reserved_parts`, dan `estimated_cost` untuk mendukung pra-booking. |
| `ServiceFlow` | Menyimpan status `ServiceFlowStage`, metadata (job card, invoice, pembayaran), serta riwayat `ServiceFlowEvent`. |
| `ServiceFlowStage` | Enum yang memetakan setiap node pada diagram: `PRE_BOOKING`, `QUEUE_CHECK`, `PKB_CREATED`, `TASK_DISTRIBUTED`, `PARTS_PURCHASED`, `PARTS_ISSUED`, `MATERIAL_ISSUED`, `REPAIR_IN_PROGRESS`, `PROGRESS_UPDATED`, `REPAIR_COMPLETED`, `FOREMAN_CHECKED`, `OPL_LOGGED`, `SERVICE_INVOICE_PRINTED`, `PAYMENT_PROCESSED`, `FINAL_INVOICE_PRINTED`, `FINISH_CHECK`, `CLOSED`. |
| `Estimate`, `JobCard`, `WorkOrder` | Tetap digunakan, namun terhubung otomatis dari `create_pkb_document` dan `distribute_mechanical_task`. |
| `SalesInvoice`, `PaymentRecord`, `ReceiptDocument` | Dipakai pada tahap billing & payment untuk meniru blok "Adm Service" dan "Cashier". |

## Akses & Audit

Access Control List diperluas agar role mengikuti diagram:

- **Service Advisor** dapat menjalankan `check_service_queue`,
  `create_pkb_document`, distribusi tugas, OPL, dan `finish_service_check`
  sekaligus `close_customer_interaction`.
- **Inventory Controller** memiliki aksi `record_material_release` untuk
  pengeluaran bahan.
- **Manager** memperoleh seluruh aksi baru termasuk logging OPL.
- **Cashier** tetap bertugas pada pembayaran dan pencetakan bukti bayar.

Setiap mutasi memanggil `_log_flow_event` sehingga audit log mencatat
perubahan stage beserta metadata (job card, invoice, payment ID,
referensi cetakan).

## Contoh Penggunaan

```python
from datetime import datetime

from garage.workflow import (
    GarageWorkflowEngine,
    PaymentMethod,
    Role,
    ServiceType,
    ServiceFlowStage,
)
from garage.workflow.models import User

engine = GarageWorkflowEngine()

manager = User(user_id="USR-MGR", full_name="Manager", role=Role.MANAGER)
advisor = User(user_id="USR-SA", full_name="Service Advisor", role=Role.SERVICE_ADVISOR)
tech = User(user_id="USR-TECH", full_name="Technician", role=Role.TECHNICIAN)
inventory = User(user_id="USR-INV", full_name="Inventory", role=Role.INVENTORY_CONTROLLER)
cashier = User(user_id="USR-CASH", full_name="Cashier", role=Role.CASHIER)

for actor in [manager, advisor, tech, inventory, cashier]:
    engine.register_user(actor, acting_user=manager if actor is not manager else None)

customer = engine.register_customer(advisor, "Budi", phone="0812")
vehicle = engine.register_vehicle(advisor, customer.customer_id, "B 1234 CD", make="Toyota")
booking = engine.create_service_booking(
    advisor,
    customer.customer_id,
    vehicle.vehicle_id,
    ServiceType.SERVICE,
    concern="Servis berkala",
    prebooked=True,
    scheduled_at=datetime.utcnow(),
    reserved_parts={"OLI-001": 1},
    estimated_cost=450000,
)

job_card = engine.create_pkb_document(
    advisor,
    booking.booking_id,
    tech,
    inspection_notes="Checklist standar",
)

work_order = engine.distribute_mechanical_task(
    advisor,
    booking.booking_id,
    tasks=["Ganti oli", "Cek rem"],
    required_parts={"OLI-001": 1},
)

engine.register_inventory_item(manager, "OLI-001", "Oli 10W-40", quantity=5)
engine.record_part_release(manager, booking.booking_id, {"OLI-001": 1})
engine.record_material_release(inventory, booking.booking_id, "Keluar kain lap & brake cleaner")

engine.start_repair_process(tech, booking.booking_id)
engine.update_repair_progress(tech, booking.booking_id, "Pekerjaan 50%")
engine.complete_repair_work(tech, booking.booking_id)
engine.perform_foreman_check(manager, booking.booking_id, passed=True, notes="Layak jalan")
engine.log_opl_entry(advisor, booking.booking_id, "Catatan best practice mekanik")

invoice = engine.print_service_invoice_document(advisor, booking.booking_id)
payment = engine.process_service_payment(cashier, booking.booking_id, PaymentMethod.CASH, invoice.amount)
engine.print_final_service_invoice(cashier, booking.booking_id)
closed_booking = engine.finish_service_check(advisor, booking.booking_id)

assert engine._get_flow_by_booking(booking.booking_id).stage == ServiceFlowStage.CLOSED
```

Untuk pelanggan **walk-in** tanpa booking, buat service booking dengan
`prebooked=False`, panggil `check_service_queue` (wajib `available=True`),
kemudian lanjutkan langkah yang sama mulai dari `create_pkb_document`.

## Tips Implementasi Produksi

- Persist `ServiceFlow` dan `ServiceFlowEvent` ke database agar histori
  dapat diaudit.
- Gunakan metadata yang tersimpan (job_card_id, invoice_id,
  payment_id) untuk menautkan dokumen Frappe/ERP lainnya.
- Integrasikan `ServiceFlowStage` ke dashboard monitoring sehingga
  supervisor dapat melihat posisi setiap kendaraan secara real-time.
