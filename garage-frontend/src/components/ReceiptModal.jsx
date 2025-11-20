import React from 'react';
import { X, Printer, CheckCircle, User, FileText, Receipt, Calendar, CreditCard, Banknote } from 'lucide-react';
import { Button } from './ui/button';

export function ReceiptModal({
  isOpen,
  selectedOrder,
  currentUser,
  onClose,
  formatCurrency,
  calculatePartsCost,
  getOrderLaborCost
}) {
  if (!isOpen || !selectedOrder) return null;

  const partsCost = calculatePartsCost(selectedOrder.spareParts);
  const laborCost = selectedOrder.laborCost || getOrderLaborCost(selectedOrder);
  const grandTotal = partsCost + laborCost;
  const paidAmount = selectedOrder.paidAmount || grandTotal;
  const change = paidAmount - grandTotal;

  const handlePrint = () => {
    window.print();
    
    // Auto close modal after print dialog is closed
    const handleAfterPrint = () => {
      onClose();
      window.removeEventListener('afterprint', handleAfterPrint);
    };
    
    // Listen for afterprint event
    window.addEventListener('afterprint', handleAfterPrint);
  };

  // Format payment method to uppercase
  const formatPaymentMethod = (method) => {
    const methodMap = {
      'cash': 'CASH',
      'transfer': 'TRANSFER',
      'credit-card': 'CREDIT CARD',
      'debit-card': 'DEBIT CARD',
      'qris': 'QRIS'
    };
    return methodMap[method] || method.toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header - Hidden on print */}
        <div className="bg-gradient-to-r from-emerald-600 to-green-700 p-5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white text-xl font-semibold">Bukti Penerimaan Uang</h3>
              <p className="text-emerald-100 text-sm">{selectedOrder.receiptNumber}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Printable */}
        <div className="flex-1 overflow-auto p-8 bg-white">
          <div className="max-w-3xl mx-auto" id="receipt-content">
            {/* Document Header */}
            <div className="border-b-4 border-emerald-600 pb-6 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-slate-900 mb-2">BUKTI PENERIMAAN UANG</h1>
                </div>
                <div className="text-right">
                  <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg inline-flex items-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">LUNAS</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-slate-500">Receipt No.</p>
                    <p className="text-slate-900 font-mono font-bold text-lg">{selectedOrder.receiptNumber}</p>
                    <div className="flex items-center gap-2 justify-end mt-2">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <p className="text-slate-600">{selectedOrder.paymentDate || selectedOrder.date}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-6 mb-6 border-2 border-emerald-200">
              <div className="flex items-center gap-2 mb-4">
                <Banknote className="w-6 h-6 text-emerald-600" />
                <h3 className="text-slate-800 font-semibold text-lg">Detail Pembayaran</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-emerald-200">
                  <span className="text-slate-600">Metode Pembayaran</span>
                  <span className="text-slate-900 font-semibold flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    {formatPaymentMethod(selectedOrder.paymentMethod || 'cash')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-emerald-200">
                  <span className="text-slate-600">Total Tagihan</span>
                  <span className="text-slate-900 font-semibold">{formatCurrency(grandTotal)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-emerald-200">
                  <span className="text-slate-600 font-semibold text-lg">Jumlah Uang Diterima</span>
                  <span className="text-emerald-700 font-bold text-2xl">{formatCurrency(paidAmount)}</span>
                </div>
                {selectedOrder.paymentMethod === 'cash' && change > 0 && (
                  <div className="flex justify-between items-center py-2 bg-white rounded-lg px-3">
                    <span className="text-slate-600">Kembalian</span>
                    <span className="text-slate-900 font-semibold">{formatCurrency(change)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Reference Numbers */}
            <div className="bg-slate-50 rounded-lg p-5 mb-6 border border-slate-200">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-300">
                <FileText className="w-5 h-5 text-slate-600" />
                <h3 className="text-slate-800 font-semibold">Nomor Referensi</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 mb-1">Invoice Number</p>
                  <p className="text-slate-900 font-mono font-semibold">{selectedOrder.invoiceNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Nota Faktur</p>
                  <p className="text-slate-900 font-mono font-semibold">{selectedOrder.notaNumber || selectedOrder.orderId}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Work Order</p>
                  <p className="text-slate-900 font-mono font-semibold">{selectedOrder.orderId}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Nomor Polisi Kendaraan</p>
                  <p className="text-slate-900 font-mono font-semibold">{selectedOrder.plateNumber}</p>
                </div>
              </div>
            </div>

            {/* Cashier Info & Signature */}
            <div className="border-t-2 border-slate-300 pt-6 mt-6">
              <div>
                <p className="text-slate-600 text-sm mb-1">Petugas Penerima Uang:</p>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 inline-block">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 rounded-full p-2">
                      <User className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-slate-900 font-semibold">{currentUser?.name || 'Admin'}</p>
                      <p className="text-slate-500 text-sm">{currentUser?.role || 'Cashier'}</p>
                      <p className="text-slate-500 text-xs">{selectedOrder.branch}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-8 text-center">
                  <div className="border-b-2 border-slate-300 w-48 mx-auto mb-2"></div>
                  <p className="text-slate-500 text-xs">Tanda Tangan & Stempel</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions - Hidden on print */}
        <div className="border-t border-slate-200 p-5 bg-slate-50 flex gap-3 justify-center print:hidden">
          <Button 
            onClick={handlePrint}
            className="bg-gradient-to-r from-emerald-600 to-green-700 px-8"
          >
            <Printer className="w-4 h-4 mr-2" />
            Cetak Bukti Penerimaan
          </Button>
        </div>
      </div>
    </div>
  );
}