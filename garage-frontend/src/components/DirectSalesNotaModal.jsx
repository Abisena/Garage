import React from 'react';
import { X, Printer, Wallet, Receipt, FileText, DollarSign, Percent } from 'lucide-react';
import { Button } from './ui/button';

export function DirectSalesNotaModal({
  isOpen,
  selectedSale,
  onClose,
  onProceedToPayment,
  formatCurrency,
  onGenerateNotaNumber,
  onOpenInvoice
}) {
  const [isNotaPrinted, setIsNotaPrinted] = React.useState(false);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setIsNotaPrinted(false);
    }
  }, [isOpen]);

  // Handle print and auto close modal after print dialog is closed
  React.useEffect(() => {
    const afterPrint = () => {
      setIsNotaPrinted(true);
      // Generate nota number and update status on first print
      if (selectedSale && !selectedSale.notaFakturNumber) {
        onGenerateNotaNumber(selectedSale.id);
      }
    };

    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('afterprint', afterPrint);
    };
  }, [selectedSale, onGenerateNotaNumber]);

  if (!isOpen || !selectedSale) return null;

  const handlePrint = () => {
    window.print();
  };

  // Generate sequential nota number from salesNumber
  const getNotaNumber = () => {
    // Extract number from salesNumber (e.g., "JKT-DS_0001" -> "0001")
    const match = selectedSale.salesNumber.match(/_(\d+)$/);
    return match ? match[1] : '0001';
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
          <div id="print-nota-content" className="max-w-3xl mx-auto bg-white border-2 border-slate-300 rounded-lg p-8">
            {/* Header Nota */}
            <div className="border-b-2 border-slate-800 pb-4 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-baseline gap-4 mb-2">
                    <h1 className="text-slate-900 text-3xl">NOTA FAKTUR</h1>
                    <p className="text-slate-800 font-semibold font-mono text-3xl">{selectedSale.branch.substring(0, 3).toUpperCase()}-NF-{getNotaNumber()}</p>
                  </div>
                  <p className="text-slate-600">Workshop Management System</p>
                  <p className="text-slate-600">Cabang {selectedSale.branch}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div className="flex gap-4">
                  <div className="flex gap-2">
                    <p className="text-slate-600 whitespace-nowrap">No. Sales:</p>
                    <p className="text-slate-900 font-semibold font-mono">{selectedSale.salesNumber}</p>
                  </div>
                  <div className="flex gap-2">
                    <p className="text-slate-600">Tanggal:</p>
                    <p className="text-slate-900 font-semibold">{selectedSale.date}</p>
                  </div>
                </div>
                {selectedSale.invoiceNumber && (
                  <div className="flex gap-6">
                    <div className="flex gap-2">
                      <p className="text-slate-600">No. Invoice:</p>
                      <p className="text-slate-900 font-semibold font-mono">{selectedSale.invoiceNumber}</p>
                    </div>
                    <div className="flex gap-2">
                      <p className="text-slate-600">Tgl. Bayar:</p>
                      <p className="text-slate-900 font-semibold">{selectedSale.paymentDate || '-'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Data Pelanggan */}
            <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
              <div className="border border-slate-300 rounded-lg p-4">
                <h3 className="text-slate-800 font-semibold mb-3 pb-2 border-b border-slate-300">DATA PELANGGAN</h3>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <p className="text-slate-600 text-xs">Nama:</p>
                    <p className="text-slate-900 font-semibold">{selectedSale.customerName}</p>
                  </div>
                </div>
              </div>

              <div className="border border-slate-300 rounded-lg p-4">
                <h3 className="text-slate-800 font-semibold mb-3 pb-2 border-b border-slate-300">JENIS TRANSAKSI</h3>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <p className="text-slate-600 text-xs">Tipe:</p>
                    <p className="text-slate-900 font-semibold">Direct Sales Sparepart</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabel Suku Cadang */}
            <div className="mb-6">
              <h3 className="text-slate-800 font-semibold mb-3">DAFTAR SUKU CADANG</h3>
              <table className="w-full border-2 border-slate-300">
                <thead>
                  <tr className="bg-slate-200 border-b-2 border-slate-300">
                    <th className="px-3 py-2 text-left text-xs text-slate-700 border-r border-slate-300">KODE PART</th>
                    <th className="px-3 py-2 text-left text-xs text-slate-700 border-r border-slate-300">NAMA BARANG</th>
                    <th className="px-3 py-2 text-center text-xs text-slate-700 border-r border-slate-300">QTY</th>
                    <th className="px-3 py-2 text-right text-xs text-slate-700 border-r border-slate-300">HARGA</th>
                    <th className="px-3 py-2 text-right text-xs text-slate-700 border-r border-slate-300">DISKON</th>
                    <th className="px-3 py-2 text-right text-xs text-slate-700">JUMLAH</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.items.map((item, index) => {
                    const itemSubtotal = item.unitPrice * item.quantity;
                    const discountAmount = item.discountType === 'percent' 
                      ? (itemSubtotal * item.discount) / 100 
                      : item.discount;
                    
                    return (
                      <tr key={item.id} className={`border-b border-slate-300 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        <td className="px-3 py-2 text-xs font-mono text-slate-700 border-r border-slate-300">{item.sparePart.partNumber}</td>
                        <td className="px-3 py-2 text-xs text-slate-800 border-r border-slate-300">{item.sparePart.name}</td>
                        <td className="px-3 py-2 text-xs text-center text-slate-700 border-r border-slate-300">{item.quantity}</td>
                        <td className="px-3 py-2 text-xs text-right text-slate-700 border-r border-slate-300">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-xs text-right text-slate-700 border-r border-slate-300">
                          {item.discount > 0 ? (
                            <span className="text-red-600">
                              {item.discountType === 'percent' 
                                ? `${item.discount}%` 
                                : formatCurrency(item.discount)
                              }
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-right text-slate-900 font-semibold">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Notes */}
            {selectedSale.notes && (
              <div className="mb-6 border border-amber-300 bg-amber-50 rounded-lg p-3">
                <p className="text-slate-600 text-xs mb-1">Catatan:</p>
                <p className="text-slate-900 text-sm">{selectedSale.notes}</p>
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
                      <span className="text-slate-900">{formatCurrency(selectedSale.subtotal)}</span>
                    </div>
                    {selectedSale.totalDiscount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-red-600">Total Diskon:</span>
                        <span className="text-red-600">- {formatCurrency(selectedSale.totalDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">DPP (Dasar Pengenaan Pajak):</span>
                      <span className="text-slate-900">{formatCurrency(selectedSale.dpp)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">PPN 11%:</span>
                      <span className="text-slate-900">{formatCurrency(selectedSale.ppn)}</span>
                    </div>
                  </div>
                  <div className="border-t-2 border-slate-800 pt-3 flex justify-between items-center bg-slate-100 px-4 py-3 rounded">
                    <span className="text-slate-900 font-bold text-lg">TOTAL:</span>
                    <span className="text-slate-900 font-bold text-2xl">{formatCurrency(selectedSale.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            {selectedSale.paymentStatus === 'paid' && (
              <div className="mt-6 border border-emerald-600 bg-emerald-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600 text-xs mb-1">Metode Pembayaran:</p>
                    <p className="text-slate-900 font-semibold uppercase">{selectedSale.paymentMethod || 'CASH'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs mb-1">Tanggal Pembayaran:</p>
                    <p className="text-slate-900 font-semibold">{selectedSale.paymentDate || selectedSale.date}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Print Count Badge - Show if notaFakturNumber exists */}
            {selectedSale.notaFakturNumber && (
              <div className="mt-6 flex justify-end">
                <div className="print-count-badge inline-flex items-center gap-1.5 text-slate-500 text-xs">
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetakan ke-{(selectedSale.notaPrintCount || 0) + 1}</span>
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
          
          {selectedSale.paymentStatus === 'paid' && (
            <>
              <Button 
                variant="outline" 
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrint();
                }}
                className="border-amber-500 text-amber-600 hover:bg-amber-50 px-6"
              >
                <Receipt className="w-4 h-4 mr-2" />
                Preview Nota
              </Button>
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenInvoice();
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6"
              >
                <FileText className="w-4 h-4 mr-2" />
                {selectedSale.invoiceNumber ? 'Lihat Invoice' : 'Preview Invoice'}
                {selectedSale.invoicePrintCount && selectedSale.invoicePrintCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-xs">
                    ({selectedSale.invoicePrintCount}x)
                  </span>
                )}
              </Button>
            </>
          )}

          {selectedSale.paymentStatus !== 'paid' && (
            <>
              <Button 
                variant="outline"
                onClick={handlePrint}
                className="border-slate-400 text-slate-700 hover:bg-slate-100 px-6"
              >
                <Printer className="w-4 h-4 mr-2" />
                Cetak Nota
              </Button>
              <Button 
                disabled={!isNotaPrinted && selectedSale.paymentStatus !== 'nota-printed'}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenInvoice();
                }}
                variant="outline"
                className={`px-6 ${(!isNotaPrinted && selectedSale.paymentStatus !== 'nota-printed') ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <FileText className="w-4 h-4 mr-2" />
                Invoice
              </Button>
              <Button 
                disabled={!isNotaPrinted && selectedSale.paymentStatus !== 'nota-printed'}
                onClick={onProceedToPayment}
                className={`bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 px-8 ${(!isNotaPrinted && selectedSale.paymentStatus !== 'nota-printed') ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Wallet className="w-4 h-4 mr-2" />
                Proses Pembayaran
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}