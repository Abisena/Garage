// import React, { useEffect, useMemo, useState } from 'react';
// import {
//   Banknote,
//   Building2,
//   Calendar,
//   CheckCircle,
//   CreditCard,
//   DollarSign,
//   Eye,
//   Hash,
//   RefreshCw,
//   Search,
//   Smartphone,
//   TrendingUp,
//   User,
// } from 'lucide-react';
// import { Button } from './ui/button';
// import { frappeClient } from '../lib/frappeClient';
// import { toast } from 'sonner';
// import { InvoicePaymentModal } from './InvoicePaymentModal';
// import { getStoredWorkOrders, persistWorkOrders } from '../lib/workOrdersStorage';

// const formatCurrency = (amount) =>
//   new Intl.NumberFormat('id-ID', {
//     style: 'currency',
//     currency: 'IDR',
//     minimumFractionDigits: 0,
//   }).format(amount || 0);

// const paymentMethodIcon = (method) => {
//   const mapping = {
//     Cash: <Banknote className="w-4 h-4" />,
//     Transfer: <Banknote className="w-4 h-4" />,
//     'Credit Card': <CreditCard className="w-4 h-4" />,
//     'Debit Card': <CreditCard className="w-4 h-4" />,
//     QRIS: <Smartphone className="w-4 h-4" />,
//   };
//   return mapping[method] || <CreditCard className="w-4 h-4" />;
// };

// export function PaymentList({ currentUser }) {
//   const [payments, setPayments] = useState([]);
//   const [invoices, setInvoices] = useState([]);
//   const [totals, setTotals] = useState({});
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterType, setFilterType] = useState('all');
//   const [isLoading, setIsLoading] = useState(false);
//   const [selectedInvoice, setSelectedInvoice] = useState(null);
//   const [showInvoiceModal, setShowInvoiceModal] = useState(false);
//   const [selectedPayment, setSelectedPayment] = useState(null);

//   const getDocstatus = (entry) => {
//     const explicit = entry?.docstatus;
//     if (explicit === 0 || explicit === 1 || explicit === 2) return explicit;

//     const statusValue = entry?.status;
//     if (statusValue === 0 || statusValue === 1 || statusValue === 2) return statusValue;
//     if (statusValue === 'Draft') return 0;
//     if (statusValue === 'Cancelled') return 2;
//     return 1;
//   };

//   const getPaymentStatusLabel = (entry) => {
//     const docstatus = getDocstatus(entry);
//     if (docstatus === 0) return 'Draft';
//     if (docstatus === 2) return 'Cancelled';
//     return entry?.status || 'Submitted';
//   };

//   const createHandoverRecord = async (invoice, paymentInfo) => {
//     if (!invoice || !paymentInfo?.paymentEntry) return;

//     if (getDocstatus(paymentInfo) === 0) {
//       toast.message('Payment Entry masih draft, SIKK akan dibuat setelah submit.');
//       return;
//     }

//     const existingOrders = getStoredWorkOrders();
//     const orderId = invoice.name || `INV-${Date.now()}`;
//     const branchCode = (invoice.branch || 'GAR').substring(0, 3).toUpperCase();

//     const vehicleBrand = invoice.vehicle_brand || invoice.brand || 'N/A';
//     const vehicleModel = invoice.vehicle_model || invoice.model || 'N/A';
//     const plateNumber = invoice.license_plate || invoice.plate_number || invoice.vehicle_plate || 'N/A';

