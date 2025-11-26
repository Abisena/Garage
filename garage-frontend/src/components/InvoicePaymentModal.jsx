import React, { useMemo, useState } from 'react';
import { Calendar, CreditCard, DollarSign, Hash, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { frappeClient } from '../lib/frappeClient';

const paymentOptions = [
  { id: 'Cash', label: 'Cash' },
  { id: 'Transfer', label: 'Bank Transfer' },
  { id: 'Credit Card', label: 'Credit Card' },
  { id: 'Debit Card', label: 'Debit Card' },
  { id: 'QRIS', label: 'QRIS' },
];

export function InvoicePaymentModal({ isOpen, invoice, onClose, onPaymentSuccess }) {
  const [paymentMethod, setPaymentMethod] = useState(paymentOptions[0].id);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [referenceNo, setReferenceNo] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const outstandingAmount = useMemo(() => {
    if (!invoice) return 0;
    const rawOutstanding = invoice.outstanding_amount ?? invoice.outstanding ?? 0;
    return Number(rawOutstanding) || 0;
  }, [invoice]);

  const totalAmount = customAmount
    ? Number(customAmount.replace(/\D/g, '')) || 0
    : outstandingAmount;

  if (!isOpen || !invoice) return null;

  const handleConfirm = async () => {
    if (totalAmount <= 0) {
      toast.error('Masukkan nominal pembayaran yang valid.');
      return;
    }

    setIsSubmitting(true);
    try {
      await frappeClient.request('/api/method/garage.api.portal.create_payment_entry', {
        method: 'POST',
        body: JSON.stringify({
          entry: {  // ✅ TAMBAHKAN INI
            payment_date: paymentDate,
            mode_of_payment: paymentMethod,
            reference_no: referenceNo || undefined,
            party: invoice.customer,
            party_type: 'Customer',
            allocations: [
              {
                invoice: invoice.name,
                allocated_amount: totalAmount,
              },
            ],
          }
        }),
      });

      toast.success('Payment Entry berhasil dibuat dan invoice ditandai sebagai Paid.');
      onPaymentSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to create payment entry', error);
      toast.error('Gagal memproses pembayaran. Mohon coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div>
            <p className="text-sm text-slate-200">Process Payment</p>
            <p className="text-xl font-semibold">{invoice.name}</p>
          </div>
          <button
            className="p-2 rounded-lg hover:bg-white/10"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          <div className="p-6 space-y-4 bg-slate-50">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <User className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Customer</p>
                <p className="text-slate-800 font-semibold">{invoice.customer}</p>
                {invoice.branch && (
                  <p className="text-xs text-slate-500 mt-1">Branch: {invoice.branch}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Hash className="w-5 h-5 text-amber-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500">Invoice Details</p>
                <p className="text-slate-800 font-semibold">{invoice.status}</p>
                <p className="text-slate-600 text-sm mt-1">Due: {invoice.due_date || '-'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Outstanding</p>
                <p className="text-lg font-bold text-slate-900">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(
                    outstandingAmount,
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <DollarSign className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500">Total Payment</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(
                    totalAmount,
                  )}
                </p>
                <p className="text-xs text-slate-500 mt-1">Default: outstanding invoice amount</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <p className="text-slate-700 font-semibold mb-2">Metode Pembayaran</p>
              <div className="grid grid-cols-2 gap-3">
                {paymentOptions.map((option) => {
                  const isActive = paymentMethod === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setPaymentMethod(option.id)}
                      className={`p-3 rounded-lg border-2 text-sm text-left transition-all ${
                        isActive
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 hover:border-blue-200'
                      }`}
                      disabled={isSubmitting}
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        <span className="font-semibold">{option.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                  <Calendar className="w-4 h-4" />
                  Tanggal Pembayaran
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                  <Hash className="w-4 h-4" />
                  No. Referensi (opsional)
                </label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Masukkan no. referensi pembayaran"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                <DollarSign className="w-4 h-4" />
                Nominal Pembayaran
              </label>
              <input
                type="text"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.'))}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                placeholder={`Default: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(outstandingAmount)}`}
                disabled={isSubmitting}
              />
              <p className="text-xs text-slate-500 mt-1">Kosongkan untuk membayar penuh outstanding.</p>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                Batal
              </Button>
              <Button onClick={handleConfirm} className="bg-green-600 hover:bg-green-700 text-white" disabled={isSubmitting}>
                {isSubmitting ? 'Memproses...' : 'Konfirmasi Pembayaran'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoicePaymentModal;
