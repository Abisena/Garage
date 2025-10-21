### Garage

For Your manage Garage

### Workflow System

This repository ships with an in-memory but production-ready workflow engine
located at `garage/workflow`. The module menangani seluruh perjalanan customer
mulai dari registrasi customer & kendaraan, booking layanan, inspeksi,
pembuatan job card & work order, pengadaan stok, penjualan counter, hingga
penagihan dan tindak lanjut piutang. Fitur keamanannya meliputi role based
access control, validasi state transition, audit log, serta dukungan payment
term dan follow-up piutang agar aman diintegrasikan dengan API, worker, ataupun
UI Frappe.

### Documentation & Demo Page

* Developer documentation for the workflow is available at
  [`docs/workflow.md`](docs/workflow.md).
* A lightweight public web page (`/workflow`) renders the flow diagram and a
  step-by-step explanation using Mermaid so end users dapat memahami proses
  dengan cepat.
* Portal operasional lengkap tersedia di route `/garage` sehingga tim bengkel
  dapat menjalankan intake, servis, penjualan sparepart, pengadaan, hingga
  penagihan langsung dari website dengan data yang sama seperti di Desk.
* Pravenya/Frappe site maintainers can follow
  [`docs/pravenya_setup.md`](docs/pravenya_setup.md) to install the DocType
  catalogue and try the workflow end-to-end langsung dari Desk.

### DocType Catalogue

Folder `garage/garage/doctype` sekarang memuat DocType resmi yang memetakan
setiap langkah pada diagram workflow:

- `Garage Customer` & `Garage Vehicle` untuk data master pelanggan.
- `Garage Service Order` beserta tabel anak inspeksi, task, parts, progress,
  dan QC guna menangani jalur servis/repair.
- `Garage Spare Part Order` untuk transaksi pembelian sparepart langsung.
- `Garage Procurement Order` dan `Garage Stock Movement` untuk pengadaan serta
  pergerakan stok.
- `Garage Sales Invoice`, `Garage Payment Entry`, dan `Garage Receipt Document`
  untuk penagihan hingga bukti penerimaan pembayaran.

DocType ini ter-install otomatis ketika aplikasi di-`install-app` ke site Frappe
sehingga pengguna dapat langsung melakukan uji coba atau menambahkan custom
field sesuai kebutuhan operasi.

### Installation

You can install this app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch develop
bench install-app garage
```

### Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/garage
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade

### License

mit
