import React, { useState } from 'react';
import { X, User, Car, Phone, Receipt, Wallet, CreditCard, Smartphone, Banknote } from 'lucide-react';
import { Button } from './ui/button';

export function ProcessPaymentModal({
  isOpen,
  selectedOrder,
  onClose,
  onConfirmPayment,
  formatCurrency,
  calculatePartsCost,
  getOrderLaborCost,
  laborCost,
  setLaborCost
}) {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');

  if (!isOpen || !selectedOrder) return null;

  const partsCost = calculatePartsCost(selectedOrder.spareParts);
  const labor = parseFloat(laborCost) || getOrderLaborCost(selectedOrder);
  const grandTotal = partsCost + labor;
  const cashReceivedAmount = parseFloat(cashReceived.replace(/\./g, '')) || 0;
  const change = cashReceivedAmount - grandTotal;

  // Format number to Rupiah with thousands separator
  const formatInputCurrency = (value) => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    return parseInt(numericValue).toLocaleString('id-ID');
  };

  const handleQuickAmount = (type) => {
    let addAmount = 0;
    if (type === 'exact') {
      addAmount = grandTotal;
    } else if (type === 'plus50') {
      addAmount = 50000;
    } else if (type === 'plus100') {
      addAmount = 100000;
    }
    
    const currentAmount = parseFloat(cashReceived.replace(/\./g, '')) || 0;
    const newAmount = currentAmount + addAmount;
    setCashReceived(formatInputCurrency(newAmount.toString()));
  };

  const handleCashInputChange = (value) => {
    const formatted = formatInputCurrency(value);
    setCashReceived(formatted);
  };

  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: Banknote },
    { id: 'transfer', label: 'Transfer', icon: Wallet },
    { id: 'credit-card', label: 'Credit Card', icon: CreditCard },
    { id: 'debit-card', label: 'Debit Card', icon: CreditCard },
    { id: 'qris', label: 'QRIS', icon: Smartphone },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl shadow-2xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white text-xl font-semibold">PROSES PEMBAYARAN</h3>
              <p className="text-blue-100 text-sm">{selectedOrder.orderId}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - 2 Columns */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full">
            {/* Left Column - Order Summary */}
            <div className="p-6 bg-slate-50 border-r border-slate-200">
              <div className="space-y-5">
                {/* Title */}
                <div className="flex items-center gap-2 pb-3 border-b border-slate-300">
                  <Receipt className="w-5 h-5 text-slate-600" />
                  <h4 className="text-slate-800 font-semibold">Ringkasan Order</h4>
                </div>

                {/* Customer Info */}
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 rounded-lg p-2">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-500 text-xs mb-1">Customer</p>
                      <p className="text-slate-800 font-semibold">{selectedOrder.customerName}</p>
                    </div>
                  </div>
                </div>

                {/* Vehicle Info */}
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="flex items-start gap-3">
                    <div className="bg-slate-100 rounded-lg p-2">
                      <Car className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-500 text-xs mb-1">Vehicle</p>
                      <p className="text-slate-800 font-semibold">{selectedOrder.vehicleBrand} {selectedOrder.vehicleModel}</p>
                      <div className="inline-block bg-amber-100 border border-amber-300 px-2 py-0.5 rounded mt-1">
                        <p className="text-slate-900 text-xs font-mono font-semibold">{selectedOrder.plateNumber}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spare Parts */}
                {selectedOrder.spareParts && selectedOrder.spareParts.length > 0 && (
                  <div className="bg-white rounded-lg border border-slate-200">
                    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                      <p className="text-slate-700 font-semibold text-sm">Spare Parts</p>
                    </div>
                    <div className="p-4 space-y-3 max-h-48 overflow-y-auto">
                      {selectedOrder.spareParts.map((part) => (
                        <div key={part.id} className="flex items-start justify-between text-sm">
                          <div className="flex-1">
                            <p className="text-slate-800 font-medium">{part.name}</p>
                            <p className="text-slate-500 text-xs">
                              Qty: {part.quantity} × {formatCurrency(part.unitPrice)}
                            </p>
                          </div>
                          <p className="text-slate-700 font-semibold">{formatCurrency(part.totalPrice)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cost Summary */}
                <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg p-4 text-white space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-600">
                    <span className="text-slate-300 text-sm">Biaya Sparepart</span>
                    <span className="font-semibold">{formatCurrency(partsCost)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-600">
                    <span className="text-slate-300 text-sm">Biaya Jasa / Labor</span>
                    <span className="font-semibold">{formatCurrency(labor)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-lg font-semibold">TOTAL</span>
                    <span className="text-2xl font-bold">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Payment Form */}
            <div className="p-6 bg-white">
              <div className="space-y-6">
                {/* Total Amount Box */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
                  <p className="text-center text-blue-600 text-sm mb-2">Total yang harus dibayar</p>
                  <p className="text-center text-blue-700 text-4xl font-bold">{formatCurrency(grandTotal)}</p>
                </div>

                {/* Payment Method Selection */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-5 h-5 text-slate-600" />
                    <label className="text-slate-700 font-semibold">Pilih Metode Pembayaran</label>
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      const isSelected = paymentMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                          <span className={`text-xs text-center ${isSelected ? 'font-semibold' : ''}`}>
                            {method.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cash Payment Section */}
                {paymentMethod === 'cash' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-2">Jumlah Uang Diterima</label>
                      <input
                        type="text"
                        value={cashReceived}
                        onChange={(e) => handleCashInputChange(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
                        placeholder="Masukkan jumlah uang yang diterima"
                      />
                    </div>

                    {/* Quick Amount Buttons */}
                    <div>
                      <p className="text-slate-600 text-sm mb-2">Nominal Cepat:</p>
                      <div className="grid grid-cols-3 gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleQuickAmount('exact')}
                          className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                        >
                          Pas
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleQuickAmount('plus50')}
                          className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                        >
                          +50k
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleQuickAmount('plus100')}
                          className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                        >
                          +100k
                        </Button>
                      </div>
                    </div>

                    {/* Change Display - Always shown */}
                    <div className={`p-4 rounded-lg ${cashReceivedAmount > 0 && change >= 0 ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-slate-50 border-2 border-slate-200'}`}>
                      <div className="flex justify-between items-center">
                        <span className={`${cashReceivedAmount > 0 && change >= 0 ? 'text-emerald-700' : 'text-slate-500'} font-semibold`}>
                          Kembalian:
                        </span>
                        <span className={`text-2xl font-bold ${cashReceivedAmount > 0 && change >= 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {cashReceivedAmount > 0 ? formatCurrency(Math.abs(change)) : formatCurrency(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Non-Cash Payment Info */}
                {paymentMethod !== 'cash' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-700 text-sm text-center">
                      {paymentMethod === 'transfer' && '💳 Pembayaran melalui transfer bank'}
                      {paymentMethod === 'credit-card' && '💳 Pembayaran menggunakan kartu kredit'}
                      {paymentMethod === 'debit-card' && '💳 Pembayaran menggunakan kartu debit'}
                      {paymentMethod === 'qris' && '📱 Scan QRIS untuk pembayaran'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-5 bg-slate-50 flex gap-3 justify-end">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="px-6"
          >
            Kembali
          </Button>
          <Button 
            onClick={() => {
              if (paymentMethod === 'cash') {
                // Remove dots (thousands separator) before parsing
                const numericValue = parseFloat(cashReceived.replace(/\./g, ''));
                onConfirmPayment(paymentMethod, numericValue);
              } else {
                onConfirmPayment(paymentMethod);
              }
            }}
            disabled={paymentMethod === 'cash' && change < 0}
            className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Konfirmasi Pembayaran
          </Button>
        </div>
      </div>
    </div>
  );
}