# Pengujian Workflow di Pravenya (Frappe)

Dokumen ini memberikan panduan lengkap untuk mencoba workflow bengkel pada
lingkungan Frappe/ERPNext yang diberi nama **Pravenya**. Aplikasi ini sekarang
menyertakan DocType resmi yang mengikuti setiap langkah pada diagram Mermaid
awal sehingga Anda dapat menguji proses end-to-end langsung dari Desk.

## 1. Ringkasan DocType

| Langkah Flow | DocType | Keterangan |
| --- | --- | --- |
| Customer Datang | **Garage Customer**, **Garage Vehicle** | Mencatat identitas pelanggan dan kendaraan. |
| Create Service Booking | **Garage Service Order** | Menentukan tipe layanan, prioritas, dan asesor. |
| Vehicle Inspection | **Garage Vehicle Inspection** (link ke service order, memuat child table **Garage Service Order Inspection**) | Merekam temuan inspeksi dan severity tanpa menambah field di service order. |
| Create Job Card / Work Order | Field status pada **Garage Service Order** | Status `job_card_status` dan `work_order_status` melacak progres. |
| Estimate Biaya & Approval | Field nilai dan jadwal pembayaran di **Garage Service Order** | Menyimpan estimasi biaya, persetujuan, dan termin. |
| Work Order & Pengambilan Material | **Garage Procurement Order**, **Garage Stock Movement** | Mencatat pengadaan dan pergerakan stok. |
| Proses Pengerjaan | Tabel anak **Garage Service Order Progress** | Mencatat log pengerjaan teknisi. |
| Quality Check | Tabel anak **Garage Service Order Quality** | Checklist QC dan hasilnya. |
| Generate Sales Invoice | **Garage Sales Invoice** | Faktur untuk servis atau penjualan sparepart. |
| Payment Entry & Receipt | **Garage Payment Entry**, **Garage Receipt Document** | Mencatat pembayaran, alokasi ke invoice, dan bukti penerimaan. |
| Penjualan Sparepart | **Garage Spare Part Order** + tabel anak | Mendukung alur pembelian sparepart langsung. |

Semua definisi DocType berada di folder
`garage/garage/doctype/` sehingga otomatis ter-install ketika aplikasi ini
terpasang di site Pravenya.

## 2. Dependensi & Roles yang Disarankan

Secara default setiap DocType memberi hak akses penuh ke **System Manager**.
Untuk operasi harian yang lebih aman, buatlah role tambahan di Pravenya:

- `Garage Manager`
- `Garage Service Advisor`
- `Garage Inventory`
- `Garage Cashier`

Setelah role dibuat, buka masing-masing DocType lalu atur Permission Rules
sesuai kebutuhan (misalnya Service Advisor dapat membuat Service Order, Inventory
hanya bisa mengakses Procurement & Stock Movement, dan sebagainya).

### Akun Portal Bawaan

Patch `add_branch_portal_users` otomatis membuat user demo untuk setiap cabang
default beserta hak aksesnya sehingga Anda dapat langsung mencoba portal web.
Seluruh akun memakai sandi awal `garage123` dan dapat diganti melalui Desk.

| Email | Cabang | Role |
| --- | --- | --- |
| `jakarta.branch@garage.local` | `JKT-001` | Garage Manager, Service Advisor |
| `bandung.branch@garage.local` | `BDG-001` | Garage Manager, Service Advisor |
| `surabaya.branch@garage.local` | `SBY-001` | Garage Manager, Service Advisor |

Setiap akun otomatis mendapatkan dokumen **Garage Branch Access** sehingga data
yang tampil di portal sesuai cabang masing-masing.

## 3. Instalasi di Site Pravenya

1. Clone repositori ini ke direktori `apps/` pada bench Anda.
2. Jalankan perintah berikut:
   ```bash
   bench --site pravenya.local install-app garage
   bench --site pravenya.local migrate
   ```
   Ganti `pravenya.local` dengan nama site Anda.
3. Login ke Desk, buka menu **Awesome Bar** dan cari DocType yang disebutkan di
   atas untuk memastikan semuanya ter-load.

## 4. Menyiapkan Data Uji

Lakukan langkah berikut untuk menguji alur layanan bengkel secara manual:

