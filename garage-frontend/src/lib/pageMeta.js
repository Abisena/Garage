const APP_NAME = 'IMOGI Workshop';

export const PAGE_META = {
  dashboard: {
    title: 'Dashboard',
    description: 'Ringkasan operasional bengkel IMOGI Workshop — service order, pembayaran, dan stok.',
  },
  registration: {
    title: 'Registrasi Pelanggan',
    description: 'Daftarkan pelanggan dan kendaraan baru untuk proses servis bengkel.',
  },
  inspection: {
    title: 'Inspeksi & Diagnosis',
    description: 'Lakukan pemeriksaan kendaraan dan catat temuan diagnosis servis.',
  },
  orders: {
    title: 'Repair Orders',
    description: 'Kelola order perbaikan kendaraan dan progress pekerjaan mekanik.',
  },
  inventory: {
    title: 'Inventori',
    description: 'Pantau stok sparepart dan ketersediaan barang di gudang.',
  },
  spareparts: {
    title: 'Spare Parts',
    description: 'Daftar sparepart dan informasi stok bengkel.',
  },
  sparepartsrequest: {
    title: 'Permintaan Sparepart',
    description: 'Ajukan dan proses permintaan sparepart untuk service order.',
  },
  buyingsparepart: {
    title: 'Pembelian Sparepart',
    description: 'Buat dan kelola purchase order sparepart dari vendor.',
  },
  directsales: {
    title: 'Penjualan Langsung',
    description: 'Catat penjualan sparepart langsung ke pelanggan.',
  },
  transferstock: {
    title: 'Transfer Stok',
    description: 'Transfer sparepart antar gudang atau cabang bengkel.',
  },
  workshop: {
    title: 'Repair & QC',
    description: 'Pantau pengerjaan servis dan quality control foreman.',
  },
  paymentprocess: {
    title: 'Proses Pembayaran',
    description: 'Proses pembayaran servis dan penjualan sparepart pelanggan.',
  },
  paymentlist: {
    title: 'Daftar Pembayaran',
    description: 'Riwayat dan daftar transaksi pembayaran bengkel.',
  },
  handover: {
    title: 'Serah Terima Kendaraan',
    description: 'Proses serah terima kendaraan setelah servis selesai dan lunas.',
  },
  followup: {
    title: 'Follow-up Pelanggan',
    description: 'Tindak lanjut pelanggan dan piutang servis bengkel.',
  },
  reports: {
    title: 'Laporan',
    description: 'Laporan operasional dan keuangan bengkel IMOGI Workshop.',
  },
  process: {
    title: 'Alur Proses Bisnis',
    description: 'Panduan alur proses operasional bengkel IMOGI Workshop.',
  },
  processdiagram: {
    title: 'Business Process Flow',
    description: 'Diagram alur bisnis servis bengkel IMOGI Workshop dari registrasi pelanggan hingga serah terima kendaraan.',
  },
  login: {
    title: 'Login',
    description: 'Masuk ke sistem manajemen bengkel IMOGI Workshop.',
  },
};

export function getPageMeta(pageId) {
  const meta = PAGE_META[pageId] || PAGE_META.dashboard;
  return {
    ...meta,
    fullTitle: `${meta.title} | ${APP_NAME}`,
  };
}

export { APP_NAME };

export const PAGE_PATHS = {
  dashboard: '/dashboard',
  registration: '/registration',
  inspection: '/inspection',
  orders: '/orders',
  inventory: '/inventory',
  spareparts: '/spare-parts',
  sparepartsrequest: '/spare-parts/request',
  buyingsparepart: '/spare-parts/buying',
  directsales: '/spare-parts/direct-sales',
  workshop: '/workshop',
  paymentprocess: '/payment/process',
  paymentlist: '/payment/list',
  handover: '/handover',
  followup: '/follow-up',
  reports: '/reports',
  transferstock: '/spare-parts/transfer-stock',
  process: '/process-flow',
  processdiagram: '/business-process-flow',
  login: '/login',
};
