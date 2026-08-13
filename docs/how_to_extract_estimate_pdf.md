# Menyimpan file estimasi servis dari payload JSON

Webhook `Garage` mengirimkan file estimasi servis di dalam payload JSON sebagai string Base64. Paket ini tidak otomatis tersimpan sebagai berkas di server penerima. Gunakan utilitas `estimate_pdf_decoder` untuk mengekstraknya.

## Langkah cepat

```bash
python -m garage.utils.estimate_pdf_decoder payload.json --output-dir docs/estimates
```

- Ganti `payload.json` dengan file yang berisi contoh JSON pada pesan webhook.
- Direktori keluaran akan dibuat otomatis bila belum ada.
- File PDF akan disimpan menggunakan nama yang diberikan di `estimate_pdf.filename`.

## Format payload yang didukung

Potongan JSON minimum yang dibutuhkan:

```json
{
  "message": {
    "estimate_pdf": {
      "filename": "26-estimasi-service.pdf",
      "content": "<string base64>"
    }
  }
}
```

Jika kunci di atas tidak ditemukan, skrip akan menghentikan proses dengan pesan kesalahan yang menjelaskan nilai yang hilang.

## Membaca dari *stdin*

Anda juga bisa mengirim JSON langsung melalui *stdin* tanpa membuat file sementara:

```bash
cat payload.json | python -m garage.utils.estimate_pdf_decoder - --output-dir /tmp/estimates
```

Skrip akan menampilkan jalur lengkap berkas PDF yang dihasilkan ketika proses berhasil.
