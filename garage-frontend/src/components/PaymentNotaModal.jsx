import React from 'react';
import { X, CheckCircle, Clock, Printer, Wallet, Receipt, FileText, Phone, Mail, Calendar } from 'lucide-react';
import { Button } from './ui/button';

export function PaymentNotaModal({
  isOpen,
  selectedOrder,
  onClose,
  onProceedToPayment,
  onPreviewNota,
  onPreviewInvoice,
  onNotaPrinted,
  formatCurrency,
  calculatePartsCost,
  getOrderLaborCost,
  calculateGrandTotal
}) {
  const [isNotaPrinted, setIsNotaPrinted] = React.useState(false);
  const [showPrintPreview, setShowPrintPreview] = React.useState(false);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setIsNotaPrinted(false);
      setShowPrintPreview(false);
    }
  }, [isOpen]);

  if (!isOpen || !selectedOrder) return null;

  const handlePrint = () => {
    window.print();
    setIsNotaPrinted(true);
    setShowPrintPreview(false);
    onNotaPrinted(selectedOrder.orderId);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="text-slate-800 text-xl">Nota Faktur</h3>
          <button onClick={onClose} className="text-slate-600 hover:bg-slate-200 rounded-lg p-2 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-3xl mx-auto bg-white border-2 border-slate-300 rounded-lg p-8">
            {/* Header Nota */}
            <div className="border-b-2 border-slate-800 pb-4 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-baseline gap-4 mb-2">
                    <h1 className="text-slate-900 text-3xl">NOTA FAKTUR</h1>
                    <p className="text-slate-800 font-semibold font-mono text-3xl">{selectedOrder.branch.substring(0, 3).toUpperCase()}-NF-{selectedOrder.orderId.split('-')[1]}</p>
                  </div>
                  <p className="text-slate-600">Workshop Management System</p>
                  <p className="text-slate-600">Cabang {selectedOrder.branch}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div className="flex gap-6">
                  <div className="flex gap-2">
                    <p className="text-slate-600">No. Order:</p>
                    <p className="text-slate-900 font-semibold font-mono">{selectedOrder.orderId}</p>
                  </div>
                  <div className="flex gap-2">
                    <p className="text-slate-600">Tanggal:</p>
                    <p className="text-slate-900 font-semibold">{selectedOrder.date}</p>
                  </div>
                </div>
                {selectedOrder.invoiceNumber && (
                  <div className="flex gap-6">
                    <div className="flex gap-2">
                      <p className="text-slate-600">No. Invoice:</p>
                      <p className="text-slate-900 font-semibold font-mono">{selectedOrder.invoiceNumber}</p>
                    </div>
                    <div className="flex gap-2">
                      <p className="text-slate-600">Tgl. Bayar:</p>
                      <p className="text-slate-900 font-semibold">{selectedOrder.paymentDate || '-'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Data Pelanggan & Kendaraan */}
            <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
              <div className="border border-slate-300 rounded-lg p-4">
                <h3 className="text-slate-800 font-semibold mb-3 pb-2 border-b border-slate-300">DATA PELANGGAN</h3>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <p className="text-slate-600 text-xs">Nama:</p>
                    <p className="text-slate-900 font-semibold">{selectedOrder.customerName}</p>
                  </div>
                  {selectedOrder.address && (
                    <div>
                      <p className="text-slate-600 text-xs">Alamat:</p>
                      <p className="text-slate-900 text-xs">{selectedOrder.address}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-slate-300 rounded-lg p-4">
                <h3 className="text-slate-800 font-semibold mb-3 pb-2 border-b border-slate-300">DATA KENDARAAN</h3>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <p className="text-slate-600 text-xs">No. Polisi:</p>
                    <div className="inline-block bg-black text-white font-mono font-bold px-3 py-1 rounded text-xs">
                      {selectedOrder.plateNumber}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabel Suku Cadang */}
            {selectedOrder.spareParts && selectedOrder.spareParts.length > 0 && (
              <div className="mb-6">
                <h3 className="text-slate-800 font-semibold mb-3">DAFTAR SUKU CADANG & JASA</h3>
                <table className="w-full border-2 border-slate-300">
                  <thead>
                    <tr className="bg-slate-200 border-b-2 border-slate-300">
                      <th className="px-3 py-2 text-left text-xs text-slate-700 border-r border-slate-300">KODE PART</th>
                      <th className="px-3 py-2 text-left text-xs text-slate-700 border-r border-slate-300">NAMA BARANG/JASA</th>
                      <th className="px-3 py-2 text-center text-xs text-slate-700 border-r border-slate-300">QTY</th>
                      <th className="px-3 py-2 text-right text-xs text-slate-700 border-r border-slate-300">HARGA</th>
                      <th className="px-3 py-2 text-right text-xs text-slate-700">JUMLAH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.spareParts.map((part, index) => (
                      <tr key={part.id} className={`border-b border-slate-300 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        <td className="px-3 py-2 text-xs font-mono text-slate-700 border-r border-slate-300">{part.partNumber}</td>
                        <td className="px-3 py-2 text-xs text-slate-800 border-r border-slate-300">{part.name}</td>
                        <td className="px-3 py-2 text-xs text-center text-slate-700 border-r border-slate-300">{part.quantity}</td>
                        <td className="px-3 py-2 text-xs text-right text-slate-700 border-r border-slate-300">{formatCurrency(part.unitPrice)}</td>
                        <td className="px-3 py-2 text-xs text-right text-slate-900 font-semibold">{formatCurrency(part.totalPrice)}</td>
                      </tr>
                    ))}
                    {/* Labor Cost Row with Service Type Name */}
                    <tr className="border-b-2 border-slate-300 bg-slate-50">
                      <td className="px-3 py-2 text-xs font-mono text-slate-700 border-r border-slate-300">-</td>
                      <td className="px-3 py-2 text-xs text-slate-800 border-r border-slate-300">{selectedOrder.serviceType}</td>
                      <td className="px-3 py-2 text-xs text-center text-slate-700 border-r border-slate-300">1</td>
                      <td className="px-3 py-2 text-xs text-right text-slate-700 border-r border-slate-300">{formatCurrency(getOrderLaborCost(selectedOrder))}</td>
                      <td className="px-3 py-2 text-xs text-right text-slate-900 font-semibold">{formatCurrency(getOrderLaborCost(selectedOrder))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Total Pembayaran & TTD Kasir */}
            <div className="border-t-2 border-slate-800 pt-4 mt-6">
              <div className="flex justify-between items-start">
                {/* TTD Kasir - Sebelah Kiri */}
                <div className="text-center text-sm w-64 mt-8">
                  <p className="text-slate-600 mb-16">Kasir</p>
                </div>

                {/* Summary Total - Sebelah Kanan */}
                <div className="w-80">
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Sub Total:</span>
                      <span className="text-slate-900">{formatCurrency(calculatePartsCost(selectedOrder.spareParts) + getOrderLaborCost(selectedOrder))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">DPP (Dasar Pengenaan Pajak):</span>
                      <span className="text-slate-900">{formatCurrency(calculatePartsCost(selectedOrder.spareParts) + getOrderLaborCost(selectedOrder))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">PPN 11%:</span>
                      <span className="text-slate-900">{formatCurrency((calculatePartsCost(selectedOrder.spareParts) + getOrderLaborCost(selectedOrder)) * 0.11)}</span>
                    </div>
                  </div>
                  <div className="border-t-2 border-slate-800 pt-3 flex justify-between items-center bg-slate-100 px-4 py-3 rounded">
                    <span className="text-slate-900 font-bold text-lg">TOTAL:</span>
                    <span className="text-slate-900 font-bold text-2xl">{formatCurrency((calculatePartsCost(selectedOrder.spareParts) + getOrderLaborCost(selectedOrder)) * 1.11)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            {selectedOrder.paymentStatus === 'paid' && (
              <div className="mt-6 border border-emerald-600 bg-emerald-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600 text-xs mb-1">Metode Pembayaran:</p>
                    <p className="text-slate-900 font-semibold uppercase">{selectedOrder.paymentMethod || 'CASH'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs mb-1">Tanggal Pembayaran:</p>
                    <p className="text-slate-900 font-semibold">{selectedOrder.paymentDate || selectedOrder.date}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Print Count Badge - Only show if this is a reprint (count >= 1) */}
            {selectedOrder.notaPrintCount && selectedOrder.notaPrintCount >= 1 && (
              <div className="mt-6 flex justify-end">
                <div className="print-count-badge inline-flex items-center gap-2 text-slate-600 text-sm">
                  <Printer className="w-4 h-4" />
                  <span className="font-semibold">Cetakan ke-{selectedOrder.notaPrintCount + 1}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3 justify-end">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="px-6"
          >
            <X className="w-4 h-4 mr-2" />
            Tutup
          </Button>
          
          {selectedOrder.paymentStatus === 'paid' && (
            <>
              <Button 
                variant="outline" 
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  onPreviewNota();
                }}
                className="border-amber-500 text-amber-600 hover:bg-amber-50 px-6"
              >
                <Receipt className="w-4 h-4 mr-2" />
                Preview Nota
              </Button>
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  onPreviewInvoice();
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6"
              >
                <FileText className="w-4 h-4 mr-2" />
                {selectedOrder.invoiceNumber ? 'Lihat Invoice' : 'Preview Invoice'}
                {selectedOrder.invoicePrintCount && selectedOrder.invoicePrintCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-xs">
                    ({selectedOrder.invoicePrintCount}x)
                  </span>
                )}
              </Button>
            </>
          )}

          {selectedOrder.paymentStatus !== 'paid' && selectedOrder.paymentStatus !== 'cancelled' && (
            <>
              <Button 
                variant="outline"
                onClick={() => {
                  setShowPrintPreview(true);
                }} 
                className="border-slate-400 text-slate-700 hover:bg-slate-100 px-6"
              >
                <Printer className="w-4 h-4 mr-2" />
                Cetak Nota
              </Button>
              <Button 
                disabled={!isNotaPrinted && selectedOrder.paymentStatus !== 'nota-printed'}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  onPreviewInvoice();
                }}
                variant="outline"
                className={`px-6 ${(!isNotaPrinted && selectedOrder.paymentStatus !== 'nota-printed') ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <FileText className="w-4 h-4 mr-2" />
                Invoice
              </Button>
              <Button 
                disabled={!isNotaPrinted && selectedOrder.paymentStatus !== 'nota-printed'}
                onClick={() => {
                  onClose();
                  onProceedToPayment();
                }} 
                className={`px-6 ${(!isNotaPrinted && selectedOrder.paymentStatus !== 'nota-printed') ? 'opacity-50 cursor-not-allowed bg-slate-400' : 'bg-gradient-to-r from-blue-600 to-indigo-700'}`}
              >
                <Wallet className="w-4 h-4 mr-2" />
                Proses Pembayaran
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Print Preview Modal */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-700">
              <div className="flex items-center gap-3">
                <Printer className="w-6 h-6 text-white" />
                <h3 className="text-white text-xl">Preview Cetak Nota Faktur</h3>
              </div>
              <button 
                onClick={() => setShowPrintPreview(false)} 
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-8 bg-slate-100">
              <div id="print-nota-content" className="max-w-3xl mx-auto bg-white border-2 border-slate-300 rounded-lg p-8 shadow-lg">
                {/* Header Nota */}
                <div className="border-b-2 border-slate-800 pb-4 mb-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-baseline gap-4 mb-2">
                        <h1 className="text-slate-900 text-3xl">NOTA FAKTUR</h1>
                        <p className="text-slate-800 font-semibold font-mono text-3xl">{selectedOrder.branch.substring(0, 3).toUpperCase()}-NF-{selectedOrder.orderId.split('-')[1]}</p>
                      </div>
                      <p className="text-slate-600">Workshop Management System</p>
                      <p className="text-slate-600">Cabang {selectedOrder.branch}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div className="flex gap-6">
                      <div className="flex gap-2">
                        <p className="text-slate-600">No. Order:</p>
                        <p className="text-slate-900 font-semibold font-mono">{selectedOrder.orderId}</p>
                      </div>
                      <div className="flex gap-2">
                        <p className="text-slate-600">Tanggal:</p>
                        <p className="text-slate-900 font-semibold">{selectedOrder.date}</p>
                      </div>
                    </div>
                    {selectedOrder.invoiceNumber && (
                      <div className="flex gap-6">
                        <div className="flex gap-2">
                          <p className="text-slate-600">No. Invoice:</p>
                          <p className="text-slate-900 font-semibold font-mono">{selectedOrder.invoiceNumber}</p>
                        </div>
                        <div className="flex gap-2">
                          <p className="text-slate-600">Tgl. Bayar:</p>
                          <p className="text-slate-900 font-semibold">{selectedOrder.paymentDate || '-'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Data Pelanggan & Kendaraan */}
                <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
                  <div className="border border-slate-300 rounded-lg p-4">
                    <h3 className="text-slate-800 font-semibold mb-3 pb-2 border-b border-slate-300">DATA PELANGGAN</h3>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <p className="text-slate-600 text-xs">Nama:</p>
                        <p className="text-slate-900 font-semibold">{selectedOrder.customerName}</p>
                      </div>
                      {selectedOrder.address && (
                        <div>
                          <p className="text-slate-600 text-xs">Alamat:</p>
                          <p className="text-slate-900 text-xs">{selectedOrder.address}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border border-slate-300 rounded-lg p-4">
                    <h3 className="text-slate-800 font-semibold mb-3 pb-2 border-b border-slate-300">DATA KENDARAAN</h3>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <p className="text-slate-600 text-xs">No. Polisi:</p>
                        <div className="inline-block bg-black text-white font-mono font-bold px-3 py-1 rounded text-xs">
                          {selectedOrder.plateNumber}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabel Suku Cadang */}
                {selectedOrder.spareParts && selectedOrder.spareParts.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-slate-800 font-semibold mb-3">DAFTAR SUKU CADANG & JASA</h3>
                    <table className="w-full border-2 border-slate-300">
                      <thead>
                        <tr className="bg-slate-200 border-b-2 border-slate-300">
                          <th className="px-3 py-2 text-left text-xs text-slate-700 border-r border-slate-300">KODE PART</th>
                          <th className="px-3 py-2 text-left text-xs text-slate-700 border-r border-slate-300">NAMA BARANG/JASA</th>
                          <th className="px-3 py-2 text-center text-xs text-slate-700 border-r border-slate-300">QTY</th>
                          <th className="px-3 py-2 text-right text-xs text-slate-700 border-r border-slate-300">HARGA</th>
                          <th className="px-3 py-2 text-right text-xs text-slate-700">JUMLAH</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.spareParts.map((part, index) => (
                          <tr key={part.id} className={`border-b border-slate-300 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                            <td className="px-3 py-2 text-xs font-mono text-slate-700 border-r border-slate-300">{part.partNumber}</td>
                            <td className="px-3 py-2 text-xs text-slate-800 border-r border-slate-300">{part.name}</td>
                            <td className="px-3 py-2 text-xs text-center text-slate-700 border-r border-slate-300">{part.quantity}</td>
                            <td className="px-3 py-2 text-xs text-right text-slate-700 border-r border-slate-300">{formatCurrency(part.unitPrice)}</td>
                            <td className="px-3 py-2 text-xs text-right text-slate-900 font-semibold">{formatCurrency(part.totalPrice)}</td>
                          </tr>
                        ))}
                        {/* Labor Cost Row with Service Type Name */}
                        <tr className="border-b-2 border-slate-300 bg-slate-50">
                          <td className="px-3 py-2 text-xs font-mono text-slate-700 border-r border-slate-300">-</td>
                          <td className="px-3 py-2 text-xs text-slate-800 border-r border-slate-300">{selectedOrder.serviceType}</td>
                          <td className="px-3 py-2 text-xs text-center text-slate-700 border-r border-slate-300">1</td>
                          <td className="px-3 py-2 text-xs text-right text-slate-700 border-r border-slate-300">{formatCurrency(getOrderLaborCost(selectedOrder))}</td>
                          <td className="px-3 py-2 text-xs text-right text-slate-900 font-semibold">{formatCurrency(getOrderLaborCost(selectedOrder))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Total Pembayaran & TTD Kasir */}
                <div className="border-t-2 border-slate-800 pt-4 mt-6">
                  <div className="flex justify-between items-start">
                    {/* TTD Kasir - Sebelah Kiri */}
                    <div className="text-center text-sm w-64 mt-8">
                      <p className="text-slate-600 mb-16">Kasir</p>
                    </div>

                    {/* Summary Total - Sebelah Kanan */}
                    <div className="w-80">
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Sub Total:</span>
                          <span className="text-slate-900">{formatCurrency(calculatePartsCost(selectedOrder.spareParts) + getOrderLaborCost(selectedOrder))}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">DPP (Dasar Pengenaan Pajak):</span>
                          <span className="text-slate-900">{formatCurrency(calculatePartsCost(selectedOrder.spareParts) + getOrderLaborCost(selectedOrder))}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">PPN 11%:</span>
                          <span className="text-slate-900">{formatCurrency((calculatePartsCost(selectedOrder.spareParts) + getOrderLaborCost(selectedOrder)) * 0.11)}</span>
                        </div>
                      </div>
                      <div className="border-t-2 border-slate-800 pt-3 flex justify-between items-center bg-slate-100 px-4 py-3 rounded">
                        <span className="text-slate-900 font-bold text-lg">TOTAL:</span>
                        <span className="text-slate-900 font-bold text-2xl">{formatCurrency((calculatePartsCost(selectedOrder.spareParts) + getOrderLaborCost(selectedOrder)) * 1.11)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                {selectedOrder.paymentStatus === 'paid' && (
                  <div className="mt-6 border border-emerald-600 bg-emerald-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600 text-xs mb-1">Metode Pembayaran:</p>
                        <p className="text-slate-900 font-semibold uppercase">{selectedOrder.paymentMethod || 'CASH'}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 text-xs mb-1">Tanggal Pembayaran:</p>
                        <p className="text-slate-900 font-semibold">{selectedOrder.paymentDate || selectedOrder.date}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Print Count Badge - Only show if this is a reprint (count >= 1) */}
                {selectedOrder.notaPrintCount && selectedOrder.notaPrintCount >= 1 && (
                  <div className="mt-6 flex justify-end">
                    <div className="print-count-badge inline-flex items-center gap-2 text-slate-600 text-sm">
                      <Printer className="w-4 h-4" />
                      <span className="font-semibold">Cetakan ke-{selectedOrder.notaPrintCount + 1}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowPrintPreview(false)}
                className="px-6"
              >
                <X className="w-4 h-4 mr-2" />
                Batal
              </Button>
              
              <Button 
                onClick={handlePrint}
                className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6"
              >
                <Printer className="w-4 h-4 mr-2" />
                Cetak Sekarang
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}