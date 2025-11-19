import React, { useState } from 'react';
import { FileText, Download, Calendar as CalendarIcon, Building2, Search, X, ArrowLeft, Filter } from 'lucide-react';
import { Button } from './ui/button';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import * as XLSX from 'xlsx';

// Format date helper
const formatDate = (date) => {
  if (!date) return 'Pilih tanggal';
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
};

export function Report({ currentUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(currentUser.role === 'branch' ? currentUser.branch : 'all');
  const [showPreview, setShowPreview] = useState(false);

  const reportCategories = [
    {
      name: 'TRANSACTION REPORTS',
      color: 'blue',
      reports: [
        {
          id: 'RPT-001',
          name: 'Laporan Registrasi Pelanggan',
          description: 'Daftar registrasi pelanggan dan kendaraan yang masuk per periode',
          category: 'Transaction'
        },
        {
          id: 'RPT-002',
          name: 'Laporan Service Orders',
          description: 'Daftar service order, status pekerjaan, dan mechanic yang ditugaskan',
          category: 'Transaction'
        },
        {
          id: 'RPT-003',
          name: 'Laporan Repair Orders (SPK)',
          description: 'Daftar Surat Perintah Kerja yang telah dibuat dan ditandatangani',
          category: 'Transaction'
        },
        {
          id: 'RPT-004',
          name: 'Laporan Penyelesaian Pekerjaan',
          description: 'Daftar pekerjaan yang telah selesai dikerjakan oleh mechanic',
          category: 'Transaction'
        },
        {
          id: 'RPT-005',
          name: 'Laporan Kendaraan Keluar (SIKK)',
          description: 'Daftar Surat Ijin Keluar Kendaraan yang telah diterbitkan',
          category: 'Transaction'
        }
      ]
    },
    {
      name: 'FINANCIAL REPORTS',
      color: 'emerald',
      reports: [
        {
          id: 'RPT-101',
          name: 'Laporan Invoice',
          description: 'Daftar invoice yang telah diterbitkan beserta detail biaya',
          category: 'Financial'
        },
        {
          id: 'RPT-102',
          name: 'Laporan Pembayaran',
          description: 'Daftar pembayaran yang telah diterima dari pelanggan',
          category: 'Financial'
        },
        {
          id: 'RPT-103',
          name: 'Laporan Piutang',
          description: 'Daftar invoice yang belum lunas atau menunggak pembayaran',
          category: 'Financial'
        },
        {
          id: 'RPT-104',
          name: 'Laporan Revenue per Cabang',
          description: 'Total pendapatan per cabang dalam periode tertentu',
          category: 'Financial'
        },
        {
          id: 'RPT-105',
          name: 'Laporan Revenue per Package',
          description: 'Analisis pendapatan berdasarkan jenis service package',
          category: 'Financial'
        }
      ]
    },
    {
      name: 'INVENTORY REPORTS',
      color: 'amber',
      reports: [
        {
          id: 'RPT-201',
          name: 'Laporan Stock Spare Parts',
          description: 'Daftar stock spare parts yang tersedia di gudang',
          category: 'Inventory'
        },
        {
          id: 'RPT-202',
          name: 'Laporan Permintaan Spare Parts',
          description: 'Daftar permintaan spare parts dari Service Orders',
          category: 'Inventory'
        },
        {
          id: 'RPT-203',
          name: 'Laporan Penggunaan Spare Parts',
          description: 'Daftar spare parts yang telah digunakan dalam pekerjaan',
          category: 'Inventory'
        },
        {
          id: 'RPT-204',
          name: 'Laporan Parts Movement',
          description: 'Riwayat pergerakan stock (masuk, keluar, adjust)',
          category: 'Inventory'
        },
        {
          id: 'RPT-205',
          name: 'Laporan Stock Minimum',
          description: 'Daftar spare parts yang stock-nya dibawah minimum',
          category: 'Inventory'
        }
      ]
    },
    {
      name: 'OPERATIONAL REPORTS',
      color: 'indigo',
      reports: [
        {
          id: 'RPT-301',
          name: 'Laporan Produktivitas Mechanic',
          description: 'Performa dan jumlah pekerjaan yang diselesaikan per mechanic',
          category: 'Operational'
        },
        {
          id: 'RPT-302',
          name: 'Laporan Customer Service Performance',
          description: 'Performa CS dalam handling registrasi dan follow-up',
          category: 'Operational'
        },
        {
          id: 'RPT-303',
          name: 'Laporan Follow-up Pelanggan',
          description: 'Daftar follow-up yang telah dilakukan dan hasilnya',
          category: 'Operational'
        },
        {
          id: 'RPT-304',
          name: 'Laporan Waktu Pengerjaan',
          description: 'Analisis durasi pengerjaan dari registrasi hingga selesai',
          category: 'Operational'
        }
      ]
    },
    {
      name: 'ANALYTICS REPORTS',
      color: 'purple',
      reports: [
        {
          id: 'RPT-401',
          name: 'Laporan Summary per Cabang',
          description: 'Ringkasan data transaksi, revenue, dan inventory per cabang',
          category: 'Analytics'
        },
        {
          id: 'RPT-402',
          name: 'Laporan Top Customer',
          description: 'Daftar pelanggan dengan transaksi terbanyak atau tertinggi',
          category: 'Analytics'
        },
        {
          id: 'RPT-403',
          name: 'Laporan Service Package Terlaris',
          description: 'Analisis paket service yang paling banyak dipilih',
          category: 'Analytics'
        },
        {
          id: 'RPT-404',
          name: 'Laporan Trend Bulanan',
          description: 'Grafik trend transaksi dan revenue per bulan',
          category: 'Analytics'
        },
        {
          id: 'RPT-405',
          name: 'Laporan Customer Retention',
          description: 'Analisis pelanggan baru vs pelanggan repeat',
          category: 'Analytics'
        }
      ]
    }
  ];

  const branches = [
    { id: 'all', name: 'Semua Cabang' },
    { id: 'Jakarta', name: 'Jakarta' },
    { id: 'Bandung', name: 'Bandung' },
    { id: 'Surabaya', name: 'Surabaya' }
  ];

  // Generate sample data based on report type
  const generateSampleData = (reportId) => {
    const branch = selectedBranch === 'all' ? 'Jakarta' : selectedBranch;
    
    switch (reportId) {
      case 'RPT-001': // Registrasi Pelanggan
        return [
          { no: 1, regId: 'JKT-001', tanggal: '2024-11-01', nama: 'Budi Santoso', kendaraan: 'Toyota Avanza - B 1234 XYZ', telp: '081234567890', keluhan: 'Service Berkala' },
          { no: 2, regId: 'JKT-002', tanggal: '2024-11-02', nama: 'Siti Nurhaliza', kendaraan: 'Honda Jazz - B 5678 ABC', telp: '081234567891', keluhan: 'Ganti Oli' },
          { no: 3, regId: 'JKT-003', tanggal: '2024-11-03', nama: 'Ahmad Dhani', kendaraan: 'Suzuki Ertiga - B 9012 DEF', telp: '081234567892', keluhan: 'Check Engine' }
        ];
      
      case 'RPT-002': // Service Orders
        return [
          { no: 1, orderId: 'JKT-001', tanggal: '2024-11-01', pelanggan: 'Budi Santoso', kendaraan: 'B 1234 XYZ', mechanic: 'Agus Mekanik', status: 'In Progress', packages: 'Full Service' },
          { no: 2, orderId: 'JKT-002', tanggal: '2024-11-02', pelanggan: 'Siti Nurhaliza', kendaraan: 'B 5678 ABC', mechanic: 'Budi Mekanik', status: 'Completed', packages: 'Oil Change' },
          { no: 3, orderId: 'JKT-003', tanggal: '2024-11-03', pelanggan: 'Ahmad Dhani', kendaraan: 'B 9012 DEF', mechanic: 'Candra Mekanik', status: 'In Progress', packages: 'Engine Diagnostic' }
        ];

      case 'RPT-003': // SPK
        return [
          { no: 1, spkNo: 'SPK-JKT-001', tanggal: '2024-11-01', orderId: 'JKT-001', pelanggan: 'Budi Santoso', mechanic: 'Agus Mekanik', ttdCustomer: '✓', ttdMechanic: '✓', status: 'Signed' },
          { no: 2, spkNo: 'SPK-JKT-002', tanggal: '2024-11-02', orderId: 'JKT-002', pelanggan: 'Siti Nurhaliza', mechanic: 'Budi Mekanik', ttdCustomer: '✓', ttdMechanic: '✓', status: 'Signed' },
          { no: 3, spkNo: 'SPK-JKT-003', tanggal: '2024-11-03', orderId: 'JKT-003', pelanggan: 'Ahmad Dhani', mechanic: 'Candra Mekanik', ttdCustomer: '-', ttdMechanic: '-', status: 'Pending' }
        ];

      case 'RPT-101': // Invoice
        return [
          { no: 1, invoiceNo: 'INV-JKT-001', tanggal: '2024-11-01', orderId: 'JKT-001', pelanggan: 'Budi Santoso', totalJasa: 'Rp 500.000', totalParts: 'Rp 300.000', total: 'Rp 800.000', status: 'Paid' },
          { no: 2, invoiceNo: 'INV-JKT-002', tanggal: '2024-11-02', orderId: 'JKT-002', pelanggan: 'Siti Nurhaliza', totalJasa: 'Rp 200.000', totalParts: 'Rp 150.000', total: 'Rp 350.000', status: 'Paid' },
          { no: 3, invoiceNo: 'INV-JKT-003', tanggal: '2024-11-03', orderId: 'JKT-003', pelanggan: 'Ahmad Dhani', totalJasa: 'Rp 750.000', totalParts: 'Rp 400.000', total: 'Rp 1.150.000', status: 'Unpaid' }
        ];

      case 'RPT-102': // Pembayaran
        return [
          { no: 1, paymentId: 'PAY-001', tanggal: '2024-11-01', invoiceNo: 'INV-JKT-001', pelanggan: 'Budi Santoso', total: 'Rp 800.000', metodeBayar: 'Cash', kasir: 'Admin Jakarta' },
          { no: 2, paymentId: 'PAY-002', tanggal: '2024-11-02', invoiceNo: 'INV-JKT-002', pelanggan: 'Siti Nurhaliza', total: 'Rp 350.000', metodeBayar: 'Transfer', kasir: 'Admin Jakarta' },
          { no: 3, paymentId: 'PAY-003', tanggal: '2024-11-05', invoiceNo: 'INV-JKT-003', pelanggan: 'Ahmad Dhani', total: 'Rp 1.150.000', metodeBayar: 'Credit Card', kasir: 'Admin Jakarta' }
        ];

      case 'RPT-201': // Stock Spare Parts
        return [
          { no: 1, partCode: 'OIL-001', partName: 'Engine Oil 10W-40', kategori: 'Oli & Pelumas', stock: 45, minimum: 20, satuan: 'Liter', harga: 'Rp 75.000' },
          { no: 2, partCode: 'BRK-001', partName: 'Brake Pad Front', kategori: 'Brake System', stock: 12, minimum: 10, satuan: 'Set', harga: 'Rp 250.000' },
          { no: 3, partCode: 'FLT-001', partName: 'Oil Filter', kategori: 'Filter', stock: 8, minimum: 15, satuan: 'Pcs', harga: 'Rp 45.000' }
        ];

      case 'RPT-301': // Produktivitas Mechanic
        return [
          { no: 1, mechanic: 'Agus Mekanik', totalJobs: 23, completed: 21, inProgress: 2, avgDuration: '2.5 jam', rating: '4.8/5' },
          { no: 2, mechanic: 'Budi Mekanik', totalJobs: 19, completed: 18, inProgress: 1, avgDuration: '2.2 jam', rating: '4.9/5' },
          { no: 3, mechanic: 'Candra Mekanik', totalJobs: 15, completed: 13, inProgress: 2, avgDuration: '3.1 jam', rating: '4.5/5' }
        ];

      case 'RPT-401': // Summary per Cabang
        return [
          { no: 1, cabang: 'Jakarta', totalOrder: 145, totalRevenue: 'Rp 125.500.000', totalParts: 234, avgOrderValue: 'Rp 865.517' },
          { no: 2, cabang: 'Bandung', totalOrder: 98, totalRevenue: 'Rp 87.300.000', totalParts: 156, avgOrderValue: 'Rp 890.816' },
          { no: 3, cabang: 'Surabaya', totalOrder: 112, totalRevenue: 'Rp 102.400.000', totalParts: 189, avgOrderValue: 'Rp 914.285' }
        ];

      default:
        return [
          { no: 1, col1: 'Sample Data 1', col2: 'Value 1', col3: 'Info 1' },
          { no: 2, col1: 'Sample Data 2', col2: 'Value 2', col3: 'Info 2' },
          { no: 3, col1: 'Sample Data 3', col2: 'Value 3', col3: 'Info 3' }
        ];
    }
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setDateFrom(null);
    setDateTo(null);
    setShowPreview(false);
  };

  const handleGeneratePreview = () => {
    if (!dateFrom || !dateTo) {
      alert('⚠️ Mohon pilih periode tanggal terlebih dahulu!');
      return;
    }
    setShowPreview(true);
  };

  const handleExport = () => {
    if (!selectedReport || !dateFrom || !dateTo) return;

    const data = generateSampleData(selectedReport.id);
    if (data.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedReport.name} - ${formatDate(dateFrom)} s/d ${formatDate(dateTo)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getCategoryColor = (color) => {
    const colors = {
      blue: 'border-blue-500 bg-blue-50',
      emerald: 'border-emerald-500 bg-emerald-50',
      amber: 'border-amber-500 bg-amber-50',
      indigo: 'border-indigo-500 bg-indigo-50',
      purple: 'border-purple-500 bg-purple-50'
    };
    return colors[color] || 'border-slate-500 bg-slate-50';
  };

  const getCategoryTextColor = (color) => {
    const colors = {
      blue: 'text-blue-700',
      emerald: 'text-emerald-700',
      amber: 'text-amber-700',
      indigo: 'text-indigo-700',
      purple: 'text-purple-700'
    };
    return colors[color] || 'text-slate-700';
  };

  const filteredCategories = reportCategories.map(category => ({
    ...category,
    reports: category.reports.filter(report => {
      const matchSearch = report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    })
  })).filter(category => category.reports.length > 0);

  const totalReports = filteredCategories.reduce((sum, cat) => sum + cat.reports.length, 0);

  // Render table based on report data
  const renderPreviewTable = () => {
    if (!selectedReport || !showPreview) return null;

    const data = generateSampleData(selectedReport.id);
    if (data.length === 0) return null;

    const columns = Object.keys(data[0]);

    return (
      <div className="mt-6 border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                {columns.map(col => (
                  <th key={col} className="px-4 py-3 text-left text-slate-700 uppercase text-xs">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  {columns.map(col => (
                    <td key={col} className="px-4 py-3 text-sm text-slate-600">
                      {row[col]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200">
          <p className="text-sm text-slate-600">
            Menampilkan {data.length} data dari periode {dateFrom && formatDate(dateFrom)} s/d {dateTo && formatDate(dateTo)}
          </p>
        </div>
      </div>
    );
  };

  // If report is selected, show detail view
  if (selectedReport) {
    return (
      <div className="h-screen flex flex-col bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedReport(null)}
                className="mr-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-sm font-mono">{selectedReport.id}</span>
                  <h1 className="text-slate-800">{selectedReport.name}</h1>
                </div>
                <p className="text-slate-600">{selectedReport.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Preview */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              {/* Filter Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Branch Filter */}
                <div>
                  <label className="block text-sm text-slate-700 mb-2">
                    <Building2 className="w-4 h-4 inline mr-2" />
                    Cabang
                  </label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => {
                      setSelectedBranch(e.target.value);
                      setShowPreview(false);
                    }}
                    disabled={currentUser.role === 'branch'}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  >
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date From */}
                <div>
                  <label className="block text-sm text-slate-700 mb-2">
                    <CalendarIcon className="w-4 h-4 inline mr-2" />
                    Dari Tanggal
                  </label>
                  <DatePicker
                    selected={dateFrom}
                    onChange={(date) => {
                      if (date) {
                        setDateFrom(date);
                        setShowPreview(false);
                      }
                    }}
                    selectsStart
                    startDate={dateFrom}
                    endDate={dateTo}
                    maxDate={dateTo || new Date()}
                    dateFormat="dd MMM yyyy"
                    placeholderText="Pilih tanggal awal"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Date To */}
                <div>
                  <label className="block text-sm text-slate-700 mb-2">
                    <CalendarIcon className="w-4 h-4 inline mr-2" />
                    Sampai Tanggal
                  </label>
                  <DatePicker
                    selected={dateTo}
                    onChange={(date) => {
                      if (date) {
                        setDateTo(date);
                        setShowPreview(false);
                      }
                    }}
                    selectsEnd
                    startDate={dateFrom}
                    endDate={dateTo}
                    minDate={dateFrom}
                    maxDate={new Date()}
                    dateFormat="dd MMM yyyy"
                    placeholderText="Pilih tanggal akhir"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleGeneratePreview}
                  disabled={!dateFrom || !dateTo}
                  className="bg-blue-500 hover:bg-blue-600 text-white disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Generate Preview
                </Button>
                
                <Button
                  onClick={handleExport}
                  disabled={!showPreview}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export to Excel
                </Button>
              </div>

              {/* Preview Table */}
              {renderPreviewTable()}

              {!showPreview && (
                <div className="mt-6 text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                  <Filter className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">Pilih periode tanggal dan klik "Generate Preview" untuk melihat data</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main list view
  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-slate-800">Laporan / Report</h1>
              <p className="text-slate-600">Pilih report untuk melihat data dan export ke Excel</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-slate-600">Total Report</p>
            <p className="text-slate-800">{totalReports} Laporan</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari report..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Report List */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {filteredCategories.map((category, catIndex) => (
            <div key={catIndex} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              {/* Category Header */}
              <div className={`px-6 py-3 border-l-4 ${getCategoryColor(category.color)}`}>
                <h2 className={`${getCategoryTextColor(category.color)}`}>
                  {category.name}
                  <span className="ml-2 text-slate-500">({category.reports.length})</span>
                </h2>
              </div>

              {/* Report List */}
              <div className="divide-y divide-slate-100">
                {category.reports.map((report, idx) => (
                  <div 
                    key={report.id}
                    className="px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => handleViewReport(report)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-slate-500 text-sm font-mono">{report.id}</span>
                          <h3 className="text-slate-800">{report.name}</h3>
                        </div>
                        <p className="text-slate-600 text-sm">{report.description}</p>
                      </div>
                      <Button
                        className="bg-blue-500 hover:bg-blue-600 text-white shrink-0"
                        size="sm"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Lihat Report
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
              <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-slate-600 mb-2">Tidak ada report ditemukan</h3>
              <p className="text-slate-500">Coba ubah kata kunci pencarian</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-white border-t border-slate-200 px-6 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-slate-600">
              📊 {totalReports} Report tersedia
            </span>
            <span className="text-slate-600">
              👤 {currentUser.displayName} ({currentUser.role === 'admin' ? 'Administrator' : `Cabang ${currentUser.branch}`})
            </span>
          </div>
          <span className="text-slate-500">
            IMOGI Workshop - Report System
          </span>
        </div>
      </div>
    </div>
  );
}