//     const updatedOrder = {
//       id: orderId,
//       orderId,
//       branch: invoice.branch || 'GAR',
//       customerName: invoice.customer_name || invoice.customer || 'Customer',
//       phone: invoice.customer_phone || invoice.phone || '-',
//       email: invoice.customer_email || invoice.email || '',
//       address: invoice.customer_address || invoice.address_display || '',
//       vehicleBrand,
//       vehicleModel,
//       plateNumber,
//       paymentStatus: paymentInfo.status ?? 'paid',
//       paymentMethod: paymentInfo.paymentMethod,
//       receiptNumber: paymentInfo.paymentEntry,
//       paymentDate: paymentInfo.paymentDate,
//       paidAmount: paymentInfo.amount || invoice.grand_total || invoice.outstanding_amount || 0,
//       invoiceNumber: invoice.name,
//       notaNumber: invoice.name,
//       invoiceStatus: 'submitted',
//       paymentEntryStatus: getPaymentStatusLabel(paymentInfo).toLowerCase(),
//       status: getDocstatus(paymentInfo) === 1 ? 'paid' : 'pending',
//       sikkNumber: invoice.sikk_number || `SIKK-${branchCode}-${orderId.split('-')[1] || '001'}`,
//     };

//     const mergedOrders = existingOrders.some((order) => order.orderId === orderId)
//       ? existingOrders.map((order) => (order.orderId === orderId ? { ...order, ...updatedOrder } : order))
//       : [...existingOrders, updatedOrder];

//     await persistWorkOrders(mergedOrders);
//     toast.success('Dokumen SIKK siap di menu Handover.');
//   };

//   useEffect(() => {
//     loadPortalPayments();
//   }, [currentUser.branch]);

//   const loadPortalPayments = async () => {
//     setIsLoading(true);
//     try {
//       const branchParam = currentUser?.branch === 'all' ? undefined : currentUser?.branch;
//       const portalData = await frappeClient.getPortalBootstrap({ branch: branchParam, mode: 'finance' });

//       const paymentEntries = (portalData.payment_entries || [])
//         .map((entry) => ({
//           ...entry,
//           amount: Number(entry.amount || entry.received_amount || entry.paid_amount || 0),
//         }))
//         .filter((entry) => getDocstatus(entry) !== 2);

//       paymentEntries.sort(
//         (a, b) => new Date(b.payment_date || b.posting_date || b.modified || 0) - new Date(a.payment_date || a.posting_date || a.modified || 0),
//       );

//       setPayments(paymentEntries);
//       setInvoices(portalData.sales_invoices || []);
//       setTotals(portalData.totals || {});
//     } catch (error) {
//       console.error('Failed to load payment data from Frappe', error);
//       toast.error('Gagal memuat data payment dari Frappe.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const filteredInvoices = useMemo(() => {
//     const query = searchTerm.toLowerCase();
//     return invoices.filter((invoice) => {
//       const matchesSearch =
//         invoice.name.toLowerCase().includes(query) ||
//         (invoice.customer || '').toLowerCase().includes(query) ||
//         (invoice.branch || '').toLowerCase().includes(query);

//       const isOpen = invoice.status !== 'Paid' && (invoice.outstanding_amount || invoice.outstanding || 0) > 0;
//       return matchesSearch && isOpen;
//     });
//   }, [invoices, searchTerm]);

//   const filteredPayments = useMemo(() => {
//     const query = searchTerm.toLowerCase();
//     return payments.filter((payment) => {
//       const matchesSearch =
//         payment.name.toLowerCase().includes(query) ||
//         (payment.party || '').toLowerCase().includes(query) ||
//         (payment.branch || '').toLowerCase().includes(query);

//       const matchesType = filterType === 'all' || payment.payment_type?.toLowerCase() === filterType;
//       return matchesSearch && matchesType;
//     });
//   }, [payments, searchTerm, filterType]);

//   const completedPaymentsCount = useMemo(
//     () => filteredPayments.filter((payment) => getDocstatus(payment) === 1).length,
//     [filteredPayments],
//   );

//   const revenue = useMemo(() => {
//     if (typeof totals?.incoming_payments_total === 'number') {
//       return totals.incoming_payments_total;
//     }
//     return filteredPayments
//       .filter((p) => getDocstatus(p) === 1)
//       .filter((p) => (p.payment_type || '').toLowerCase() === 'receive')
//       .reduce((sum, p) => sum + (p.amount || 0), 0);
//   }, [totals, filteredPayments]);

