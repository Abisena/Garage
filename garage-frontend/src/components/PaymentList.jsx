import React, { useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  Building2,
  Calendar,
  CheckCircle,
  CreditCard,
  DollarSign,
  Eye,
  Hash,
  RefreshCw,
  Search,
  Smartphone,
  TrendingUp,
  User,
} from 'lucide-react';
import { Button } from './ui/button';
import { frappeClient } from '../lib/frappeClient';
import { toast } from 'sonner';
import { InvoicePaymentModal } from './InvoicePaymentModal';
import { getStoredWorkOrders, persistWorkOrders } from '../lib/workOrdersStorage';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);

const paymentMethodIcon = (method) => {
  const mapping = {
    Cash: <Banknote className="w-4 h-4" />,
    Transfer: <Banknote className="w-4 h-4" />,
    'Credit Card': <CreditCard className="w-4 h-4" />,
    'Debit Card': <CreditCard className="w-4 h-4" />,
    QRIS: <Smartphone className="w-4 h-4" />,
  };
  return mapping[method] || <CreditCard className="w-4 h-4" />;
};

export function PaymentList({ currentUser }) {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [totals, setTotals] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const createHandoverRecord = async (invoice, paymentInfo) => {
    if (!invoice || !paymentInfo?.paymentEntry) return;

    const existingOrders = getStoredWorkOrders();
    const orderId = invoice.name || `INV-${Date.now()}`;
    const branchCode = (invoice.branch || 'GAR').substring(0, 3).toUpperCase();

    const vehicleBrand = invoice.vehicle_brand || invoice.brand || 'N/A';
    const vehicleModel = invoice.vehicle_model || invoice.model || 'N/A';
    const plateNumber = invoice.license_plate || invoice.plate_number || invoice.vehicle_plate || 'N/A';

    const updatedOrder = {
      id: orderId,
      orderId,
      branch: invoice.branch || 'GAR',
      customerName: invoice.customer_name || invoice.customer || 'Customer',
      phone: invoice.customer_phone || invoice.phone || '-',
      email: invoice.customer_email || invoice.email || '',
      address: invoice.customer_address || invoice.address_display || '',
      vehicleBrand,
      vehicleModel,
      plateNumber,
      paymentStatus: 'paid',
      paymentMethod: paymentInfo.paymentMethod,
      receiptNumber: paymentInfo.paymentEntry,
      paymentDate: paymentInfo.paymentDate,
      paidAmount: paymentInfo.amount || invoice.grand_total || invoice.outstanding_amount || 0,
      invoiceNumber: invoice.name,
      notaNumber: invoice.name,
      invoiceStatus: 'submitted',
      paymentEntryStatus: 'submitted',
      status: 'paid',
      sikkNumber: invoice.sikk_number || `SIKK-${branchCode}-${orderId.split('-')[1] || '001'}`,
    };

    const mergedOrders = existingOrders.some((order) => order.orderId === orderId)
      ? existingOrders.map((order) => (order.orderId === orderId ? { ...order, ...updatedOrder } : order))
      : [...existingOrders, updatedOrder];

    await persistWorkOrders(mergedOrders);
    toast.success('Dokumen SIKK siap di menu Handover.');
  };

  useEffect(() => {
    loadPortalPayments();
  }, [currentUser.branch]);

  const loadPortalPayments = async () => {
    setIsLoading(true);
    try {
      const branchParam = currentUser?.branch === 'all' ? undefined : currentUser?.branch;
      const portalData = await frappeClient.getPortalBootstrap({ branch: branchParam, mode: 'finance' });

      const paymentEntries = (portalData.payment_entries || []).map((entry) => ({
        ...entry,
        amount: Number(entry.amount || entry.received_amount || entry.paid_amount || 0),
      }));
      paymentEntries.sort(
        (a, b) => new Date(b.payment_date || b.posting_date || b.modified || 0) - new Date(a.payment_date || a.posting_date || a.modified || 0),
      );

      setPayments(paymentEntries);
      setInvoices(portalData.sales_invoices || []);
      setTotals(portalData.totals || {});
    } catch (error) {
      console.error('Failed to load payment data from Frappe', error);
      toast.error('Gagal memuat data payment dari Frappe.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return invoices.filter((invoice) => {
      const matchesSearch =
        invoice.name.toLowerCase().includes(query) ||
        (invoice.customer || '').toLowerCase().includes(query) ||
        (invoice.branch || '').toLowerCase().includes(query);

      const isOpen = invoice.status !== 'Paid' && (invoice.outstanding_amount || invoice.outstanding || 0) > 0;
      return matchesSearch && isOpen;
    });
  }, [invoices, searchTerm]);

  const filteredPayments = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return payments.filter((payment) => {
      const matchesSearch =
        payment.name.toLowerCase().includes(query) ||
        (payment.party || '').toLowerCase().includes(query) ||
        (payment.branch || '').toLowerCase().includes(query);

      const matchesType = filterType === 'all' || payment.payment_type?.toLowerCase() === filterType;
      return matchesSearch && matchesType;
    });
  }, [payments, searchTerm, filterType]);

  const revenue = useMemo(() => {
    if (typeof totals?.incoming_payments_total === 'number') {
      return totals.incoming_payments_total;
    }
    return filteredPayments
      .filter((p) => (p.payment_type || '').toLowerCase() === 'receive')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [totals, filteredPayments]);

  const handleProcessPayment = (invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const handlePaymentSuccess = async (paymentInfo) => {
    await loadPortalPayments();
    if (paymentInfo?.invoice) {
      await createHandoverRecord(paymentInfo.invoice, paymentInfo);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-800 mb-1">Payment List (Frappe)</h1>
            <p className="text-slate-600">Sinkronisasi pembayaran Sales Invoice dengan Payment Entry ERPNext</p>
          </div>
          <Button onClick={loadPortalPayments} disabled={isLoading} className="inline-flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 mb-1">Total Revenue (Paid)</p>
                <p className="font-bold text-2xl">{formatCurrency(revenue)}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <TrendingUp className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 mb-1">Completed Payments</p>
                <p className="text-slate-900 font-bold">{filteredPayments.length}</p>
              </div>
              <div className="bg-emerald-100 p-3 rounded-lg">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 mb-1">Open Invoices</p>
                <p className="text-slate-900 font-bold">{filteredInvoices.length}</p>
              </div>
              <div className="bg-amber-100 p-3 rounded-lg">
                <Building2 className="w-8 h-8 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 w-full md:w-1/2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari invoice atau payment..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">Semua Payment</option>
                <option value="receive">Incoming</option>
                <option value="pay">Outgoing</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-slate-800 font-semibold">Sales Invoice Menunggu Pembayaran</p>
              <p className="text-slate-500 text-sm">Proses invoice unpaid langsung ke Payment Entry ERPNext</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-600">
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Outstanding</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500 text-sm">
                      {isLoading ? 'Memuat invoice...' : 'Tidak ada invoice unpaid'}
                    </td>
                  </tr>
                )}
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.name} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 flex items-center gap-2">
                        <Hash className="w-4 h-4 text-slate-400" />
                        {invoice.name}
                      </div>
                      <p className="text-xs text-slate-500">Status: {invoice.status}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800 font-medium">{invoice.customer}</p>
                      {invoice.branch && <p className="text-xs text-slate-500">{invoice.branch}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-800">{formatCurrency(invoice.total_amount || invoice.grand_total)}</td>
                    <td className="px-4 py-3 font-semibold text-amber-700">
                      {formatCurrency(invoice.outstanding_amount || invoice.outstanding || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{invoice.invoice_date || '-'}</span>
                      </div>
                      {invoice.due_date && <p className="text-xs text-slate-500">Jatuh tempo: {invoice.due_date}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        onClick={() => handleProcessPayment(invoice)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={isLoading}
                      >
                        Proses Pembayaran
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-slate-800 font-semibold">Payment Entry (Frappe)</p>
              <p className="text-slate-500 text-sm">Daftar pembayaran yang sudah tercatat di ERPNext</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-600">
                  <th className="px-4 py-3">Payment Entry</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Metode</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-500 text-sm">
                      {isLoading ? 'Memuat payment entry...' : 'Belum ada payment entry'}
                    </td>
                  </tr>
                )}
                {filteredPayments.map((payment) => (
                  <tr key={payment.name} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{payment.name}</div>
                      <p className="text-xs text-slate-500">Type: {payment.payment_type}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800 font-medium">{payment.party}</p>
                      {payment.branch && <p className="text-xs text-slate-500">{payment.branch}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-2 px-2 py-1 bg-slate-100 rounded-full text-sm text-slate-700">
                        {paymentMethodIcon(payment.mode_of_payment)}
                        <span>{payment.mode_of_payment}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(payment.amount)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{payment.payment_date || payment.posting_date || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          payment.status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {payment.status || 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelectedPayment(payment)}>
                        <Eye className="w-4 h-4 mr-2" /> Detail
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedPayment && (
            <div className="border-t border-slate-200 p-4 bg-slate-50">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-slate-800 font-semibold">Payment Detail</p>
                  <div className="grid grid-cols-2 gap-4 text-sm text-slate-700">
                    <div>
                      <p className="text-slate-500 text-xs">Payment Entry</p>
                      <p className="font-semibold">{selectedPayment.name}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Status</p>
                      <p className="font-semibold">{selectedPayment.status || 'Draft'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Customer</p>
                      <p className="font-semibold">{selectedPayment.party}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Payment Date</p>
                      <p className="font-semibold">{selectedPayment.payment_date || selectedPayment.posting_date || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Payment Type</p>
                      <p className="font-semibold">{selectedPayment.payment_type}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Mode of Payment</p>
                      <p className="font-semibold">{selectedPayment.mode_of_payment}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Amount</p>
                      <p className="font-semibold">{formatCurrency(selectedPayment.amount)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Branch</p>
                      <p className="font-semibold">{selectedPayment.branch || '-'}</p>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setSelectedPayment(null)}>
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <InvoicePaymentModal
        isOpen={showInvoiceModal}
        invoice={selectedInvoice}
        onClose={() => setShowInvoiceModal(false)}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}

export default PaymentList;
