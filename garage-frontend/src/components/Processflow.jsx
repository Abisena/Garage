import React from 'react';
import { ProcessStepCard } from './ProcessStepCard';
import { 
  ClipboardList, 
  Search, 
  FileText, 
  Package, 
  Wrench, 
  CheckCircle, 
  CreditCard, 
  Car,
  MessageCircle,
  ArrowRight
} from 'lucide-react';

export function ProcessFlow() {
  const processSteps = [
    {
      number: 1,
      title: 'Customer Registration',
      department: 'Front Office',
      icon: ClipboardList,
      color: 'bg-blue-500',
      description: 'Pendaftaran awal pelanggan dan kendaraan dengan pembuatan ID Registrasi otomatis (JKT-001, BDG-001, SBY-001)',
      tasks: [
        'Catat data pribadi pelanggan (Nama, Telepon, Email)',
        'Catat informasi kendaraan (Merek, Model, Nomor Plat, Tahun)',
        'Catat keluhan dan permintaan servis',
        'Buat ID Registrasi otomatis sesuai cabang',
        'Foto kondisi kendaraan (opsional)',
        'Tunjuk mekanik untuk inspeksi'
      ],
      documents: ['Formulir Registrasi', 'Dokumen Penerimaan Kendaraan'],
      duration: '10-15 menit',
      keyPoint: 'Data harus lengkap dan akurat agar proses berjalan lancar'
    },
    {
      number: 2,
      title: 'Inspection & Diagnosis',
      department: 'Mekanik',
      icon: Search,
      color: 'bg-slate-600',
      description: 'Pemeriksaan menyeluruh kendaraan untuk menemukan masalah dan kebutuhan perbaikan',
      tasks: [
        'Periksa kondisi luar dan dalam kendaraan',
        'Scan komputer kendaraan (OBD-II)',
        'Test drive untuk cek kelainan',
        'Cek level oli dan kondisi ban',
        'Foto semua temuan',
        'Tentukan perbaikan dan suku cadang yang dibutuhkan'
      ],
      documents: ['Laporan Inspeksi', 'Hasil Diagnosis', 'Dokumentasi Foto'],
      duration: '30-60 menit',
      keyPoint: 'Inspeksi harus teliti agar rencana perbaikan akurat'
    },
    {
      number: 3,
      title: 'Repair Orders',
      department: 'Front Office',
      icon: FileText,
      color: 'bg-blue-500',
      description: 'Buat order perbaikan lengkap dengan estimasi biaya dan persetujuan pelanggan',
      tasks: [
        'Tinjau laporan inspeksi dari mekanik',
        'Buat order dengan ID Order (JKT-001, BDG-001, SBY-001)',
        'Daftar semua servis dan suku cadang yang diperlukan',
        'Hitung total estimasi biaya (suku cadang + jasa)',
        'Jelaskan penawaran ke pelanggan',
        'Minta persetujuan dan tanda tangan pelanggan',
        'Buat Surat Perintah Kerja (SPK)'
      ],
      documents: ['Order Perbaikan', 'Penawaran Harga', 'SPK (tanda tangan digital)', 'Persetujuan Pelanggan'],
      duration: '15-30 menit',
      keyPoint: 'Komunikasi jelas dan dokumentasi persetujuan lengkap'
    },
    {
      number: 4,
      title: 'Spare Parts',
      department: 'Suku Cadang',
      icon: Package,
      color: 'bg-amber-500',
      description: 'Pengelolaan lengkap suku cadang: Permintaan, Pembelian, Penjualan Langsung, dan Data Master',
      tasks: [
        'Terima permintaan suku cadang dari mekanik',
        'Cek ketersediaan di gudang (Master Suku Cadang)',
        'Beli dari supplier jika stok tidak cukup',
        'Layani penjualan langsung ke pelanggan walk-in',
        'Periksa kualitas suku cadang yang datang',
        'Update stok gudang',
        'Hubungkan suku cadang ke order perbaikan',
        'Kelola database master suku cadang'
      ],
      documents: ['Form Permintaan', 'Order Pembelian', 'Invoice Penjualan Langsung', 'Kartu Stok', 'Invoice Supplier'],
      duration: '1-4 jam (tergantung ketersediaan)',
      keyPoint: 'Kelola stok dengan baik agar suku cadang selalu tersedia'
    },
    {
      number: 5,
      title: 'Repair & QC',
      department: 'Mekanik',
      icon: Wrench,
      color: 'bg-slate-600',
      description: 'Pekerjaan perbaikan dan perawatan sesuai SPK dengan dokumentasi lengkap',
      tasks: [
        'Baca SPK dan detail order perbaikan',
        'Pastikan semua suku cadang sudah tersedia',
        'Lakukan perbaikan dan ganti suku cadang',
        'Ikuti spesifikasi dari pabrik',
        'Catat kemajuan pekerjaan dengan waktu',
        'Catat suku cadang yang dipakai dan jam kerja',
        'Foto sebelum dan sesudah perbaikan',
        'Update status perbaikan di sistem'
      ],
      documents: ['Laporan Kemajuan Kerja', 'Catatan Pemakaian Suku Cadang', 'Lembar Jam Kerja', 'Foto Pekerjaan'],
      duration: '2-8 jam (tergantung tingkat kesulitan)',
      keyPoint: 'Kerjakan dengan kualitas terbaik dan dokumentasi lengkap'
    },
    {
      number: 6,
      title: 'Quality Check',
      department: 'Mekanik',
      icon: CheckCircle,
      color: 'bg-slate-600',
      description: 'Pemeriksaan kualitas menyeluruh untuk memastikan semua perbaikan sesuai standar',
      tasks: [
        'Periksa semua pekerjaan yang sudah selesai',
        'Test semua sistem dan komponen yang diperbaiki',
        'Test drive untuk cek performa kendaraan',
        'Pastikan tidak ada masalah baru',
        'Cek kebocoran dan pemasangan yang benar',
        'Pastikan semua keluhan pelanggan sudah teratasi',
        'Catat hasil pemeriksaan dengan checklist',
        'Minta persetujuan supervisor'
      ],
      documents: ['Checklist Kualitas', 'Laporan Test Drive', 'Persetujuan Kualitas', 'Foto Inspeksi Akhir'],
      duration: '30-45 menit',
      keyPoint: 'Tidak boleh ada cacat untuk kepuasan pelanggan'
    },
    {
      number: 7,
      title: 'Payment',
      department: 'Keuangan',
      icon: CreditCard,
      color: 'bg-emerald-500',
      description: 'Proses pembayaran lengkap dengan berbagai metode dan dokumen cetak',
      tasks: [
        'Hitung total tagihan (suku cadang + jasa + pajak)',
        'Berikan diskon jika ada',
        'Buat invoice dari sistem',
        'Proses pembayaran (Tunai/Transfer/Kartu/Kredit)',
        'Catat detail pembayaran di sistem',
        'Cetak dokumen pembayaran:',
        '  • Cetak Nota (Nota Penjualan)',
        '  • Cetak Invoice (Tagihan Detail)',
        '  • Cetak Penerimaan Uang (Bukti Bayar)',
        'Update catatan keuangan'
      ],
      documents: ['Invoice', 'Nota', 'Penerimaan Uang', 'Bukti Pembayaran', 'Invoice Pajak'],
      duration: '10-20 menit',
      keyPoint: 'Tagihan harus akurat dan dokumentasi lengkap'
    },
    {
      number: 8,
      title: 'Vehicle Handover',
      department: 'Front Office',
      icon: Car,
      color: 'bg-blue-500',
      description: 'Serah terima kendaraan secara profesional dengan penjelasan dan SIKK (Surat Ijin Keluar Kendaraan)',
      tasks: [
        'Buat janji serah terima dengan pelanggan',
        'Siapkan kendaraan (cuci dan bersihkan)',
        'Jelaskan semua perbaikan yang dilakukan',
        'Berikan saran perawatan',
        'Tunjukkan cara kerja fitur yang diperbaiki',
        'Serahkan semua dokumen dan invoice',
        'Buat SIKK (Surat Ijin Keluar Kendaraan)',
        'Minta tanda tangan pelanggan di SIKK',
        'Buat janji servis berikutnya',
        'Berikan informasi garansi'
      ],
      documents: ['SIKK (tanda tangan digital)', 'Ringkasan Perbaikan', 'Kartu Garansi', 'Jadwal Perawatan', 'Semua dokumen sebelumnya'],
      duration: '15-30 menit',
      keyPoint: 'Pastikan pelanggan puas dan dokumentasi lengkap'
    },
    {
      number: 9,
      title: 'Follow-up',
      department: 'Front Office',
      icon: MessageCircle,
      color: 'bg-blue-500',
      description: 'Tindak lanjut setelah servis untuk memastikan kepuasan dan membangun hubungan jangka panjang',
      tasks: [
        'Kirim ucapan terima kasih via WhatsApp/Email',
        'Telepon follow-up dalam 3 hari',
        'Lakukan survei kepuasan pelanggan',
        'Kumpulkan masukan dan saran',
        'Tangani keluhan setelah servis jika ada',
        'Catat feedback di sistem',
        'Tawarkan program loyalitas',
        'Kirim pengingat servis untuk perawatan berikutnya',
        'Tangani klaim garansi jika ada',
        'Bangun hubungan pelanggan untuk retensi'
      ],
      documents: ['Survei Pelanggan', 'Form Masukan', 'Log Tindak Lanjut', 'Kartu Program Loyalitas'],
      duration: '5-10 menit per pelanggan',
      keyPoint: 'Jaga pelanggan agar kembali dan perbaikan terus menerus'
    }
  ];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-slate-800 mb-2">Alur Proses Bisnis</h1>
          <p className="text-slate-600">Alur Kerja 9 Tahap IMOGI Workshop yang Lengkap</p>
          <p className="text-slate-500 mt-2">Dari Registrasi Pelanggan hingga Tindak Lanjut - Siklus Servis Lengkap</p>
        </div>

        {/* Process Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center gap-3 mb-2">
              <ClipboardList className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="text-slate-800">Total Tahapan</h3>
                <p className="text-slate-600">9 Tahap Lengkap</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
              <div>
                <h3 className="text-slate-800">4 Dokumen Cetak</h3>
                <p className="text-slate-600">Nota, Invoice, Penerimaan, SIKK</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200">
            <div className="flex items-center gap-3 mb-2">
              <Wrench className="w-8 h-8 text-amber-600" />
              <div>
                <h3 className="text-slate-800">Tanda Tangan Digital</h3>
                <p className="text-slate-600">SPK & SIKK</p>
              </div>
            </div>
          </div>
        </div>

        {/* Process Grid - 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative">
          {processSteps.map((step, index) => (
            <div key={step.number} className="relative">
              <ProcessStepCard {...step} />
              
              {/* Arrow for desktop - right arrow for items not in last column */}
              {(index + 1) % 3 !== 0 && index < processSteps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-6 transform -translate-y-1/2 z-10">
                  <ArrowRight className="w-8 h-8 text-slate-300" />
                </div>
              )}
              
              {/* Arrow for items at end of row going to next row */}
              {(index + 1) % 3 === 0 && index < processSteps.length - 1 && (
                <div className="hidden lg:flex absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10 justify-center">
                  <div className="w-1 h-8 bg-slate-300 relative">
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-slate-300"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Department Summary */}
        <div className="mt-12">
          <h2 className="text-slate-800 mb-4 text-center">Pembagian Departemen</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <div className="text-center">
                <h3 className="text-blue-900 mb-2">Front Office</h3>
                <p className="text-blue-600">4 Tahap</p>
                <div className="mt-3 space-y-1">
                  <p className="text-blue-700">• Registrasi (1)</p>
                  <p className="text-blue-700">• Order (3)</p>
                  <p className="text-blue-700">• Serah Terima (8)</p>
                  <p className="text-blue-700">• Tindak Lanjut (9)</p>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-300">
              <div className="text-center">
                <h3 className="text-slate-900 mb-2">Mekanik</h3>
                <p className="text-slate-600">3 Tahap</p>
                <div className="mt-3 space-y-1">
                  <p className="text-slate-700">• Inspeksi (2)</p>
                  <p className="text-slate-700">• Perbaikan (5)</p>
                  <p className="text-slate-700">• Pemeriksaan Kualitas (6)</p>
                </div>
              </div>
            </div>
            
            <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
              <div className="text-center">
                <h3 className="text-amber-900 mb-2">Suku Cadang</h3>
                <p className="text-amber-600">1 Tahap</p>
                <div className="mt-3 space-y-1">
                  <p className="text-amber-700">• Suku Cadang (4)</p>
                  <p className="text-amber-600">Permintaan, Pembelian,</p>
                  <p className="text-amber-600">Penjualan Langsung, Master</p>
                </div>
              </div>
            </div>
            
            <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200">
              <div className="text-center">
                <h3 className="text-emerald-900 mb-2">Keuangan</h3>
                <p className="text-emerald-600">1 Tahap</p>
                <div className="mt-3 space-y-1">
                  <p className="text-emerald-700">• Pembayaran (7)</p>
                  <p className="text-emerald-600">4 Dokumen Cetak:</p>
                  <p className="text-emerald-600">Nota, Invoice, Penerimaan</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Documents Section */}
        <div className="mt-12 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-8 border border-slate-200">
          <h2 className="text-slate-800 mb-6 text-center">📄 Dokumen & Fitur Utama</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <h3 className="text-slate-800 mb-3">💳 Cetak Nota</h3>
              <p className="text-slate-600">Nota penjualan sederhana untuk referensi cepat pelanggan</p>
              <p className="text-slate-500 mt-2">Dibuat di: Pembayaran</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <h3 className="text-slate-800 mb-3">📊 Cetak Invoice</h3>
              <p className="text-slate-600">Tagihan detail dengan rincian suku cadang & jasa</p>
              <p className="text-slate-500 mt-2">Dibuat di: Pembayaran</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <h3 className="text-slate-800 mb-3">💰 Penerimaan Uang</h3>
              <p className="text-slate-600">Bukti penerimaan resmi untuk catatan keuangan</p>
              <p className="text-slate-500 mt-2">Dibuat di: Pembayaran</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <h3 className="text-slate-800 mb-3">🚗 SIKK</h3>
              <p className="text-slate-600">Surat Ijin Keluar Kendaraan dengan tanda tangan digital</p>
              <p className="text-slate-500 mt-2">Dibuat di: Serah Terima</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 border border-blue-200">
              <h3 className="text-slate-800 mb-3">✍️ Tanda Tangan Digital</h3>
              <ul className="text-slate-600 space-y-2">
                <li>• <strong>SPK (Surat Perintah Kerja)</strong> - Persetujuan pelanggan di Order Perbaikan</li>
                <li>• <strong>SIKK</strong> - Tanda tangan pelanggan di Serah Terima Kendaraan</li>
                <li>• Aman & sah secara hukum</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-amber-200">
              <h3 className="text-slate-800 mb-3">🏢 Sistem Multi Cabang</h3>
              <ul className="text-slate-600 space-y-2">
                <li>• <strong>Jakarta:</strong> JKT-001, JKT-002...</li>
                <li>• <strong>Bandung:</strong> BDG-001, BDG-002...</li>
                <li>• <strong>Surabaya:</strong> SBY-001, SBY-002...</li>
                <li>• Akses berdasarkan hak per cabang</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Process Flow Summary */}
        <div className="mt-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-200">
          <h2 className="text-slate-800 mb-6 text-center">🎯 Waktu Siklus Servis Lengkap</h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-4 bg-white rounded-lg p-4 border border-slate-200">
              <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">1</div>
              <div className="flex-1">
                <h4 className="text-slate-800">Customer Registration</h4>
                <p className="text-slate-600">10-15 menit</p>
              </div>
              <ArrowRight className="text-slate-400" />
            </div>
            
            <div className="flex items-center gap-4 bg-white rounded-lg p-4 border border-slate-200">
              <div className="bg-slate-600 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">2</div>
              <div className="flex-1">
                <h4 className="text-slate-800">Inspection & Diagnosis</h4>
                <p className="text-slate-600">30-60 menit</p>
              </div>
              <ArrowRight className="text-slate-400" />
            </div>
            
            <div className="flex items-center gap-4 bg-white rounded-lg p-4 border border-slate-200">
              <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">3</div>
              <div className="flex-1">
                <h4 className="text-slate-800">Repair Orders + SPK</h4>
                <p className="text-slate-600">15-30 menit</p>
              </div>
              <ArrowRight className="text-slate-400" />
            </div>
            
            <div className="flex items-center gap-4 bg-white rounded-lg p-4 border border-slate-200">
              <div className="bg-amber-500 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">4</div>
              <div className="flex-1">
                <h4 className="text-slate-800">Spare Parts</h4>
                <p className="text-slate-600">1-4 jam</p>
              </div>
              <ArrowRight className="text-slate-400" />
            </div>
            
            <div className="flex items-center gap-4 bg-white rounded-lg p-4 border border-slate-200">
              <div className="bg-slate-600 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">5</div>
              <div className="flex-1">
                <h4 className="text-slate-800">Repair & QC</h4>
                <p className="text-slate-600">2-8 jam</p>
              </div>
              <ArrowRight className="text-slate-400" />
            </div>
            
            <div className="flex items-center gap-4 bg-white rounded-lg p-4 border border-slate-200">
              <div className="bg-slate-600 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">6</div>
              <div className="flex-1">
                <h4 className="text-slate-800">Quality Check</h4>
                <p className="text-slate-600">30-45 menit</p>
              </div>
              <ArrowRight className="text-slate-400" />
            </div>
            
            <div className="flex items-center gap-4 bg-white rounded-lg p-4 border border-slate-200">
              <div className="bg-emerald-500 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">7</div>
              <div className="flex-1">
                <h4 className="text-slate-800">Payment + 3 Dokumen</h4>
                <p className="text-slate-600">10-20 menit</p>
              </div>
              <ArrowRight className="text-slate-400" />
            </div>
            
            <div className="flex items-center gap-4 bg-white rounded-lg p-4 border border-slate-200">
              <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">8</div>
              <div className="flex-1">
                <h4 className="text-slate-800">Vehicle Handover + SIKK</h4>
                <p className="text-slate-600">15-30 menit</p>
              </div>
              <ArrowRight className="text-slate-400" />
            </div>
            
            <div className="flex items-center gap-4 bg-white rounded-lg p-4 border border-emerald-200">
              <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">9</div>
              <div className="flex-1">
                <h4 className="text-slate-800">Follow-up</h4>
                <p className="text-slate-600">5-10 menit</p>
              </div>
              <CheckCircle className="text-emerald-600" />
            </div>
          </div>

          <div className="mt-6 text-center p-4 bg-white rounded-lg border border-blue-200">
            <p className="text-slate-800"><strong>Total Waktu Rata-rata:</strong> 4-12 jam (tergantung tingkat kesulitan perbaikan)</p>
            <p className="text-slate-600 mt-1">Ditambah waktu pengadaan suku cadang jika tidak tersedia</p>
          </div>
        </div>

        {/* Brand Footer */}
        <div className="mt-12 text-center p-6 bg-slate-800 rounded-xl text-white">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Wrench className="w-8 h-8" />
            <h2>IMOGI Workshop</h2>
          </div>
          <p className="text-slate-300">Sistem Manajemen Bengkel Multi Cabang</p>
          <p className="text-slate-400 mt-2">imogiofficial@cao-group.co.id</p>
          <div className="mt-4 flex justify-center gap-4 text-slate-400">
            <span>Jakarta • Bandung • Surabaya</span>
          </div>
        </div>
      </div>
    </div>
  );
}