//   const handleProcessPayment = (invoice) => {
//     setSelectedInvoice(invoice);
//     setShowInvoiceModal(true);
//   };

//   const handlePaymentSuccess = async (paymentInfo) => {
//     await loadPortalPayments();
//     if (paymentInfo?.invoice) {
//       await createHandoverRecord(paymentInfo.invoice, paymentInfo);
//     }
//   };

//   return (
//     <div className="p-8">
//       <div className="max-w-7xl mx-auto space-y-6">
//         <div className="flex items-center justify-between">
//           <div>
//             <h1 className="text-slate-800 mb-1">Payment List (Frappe)</h1>
//             <p className="text-slate-600">Sinkronisasi pembayaran Sales Invoice dengan Payment Entry ERPNext</p>
//           </div>
//           <Button onClick={loadPortalPayments} disabled={isLoading} className="inline-flex items-center gap-2">
//             <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
//             Refresh
//           </Button>
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//           <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-emerald-100 mb-1">Total Revenue (Paid)</p>
//                 <p className="font-bold text-2xl">{formatCurrency(revenue)}</p>
//               </div>
//               <div className="bg-white/20 p-3 rounded-lg">
//                 <TrendingUp className="w-8 h-8" />
//               </div>
//             </div>
//           </div>

//           <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-slate-600 mb-1">Completed Payments</p>
//                 <p className="text-slate-900 font-bold">{completedPaymentsCount}</p>
//               </div>
//               <div className="bg-emerald-100 p-3 rounded-lg">
//                 <CheckCircle className="w-8 h-8 text-emerald-600" />
//               </div>
//             </div>
//           </div>

//           <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-slate-600 mb-1">Open Invoices</p>
//                 <p className="text-slate-900 font-bold">{filteredInvoices.length}</p>
//               </div>
//               <div className="bg-amber-100 p-3 rounded-lg">
//                 <Building2 className="w-8 h-8 text-amber-600" />
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
//           <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
//             <div className="flex items-center gap-2 w-full md:w-1/2">
//               <div className="relative flex-1">
//                 <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
//                 <input
//                   type="text"
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                   placeholder="Cari invoice atau payment..."
//                   className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
//                 />
//               </div>
//             </div>
//             <div className="flex items-center gap-3">
//               <select
//                 value={filterType}
//                 onChange={(e) => setFilterType(e.target.value)}
//                 className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
//               >
//                 <option value="all">Semua Payment</option>
//                 <option value="receive">Incoming</option>
//                 <option value="pay">Outgoing</option>
//               </select>
//             </div>
//           </div>
//         </div>

//         <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
//           <div className="p-4 border-b border-slate-200 flex items-center justify-between">
//             <div>
//               <p className="text-slate-800 font-semibold">Sales Invoice Menunggu Pembayaran</p>
//               <p className="text-slate-500 text-sm">Proses invoice unpaid langsung ke Payment Entry ERPNext</p>
//             </div>
//           </div>

