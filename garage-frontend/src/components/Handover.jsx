import React, { useState, useEffect } from 'react';
import { Car, CheckCircle, FileText, Key, User, Phone, Mail, MapPin, Wrench, Package, Receipt, Calendar, Clock, DollarSign, CreditCard, Printer, AlertCircle, ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { SIKKPrint } from './SIKKPrint';
import { getStoredWorkOrders, persistWorkOrders, refreshWorkOrdersFromBackend } from '../lib/workOrdersStorage';

export function Handover() {
  const [workOrders, setWorkOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [handoverNotes, setHandoverNotes] = useState({});
  const [nextServiceDate, setNextServiceDate] = useState({});
  const [handoverChecklist, setHandoverChecklist] = useState({});
  const [showSIKKModal, setShowSIKKModal] = useState(false);
  const [selectedOrderForSIKK, setSelectedOrderForSIKK] = useState(null);

  useEffect(() => {
    loadWorkOrders();

    // Listen for localStorage changes
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

  const loadWorkOrders = async () => {
    const orders = getStoredWorkOrders();
    // Filter orders with receipt number (sudah ada di Payment)
    const readyOrders = orders.filter(order =>
      order.paymentStatus === 'paid' && order.receiptNumber
    );
    setWorkOrders(readyOrders);

    try {
      const backendOrders = await refreshWorkOrdersFromBackend();
      const backendReady = backendOrders.filter(order =>
        order.paymentStatus === 'paid' && order.receiptNumber
      );
      setWorkOrders(backendReady);
    } catch (error) {
      console.error('Failed to refresh handover orders from backend:', error);
    }
  };

  const checklistItems = [
    'Vehicle cleaned and washed',
    'All tools and equipment removed',
    'Work order signed and completed',
    'Payment confirmed',
    'Keys prepared',
    'Vehicle parked in handover area'
  ];

  const maintenanceTips = [
    'Check brake fluid every 6 months',
    'Inspect brake pads every 10,000 km',
    'Avoid sudden braking when possible',
    'Regular maintenance every 5,000 km recommended'
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateGrandTotal = (order) => {
    const sparePartsTotal = order.spareParts?.reduce((sum, part) => sum + part.totalPrice, 0) || 0;
    const labor = order.laborCost || 0;
    return sparePartsTotal + labor;
  };

  const toggleChecklist = (orderId, item) => {
    setHandoverChecklist(prev => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [item]: !(prev[orderId]?.[item] || false)
      }
    }));
  };

  const isAllChecklistComplete = (orderId) => {
    const orderChecklist = handoverChecklist[orderId] || {};
    return checklistItems.every(item => orderChecklist[item] === true);
  };

  // Generate SIKK Number
  const generateSIKKNumber = (order) => {
    if (order.sikkNumber) return order.sikkNumber;
    
    const branchCode = order.branch === 'Jakarta' ? 'JKT' : 
                      order.branch === 'Bandung' ? 'BDG' : 'SBY';
    return `SIKK-${branchCode}-${order.orderId.split('-')[1]}`;
  };

  // Handle Open SIKK Modal
  const handleOpenSIKK = (order) => {
    // Increment print count
    const orders = getStoredWorkOrders();
    if (orders.length === 0) return;
    const updatedOrders = orders.map(o => {
      if (o.id === order.id) {
        const currentPrintCount = o.sikkPrintCount || 0;
        const newPrintCount = currentPrintCount + 1;

        return {
          ...o,
          sikkNumber: o.sikkNumber || generateSIKKNumber(o),
          vehicleColor: o.vehicleColor || 'Silver',
          sikkPrintCount: newPrintCount
        };
      }
      return o;
    });
    persistWorkOrders(updatedOrders);

    // Update order object with new print count
    const updatedOrder = updatedOrders.find(o => o.id === order.id);
    if (updatedOrder) {
      setSelectedOrderForSIKK(updatedOrder);
      setShowSIKKModal(true);
      // Reload to update button label
      loadWorkOrders();
    }
  };

  // Handle Print SIKK
  const handlePrintSIKK = () => {
    window.print();
  };

  const handleCompleteHandover = (orderId) => {
    const confirmMsg = `✅ Apakah Anda yakin ingin menyelesaikan handover untuk Order ${orderId}?\n\nOrder ini akan dipindahkan ke status "Completed".`;
    
    if (confirm(confirmMsg)) {
      // Update order status
      const orders = getStoredWorkOrders();
      if (orders.length === 0) return;
      const updatedOrders = orders.map(order =>
        order.orderId === orderId
          ? { ...order, status: 'completed', handoverDate: new Date().toISOString() }
          : order
      );
      persistWorkOrders(updatedOrders);
      loadWorkOrders();
      alert('✅ Handover berhasil diselesaikan!');
    }
  };

  const filteredOrders = workOrders.filter(order => {
    const matchesSearch = 
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.receiptNumber && order.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  const stats = {
    ready: workOrders.filter(o => o.status !== 'completed').length,
    completed: workOrders.filter(o => o.status === 'completed').length,
    totalRevenue: workOrders.reduce((sum, o) => sum + calculateGrandTotal(o), 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header - Simplified */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 shadow-xl">
          <div className="absolute inset-0 bg-grid-white/[0.05] pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                <Car className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-white text-3xl mb-1">Vehicle Handover</h1>
                <p className="text-blue-100">Step 8: Return vehicle to customer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Order ID, Customer, Plate Number, or Receipt Number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Orders List - Simplified */}
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="bg-slate-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-slate-700 mb-2">No Orders Ready for Handover</h3>
              <p className="text-slate-500">Orders with payment receipts will appear here</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-center justify-between gap-6">
                    {/* Customer Info */}
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 rounded-lg p-2">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-slate-900">{order.customerName}</h3>
                        <p className="text-slate-500 text-sm">{order.phone}</p>
                      </div>
                    </div>

                    {/* Order ID */}
                    <div className="text-center">
                      <p className="text-slate-500 text-xs">Order ID</p>
                      <p className="text-slate-900 font-mono text-sm">{order.orderId}</p>
                    </div>

                    {/* Receipt */}
                    <div className="text-center">
                      <p className="text-slate-500 text-xs">Receipt</p>
                      <p className="text-emerald-600 font-mono text-sm">{order.receiptNumber}</p>
                    </div>

                    {/* Vehicle */}
                    <div className="text-center">
                      <p className="text-slate-500 text-xs">Vehicle</p>
                      <p className="text-slate-900 text-sm">{order.vehicleBrand} {order.vehicleModel}</p>
                    </div>

                    {/* Plate Number */}
                    <div className="text-center">
                      <p className="text-slate-500 text-xs">Plate Number</p>
                      <p className="text-slate-900 font-mono">{order.plateNumber}</p>
                    </div>

                    {/* Total Payment */}
                    <div className="text-right">
                      <p className="text-slate-500 text-xs">Total Payment</p>
                      <p className="text-blue-600">{formatCurrency(calculateGrandTotal(order))}</p>
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 mt-0.5">
                        Paid
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleOpenSIKK(order)}
                        className={`text-sm py-2 ${
                          order.sikkPrintCount && order.sikkPrintCount > 0
                            ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                        }`}
                      >
                        <FileText className="w-4 h-4 mr-1.5" />
                        {order.sikkPrintCount && order.sikkPrintCount > 0 ? 'SIKK Cetak Ulang' : 'Cetak SIKK'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SIKK Modal */}
      {showSIKKModal && selectedOrderForSIKK && (
        <SIKKPrint 
          order={selectedOrderForSIKK}
          onClose={() => setShowSIKKModal(false)}
        />
      )}
    </div>
  );
}