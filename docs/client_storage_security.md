# Keamanan Penyimpanan State di Frontend

Aplikasi saat ini menyimpan beberapa state seperti master spare parts, registrations, spare part request, dan work orders di `localStorage`. Untuk meningkatkan keamanan dan mengurangi risiko kebocoran data, pertimbangkan langkah-langkah berikut.

## Hindari Penyimpanan Data Sensitif di localStorage
- Jangan simpan data sensitif (token, data pengguna yang dapat diidentifikasi, atau payload bisnis penting) di `localStorage` karena rentan diakses oleh JavaScript pihak ketiga (XSS).
- Minimalisasi data yang disimpan di sisi klien; gunakan server-side session atau cache di backend bila memungkinkan.

## Gunakan Cookie HTTP-Only untuk Sesi/Token
- Pindahkan token autentikasi ke cookie HTTP-only dengan opsi `Secure`, `SameSite=Lax`/`Strict`, dan durasi hidup pendek.
- Validasi dan refresh token di server; jangan expose token mentah ke JavaScript.

## Enkripsi dan Validasi Data yang Diserialisasi
- Jika harus menyimpan konfigurasi non-sensitif di browser, enkripsi payload (mis. AES-GCM) sebelum disimpan dan tambahkan MAC/signature untuk mencegah tampering.
- Sertakan versi skema dan checksum agar data korup dapat ditolak dengan aman.

## Terapkan Penghapusan Otomatis dan Batas Retensi
- Bersihkan entry `localStorage` setelah logout atau ketika sesi kedaluwarsa di backend.
- Tambahkan metadata timestamp/TTL dan hapus data secara otomatis ketika kadaluarsa.

## Minimalkan Scope Data di Frontend State
- Muat data berdasarkan konteks halaman (lazy loading) daripada men-cache seluruh master data.
- Gunakan pagination/virtualization agar data besar tidak perlu disimpan permanen di browser.

## Pertahankan Keamanan Aplikasi Secara Umum
- Terapkan Content Security Policy (CSP) yang ketat untuk mengurangi risiko XSS.
- Lakukan input sanitization dan escaping output secara konsisten.
- Gunakan dependensi yang up-to-date dan audit kerentanan secara berkala.

## Audit dan Monitoring
- Tambahkan logging di server untuk akses atau mutasi data penting, bukan hanya di klien.
- Gunakan monitoring di frontend (mis. Sentry) untuk mendeteksi error terkait storage dan potensi misuse.

Dengan langkah-langkah ini, data frontend menjadi lebih sulit dieksfiltrasi atau dimanipulasi, sekaligus meminimalkan ketergantungan pada `localStorage` untuk data sensitif.
