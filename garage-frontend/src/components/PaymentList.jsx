import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  Building2,
  Calendar,
  CheckCircle,
  CreditCard,
  Eye,
  Hash,
  RefreshCw,
  Search,
  Smartphone,
  TrendingUp,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { frappeClient } from '../lib/frappeClient';
import { getStoredWorkOrders, persistWorkOrders } from '../lib/workOrdersStorage';
import { InvoicePaymentModal } from './InvoicePaymentModal';
import { ReceiptModal } from './ReceiptModal';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);

const paymentMethodIcon = (method) => {
  const value = (method || '').toString().toLowerCase();
  if (value.includes('cash')) return <Banknote className="w-4 h-4" />;
  if (value.includes('transfer') || value.includes('bank')) return <Banknote className="w-4 h-4" />;
  if (value.includes('qris')) return <Smartphone className="w-4 h-4" />;
  return <CreditCard className="w-4 h-4" />;
};

const getDocstatus = (entry) => {
  const explicit = entry?.docstatus;
  if (explicit === 0 || explicit === 1 || explicit === 2) return explicit;

  const statusValue = entry?.status;
  if (statusValue === 0 || statusValue === 1 || statusValue === 2) return statusValue;
  if (statusValue === 'Draft') return 0;
  if (statusValue === 'Cancelled') return 2;
  return 1;
};

const getPaymentStatusLabel = (entry) => {
  const docstatus = getDocstatus(entry);
  if (docstatus === 0) return 'Draft';
  if (docstatus === 2) return 'Cancelled';
  return entry?.status || 'Submitted';
};

const calculatePartsCost = (parts) => {
  if (!parts) return 0;
  return parts.reduce((sum, part) => sum + (part.totalPrice || 0), 0);
};

