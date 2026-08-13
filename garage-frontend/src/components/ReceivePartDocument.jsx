import React, { useState } from 'react';
import { Package, CheckCircle, Calendar, User, Building2, Printer, X } from 'lucide-react';
import { Button } from './ui/button';

export function ReceivePartDocument({
  poNumber,
  vendor,
  orderDate,
  receiveDate,
  receivedBy,
  branch,
  items,
  totalAmount,
  onClose,
  onConfirm
}) {
  const [isPrinted, setIsPrinted] = useState(false);

  const generateReceiveNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 9000) + 1000;
    return `RCV-${year}${month}-${random}`;
  };

  const receiveNumber = generateReceiveNumber();

  const handlePrint = () => {
    window.print();
    // Enable confirmation button after printing
    setTimeout(() => {
      setIsPrinted(true);
    }, 500);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getConditionBadge = (condition) => {
    switch (condition) {
      case 'good':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">✓ Good</span>;
      case 'damaged':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">✗ Damaged</span>;
      case 'incomplete':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">⚠ Incomplete</span>;
      default:
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">✓ Good</span>;
    }
  };

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
          {/* Header - Hidden when printing */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-slate-900">Dokumen Penerimaan Barang</h2>
                <p className="text-slate-600 text-sm">Review dan cetak dokumen penerimaan</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Document Content */}
          <div className="flex-1 overflow-y-auto p-6" id="receive-document-content">
            <div className="max-w-4xl mx-auto bg-white">
              {/* Document Header - Single Line */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-slate-300">
                <div>
                  <h1 className="text-slate-900 text-xl">GOODS RECEIVING DOCUMENT</h1>
                </div>
                <div className="text-right">
                  <p className="text-slate-600 text-sm">No. Dokumen:</p>
                  <p className="text-slate-900 font-mono">{receiveNumber}</p>
                </div>
              </div>

              {/* Company & Document Info */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="mb-4">
                    <h3 className="text-slate-900 mb-2">IMOGI Workshop</h3>
                    <p className="text-slate-600 text-sm">Bengkel Multi-Cabang</p>
                    <p className="text-slate-600 text-sm">Jakarta • Bandung • Surabaya</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-600">Cabang:</span>
                      <span className="text-slate-900 font-medium">{branch}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-600">Diterima oleh:</span>
                      <span className="text-slate-900 font-medium">{receivedBy}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="mb-4">
                    <h3 className="text-slate-900 mb-2">Vendor/Supplier</h3>
                    <p className="text-slate-900">{vendor}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-slate-600">Nomor PO:</span>
                      <span className="text-slate-900 font-mono font-medium">{poNumber}</span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-600">Tgl. Order:</span>
                      <span className="text-slate-900">{new Date(orderDate).toLocaleDateString('id-ID')}</span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-slate-600">Tgl. Terima:</span>
                      <span className="text-slate-900 font-medium">{new Date(receiveDate).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-6">
                <h3 className="text-slate-900 mb-3">Detail Barang yang Diterima</h3>
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-slate-700 border-b border-slate-300">No</th>
                        <th className="px-4 py-3 text-left text-slate-700 border-b border-slate-300">Part Number</th>
                        <th className="px-4 py-3 text-left text-slate-700 border-b border-slate-300">Nama Part</th>
                        <th className="px-4 py-3 text-center text-slate-700 border-b border-slate-300">Qty Order</th>
                        <th className="px-4 py-3 text-center text-slate-700 border-b border-slate-300">Qty Terima</th>
                        <th className="px-4 py-3 text-center text-slate-700 border-b border-slate-300">Kondisi</th>
                        <th className="px-4 py-3 text-right text-slate-700 border-b border-slate-300">Harga Satuan</th>
                        <th className="px-4 py-3 text-right text-slate-700 border-b border-slate-300">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index} className="border-b border-slate-200 last:border-0">
                          <td className="px-4 py-3 text-slate-900">{index + 1}</td>
                          <td className="px-4 py-3 text-slate-900 font-mono text-xs">{item.partNumber}</td>
                          <td className="px-4 py-3 text-slate-900">{item.partName}</td>
                          <td className="px-4 py-3 text-center text-slate-900">{item.quantityOrdered}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-medium ${
                              item.quantityReceived === item.quantityOrdered 
                                ? 'text-green-600' 
                                : 'text-amber-600'
                            }`}>
                              {item.quantityReceived}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {getConditionBadge(item.condition)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-3 text-right text-slate-900 font-medium">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50">
                      <tr>
                        <td colSpan={7} className="px-4 py-3 text-right text-slate-700 border-t-2 border-slate-300">
                          <strong>TOTAL NILAI BARANG:</strong>
                        </td>
                        <td className="px-4 py-3 text-right border-t-2 border-slate-300">
                          <strong className="text-slate-900">{formatCurrency(totalAmount)}</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Notes Section */}
              <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="text-slate-900 mb-2">Catatan Penerimaan:</h4>
                <ul className="text-slate-700 text-sm space-y-1">
                  <li>✓ Semua barang telah diperiksa kondisi fisiknya</li>
                  <li>✓ Jumlah barang sesuai dengan Purchase Order</li>
                  <li>✓ Stock telah diupdate ke sistem inventory</li>
                  <li>✓ Dokumen ini sebagai bukti penerimaan barang yang sah</li>
                </ul>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-6 mt-8 pt-6 border-t border-slate-300">
                <div className="text-center">
                  <p className="text-slate-600 text-sm mb-12">Yang Menyerahkan</p>
                  <div className="border-t border-slate-300 pt-2">
                    <p className="text-slate-900 font-medium">{vendor}</p>
                    <p className="text-slate-600 text-xs">Supplier</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-slate-600 text-sm mb-12">Yang Menerima</p>
                  <div className="border-t border-slate-300 pt-2">
                    <p className="text-slate-900 font-medium">{receivedBy}</p>
                    <p className="text-slate-600 text-xs">{branch}</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-slate-600 text-sm mb-12">Mengetahui</p>
                  <div className="border-t border-slate-300 pt-2">
                    <p className="text-slate-900 font-medium">Branch Manager</p>
                    <p className="text-slate-600 text-xs">{branch}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions - Hidden when printing */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between print:hidden">
            <div className="text-sm">
              {!isPrinted ? (
                <p className="text-amber-600 flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                  📄 Silakan cetak dokumen terlebih dahulu sebelum konfirmasi
                </p>
              ) : (
                <p className="text-green-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  ✓ Dokumen sudah dicetak, siap dikonfirmasi
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Batal
              </Button>
              <Button
                variant="outline"
                onClick={handlePrint}
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                <Printer className="w-4 h-4 mr-2" />
                Cetak Dokumen
              </Button>
              <Button
                onClick={onConfirm}
                className={`${
                  isPrinted 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
                disabled={!isPrinted}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Konfirmasi Penerimaan
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 15mm;
          }
          
          body * {
            visibility: hidden;
          }
          #receive-document-content,
          #receive-document-content * {
            visibility: visible;
          }
          #receive-document-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100%;
            padding: 0;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}