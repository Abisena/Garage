import React, { useState, useEffect } from 'react';
import { Search, Receipt, FileText, Calendar, DollarSign, TrendingUp, Building2, User, CreditCard, Banknote, Smartphone, CheckCircle, Eye, Car, ShoppingCart } from 'lucide-react';
import { Button } from './ui/button';
import { ReceiptModal } from './ReceiptModal';

export function PaymentList({ currentUser }) {
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    loadPayments();
    
    const handleWorkOrdersUpdate = () => {
      loadPayments();
    };

    window.addEventListener('workOrdersUpdated', handleWorkOrdersUpdate);
    return () => {
      window.removeEventListener('workOrdersUpdated', handleWorkOrdersUpdate);
    };
  }, [currentUser.branch]);

  const loadPayments = () => {
    // Load Work Orders - include paid and invoice-printed with invoice number
    const workOrders = JSON.parse(localStorage.getItem('workOrders') || '[]');
    const woPayments = workOrders
      .filter((wo) => ['paid', 'invoice-printed'].includes(wo.paymentStatus) && wo.invoiceNumber)
      .map((wo) => ({
        id: wo.id,
        type: 'work-order',
        transactionId: wo.orderId,
        date: wo.date,
        branch: wo.branch,
        customerName: wo.customerName,
        amount: wo.paidAmount || 0,
        paymentMethod: wo.paymentMethod || 'cash',
        paymentStatus: wo.paymentStatus,
        invoiceNumber: wo.invoiceNumber,
        receiptNumber: wo.receiptNumber,
        notaFakturNumber: wo.notaFakturNumber,
        paymentDate: wo.paymentDate,
        plateNumber: wo.plateNumber,
        serviceType: wo.serviceType,
        
        // For Receipt Modal
        orderId: wo.orderId,
        phone: wo.phone,
        vehicleBrand: wo.vehicleBrand,
        vehicleModel: wo.vehicleModel,
        vehicleYear: wo.vehicleYear,
        spareParts: wo.spareParts,
        laborCost: wo.laborCost,
        paidAmount: wo.paidAmount,
      }));

    // Load Purchase Orders - include paid and invoice-printed with invoice number
    const purchaseOrders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
    const poPayments = purchaseOrders
      .filter((po) => ['paid', 'invoice-printed'].includes(po.paymentStatus) && po.invoiceNumber)
      .map((po) => ({
        id: po.id,
        type: 'purchase-order',
        transactionId: po.poNumber,
        date: po.orderDate,
        branch: po.branch,
        vendor: po.vendor,
        amount: po.paidAmount || po.totalAmount || 0,
        paymentMethod: po.paymentMethod || 'cash',
        paymentStatus: po.paymentStatus,
        invoiceNumber: po.invoiceNumber,
        receiptNumber: po.receiptNumber,
        notaFakturNumber: po.notaFakturNumber,
        paymentDate: po.paymentDate,
        
        // For Receipt Modal
        orderId: po.poNumber,
        phone: '-',
        vehicleBrand: 'Spare Parts',
        vehicleModel: 'Purchase',
        vehicleYear: '-',
        plateNumber: '-',
        serviceType: 'Spare Parts Purchase',
        laborCost: 0,
        paidAmount: po.paidAmount || po.totalAmount,
      }));

    let allPayments = [...woPayments, ...poPayments];

    // Filter by branch
    if (currentUser.role === 'branch' && currentUser.branch !== 'all') {
      allPayments = allPayments.filter(p => p.branch === currentUser.branch);
    }

    // Sort by payment date (newest first)
    allPayments.sort((a, b) => {
      const dateA = new Date(a.paymentDate || a.date).getTime();
      const dateB = new Date(b.paymentDate || b.date).getTime();
      return dateB - dateA;
    });

    setPayments(allPayments);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
            <CheckCircle className="w-4 h-4" />
            Paid
          </span>
        );
      default:
        return <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const formatPaymentMethod = (method) => {
    const methodMap = {
      'cash': 'Cash',
      'transfer': 'Transfer',
      'credit-card': 'Credit Card',
      'debit-card': 'Debit Card',
      'qris': 'QRIS'
    };
    return methodMap[method] || method;
  };

  const getPaymentMethodIcon = (method) => {
    const methodMap = {
      'cash': <CreditCard className="w-4 h-4" />,
      'transfer': <Banknote className="w-4 h-4" />,
      'credit-card': <CreditCard className="w-4 h-4" />,
      'debit-card': <CreditCard className="w-4 h-4" />,
      'qris': <Smartphone className="w-4 h-4" />
    };
    return methodMap[method] || <CreditCard className="w-4 h-4" />;
  };

  const handleViewReceipt = (payment) => {
    setSelectedPayment(payment);
    setShowReceiptModal(true);
  };

  const calculatePartsCost = (parts) => {
    if (!parts) return 0;
    return parts.reduce((sum, part) => sum + (part.totalPrice || 0), 0);
  };

  const getOrderLaborCost = (order) => {
    return order.laborCost || 0;
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.plateNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || payment.type === filterType;

    return matchesSearch && matchesType;
  });

  // Calculate statistics
  const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const serviceInvoices = filteredPayments.filter(p => p.type === 'work-order').length;
  const sparePartsInvoices = filteredPayments.filter(p => p.type === 'purchase-order').length;
  const serviceRevenue = filteredPayments.filter(p => p.type === 'work-order').reduce((sum, p) => sum + p.amount, 0);
  const sparePartsRevenue = filteredPayments.filter(p => p.type === 'purchase-order').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-800 mb-1">Payment List</h1>
            <p className="text-slate-600">View all payment transactions and records</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 mb-1">Total Revenue</p>
                <p className="font-bold">{formatCurrency(totalRevenue)}</p>
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
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by ID, customer, vendor, invoice..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Filter by Type */}
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="work-order">Work Order</option>
                <option value="purchase-order">Purchase Order</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payment List Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-slate-600">Invoice Number</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-600">Invoice Date</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-600">Type</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-600">Customer/Vendor</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-600">Details</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-600">Branch</th>
                  <th className="px-4 py-3 text-right text-xs text-slate-600">Total Amount</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-600">Payment Method</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-600">Payment Date</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-600">Receipt Number</th>
                  <th className="px-4 py-3 text-center text-xs text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-16 text-center text-slate-500">
                      <div className="bg-slate-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <Receipt className="w-10 h-10 text-slate-400" />
                      </div>
                      <p className="text-slate-600 text-lg mb-2">No paid invoices found</p>
                      <p className="text-sm">Paid invoices will appear here</p>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      className={`hover:${payment.type === 'work-order' ? 'bg-blue-50' : 'bg-purple-50'} transition-colors`}
                    >
                      {/* Invoice Number - KOLOM 1 */}
                      <td className="px-4 py-3 font-mono text-sm font-semibold">
                        <span className={payment.type === 'work-order' ? 'text-blue-600' : 'text-purple-600'}>
                          {payment.invoiceNumber}
                        </span>
                      </td>
                      
                      {/* Invoice Date - KOLOM 2 */}
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {new Date(payment.date).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </td>
                      
                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          payment.type === 'work-order'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {payment.type === 'work-order' ? (
                            <>
                              <Car className="w-3 h-3" />
                              Service
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-3 h-3" />
                              Parts
                            </>
                          )}
                        </span>
                      </td>
                      
                      {/* Customer/Vendor */}
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <div className="flex items-center gap-2">
                          {payment.customerName ? (
                            <>
                              <User className="w-3 h-3 text-slate-400" />
                              {payment.customerName}
                            </>
                          ) : (
                            <>
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {payment.vendor}
                            </>
                          )}
                        </div>
                      </td>
                      
                      {/* Details (Plate Number or Transaction ID) */}
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {payment.type === 'work-order' ? (
                          <div className="font-mono">{payment.plateNumber}</div>
                        ) : (
                          <div className="text-xs text-slate-500">{payment.transactionId}</div>
                        )}
                      </td>
                      
                      {/* Branch */}
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {payment.branch}
                        </div>
                      </td>
                      
                      {/* Total Amount */}
                      <td className="px-4 py-3 text-sm text-emerald-600 font-semibold text-right">
                        {formatCurrency(payment.amount)}
                      </td>
                      
                      {/* Payment Method */}
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          {getPaymentMethodIcon(payment.paymentMethod)}
                          <span>{formatPaymentMethod(payment.paymentMethod)}</span>
                        </div>
                      </td>
                      
                      {/* Payment Date */}
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {new Date(payment.paymentDate || payment.date).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </td>
                      
                      {/* Receipt Number */}
                      <td className="px-4 py-3 text-sm text-slate-700 font-mono">
                        {payment.receiptNumber}
                      </td>
                      
                      {/* Action */}
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewReceipt(payment)}
                          className={payment.type === 'work-order' ? 'text-blue-600 hover:bg-blue-100' : 'text-purple-600 hover:bg-purple-100'}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Receipt
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Modal */}
        {selectedPayment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
                <h2 className="flex items-center gap-3">
                  <Receipt className="w-6 h-6" />
                  Payment Details
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 text-sm mb-1">Transaction ID</p>
                    <p className="text-slate-900 font-mono font-semibold">{selectedPayment.transactionId}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm mb-1">Type</p>
                    <p className="text-slate-900 font-semibold capitalize">{selectedPayment.type.replace('-', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm mb-1">Date</p>
                    <p className="text-slate-900">{new Date(selectedPayment.date).toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm mb-1">Branch</p>
                    <p className="text-slate-900">{selectedPayment.branch}</p>
                  </div>
                  {selectedPayment.customerName && (
                    <div>
                      <p className="text-slate-500 text-sm mb-1">Customer</p>
                      <p className="text-slate-900">{selectedPayment.customerName}</p>
                    </div>
                  )}
                  {selectedPayment.vendor && (
                    <div>
                      <p className="text-slate-500 text-sm mb-1">Vendor</p>
                      <p className="text-slate-900">{selectedPayment.vendor}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-500 text-sm mb-1">Payment Method</p>
                    <p className="text-slate-900 capitalize">{formatPaymentMethod(selectedPayment.paymentMethod)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm mb-1">Amount</p>
                    <p className="text-slate-900 font-bold">{formatCurrency(selectedPayment.amount)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm mb-1">Status</p>
                    <div>{getStatusBadge(selectedPayment.paymentStatus)}</div>
                  </div>
                  {selectedPayment.invoiceNumber && (
                    <div>
                      <p className="text-slate-500 text-sm mb-1">Invoice Number</p>
                      <p className="text-slate-900 font-mono">{selectedPayment.invoiceNumber}</p>
                    </div>
                  )}
                  {selectedPayment.receiptNumber && (
                    <div>
                      <p className="text-slate-500 text-sm mb-1">Receipt Number</p>
                      <p className="text-slate-900 font-mono">{selectedPayment.receiptNumber}</p>
                    </div>
                  )}
                  {selectedPayment.notaFakturNumber && (
                    <div>
                      <p className="text-slate-500 text-sm mb-1">Nota Faktur</p>
                      <p className="text-slate-900 font-mono">{selectedPayment.notaFakturNumber}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="sticky bottom-0 bg-slate-50 p-4 rounded-b-2xl border-t border-slate-200">
                <Button
                  onClick={() => setSelectedPayment(null)}
                  variant="outline"
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Modal */}
        {showReceiptModal && selectedPayment && (
          <ReceiptModal
            isOpen={showReceiptModal}
            selectedOrder={selectedPayment}
            currentUser={currentUser}
            onClose={() => setShowReceiptModal(false)}
            formatCurrency={formatCurrency}
            calculatePartsCost={calculatePartsCost}
            getOrderLaborCost={getOrderLaborCost}
          />
        )}
      </div>
    </div>
  );
}