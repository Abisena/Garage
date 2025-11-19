import React from 'react';
import { Car, User, FileText, X } from 'lucide-react';
import { Button } from './ui/button';

export function SIKKPrint({ order, onClose }) {
  const currentDate = new Date();
  const dateStr = currentDate.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const timeStr = currentDate.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const handlePrint = () => {
    // Open print preview in new window - SAMA SEPERTI NOTA/INVOICE
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('⚠️ Pop-up blocked! Please allow pop-ups for better print preview.');
      window.print();
      return;
    }
    
    const sikkContent = document.querySelector('.sikk-print-content');
    if (!sikkContent) {
      window.print();
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SIKK - ${order.sikkNumber || 'N/A'}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
            }
            
            ${sikkContent.querySelector('style')?.textContent || ''}
          </style>
        </head>
        <body>
          ${sikkContent.innerHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
            
            window.onafterprint = function() {
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
        
        {/* Modal Container */}
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="screen-only bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg">SURAT IJIN KENDARAAN</h3>
                <p className="text-sm text-blue-100">Exit Permit - {order.sikkNumber || 'N/A'} (A5 Landscape)</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-auto bg-slate-100 p-6 screen-only">
            
            {/* SIKK Document Content */}
            <div className="sikk-print-content">
              <style>{`
                @media print {
                  @page {
                    size: A5 landscape;
                    margin: 10mm;
                  }
                  
                  * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                  }
                  
                  body {
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                  
                  .sikk-page {
                    position: relative !important;
                    width: 190mm !important;
                    height: 128mm !important;
                    page-break-after: auto !important;
                    page-break-inside: avoid !important;
                    overflow: hidden !important;
                    background: white !important;
                  }
                  
                  .screen-only {
                    display: none !important;
                  }
                  
                  .header-bg {
                    background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%) !important;
                  }
                  
                  .blue-bg {
                    background-color: #eff6ff !important;
                    border-color: #3b82f6 !important;
                  }
                  
                  .amber-bg {
                    background-color: #fffbeb !important;
                    border-color: #f59e0b !important;
                  }
                  
                  .red-bg {
                    background-color: #fef2f2 !important;
                    border-color: #ef4444 !important;
                  }
                }

                @media screen {
                  .sikk-page {
                    width: 210mm;
                    height: 148mm;
                    background: white;
                    margin: 0 auto;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                  }
                }
              `}</style>

              {/* Single SIKK Page */}
              <div className="sikk-page" style={{ padding: '10mm 8mm' }}>
                
                {/* Document Header */}
                <div className="flex items-start justify-between mb-2 pb-1.5 border-b-2 border-slate-900">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-600 rounded-lg p-1.5">
                      <Car className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl text-slate-900 leading-tight" style={{ fontWeight: 900 }}>
                        SURAT IJIN KENDARAAN
                      </h1>
                      <p className="text-slate-600 text-xs">IMOGI Workshop - Cabang {order.branch || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="header-bg rounded-lg px-3 py-1.5 text-right">
                    <p className="text-blue-100 text-xs">No. Surat</p>
                    <p className="text-white text-xl font-mono tracking-wide" style={{ fontWeight: 700 }}>
                      {order.sikkNumber || 'GENERATING...'}
                    </p>
                    <p className="text-blue-100 text-xs mt-0.5">{dateStr} | {timeStr}</p>
                  </div>
                </div>

                {/* Main 2-Column Layout */}
                <div className="grid grid-cols-2 gap-2.5">
                  
                  {/* LEFT COLUMN */}
                  <div className="space-y-1.5">
                    
                    {/* Plate Number - Prominent */}
                    <div className="blue-bg border-4 rounded-lg p-3 text-center">
                      <p className="text-blue-700 text-xs mb-0.5 uppercase tracking-wide" style={{ fontWeight: 700 }}>
                        Nomor Polisi
                      </p>
                      <p className="text-blue-900 text-4xl font-mono tracking-wider leading-tight" style={{ fontWeight: 900 }}>
                        {order.plateNumber || 'N/A'}
                      </p>
                    </div>

                    {/* Vehicle Info */}
                    <div className="bg-white border-2 border-slate-300 rounded-lg p-2">
                      <h3 className="text-slate-800 text-xs mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200" style={{ fontWeight: 700 }}>
                        <Car className="w-3.5 h-3.5 text-slate-600" />
                        INFORMASI KENDARAAN
                      </h3>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600">Merk / Model</span>
                          <span className="text-slate-900 text-right" style={{ fontWeight: 600 }}>
                            {order.vehicleBrand || 'N/A'} {order.vehicleModel || ''}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600">Tahun</span>
                          <span className="text-slate-900" style={{ fontWeight: 600 }}>
                            {order.vehicleYear || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600">Warna</span>
                          <span className="text-slate-900" style={{ fontWeight: 600 }}>
                            {order.vehicleColor || 'Silver'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Owner Info */}
                    <div className="bg-white border-2 border-slate-300 rounded-lg p-2">
                      <h3 className="text-slate-800 text-xs mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200" style={{ fontWeight: 700 }}>
                        <User className="w-3.5 h-3.5 text-slate-600" />
                        PEMILIK KENDARAAN
                      </h3>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600">Nama</span>
                          <span className="text-slate-900 text-right" style={{ fontWeight: 600 }}>
                            {order.customerName || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN */}
                  <div className="space-y-1.5">
                    
                    {/* Security Checklist */}
                    <div className="amber-bg border-2 rounded-lg p-2">
                      <h3 className="text-amber-900 text-xs mb-1.5" style={{ fontWeight: 700 }}>
                        ✓ CHECKLIST SECURITY
                      </h3>
                      <div className="space-y-1">
                        <label className="flex items-center gap-1.5 p-1 hover:bg-amber-100 rounded cursor-pointer">
                          <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300" />
                          <span className="text-amber-900 text-xs">Nomor polisi sesuai</span>
                        </label>
                        <label className="flex items-center gap-1.5 p-1 hover:bg-amber-100 rounded cursor-pointer">
                          <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300" />
                          <span className="text-amber-900 text-xs">Merk/model kendaraan sesuai</span>
                        </label>
                        <label className="flex items-center gap-1.5 p-1 hover:bg-amber-100 rounded cursor-pointer">
                          <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300" />
                          <span className="text-amber-900 text-xs">Pemilik kendaraan sesuai</span>
                        </label>
                        <label className="flex items-center gap-1.5 p-1 hover:bg-amber-100 rounded cursor-pointer">
                          <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300" />
                          <span className="text-amber-900 text-xs">Dokumen SIKK valid</span>
                        </label>
                      </div>
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="border-2 border-slate-300 rounded-lg p-2 bg-white">
                        <p className="text-slate-700 text-xs text-center mb-6" style={{ fontWeight: 600 }}>
                          Petugas Workshop
                        </p>
                        <div className="border-t-2 border-slate-300 pt-1">
                          <p className="text-slate-500 text-xs text-center">TTD</p>
                        </div>
                      </div>
                      <div className="border-2 border-slate-300 rounded-lg p-2 bg-white">
                        <p className="text-slate-700 text-xs text-center mb-6" style={{ fontWeight: 600 }}>
                          Security
                        </p>
                        <div className="border-t-2 border-slate-300 pt-1">
                          <p className="text-slate-500 text-xs text-center">TTD</p>
                        </div>
                      </div>
                    </div>

                    {/* Warning */}
                    <div className="red-bg border-2 rounded-lg p-2">
                      <p className="text-red-800 text-xs text-center leading-tight" style={{ fontWeight: 700 }}>
                        ⚠️ SURAT INI HARUS DITUNJUKKAN<br/>KEPADA SECURITY
                      </p>
                      <p className="text-red-700 text-xs text-center mt-1">
                        Dokumen berlaku untuk sekali keluar
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="text-center pt-1 border-t border-slate-200">
                      {order.sikkPrintCount && order.sikkPrintCount > 0 && (
                        <p className="text-slate-400 mt-1" style={{ fontSize: '8px', fontWeight: 600 }}>
                          CETAKAN KE-{order.sikkPrintCount}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Action Buttons */}
          <div className="screen-only flex gap-3 justify-end p-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Tutup
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              Cetak SIKK
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}