//           <div className="overflow-x-auto">
//             <table className="min-w-full">
//               <thead>
//                 <tr className="bg-slate-50 text-left text-xs text-slate-600">
//                   <th className="px-4 py-3">Invoice</th>
//                   <th className="px-4 py-3">Customer</th>
//                   <th className="px-4 py-3">Total</th>
//                   <th className="px-4 py-3">Outstanding</th>
//                   <th className="px-4 py-3">Tanggal</th>
//                   <th className="px-4 py-3 text-right">Aksi</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {filteredInvoices.length === 0 && (
//                   <tr>
//                     <td colSpan={6} className="px-4 py-6 text-center text-slate-500 text-sm">
//                       {isLoading ? 'Memuat invoice...' : 'Tidak ada invoice unpaid'}
//                     </td>
//                   </tr>
//                 )}
//                 {filteredInvoices.map((invoice) => (
//                   <tr key={invoice.name} className="hover:bg-slate-50">
//                     <td className="px-4 py-3">
//                       <div className="font-semibold text-slate-800 flex items-center gap-2">
//                         <Hash className="w-4 h-4 text-slate-400" />
//                         {invoice.name}
//                       </div>
//                       <p className="text-xs text-slate-500">Status: {invoice.status}</p>
//                     </td>
//                     <td className="px-4 py-3">
//                       <p className="text-slate-800 font-medium">{invoice.customer}</p>
//                       {invoice.branch && <p className="text-xs text-slate-500">{invoice.branch}</p>}
//                     </td>
//                     <td className="px-4 py-3 text-slate-800">{formatCurrency(invoice.total_amount || invoice.grand_total)}</td>
//                     <td className="px-4 py-3 font-semibold text-amber-700">
//                       {formatCurrency(invoice.outstanding_amount || invoice.outstanding || 0)}
//                     </td>
//                     <td className="px-4 py-3 text-sm text-slate-600">
//                       <div className="flex items-center gap-2">
//                         <Calendar className="w-4 h-4 text-slate-400" />
//                         <span>{invoice.invoice_date || '-'}</span>
//                       </div>
//                       {invoice.due_date && <p className="text-xs text-slate-500">Jatuh tempo: {invoice.due_date}</p>}
//                     </td>
//                     <td className="px-4 py-3 text-right">
//                       <Button
//                         size="sm"
//                         onClick={() => handleProcessPayment(invoice)}
//                         className="bg-blue-600 hover:bg-blue-700 text-white"
//                         disabled={isLoading}
//                       >
//                         Proses Pembayaran
//                       </Button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>

//         <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
//           <div className="p-4 border-b border-slate-200 flex items-center justify-between">
//             <div>
//               <p className="text-slate-800 font-semibold">Payment Entry (Frappe)</p>
//               <p className="text-slate-500 text-sm">Daftar pembayaran yang sudah tercatat di ERPNext</p>
//             </div>
//           </div>

