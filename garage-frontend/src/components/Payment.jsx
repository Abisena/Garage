import React, { useState, useEffect } from 'react';
import { CreditCard, Receipt, Check, Printer, Download, Search, DollarSign, Building2, User, Car, Wrench, Package, FileText, CheckCircle, X, Clock, TrendingUp, Wallet, Banknote, Smartphone, ChevronRight, Calendar, Phone, Mail, MapPin, ShoppingCart, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { User as UserType } from './Login';
import { createDemoPaymentData } from '../utils/demoData';

interface PaymentProps {
  currentUser: UserType;
}

interface WorkOrder {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  email?: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: string;
  plateNumber: string;
  serviceType: string;
  date: string;
  branch: string;
  spareParts?: SparePart[];
  mechanicName?: string;
  estimatedRepairTime?: string;
  laborCost?: number;
  status: string;
  repairStatus?: string;
  paymentStatus?: 'pending' | 'paid' | 'partial';
  paymentMethod?: string;
  paidAmount?: number;
  paymentDate?: string;
  invoiceNumber?: string;
}

interface SparePart {
  id: string;
  name: string;
  partNumber: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'percent' | 'amount';
  totalPrice: number;
}

export function Payment({ currentUser }: PaymentProps) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');
  const [showNotaModal, setShowNotaModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  
  // Payment Form State
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'credit-card' | 'debit-card' | 'qris'>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [laborCost, setLaborCost] = useState('');

  useEffect(() => {
    // Initialize demo data on first load
    createDemoPaymentData();
    loadWorkOrders();
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      loadWorkOrders();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  const loadWorkOrders = () => {
    const savedWorkOrders = localStorage.getItem('workOrders');
    if (savedWorkOrders) {
      const orders: WorkOrder[] = JSON.parse(savedWorkOrders);
      // Filter orders ready for payment
      let paymentOrders = orders.filter(order => 
        order.status === 'ready-for-payment' || order.paymentStatus === 'pending' || order.paymentStatus === 'paid'
      );
      
      // Filter by branch if user is not admin
      if (currentUser.role === 'branch' && currentUser.branch !== 'all') {
        paymentOrders = paymentOrders.filter(order => order.branch === currentUser.branch);
      }
      
      setWorkOrders(paymentOrders);
    }
  };

  const saveWorkOrders = (updatedOrders: WorkOrder[]) => {
    const allOrders: WorkOrder[] = JSON.parse(localStorage.getItem('workOrders') || '[]');
    const mergedOrders = allOrders.map(order => {
      const updated = updatedOrders.find(o => o.id === order.id);
      return updated || order;
    });
    localStorage.setItem('workOrders', JSON.stringify(mergedOrders));
    setWorkOrders(updatedOrders);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const calculatePartsCost = (parts?: SparePart[]) => {
    if (!parts) return 0;
    return parts.reduce((sum, part) => sum + part.totalPrice, 0);
  };

  const getOrderLaborCost = (order: WorkOrder) => {
    return order.laborCost || 0;
  };

  const calculateGrandTotal = (order: WorkOrder) => {
    const partsCost = calculatePartsCost(order.spareParts);
    const laborCostValue = getOrderLaborCost(order);
    return partsCost + laborCostValue;
  };

  const generateInvoiceNumber = (branch: string) => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `INV/${branch}/${year}${month}/${random}`;
  };

  const handleProcessPayment = () => {
    if (!selectedOrder) return;

    const labor = parseFloat(laborCost) || getOrderLaborCost(selectedOrder);
    const grandTotal = calculatePartsCost(selectedOrder.spareParts) + labor;
    
    let paidAmount = grandTotal;
    let change = 0;

    if (paymentMethod === 'cash') {
      const received = parseFloat(cashReceived);
      if (!received || received < grandTotal) {
        alert('⚠️ Jumlah uang yang diterima tidak mencukupi!');
        return;
      }
      paidAmount = received;
      change = received - grandTotal;
    }

    const currentTime = new Date();
    const paymentDate = currentTime.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const invoiceNumber = generateInvoiceNumber(selectedOrder.branch);

    const updatedOrder = {
      ...selectedOrder,
      laborCost: labor,
      paymentStatus: 'paid' as const,
      paymentMethod,
      paidAmount,
      paymentDate,
      invoiceNumber,
      status: 'paid'
    };

    const updatedOrders = workOrders.map(o => 
      o.id === selectedOrder.id ? updatedOrder : o
    );

    saveWorkOrders(updatedOrders);
    setSelectedOrder(updatedOrder);
    loadWorkOrders();
    setShowPaymentModal(false);

    // Show invoice after payment
    setShowInvoiceModal(true);

    if (paymentMethod === 'cash' && change > 0) {
      setTimeout(() => {
        alert(`✅ PEMBAYARAN BERHASIL!\n\nInvoice: ${invoiceNumber}\nTotal: ${formatCurrency(grandTotal)}\nBayar: ${formatCurrency(paidAmount)}\nKembalian: ${formatCurrency(change)}\n\n✓ Invoice telah digenerate\n✓ Siap untuk diserahkan ke customer`);
      }, 300);
    } else {
      setTimeout(() => {
        alert(`✅ PEMBAYARAN BERHASIL!\n\nInvoice: ${invoiceNumber}\nTotal: ${formatCurrency(grandTotal)}\nMetode: ${paymentMethod.toUpperCase()}\n\n✓ Invoice telah digenerate\n✓ Siap untuk diserahkan ke customer`);
      }, 300);
    }
  };

  const handlePrintNota = () => {
    if (!selectedOrder) return;
    alert('🖨️ Mencetak nota...\n\nNota akan dicetak sebagai tagihan untuk customer.\n(Print functionality akan diimplementasikan)');
  };

  const handlePrintInvoice = () => {
    if (!selectedOrder) return;
    alert('🖨️ Mencetak invoice...\n\nInvoice akan dicetak sebagai bukti pembayaran.\n(Print functionality akan diimplementasikan)');
  };

  const handleDownloadInvoice = () => {
    if (!selectedOrder) return;
    alert('📥 Mengunduh invoice...\n\n(Download functionality akan diimplementasikan)');
  };

  const handleOpenNota = (order: WorkOrder) => {
    setSelectedOrder(order);
    setLaborCost(order.laborCost?.toString() || '');
    setCashReceived('');
    setPaymentMethod('cash');
    
    if (order.paymentStatus === 'paid') {
      // Jika sudah paid, langsung tampilkan invoice
      setShowInvoiceModal(true);
    } else {
      // Jika belum paid, tampilkan nota dulu
      setShowNotaModal(true);
    }
  };

  const handleProceedToPayment = () => {
    setShowNotaModal(false);
    setShowPaymentModal(true);
  };

  const filteredOrders = workOrders.filter(order => {
    const matchesSearch = 
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.plateNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'pending' && (order.paymentStatus === 'pending' || !order.paymentStatus)) ||
      (filterStatus === 'paid' && order.paymentStatus === 'paid');
    
    return matchesSearch && matchesFilter;
  });

  const stats = {
    pending: workOrders.filter(o => !o.paymentStatus || o.paymentStatus === 'pending').length,
    paid: workOrders.filter(o => o.paymentStatus === 'paid').length,
    totalRevenue: workOrders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + calculateGrandTotal(o), 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-slate-700 rounded-2xl p-8 shadow-xl">
          <div className="absolute inset-0 bg-grid-white/[0.05] pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                  <Wallet className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-white text-3xl mb-1">Payment & Invoice</h1>
                  <p className="text-blue-100">Step 7: Process payments and generate invoices</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-blue-100 text-sm mb-1">Today's Date</p>
                <p className="text-white">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-amber-100 mb-2 text-sm">Pending Payment</p>
                <h3 className="text-white text-4xl mb-1">{stats.pending}</h3>
                <p className="text-amber-100 text-sm">Orders waiting</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                <Clock className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-emerald-100 mb-2 text-sm">Paid Today</p>
                <h3 className="text-white text-4xl mb-1">{stats.paid}</h3>
                <p className="text-emerald-100 text-sm">Completed</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-blue-100 mb-2 text-sm">Total Revenue</p>
                <h3 className="text-white text-2xl mb-1">{formatCurrency(stats.totalRevenue)}</h3>
                <p className="text-blue-100 text-sm flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Today's income
                </p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - LISTVIEW */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          {/* Search & Filter */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-600 p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Order ID, Customer Name, or Plate Number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-sm text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${
                    filterStatus === 'all'
                      ? 'bg-white text-slate-700 shadow-md'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  All ({workOrders.length})
                </button>
                <button
                  onClick={() => setFilterStatus('pending')}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${
                    filterStatus === 'pending'
                      ? 'bg-white text-slate-700 shadow-md'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Pending ({stats.pending})
                </button>
                <button
                  onClick={() => setFilterStatus('paid')}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${
                    filterStatus === 'paid'
                      ? 'bg-white text-slate-700 shadow-md'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Paid ({stats.paid})
                </button>
              </div>
            </div>
          </div>

          {/* List View */}
          <div className="divide-y divide-slate-100">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <div className="bg-slate-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <Receipt className="w-10 h-10 text-slate-400" />
                </div>
                <p className="text-slate-600 text-lg mb-2">No work orders found</p>
                <p className="text-sm">Orders will appear here when ready for payment</p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => handleOpenNota(order)}
                  className="p-6 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    {/* Left: Order Info */}
                    <div className="flex items-start gap-6 flex-1">
                      {/* Order ID & Status Badge */}
                      <div className="flex flex-col items-center justify-center min-w-[140px]">
                        <div className="text-slate-500 text-xs mb-1">ORDER ID</div>
                        <div className="text-slate-900 text-xl mb-2">{order.orderId}</div>
                        {order.paymentStatus === 'paid' ? (
                          <span className="px-4 py-1.5 rounded-full text-xs bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Paid
                          </span>
                        ) : (
                          <span className="px-4 py-1.5 rounded-full text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </div>

                      {/* Customer & Vehicle Info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <div className="bg-blue-100 rounded-lg p-2">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Customer</div>
                              <div className="text-slate-900">{order.customerName}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="bg-indigo-100 rounded-lg p-2">
                              <Car className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Vehicle</div>
                              <div className="text-slate-900">{order.vehicleBrand} {order.vehicleModel}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="bg-purple-100 rounded-lg p-2">
                              <FileText className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Plate Number</div>
                              <div className="text-slate-900">{order.plateNumber}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {order.branch}
                          </div>
                          <div className="flex items-center gap-1">
                            <Wrench className="w-3 h-3" />
                            {order.serviceType}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {order.date}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Action */}
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-slate-500 mb-1">Total Amount</div>
                        <div className="text-blue-600 text-2xl">{formatCurrency(calculateGrandTotal(order))}</div>
                        {order.paymentStatus === 'paid' && order.invoiceNumber && (
                          <div className="text-xs text-slate-500 mt-1">Invoice: {order.invoiceNumber}</div>
                        )}
                      </div>
                      <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL NOTA (Tagihan - Sebelum Bayar) */}
      {showNotaModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col" style={{ height: '95vh' }}>
            {/* Modal Header - Compact */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 rounded-t-2xl flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white text-xl">NOTA PEMBAYARAN</h3>
                    <p className="text-amber-100 text-xs">{selectedOrder.orderId}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowNotaModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - No Scroll, Auto Fit */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              {/* Header Company - Compact */}
              <div className="text-center border-b-2 border-dashed border-slate-300 pb-3 flex-shrink-0">
                <h2 className="text-slate-900 text-2xl mb-1">AUTO REPAIR SHOP</h2>
                <p className="text-slate-600 text-sm">Branch: {selectedOrder.branch} • {selectedOrder.date}</p>
                <div className="mt-2 inline-block bg-amber-100 border border-amber-500 rounded px-4 py-1">
                  <p className="text-amber-900 text-sm">BELUM DIBAYAR</p>
                </div>
              </div>

              {/* Customer & Vehicle - Compact Grid */}
              <div className="grid grid-cols-2 gap-3 my-3 flex-shrink-0">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500">Customer</p>
                      <p className="text-slate-900">{selectedOrder.customerName}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Phone</p>
                      <p className="text-slate-900">{selectedOrder.phone}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500">Vehicle</p>
                      <p className="text-slate-900">{selectedOrder.vehicleBrand} {selectedOrder.vehicleModel}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Plate No.</p>
                      <p className="text-slate-900">{selectedOrder.plateNumber}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Type - Compact */}
              <div className="bg-blue-50 rounded-lg p-2 mb-3 border border-blue-200 flex items-center gap-2 flex-shrink-0">
                <Wrench className="w-4 h-4 text-blue-600" />
                <span className="text-slate-900 text-sm">{selectedOrder.serviceType}</span>
              </div>

              {/* Parts List - Compact, Flex-grow */}
              <div className="flex-1 min-h-0 mb-3">
                {selectedOrder.spareParts && selectedOrder.spareParts.length > 0 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden h-full flex flex-col">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="text-left p-2 text-slate-700">Spare Part</th>
                          <th className="text-center p-2 text-slate-700 w-16">Qty</th>
                          <th className="text-right p-2 text-slate-700 w-24">Harga</th>
                          <th className="text-right p-2 text-slate-700 w-28">Total</th>
                        </tr>
                      </thead>
                    </table>
                    <div className="flex-1 overflow-y-auto">
                      <table className="w-full text-xs">
                        <tbody className="bg-white">
                          {selectedOrder.spareParts.map((part, idx) => (
                            <tr key={part.id} className={idx !== selectedOrder.spareParts!.length - 1 ? 'border-b border-slate-100' : ''}>
                              <td className="p-2 text-slate-900">{part.name}</td>
                              <td className="p-2 text-center text-slate-900 w-16">{part.quantity}</td>
                              <td className="p-2 text-right text-slate-600 w-24">{formatCurrency(part.unitPrice)}</td>
                              <td className="p-2 text-right text-slate-900 w-28">{formatCurrency(part.totalPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Summary - Compact */}
              <div className="bg-gradient-to-br from-slate-700 to-slate-600 rounded-lg p-4 text-white flex-shrink-0 mb-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-white/20 text-sm">
                    <span className="text-blue-100">Biaya Sparepart</span>
                    <span>{formatCurrency(calculatePartsCost(selectedOrder.spareParts))}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-white/20 text-sm">
                    <span className="text-blue-100">Biaya Jasa / Labor</span>
                    <span>{formatCurrency(getOrderLaborCost(selectedOrder))}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t-2 border-white/40">
                    <span className="text-lg">TOTAL TAGIHAN</span>
                    <span className="text-2xl">{formatCurrency(calculateGrandTotal(selectedOrder))}</span>
                  </div>
                </div>
              </div>

              {/* Footer Note - Compact */}
              <div className="text-center text-xs text-slate-500 py-2 flex-shrink-0">
                <p>Nota ini bukan bukti pembayaran • Silakan lakukan pembayaran untuk melanjutkan</p>
              </div>
            </div>

            {/* Action Buttons - Fixed Bottom */}
            <div className="flex gap-2 justify-end p-4 border-t border-slate-200 flex-shrink-0 bg-slate-50 rounded-b-2xl">
              <Button
                variant="outline"
                onClick={() => setShowNotaModal(false)}
                className="border-slate-300 text-sm py-2"
              >
                Tutup
              </Button>
              <Button
                onClick={handlePrintNota}
                className="bg-slate-600 hover:bg-slate-700 text-white text-sm py-2"
              >
                <Printer className="w-4 h-4 mr-1" />
                Cetak Nota
              </Button>
              <Button
                onClick={handleProceedToPayment}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-6 text-sm py-2"
              >
                Lanjut Pembayaran
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAYMENT (Proses Pembayaran) */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white text-2xl">PROSES PEMBAYARAN</h3>
                    <p className="text-blue-100 text-sm">{selectedOrder.orderId}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowPaymentModal(false);
                    setShowNotaModal(true);
                  }}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {/* Total Amount Display */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-300">
                <div className="text-center">
                  <p className="text-blue-700 mb-2">Total yang harus dibayar</p>
                  <p className="text-blue-900 text-4xl">{formatCurrency(calculateGrandTotal(selectedOrder))}</p>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div>
                <h4 className="text-slate-800 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Pilih Metode Pembayaran
                </h4>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { value: 'cash', icon: Banknote, label: 'Cash' },
                    { value: 'transfer', icon: Smartphone, label: 'Transfer' },
                    { value: 'credit-card', icon: CreditCard, label: 'Credit Card' },
                    { value: 'debit-card', icon: CreditCard, label: 'Debit Card' },
                    { value: 'qris', icon: Smartphone, label: 'QRIS' }
                  ].map((method) => (
                    <button
                      key={method.value}
                      onClick={() => setPaymentMethod(method.value as any)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        paymentMethod === method.value
                          ? 'border-blue-500 bg-blue-100 text-blue-700 shadow-md scale-105'
                          : 'border-slate-300 bg-white text-slate-600 hover:border-blue-300'
                      }`}
                    >
                      <method.icon className="w-6 h-6 mx-auto mb-2" />
                      <p className="text-xs">{method.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Input */}
              {paymentMethod === 'cash' && (
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <label className="text-slate-800 mb-3 block">Jumlah Uang Diterima</label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="Masukkan jumlah uang yang diterima"
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                  {cashReceived && (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-2 text-sm">
                        <span className="text-slate-600">Total Tagihan</span>
                        <span className="text-slate-900">{formatCurrency(calculateGrandTotal(selectedOrder))}</span>
                      </div>
                      <div className="flex justify-between items-center mb-3 text-sm">
                        <span className="text-slate-600">Uang Diterima</span>
                        <span className="text-slate-900">{formatCurrency(parseFloat(cashReceived) || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t-2 border-slate-200">
                        <span className="text-blue-700">Kembalian</span>
                        <span className="text-blue-700 text-2xl">
                          {formatCurrency(Math.max(0, (parseFloat(cashReceived) || 0) - calculateGrandTotal(selectedOrder)))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Non-Cash Info */}
              {paymentMethod !== 'cash' && (
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-500 rounded-lg p-2">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-blue-900 mb-1">Pembayaran {paymentMethod.toUpperCase()}</h4>
                      <p className="text-blue-700 text-sm">
                        Pastikan pembayaran telah diterima sebelum memproses transaksi ini.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setShowNotaModal(true);
                  }}
                  className="border-slate-300"
                >
                  Kembali
                </Button>
                <Button
                  onClick={handleProcessPayment}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Konfirmasi Pembayaran
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INVOICE (Bukti Pembayaran - Setelah Bayar) */}
      {showInvoiceModal && selectedOrder && selectedOrder.paymentStatus === 'paid' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                    <Receipt className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white text-2xl">INVOICE</h3>
                    <p className="text-emerald-100 text-sm">Bukti Pembayaran - {selectedOrder.orderId}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {/* Invoice Header - Company Info */}
              <div className="border-b-2 border-slate-200 pb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-slate-900 text-3xl mb-2">AUTO REPAIR SHOP</h2>
                    <p className="text-slate-600">Multi-Branch Workshop Management</p>
                    <div className="mt-3 space-y-1 text-sm text-slate-600">
                      <p className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Branch: {selectedOrder.branch}
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        +62 21 1234 5678
                      </p>
                      <p className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {selectedOrder.branch.toLowerCase()}@autorepair.com
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="bg-emerald-50 border-2 border-emerald-500 rounded-lg px-4 py-3">
                      <p className="text-emerald-700 text-xs mb-1">INVOICE NUMBER</p>
                      <p className="text-emerald-900 text-xl">{selectedOrder.invoiceNumber}</p>
                    </div>
                    <div className="mt-3 text-sm text-slate-600">
                      <p>Tanggal: {selectedOrder.date}</p>
                      <p>Dibayar: {selectedOrder.paymentDate}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer & Vehicle Info - Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-blue-500 rounded-lg p-2">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="text-slate-800 text-lg">Customer Information</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-slate-500">Name</p>
                      <p className="text-slate-900">{selectedOrder.customerName}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Phone</p>
                      <p className="text-slate-900">{selectedOrder.phone}</p>
                    </div>
                    {selectedOrder.email && (
                      <div>
                        <p className="text-slate-500">Email</p>
                        <p className="text-slate-900">{selectedOrder.email}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-purple-500 rounded-lg p-2">
                      <Car className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="text-slate-800 text-lg">Vehicle Information</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-slate-500">Vehicle</p>
                      <p className="text-slate-900">{selectedOrder.vehicleBrand} {selectedOrder.vehicleModel} ({selectedOrder.vehicleYear})</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Plate Number</p>
                      <p className="text-slate-900">{selectedOrder.plateNumber}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Service Type</p>
                      <p className="text-slate-900">{selectedOrder.serviceType}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Details - Table */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <h4 className="text-slate-800 text-lg mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-slate-600" />
                  Service Details
                </h4>
                
                {/* Parts Table */}
                {selectedOrder.spareParts && selectedOrder.spareParts.length > 0 && (
                  <div className="mb-4">
                    <p className="text-slate-600 mb-3">Spare Parts</p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-200 text-slate-700">
                          <th className="text-left p-3 rounded-tl-lg">Part Name</th>
                          <th className="text-left p-3">Part Number</th>
                          <th className="text-center p-3">Qty</th>
                          <th className="text-right p-3">Unit Price</th>
                          <th className="text-right p-3">Discount</th>
                          <th className="text-right p-3 rounded-tr-lg">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.spareParts.map((part) => (
                          <tr key={part.id} className="border-b border-slate-200">
                            <td className="p-3 text-slate-900">{part.name}</td>
                            <td className="p-3 text-slate-600">{part.partNumber}</td>
                            <td className="p-3 text-center text-slate-900">{part.quantity}</td>
                            <td className="p-3 text-right text-slate-900">{formatCurrency(part.unitPrice)}</td>
                            <td className="p-3 text-right text-slate-600">
                              {part.discountType === 'percent' ? `${part.discount}%` : formatCurrency(part.discount)}
                            </td>
                            <td className="p-3 text-right text-slate-900">{formatCurrency(part.totalPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Labor Cost */}
                <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-700">Labor Cost</span>
                  <span className="text-slate-900">{formatCurrency(getOrderLaborCost(selectedOrder))}</span>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-gradient-to-br from-slate-700 to-slate-600 rounded-xl p-6 text-white">
                <h4 className="text-lg mb-4">Payment Summary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b border-white/20">
                    <span className="text-blue-100">Parts Total</span>
                    <span className="text-xl">{formatCurrency(calculatePartsCost(selectedOrder.spareParts))}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-white/20">
                    <span className="text-blue-100">Labor Cost</span>
                    <span className="text-xl">{formatCurrency(getOrderLaborCost(selectedOrder))}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t-2 border-white/40">
                    <span className="text-xl">GRAND TOTAL</span>
                    <span className="text-3xl">{formatCurrency(calculateGrandTotal(selectedOrder))}</span>
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-500 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-500 rounded-full p-3">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-emerald-900 text-lg">Payment Completed</h4>
                      <p className="text-emerald-700 text-sm">
                        Paid via {selectedOrder.paymentMethod?.toUpperCase()} on {selectedOrder.paymentDate}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-700 text-sm">Amount Paid</p>
                    <p className="text-emerald-900 text-2xl">{formatCurrency(selectedOrder.paidAmount || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-sm text-slate-500 border-t border-slate-300 pt-4">
                <p>Terima kasih atas kepercayaan Anda</p>
                <p className="text-xs mt-1">Invoice ini adalah bukti pembayaran yang sah</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => setShowInvoiceModal(false)}
                  className="border-slate-300"
                >
                  Tutup
                </Button>
                <Button
                  onClick={handlePrintInvoice}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Cetak Invoice
                </Button>
                <Button
                  onClick={handleDownloadInvoice}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}