const getOrderLaborCost = (order) => order?.laborCost || 0;

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
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);

  const createHandoverRecord = async (invoice, paymentInfo) => {
    if (!invoice || !paymentInfo?.paymentEntry) return;

    if (getDocstatus(paymentInfo) === 0) {
      toast.message('Payment Entry masih draft, SIKK akan dibuat setelah submit.');
      return;
    }

    const existingOrders = getStoredWorkOrders();
    const serviceOrderId =
      invoice.garage_service_order || invoice.po_no || invoice.name || `INV-${Date.now()}`;
    const branchCode = (invoice.branch || 'GAR').substring(0, 3).toUpperCase();

    const updatedOrder = {
      id: serviceOrderId,
      orderId: serviceOrderId,
      branch: invoice.branch || 'GAR',
      customerName: invoice.customer_name || invoice.customer || 'Customer',
      phone: invoice.customer_phone || invoice.phone || '-',
      email: invoice.customer_email || invoice.email || '',
      address: invoice.customer_address || invoice.address_display || '',
      vehicleBrand: invoice.vehicle_brand || invoice.brand || 'N/A',
      vehicleModel: invoice.vehicle_model || invoice.model || 'N/A',
      plateNumber: invoice.license_plate || invoice.plate_number || invoice.vehicle_plate || 'N/A',
      paymentStatus: 'paid',
      paymentMethod: paymentInfo.paymentMethod,
      receiptNumber: paymentInfo.paymentEntry,
      paymentDate: paymentInfo.paymentDate,
      paidAmount: paymentInfo.amount || invoice.grand_total || invoice.outstanding_amount || 0,
      invoiceNumber: invoice.name,
      notaNumber: invoice.name,
      invoiceStatus: 'submitted',
      paymentEntryStatus: getPaymentStatusLabel(paymentInfo).toLowerCase(),
      status: 'paid',
      sikkNumber: invoice.sikk_number || `SIKK-${branchCode}-${String(serviceOrderId).split('-').pop() || '001'}`,
      erpPaymentEntry: paymentInfo.paymentEntry,
      erpInvoiceName: invoice.name,
    };

    const mergedOrders = existingOrders.some((order) => order.orderId === serviceOrderId)
      ? existingOrders.map((order) =>
          order.orderId === serviceOrderId ? { ...order, ...updatedOrder } : order
        )
      : [...existingOrders, updatedOrder];

    await persistWorkOrders(mergedOrders, { skipSync: true });
    toast.success('Dokumen SIKK siap di menu Handover.');
  };

  const loadPortalPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const branchParam = currentUser?.branch === 'all' ? undefined : currentUser?.branch;
      const portalData = await frappeClient.getPortalBootstrap({
        branch: branchParam,
        mode: 'finance',
      });

      const paymentEntries = (portalData.payment_entries || [])
        .map((entry) => ({
          ...entry,
          amount: Number(entry.amount || entry.received_amount || entry.paid_amount || 0),
        }))
        .filter((entry) => getDocstatus(entry) !== 2);

      paymentEntries.sort(
        (a, b) =>
          new Date(b.payment_date || b.posting_date || b.modified || 0) -
          new Date(a.payment_date || a.posting_date || a.modified || 0)
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
  }, [currentUser?.branch]);

  useEffect(() => {
    void loadPortalPayments();
  }, [loadPortalPayments]);

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
        (payment.party || payment.customer || '').toLowerCase().includes(query) ||
        (payment.branch || '').toLowerCase().includes(query) ||
        (payment.invoice || '').toLowerCase().includes(query) ||
        (payment.receipt_number || '').toLowerCase().includes(query) ||
        (payment.garage_service_order || '').toLowerCase().includes(query);

      const paymentType = (payment.payment_type || '').toLowerCase();
      const matchesType =
        filterType === 'all' ||
        (filterType === 'receive' && paymentType.includes('receive')) ||
        (filterType === 'pay' && paymentType.includes('pay') && !paymentType.includes('receive'));

      return matchesSearch && matchesType;
    });
  }, [payments, searchTerm, filterType]);

  const completedPaymentsCount = useMemo(
    () => filteredPayments.filter((payment) => getDocstatus(payment) === 1).length,
    [filteredPayments]
  );

  const revenue = useMemo(() => {
    if (typeof totals?.incoming_payments_total === 'number') {
      return totals.incoming_payments_total;
    }
    return filteredPayments
      .filter((p) => getDocstatus(p) === 1)
      .filter((p) => (p.payment_type || '').toLowerCase().includes('receive'))
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

  const resolveReceiptOrder = (payment) => {
    const serviceOrderId = payment.garage_service_order;
    if (!serviceOrderId) return null;

    const stored = getStoredWorkOrders().find(
      (order) =>
        order.orderId === serviceOrderId ||
        order.id === serviceOrderId ||
        order.erpPaymentEntry === payment.name
    );

    if (stored) {
      return {
        ...stored,
        receiptNumber: payment.receipt_number || payment.name,
        paidAmount: payment.amount || stored.paidAmount,
        paymentMethod: stored.paymentMethod || payment.mode_of_payment,
        paymentDate: payment.payment_date || stored.paymentDate,
        invoiceNumber: payment.invoice || stored.invoiceNumber,
      };
    }

    return {
      orderId: serviceOrderId,
      id: serviceOrderId,
      customerName: payment.party || payment.customer,
      branch: payment.branch,
      receiptNumber: payment.receipt_number || payment.name,
      paidAmount: payment.amount,
      paymentMethod: payment.mode_of_payment,
      paymentDate: payment.payment_date,
      invoiceNumber: payment.invoice,
      plateNumber: '-',
      vehicleBrand: '-',
      vehicleModel: '-',
      spareParts: [],
      laborCost: payment.amount,
    };
  };

  const handleViewReceipt = (payment) => {
    const order = resolveReceiptOrder(payment);
    if (!order) {
      setSelectedPayment(payment);
      return;
    }
    setReceiptOrder(order);
    setShowReceiptModal(true);
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-800 mb-1">Payment List</h1>
            <p className="text-slate-600">
              Data pembayaran langsung dari ERPNext — Payment Entry &amp; Sales Invoice
            </p>
          </div>
          <Button
            onClick={() => void loadPortalPayments()}
            disabled={isLoading}
            className="inline-flex items-center gap-2"
          >
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
                <p className="text-slate-900 font-bold">{completedPaymentsCount}</p>
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
                  placeholder="Cari invoice, payment entry, customer..."
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
          <div className="p-4 border-b border-slate-200">
            <p className="text-slate-800 font-semibold">Sales Invoice Menunggu Pembayaran</p>
            <p className="text-slate-500 text-sm">Proses invoice unpaid langsung ke Payment Entry ERPNext</p>
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
                    <td className="px-4 py-3 text-slate-800">
                      {formatCurrency(invoice.total_amount || invoice.grand_total)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-amber-700">
                      {formatCurrency(invoice.outstanding_amount || invoice.outstanding || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{invoice.invoice_date || '-'}</span>
                      </div>
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
          <div className="p-4 border-b border-slate-200">
            <p className="text-slate-800 font-semibold">Payment Entry (ERPNext)</p>
            <p className="text-slate-500 text-sm">Daftar pembayaran yang tercatat di Frappe</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-600">
                  <th className="px-4 py-3">Payment Entry</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Metode</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-500 text-sm">
                      {isLoading ? 'Memuat payment entry...' : 'Belum ada payment entry'}
                    </td>
                  </tr>
                )}
                {filteredPayments.map((payment) => (
                  <tr key={payment.name} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 font-mono text-sm">{payment.name}</div>
                      <p className="text-xs text-slate-500">{payment.payment_type}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-blue-700">
                      {payment.invoice || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-800">{payment.party || payment.customer}</span>
                      </div>
                      {payment.branch && <p className="text-xs text-slate-500">{payment.branch}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-2 px-2 py-1 bg-slate-100 rounded-full text-sm text-slate-700">
                        {paymentMethodIcon(payment.mode_of_payment)}
                        <span>{payment.mode_of_payment || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{payment.payment_date || payment.posting_date || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${(() => {
                          const docstatus = getDocstatus(payment);
                          if (docstatus === 1) return 'bg-emerald-100 text-emerald-700';
                          if (docstatus === 2) return 'bg-rose-100 text-rose-700';
                          return 'bg-slate-100 text-slate-700';
                        })()}`}
                      >
                        {getPaymentStatusLabel(payment)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedPayment(payment)}>
                          <Eye className="w-4 h-4 mr-1" />
                          Detail
                        </Button>
                        {getDocstatus(payment) === 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewReceipt(payment)}
                            className="text-blue-600 hover:bg-blue-50"
                          >
                            Receipt
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedPayment && (
            <div className="border-t border-slate-200 p-4 bg-slate-50">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <p className="text-slate-800 font-semibold">Payment Detail</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-700">
                    <div>
                      <p className="text-slate-500 text-xs">Payment Entry</p>
                      <p className="font-semibold font-mono">{selectedPayment.name}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Invoice</p>
                      <p className="font-semibold font-mono">{selectedPayment.invoice || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Status</p>
                      <p className="font-semibold">{getPaymentStatusLabel(selectedPayment)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Customer</p>
                      <p className="font-semibold">{selectedPayment.party || selectedPayment.customer}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Payment Date</p>
                      <p className="font-semibold">
                        {selectedPayment.payment_date || selectedPayment.posting_date || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Mode of Payment</p>
                      <p className="font-semibold">{selectedPayment.mode_of_payment || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Amount</p>
                      <p className="font-semibold">{formatCurrency(selectedPayment.amount)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Receipt No.</p>
                      <p className="font-semibold font-mono">{selectedPayment.receipt_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Service Order</p>
                      <p className="font-semibold font-mono">{selectedPayment.garage_service_order || '-'}</p>
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

      {showReceiptModal && receiptOrder && (
        <ReceiptModal
          isOpen={showReceiptModal}
          selectedOrder={receiptOrder}
          currentUser={currentUser}
          onClose={() => {
            setShowReceiptModal(false);
            setReceiptOrder(null);
          }}
          formatCurrency={formatCurrency}
          calculatePartsCost={calculatePartsCost}
          getOrderLaborCost={getOrderLaborCost}
        />
      )}
    </div>
  );
}

export default PaymentList;