//           <div className="overflow-x-auto">
//             <table className="min-w-full">
//               <thead>
//                 <tr className="bg-slate-50 text-left text-xs text-slate-600">
//                   <th className="px-4 py-3">Payment Entry</th>
//                   <th className="px-4 py-3">Customer</th>
//                   <th className="px-4 py-3">Metode</th>
//                   <th className="px-4 py-3">Amount</th>
//                   <th className="px-4 py-3">Tanggal</th>
//                   <th className="px-4 py-3">Status</th>
//                   <th className="px-4 py-3 text-right">Detail</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {filteredPayments.length === 0 && (
//                   <tr>
//                     <td colSpan={7} className="px-4 py-6 text-center text-slate-500 text-sm">
//                       {isLoading ? 'Memuat payment entry...' : 'Belum ada payment entry'}
//                     </td>
//                   </tr>
//                 )}
//                 {filteredPayments.map((payment) => (
//                   <tr key={payment.name} className="hover:bg-slate-50">
//                     <td className="px-4 py-3">
//                       <div className="font-semibold text-slate-800">{payment.name}</div>
//                       <p className="text-xs text-slate-500">Type: {payment.payment_type}</p>
//                     </td>
//                     <td className="px-4 py-3">
//                       <p className="text-slate-800 font-medium">{payment.party}</p>
//                       {payment.branch && <p className="text-xs text-slate-500">{payment.branch}</p>}
//                     </td>
//                     <td className="px-4 py-3">
//                       <div className="inline-flex items-center gap-2 px-2 py-1 bg-slate-100 rounded-full text-sm text-slate-700">
//                         {paymentMethodIcon(payment.mode_of_payment)}
//                         <span>{payment.mode_of_payment}</span>
//                       </div>
//                     </td>
//                     <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(payment.amount)}</td>
//                     <td className="px-4 py-3 text-sm text-slate-600">
//                       <div className="flex items-center gap-2">
//                         <Calendar className="w-4 h-4 text-slate-400" />
//                         <span>{payment.payment_date || payment.posting_date || '-'}</span>
//                       </div>
//                     </td>
//                     <td className="px-4 py-3">
//                       <span
//                         className={`px-3 py-1 rounded-full text-xs font-semibold ${(() => {
//                           const docstatus = getDocstatus(payment);
//                           if (docstatus === 1) return 'bg-emerald-100 text-emerald-700';
//                           if (docstatus === 2) return 'bg-rose-100 text-rose-700';
//                           return 'bg-slate-100 text-slate-700';
//                         })()}`}
//                       >
//                         {getPaymentStatusLabel(payment)}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3 text-right">
//                       <Button variant="outline" size="sm" onClick={() => setSelectedPayment(payment)}>
//                         <Eye className="w-4 h-4 mr-2" /> Detail
//                       </Button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           {selectedPayment && (
//             <div className="border-t border-slate-200 p-4 bg-slate-50">
//               <div className="flex items-start justify-between">
//                 <div className="space-y-2">
//                   <p className="text-slate-800 font-semibold">Payment Detail</p>
//                   <div className="grid grid-cols-2 gap-4 text-sm text-slate-700">
//                     <div>
//                       <p className="text-slate-500 text-xs">Payment Entry</p>
//                       <p className="font-semibold">{selectedPayment.name}</p>
//                     </div>
//                     <div>
//                       <p className="text-slate-500 text-xs">Status</p>
//                       <p className="font-semibold">{getPaymentStatusLabel(selectedPayment)}</p>
//                     </div>
//                     <div>
//                       <p className="text-slate-500 text-xs">Customer</p>
//                       <p className="font-semibold">{selectedPayment.party}</p>
//                     </div>
//                     <div>
//                       <p className="text-slate-500 text-xs">Payment Date</p>
//                       <p className="font-semibold">{selectedPayment.payment_date || selectedPayment.posting_date || '-'}</p>
//                     </div>
//                     <div>
//                       <p className="text-slate-500 text-xs">Payment Type</p>
//                       <p className="font-semibold">{selectedPayment.payment_type}</p>
//                     </div>
//                     <div>
//                       <p className="text-slate-500 text-xs">Mode of Payment</p>
//                       <p className="font-semibold">{selectedPayment.mode_of_payment}</p>
//                     </div>
//                     <div>
//                       <p className="text-slate-500 text-xs">Amount</p>
//                       <p className="font-semibold">{formatCurrency(selectedPayment.amount)}</p>
//                     </div>
//                     <div>
//                       <p className="text-slate-500 text-xs">Branch</p>
//                       <p className="font-semibold">{selectedPayment.branch || '-'}</p>
//                     </div>
//                   </div>
//                 </div>
//                 <Button variant="ghost" onClick={() => setSelectedPayment(null)}>
//                   Tutup
//                 </Button>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       <InvoicePaymentModal
//         isOpen={showInvoiceModal}
//         invoice={selectedInvoice}
//         onClose={() => setShowInvoiceModal(false)}
//         onPaymentSuccess={handlePaymentSuccess}
//       />
//     </div>
//   );
// }

// export default PaymentList;



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
    // Load Work Orders - ONLY PAID with invoice number
    const workOrders = JSON.parse(localStorage.getItem('workOrders') || '[]');
    const woPayments = workOrders
      .filter((wo) => wo.paymentStatus === 'paid' && wo.invoiceNumber)
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

    // Load Purchase Orders - ONLY PAID with invoice number
    const purchaseOrders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
    const poPayments = purchaseOrders
      .filter((po) => po.paymentStatus === 'paid' && po.invoiceNumber)
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
            payment={selectedPayment}
            onClose={() => setShowReceiptModal(false)}
          />
        )}
      </div>
    </div>
  );
}