1. **Customer & Kendaraan** – buat record `Garage Customer` kemudian `Garage Vehicle`.
2. **Service Order** – buka DocType `Garage Service Order`, pilih customer, kendaraan,
   service advisor, dan isi tabel inspeksi + parts yang dibutuhkan.
3. **Estimasi & Approval** – masukkan nilai estimasi, tandai `Customer Approved`
   bila setuju, dan isi tabel Payment Schedule jika menggunakan termin.
4. **Pengadaan** – dari menu Procurement Order buat dokumen baru dengan
   `reference_type = Service Order` untuk item yang statusnya `To Order`.
5. **Penerimaan / Issue Stok** – pakai DocType `Garage Stock Movement` dengan
   `movement_type = Receipt` ketika barang datang dan `movement_type = Issue`
   saat mengeluarkan barang ke teknisi.
6. **Progress** – tambah entri pada tabel Progress Logs di service order untuk
   mencatat perkembangan pekerjaan.
7. **Quality Check** – setelah pekerjaan selesai, isi tabel Quality Checks dan
   ubah `qc_status` pada service order menjadi `Passed`.
8. **Invoice & Pembayaran** – buat `Garage Sales Invoice` dari service order,
   kemudian catat pembayaran lewat `Garage Payment Entry` dan terbitkan
   `Garage Receipt Document` bila dibutuhkan.

Untuk penjualan sparepart langsung, gunakan DocType `Garage Spare Part Order`
sebagai titik awal, lanjutkan dengan Procurement/Stock Movement bila stok tidak
tersedia, lalu buat Delivery dan Invoice seperti biasa.

## 5. Portal Web Opsional

Selain via Desk, admin dapat mengaktifkan halaman website `/garage` untuk tim
front-office. Portal ini memakai API `garage.api.portal` sehingga seluruh data
yang dimasukkan tetap muncul di Desk. Pastikan user yang mengakses portal
memiliki permission yang sama seperti ketika bekerja di Desk (mis. Service
Advisor dapat membuat `Garage Service Order`, Cashier dapat membuat `Garage
Payment Entry`, dan seterusnya).

## 6. Integrasi dengan Engine Python

Workflow engine Python tetap dapat digunakan untuk otomatisasi atau API. Contoh
pemakaian dari bench console:

```python
from garage.workflow import GarageWorkflowEngine, Role
engine = GarageWorkflowEngine()

# Registrasi data master
cust = engine.register_customer(name="PT Pravenya", phone="021-1234567")
veh = engine.register_vehicle(customer_id=cust.id, plate_number="B 1234 PRV", model="SUV")

# Lanjutkan sesuai kebutuhan (create_service_booking, create_job_card, dst.)
```

Anda dapat menulis Server Script di Frappe yang memanggil method engine dan
sinkron dengan DocType yang baru dibuat apabila membutuhkan automatisasi penuh.

## 6. Checklist Validasi

- [ ] Semua DocType muncul di list Desk.
- [ ] Service Order dapat menyimpan tabel inspeksi, task, parts, progress, dan QC.
- [ ] Procurement Order dan Stock Movement menampilkan data referensi.
- [ ] Sales Invoice, Payment Entry, dan Receipt saling terhubung.
- [ ] Spare Part Order dapat dipakai untuk transaksi counter.

Jika ada field tambahan yang dibutuhkan, Anda dapat menambahkan Custom Field
via Desk tanpa mengubah kode sumber aplikasi.

## 7. Troubleshooting

| Gejala | Solusi |
| --- | --- |
| DocType tidak muncul | Pastikan `bench migrate` berjalan sukses dan cache browser telah dibersihkan. |
| Role tidak punya akses | Tambahkan Permission Rule baru via form DocType, atau gunakan Role `System Manager` untuk setup awal. |
| Dynamic Link error | Pastikan nilai `reference_type` dan `reference_name` terisi sesuai dokumen sumber. |
| Tidak ada workflow otomatis | Engine Python belum dihubungkan. Gunakan Server Script atau API untuk menghubungkan. |

Dengan panduan ini, tim dapat langsung menguji seluruh alur bengkel di Pravenya
menggunakan DocType resmi yang aman dan terdokumentasi.
